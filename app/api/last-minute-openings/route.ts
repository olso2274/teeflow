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
      .select("*")
      .eq("date", today)
      .eq("is_last_minute", true)
      .eq("is_active", true)
      .order("tee_time", { ascending: true });

    if (error) {
      console.error("last-minute-openings error:", error);
      return NextResponse.json({ openings: [] });
    }

    return NextResponse.json({ openings: data ?? [] });
  } catch (err) {
    console.error("last-minute-openings error:", err);
    return NextResponse.json({ openings: [] });
  }
}
