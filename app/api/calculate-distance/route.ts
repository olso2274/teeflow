import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface DistanceMatrixElement {
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  status: string;
}

export async function POST(request: NextRequest) {
  const { userLat, userLng, teeTimeIds } = await request.json();

  if (!userLat || !userLng || !teeTimeIds || teeTimeIds.length === 0) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Fetch tee times with course info
    const supabase = await createClient();
    const { data: teeTimes, error: fetchError } = await supabase
      .from("tee_times")
      .select("id, course:golf_courses(id, name, lat, lng)")
      .in("id", teeTimeIds);

    if (fetchError) throw fetchError;

    if (!teeTimes || teeTimes.length === 0) {
      return NextResponse.json({ distances: {} });
    }

    // Group by course to batch requests
    const courseMap = new Map<string, any>();
    const teeTimeMap = new Map<string, any>();

    teeTimes.forEach((tt: any) => {
      teeTimeMap.set(tt.id, tt);
      if (tt.course && !courseMap.has(tt.course.id)) {
        courseMap.set(tt.course.id, tt.course);
      }
    });

    const distances: Record<
      string,
      {
        distance_km: number;
        duration_minutes: number;
        duration_text: string;
      }
    > = {};

    // Call Google Distance Matrix API
    const origins = `${userLat},${userLng}`;
    const destinations = Array.from(courseMap.values())
      .map((c) => `${c.lat},${c.lng}`)
      .join("|");

    if (destinations) {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      url.searchParams.append("origins", origins);
      url.searchParams.append("destinations", destinations);
      url.searchParams.append("key", GOOGLE_MAPS_API_KEY);
      url.searchParams.append("mode", "driving");

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === "OK" && data.rows && data.rows[0]) {
        const elements: DistanceMatrixElement[] = data.rows[0].elements;
        const courses = Array.from(courseMap.values());

        elements.forEach((element: DistanceMatrixElement, idx: number) => {
          if (element.status === "OK") {
            const courseId = courses[idx].id;
            distances[courseId] = {
              distance_km: element.distance.value / 1000,
              duration_minutes: Math.round(element.duration.value / 60),
              duration_text: element.duration.text,
            };
          }
        });
      }
    }

    // Map distances back to tee times
    const result: Record<string, any> = {};
    teeTimeMap.forEach((tt: any) => {
      const courseId = tt.course?.id;
      const distanceData = courseId ? distances[courseId] : null;
      result[tt.id] = distanceData || null;
    });

    return NextResponse.json({ distances: result });
  } catch (error) {
    console.error("Distance calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate distances" },
      { status: 500 }
    );
  }
}
