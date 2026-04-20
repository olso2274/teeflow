import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/utils/supabase/server";

const BYPASS_GOLFERS: Record<string, { name: string; phone: string }> = {
  "eo@rubegolf.com":         { name: "Ed",      phone: "1234543454" },
  "ml@rubegolf.com":         { name: "Morc",    phone: "9522205096" },
  "testgolfer@rubegolf.com": { name: "Sampson", phone: "9524704145" },
};

const BYPASS_COURSES: Record<string, { name: string; phone: string; courseName: string }> = {
  "eo18@rubegolf.com":   { name: "Ed",      phone: "1234543454", courseName: "E's National Course" },
  "ml18@rubegolf.com":   { name: "Morc",    phone: "9522205096", courseName: "Morc's National Course" },
  "test18@rubegolf.com": { name: "Sampson", phone: "9524704145", courseName: "Test Golf Course Pines" },
};

export async function POST(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: "Dev login not configured (missing env vars)." }, { status: 503 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = body.email;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!email) return NextResponse.json({ error: "Missing email." }, { status: 400 });

  const lc = email.trim().toLowerCase();
  const golfer = BYPASS_GOLFERS[lc];
  const course = BYPASS_COURSES[lc];
  if (!golfer && !course) {
    return NextResponse.json({ error: "Not a bypass account." }, { status: 403 });
  }

  const info = golfer ?? course!;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  // ── Step 1: Ensure user exists ─────────────────────────────────────────
  let userId: string;
  try {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: lc,
      email_confirm: true,
      user_metadata: { name: info.name, phone: info.phone },
    });

    if (created?.user) {
      userId = created.user.id;
    } else {
      // Already exists — resolve ID via generateLink (avoids listUsers pagination)
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: lc,
      });
      if (linkErr || !linkData?.user) {
        const msg = linkErr?.message ?? createErr?.message ?? "unknown";
        console.error("dev-signin: could not resolve user:", lc, msg);
        return NextResponse.json({ error: `Could not locate account: ${msg}` }, { status: 500 });
      }
      userId = linkData.user.id;

      await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
        user_metadata: { name: info.name, phone: info.phone },
      });
    }
  } catch (err) {
    console.error("dev-signin: auth.admin error:", err);
    return NextResponse.json(
      { error: `Auth error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  // ── Step 2: Upsert profile ─────────────────────────────────────────────
  try {
    const { error: profErr } = await db.from("profiles").upsert({
      id: userId, name: info.name, phone: info.phone, email: lc,
    });
    if (profErr) console.warn("dev-signin: profile upsert warning:", profErr.message);
  } catch (err) {
    console.error("dev-signin: profile upsert error:", err);
  }

  // ── Step 3: Upsert course_accounts (course logins only) ───────────────
  // Admin client bypasses RLS. We query ALL rows for this email (the table
  // has no unique constraint on email, so past signup attempts may have
  // created duplicates), keep one, delete the rest, and claim it for userId.
  // We then verify the final state — if anything went sideways we fail loud
  // rather than returning a session that will bounce at /course-dashboard.
  if (course) {
    try {
      const { data: rows, error: selectErr } = await db
        .from("course_accounts")
        .select("id, user_id")
        .eq("email", lc);

      if (selectErr) {
        return NextResponse.json(
          { error: `course_accounts lookup failed: ${selectErr.message}` },
          { status: 500 }
        );
      }

      if (!rows || rows.length === 0) {
        const { error: insertErr } = await db.from("course_accounts").insert({
          user_id: userId,
          course_name: course.courseName,
          contact_name: course.name,
          email: lc,
          phone: course.phone,
          status: "active",
        });
        if (insertErr) {
          return NextResponse.json(
            { error: `course_accounts insert failed: ${insertErr.message}` },
            { status: 500 }
          );
        }
      } else {
        const [keep, ...dupes] = rows as Array<{ id: string; user_id: string | null }>;
        if (dupes.length > 0) {
          const { error: delErr } = await db
            .from("course_accounts")
            .delete()
            .in("id", dupes.map((d) => d.id));
          if (delErr) console.warn("dev-signin: dupe cleanup failed:", delErr.message);
        }

        const { error: updateErr } = await db
          .from("course_accounts")
          .update({
            user_id: userId,
            status: "active",
            course_name: course.courseName,
            contact_name: course.name,
            phone: course.phone,
          })
          .eq("id", keep.id);
        if (updateErr) {
          return NextResponse.json(
            { error: `course_accounts update failed: ${updateErr.message}` },
            { status: 500 }
          );
        }
      }

      // Verify: row must exist with user_id=userId
      const { data: verify, error: verifyErr } = await db
        .from("course_accounts")
        .select("id")
        .eq("email", lc)
        .eq("user_id", userId)
        .maybeSingle();

      if (verifyErr || !verify) {
        console.error(
          "dev-signin: course_accounts claim verify failed",
          { email: lc, userId, verifyErr: verifyErr?.message }
        );
        return NextResponse.json(
          { error: `course_accounts not claimed: ${verifyErr?.message ?? "row missing after upsert"}` },
          { status: 500 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: `course_accounts error: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 }
      );
    }
  }

  // ── Step 4: Generate link and verify OTP server-side ──────────────────
  // Verifying server-side avoids Chrome's bounce tracking mitigation,
  // which fires when the browser navigates through supabase.co and back.
  // Instead we extract the token from the generated link and call verifyOtp
  // here, then return the session to the client so it never leaves our domain.
  try {
    const { data: linkData, error: linkGenErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: lc,
    });

    if (linkGenErr || !linkData?.properties?.action_link) {
      console.error("dev-signin: generateLink failed:", linkGenErr?.message);
      return NextResponse.json({ error: "Failed to generate sign-in token." }, { status: 500 });
    }

    // Extract the OTP token from the action_link URL
    const actionUrl = new URL(linkData.properties.action_link);
    const otpToken = actionUrl.searchParams.get("token");

    if (otpToken) {
      // Verify the token on the server — returns a live session
      const { data: verifyData, error: verifyErr } = await admin.auth.verifyOtp({
        token_hash: otpToken,
        type: "magiclink",
      });

      if (!verifyErr && verifyData?.session) {
        // Sanity check: the user id in the issued session must match the
        // userId we used when upserting course_accounts. If they diverge,
        // the dashboard's auth.uid() won't match the row we just claimed
        // and /api/course/me will return null → infinite signup loop.
        const sessionUserId = verifyData.session.user?.id;
        if (sessionUserId && sessionUserId !== userId) {
          console.error(
            "dev-signin: session user id diverged from upsert target",
            { upsertUserId: userId, sessionUserId }
          );
          return NextResponse.json(
            { error: `User id mismatch: ${userId} vs ${sessionUserId}` },
            { status: 500 }
          );
        }

        // Set session cookies server-side via the @supabase/ssr server client —
        // writes Set-Cookie so both server and browser code see the session
        // on the next request.
        const serverSupabase = await createServerSupabase();
        const { error: setSessionErr } = await serverSupabase.auth.setSession({
          access_token: verifyData.session.access_token,
          refresh_token: verifyData.session.refresh_token,
        });

        if (setSessionErr) {
          console.error("dev-signin: setSession on server failed:", setSessionErr.message);
          return NextResponse.json({ error: "Failed to persist session." }, { status: 500 });
        }

        return NextResponse.json({
          ready: true,
          isCourse: !!course,
        });
      }

      console.warn("dev-signin: server verifyOtp failed:", verifyErr?.message);
    }
  } catch (err) {
    console.error("dev-signin: OTP verification error:", err);
  }

  return NextResponse.json({ error: "Could not create session." }, { status: 500 });
}
