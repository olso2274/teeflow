import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("course_tee_times")
      .select("*, course_accounts(id, phone)")
      .eq("date", today)
      .eq("is_last_minute", true)
      .eq("is_active", true)
      .neq("status", "cancelled")
      .order("tee_time", { ascending: true });

    if (error) {
      console.error("last-minute-openings error:", error);
      return NextResponse.json({ openings: [] });
    }

    // Shape so each opening has phone and course_account_id at the top level
    const shaped = (data ?? []).map((o) => {
      const acct = o.course_accounts as { id?: string; phone?: string } | null;
      return {
        id: o.id,
        course_account_id: acct?.id ?? null,
        course_name: o.course_name,
        course_address: o.course_address ?? null,
        tee_time: o.tee_time,
        spots_available: o.spots_available,
        spots_booked: o.spots_booked ?? 0,
        price_cents: o.price_cents ?? null,
        special_note: o.special_note ?? null,
        phone: acct?.phone ?? null,
      };
    });

    return NextResponse.json({ openings: shaped });
  } catch (err) {
    console.error("last-minute-openings error:", err);
    return NextResponse.json({ openings: [] });
  }
}
