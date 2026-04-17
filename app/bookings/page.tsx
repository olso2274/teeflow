"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, LogOut, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Booking {
  id: string;
  course_name: string;
  tee_time_display: string;
  price_cents: number | null;
  booked_at: string;
  booking_url: string;
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

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const loadBookings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      // Get user name
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      setUserName(profile?.name ?? user.email?.split("@")[0] ?? null);

      // Get bookings
      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("booked_at", { ascending: false });

      if (!error && bookingData) {
        setBookings(bookingData);
      }

      setLoading(false);
    };

    loadBookings();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return <LoadingShell />;

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.push("/tee-times")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
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
            {userName && (
              <>
                <span className="hidden md:flex items-center gap-1.5 text-sm text-gray-500">
                  <User className="h-3.5 w-3.5" />
                  {userName}
                </span>
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

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-2 text-gray-500">
            All your booked tee times across Minnesota courses.
          </p>
        </motion.div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-800">
              No bookings yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Start searching for tee times to book your first round.
            </p>
            <button
              onClick={() => router.push("/tee-times")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition"
            >
              Find Tee Times
            </button>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              show: { transition: { staggerChildren: 0.05 } },
              hidden: {},
            }}
            className="space-y-3"
          >
            {bookings.map((booking, i) => (
              <BookingRow key={booking.id} booking={booking} index={i} />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}

function BookingRow({ booking, index }: { booking: Booking; index: number }) {
  const bookedDate = new Date(booking.booked_at);
  const bookedDateStr = bookedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.a
      href={booking.booking_url}
      target="_blank"
      rel="noopener noreferrer"
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.2, delay: index * 0.03 },
        },
      }}
      className="card-hover block p-5 hover:shadow-lg hover:shadow-gray-200/50 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {booking.course_name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              📍 Booked {bookedDateStr}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {booking.tee_time_display}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          {booking.price_cents ? (
            <span className="font-bold text-primary text-lg">
              ${(booking.price_cents / 100).toFixed(0)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">Call for price</span>
          )}
        </div>
      </div>
    </motion.a>
  );
}

function LoadingShell() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="glass-nav">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="h-5 w-20 skeleton rounded" />
          <div className="ml-auto h-8 w-24 skeleton rounded-lg" />
        </div>
      </header>
      <main className="mx-auto max-w-4xl w-full px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="h-8 w-48 skeleton rounded mb-2" />
          <div className="h-4 w-96 skeleton rounded" />
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex justify-between">
                <div className="flex-1">
                  <div className="h-4 w-32 skeleton rounded mb-3" />
                  <div className="flex gap-4">
                    <div className="h-3 w-24 skeleton rounded" />
                    <div className="h-3 w-28 skeleton rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
