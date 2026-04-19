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

const DEV_PASSWORD = "RubeGolf2024!";

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

  let admin: ReturnType<typeof createClient>;
  try {
    admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (err) {
    console.error("dev-signin: createClient failed:", err);
    return NextResponse.json({ error: "Failed to init admin client." }, { status: 500 });
  }

  // Try to create user; if they exist already, find and update them
  let userId: string;
  try {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: lc,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { name: info.name, phone: info.phone },
    });

    if (created?.user) {
      userId = created.user.id;
    } else {
      // User already exists — use generateLink to resolve their ID without pagination
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: lc,
      });
      if (linkErr || !linkData?.user) {
        const createMsg = createErr?.message ?? "unknown";
        const linkMsg = linkErr?.message ?? "generateLink returned no user";
        console.error("dev-signin: lookup failed:", lc, createMsg, linkMsg);
        return NextResponse.json(
          { error: `Could not locate account (${createMsg}). Lookup error: ${linkMsg}` },
          { status: 500 }
        );
      }
      userId = linkData.user.id;
      // Ensure correct password and confirmed email
      await admin.auth.admin.updateUserById(userId, {
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { name: info.name, phone: info.phone },
      });
    }
  } catch (err) {
    console.error("dev-signin: auth.admin error:", err);
    return NextResponse.json(
      { error: `Auth admin error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  // Upsert profile
  try {
    const { error: profErr } = await db.from("profiles").upsert({
      id: userId, name: info.name, phone: info.phone, email: lc,
    });
    if (profErr) console.warn("dev-signin: profile upsert warning:", profErr.message);
  } catch (err) {
    console.error("dev-signin: profile upsert error:", err);
  }

  // Upsert course_accounts for course logins
  if (course) {
    try {
      const { data: existing, error: selectErr } = await db
        .from("course_accounts")
        .select("id")
        .eq("email", lc)
        .maybeSingle();

      if (selectErr) {
        console.error("dev-signin: course_accounts select error:", selectErr.message);
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
          console.error("dev-signin: course_accounts insert error:", insertErr.message);
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
      console.error("dev-signin: course_accounts error:", err);
      return NextResponse.json(
        { error: `course_accounts error: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ready: true, isCourse: !!course });
}
