import { NextRequest, NextResponse } from "next/server";

/**
 * Scraper Status Endpoint - Shows which courses can fetch live tee times
 * and which fall back to "Call Course" placeholders
 */

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || "2026-04-18";

  const status = {
    timestamp: new Date().toISOString(),
    date,
    platforms: {
      foreup: {
        name: "ForeUp",
        courses: 1,
        courses_list: ["Braemar Golf Club"],
        status: "✅ LIVE - API verified working",
        endpoint: "https://foreupsoftware.com/index.php/api/booking/times",
        requires: "course_id, schedule_id, api_key",
      },
      golfnow: {
        name: "GolfNow",
        courses: 11,
        courses_list: [
          "Dahlgreen Golf Club",
          "Shamrock Golf Course",
          "Elk River Golf Club",
          "Wild Marsh Golf Club",
          "Brookland Golf Park",
          "Heritage Links Golf Club",
          "Glencoe Country Club",
          "Whispering Pines Golf Course",
          "Southbrook Golf Club",
          "The Wilds Golf Club",
          "Albion Ridges Golf Club",
        ],
        status: "⏳ REQUIRES: Official API credentials",
        endpoint: "https://www.golfnow.com/api/v2/public/facility/{id}/rates",
        requires: "facility_id (extracted from booking URL)",
        note: "Public endpoint may require OAuth or API key",
      },
      cps_direct: {
        name: "CPS Golf",
        courses: 6,
        courses_list: [
          "Edinburgh USA Golf Course",
          "Meadowbrook Golf Club",
          "Columbia Golf Club",
          "Hiawatha Golf Course",
          "Hidden Haven Golf Club",
          "Theodore Wirth Golf Course",
        ],
        status: "⏳ REQUIRES: HTML parsing with browser session",
        endpoint: "https://{domain}.cps.golf/onlineresweb/m/search-teetime/default",
        requires: "Course-specific CPS domain",
        note: "May need Puppeteer/Playwright for session management",
      },
      chronogolf: {
        name: "ChronoGolf",
        courses: 6,
        courses_list: [
          "Sundance Golf Club",
          "Riverwood National Golf Course",
          "Orono Orchards Golf Course",
          "Hollydale Golf Course",
          "Baker National Golf Course",
          "Crow River Golf Club",
        ],
        status: "⏳ REQUIRES: HTML parsing or API credentials",
        endpoint: "https://www.chronogolf.com/club/{slug}",
        requires: "Club slug from booking URL",
        note: "Public site scraping may be rate-limited",
      },
      teesnap: {
        name: "TeeSnap",
        courses: 1,
        courses_list: ["Daytona Golf Club"],
        status: "⏳ REQUIRES: JavaScript rendering",
        endpoint: "https://{course}.teesnap.net",
        requires: "Course subdomain",
        note: "JavaScript-heavy site needs browser automation",
      },
      manual: {
        name: "Manual / Direct Booking",
        courses: 26,
        courses_list: [
          "Rush Creek Golf Club",
          "Fox Hollow Golf Club",
          "Spring Hill Golf Club",
          "And 23 others...",
        ],
        status: "ℹ️  FALLBACK - Call Course button + booking link",
        endpoint: "Course websites vary",
        requires: "Manual entry or custom per-course scraping",
      },
    },
    summary: {
      total_courses: 50,
      live_verified: 1,
      potentially_live: 24,
      fallback: 26,
    },
    next_steps: [
      "1. ForeUp (Braemar) is working - verify on www.rubegolf.com",
      "2. GolfNow (11 courses) - Contact GolfNow for API access or credentials",
      "3. CPS Golf (6 courses) - May work with proper headers/session handling",
      "4. ChronoGolf (6 courses) - Check if public API available",
      "5. TeeSnap (1 course) - Requires Puppeteer/Playwright for JS rendering",
      "6. Manual (26 courses) - Users click 'Call Course' to book directly",
    ],
    recommendations: [
      {
        priority: 1,
        action: "Test from www.rubegolf.com server",
        reason: "Production server may have better rate limits/IP reputation",
      },
      {
        priority: 2,
        action: "Contact GolfNow for API access",
        reason: "11 courses depend on this - highest ROI",
      },
      {
        priority: 3,
        action: "Implement Puppeteer/Playwright",
        reason: "Needed for CPS, TeeSnap, and some manual courses",
      },
      {
        priority: 4,
        action: "Accept fallback for manual courses",
        reason: "26 courses without public APIs - users can still book via 'Call Course'",
      },
    ],
  };

  return NextResponse.json(status);
}
