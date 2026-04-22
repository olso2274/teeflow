"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday, isBefore,
  addMonths, subMonths, startOfDay, parseISO,
} from "date-fns";
import {
  Phone, Globe, Clock, Users, DollarSign,
  ChevronLeft, ChevronRight, Zap, ExternalLink, Calendar, Flag,
} from "lucide-react";

interface CourseProfile {
  id: string;
  course_name: string;
  phone: string | null;
  website_url: string | null;
  logo_url: string | null;
}

interface TeeTimeSlot {
  id: string;
  date: string;
  tee_time: string;
  spots_available: number;
  spots_booked: number;
  status: string;
  price_cents: number | null;
  special_note: string | null;
  is_last_minute: boolean;
}

function fmt12(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}

const TODAY = startOfDay(new Date());
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function EmbedPage() {
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<CourseProfile | null>(null);
  const [times, setTimes] = useState<TeeTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [calMonth, setCalMonth] = useState(startOfMonth(TODAY));
  const [selectedDate, setSelectedDate] = useState<Date>(TODAY);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/course/profile?id=${id}`).then((r) => r.json()),
      fetch(`/api/course/public-times?id=${id}`).then((r) => r.json()),
    ]).then(([{ profile: p }, { times: t }]) => {
      setProfile(p ?? null);
      const slots: TeeTimeSlot[] = t ?? [];
      setTimes(slots);

      const todayStr = format(TODAY, "yyyy-MM-dd");
      const hasToday = slots.some((s) => s.date === todayStr);
      if (!hasToday && slots.length > 0) {
        const first = parseISO(slots[0].date + "T12:00:00");
        setSelectedDate(first);
        setCalMonth(startOfMonth(first));
      }
    }).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  const timesByDate = useMemo(() => {
    const map: Record<string, TeeTimeSlot[]> = {};
    times.forEach((t) => { (map[t.date] ??= []).push(t); });
    return map;
  }, [times]);

  const datesWithTimes = useMemo(() => new Set(Object.keys(timesByDate)), [timesByDate]);
  const datesWithLastMinute = useMemo(
    () => new Set(times.filter((t) => t.is_last_minute).map((t) => t.date)),
    [times]
  );

  const todayStr = format(TODAY, "yyyy-MM-dd");
  const selectedStr = format(selectedDate, "yyyy-MM-dd");
  const selectedTimes = timesByDate[selectedStr] ?? [];
  const todayLastMinute = (timesByDate[todayStr] ?? []).filter((t) => t.is_last_minute);

  const calDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calMonth));
    const end = endOfWeek(endOfMonth(calMonth));
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  const phoneClean = profile?.phone?.replace(/\D/g, "") ?? null;
  const phoneDisplay = profile?.phone?.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3") ?? null;
  const fullPageUrl = `https://www.rubegolf.com/course/${id}`;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center bg-white">
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[200px] items-center justify-center bg-white text-sm text-gray-400">
        Course not found.
      </div>
    );
  }

  return (
    <div className="bg-white font-sans text-gray-900 min-h-screen">
      {/* ── Compact header ── */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {profile.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo_url} alt={profile.course_name}
              className="h-8 w-8 rounded-lg object-contain border border-gray-100"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Flag className="h-4 w-4 text-emerald-600" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">{profile.course_name}</p>
            <p className="text-[10px] text-gray-400 leading-tight">Tee Time Availability</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {phoneClean && (
            <a href={`tel:${phoneClean}`}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition">
              <Phone className="h-3 w-3" /> Call
            </a>
          )}
          <a href={fullPageUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition">
            <ExternalLink className="h-3 w-3" /> RubeGolf
          </a>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Last-Minute Featured ── */}
        <AnimatePresence>
          {todayLastMinute.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl bg-amber-50 border border-amber-200 p-3"
            >
              <div className="flex items-center gap-1.5 mb-2.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-900">Last-Minute Openings Today</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {todayLastMinute.map((t) => {
                  const remaining = (t.spots_available ?? 0) - (t.spots_booked ?? 0);
                  const price = t.price_cents ? `$${(t.price_cents / 100).toFixed(0)}` : null;
                  return (
                    <div key={t.id} className="rounded-lg bg-white border border-amber-100 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900">{fmt12(t.tee_time)}</span>
                        {price && <span className="text-sm font-bold text-emerald-600">{price}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2">
                        <Users className="h-3 w-3" />
                        {remaining > 0 ? `${remaining} spot${remaining !== 1 ? "s" : ""} open` : "Full"}
                      </div>
                      {t.special_note && (
                        <p className="text-[11px] text-amber-700 italic mb-2">&ldquo;{t.special_note}&rdquo;</p>
                      )}
                      {phoneClean && remaining > 0 && (
                        <a href={`tel:${phoneClean}`}
                          className="flex items-center justify-center gap-1 rounded-lg bg-amber-500 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition">
                          <Phone className="h-3 w-3" /> Call to Book
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Calendar + Times ── */}
        <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
          {/* Calendar */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 self-start">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCalMonth((m) => subMonths(m, 1))}
                disabled={isBefore(endOfMonth(calMonth), TODAY)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-25 disabled:cursor-not-allowed transition">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-semibold text-gray-700">{format(calMonth, "MMMM yyyy")}</span>
              <button
                onClick={() => setCalMonth((m) => addMonths(m, 1))}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-700 hover:bg-white transition">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[9px] font-semibold text-gray-400 py-0.5">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
              {calDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, calMonth);
                const isPast = isBefore(day, TODAY);
                const isTodayDay = isToday(day);
                const isSelected = isSameDay(day, selectedDate);
                const hasTimes = datesWithTimes.has(dayStr);
                const hasLastMin = datesWithLastMinute.has(dayStr);

                return (
                  <button
                    key={dayStr}
                    onClick={() => { if (!isPast || isTodayDay) setSelectedDate(day); }}
                    disabled={isPast && !isTodayDay}
                    className={`relative flex flex-col items-center justify-center rounded-lg py-1 text-xs transition
                      ${!inMonth ? "opacity-0 pointer-events-none" : ""}
                      ${isPast && !isTodayDay ? "opacity-25 cursor-not-allowed" : "cursor-pointer"}
                      ${isSelected
                        ? "bg-emerald-500 text-white shadow-sm"
                        : isTodayDay
                        ? "ring-2 ring-emerald-400/50 text-emerald-700 font-semibold hover:bg-white"
                        : hasTimes
                        ? "hover:bg-white text-gray-800 font-medium"
                        : "text-gray-400 hover:bg-white/60"
                      }
                    `}
                  >
                    <span className="text-[11px] leading-none">{format(day, "d")}</span>
                    <span className={`mt-0.5 h-1 w-1 rounded-full ${
                      !inMonth || isPast ? "invisible" :
                      isSelected ? "bg-white/60" :
                      hasLastMin ? "bg-amber-400" :
                      hasTimes ? "bg-emerald-400" : "invisible"
                    }`} />
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 flex gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Available
              </span>
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Last-minute
              </span>
            </div>
          </div>

          {/* Times panel */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-gray-700">
                {isToday(selectedDate) ? "Today — " : ""}{format(selectedDate, "EEE, MMM d")}
              </span>
              {selectedTimes.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {selectedTimes.length}
                </span>
              )}
            </div>

            <AnimatePresence mode="wait">
              {selectedTimes.length === 0 ? (
                <motion.div
                  key={`empty-${selectedStr}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center"
                >
                  <Clock className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                  <p className="text-xs font-medium text-gray-500">No tee times for this date</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {datesWithTimes.size > 0 ? "Pick a highlighted date." : "Call the course to book."}
                  </p>
                  {phoneClean && (
                    <a href={`tel:${phoneClean}`}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition">
                      <Phone className="h-3 w-3" /> {phoneDisplay ?? "Call Course"}
                    </a>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={`times-${selectedStr}`}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  {selectedTimes.map((t) => {
                    const remaining = (t.spots_available ?? 0) - (t.spots_booked ?? 0);
                    const bookedPct = t.spots_available > 0
                      ? Math.min(100, Math.round(((t.spots_booked ?? 0) / t.spots_available) * 100))
                      : 0;
                    const price = t.price_cents ? `$${(t.price_cents / 100).toFixed(0)}` : null;

                    return (
                      <div key={t.id}
                        className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900">{fmt12(t.tee_time)}</span>
                            {t.is_last_minute && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 uppercase tracking-wide">
                                Last Min
                              </span>
                            )}
                            {remaining <= 0 && (
                              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 uppercase">
                                Full
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {remaining > 0 ? `${remaining} open` : "Full"}
                            </span>
                            {price
                              ? <span className="font-semibold text-emerald-600">{price}</span>
                              : <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" />Call</span>
                            }
                          </div>
                          {/* Mini progress bar */}
                          <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden w-24">
                            <div className={`h-full rounded-full ${
                              bookedPct >= 100 ? "bg-red-400" :
                              bookedPct >= 75 ? "bg-amber-400" : "bg-emerald-400"
                            }`} style={{ width: `${bookedPct}%` }} />
                          </div>
                          {t.special_note && (
                            <p className="mt-1 text-[11px] text-gray-400 italic truncate">&ldquo;{t.special_note}&rdquo;</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {phoneClean && remaining > 0 ? (
                            <a href={`tel:${phoneClean}`}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition whitespace-nowrap">
                              <Phone className="h-3 w-3" /> Call
                            </a>
                          ) : profile.website_url && remaining > 0 ? (
                            <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition whitespace-nowrap">
                              <Globe className="h-3 w-3" /> Book
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Powered by footer ── */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-300">Tee times powered by</span>
        <a href="https://www.rubegolf.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-emerald-600 transition font-medium">
          <span>⛳</span> RubeGolf
        </a>
      </div>
    </div>
  );
}
