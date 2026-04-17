import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const {
      tee_time_id,
      booking_url,
      course_id,
      course_name,
      tee_time_display,
      price_cents,
    } = await request.json();

    if (!booking_url) {
      return NextResponse.json(
        { error: "Missing booking_url" },
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

    // Log the booking click with all relevant info
    // The actual booking happens on the course's own booking system
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([
        {
          user_id: user.id,
          tee_time_id: tee_time_id,
          course_id: course_id,
          course_name: course_name,
          tee_time_display: tee_time_display,
          price_cents: price_cents,
          booking_url: booking_url,
          status: "confirmed",
        },
      ])
      .select()
      .single();

    if (bookingError) {
      // Log booking even if it fails
      console.error("Booking insert error:", bookingError);
      // Don't fail — booking on course site still happened
    }

    return NextResponse.json({
      success: true,
      booking: booking ?? null,
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
