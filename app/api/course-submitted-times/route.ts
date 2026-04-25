import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startHour = parseInt(searchParams.get("startHour") ?? "6");
    const endHour = parseInt(searchParams.get("endHour") ?? "18");

    if (!date) {
      return NextResponse.json({ times: [] });
    }

    // Use service-role key so the course_accounts join (for phone) isn't
    // blocked by RLS — course_tee_times are intentionally public data.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Join course_accounts to get phone number for the "Call Course" button
    const { data, error } = await supabase
      .from("course_tee_times")
      .select("*, course_accounts(phone)")
      .eq("date", date)
      .eq("is_active", true)
      .neq("status", "cancelled")
      .order("tee_time", { ascending: true });

    if (error) {
      return NextResponse.json({ times: [] });
    }

    // Filter by time window
    const filtered = (data ?? []).filter((t) => {
      const [hStr] = (t.tee_time as string).split(":");
      const h = parseInt(hStr);
      return h >= startHour && h < endHour;
    });

    // Shape into TeeTimeResult format
    const shaped = filtered.map((t) => {
      const phone = (t.course_accounts as { phone?: string } | null)?.phone ?? null;
      const bookingUrl = phone ? `tel:${phone.replace(/\D/g, "")}` : "";
      return {
        id: `course-${t.id}`,
        course_id: t.course_id ?? `course-account-${t.course_account_id}`,
        course: {
          id: t.course_id ?? `course-account-${t.course_account_id}`,
          name: t.course_name,
          address: t.course_address ?? "",
          lat: 0,
          lng: 0,
          booking_url: bookingUrl,
        },
        start_time: `${t.date}T${t.tee_time}`,
        players_needed: Math.max(0, (t.spots_available ?? 0) - (t.spots_booked ?? 0)),
        price_cents: t.price_cents ?? null,
        status: t.status === "full" ? "full" : "available",
        booking_url: bookingUrl,
        course_posted: true,
        course_account_id: t.course_account_id,
        special_note: t.special_note ?? null,
        is_last_minute: t.is_last_minute,
      };
    });

    return NextResponse.json({ times: shaped });
  } catch (err) {
    console.error("Course submitted times error:", err);
    return NextResponse.json({ times: [] });
  }
}
