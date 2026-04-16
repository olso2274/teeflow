// Server-side Supabase operations
// Use createClient() from utils/supabase/server for server components
// Use createClient() from utils/supabase/client for client components

import { createClient as createServerClient } from "@/utils/supabase/server";

// Helper function for server-side database operations
export async function getGolfCourses() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("golf_courses")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching golf courses:", error);
    throw error;
  }

  return data;
}

export async function getTeeTimes(
  courseId?: string,
  startTime?: string,
  endTime?: string
) {
  const supabase = await createServerClient();
  let query = supabase.from("tee_times").select("*, course:golf_courses(*)");

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  if (startTime) {
    query = query.gte("start_time", startTime);
  }

  if (endTime) {
    query = query.lte("start_time", endTime);
  }

  const { data, error } = await query.eq("status", "open").order("start_time");

  if (error) {
    console.error("Error fetching tee times:", error);
    throw error;
  }

  return data;
}

export async function createBooking(userId: string, teeTimeId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert([{ user_id: userId, tee_time_id: teeTimeId, status: "confirmed" }])
    .select();

  if (error) {
    console.error("Error creating booking:", error);
    throw error;
  }

  return data?.[0];
}

export async function getUserBookings(userId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, tee_time:tee_times(*, course:golf_courses(*))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user bookings:", error);
    throw error;
  }

  return data;
}
