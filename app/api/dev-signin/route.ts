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
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: "Dev login not configured." }, { status: 503 });
    }

    const { email } = await request.json();
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

    // Try to create user; if they exist already, find and update them
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: lc,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { name: info.name, phone: info.phone },
    });

    let userId: string;

    if (created?.user) {
      userId = created.user.id;
    } else {
      // Already exists — page through users to find them
      let found: string | null = null;
      for (let page = 1; page <= 10 && !found; page++) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        const match = list?.users?.find((u) => u.email === lc);
        if (match) { found = match.id; break; }
        if ((list?.users?.length ?? 0) < 1000) break;
      }
      if (!found) {
        console.error("Could not find or create user:", lc, createErr);
        return NextResponse.json({ error: "Could not find or create user." }, { status: 500 });
      }
      userId = found;
      await admin.auth.admin.updateUserById(userId, {
        password: DEV_PASSWORD,
        email_confirm: true,
      });
    }

    // Upsert profile
    await admin.from("profiles").upsert({ id: userId, name: info.name, phone: info.phone, email: lc });

    // Upsert course_accounts for course logins
    if (course) {
      const { data: existing } = await admin
        .from("course_accounts")
        .select("id")
        .eq("email", lc)
        .maybeSingle();

      if (!existing) {
        await admin.from("course_accounts").insert({
          user_id: userId,
          course_name: course.courseName,
          contact_name: course.name,
          email: lc,
          phone: course.phone,
          status: "active",
        });
      } else {
        await admin.from("course_accounts")
          .update({ user_id: userId, status: "active" })
          .eq("id", existing.id);
      }
    }

    // Return confirmation — client will call signInWithPassword directly
    return NextResponse.json({ ready: true, isCourse: !!course });
  } catch (err) {
    console.error("dev-signin error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
