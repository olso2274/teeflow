"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { useRouter } from "next/navigation";
import { LogOut, User, MapPin, Zap, MousePointerClick, Clock, Users, ArrowRight } from "lucide-react";
import SearchForm from "./components/SearchForm";
import AuthModal from "./components/AuthModal";
import { createClient } from "@/utils/supabase/client";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

interface LastMinuteOpening {
  id: string;
  course_name: string;
  course_address: string | null;
  tee_time: string;
  spots_available: number;
  price_cents: number | null;
  special_note: string | null;
}

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const [showAuth, setShowAuth] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{
    date: Date;
    startHour: number;
    endHour: number;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [lastMinuteOpenings, setLastMinuteOpenings] = useState<LastMinuteOpening[]>([]);

  /* ── Load user on mount + listen for auth changes ── */
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await setUserFromAuth(user);
      }
      setSessionChecked(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setUserFromAuth = async (user: any) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      setCurrentUser({
        id: user.id,
        name: profile?.name ?? user.email?.split("@")[0] ?? "Golfer",
        email: user.email ?? "",
      });
    };

    loadUser();

    // Listen for auth state changes (e.g. magic link in another tab)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserFromAuth(session.user);
      }
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load last-minute openings on mount
  useEffect(() => {
    fetch("/api/last-minute-openings")
      .then((r) => r.json())
      .then((d) => setLastMinuteOpenings(d.openings ?? []))
      .catch(() => null);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    // Clear any pending search so a new user starts fresh
    try { sessionStorage.removeItem("rubegolf_pending_search"); } catch { /* no-op */ }
  };

  const buildSearchUrl = (date: Date, startHour: number, endHour: number) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return `/tee-times?date=${dateStr}&startHour=${startHour}&endHour=${endHour}`;
  };

  const handleSearch = (date: Date, startHour: number, endHour: number) => {
    if (currentUser) {
      router.push(buildSearchUrl(date, startHour, endHour));
    } else {
      // Persist search for magic-link flow (survives page reload)
      const searchUrl = buildSearchUrl(date, startHour, endHour);
      try {
        sessionStorage.setItem("rubegolf_pending_search", searchUrl);
      } catch {
        /* no-op */
      }
      setPendingSearch({ date, startHour, endHour });
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = async (_userId: string) => {
    // Clean up stored search
    try {
      sessionStorage.removeItem("rubegolf_pending_search");
    } catch {
      /* no-op */
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      setCurrentUser({
        id: user.id,
        name: profile?.name ?? user.email?.split("@")[0] ?? "Golfer",
        email: user.email ?? "",
      });
    }
    setShowAuth(false);
    if (pendingSearch) {
      router.push(
        buildSearchUrl(
          pendingSearch.date,
          pendingSearch.startHour,
          pendingSearch.endHour
        )
      );
    }
  };

  const firstName = currentUser?.name?.split(" ")[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 glass-nav">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" aria-hidden>
              &#9971;
            </span>
            <span className="text-xl font-bold tracking-tight text-primary">
              RubeGolf
            </span>
          </div>

          {sessionChecked && currentUser ? (
            <div className="flex items-center gap-4">
              <span className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600">
                <User className="h-3.5 w-3.5" />
                {currentUser.name}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : sessionChecked ? (
            <button
              onClick={() => setShowAuth(true)}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition"
            >
              Sign in
            </button>
          ) : null}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-primary-700 to-emerald-950 py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
          <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-white/5" />
          <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-emerald-500/10" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {firstName ? (
              <>
                {firstName}, your next round
                <br className="hidden sm:block" /> starts here.
              </>
            ) : (
              <>
                Your next round
                <br className="hidden sm:block" /> starts here.
              </>
            )}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-5 max-w-xl text-lg text-emerald-200/90"
          >
            Real-time tee times from courses across Minnesota. Find, compare,
            and book &mdash; all in one place.
          </motion.p>
        </div>
      </section>

      {/* ── Search Card (overlaps hero) ── */}
      <div className="relative z-10 mx-auto -mt-8 w-full max-w-2xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-2xl bg-white p-5 shadow-search sm:p-7"
        >
          <SearchForm
            onSearch={handleSearch}
            loading={false}
            defaultDate={addDays(new Date(), 1)}
          />
        </motion.div>
      </div>

      {/* ── Last Minute Openings ── */}
      {lastMinuteOpenings.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl bg-amber-50 border border-amber-100 p-5 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-amber-900">Last-Minute Openings Today</h2>
                  <p className="text-xs text-amber-600">Posted directly by courses &mdash; grab one now</p>
                </div>
              </div>
              <button
                onClick={() =>
                  router.push(`/tee-times?date=${format(new Date(), "yyyy-MM-dd")}&startHour=6&endHour=18`)
                }
                className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 transition"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lastMinuteOpenings.slice(0, 6).map((o) => {
                const [hStr, mStr] = o.tee_time.split(":");
                const h = parseInt(hStr);
                const ampm = h >= 12 ? "PM" : "AM";
                const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                const timeLabel = `${h12}:${mStr} ${ampm}`;
                const price = o.price_cents ? `$${(o.price_cents / 100).toFixed(0)}` : null;

                return (
                  <div
                    key={o.id}
                    className="rounded-xl bg-white border border-amber-100 px-4 py-3 shadow-sm"
                  >
                    <p className="font-semibold text-gray-900 text-sm truncate">{o.course_name}</p>
                    {o.course_address && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">📍 {o.course_address}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1 font-semibold text-gray-900">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          {timeLabel}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="h-3 w-3" />
                          {o.spots_available}
                        </span>
                      </div>
                      {price && <span className="text-sm font-bold text-primary">{price}</span>}
                    </div>
                    {o.special_note && (
                      <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 truncate">
                        {o.special_note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-16 sm:px-6">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-gray-400"
        >
          How it works
        </motion.p>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: <MapPin className="h-6 w-6 text-primary" />,
              title: "Pick your day",
              desc: "Choose a date and time window that works for your schedule.",
            },
            {
              icon: <Zap className="h-6 w-6 text-primary" />,
              title: "We search live data",
              desc: "Real-time availability pulled directly from course booking systems.",
            },
            {
              icon: <MousePointerClick className="h-6 w-6 text-primary" />,
              title: "Book in one click",
              desc: "Compare prices, check drive times, and book directly with the course.",
            },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="card-hover flex flex-col items-center px-6 py-8 text-center"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                {step.icon}
              </div>
              <h3 className="font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-gray-100 bg-gray-50/50 py-8 text-center">
        <p className="text-xs text-gray-400">
          Live data from Minnesota golf courses &middot; Built by{" "}
          <span className="font-medium text-gray-500">RubeGolf</span>
        </p>
      </footer>

      {/* ── Auth Modal ── */}
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
