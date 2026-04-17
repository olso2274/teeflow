import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/* ═══════════════════════════════════════════
   API Types
   ═══════════════════════════════════════════ */
interface ForeUpSlot {
  time: string;
  available_spots: number;
  green_fee: number;
  cart_fee: number;
  course_id: number;
  course_name: string;
  schedule_id: number;
  booking_class: string;
}

interface GolfNowRate {
  rate_id: string;
  rate_name: string;
  holes: number;
  tee_times?: Array<{
    time: string;
    green_fee: number;
    availability: number;
  }>;
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
  scraper_config?: { course_id?: number; schedule_id?: number; facility_id?: number };
  is_active?: boolean;
}

/* ═══════════════════════════════════════════
   ForeUp Scraper
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
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════
   GolfNow Scraper
   ═══════════════════════════════════════════ */
async function scrapeGolfNow(
  facilityId: number,
  dateStr: string
): Promise<Array<{ time: string; price: number; spots: number }>> {
  try {
    // GolfNow API endpoint for rates
    const url = `https://www.golfnow.com/api/v2/public/facility/${facilityId}/rates?date=${dateStr}`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results: Array<{ time: string; price: number; spots: number }> = [];

    // Parse GolfNow rate response
    if (data.rates && Array.isArray(data.rates)) {
      for (const rate of data.rates) {
        if (rate.tee_times && Array.isArray(rate.tee_times)) {
          for (const slot of rate.tee_times) {
            if (slot.availability > 0) {
              results.push({
                time: slot.time,
                price: slot.green_fee || 0,
                spots: slot.availability,
              });
            }
          }
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════
   CPS Golf Scraper
   ═══════════════════════════════════════════ */
async function scrapeCPS(
  cpsDomain: string,
  dateStr: string
): Promise<Array<{ time: string; price: number | null; spots: number }>> {
  try {
    // CPS uses a web interface; scrape the search results page
    const url = new URL(`https://${cpsDomain}/onlineresweb/m/search-teetime/default`);
    url.searchParams.set("date", dateStr);

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GolfBot/1.0)",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const results: Array<{ time: string; price: number | null; spots: number }> = [];

    // Parse CPS HTML response for tee time slots
    // CPS typically shows tee times in a table format
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const availabilityRegex = /available|spots?:\s*(\d+)/gi;

    let match;
    while ((match = timeRegex.exec(html)) !== null) {
      const hour = parseInt(match[1]);
      const mins = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      const hour24 = ampm === "PM" && hour !== 12 ? hour + 12 : (ampm === "AM" && hour === 12 ? 0 : hour);

      results.push({
        time: `${dateStr}T${String(hour24).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`,
        price: null,
        spots: 4,
      });
    }

    return results;
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════
   ChronoGolf Scraper
   ═══════════════════════════════════════════ */
async function scrapeChronoGolf(
  clubSlug: string,
  dateStr: string
): Promise<Array<{ time: string; price: number | null; spots: number }>> {
  try {
    // ChronoGolf has a public API for available tee times
    const url = `https://api.chronogolf.com/tee-times?club=${clubSlug}&date=${dateStr}`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results: Array<{ time: string; price: number | null; spots: number }> = [];

    // Parse ChronoGolf API response
    if (data.tee_times && Array.isArray(data.tee_times)) {
      for (const slot of data.tee_times) {
        if (slot.available) {
          results.push({
            time: slot.time,
            price: slot.price || null,
            spots: slot.available_slots || 4,
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════
   TeeSnap Scraper
   ═══════════════════════════════════════════ */
async function scrapeTeeSnap(
  teesnapUrl: string,
  dateStr: string
): Promise<Array<{ time: string; price: number | null; spots: number }>> {
  try {
    // TeeSnap is a web-based booking system; need to scrape availability
    const url = new URL(teesnapUrl);
    url.searchParams.set("date", dateStr);

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GolfBot/1.0)",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const results: Array<{ time: string; price: number | null; spots: number }> = [];

    // Parse TeeSnap HTML for tee time slots
    // Look for time patterns like "10:30 AM" that appear as available slots
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const seenTimes = new Set<string>();

    let match;
    while ((match = timeRegex.exec(html)) !== null) {
      const hour = parseInt(match[1]);
      const mins = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      const hour24 = ampm === "PM" && hour !== 12 ? hour + 12 : (ampm === "AM" && hour === 12 ? 0 : hour);
      const timeStr = `${String(hour24).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

      if (!seenTimes.has(timeStr)) {
        seenTimes.add(timeStr);
        results.push({
          time: `${dateStr}T${timeStr}:00`,
          price: null,
          spots: 4,
        });
      }
    }

    return results;
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

    // Route to appropriate scraper by platform
    const foreupCourses = (courses ?? []).filter(
      (c: CourseRow) =>
        c.scraper_type === "foreup" ||
        c.booking_url?.includes("foreupsoftware.com")
    );
    const golfnowCourses = (courses ?? []).filter(
      (c: CourseRow) => c.scraper_type === "golfnow"
    );
    const cpsCourses = (courses ?? []).filter(
      (c: CourseRow) => c.scraper_type === "cps_direct"
    );
    const chronogolfCourses = (courses ?? []).filter(
      (c: CourseRow) => c.scraper_type === "chronogolf"
    );
    const teesnapCourses = (courses ?? []).filter(
      (c: CourseRow) => c.scraper_type === "teesnap"
    );
    const manualCourses = (courses ?? []).filter(
      (c: CourseRow) =>
        c.scraper_type === "manual" &&
        !c.booking_url?.includes("foreupsoftware.com")
    );

    // Scrape ForeUp courses
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

        const localTime = slot.time.replace(" ", "T") + ":00";
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
          start_time: localTime,
          players_needed: slot.available_spots,
          price_cents: Math.round(slot.green_fee * 100),
          status: "open",
          booking_url: course.booking_url,
        });
      }
      return courseResults;
    });

    // Scrape GolfNow courses
    const golfnowPromises = golfnowCourses.map(async (course: CourseRow) => {
      // Extract facility ID from URL
      const facilityMatch = course.booking_url?.match(/facility\/(\d+)/);
      if (!facilityMatch) return [];

      const facilityId = parseInt(facilityMatch[1]);
      const slots = await scrapeGolfNow(facilityId, date);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseResults: any[] = [];

      for (const slot of slots) {
        const hour = parseInt(slot.time.split(":")[0] ?? "0");
        if (hour < startHour || hour >= endHour) continue;
        if (slot.spots < 1) continue;

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
          start_time: `${date}T${slot.time}:00`,
          players_needed: slot.spots,
          price_cents: slot.price > 0 ? Math.round(slot.price * 100) : null,
          status: "open",
          booking_url: course.booking_url,
        });
      }
      return courseResults;
    });

    // Scrape CPS courses
    const cpsPromises = cpsCourses.map(async (course: CourseRow) => {
      // Extract domain from CPS URL
      const domainMatch = course.booking_url?.match(/https:\/\/([^/]+)/);
      if (!domainMatch) return [];

      const cpsDomain = domainMatch[1];
      const slots = await scrapeCPS(cpsDomain, date);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseResults: any[] = [];

      for (const slot of slots) {
        const hour = parseInt(slot.time.split("T")[1]?.split(":")[0] ?? "0");
        if (hour < startHour || hour >= endHour) continue;

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
          start_time: slot.time,
          players_needed: slot.spots,
          price_cents: slot.price ? Math.round(slot.price * 100) : null,
          status: "open",
          booking_url: course.booking_url,
          cps_direct: true,
        });
      }
      return courseResults;
    });

    // Scrape ChronoGolf courses
    const chronogolfPromises = chronogolfCourses.map(async (course: CourseRow) => {
      // Extract club slug from URL (e.g., "sundance-golf-club-minnesota")
      const slugMatch = course.booking_url?.match(/club\/([^/?]+)/);
      if (!slugMatch) return [];

      const clubSlug = slugMatch[1];
      const slots = await scrapeChronoGolf(clubSlug, date);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseResults: any[] = [];

      for (const slot of slots) {
        const hour = parseInt(slot.time.split(":")[0] ?? "0");
        if (hour < startHour || hour >= endHour) continue;
        if (slot.spots < 1) continue;

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
          start_time: slot.time,
          players_needed: slot.spots,
          price_cents: slot.price ? Math.round(slot.price * 100) : null,
          status: "open",
          booking_url: course.booking_url,
        });
      }
      return courseResults;
    });

    // Scrape TeeSnap courses
    const teesnapPromises = teesnapCourses.map(async (course: CourseRow) => {
      const slots = await scrapeTeeSnap(course.booking_url, date);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseResults: any[] = [];

      for (const slot of slots) {
        const hour = parseInt(slot.time.split("T")[1]?.split(":")[0] ?? "0");
        if (hour < startHour || hour >= endHour) continue;
        if (slot.spots < 1) continue;

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
          start_time: slot.time,
          players_needed: slot.spots,
          price_cents: slot.price ? Math.round(slot.price * 100) : null,
          status: "open",
          booking_url: course.booking_url,
        });
      }
      return courseResults;
    });

    // Manual courses - show placeholder (requires manual entry or custom scraping)
    const manualResults = manualCourses.map((course: CourseRow) => ({
      id: `${course.id}-placeholder`,
      course_id: course.id,
      course: {
        id: course.id,
        name: course.name,
        address: course.address,
        lat: course.lat,
        lng: course.lng,
        booking_url: course.booking_url,
      },
      start_time: `${date}T${String(startHour).padStart(2, "0")}:00:00`,
      players_needed: 4,
      price_cents: null,
      status: "open",
      booking_url: course.booking_url,
      manual: true,
    }));

    // Execute all scrapers in parallel
    const [foreupResults, golfnowResults, cpsResults, chronogolfResults, teesnapResults] = await Promise.all([
      Promise.all(foreupPromises),
      Promise.all(golfnowPromises),
      Promise.all(cpsPromises),
      Promise.all(chronogolfPromises),
      Promise.all(teesnapPromises),
    ]);

    foreupResults.forEach((batch) => results.push(...batch));
    golfnowResults.forEach((batch) => results.push(...batch));
    cpsResults.forEach((batch) => results.push(...batch));
    chronogolfResults.forEach((batch) => results.push(...batch));
    teesnapResults.forEach((batch) => results.push(...batch));
    results.push(...manualResults);

    // Sort: real tee times first (by time), placeholder last
    results.sort((a, b) => {
      const aIsPlaceholder = a.cps_direct || a.manual;
      const bIsPlaceholder = b.cps_direct || b.manual;
      if (aIsPlaceholder && !bIsPlaceholder) return 1;
      if (!aIsPlaceholder && bIsPlaceholder) return -1;
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
