"use client";

import { useEffect, useState as useReactState, useCallback, useMemo, Suspense } from "react";
const useState = useReactState;
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Clock,
  Users,
  Car,
  RefreshCw,
  ArrowLeft,
  SlidersHorizontal,
  ChevronDown,
  ExternalLink,
  DollarSign,
  User,
  LogOut,
  Star,
  BookOpen,
  Share2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

/* ── Types ── */
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
  manual?: boolean;
  duration_minutes?: number;
}

type SortMode = "time" | "price" | "distance";

/* ── Page wrapper ── */
export default function TeeTimesPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <TeeTimesContent />
    </Suspense>
  );
}

/* ── Main content ── */
function TeeTimesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const date = searchParams.get("date") ?? "";
  const startHour = searchParams.get("startHour") ?? "6";
  const endHour = searchParams.get("endHour") ?? "18";

  const [teeTimes, setTeeTimes] = useState<TeeTimeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("time");
  const [courseFilter, setCourseFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [favoriteCourses, setFavoriteCourses] = useState<Set<string>>(new Set());

  // User session
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            setUserName(data?.name ?? user.email?.split("@")[0] ?? null);
          });

        // Load user's favorite courses
        supabase
          .from("favorite_courses")
          .select("course_id")
          .eq("user_id", user.id)
          .then(({ data }) => {
            const ids = new Set(data?.map((f) => f.course_id) ?? []);
            setFavoriteCourses(ids);
          });
      }
    });
  }, []);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
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

      // Distance calc (non-blocking)
      if (userLocation && times.length > 0) {
        try {
          const distRes = await fetch("/api/calculate-distance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userLat: userLocation.lat,
              userLng: userLocation.lng,
              teeTimeIds: times.map((t) => t.id),
            }),
          });
          if (distRes.ok) {
            const distData = await distRes.json();
            times = times.map((t) => ({
              ...t,
              duration_minutes:
                distData.distances?.[t.id]?.duration_minutes ?? undefined,
            }));
          }
        } catch {
          /* distance is optional */
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

  /* ── Derived data ── */
  const courses = useMemo(() => {
    const map = new Map<string, string>();
    teeTimes.forEach((t) => {
      if (t.course?.name) map.set(t.course_id, t.course.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [teeTimes]);

  const sortedFiltered = useMemo(() => {
    let result =
      courseFilter === "all"
        ? [...teeTimes]
        : teeTimes.filter((t) => t.course_id === courseFilter);

    // Filter by favorites if toggled
    if (showFavoritesOnly) {
      result = result.filter((t) => favoriteCourses.has(t.course_id));
    }

    // Filter to live tee times only (exclude "contact course directly" cards)
    if (showLiveOnly) {
      result = result.filter((t) => !t.manual);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "price":
          return (a.price_cents ?? Infinity) - (b.price_cents ?? Infinity);
        case "distance":
          return (
            (a.duration_minutes ?? Infinity) -
            (b.duration_minutes ?? Infinity)
          );
        default:
          return (
            new Date(a.start_time).getTime() -
            new Date(b.start_time).getTime()
          );
      }
    });
    return result;
  }, [teeTimes, courseFilter, sortBy, showFavoritesOnly, showLiveOnly, favoriteCourses]);

  const displayDate = date
    ? format(parseISO(date), "EEEE, MMMM d, yyyy")
    : "";

  const timeLabel = (() => {
    const s = parseInt(startHour);
    const e = parseInt(endHour);
    if (s === 6 && e === 10) return "Morning";
    if (s === 10 && e === 14) return "Midday";
    if (s === 14 && e === 18) return "Afternoon";
    return `${s}:00 \u2013 ${e}:00`;
  })();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              &#9971;
            </span>
            <span className="text-lg font-bold tracking-tight text-primary">
              RubeGolf
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={fetchTeeTimes}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {userName && (
              <>
                <span className="hidden md:flex items-center gap-1.5 text-sm text-gray-500">
                  <User className="h-3.5 w-3.5" />
                  {userName}
                </span>
                <button
                  onClick={() => router.push("/bookings")}
                  className="text-gray-400 hover:text-gray-600 transition"
                  title="My bookings"
                >
                  <BookOpen className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-gray-400 hover:text-gray-600 transition"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* ── Summary bar ── */}
        <div className="mb-6">
          <motion.h2
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-gray-900 sm:text-3xl"
          >
            {displayDate}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="mt-1 text-sm text-gray-500"
          >
            {timeLabel}{" "}
            {!loading && (
              <span>
                &middot;{" "}
                <span className="font-medium text-gray-700">
                  {sortedFiltered.length}
                </span>{" "}
                tee {sortedFiltered.length === 1 ? "time" : "times"} found
              </span>
            )}
          </motion.p>
        </div>

        {/* ── Controls ── */}
        {!loading && teeTimes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="mb-6 flex flex-wrap items-center gap-3"
          >
            {/* Sort pills */}
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
              {(
                [
                  { key: "time", label: "Earliest", icon: Clock },
                  { key: "price", label: "Price", icon: DollarSign },
                  { key: "distance", label: "Nearest", icon: Car },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                    sortBy === key
                      ? "sort-active"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Favorites toggle */}
            {userId && (
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition ${
                  showFavoritesOnly
                    ? "sort-active"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-amber-500" : ""}`} />
                <span className="hidden sm:inline">Favorites</span>
              </button>
            )}

            {/* Live tee times filter */}
            <button
              onClick={() => setShowLiveOnly(!showLiveOnly)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition ${
                showLiveOnly
                  ? "sort-active"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${showLiveOnly ? "bg-white" : "bg-green-500"}`} />
              <span>Live only</span>
            </button>

            {/* Course filter */}
            {courses.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {courseFilter === "all"
                    ? "All courses"
                    : courses.find(([id]) => id === courseFilter)?.[1] ??
                      "Filter"}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                <AnimatePresence>
                  {filterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                    >
                      <button
                        onClick={() => {
                          setCourseFilter("all");
                          setFilterOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition hover:bg-gray-50 ${
                          courseFilter === "all"
                            ? "font-semibold text-primary"
                            : "text-gray-600"
                        }`}
                      >
                        All courses
                      </button>
                      {courses.map(([id, name]) => (
                        <button
                          key={id}
                          onClick={() => {
                            setCourseFilter(id);
                            setFilterOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm transition hover:bg-gray-50 ${
                            courseFilter === id
                              ? "font-semibold text-primary"
                              : "text-gray-600"
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Results ── */}
        {loading ? (
          <LoadingGrid />
        ) : sortedFiltered.length === 0 ? (
          <EmptyState onRefresh={fetchTeeTimes} />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              show: { transition: { staggerChildren: 0.04 } },
              hidden: {},
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {sortedFiltered.map((tt, i) => (
              <TeeTimeCard
                key={tt.id}
                teeTime={tt}
                index={i}
                userId={userId ?? undefined}
                isFavorited={favoriteCourses.has(tt.course_id)}
                onFavoriteChange={(courseId, isFav) => {
                  const newFavs = new Set(favoriteCourses);
                  if (isFav) {
                    newFavs.add(courseId);
                  } else {
                    newFavs.delete(courseId);
                  }
                  setFavoriteCourses(newFavs);
                }}
              />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Tee Time Card
   ═══════════════════════════════════════════ */
function TeeTimeCard({
  teeTime,
  index,
  userId,
  isFavorited = false,
  onFavoriteChange,
}: {
  teeTime: TeeTimeResult;
  index: number;
  userId?: string;
  isFavorited?: boolean;
  onFavoriteChange?: (courseId: string, isFavorited: boolean) => void;
}) {
  // Times are in course local time (no timezone offset)
  // "2026-04-17T10:50:00" → parse without TZ conversion
  const timeStr = (() => {
    try {
      // Extract HH:MM directly from the string to avoid any TZ issues
      const timePart = teeTime.start_time.split("T")[1];
      if (timePart) {
        const [hStr, mStr] = timePart.split(":");
        const h = parseInt(hStr);
        const m = mStr ?? "00";
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${h12}:${m} ${ampm}`;
      }
      return format(parseISO(teeTime.start_time), "h:mm a");
    } catch {
      return teeTime.start_time;
    }
  })();

  const price =
    teeTime.price_cents && teeTime.price_cents > 0
      ? `$${(teeTime.price_cents / 100).toFixed(0)}`
      : null;

  const [isFav, setIsFav] = useState(isFavorited);
  const [_bookingLoading, setBookingLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const supabase = createClient();

  const handleBook = async () => {
    if (!teeTime.booking_url) return;

    setBookingLoading(true);
    try {
      // Log booking click if user is logged in
      if (userId) {
        await fetch("/api/book-tee-time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tee_time_id: teeTime.id,
            course_id: teeTime.course_id,
            course_name: teeTime.course?.name,
            tee_time_display: timeStr,
            price_cents: teeTime.price_cents,
            booking_url: teeTime.booking_url,
          }),
        });
      }

      // Open course booking page
      window.open(teeTime.booking_url, "_blank", "noopener,noreferrer");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!userId) return;

    setFavoriteLoading(true);
    try {
      if (isFav) {
        const { error } = await supabase
          .from("favorite_courses")
          .delete()
          .eq("user_id", userId)
          .eq("course_id", teeTime.course_id);

        if (error) throw error;
        setIsFav(false);
        onFavoriteChange?.(teeTime.course_id, false);
      } else {
        const { error } = await supabase.from("favorite_courses").insert({
          user_id: userId,
          course_id: teeTime.course_id,
        });

        if (error && error.code !== "23505") throw error;
        setIsFav(true);
        onFavoriteChange?.(teeTime.course_id, true);
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();

    const spotsText = teeTime.players_needed === 1 ? "spot" : "spots";
    const summary = `${teeTime.course?.name}
📍 ${teeTime.course?.address}

${timeStr}
${price ?? "Call for price"}
${teeTime.players_needed} ${spotsText}

Found on RubeGolf: www.rubegolf.com`;

    const shareUrl = `https://www.rubegolf.com/share?tee=${encodeURIComponent(summary)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.25, delay: index * 0.03 },
        },
      }}
      className="card-hover flex flex-col overflow-hidden"
    >
      {/* Header band */}
      <div className="flex items-start justify-between bg-gradient-to-r from-primary/[0.06] to-transparent px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900 text-sm">
            {teeTime.course?.name}
          </h3>
          {teeTime.course?.address && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 truncate">
              📍 {teeTime.course.address}
            </p>
          )}
        </div>

        <div className="ml-2 flex items-center gap-1 flex-shrink-0">
          {userId && (
            <button
              onClick={handleFavorite}
              disabled={favoriteLoading}
              className="rounded-lg p-1.5 text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition disabled:opacity-50"
              title={isFav ? "Remove favorite" : "Add to favorites"}
            >
              <Star
                className={`h-4 w-4 transition ${
                  isFav ? "fill-amber-500 text-amber-500" : ""
                }`}
              />
            </button>
          )}

          <button
            onClick={handleShare}
            className="rounded-lg p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition"
            title="Share tee time"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {teeTime.cps_direct && (
          <span className="ml-2 flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            Live
          </span>
        )}
        {teeTime.manual && (
          <span className="ml-2 flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
            Call
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 py-4">
        {/* Time & Price row */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xl font-bold text-gray-900">{timeStr}</span>
          </div>
          {price ? (
            <span className="text-lg font-bold text-primary">{price}</span>
          ) : (
            <span className="text-sm text-gray-400">Call for price</span>
          )}
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {teeTime.players_needed} spot
            {teeTime.players_needed !== 1 ? "s" : ""}
          </span>
          {teeTime.duration_minutes ? (
            <span className="flex items-center gap-1">
              <Car className="h-3.5 w-3.5" />
              {teeTime.duration_minutes} min
            </span>
          ) : null}
        </div>

        {/* CPS notice */}
        {teeTime.cps_direct && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Book directly on the course website for live availability.
          </p>
        )}
        {teeTime.manual && (
          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Contact course directly for tee time availability.
          </p>
        )}
      </div>

      {/* Book button */}
      <div className="mt-auto border-t border-gray-100 px-5 py-3">
        <button
          onClick={handleBook}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 active:scale-[0.98]"
        >
          {teeTime.cps_direct ? "View on Course Site" : teeTime.manual ? "Call Course" : "Book Now"}
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Loading states
   ═══════════════════════════════════════════ */
function LoadingShell() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="glass-nav">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="h-5 w-20 skeleton rounded" />
          <div className="ml-auto h-8 w-24 skeleton rounded-lg" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="h-8 w-64 skeleton rounded mb-2" />
          <div className="h-4 w-40 skeleton rounded" />
        </div>
        <LoadingGrid />
      </main>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
        >
          <div className="px-5 py-3.5">
            <div className="h-4 w-3/4 skeleton rounded mb-2" />
            <div className="h-3 w-1/2 skeleton rounded" />
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-6 w-20 skeleton rounded" />
              <div className="h-6 w-12 skeleton rounded" />
            </div>
            <div className="h-4 w-32 skeleton rounded" />
          </div>
          <div className="border-t border-gray-100 px-5 py-3">
            <div className="h-10 w-full skeleton rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
        <Clock className="h-7 w-7 text-gray-400" />
      </div>
      <p className="text-lg font-semibold text-gray-800">No tee times found</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
        Try a different date, widen your time window, or refresh to check again.
      </p>
      <button
        onClick={onRefresh}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </button>
    </div>
  );
}
