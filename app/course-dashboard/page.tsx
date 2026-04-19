"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import {
  LogOut,
  Plus,
  Trash2,
  Clock,
  Users,
  DollarSign,
  Zap,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Flag,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface CourseAccount {
  id: string;
  course_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  status: string;
}

interface CourseTime {
  id: string;
  date: string;
  tee_time: string;
  spots_available: number;
  price_cents: number | null;
  special_note: string | null;
  is_last_minute: boolean;
  is_active: boolean;
  course_name: string;
}

type PostMode = "lastminute" | "future" | null;

export default function CourseDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [account, setAccount] = useState<CourseAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [times, setTimes] = useState<CourseTime[]>([]);
  const [timesLoading, setTimesLoading] = useState(false);
  const [postMode, setPostMode] = useState<PostMode>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [teeTime, setTeeTime] = useState("08:00");
  const [spots, setSpots] = useState("4");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadTimes = useCallback(async () => {
    setTimesLoading(true);
    try {
      const res = await fetch("/api/course/my-times");
      if (res.ok) {
        const data = await res.json();
        setTimes(data.times ?? []);
      }
    } finally {
      setTimesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) router.replace("/course-signup");
        return;
      }

      const res = await fetch("/api/course/me");
      const data = await res.json();

      if (!data.account) {
        if (!cancelled) router.replace("/course-signup");
        return;
      }

      if (!cancelled) {
        setAccount(data.account);
        setLoading(false);
        loadTimes();
      }
    };

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSubmitTime = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const isLastMinute = postMode === "lastminute";
    const submissionDate = isLastMinute ? format(new Date(), "yyyy-MM-dd") : date;

    try {
      const res = await fetch("/api/course/submit-tee-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: submissionDate,
          teeTime,
          spotsAvailable: parseInt(spots) || 4,
          priceCents: price ? Math.round(parseFloat(price) * 100) : null,
          specialNote: note.trim() || null,
          isLastMinute,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to submit.");
        return;
      }

      setSubmitSuccess(true);
      setPostMode(null);
      setNote("");
      setPrice("");
      setSpots("4");
      setTeeTime("08:00");
      loadTimes();

      setTimeout(() => setSubmitSuccess(false), 6000);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("Remove this tee time? Golfers will no longer see it.")) return;
    const res = await fetch("/api/course/my-times", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setTimes((prev) => prev.filter((t) => t.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const formatTimeDisplay = (t: string) => {
    const [hStr, mStr] = t.split(":");
    const h = parseInt(hStr);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${mStr} ${ampm}`;
  };

  const upcomingTimes = times.filter((t) => t.is_active);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTimes = upcomingTimes.filter((t) => t.date === todayStr);
  const lastMinuteTimes = upcomingTimes.filter((t) => t.is_last_minute);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>&#9971;</span>
              <span className="text-lg font-bold tracking-tight text-primary">RubeGolf</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500 font-medium">
              {account?.course_name}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-1">
            <Flag className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">{account?.course_name}</h1>
          </div>
          <p className="text-sm text-gray-500">
            Welcome back, {account?.contact_name?.split(" ")[0]}. Post tee time openings below
            &mdash; they&apos;ll appear in search results immediately.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Total Posted", value: upcomingTimes.length, color: "text-primary" },
            { label: "Today", value: todayTimes.length, color: "text-amber-600" },
            { label: "Last Minute", value: lastMinuteTimes.length, color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {submitSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-700">
                Tee time posted! It&apos;s now visible to golfers searching for your area.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Left: Post Tee Times ── */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Post a tee time</h2>

            {/* Post mode selector */}
            {!postMode && (
              <div className="grid grid-cols-2 gap-3">
                {/* Last Minute */}
                <button
                  onClick={() => { setPostMode("lastminute"); setFormError(null); }}
                  className="card-hover flex flex-col items-start p-5 text-left border-2 border-transparent hover:border-amber-300 transition"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                    <Zap className="h-5 w-5 text-amber-500" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">Last-Minute Opening</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    Today only. Featured prominently for day-of golfers.
                  </p>
                </button>

                {/* Future tee time */}
                <button
                  onClick={() => { setPostMode("future"); setFormError(null); }}
                  className="card-hover flex flex-col items-start p-5 text-left border-2 border-transparent hover:border-primary/30 transition"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">Schedule Tee Time</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    Any future date. Shows up in search results.
                  </p>
                </button>
              </div>
            )}

            {/* Post form */}
            <AnimatePresence>
              {postMode && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {postMode === "lastminute" ? (
                        <Zap className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Calendar className="h-4 w-4 text-primary" />
                      )}
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {postMode === "lastminute" ? "Last-Minute Opening (Today)" : "Schedule Tee Time"}
                      </h3>
                    </div>
                    <button
                      onClick={() => { setPostMode(null); setFormError(null); }}
                      className="text-xs text-gray-400 hover:text-gray-600 transition"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleSubmitTime} className="space-y-3.5">
                    {/* Date (future only) */}
                    {postMode === "future" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                        <input
                          type="date"
                          value={date}
                          min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                          required
                        />
                      </div>
                    )}

                    {/* Time */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Tee time
                      </label>
                      <input
                        type="time"
                        value={teeTime}
                        onChange={(e) => setTeeTime(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                        required
                      />
                    </div>

                    {/* Spots + Price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          <Users className="inline h-3 w-3 mr-1" />
                          Spots available
                        </label>
                        <select
                          value={spots}
                          onChange={(e) => setSpots(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                        >
                          {[1, 2, 3, 4].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          <DollarSign className="inline h-3 w-3 mr-1" />
                          Price (optional)
                        </label>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="45"
                          min="0"
                          step="0.01"
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                        />
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-600">
                          Special note <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <span className={`text-xs ${note.length >= 100 ? "text-amber-500" : "text-gray-400"}`}>
                          {note.length}/120
                        </span>
                      </div>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Cart included, walking welcome…"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                        maxLength={120}
                      />
                    </div>

                    {formError && (
                      <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                        {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {submitting ? "Posting..." : "Post tee time"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right: My Posted Times ── */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Upcoming posted times
              {upcomingTimes.length > 0 && (
                <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">
                  {upcomingTimes.length}
                </span>
              )}
            </h2>

            {timesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 skeleton rounded-xl" />
                ))}
              </div>
            ) : upcomingTimes.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-10 text-center">
                <Calendar className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No upcoming tee times posted.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Post your first opening using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTimes.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatTimeDisplay(t.tee_time)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(t.date + "T12:00:00"), "MMM d")}
                        </span>
                        {t.is_last_minute && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                            Last Minute
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                        <span>{t.spots_available} spot{t.spots_available !== 1 ? "s" : ""}</span>
                        {t.price_cents && (
                          <span>${(t.price_cents / 100).toFixed(0)}</span>
                        )}
                        {t.special_note && (
                          <span className="truncate max-w-[120px]">{t.special_note}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancel(t.id)}
                      className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
                      title="Remove this tee time"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info section */}
        <div className="mt-10 rounded-2xl bg-primary-50/50 border border-primary/10 px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">How it works</h3>
          <ul className="space-y-1.5 text-xs text-gray-600 leading-relaxed">
            <li>&#8226; Tee times you post appear immediately in search results for your area.</li>
            <li>&#8226; Last-minute openings are featured on the home page for day-of golfers.</li>
            <li>&#8226; Golfers contact your course directly to book &mdash; no booking fees.</li>
            <li>&#8226; Remove a time at any time by clicking the trash icon above.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
