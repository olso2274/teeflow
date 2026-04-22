import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/* ── GET — all confirmed bookings for this course's tee times ───────────── */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = admin();

    // Find course account for this user
    const { data: account } = await db
      .from("course_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!account) return NextResponse.json({ bookings: [] });

    const today = new Date().toISOString().split("T")[0];

    const { data: bookings, error } = await db
      .from("tee_time_bookings")
      .select(`
        id, tee_time_id, golfer_name, golfer_email, golfer_phone,
        num_golfers, status, created_at,
        course_tee_times ( date, tee_time )
      `)
      .eq("course_account_id", account.id)
      .eq("status", "confirmed")
      .gte("course_tee_times.date", today)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Course bookings GET error:", error);
      return NextResponse.json({ error: "Failed to load bookings." }, { status: 500 });
    }

    return NextResponse.json({ bookings: bookings ?? [] });
  } catch (err) {
    console.error("Course bookings GET error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
