"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { MapPin, Clock, Users, Car, RefreshCw, ArrowLeft } from "lucide-react";

interface Course {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  booking_url: string;
}

interface TeeTimeResult {
  id: string;
  course_id: string;
  course: Course;
  start_time: string;
  players_needed: number;
  price_cents: number | null;
  status: string;
  booking_url: string;
  cps_direct?: boolean;
  duration_minutes?: number;
}

export default function TeeTimesPage() {
  return (
    <Suspense fallback={<LoadingGrid />}>
      <TeeTimesContent />
    </Suspense>
  );
}

function TeeTimesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const date = searchParams.get("date") ?? "";
  const startHour = searchParams.get("startHour") ?? "6";
  const endHour = searchParams.get("endHour") ?? "18";

  const [teeTimes, setTeeTimes] = useState<TeeTimeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user geolocation once
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => null
      );
    }
  }, []);

  const fetchTeeTimes = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/scrape-tee-times?date=${date}&startHour=${startHour}&endHour=${endHour}`
      );
      if (!res.ok) throw new Error("Failed to load tee times");
      const data = await res.json();
      let times: TeeTimeResult[] = data.tee_times ?? [];

      // If we have location, calculate distances
      if (userLocation && times.length > 0) {
        const ids = times.map((t) => t.id);
        try {
          const distRes = await fetch("/api/calculate-distance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userLat: userLocation.lat,
              userLng: userLocation.lng,
              teeTimeIds: ids,
            }),
          });
          if (distRes.ok) {
            const distData = await distRes.json();
            times = times.map((t) => ({
              ...t,
              duration_minutes: distData.distances?.[t.id]?.duration_minutes ?? null,
            }));
          }
        } catch {
          // distance is optional, continue without it
        }
      }

      setTeeTimes(times);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [date, startHour, endHour, userLocation]);

  useEffect(() => {
    fetchTeeTimes();
  }, [fetchTeeTimes]);

  const displayDate = date
    ? format(parseISO(date), "EEEE, MMMM d, yyyy")
    : "";

  const timeLabel = () => {
    const s = parseInt(startHour);
    const e = parseInt(endHour);
    if (s === 6 && e === 10) return "Morning (6–10am)";
    if (s === 10 && e === 14) return "Midday (10am–2pm)";
    if (s === 14 && e === 18) return "Afternoon (2–6pm)";
    return `${s}:00–${e}:00`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⛳</span>
            <h1 className="text-xl font-bold text-primary">TeeFlow</h1>
          </div>
          <button
            onClick={fetchTeeTimes}
            disabled={loading}
            className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Date/time summary */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900">{displayDate}</h2>
          <p className="mt-1 text-gray-500">{timeLabel()}</p>
        </motion.div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingGrid />
        ) : teeTimes.length === 0 ? (
          <EmptyState onRefresh={fetchTeeTimes} />
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {teeTimes.length} tee {teeTimes.length === 1 ? "time" : "times"} found
            </p>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.07 } }, hidden: {} }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {teeTimes.map((tt, i) => (
                <TeeTimeCard key={tt.id} teeTime={tt} index={i} />
              ))}
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}

function TeeTimeCard({ teeTime, index }: { teeTime: TeeTimeResult; index: number }) {
  const timeStr = (() => {
    try {
      return format(parseISO(teeTime.start_time), "h:mm a");
    } catch {
      return new Date(teeTime.start_time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  })();

  const price =
    teeTime.price_cents && teeTime.price_cents > 0
      ? `$${(teeTime.price_cents / 100).toFixed(0)}`
      : null;

  const handleBook = () => {
    if (teeTime.booking_url) {
      window.open(teeTime.booking_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, delay: index * 0.04 } },
      }}
      className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {/* Card header */}
      <div className="rounded-t-xl bg-gradient-to-r from-primary/10 to-accent/10 px-5 py-4">
        <h3 className="font-bold text-primary">{teeTime.course?.name}</h3>
        {teeTime.course?.address && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            {teeTime.course.address}
          </p>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        {/* Time */}
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Clock className="h-5 w-5 text-primary" />
          {timeStr}
        </div>

        {/* Stats row */}
        <div className="flex gap-2">
          <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-50 py-2 text-sm">
            <Users className="h-4 w-4 text-gray-400" />
            <span>{teeTime.players_needed} spots</span>
          </div>
          <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gray-50 py-2 text-sm font-semibold text-primary">
            {price ? price : <span className="text-gray-400 font-normal">Call</span>}
          </div>
        </div>

        {/* Distance */}
        {teeTime.duration_minutes ? (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
            <Car className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-blue-800">
              {teeTime.duration_minutes} min drive
            </span>
          </div>
        ) : null}

        {/* CPS direct notice */}
        {teeTime.cps_direct && (
          <p className="text-xs text-gray-400 text-center">
            Live times available on course website
          </p>
        )}
      </div>

      {/* Book button */}
      <div className="border-t border-gray-100 px-5 py-3">
        <button
          onClick={handleBook}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 active:scale-95"
        >
          {teeTime.cps_direct ? "Book on Course Site →" : "Book Now →"}
        </button>
      </div>
    </motion.div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
          <div className="mb-4 h-5 w-2/3 rounded bg-gray-200" />
          <div className="mb-3 h-4 w-full rounded bg-gray-100" />
          <div className="mb-3 h-4 w-1/2 rounded bg-gray-100" />
          <div className="mt-4 h-10 w-full rounded-lg bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
      <div className="text-5xl mb-4">🕳️</div>
      <p className="text-lg font-semibold text-gray-700">No tee times found</p>
      <p className="mt-1 text-sm text-gray-500">
        Try a different date or time range, or refresh to check again.
      </p>
      <button
        onClick={onRefresh}
        className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
      >
        Refresh Tee Times
      </button>
    </div>
  );
}
