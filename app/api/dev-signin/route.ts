import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  if (course) {
    try {
      const { data: existing, error: selectErr } = await db
        .from("course_accounts")
        .select("id")
        .eq("email", lc)
        .maybeSingle();

      if (selectErr) {
        return NextResponse.json(
          { error: `course_accounts lookup failed: ${selectErr.message}` },
          { status: 500 }
        );
      }

      if (!existing) {
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
        await db.from("course_accounts")
          .update({ user_id: userId, status: "active" })
          .eq("id", existing.id);
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
        return NextResponse.json({
          ready: true,
          isCourse: !!course,
          session: {
            access_token: verifyData.session.access_token,
            refresh_token: verifyData.session.refresh_token,
          },
        });
      }

      console.warn("dev-signin: server verifyOtp failed:", verifyErr?.message);
    }
  } catch (err) {
    console.error("dev-signin: OTP verification error:", err);
  }

  return NextResponse.json({ error: "Could not create session." }, { status: 500 });
}
