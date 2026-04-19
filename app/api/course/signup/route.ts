import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { courseName, contactName, email, phone } = await request.json();

    if (!courseName?.trim() || !contactName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if this email already has an account
    const { data: existing } = await supabase
      .from("course_accounts")
      .select("id, status")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      // Resend the magic link so they can get back in
      await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${request.headers.get("origin") ?? ""}/auth/callback?next=/course-dashboard`,
        },
      });
      return NextResponse.json({ success: true, existing: true });
    }

    // Create the course_accounts record (user_id is NULL until magic link clicked)
    const { error: insertError } = await supabase.from("course_accounts").insert({
      course_name: courseName.trim(),
      contact_name: contactName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() ?? null,
      status: "active",
    });

    if (insertError) {
      console.error("course_accounts insert error:", insertError);
      return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
    }

    // Send magic link pointing to /course-dashboard
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${request.headers.get("origin") ?? ""}/auth/callback?next=/course-dashboard`,
      },
    });

    if (otpError) {
      console.error("OTP error:", otpError);
      return NextResponse.json({ error: "Failed to send sign-in email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Course signup error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
