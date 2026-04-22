import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/* ── GET — golfer's upcoming confirmed bookings ─────────────────────────── */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = admin();
    const today = new Date().toISOString().split("T")[0];

    // Fetch bookings joined with tee time info
    const { data: bookings, error } = await db
      .from("tee_time_bookings")
      .select(`
        id, num_golfers, golfer_name, golfer_phone, golfer_email, status, created_at,
        course_tee_times (
          id, date, tee_time, course_name, course_address,
          price_cents, special_note, is_last_minute, course_account_id
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .gte("course_tee_times.date", today)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Bookings GET error:", error);
      return NextResponse.json({ error: "Failed to load bookings." }, { status: 500 });
    }

    // Filter out any null tee_time joins (e.g. past dates filtered by PostgREST)
    const upcoming = (bookings ?? []).filter((b) => b.course_tee_times != null);
    return NextResponse.json({ bookings: upcoming });
  } catch (err) {
    console.error("Bookings GET error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/* ── POST — create a booking ────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { tee_time_id, golfer_name, golfer_email, golfer_phone, num_golfers, agreed } = body;

    if (!tee_time_id || !golfer_name || !golfer_email || !golfer_phone || !num_golfers) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (!agreed) {
      return NextResponse.json({ error: "You must agree to the booking terms." }, { status: 400 });
    }
    if (num_golfers < 1 || num_golfers > 4) {
      return NextResponse.json({ error: "Number of golfers must be 1–4." }, { status: 400 });
    }

    const db = admin();

    // Fetch the tee time and check availability
    const { data: slot, error: slotErr } = await db
      .from("course_tee_times")
      .select("id, course_account_id, spots_available, spots_booked, status, is_active, date")
      .eq("id", tee_time_id)
      .maybeSingle();

    if (slotErr || !slot) {
      return NextResponse.json({ error: "Tee time not found." }, { status: 404 });
    }
    if (!slot.is_active || slot.status === "cancelled") {
      return NextResponse.json({ error: "This tee time is no longer available." }, { status: 409 });
    }
    const remaining = (slot.spots_available ?? 0) - (slot.spots_booked ?? 0);
    if (num_golfers > remaining) {
      return NextResponse.json({
        error: remaining <= 0
          ? "This tee time is fully booked."
          : `Only ${remaining} spot${remaining !== 1 ? "s" : ""} remaining.`
      }, { status: 409 });
    }

    // Check user hasn't already booked this tee time
    const { data: existing } = await db
      .from("tee_time_bookings")
      .select("id")
      .eq("tee_time_id", tee_time_id)
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "You already have a reservation for this tee time." }, { status: 409 });
    }

    // Create the booking
    const { data: booking, error: bookErr } = await db
      .from("tee_time_bookings")
      .insert({
        tee_time_id,
        course_account_id: slot.course_account_id,
        user_id: user.id,
        golfer_name: golfer_name.trim(),
        golfer_email: golfer_email.trim().toLowerCase(),
        golfer_phone: golfer_phone.trim(),
        num_golfers,
        agreed: true,
        status: "confirmed",
      })
      .select()
      .single();

    if (bookErr) {
      console.error("Booking insert error:", bookErr);
      return NextResponse.json({ error: "Failed to create booking." }, { status: 500 });
    }

    // Update spots_booked and derive new status
    const newBooked = (slot.spots_booked ?? 0) + num_golfers;
    const newRemaining = slot.spots_available - newBooked;
    const newStatus =
      newRemaining <= 0 ? "full" : newRemaining === 1 ? "filling" : "open";

    await db
      .from("course_tee_times")
      .update({ spots_booked: newBooked, status: newStatus })
      .eq("id", tee_time_id);

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    console.error("Bookings POST error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/* ── DELETE — cancel a booking ───────────────────────────────────────────── */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing booking id." }, { status: 400 });

    const db = admin();

    // Fetch booking to verify ownership and get num_golfers
    const { data: booking } = await db
      .from("tee_time_bookings")
      .select("id, user_id, tee_time_id, num_golfers, status")
      .eq("id", id)
      .maybeSingle();

    if (!booking || booking.user_id !== user.id) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Already cancelled." }, { status: 409 });
    }

    // Cancel the booking
    await db
      .from("tee_time_bookings")
      .update({ status: "cancelled" })
      .eq("id", id);

    // Return spots to the tee time
    const { data: slot } = await db
      .from("course_tee_times")
      .select("spots_available, spots_booked")
      .eq("id", booking.tee_time_id)
      .maybeSingle();

    if (slot) {
      const newBooked = Math.max(0, (slot.spots_booked ?? 0) - booking.num_golfers);
      const newRemaining = slot.spots_available - newBooked;
      const newStatus =
        newRemaining <= 0 ? "full" : newRemaining === 1 ? "filling" : "open";
      await db
        .from("course_tee_times")
        .update({ spots_booked: newBooked, status: newStatus })
        .eq("id", booking.tee_time_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Bookings DELETE error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
