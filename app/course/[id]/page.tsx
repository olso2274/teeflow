"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday, isBefore,
  addMonths, subMonths, startOfDay, parseISO,
} from "date-fns";
import {
  ArrowLeft, Globe, Phone, MapPin, Clock, Users, DollarSign,
  Flag, ExternalLink, Calendar, ChevronLeft, ChevronRight, Zap,
  LogIn, CheckCircle2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import BookingModal, { type BookingSlot, type BookingUser } from "@/app/components/BookingModal";
import AuthModal from "@/app/components/AuthModal";

/* ── Types ──────────────────────────────────────────────────────────────── */
interface CourseProfile {
  id: string;
  course_name: string;
  contact_name: string;
  phone: string | null;
  website_url: string | null;
  description: string | null;
  address: string | null;
  holes: number | null;
  par: number | null;
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

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmt12(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}

const TODAY = startOfDay(new Date());
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function CourseProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    }>
      <CourseProfileContent />
    </Suspense>
  );
}

function CourseProfileContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [profile, setProfile] = useState<CourseProfile | null>(null);
  const [times, setTimes] = useState<TeeTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [calMonth, setCalMonth] = useState(startOfMonth(TODAY));
  const [selectedDate, setSelectedDate] = useState<Date>(TODAY);

  // Auth state
  const [authUser, setAuthUser] = useState<BookingUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingBookSlotId, setPendingBookSlotId] = useState<string | null>(null);

  // Booking modal
  const [bookingSlot, setBookingSlot] = useState<TeeTimeSlot | null>(null);
  const [bookedSlotIds, setBookedSlotIds] = useState<Set<string>>(new Set());

  /* ── Load auth ── */
  useEffect(() => {
    const loadAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, phone")
        .eq("id", user.id)
        .maybeSingle();

      setAuthUser({
        name: profile?.name ?? user.email?.split("@")[0] ?? "",
        email: user.email ?? "",
        phone: profile?.phone ?? "",
      });
    };

    loadAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("name, phone")
          .eq("id", session.user.id)
          .maybeSingle();

        const user: BookingUser = {
          name: prof?.name ?? session.user.email?.split("@")[0] ?? "",
          email: session.user.email ?? "",
          phone: prof?.phone ?? "",
        };
        setAuthUser(user);

        // If they logged in to complete a pending booking, open the modal
        if (pendingBookSlotId) {
          const slot = times.find((t) => t.id === pendingBookSlotId);
          if (slot) setBookingSlot(slot);
          setPendingBookSlotId(null);
        }
      }
      if (event === "SIGNED_OUT") {
        setAuthUser(null);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBookSlotId, times]);

  /* ── Load course data ── */
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [profileRes, timesRes] = await Promise.all([
          fetch(`/api/course/profile?id=${id}`),
          fetch(`/api/course/public-times?id=${id}`),
        ]);
        if (!profileRes.ok) { setNotFound(true); setLoading(false); return; }
        const { profile: p } = await profileRes.json();
        setProfile(p);

        if (timesRes.ok) {
          const { times: t } = await timesRes.json();
          const slots: TeeTimeSlot[] = t ?? [];
          setTimes(slots);

          const todayStr = format(TODAY, "yyyy-MM-dd");
          const hasToday = slots.some((s) => s.date === todayStr);
          if (!hasToday && slots.length > 0) {
            const first = parseISO(slots[0].date + "T12:00:00");
            setSelectedDate(first);
            setCalMonth(startOfMonth(first));
          }

          // Auto-open booking modal from ?book= query param
          const bookId = searchParams.get("book");
          if (bookId) {
            const target = slots.find((s) => s.id === bookId);
            if (target) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                setBookingSlot(target);
              } else {
                setPendingBookSlotId(bookId);
                setShowAuthModal(true);
              }
            }
          }
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ── Derived ── */
  const todayStr = format(TODAY, "yyyy-MM-dd");

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

  const selectedStr = format(selectedDate, "yyyy-MM-dd");
  const selectedTimes = timesByDate[selectedStr] ?? [];
  const selectedLastMinute = selectedTimes.filter((t) => t.is_last_minute);
  const selectedRegular = selectedTimes.filter((t) => !t.is_last_minute);
  const todayLastMinute = (timesByDate[todayStr] ?? []).filter((t) => t.is_last_minute);

  const calDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calMonth));
    const end = endOfWeek(endOfMonth(calMonth));
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  /* ── Booking handlers ── */
  const handleReserve = (slot: TeeTimeSlot) => {
    if (!authUser) {
      setPendingBookSlotId(slot.id);
      setShowAuthModal(true);
    } else {
      setBookingSlot(slot);
    }
  };

  const handleBookingSuccess = (bookingId: string, slotId: string) => {
    void bookingId;
    setBookedSlotIds((prev) => new Set(prev).add(slotId));
    // Optimistically update the slot's spots_booked in local state
    setTimes((prev) => prev.map((t) => {
      if (t.id !== slotId) return t;
      const newBooked = (t.spots_booked ?? 0) + (bookingSlot?.spots_booked !== undefined ? 1 : 1);
      return { ...t, spots_booked: newBooked };
    }));
  };

  /* ── Loading / not-found ── */
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
  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <Flag className="h-12 w-12 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">Course not found</h1>
        <p className="text-sm text-gray-500 mb-6">This course profile doesn&apos;t exist or isn&apos;t active.</p>
        <button onClick={() => router.push("/")}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition">
          Back to search
        </button>
      </div>
    );
  }

  const phoneClean = profile.phone?.replace(/\D/g, "") ?? null;
  const phoneDisplay = profile.phone?.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3") ?? null;

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Auth modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => { setShowAuthModal(false); setPendingBookSlotId(null); }}
        onSuccess={() => setShowAuthModal(false)}
      />

      {/* Booking modal */}
      {bookingSlot && authUser && (
        <BookingModal
          slot={{ ...bookingSlot, course_name: profile.course_name }}
          user={authUser}
          onClose={() => setBookingSlot(null)}
          onSuccess={(bid) => { handleBookingSuccess(bid, bookingSlot.id); }}
        />
      )}

      {/* Nav */}
      <header className="glass-nav sticky top-0 z-40">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center gap-2 ml-1">
              <span className="text-xl" aria-hidden>&#9971;</span>
              <span className="text-lg font-bold tracking-tight text-primary">RubeGolf</span>
            </div>
          </div>
          {/* Auth state */}
          {authUser ? (
            <span className="text-xs text-gray-500 hidden sm:block">
              Signed in as <strong>{authUser.name || authUser.email}</strong>
            </span>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
              <LogIn className="h-3.5 w-3.5" /> Sign in to reserve
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">

        {/* ── Hero card ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-6 sm:py-8">
            <div className="flex items-start gap-4">
              {profile.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logo_url} alt={profile.course_name}
                  className="h-16 w-16 rounded-xl object-contain bg-white border border-gray-100 shadow-sm flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center flex-shrink-0">
                  <Flag className="h-7 w-7 text-primary/60" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{profile.course_name}</h1>
                {profile.address && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="h-4 w-4 flex-shrink-0" />{profile.address}
                  </p>
                )}
                {(profile.holes || profile.par) && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    {profile.holes && <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{profile.holes} holes</span>}
                    {profile.par && <span>Par {profile.par}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
          {(profile.phone || profile.website_url) && (
            <div className="border-t border-gray-100 px-6 py-4 flex flex-wrap gap-4">
              {profile.phone && (
                <a href={`tel:${phoneClean}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition">
                  <Phone className="h-4 w-4 text-primary" />{phoneDisplay}
                </a>
              )}
              {profile.website_url && (
                <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition">
                  <Globe className="h-4 w-4 text-primary" />
                  {new URL(profile.website_url).hostname.replace(/^www\./, "")}
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
              )}
            </div>
          )}
          {profile.description && (
            <div className="border-t border-gray-100 px-6 py-4">
              <p className="text-sm text-gray-600 leading-relaxed">{profile.description}</p>
            </div>
          )}
        </motion.div>

        {/* ── ⚡ Last-Minute Featured ── */}
        <AnimatePresence>
          {todayLastMinute.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-amber-900">⚡ Last-Minute Openings Today</h2>
                  <p className="text-xs text-amber-600">Limited spots — book now</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {todayLastMinute.map((t) => {
                  const remaining = (t.spots_available ?? 0) - (t.spots_booked ?? 0);
                  const price = t.price_cents ? `$${(t.price_cents / 100).toFixed(0)}` : null;
                  const booked = bookedSlotIds.has(t.id);
                  return (
                    <div key={t.id} className="rounded-xl bg-white border border-amber-100 px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xl font-bold text-gray-900">{fmt12(t.tee_time)}</span>
                        {price && <span className="text-sm font-bold text-primary">{price}</span>}
                      </div>
                      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {remaining > 0 ? `${remaining} spot${remaining !== 1 ? "s" : ""} open` : "Full"}
                      </p>
                      {t.special_note && <p className="text-xs text-amber-700 italic mb-2">&ldquo;{t.special_note}&rdquo;</p>}
                      {booked ? (
                        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-100 py-2 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Reserved
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {phoneClean && (
                            <a href={`tel:${phoneClean}`}
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition">
                              <Phone className="h-3 w-3" /> Call
                            </a>
                          )}
                          {remaining > 0 && (
                            <button onClick={() => handleReserve(t)}
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-semibold text-white hover:bg-primary/90 transition">
                              Reserve Online
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Calendar + Times ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid gap-6 lg:grid-cols-[320px_1fr]">

          {/* ── Calendar ── */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 self-start">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCalMonth((m) => subMonths(m, 1))}
                disabled={isBefore(endOfMonth(calMonth), TODAY)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800">{format(calMonth, "MMMM yyyy")}</span>
              <button
                onClick={() => setCalMonth((m) => addMonths(m, 1))}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {calDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, calMonth);
                const isPast = isBefore(day, TODAY);
                const isSelected = isSameDay(day, selectedDate);
                const hasTimes = datesWithTimes.has(dayStr);
                const hasLastMin = datesWithLastMinute.has(dayStr);
                const isTodayDay = isToday(day);
                return (
                  <button
                    key={dayStr}
                    onClick={() => { if (!isPast || isTodayDay) setSelectedDate(day); }}
                    disabled={isPast && !isTodayDay}
                    className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 text-sm transition
                      ${!inMonth ? "opacity-20 pointer-events-none" : ""}
                      ${isPast && !isTodayDay ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                      ${isSelected ? "bg-primary text-white shadow-sm"
                        : isTodayDay ? "ring-2 ring-primary/40 text-primary font-semibold hover:bg-primary/10"
                        : hasTimes ? "hover:bg-primary/10 text-gray-800 font-medium"
                        : "hover:bg-gray-50 text-gray-500"}
                    `}
                  >
                    <span className="leading-none">{format(day, "d")}</span>
                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      !inMonth || (isPast && !isTodayDay) ? "invisible" :
                      isSelected ? "bg-white/70" :
                      hasLastMin ? "bg-amber-400" :
                      hasTimes ? "bg-emerald-400" : "invisible"
                    }`} />
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Available
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Last-minute
              </span>
            </div>
            {phoneClean && (
              <a href={`tel:${phoneClean}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 transition">
                <Phone className="h-4 w-4" /> {phoneDisplay ?? "Call to Book"}
              </a>
            )}
          </div>

          {/* ── Times panel ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-gray-800">
                {isToday(selectedDate) ? "Today — " : ""}
                {format(selectedDate, "EEEE, MMMM d")}
              </h2>
              {selectedTimes.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {selectedTimes.length} time{selectedTimes.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <AnimatePresence mode="wait">
              {selectedTimes.length === 0 ? (
                <motion.div key={`empty-${selectedStr}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-12 text-center">
                  <Clock className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                  <p className="text-sm font-semibold text-gray-700">No tee times for this date</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {datesWithTimes.size > 0 ? "Select a highlighted date on the calendar." : "Call the course to book."}
                  </p>
                  {phoneClean && (
                    <a href={`tel:${phoneClean}`}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition">
                      <Phone className="h-4 w-4" /> Call {profile.course_name}
                    </a>
                  )}
                </motion.div>
              ) : (
                <motion.div key={`times-${selectedStr}`}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-4">
                  {selectedLastMinute.length > 0 && !isToday(selectedDate) && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Last-Minute</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedLastMinute.map((t) => (
                          <TeeTimeCard key={t.id} slot={t} profile={profile}
                            onReserve={handleReserve} booked={bookedSlotIds.has(t.id)} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(isToday(selectedDate) ? selectedTimes : selectedRegular).map((t) => (
                      <TeeTimeCard key={t.id} slot={t} profile={profile}
                        onReserve={handleReserve} booked={bookedSlotIds.has(t.id)} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

/* ── Tee Time Card ───────────────────────────────────────────────────────── */
function TeeTimeCard({
  slot, profile, onReserve, booked,
}: {
  slot: TeeTimeSlot;
  profile: CourseProfile;
  onReserve: (slot: TeeTimeSlot) => void;
  booked: boolean;
}) {
  const price = slot.price_cents && slot.price_cents > 0
    ? `$${(slot.price_cents / 100).toFixed(0)}` : null;
  const remaining = (slot.spots_available ?? 0) - (slot.spots_booked ?? 0);
  const bookedPct = slot.spots_available > 0
    ? Math.min(100, Math.round(((slot.spots_booked ?? 0) / slot.spots_available) * 100)) : 0;
  const phoneClean = profile.phone?.replace(/\D/g, "") ?? null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-3 bg-gradient-to-r from-primary/[0.04] to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">{fmt12(slot.tee_time)}</span>
            {slot.is_last_minute && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Last Min</span>
            )}
          </div>
          {price
            ? <span className="text-lg font-bold text-primary">{price}</span>
            : <span className="text-xs text-gray-400 flex items-center gap-1"><DollarSign className="h-3 w-3" />Call for price</span>
          }
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="h-3 w-3" />
              {remaining > 0 ? `${remaining} of ${slot.spots_available} spots open` : "Fully booked"}
            </span>
            {remaining === 1 && (
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Almost full</span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${
              bookedPct >= 100 ? "bg-red-400" : bookedPct >= 75 ? "bg-amber-400" : "bg-emerald-400"
            }`} style={{ width: `${bookedPct}%` }} />
          </div>
        </div>
      </div>

      {slot.special_note && (
        <div className="px-4 py-2 border-t border-gray-50">
          <p className="text-xs text-gray-500 italic">&ldquo;{slot.special_note}&rdquo;</p>
        </div>
      )}

      <div className="mt-auto border-t border-gray-100 px-4 py-3">
        {booked ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Reserved
          </div>
        ) : remaining <= 0 ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-1">
            <Clock className="h-3.5 w-3.5" /> Fully booked
          </div>
        ) : (
          <div className="flex gap-2">
            {phoneClean && (
              <a href={`tel:${phoneClean}`}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            )}
            <button onClick={() => onReserve(slot)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition">
              Reserve Online
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
