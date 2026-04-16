"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format, parse } from "date-fns";
import { MapPin, Clock, DollarSign, Users, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultTeeTime } from "@/lib/types";

interface TeeTimeCardProps {
  teeTime: ResultTeeTime;
  index: number;
}

export default function TeeTimeCard({ teeTime, index }: TeeTimeCardProps) {
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  const handleBooking = async () => {
    setBooking(true);
    try {
      const response = await fetch("/api/book-tee-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tee_time_id: teeTime.id }),
      });

      if (response.ok) {
        setBooked(true);
      }
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setBooking(false);
    }
  };

  const startTime = format(
    parse(teeTime.start_time, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", new Date()),
    "h:mm a"
  );

  const price =
    teeTime.price_cents && teeTime.price_cents > 0
      ? `$${(teeTime.price_cents / 100).toFixed(2)}`
      : "Call";

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        delay: index * 0.05,
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className="h-full">
      <div
        className={`golf-card overflow-hidden transition-all duration-300 h-full flex flex-col ${
          booked ? "ring-2 ring-green-500" : ""
        }`}
      >
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4">
          <h3 className="text-lg font-bold text-primary">
            {teeTime.course?.name || "Golf Course"}
          </h3>
          {teeTime.course?.address && (
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              {teeTime.course.address}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 px-6 py-4">
          {/* Time */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-semibold">{startTime}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Players */}
            <div className="rounded-lg border border-gray-200 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                {teeTime.players_needed} players
              </div>
            </div>

            {/* Price */}
            <div className="rounded-lg border border-gray-200 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-sm font-semibold text-primary">
                <DollarSign className="h-4 w-4" />
                {price}
              </div>
            </div>
          </div>

          {/* Distance */}
          {teeTime.duration_minutes && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
              <Car className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-900">
                {teeTime.duration_minutes} min drive
              </span>
              {teeTime.distance_km && (
                <span className="text-blue-700">
                  ({teeTime.distance_km.toFixed(1)} km)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3">
          <Button
            onClick={handleBooking}
            disabled={booking || booked}
            className="w-full"
            variant={booked ? "outline" : "default"}
          >
            {booked ? "✓ Booked!" : booking ? "Booking..." : "Book Now"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
