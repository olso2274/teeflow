import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    // Authenticate via session cookie
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service-role client because the course_accounts RLS policies
    // reference auth.users in a subquery that authenticated role can't read.
    // All queries below are scoped to this user's data only.
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!svc || !url) {
      return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
    }
    const admin = createAdminClient(url, svc, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: account } = await admin
      .from("course_accounts")
      .select("id, course_name, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: "No course account found." }, { status: 403 });
    }
    if (account.status !== "active") {
      return NextResponse.json({ error: "Account not yet active." }, { status: 403 });
    }

    const { date, teeTime, spotsAvailable, priceCents, specialNote, isLastMinute, courseAddress } =
      await request.json();

    if (!date || !teeTime) {
      return NextResponse.json({ error: "Date and tee time are required." }, { status: 400 });
    }

    const { data: newTime, error: insertError } = await admin
      .from("course_tee_times")
      .insert({
        course_account_id: account.id,
        course_name: account.course_name,
        course_address: courseAddress ?? null,
        date,
        tee_time: teeTime,
        spots_available: spotsAvailable ?? 4,
        price_cents: priceCents ?? null,
        special_note: specialNote ?? null,
        is_last_minute: isLastMinute ?? false,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert tee time error:", insertError);
      return NextResponse.json({ error: "Failed to submit tee time." }, { status: 500 });
    }

    return NextResponse.json({ success: true, teeTime: newTime });
  } catch (err) {
    console.error("Submit tee time error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
