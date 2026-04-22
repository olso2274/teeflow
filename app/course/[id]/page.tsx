"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, Globe, Phone, MapPin, Clock, Users, DollarSign,
  Flag, ExternalLink, Calendar,
} from "lucide-react";

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
  price_cents: number | null;
  special_note: string | null;
  is_last_minute: boolean;
}

export default function CourseProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<CourseProfile | null>(null);
  const [times, setTimes] = useState<TeeTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
          setTimes(t ?? []);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const formatTime = (t: string) => {
    const [hStr, mStr] = t.split(":");
    const h = parseInt(hStr);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${mStr} ${ampm}`;
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

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <Flag className="h-12 w-12 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">Course not found</h1>
        <p className="text-sm text-gray-500 mb-6">This course profile doesn&apos;t exist or isn&apos;t active.</p>
        <button onClick={() => router.push("/")} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition">
          Back to search
        </button>
      </div>
    );
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const upcomingTimes = times.filter((t) => t.date >= todayStr);
  const lastMinuteTimes = upcomingTimes.filter((t) => t.is_last_minute && t.date === todayStr);
  const futureTimes = upcomingTimes.filter((t) => !t.is_last_minute || t.date !== todayStr);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="glass-nav sticky top-0 z-40">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xl" aria-hidden>&#9971;</span>
            <span className="text-lg font-bold tracking-tight text-primary">RubeGolf</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* ── Hero card ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-6">

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
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                    {profile.holes && <span className="flex items-center gap-1"><Flag className="h-3.5 w-3.5" />{profile.holes} holes</span>}
                    {profile.par && <span>Par {profile.par}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact row */}
          <div className="border-t border-gray-100 px-6 py-4 flex flex-wrap gap-4">
            {profile.phone && (
              <a href={`tel:${profile.phone.replace(/\D/g, "")}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition">
                <Phone className="h-4 w-4 text-primary" />
                {profile.phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")}
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

          {/* Description */}
          {profile.description && (
            <div className="border-t border-gray-100 px-6 py-4">
              <p className="text-sm text-gray-600 leading-relaxed">{profile.description}</p>
            </div>
          )}
        </motion.div>

        {/* ── Tee times ── */}
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Available tee times
          {upcomingTimes.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({upcomingTimes.length} upcoming)</span>
          )}
        </h2>

        {upcomingTimes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-12 text-center">
            <Calendar className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-700">No tee times posted yet</p>
            <p className="mt-1 text-xs text-gray-400">Check back soon, or call the course to book.</p>
            {profile.phone && (
              <a href={`tel:${profile.phone.replace(/\D/g, "")}`}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition">
                <Phone className="h-4 w-4" /> Call {profile.course_name}
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Last-minute */}
            {lastMinuteTimes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <h3 className="text-sm font-semibold text-gray-700">Last-minute openings — Today</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {lastMinuteTimes.map((t) => <TeeTimeCard key={t.id} slot={t} profile={profile} formatTime={formatTime} />)}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {futureTimes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <h3 className="text-sm font-semibold text-gray-700">Upcoming tee times</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {futureTimes.map((t) => <TeeTimeCard key={t.id} slot={t} profile={profile} formatTime={formatTime} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function TeeTimeCard({
  slot,
  profile,
  formatTime,
}: {
  slot: TeeTimeSlot;
  profile: CourseProfile;
  formatTime: (t: string) => string;
}) {
  const price = slot.price_cents && slot.price_cents > 0
    ? `$${(slot.price_cents / 100).toFixed(0)}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 flex items-start justify-between bg-gradient-to-r from-primary/[0.04] to-transparent">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">{formatTime(slot.tee_time)}</span>
            {slot.is_last_minute && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Last Minute</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {format(parseISO(slot.date + "T12:00:00"), "EEEE, MMM d")}
          </p>
        </div>
        {price && <span className="text-lg font-bold text-primary">{price}</span>}
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{slot.spots_available} spot{slot.spots_available !== 1 ? "s" : ""}</span>
          {!price && <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />Call for price</span>}
        </div>
        {slot.special_note && <p className="text-xs text-gray-500 italic">&ldquo;{slot.special_note}&rdquo;</p>}
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        {profile.phone ? (
          <a href={`tel:${profile.phone.replace(/\D/g, "")}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition">
            <Phone className="h-3.5 w-3.5" /> Call to book
          </a>
        ) : profile.website_url ? (
          <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition">
            <ExternalLink className="h-3.5 w-3.5" /> Book on website
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Clock className="h-3.5 w-3.5" /> Contact course to book
          </div>
        )}
      </div>
    </motion.div>
  );
}
