import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/* ═══════════════════════════════════════════
   ForeUp API types
   ═══════════════════════════════════════════ */
interface ForeUpSlot {
  time: string; // "2026-04-17 10:50"
  available_spots: number;
  green_fee: number;
  cart_fee: number;
  course_id: number;
  course_name: string;
  schedule_id: number;
  booking_class: string;
}

interface CourseRow {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  website: string;
  booking_url: string;
  scraper_type?: string;
  scraper_config?: { course_id?: number; schedule_id?: number };
  is_active?: boolean;
}

/* ═══════════════════════════════════════════
   ForeUp scraper (works for any ForeUp course)
   ═══════════════════════════════════════════ */
function toForeUpDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${month}-${day}-${year}`;
}

async function scrapeForeUp(
  dateStr: string,
  courseId: number,
  scheduleId: number
): Promise<ForeUpSlot[]> {
  const date = toForeUpDate(dateStr);
  const url = new URL(
    "https://foreupsoftware.com/index.php/api/booking/times"
  );
  url.searchParams.set("time", "all");
  url.searchParams.set("date", date);
  url.searchParams.set("holes", "18");
  url.searchParams.set("players", "0");
  url.searchParams.set("booking_class", "0");
  url.searchParams.set("schedule_id", String(scheduleId));
  url.searchParams.set("course_id", String(courseId));
  url.searchParams.set("api_key", "no_limits");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "x-requested-with": "XMLHttpRequest",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════
   Scraper config resolver
   ═══════════════════════════════════════════ */
function getForeUpIds(
  course: CourseRow
): { courseId: number; scheduleId: number } | null {
  // Prefer explicit DB config
  const cfg = course.scraper_config;
  if (cfg?.course_id && cfg?.schedule_id) {
    return { courseId: cfg.course_id, scheduleId: cfg.schedule_id };
  }
  // Fallback: extract from booking URL pattern /booking/{cid}/{sid}
  const match = course.booking_url?.match(/\/booking\/(\d+)\/(\d+)/);
  if (match) {
    return { courseId: parseInt(match[1]), scheduleId: parseInt(match[2]) };
  }
  return null;
}

/* ═══════════════════════════════════════════
   Route handler
   ═══════════════════════════════════════════ */
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

    // Load active courses from DB
    const { data: courses, error } = await supabase
      .from("golf_courses")
      .select("*")
      .or("is_active.is.null,is_active.eq.true")
      .order("name");

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = [];

    // Scrape all ForeUp courses in parallel for speed
    const foreupCourses = (courses ?? []).filter(
      (c: CourseRow) =>
        c.scraper_type === "foreup" ||
        c.booking_url?.includes("foreupsoftware.com")
    );
    const otherCourses = (courses ?? []).filter(
      (c: CourseRow) =>
        c.scraper_type !== "foreup" &&
        !c.booking_url?.includes("foreupsoftware.com")
    );

    // Parallel ForeUp scraping
    const foreupPromises = foreupCourses.map(async (course: CourseRow) => {
      const ids = getForeUpIds(course);
      if (!ids) return [];

      const slots = await scrapeForeUp(date, ids.courseId, ids.scheduleId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseResults: any[] = [];

      for (const slot of slots) {
        const hour = parseInt(
          slot.time.split(" ")[1]?.split(":")[0] ?? "0"
        );
        if (hour < startHour || hour >= endHour) continue;
        if (slot.available_spots < 1) continue;

        courseResults.push({
          id: `${course.id}-${slot.time.replace(/\D/g, "")}`,
          course_id: course.id,
          course: {
            id: course.id,
            name: course.name,
            address: course.address,
            lat: course.lat,
            lng: course.lng,
            booking_url: course.booking_url,
          },
          start_time: new Date(slot.time).toISOString(),
          players_needed: slot.available_spots,
          price_cents: Math.round((slot.green_fee + slot.cart_fee) * 100),
          status: "open",
          booking_url: course.booking_url,
        });
      }
      return courseResults;
    });

    const foreupResults = await Promise.all(foreupPromises);
    foreupResults.forEach((batch) => results.push(...batch));

    // CPS / direct-booking courses (no public API)
    for (const course of otherCourses) {
      results.push({
        id: `${course.id}-direct`,
        course_id: course.id,
        course: {
          id: course.id,
          name: course.name,
          address: course.address,
          lat: course.lat,
          lng: course.lng,
          booking_url: course.booking_url,
        },
        start_time: new Date(
          `${date}T${String(startHour).padStart(2, "0")}:00:00`
        ).toISOString(),
        players_needed: 4,
        price_cents: null,
        status: "open",
        booking_url: course.booking_url,
        cps_direct: true,
      });
    }

    // Sort: real tee times first (by time), CPS direct last
    results.sort((a, b) => {
      if (a.cps_direct && !b.cps_direct) return 1;
      if (!a.cps_direct && b.cps_direct) return -1;
      return (
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });

    return NextResponse.json({
      success: true,
      date,
      count: results.length,
      tee_times: results,
    });
  } catch (err) {
    console.error("Scraper error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to fetch tee times",
      },
      { status: 500 }
    );
  }
}
