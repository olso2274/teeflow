import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// ForeUp API response shape
interface ForeUpTeeTime {
  time: string; // "2026-04-17 10:50"
  available_spots: number;
  available_spots_18: number;
  green_fee: number;
  cart_fee: number;
  course_id: number;
  course_name: string;
  schedule_id: number;
  booking_class: string;
}

// Format date as MM-DD-YYYY for ForeUp
function toForeUpDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${month}-${day}-${year}`;
}

async function scrapeForeUp(
  dateStr: string,
  courseId: number,
  scheduleId: number
): Promise<ForeUpTeeTime[]> {
  const date = toForeUpDate(dateStr);
  const url = new URL("https://foreupsoftware.com/index.php/api/booking/times");
  url.searchParams.set("time", "all");
  url.searchParams.set("date", date);
  url.searchParams.set("holes", "18");
  url.searchParams.set("players", "0");
  url.searchParams.set("booking_class", "0");
  url.searchParams.set("schedule_id", String(scheduleId));
  url.searchParams.set("course_id", String(courseId));
  url.searchParams.set("api_key", "no_limits");

  const res = await fetch(url.toString(), {
    headers: {
      "x-requested-with": "XMLHttpRequest",
      "Accept": "application/json",
    },
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");
  const startHour = parseInt(searchParams.get("startHour") ?? "6");
  const endHour = parseInt(searchParams.get("endHour") ?? "18");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Invalid date. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Load courses from DB
    const { data: courses, error } = await supabase
      .from("golf_courses")
      .select("*");
    if (error) throw error;

    const results: any[] = [];

    for (const course of courses ?? []) {
      // Only ForeUp courses have a working unauthenticated API
      if (course.booking_url?.includes("foreupsoftware.com")) {
        // Extract course_id and schedule_id from booking URL
        // URL pattern: /booking/{course_id}/{schedule_id}
        const match = course.booking_url.match(/\/booking\/(\d+)\/(\d+)/);
        if (!match) continue;

        const courseId = parseInt(match[1]);
        const scheduleId = parseInt(match[2]);

        const slots = await scrapeForeUp(date, courseId, scheduleId);

        for (const slot of slots) {
          // Parse hour from "YYYY-MM-DD HH:MM"
          const hour = parseInt(slot.time.split(" ")[1]?.split(":")[0] ?? "0");
          if (hour < startHour || hour >= endHour) continue;
          if (slot.available_spots < 1) continue;

          results.push({
            id: `${course.id}-${slot.time.replace(/\D/g, "")}`,
            course_id: course.id,
            course,
            start_time: new Date(slot.time).toISOString(),
            end_time: null,
            players_needed: slot.available_spots,
            price_cents: Math.round((slot.green_fee + slot.cart_fee) * 100),
            status: "open",
            created_at: new Date().toISOString(),
            booking_url: course.booking_url,
          });
        }
      } else {
        // CPS Golf courses — direct booking link (no public API available)
        // Show a placeholder so the course appears in results
        const hour = startHour;
        if (hour >= startHour && hour < endHour) {
          results.push({
            id: `${course.id}-cps`,
            course_id: course.id,
            course,
            start_time: new Date(`${date}T${String(startHour).padStart(2, "0")}:00:00`).toISOString(),
            end_time: null,
            players_needed: 4,
            price_cents: null,
            status: "open",
            created_at: new Date().toISOString(),
            booking_url: course.booking_url,
            cps_direct: true, // flag to show "Book Direct" instead of price
          });
        }
      }
    }

    // Sort: real prices first, then by time
    results.sort((a, b) => {
      if (a.cps_direct && !b.cps_direct) return 1;
      if (!a.cps_direct && b.cps_direct) return -1;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });

    return NextResponse.json({ success: true, date, tee_times: results });
  } catch (err) {
    console.error("Scraper error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch tee times" },
      { status: 500 }
    );
  }
}
