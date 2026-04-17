import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Called by Vercel cron or GitHub Actions to refresh tee time data
export async function POST(request: NextRequest) {
  // Validate CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Generate next 7 days of dates to scrape
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  // Fetch all active courses
  const { data: courses, error } = await supabase
    .from("golf_courses")
    .select("id, name, scraper_type, booking_url, scraper_config")
    .or("is_active.is.null,is_active.eq.true");

  if (error) {
    console.error("update-scores: failed to load courses", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = {
    updated_at: new Date().toISOString(),
    dates_refreshed: dates,
    courses_total: courses?.length ?? 0,
    results: {} as Record<string, { success: boolean; tee_times: number }>,
  };

  // Hit the scrape endpoint for each date to warm the cache
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rubegolf.com";

  await Promise.all(
    dates.map(async (date) => {
      try {
        const res = await fetch(
          `${baseUrl}/api/scrape-tee-times?date=${date}&startHour=6&endHour=18`,
          {
            headers: {
              "x-internal-cron": "true",
              ...(expectedSecret ? { authorization: `Bearer ${expectedSecret}` } : {}),
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          summary.results[date] = {
            success: true,
            tee_times: data.count ?? 0,
          };
        } else {
          summary.results[date] = { success: false, tee_times: 0 };
        }
      } catch {
        summary.results[date] = { success: false, tee_times: 0 };
      }
    })
  );

  console.log("update-scores completed:", JSON.stringify(summary));

  return NextResponse.json({ success: true, ...summary });
}

// Allow GET for manual health checks
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ok",
    message: "update-scores endpoint is live",
    usage: "POST with Authorization: Bearer <CRON_SECRET>",
  });
}
