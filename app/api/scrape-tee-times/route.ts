import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { createClient } from "@/utils/supabase/server";
import { ScrapedTeeTime } from "@/lib/types";

const COURSES = [
  {
    id: "chaska",
    name: "Chaska Town Course",
    url: "https://chaska.cps.golf/onlineresweb/m/search-teetime/default",
    type: "cps",
  },
  {
    id: "pioneer",
    name: "Pioneer Creek Country Club",
    url: "https://www.pioneercreek.com/pioneercreek.cps.golf",
    type: "cps",
  },
  {
    id: "braemar",
    name: "Braemar Golf Club",
    url: "https://foreupsoftware.com/index.php/booking/21445/7829",
    type: "foreup",
  },
];

async function scrapeCPSCourse(
  page: any,
  courseUrl: string,
  dateStr: string,
  courseId: string
): Promise<ScrapedTeeTime[]> {
  try {
    await page.goto(courseUrl, { waitUntil: "networkidle" });

    // Parse date to get month/day/year for CPS format
    const [year, month, day] = dateStr.split("-");
    const dateInput = `${month}/${day}/${year}`;

    // Try to find and fill date input
    const dateInputs = await page.$$('input[type="text"][placeholder*="Date"], input[type="date"]');
    if (dateInputs.length > 0) {
      await dateInputs[0].fill(dateInput);
      await page.waitForTimeout(500);
    }

    // Wait for tee time results to load
    await page.waitForSelector(
      "[data-test*='time'], .time-slot, .slot, [class*='tee-time']",
      { timeout: 5000 }
    ).catch(() => null);

    // Extract tee time information from the page
    const teeTimes = await page.evaluate(() => {
      const results: { time: string; available: boolean; price?: string; players?: number }[] = [];

      // Try multiple selectors for tee times
      const selectors = [
        "[data-test*='time']",
        ".time-slot",
        ".slot",
        "[class*='tee-time']",
        "button[class*='time']",
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((el) => {
            const text = el.textContent || "";
            const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
            if (timeMatch) {
              const hour = parseInt(timeMatch[1]);
              const min = parseInt(timeMatch[2]);
              const period = timeMatch[3]?.toLowerCase() || "";

              // Convert to 24-hour format if needed
              let finalHour = hour;
              if (period === "pm" && hour !== 12) finalHour = hour + 12;
              if (period === "am" && hour === 12) finalHour = 0;

              results.push({
                time: `${finalHour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`,
                available: !text.includes("booked") && !text.includes("closed"),
                price: text.match(/\$(\d+(?:\.\d{2})?)/)?.[1],
                players: 4,
              });
            }
          });
        }
      }

      return results;
    });

    // Convert to database format
    const dbTeeTimes: ScrapedTeeTime[] = teeTimes
      .filter((t: { time: string; available: boolean; price?: string; players?: number }) => t.available)
      .map((t: { time: string; available: boolean; price?: string; players?: number }) => ({
        course_id: courseId,
        start_time: new Date(`${dateStr}T${t.time}:00`).toISOString(),
        end_time: null,
        players_needed: t.players || 4,
        price_cents: t.price ? Math.round(parseFloat(t.price) * 100) : null,
        status: "open",
      }));

    return dbTeeTimes;
  } catch (error) {
    console.error(`Error scraping CPS course:`, error);
    return [];
  }
}

