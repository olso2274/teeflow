import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const { tee_time_id } = await request.json();

  if (!tee_time_id) {
    return NextResponse.json(
      { error: "Missing tee_time_id" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // For demo purposes, we'll use a fixed user ID
    // In production, you'd get this from the session
    const userId = "demo-user-id";

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([
        {
          user_id: userId,
          tee_time_id: tee_time_id,
          status: "confirmed",
        },
      ])
      .select();

    if (bookingError) {
      throw bookingError;
    }

    // Update tee time status to booked
    // (In a real system, you'd handle this with a trigger or separate logic)
    await supabase
      .from("tee_times")
      .update({ status: "booked" })
      .eq("id", tee_time_id);

    return NextResponse.json({
      success: true,
      booking: booking?.[0],
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Booking failed",
      },
      { status: 500 }
    );
  }
}
