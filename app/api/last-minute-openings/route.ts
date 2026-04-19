import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("course_tee_times")
      .select("*")
      .eq("date", today)
      .eq("is_last_minute", true)
      .eq("is_active", true)
      .order("tee_time", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load openings." }, { status: 500 });
    }

    return NextResponse.json({ openings: data ?? [] });
  } catch (err) {
    console.error("Last minute openings error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
