"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, Calendar, LogOut, User, Clock, Users,
  DollarSign, Phone, MapPin, CheckCircle2, X, ExternalLink,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface TeeTimeInfo {
  id: string;
  date: string;
  tee_time: string;
  course_name: string;
  course_address: string | null;
  price_cents: number | null;
  special_note: string | null;
  is_last_minute: boolean;
  course_account_id: string;
}

interface MyBooking {
  id: string;
  num_golfers: number;
  golfer_name: string;
  golfer_phone: string;
  golfer_email: string;
  status: string;
  created_at: string;
  course_tee_times: TeeTimeInfo | null;
}

function fmt12(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <BookingsContent />
    </Suspense>
  );
}

function BookingsContent() {
  const router = useRouter();
  const supabase = createClient();

  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/"); return; }

    const { data: profile } = await supabase
      .from("profiles").select("name").eq("id", user.id).maybeSingle();
    setUserName(profile?.name ?? user.email?.split("@")[0] ?? null);

    const res = await fetch("/api/bookings");
    if (res.ok) {
      const data = await res.json();
      setBookings(data.bookings ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { loadBookings(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this reservation? This action cannot be undone.")) return;
    setCancellingId(id);
    try {
      const res = await fetch("/api/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
      }
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <LoadingShell />;

  const golferList = (b: MyBooking) => {
    const names = [b.golfer_name, ...Array.from({ length: b.num_golfers - 1 }, (_, i) => `Guest ${i + 1}`)];
    return names;
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-40 glass-nav">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>&#9971;</span>
            <span className="text-lg font-bold tracking-tight text-primary">RubeGolf</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {userName && (
              <span className="hidden md:flex items-center gap-1.5 text-sm text-gray-500">
                <User className="h-3.5 w-3.5" />{userName}
              </span>
            )}
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
              className="text-gray-400 hover:text-gray-600 transition" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl w-full px-4 py-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upcoming tee times you&apos;ve reserved through RubeGolf.
          </p>
        </motion.div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-800">No upcoming reservations</p>
            <p className="mt-1 text-sm text-gray-500">Find a course and reserve a tee time to get started.</p>
            <button onClick={() => router.push("/")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition">
              Find Tee Times
            </button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-4">
              {bookings.map((b, i) => {
                const slot = b.course_tee_times;
                if (!slot) return null;
                const dateDisplay = format(parseISO(slot.date + "T12:00:00"), "EEEE, MMMM d, yyyy");
                const price = slot.price_cents ? `$${(slot.price_cents / 100).toFixed(0)}` : null;
                const golfers = golferList(b);

                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden"
                  >
                    {/* Header band */}
                    <div className="bg-gradient-to-r from-primary/[0.06] to-transparent px-5 py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <a href={`/course/${slot.course_account_id}`}
                          className="font-bold text-gray-900 hover:text-primary transition text-base truncate block">
                          {slot.course_name}
                        </a>
                        {slot.course_address && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />{slot.course_address}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Confirmed
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-bold text-gray-900">{fmt12(slot.tee_time)}</span>
                          {price && <span className="text-primary font-bold">&nbsp;· {price}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          {dateDisplay}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          {b.num_golfers} golfer{b.num_golfers !== 1 ? "s" : ""}
                        </div>
                        {!price && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />Call course for price
                          </div>
                        )}
                        {slot.special_note && (
                          <p className="text-xs text-gray-500 italic">&ldquo;{slot.special_note}&rdquo;</p>
                        )}
                      </div>

                      {/* Golfer roster */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your party</p>
                        <div className="space-y-1.5">
                          {golfers.map((name, gi) => (
                            <div key={gi} className="flex items-center gap-2 text-sm">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-3 w-3 text-primary" />
                              </div>
                              <span className={gi === 0 ? "font-medium text-gray-900" : "text-gray-500"}>
                                {name}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Phone className="h-3 w-3" />{b.golfer_phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-3">
                      <a href={`/course/${slot.course_account_id}`}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition">
                        <ExternalLink className="h-3.5 w-3.5" /> View course page
                      </a>
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancellingId === b.id}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition">
                        <X className="h-3.5 w-3.5" />
                        {cancellingId === b.id ? "Cancelling…" : "Cancel reservation"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="glass-nav">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="h-5 w-20 skeleton rounded" />
          <div className="ml-auto h-8 w-24 skeleton rounded-lg" />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8"><div className="h-8 w-48 skeleton rounded mb-2" /><div className="h-4 w-64 skeleton rounded" /></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <div className="h-5 w-48 skeleton rounded" />
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-4 w-40 skeleton rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