async function scrapeForeUpCourse(
  page: any,
  courseUrl: string,
  dateStr: string,
  courseId: string
): Promise<ScrapedTeeTime[]> {
  try {
    await page.goto(courseUrl, { waitUntil: "networkidle" });

    // Try to interact with date picker
    const dateButtons = await page.$$("button[class*='date'], [class*='date-picker'] button");
    if (dateButtons.length > 0) {
      await dateButtons[0].click();
      await page.waitForTimeout(300);
    }

    // Extract available times
    const teeTimes = await page.evaluate(() => {
      const results: { time: string | null; available: boolean; price?: string }[] = [];

      // ForeUp typically uses specific class patterns
      const timeElements = document.querySelectorAll(
        "[class*='time'], [class*='slot'], [data-time]"
      );

      timeElements.forEach((el) => {
        const text = el.textContent || "";
        const timeAttr = el.getAttribute("data-time");
        const timeMatch =
          timeAttr || text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);

        if (timeMatch) {
          results.push({
            time: typeof timeMatch === "string" ? timeMatch : null,
            available: !el.classList.contains("unavailable"),
            price: text.match(/\$(\d+(?:\.\d{2})?)/)?.[1],
          });
        }
      });

      return results;
    });

    const dbTeeTimes: ScrapedTeeTime[] = teeTimes
      .filter((t: { time: string | null; available: boolean; price?: string }) => t.available && t.time)
      .map((t: { time: string | null; available: boolean; price?: string }) => ({
        course_id: courseId,
        start_time: new Date(`${dateStr}T${t.time}:00`).toISOString(),
        end_time: null,
        players_needed: 4,
        price_cents: t.price ? Math.round(parseFloat(t.price) * 100) : null,
        status: "open",
      }));

    return dbTeeTimes;
  } catch (error) {
    console.error(`Error scraping ForeUp course:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date"); // YYYY-MM-DD
  const startHour = parseInt(searchParams.get("startHour") || "6");
  const endHour = parseInt(searchParams.get("endHour") || "18");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  let browser;
  try {
    // Get golf courses from Supabase
    const supabase = await createClient();
    const { data: golfCourses, error: coursesError } = await supabase
      .from("golf_courses")
      .select("*");

    if (coursesError) throw coursesError;

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let allTeeTimes: ScrapedTeeTime[] = [];

    // Scrape each course
    for (const course of COURSES) {
      try {
        const courseDb = golfCourses?.find((c: any) =>
          c.name.toLowerCase().includes(course.name.split(" ")[0].toLowerCase())
        );
        const courseId = courseDb?.id || course.id;

        let teeTimes: ScrapedTeeTime[] = [];

        if (course.type === "cps") {
          teeTimes = await scrapeCPSCourse(
            page,
            course.url,
            date,
            courseId
          );
        } else if (course.type === "foreup") {
          teeTimes = await scrapeForeUpCourse(
            page,
            course.url,
            date,
            courseId
          );
        }

        allTeeTimes = allTeeTimes.concat(teeTimes);
      } catch (courseError) {
        console.error(`Error scraping ${course.name}:`, courseError);
        // Continue with next course
      }
    }

    // Filter by time range
    const filteredTeeTimes = allTeeTimes.filter((t) => {
      const teeHour = new Date(t.start_time).getHours();
      return teeHour >= startHour && teeHour < endHour;
    });

    // Upsert into database
    if (filteredTeeTimes.length > 0) {
      // Delete old tee times for this date range to avoid duplicates
      const startDateTime = new Date(`${date}T00:00:00Z`).toISOString();
      const endDateTime = new Date(`${date}T23:59:59Z`).toISOString();

      await supabase
        .from("tee_times")
        .delete()
        .gte("start_time", startDateTime)
        .lte("start_time", endDateTime);

      // Insert new ones
      const { error: insertError } = await supabase
        .from("tee_times")
        .insert(filteredTeeTimes);

      if (insertError) throw insertError;
    }

    // Fetch from database with course info
    const { data: dbTeeTimes, error: fetchError } = await supabase
      .from("tee_times")
      .select("*, course:golf_courses(*)")
      .eq("status", "open")
      .gte("start_time", `${date}T00:00:00Z`)
      .lte("start_time", `${date}T23:59:59Z`)
      .gte("start_time", `${date}T${startHour.toString().padStart(2, "0")}:00:00Z`)
      .lte("start_time", `${date}T${endHour.toString().padStart(2, "0")}:00:00Z`)
      .order("start_time");

    if (fetchError) throw fetchError;

    return NextResponse.json({
      success: true,
      date,
      tee_times: dbTeeTimes || [],
      total: (dbTeeTimes || []).length,
    });
  } catch (error) {
    console.error("Scraper error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Scraping failed",
        tee_times: [],
      },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close();
  }
}
