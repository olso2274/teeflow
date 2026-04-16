export interface GolfCourse {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  booking_url: string;
  created_at: string;
}

export interface TeeTime {
  id: string;
  course_id: string;
  start_time: string; // ISO 8601 timestamp
  end_time: string | null;
  players_needed: number;
  price_cents: number | null;
  status: "open" | "booked" | "closed";
  created_at: string;
  course?: GolfCourse;
}

export interface Booking {
  id: string;
  user_id: string;
  tee_time_id: string;
  status: "confirmed" | "cancelled";
  created_at: string;
  tee_time?: TeeTime;
}

export interface SearchParams {
  date: string; // YYYY-MM-DD
  startHour: number;
  endHour: number;
}

export interface ScrapedTeeTime {
  course_id: string;
  start_time: string;
  end_time: string | null;
  players_needed: number;
  price_cents: number | null;
  status: "open" | "booked" | "closed";
}

export interface DistanceResult {
  course_id: string;
  course_name: string;
  distance_meters: number;
  distance_km: number;
  duration_seconds: number;
  duration_minutes: number;
  duration_text: string;
}

export interface ResultTeeTime extends TeeTime {
  distance_km?: number;
  duration_minutes?: number;
  duration_text?: string;
}
