import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return createAdminClient(url, svc, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getAuthUserAndAccount(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) return { user: null, account: null };

  const admin = adminClient();
  const { data: account } = await admin
    .from("course_accounts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, account: account ?? null };
}

/* ── GET — fetch upcoming posted times ─────────────────────────────────── */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = adminClient();
    const { data: account } = await admin
      .from("course_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!account) return NextResponse.json({ times: [] });

    const { data: times, error } = await admin
      .from("course_tee_times")
      .select("*")
      .eq("course_account_id", account.id)
      .eq("is_active", true)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true })
      .order("tee_time", { ascending: true });

    if (error) return NextResponse.json({ error: "Failed to load times." }, { status: 500 });
    return NextResponse.json({ times: times ?? [] });
  } catch (err) {
    console.error("My times GET error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/* ── PUT — edit a posted tee time ────────────────────────────────────────
   Editable fields: tee_time, date, spots_available, spots_booked,
   price_cents, special_note, is_last_minute, status
   ─────────────────────────────────────────────────────────────────────── */
export async function PUT(request: NextRequest) {
  try {
    const { account } = await getAuthUserAndAccount(request);
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, tee_time, date, spots_available, spots_booked, price_cents, special_note, is_last_minute, status } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Derive status automatically if not explicitly passed
    let derivedStatus = status;
    if (!derivedStatus && spots_available !== undefined && spots_booked !== undefined) {
      const remaining = spots_available - spots_booked;
      if (remaining <= 0) derivedStatus = "full";
      else if (remaining === 1) derivedStatus = "filling";
      else derivedStatus = "open";
    }

    const admin = adminClient();
    const { data: updated, error } = await admin
      .from("course_tee_times")
      .update({
        ...(tee_time !== undefined && { tee_time }),
        ...(date !== undefined && { date }),
        ...(spots_available !== undefined && { spots_available }),
        ...(spots_booked !== undefined && { spots_booked }),
        ...(price_cents !== undefined && { price_cents }),
        ...(special_note !== undefined && { special_note: special_note?.trim() || null }),
        ...(is_last_minute !== undefined && { is_last_minute }),
        ...(derivedStatus && { status: derivedStatus }),
      })
      .eq("id", id)
      .eq("course_account_id", account.id)  // ensures ownership
      .select()
      .single();

    if (error) {
      console.error("Tee time update error:", error);
      return NextResponse.json({ error: "Failed to update." }, { status: 500 });
    }
    return NextResponse.json({ time: updated });
  } catch (err) {
    console.error("My times PUT error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/* ── DELETE — soft-cancel a posted tee time ──────────────────────────── */
export async function DELETE(request: NextRequest) {
  try {
    const { account } = await getAuthUserAndAccount(request);
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing tee time id." }, { status: 400 });

    const admin = adminClient();
    const { error } = await admin
      .from("course_tee_times")
      .update({ is_active: false, status: "cancelled" })
      .eq("id", id)
      .eq("course_account_id", account.id);

    if (error) return NextResponse.json({ error: "Failed to cancel tee time." }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("My times DELETE error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
