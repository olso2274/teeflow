"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Users, Car, ExternalLink, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface TeeTimeCardProps {
  teeTime: {
    id: string;
    course_id: string;
    course?: {
      id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      booking_url: string;
    };
    start_time: string;
    players_needed: number;
    price_cents: number | null;
    status: string;
    booking_url: string;
    cps_direct?: boolean;
    duration_minutes?: number;
  };
  index: number;
  userId?: string;
  isFavorited?: boolean;
  onFavoriteChange?: (courseId: string, isFavorited: boolean) => void;
}

export default function TeeTimeCard({
  teeTime,
  index,
  userId,
  isFavorited = false,
  onFavoriteChange,
}: TeeTimeCardProps) {
  const [bookingLoading, setBookingLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFav, setIsFav] = useState(isFavorited);
  const supabase = createClient();

  // Time parsing (no timezone conversion)
  const timeStr = (() => {
    try {
      const timePart = teeTime.start_time.split("T")[1];
      if (timePart) {
        const [hStr, mStr] = timePart.split(":");
        const h = parseInt(hStr);
        const m = mStr ?? "00";
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${h12}:${m} ${ampm}`;
      }
      return teeTime.start_time;
    } catch {
      return teeTime.start_time;
    }
  })();

  const price =
    teeTime.price_cents && teeTime.price_cents > 0
      ? `$${(teeTime.price_cents / 100).toFixed(0)}`
      : null;

  const handleBook = async () => {
    if (!teeTime.booking_url) return;

    setBookingLoading(true);
    try {
      // Log booking click if user is logged in
      if (userId) {
        const bookRes = await fetch("/api/book-tee-time", {
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

        if (!bookRes.ok) {
          const err = await bookRes.json();
          console.error("Booking log failed:", err);
        }
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
        // Remove favorite
        const { error } = await supabase
          .from("favorite_courses")
          .delete()
          .eq("user_id", userId)
          .eq("course_id", teeTime.course_id);

        if (error) throw error;
        setIsFav(false);
        onFavoriteChange?.(teeTime.course_id, false);
      } else {
        // Add favorite
        const { error } = await supabase.from("favorite_courses").insert({
          user_id: userId,
          course_id: teeTime.course_id,
        });

        if (error && error.code !== "23505") throw error; // 23505 = unique constraint
        setIsFav(true);
        onFavoriteChange?.(teeTime.course_id, true);
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
    } finally {
      setFavoriteLoading(false);
    }
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
      className="card-hover flex flex-col overflow-hidden group"
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

        {userId && (
          <button
            onClick={handleFavorite}
            disabled={favoriteLoading}
            className="ml-2 flex-shrink-0 rounded-lg p-1.5 text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition disabled:opacity-50"
            title={isFav ? "Remove favorite" : "Add to favorites"}
          >
            <Star
              className={`h-4 w-4 transition ${
                isFav ? "fill-amber-500 text-amber-500" : ""
              }`}
            />
          </button>
        )}

        {teeTime.cps_direct && (
          <span className="ml-2 flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            Direct
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
            <span className="text-sm text-gray-400">Call</span>
          )}
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {teeTime.players_needed} spot{teeTime.players_needed !== 1 ? "s" : ""}
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
      </div>

      {/* Book button */}
      <div className="mt-auto border-t border-gray-100 px-5 py-3">
        <button
          onClick={handleBook}
          disabled={bookingLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
        >
          {teeTime.cps_direct ? "View on Course Site" : "Book Now"}
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
