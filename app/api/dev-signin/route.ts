import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Hardcoded test accounts — bypass email verification
const BYPASS_GOLFERS: Record<string, { name: string; phone: string }> = {
  "eo@rubegolf.com":          { name: "Ed",      phone: "1234543454" },
  "ml@rubegolf.com":          { name: "Morc",    phone: "9522205096" },
  "testgolfer@rubegolf.com":  { name: "Sampson", phone: "9524704145" },
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

  let userId: string;

  // Try creating the user first; fall back to finding them if they already exist
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: lc,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { name: info.name, phone: info.phone },
  });

  if (created?.user) {
    userId = created.user.id;
  } else {
    // User already exists — find by email via paginated listUsers
    let foundId: string | undefined;
    let page = 1;
    while (!foundId) {
      const { data: page_data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (!page_data?.users?.length) break;
      const match = page_data.users.find((u) => u.email === lc);
      if (match) { foundId = match.id; break; }
      if (page_data.users.length < 1000) break;
      page++;
    }
    if (!foundId) {
      console.error("createUser error:", createErr);
      return NextResponse.json({ error: "Failed to create or find user." }, { status: 500 });
    }
    userId = foundId;
    // Ensure password is set and email confirmed
    await admin.auth.admin.updateUserById(userId, {
      password: DEV_PASSWORD,
      email_confirm: true,
    });
  }

  // Upsert profile
  await admin.from("profiles").upsert({
    id: userId,
    name: info.name,
    phone: info.phone,
    email: lc,
  });

  // For course accounts, upsert course_accounts record
  if (course) {
    const { data: existingAccount } = await admin
      .from("course_accounts")
      .select("id")
      .eq("email", lc)
      .maybeSingle();

    if (!existingAccount) {
      await admin.from("course_accounts").insert({
        user_id: userId,
        course_name: course.courseName,
        contact_name: course.name,
        email: lc,
        phone: course.phone,
        status: "active",
      });
    } else {
      await admin
        .from("course_accounts")
        .update({ user_id: userId, status: "active" })
        .eq("id", existingAccount.id);
    }
  }

  // Sign in with password to get a real session
  const anon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
    email: lc,
    password: DEV_PASSWORD,
  });

  if (signInErr || !session.session) {
    return NextResponse.json({ error: "Sign-in failed." }, { status: 500 });
  }

  return NextResponse.json({
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
    isCourse: !!course,
  });
}
