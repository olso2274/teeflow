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

async function discoverForeUpScheduleId(courseId: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://foreupsoftware.com/index.php/api/booking/courses?api_key=no_limits&course_id=${courseId}`,
      { headers: { "x-requested-with": "XMLHttpRequest", "Accept": "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.schedule_id) return data[0].schedule_id;
    if (data?.schedules?.[0]?.schedule_id) return data.schedules[0].schedule_id;
  } catch {}
  return null;
}

async function scrapeForeUp(
  dateStr: string,
  courseId: number,
  scheduleId: number
): Promise<ForeUpSlot[]> {
  // schedule_id=0 means unknown — attempt to discover it first
  if (scheduleId === 0) {
    const discovered = await discoverForeUpScheduleId(courseId);
    if (discovered) return scrapeForeUp(dateStr, courseId, discovered);
  }

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

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "x-requested-with": "XMLHttpRequest",
        "Accept": "application/json",
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
  const headers = {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.golfnow.com",
    "Referer": `https://www.golfnow.com/tee-times/facility/${facilityId}/search`,
  };

  const endpoints = [
    `https://www.golfnow.com/api/v2/public/facility/${facilityId}/rates?date=${dateStr}`,
    `https://www.golfnow.com/api/v2/public/tee-times/search?facilityId=${facilityId}&date=${dateStr}`,
    `https://www.golfnow.com/api/v1/tee-times?facilityId=${facilityId}&date=${dateStr}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers, next: { revalidate: 300 } });
      if (!res.ok) continue;
      const data = await res.json();
      const results: Array<{ time: string; price: number; spots: number }> = [];

      if (Array.isArray(data.rates)) {
        for (const rate of data.rates) {
          for (const slot of rate.tee_times ?? []) {
            if ((slot.availability ?? 0) > 0) {
              results.push({ time: slot.time, price: slot.green_fee || 0, spots: slot.availability });
            }
          }
        }
      }
      if (Array.isArray(data.tee_times)) {
        for (const slot of data.tee_times) {
          if ((slot.availability ?? slot.spots ?? 0) > 0) {
            results.push({ time: slot.time ?? slot.start_time, price: slot.green_fee || 0, spots: slot.availability ?? slot.spots });
          }
        }
      }
      if (Array.isArray(data)) {
        for (const slot of data) {
          if ((slot.availability ?? slot.spots ?? 0) > 0) {
            results.push({ time: slot.time ?? slot.start_time, price: slot.green_fee || 0, spots: slot.availability ?? slot.spots });
          }
        }
      }

      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }

  return [];
}

/* ═══════════════════════════════════════════
   CPS Golf Scraper
   Club Prophet Systems — POST the search form with a date to get tee times.
   ═══════════════════════════════════════════ */
async function scrapeCPS(
  cpsDomain: string,
  dateStr: string
): Promise<Array<{ time: string; price: number | null; spots: number }>> {
  const [year, month, day] = dateStr.split("-");
  const cpsDate = `${month}/${day}/${year}`;
  const baseUrl = `https://${cpsDomain}`;

  const commonHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": `${baseUrl}/onlineresweb/m/search-teetime/default`,
  };

  const formBody = new URLSearchParams({
    Date: cpsDate,
    NumberOfHoles: "18",
    NumberOfPlayers: "0",
    TimeFrom: "6:00 AM",
    TimeTo: "6:00 PM",
  }).toString();

  const postUrls = [
    `${baseUrl}/onlineresweb/m/search-teetime/search`,
    `${baseUrl}/onlineresweb/m/search-teetime/default`,
    `${baseUrl}/onlineresweb/search-teetime/search`,
  ];

  for (const searchUrl of postUrls) {
    try {
      const res = await fetch(searchUrl, {
        method: "POST",
        headers: { ...commonHeaders, "Content-Type": "application/x-www-form-urlencoded", "Accept": "text/html,*/*" },
        body: formBody,
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;

      const html = await res.text();
      if (!html.includes("AM") && !html.includes("PM")) continue;

      const results: Array<{ time: string; price: number | null; spots: number }> = [];
      const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
      const seenTimes = new Set<string>();
      let match;

      while ((match = timeRegex.exec(html)) !== null) {
        const hour = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        const hour24 = ampm === "PM" && hour !== 12 ? hour + 12 : (ampm === "AM" && hour === 12 ? 0 : hour);
        const timeKey = `${String(hour24).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
        if (!seenTimes.has(timeKey)) {
          seenTimes.add(timeKey);
          results.push({ time: `${dateStr}T${timeKey}:00`, price: null, spots: 4 });
        }
      }

      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }

  return [];
}

/* ═══════════════════════════════════════════
   ChronoGolf Scraper
   ChronoGolf (Lightspeed Golf) booking pages are React SPAs — try their JSON
   API that the booking widget uses internally.
   ═══════════════════════════════════════════ */
async function scrapeChronoGolf(
  clubSlug: string,
  dateStr: string
): Promise<Array<{ time: string; price: number | null; spots: number }>> {
  const apiUrls = [
    `https://www.chronogolf.com/api/v1/tee_times?club_slug=${clubSlug}&date=${dateStr}&nb_holes=18`,
    `https://www.chronogolf.com/api/v1/clubs/${clubSlug}/tee_times?date=${dateStr}&nb_holes=18`,
    `https://api.chronogolf.com/v1/clubs/${clubSlug}/tee_times?date=${dateStr}&nb_holes=18`,
  ];

  for (const apiUrl of apiUrls) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Origin": "https://www.chronogolf.com",
          "Referer": `https://www.chronogolf.com/club/${clubSlug}`,
        },
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const results: Array<{ time: string; price: number | null; spots: number }> = [];
      const seenTimes = new Set<string>();
      const slots: unknown[] = Array.isArray(data) ? data : (data?.tee_times ?? data?.data ?? []);

      for (const slot of slots as Record<string, unknown>[]) {
        const rawTime = (slot.start_time ?? slot.time ?? slot.tee_time ?? "") as string;
        const timeMatch = rawTime.match(/(\d{2}):(\d{2})/);
        if (!timeMatch) continue;
        const timeKey = `${timeMatch[1]}:${timeMatch[2]}`;
        if (seenTimes.has(timeKey)) continue;
        seenTimes.add(timeKey);

        const price = typeof slot.price === "number" ? slot.price :
                      typeof slot.green_fee === "number" ? slot.green_fee : null;
        const spots = typeof slot.available_spots === "number" ? slot.available_spots :
                      typeof slot.spots === "number" ? slot.spots : 4;

        results.push({
          time: rawTime.includes("T") ? rawTime : `${dateStr}T${timeKey}:00`,
          price,
          spots: Math.max(spots, 0),
        });
      }

      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }

  return [];
}

/* ═══════════════════════════════════════════
   TeeSnap Scraper
   TeeSnap booking pages are React SPAs — probe their internal REST API.
   ═══════════════════════════════════════════ */
async function scrapeTeeSnap(
  teesnapUrl: string,
  dateStr: string
): Promise<Array<{ time: string; price: number | null; spots: number }>> {
  const subdomainMatch = teesnapUrl.match(/https?:\/\/([^.]+)\.teesnap\.net/);
  if (!subdomainMatch) return [];
  const subdomain = subdomainMatch[1];

  const apiEndpoints = [
    `https://${subdomain}.teesnap.net/api/v1/tee_times?date=${dateStr}`,
    `https://${subdomain}.teesnap.net/api/tee_times?date=${dateStr}`,
    `https://api.teesnap.net/api/v1/tee_times?facility_slug=${subdomain}&date=${dateStr}`,
  ];

  for (const apiUrl of apiEndpoints) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": teesnapUrl,
        },
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const results: Array<{ time: string; price: number | null; spots: number }> = [];
      const seenTimes = new Set<string>();
      const slots: unknown[] = Array.isArray(data) ? data : (data?.tee_times ?? data?.data ?? []);

      for (const slot of slots as Record<string, unknown>[]) {
        const rawTime = (slot.start_time ?? slot.time ?? "") as string;
        const timeMatch = rawTime.match(/(\d{2}):(\d{2})/);
        if (!timeMatch) continue;
        const timeKey = `${timeMatch[1]}:${timeMatch[2]}`;
        if (seenTimes.has(timeKey)) continue;
        seenTimes.add(timeKey);

        const price = typeof slot.price === "number" ? slot.price : null;
        const spots = typeof slot.available_spots === "number" ? slot.available_spots :
                      typeof slot.spots === "number" ? slot.spots : 4;

        results.push({
          time: rawTime.includes("T") ? rawTime : `${dateStr}T${timeKey}:00`,
          price,
          spots: Math.max(spots, 0),
        });
      }

      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }

  return [];
}

/* ═══════════════════════════════════════════
   Scraper config resolver
   ═══════════════════════════════════════════ */
function getForeUpIds(
  course: CourseRow
): { courseId: number; scheduleId: number } | null {
  const cfg = course.scraper_config;
  if (cfg?.course_id) {
    return { courseId: cfg.course_id, scheduleId: cfg.schedule_id ?? 0 };
  }
  const match = course.booking_url?.match(/\/booking\/(\d+)\/(\d+)/);
  if (match) {
    return { courseId: parseInt(match[1]), scheduleId: parseInt(match[2]) };
  }
  const indexMatch = course.booking_url?.match(/\/booking\/index\/(\d+)/);
  if (indexMatch) {
    return { courseId: parseInt(indexMatch[1]), scheduleId: 0 };
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
    return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data: courses, error } = await supabase
      .from("golf_courses")
      .select("*")
      .or("is_active.is.null,is_active.eq.true")
      .order("name");

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = [];

    const foreupCourses = (courses ?? []).filter(
      (c: CourseRow) => c.scraper_type === "foreup" || c.booking_url?.includes("foreupsoftware.com")
    );
    const golfnowCourses = (courses ?? []).filter((c: CourseRow) => c.scraper_type === "golfnow");
    const cpsCourses = (courses ?? []).filter((c: CourseRow) => c.scraper_type === "cps_direct");
    const chronogolfCourses = (courses ?? []).filter((c: CourseRow) => c.scraper_type === "chronogolf");
    const teesnapCourses = (courses ?? []).filter((c: CourseRow) => c.scraper_type === "teesnap");
    const manualCourses = (courses ?? []).filter(
      (c: CourseRow) =>
        !["foreup", "golfnow", "cps_direct", "chronogolf", "teesnap"].includes(c.scraper_type ?? "") &&
        !c.booking_url?.includes("foreupsoftware.com")
    );

    // ForeUp — parallel via public API (no auth needed)
    const foreupPromises = foreupCourses.map(async (course: CourseRow) => {
      const ids = getForeUpIds(course);
      if (!ids) return [];

      const slots = await scrapeForeUp(date, ids.courseId, ids.scheduleId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseResults: any[] = [];

      for (const slot of slots) {
        const hour = parseInt(slot.time.split(" ")[1]?.split(":")[0] ?? "0");
        if (hour < startHour || hour >= endHour) continue;
        if (slot.available_spots < 1) continue;

        const localTime = slot.time.replace(" ", "T") + ":00";
        courseResults.push({
          id: `${course.id}-${slot.time.replace(/\D/g, "")}`,
          course_id: course.id,
          course: { id: course.id, name: course.name, address: course.address, lat: course.lat, lng: course.lng, booking_url: course.booking_url },
          start_time: localTime,
          players_needed: slot.available_spots,
          price_cents: Math.round(slot.green_fee * 100),
          status: "open",
          booking_url: course.booking_url,
        });
      }
      return courseResults;
    });

    // GolfNow — parallel scraping
    const golfnowPromises = golfnowCourses.map(async (course: CourseRow) => {
      const facilityId = course.scraper_config?.facility_id ??
        parseInt(course.booking_url?.match(/facility\/(\d+)/)?.[1] ?? "0");
      if (!facilityId) return [];

      const slots = await scrapeGolfNow(facilityId, date);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseResults: any[] = [];

      for (const slot of slots) {
        const hour = parseInt((slot.time ?? "").split(":")[0] ?? "0");
        if (hour < startHour || hour >= endHour) continue;

        courseResults.push({
          id: `${course.id}-${(slot.time ?? "").replace(/\D/g, "")}`,
          course_id: course.id,
          course: { id: course.id, name: course.name, address: course.address, lat: course.lat, lng: course.lng, booking_url: course.booking_url },
          start_time: `${date}T${slot.time}:00`,
          players_needed: slot.spots,
          price_cents: slot.price > 0 ? Math.round(slot.price * 100) : null,
          status: "open",
          booking_url: course.booking_url,
        });
      }

      if (courseResults.length === 0) {
        courseResults.push({
          id: `${course.id}-direct`,
          course_id: course.id,
          course: { id: course.id, name: course.name, address: course.address, lat: course.lat, lng: course.lng, booking_url: course.booking_url },
          start_time: `${date}T${String(startHour).padStart(2, "0")}:00:00`,
          players_needed: 4,
          price_cents: null,
          status: "open",
          booking_url: course.booking_url,
          manual: true,
        });
      }
      return courseResults;
    });

    // CPS Golf — parallel scraping
    const cpsPromises = cpsCourses.map(async (course: CourseRow) => {
      const domainMatch = course.booking_url?.match(/https?:\/\/([^/]+)/);
      if (!domainMatch) return [];

      const slots = await scrapeCPS(domainMatch[1], date);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseResults: any[] = [];

      for (const slot of slots) {
        const hour = parseInt(slot.time.split("T")[1]?.split(":")[0] ?? "0");
        if (hour < startHour || hour >= endHour) continue;

        courseResults.push({
          id: `${course.id}-${slot.time.replace(/\D/g, "")}`,
          course_id: course.id,
          course: { id: course.id, name: course.name, address: course.address, lat: course.lat, lng: course.lng, booking_url: course.booking_url },
          start_time: slot.time,
          players_needed: slot.spots,
          price_cents: null,
          status: "open",
          booking_url: course.booking_url,
          cps_direct: true,
        });
      }

      if (courseResults.length === 0) {
        courseResults.push({
          id: `${course.id}-direct`,
          course_id: course.id,
          course: { id: course.id, name: course.name, address: course.address, lat: course.lat, lng: course.lng, booking_url: course.booking_url },
          start_time: `${date}T${String(startHour).padStart(2, "0")}:00:00`,
          players_needed: 4,
          price_cents: null,
          status: "open",
          booking_url: course.booking_url,
          manual: true,
        });
      }
      return courseResults;
    });

    // ChronoGolf — parallel scraping
    const chronogolfPromises = chronogolfCourses.map(async (course: CourseRow) => {
      const slugMatch = course.booking_url?.match(/club\/([^/?]+)/);
      if (!slugMatch) return [];

      const slots = await scrapeChronoGolf(slugMatch[1], date);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseResults: any[] = [];

      for (const slot of slots) {
        const timePart = slot.time.includes("T") ? slot.time.split("T")[1] : slot.time;
        const hour = parseInt(timePart?.split(":")[0] ?? "0");
        if (hour < startHour || hour >= endHour) continue;

        courseResults.push({
          id: `${course.id}-${slot.time.replace(/\D/g, "")}`,
          course_id: course.id,
          course: { id: course.id, name: course.name, address: course.address, lat: course.lat, lng: course.lng, booking_url: course.booking_url },
          start_time: slot.time,
          players_needed: slot.spots,
          price_cents: slot.price ? Math.round(slot.price * 100) : null,
          status: "open",
          booking_url: course.booking_url,
        });
      }

      if (courseResults.length === 0) {
        courseResults.push({
          id: `${course.id}-direct`,
          course_id: course.id,
          course: { id: course.id, name: course.name, address: course.address, lat: course.lat, lng: course.lng, booking_url: course.booking_url },
          start_time: `${date}T${String(startHour).padStart(2, "0")}:00:00`,
          players_needed: 4,
          price_cents: null,
          status: "open",
          booking_url: course.booking_url,
          manual: true,
        });
      }
      return courseResults;
    });

    // TeeSnap — parallel scraping
    const teesnapPromises = teesnapCourses.map(async (course: CourseRow) => {
      const slots = await scrapeTeeSnap(course.booking_url, date);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseResults: any[] = [];

      for (const slot of slots) {
        const timePart = slot.time.includes("T") ? slot.time.split("T")[1] : slot.time;
        const hour = parseInt(timePart?.split(":")[0] ?? "0");
        if (hour < startHour || hour >= endHour) continue;

        courseResults.push({
          id: `${course.id}-${slot.time.replace(/\D/g, "")}`,
          course_id: course.id,
          course: { id: course.id, name: course.name, address: course.address, lat: course.lat, lng: course.lng, booking_url: course.booking_url },
          start_time: slot.time,
          players_needed: slot.spots,
          price_cents: slot.price ? Math.round(slot.price * 100) : null,
          status: "open",
          booking_url: course.booking_url,
        });
      }

      if (courseResults.length === 0) {
        courseResults.push({
          id: `${course.id}-direct`,
          course_id: course.id,
          course: { id: course.id, name: course.name, address: course.address, lat: course.lat, lng: course.lng, booking_url: course.booking_url },
          start_time: `${date}T${String(startHour).padStart(2, "0")}:00:00`,
          players_needed: 4,
          price_cents: null,
          status: "open",
          booking_url: course.booking_url,
          manual: true,
        });
      }
      return courseResults;
    });

    // Manual / unknown — booking link only
    const manualResults = manualCourses.map((course: CourseRow) => ({
      id: `${course.id}-manual`,
      course_id: course.id,
      course: { id: course.id, name: course.name, address: course.address, lat: course.lat, lng: course.lng, booking_url: course.booking_url },
      start_time: `${date}T${String(startHour).padStart(2, "0")}:00:00`,
      players_needed: 4,
      price_cents: null,
      status: "open",
      booking_url: course.booking_url,
      manual: true,
    }));

    // Execute all scrapers in parallel
    const [foreupResults, golfnowResults, cpsResults, chronogolfResults, teesnapResults] =
      await Promise.all([
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

    // Sort: live tee times first by time, manual/placeholder last
    results.sort((a, b) => {
      const aIsPlaceholder = !!a.manual;
      const bIsPlaceholder = !!b.manual;
      if (aIsPlaceholder && !bIsPlaceholder) return 1;
      if (!aIsPlaceholder && bIsPlaceholder) return -1;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });

    return NextResponse.json({ success: true, date, count: results.length, tee_times: results });
  } catch (err) {
    console.error("Scraper error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch tee times" },
      { status: 500 }
    );
  }
}
