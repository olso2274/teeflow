"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  X, Clock, Users, DollarSign, CheckCircle2, Phone, Mail,
  User, AlertCircle, Calendar,
} from "lucide-react";

export interface BookingSlot {
  id: string;
  date: string;
  tee_time: string;
  spots_available: number;
  spots_booked: number;
  price_cents: number | null;
  special_note: string | null;
  course_name: string;
}

export interface BookingUser {
  name: string;
  email: string;
  phone: string;
}

interface Props {
  slot: BookingSlot;
  user: BookingUser;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}

function fmt12(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}

export default function BookingModal({ slot, user, onClose, onSuccess }: Props) {
  const remaining = (slot.spots_available ?? 0) - (slot.spots_booked ?? 0);
  const maxGolfers = Math.min(4, remaining);

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [numGolfers, setNumGolfers] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!phone.trim()) { setError("Please enter your mobile number."); return; }
    if (!agreed) { setError("Please check the agreement box to continue."); return; }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tee_time_id: slot.id,
          golfer_name: name.trim(),
          golfer_email: user.email,
          golfer_phone: phone.trim(),
          num_golfers: numGolfers,
          agreed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Booking failed. Please try again."); return; }
      setConfirmed(true);
      onSuccess(data.booking.id);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const price = slot.price_cents ? `$${(slot.price_cents / 100).toFixed(0)}` : null;
  const dateDisplay = format(parseISO(slot.date + "T12:00:00"), "EEEE, MMMM d");

  // Golfer names: "You + Guest 1, Guest 2..."
  const golferLabels = [name || "You", ...Array.from({ length: numGolfers - 1 }, (_, i) => `Guest ${i + 1}`)];

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-4 flex items-start justify-between flex-shrink-0">
            <div>
              <h2 className="text-base font-bold text-gray-900">Reserve Tee Time</h2>
              <p className="text-sm text-gray-600 mt-0.5">{slot.course_name}</p>
            </div>
            <button onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tee time summary */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-sm flex-shrink-0">
            <span className="flex items-center gap-1.5 font-bold text-gray-900">
              <Clock className="h-4 w-4 text-primary" />{fmt12(slot.tee_time)}
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <Calendar className="h-3.5 w-3.5" />{dateDisplay}
            </span>
            {price && (
              <span className="flex items-center gap-1 font-semibold text-primary ml-auto">
                <DollarSign className="h-3.5 w-3.5" />{price}
              </span>
            )}
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1">
            {confirmed ? (
              /* ── Confirmation screen ── */
              <div className="px-5 py-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">You&apos;re booked!</h3>
                <p className="text-sm text-gray-500 mb-5">
                  Your reservation for {fmt12(slot.tee_time)} on {dateDisplay} is confirmed.
                </p>
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-left space-y-2 mb-6 text-sm">
                  {golferLabels.map((label, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-700">
                      <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      {label}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mb-5">
                  View this booking anytime under <strong>My Bookings</strong> in your account.
                </p>
                <button onClick={onClose}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition">
                  Done
                </button>
              </div>
            ) : (
              /* ── Booking form ── */
              <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <User className="inline h-3 w-3 mr-1" />Your name
                  </label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith" required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Mail className="inline h-3 w-3 mr-1" />Email
                  </label>
                  <input
                    type="email" value={user.email} readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Phone className="inline h-3 w-3 mr-1" />Mobile number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="(612) 555-0123" required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>

                {/* Number of golfers */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    <Users className="inline h-3 w-3 mr-1" />Number of golfers
                    <span className="ml-1 text-gray-400 font-normal">({remaining} spot{remaining !== 1 ? "s" : ""} available)</span>
                  </label>
                  <div className="flex gap-2">
                    {Array.from({ length: maxGolfers }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n} type="button"
                        onClick={() => setNumGolfers(n)}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition border ${
                          numGolfers === n
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-gray-600 border-gray-200 hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {/* Golfer preview */}
                  {numGolfers > 1 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {golferLabels.map((label, i) => (
                        <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Agreement */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                  />
                  <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-800 transition">
                    I agree to show up at the reserved time or cancel at least{" "}
                    <strong>24 hours in advance</strong>. I understand this is a reservation held
                    directly with the course.
                  </span>
                </label>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit" disabled={submitting}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Reserving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm reservation · {numGolfers} golfer{numGolfers !== 1 ? "s" : ""}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
