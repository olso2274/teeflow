import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createAdminClient(url, svc, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await admin
    .from("course_tee_times")
    .select("id, date, tee_time, spots_available, price_cents, special_note, is_last_minute")
    .eq("course_account_id", id)
    .eq("is_active", true)
    .gte("date", today)
    .order("date", { ascending: true })
    .order("tee_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ times: data ?? [] });
}
