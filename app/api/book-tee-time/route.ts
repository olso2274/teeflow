import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { tee_time_id, booking_url } = await request.json();

    if (!tee_time_id && !booking_url) {
      return NextResponse.json(
        { error: "Missing tee_time_id or booking_url" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "You must be signed in to book a tee time." },
        { status: 401 }
      );
    }

    // For ForeUp/external bookings, we track the click and redirect
    // The actual booking happens on the course's own booking system
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([
        {
          user_id: user.id,
          tee_time_id: tee_time_id,
          status: "confirmed",
        },
      ])
      .select()
      .single();

    if (bookingError) {
      // If it's a unique violation, user already booked this time
      if (bookingError.code === "23505") {
        return NextResponse.json(
          { error: "You already booked this tee time." },
          { status: 409 }
        );
      }
      throw bookingError;
    }

    return NextResponse.json({
      success: true,
      booking,
      redirect_url: booking_url ?? null,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Booking failed",
      },
      { status: 500 }
    );
  }
}
