"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isToday, isTomorrow, parseISO } from "date-fns";
import {
  LogOut, Plus, Trash2, Clock, Users, DollarSign, Zap, Calendar,
  CheckCircle2, ArrowLeft, Flag, Settings, Globe, Phone, MapPin,
  Info, Mail, UserPlus, X, ExternalLink, Save, MoreVertical,
  Copy, Edit2, TrendingUp, Share2, ChevronRight,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

/* ── Types ──────────────────────────────────────────────────────────────── */
interface CourseAccount {
  id: string;
  course_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  website_url: string | null;
  description: string | null;
  address: string | null;
  holes: number | null;
  par: number | null;
  logo_url: string | null;
  staff_emails: string[];
  status: string;
}

interface CourseTime {
  id: string;
  date: string;
  tee_time: string;
  spots_available: number;
  spots_booked: number;
  status: "open" | "filling" | "full" | "cancelled";
  price_cents: number | null;
  special_note: string | null;
  is_last_minute: boolean;
  is_active: boolean;
  course_name: string;
}

interface EditState {
  tee_time: string;
  date: string;
  spots_available: number;
  spots_booked: number;
  price_cents: string;        // dollars string for input
  special_note: string;
  is_last_minute: boolean;
}

type PostMode = "lastminute" | "future" | null;
type Tab = "times" | "profile";

const QUICK_TIMES = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00"];
const LS_TEMPLATE_KEY = "teeflow_template";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmt12(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}

function friendlyDate(dateStr: string) {
  const d = parseISO(dateStr + "T12:00:00");
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

function statusBadge(status: CourseTime["status"], remaining: number) {
  if (status === "full" || remaining <= 0)
    return { label: "Full", cls: "bg-red-100 text-red-700" };
  if (status === "filling" || remaining === 1)
    return { label: "1 spot left", cls: "bg-amber-100 text-amber-700" };
  return { label: "Open", cls: "bg-emerald-100 text-emerald-700" };
}

function loadTemplate() {
  try {
    const raw = localStorage.getItem(LS_TEMPLATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveTemplate(price: string, spots: string, note: string) {
  try {
    localStorage.setItem(LS_TEMPLATE_KEY, JSON.stringify({ price, spots, note }));
  } catch { /* ignore */ }
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function CourseDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [account, setAccount] = useState<CourseAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [times, setTimes] = useState<CourseTime[]>([]);
  const [timesLoading, setTimesLoading] = useState(false);
  const [postMode, setPostMode] = useState<PostMode>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("times");
  const [shareToast, setShareToast] = useState(false);

  // Tee-time post form
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [teeTime, setTeeTime] = useState("08:00");
  const [spots, setSpots] = useState("4");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline card editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // 3-dot menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Profile form
  const [pCourseName, setPCourseName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pWebsite, setPWebsite] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pHoles, setPHoles] = useState("");
  const [pPar, setPPar] = useState("");
  const [pLogoUrl, setPLogoUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Staff-emails
  const [staffEmails, setStaffEmails] = useState<string[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [staffEmailLoading, setStaffEmailLoading] = useState(false);
  const [staffEmailError, setStaffEmailError] = useState<string | null>(null);

  /* ── Data loading ─────────────────────────────────────────────────────── */
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

  const loadStaffEmails = useCallback(async () => {
    const res = await fetch("/api/course/staff-emails");
    if (res.ok) {
      const data = await res.json();
      setStaffEmails(data.staff_emails ?? []);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) router.replace("/course-signup"); return; }

      const res = await fetch("/api/course/me");
      const data = await res.json();
      if (!data.account) { if (!cancelled) router.replace("/course-signup"); return; }

      if (!cancelled) {
        const acct: CourseAccount = data.account;
        setAccount(acct);
        setPCourseName(acct.course_name ?? "");
        setPPhone(acct.phone ?? "");
        setPWebsite(acct.website_url ?? "");
        setPDescription(acct.description ?? "");
        setPAddress(acct.address ?? "");
        setPHoles(acct.holes ? String(acct.holes) : "");
        setPPar(acct.par ? String(acct.par) : "");
        setPLogoUrl(acct.logo_url ?? "");
        setLoading(false);
        loadTimes();
        loadStaffEmails();

        // Restore template
        const tmpl = loadTemplate();
        if (tmpl) {
          if (tmpl.price) setPrice(tmpl.price);
          if (tmpl.spots) setSpots(tmpl.spots);
          if (tmpl.note) setNote(tmpl.note);
        }
      }
    };
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Post form actions ────────────────────────────────────────────────── */
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
      if (!res.ok) { setFormError(data.error ?? "Failed to submit."); return; }

      saveTemplate(price, spots, note);
      setSubmitSuccess(true);
      setPostMode(null);
      loadTimes();
      setTimeout(() => setSubmitSuccess(false), 6000);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── 3-dot menu actions ───────────────────────────────────────────────── */
  const handleDuplicate = (t: CourseTime) => {
    setMenuOpenId(null);
    setTeeTime(t.tee_time);
    setSpots(String(t.spots_available));
    setPrice(t.price_cents != null ? String(t.price_cents / 100) : "");
    setNote(t.special_note ?? "");
    setPostMode(t.is_last_minute ? "lastminute" : "future");
    // scroll to top of page form area
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartEdit = (t: CourseTime) => {
    setMenuOpenId(null);
    setEditingId(t.id);
    setEditError(null);
    setEditState({
      tee_time: t.tee_time,
      date: t.date,
      spots_available: t.spots_available,
      spots_booked: t.spots_booked ?? 0,
      price_cents: t.price_cents != null ? String(t.price_cents / 100) : "",
      special_note: t.special_note ?? "",
      is_last_minute: t.is_last_minute,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editState) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const priceCents = editState.price_cents
        ? Math.round(parseFloat(editState.price_cents) * 100)
        : null;
      const res = await fetch("/api/course/my-times", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          tee_time: editState.tee_time,
          date: editState.date,
          spots_available: editState.spots_available,
          spots_booked: editState.spots_booked,
          price_cents: priceCents,
          special_note: editState.special_note || null,
          is_last_minute: editState.is_last_minute,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? "Failed to save."); return; }

      setTimes((prev) => prev.map((t) => (t.id === id ? { ...t, ...data.time } : t)));
      setEditingId(null);
      setEditState(null);
    } catch {
      setEditError("Network error.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditState(null);
    setEditError(null);
  };

  const handleCancel = async (id: string) => {
    setMenuOpenId(null);
    if (!window.confirm("Remove this tee time? Golfers will no longer see it.")) return;
    const res = await fetch("/api/course/my-times", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setTimes((prev) => prev.filter((t) => t.id !== id));
  };

  const handleShare = async () => {
    if (!account) return;
    const url = `${window.location.origin}/course/${account.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3000);
    } catch {
      window.open(url, "_blank");
    }
  };

  /* ── Profile / staff ──────────────────────────────────────────────────── */
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    try {
      const res = await fetch("/api/course/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_name: pCourseName,
          phone: pPhone,
          website_url: pWebsite,
          description: pDescription,
          address: pAddress,
          holes: pHoles || null,
          par: pPar || null,
          logo_url: pLogoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setProfileError(data.error ?? "Save failed."); return; }
      setAccount(data.profile);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch {
      setProfileError("Network error.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddStaffEmail = async () => {
    if (!newStaffEmail.trim()) return;
    setStaffEmailLoading(true);
    setStaffEmailError(null);
    try {
      const res = await fetch("/api/course/staff-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newStaffEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setStaffEmailError(data.error ?? "Failed."); return; }
      setNewStaffEmail("");
      loadStaffEmails();
    } catch {
      setStaffEmailError("Network error.");
    } finally {
      setStaffEmailLoading(false);
    }
  };

  const handleRemoveStaffEmail = async (email: string) => {
    setStaffEmailError(null);
    const res = await fetch("/api/course/staff-emails", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) { setStaffEmailError(data.error ?? "Failed."); return; }
    loadStaffEmails();
  };

  /* ── Loading state ────────────────────────────────────────────────────── */
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

  /* ── Derived data ─────────────────────────────────────────────────────── */
  const upcomingTimes = times.filter((t) => t.is_active);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTimes = upcomingTimes.filter((t) => t.date === todayStr);
  const lastMinuteTimes = upcomingTimes.filter((t) => t.is_last_minute);

  const totalAvail = upcomingTimes.reduce((s, t) => s + (t.spots_available ?? 0), 0);
  const totalBooked = upcomingTimes.reduce((s, t) => s + (t.spots_booked ?? 0), 0);
  const fillRate = totalAvail > 0 ? Math.round((totalBooked / totalAvail) * 100) : 0;

  // Group by date
  const grouped = upcomingTimes.reduce<Record<string, CourseTime[]>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>&#9971;</span>
              <span className="text-lg font-bold tracking-tight text-primary">RubeGolf</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500 font-medium">{account?.course_name}</span>
            {account && (
              <button
                onClick={handleShare}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                title="Share your course page"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            )}
            <a
              href={`/course/${account?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View site
            </a>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Share toast */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Course page link copied!
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Flag className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">{account?.course_name}</h1>
          </div>
          <p className="text-sm text-gray-500">
            Welcome back, {account?.contact_name?.split(" ")[0]}.{" "}
            <a href={`/course/${account?.id}`} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5">
              View public page <ChevronRight className="h-3 w-3" />
            </a>
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Upcoming", value: upcomingTimes.length, color: "text-primary" },
            { label: "Today", value: todayTimes.length, color: "text-amber-600" },
            { label: "Last Minute", value: lastMinuteTimes.length, color: "text-emerald-600" },
            { label: "Fill Rate", value: `${fillRate}%`, color: totalBooked > 0 ? "text-blue-600" : "text-gray-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          {([["times", "Tee Times", Calendar], ["profile", "Profile & Settings", Settings]] as const).map(
            ([key, label, Icon]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === key ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            )
          )}
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {submitSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-700">
                Tee time posted! It&apos;s now visible to golfers searching your area.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TEE TIMES TAB ── */}
        {activeTab === "times" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            {/* ── Left: Post form ── */}
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800">Post a tee time</h2>

              {!postMode && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setPostMode("lastminute"); setFormError(null); }}
                    className="card-hover flex flex-col items-start p-5 text-left border-2 border-transparent hover:border-amber-300 transition"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Last-Minute Opening</p>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">Today only. Featured for day-of golfers.</p>
                  </button>

                  <button
                    onClick={() => { setPostMode("future"); setFormError(null); }}
                    className="card-hover flex flex-col items-start p-5 text-left border-2 border-transparent hover:border-primary/30 transition"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Schedule Tee Time</p>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">Any future date. Shows in search results.</p>
                  </button>
                </div>
              )}

              <AnimatePresence>
                {postMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {postMode === "lastminute"
                          ? <Zap className="h-4 w-4 text-amber-500" />
                          : <Calendar className="h-4 w-4 text-primary" />}
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {postMode === "lastminute" ? "Last-Minute Opening (Today)" : "Schedule Tee Time"}
                        </h3>
                      </div>
                      <button onClick={() => { setPostMode(null); setFormError(null); }}
                        className="text-xs text-gray-400 hover:text-gray-600 transition">Cancel</button>
                    </div>

                    <form onSubmit={handleSubmitTime} className="space-y-3.5">
                      {postMode === "future" && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                          <input type="date" value={date} min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" required />
                        </div>
                      )}

                      {/* Time with quick picks */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          <Clock className="inline h-3 w-3 mr-1" />Tee time
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {QUICK_TIMES.map((qt) => (
                            <button key={qt} type="button"
                              onClick={() => setTeeTime(qt)}
                              className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                                teeTime === qt
                                  ? "bg-primary text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary"
                              }`}>
                              {fmt12(qt)}
                            </button>
                          ))}
                        </div>
                        <input type="time" value={teeTime} onChange={(e) => setTeeTime(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" required />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            <Users className="inline h-3 w-3 mr-1" />Spots available
                          </label>
                          <select value={spots} onChange={(e) => setSpots(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition">
                            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} spot{n !== 1 ? "s" : ""}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            <DollarSign className="inline h-3 w-3 mr-1" />Price <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                            placeholder="45" min="0" step="0.01"
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-gray-600">
                            Note <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <span className={`text-xs ${note.length >= 100 ? "text-amber-500" : "text-gray-400"}`}>{note.length}/120</span>
                        </div>
                        <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                          placeholder="Cart included, walking welcome…" maxLength={120}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                      </div>

                      {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>}

                      <button type="submit" disabled={submitting}
                        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                        <Plus className="h-4 w-4" />{submitting ? "Posting…" : "Post tee time"}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tips when no form open */}
              {!postMode && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Pro tips</p>
                      <ul className="text-xs text-gray-500 space-y-1 leading-relaxed list-disc list-inside">
                        <li>Post last-minute openings to fill gaps day-of</li>
                        <li>Add a note like "Cart included" to boost interest</li>
                        <li>Update spots booked as calls come in</li>
                        <li>Duplicate a time to re-post recurring slots fast</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Posted times grouped by date ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">
                  Upcoming tee times
                  {upcomingTimes.length > 0 && (
                    <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">{upcomingTimes.length}</span>
                  )}
                </h2>
                {totalBooked > 0 && (
                  <span className="text-xs text-gray-400">
                    {totalBooked}/{totalAvail} spots booked
                  </span>
                )}
              </div>

              {timesLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
              ) : upcomingTimes.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-10 text-center">
                  <Calendar className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No upcoming tee times posted.</p>
                  <p className="text-xs text-gray-400 mt-1">Use the form on the left to get started.</p>
                </div>
              ) : (
                <div className="space-y-6" ref={menuRef}>
                  {sortedDates.map((dateStr) => (
                    <div key={dateStr}>
                      {/* Date header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {friendlyDate(dateStr)}
                        </span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>

                      <div className="space-y-2">
                        {grouped[dateStr].map((t) => {
                          const remaining = (t.spots_available ?? 0) - (t.spots_booked ?? 0);
                          const bookedPct = t.spots_available > 0
                            ? Math.min(100, Math.round(((t.spots_booked ?? 0) / t.spots_available) * 100))
                            : 0;
                          const badge = statusBadge(t.status, remaining);
                          const isEditing = editingId === t.id;

                          return (
                            <motion.div key={t.id}
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                              className="rounded-xl bg-white border border-gray-100 shadow-sm">

                              {isEditing && editState ? (
                                /* ── Inline edit mode ── */
                                <div className="px-4 py-3 space-y-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                      <Edit2 className="h-3.5 w-3.5 text-primary" /> Editing tee time
                                    </span>
                                    <button onClick={handleCancelEdit} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Date</label>
                                      <input type="date" value={editState.date}
                                        onChange={(e) => setEditState({ ...editState, date: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Time</label>
                                      <input type="time" value={editState.tee_time}
                                        onChange={(e) => setEditState({ ...editState, tee_time: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                                    </div>
                                  </div>

                                  {/* Spots tracker */}
                                  <div>
                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                      Spots — booked / available
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <button type="button"
                                          onClick={() => setEditState({ ...editState, spots_booked: Math.max(0, editState.spots_booked - 1) })}
                                          className="h-7 w-7 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 text-sm font-bold">−</button>
                                        <span className="w-6 text-center text-sm font-semibold text-gray-900">{editState.spots_booked}</span>
                                        <button type="button"
                                          onClick={() => setEditState({ ...editState, spots_booked: Math.min(editState.spots_available, editState.spots_booked + 1) })}
                                          className="h-7 w-7 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 text-sm font-bold">+</button>
                                      </div>
                                      <span className="text-xs text-gray-400">booked of</span>
                                      <select value={editState.spots_available}
                                        onChange={(e) => setEditState({ ...editState, spots_available: parseInt(e.target.value) })}
                                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs">
                                        {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Price ($)</label>
                                      <input type="number" value={editState.price_cents}
                                        onChange={(e) => setEditState({ ...editState, price_cents: e.target.value })}
                                        placeholder="Optional" min="0" step="0.01"
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                                    </div>
                                    <div className="flex items-end pb-0.5">
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input type="checkbox" checked={editState.is_last_minute}
                                          onChange={(e) => setEditState({ ...editState, is_last_minute: e.target.checked })}
                                          className="rounded" />
                                        <span className="text-xs text-gray-600">Last-minute</span>
                                      </label>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Note</label>
                                    <input type="text" value={editState.special_note}
                                      onChange={(e) => setEditState({ ...editState, special_note: e.target.value })}
                                      placeholder="Optional note…" maxLength={120}
                                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                                  </div>

                                  {editError && <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">{editError}</p>}

                                  <button
                                    onClick={() => handleSaveEdit(t.id)} disabled={editSaving}
                                    className="w-full rounded-xl bg-primary py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5 transition">
                                    <Save className="h-3.5 w-3.5" />{editSaving ? "Saving…" : "Save changes"}
                                  </button>
                                </div>
                              ) : (
                                /* ── Normal card view ── */
                                <div className="px-4 py-3">
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      {/* Top row: time + badges */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-gray-900">{fmt12(t.tee_time)}</span>
                                        {t.is_last_minute && (
                                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                                            Last Minute
                                          </span>
                                        )}
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                                          {badge.label}
                                        </span>
                                      </div>

                                      {/* Info row */}
                                      <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                                        {t.price_cents != null && <span>${(t.price_cents / 100).toFixed(0)}</span>}
                                        {t.special_note && (
                                          <span className="truncate max-w-[140px] italic">{t.special_note}</span>
                                        )}
                                      </div>

                                      {/* Spots progress bar */}
                                      <div className="mt-2">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] text-gray-400">
                                            {t.spots_booked ?? 0} of {t.spots_available} spots booked
                                          </span>
                                          <span className="text-[10px] font-medium text-gray-500">
                                            {remaining > 0 ? `${remaining} open` : "Full"}
                                          </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all ${
                                              bookedPct >= 100 ? "bg-red-400" :
                                              bookedPct >= 75 ? "bg-amber-400" :
                                              "bg-emerald-400"
                                            }`}
                                            style={{ width: `${bookedPct}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* 3-dot menu */}
                                    <div className="relative flex-shrink-0">
                                      <button
                                        onClick={() => setMenuOpenId(menuOpenId === t.id ? null : t.id)}
                                        className="rounded-lg p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition"
                                        title="Options">
                                        <MoreVertical className="h-4 w-4" />
                                      </button>

                                      <AnimatePresence>
                                        {menuOpenId === t.id && (
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="absolute right-0 top-8 z-20 w-40 rounded-xl bg-white border border-gray-100 shadow-lg py-1 overflow-hidden"
                                          >
                                            <button
                                              onClick={() => handleStartEdit(t)}
                                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition">
                                              <Edit2 className="h-3.5 w-3.5 text-primary" /> Edit
                                            </button>
                                            <button
                                              onClick={() => handleDuplicate(t)}
                                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition">
                                              <Copy className="h-3.5 w-3.5 text-blue-500" /> Duplicate
                                            </button>
                                            <div className="my-1 border-t border-gray-100" />
                                            <button
                                              onClick={() => handleCancel(t.id)}
                                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition">
                                              <Trash2 className="h-3.5 w-3.5" /> Remove
                                            </button>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROFILE & SETTINGS TAB ── */}
        {activeTab === "profile" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Course profile form */}
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-4">Course profile</h2>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                This info appears on your public course page that golfers see when they click your course name.
              </p>

              <AnimatePresence>
                {profileSuccess && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Profile saved.
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleProfileSave} className="space-y-4 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1"><Flag className="inline h-3 w-3 mr-1" />Course name</label>
                  <input type="text" value={pCourseName} onChange={(e) => setPCourseName(e.target.value)} required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1"><MapPin className="inline h-3 w-3 mr-1" />Address</label>
                  <input type="text" value={pAddress} onChange={(e) => setPAddress(e.target.value)}
                    placeholder="1234 Golf Rd, Minneapolis, MN 55401"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1"><Phone className="inline h-3 w-3 mr-1" />Phone</label>
                    <input type="tel" value={pPhone} onChange={(e) => setPPhone(e.target.value)}
                      placeholder="(612) 555-0123"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1"><Globe className="inline h-3 w-3 mr-1" />Website</label>
                    <input type="url" value={pWebsite} onChange={(e) => setPWebsite(e.target.value)}
                      placeholder="https://braemar.com"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Holes</label>
                    <select value={pHoles} onChange={(e) => setPHoles(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition">
                      <option value="">—</option>
                      {[9, 18, 27, 36].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Par</label>
                    <input type="number" value={pPar} onChange={(e) => setPPar(e.target.value)}
                      placeholder="72" min="27" max="80"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-600"><Info className="inline h-3 w-3 mr-1" />Description</label>
                    <span className={`text-xs ${pDescription.length >= 450 ? "text-amber-500" : "text-gray-400"}`}>{pDescription.length}/500</span>
                  </div>
                  <textarea value={pDescription} onChange={(e) => setPDescription(e.target.value)}
                    rows={3} maxLength={500} placeholder="Tell golfers about your course — layout, difficulty, what makes it special…"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Logo URL <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="url" value={pLogoUrl} onChange={(e) => setPLogoUrl(e.target.value)}
                    placeholder="https://braemar.com/logo.png"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                  {pLogoUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pLogoUrl} alt="Logo preview" className="h-10 w-10 rounded-lg object-contain border border-gray-100"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <span className="text-xs text-gray-400">Preview</span>
                    </div>
                  )}
                </div>

                {profileError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{profileError}</p>}

                <button type="submit" disabled={profileSaving}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" />{profileSaving ? "Saving…" : "Save profile"}
                </button>
              </form>
            </div>

            {/* Right: Staff + profile link */}
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-gray-800 mb-4">Dashboard access</h2>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Anyone with one of these email addresses can sign in and manage this course&apos;s tee times and profile.
                </p>

                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4">
                  <div className="space-y-2">
                    {staffEmails.map((em) => (
                      <div key={em} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{em}</span>
                          {em === account?.email && (
                            <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary flex-shrink-0">Primary</span>
                          )}
                        </div>
                        {em !== account?.email && (
                          <button onClick={() => handleRemoveStaffEmail(em)}
                            className="ml-2 flex-shrink-0 rounded-lg p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 transition">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {staffEmailError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{staffEmailError}</p>}

                  <div className="flex gap-2">
                    <input type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddStaffEmail(); } }}
                      placeholder="colleague@course.com"
                      className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
                    <button onClick={handleAddStaffEmail} disabled={staffEmailLoading || !newStaffEmail.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition">
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">Up to 9 additional emails.</p>
                </div>
              </div>

              {/* Public profile link */}
              <div className="rounded-2xl bg-primary-50/50 border border-primary/10 px-5 py-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Your public course page</p>
                <a href={`/course/${account?.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline break-all">
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  rubegolf.com/course/{account?.id}
                </a>
                <p className="mt-2 text-xs text-gray-400">Share this link with golfers to show your tee times and course info.</p>
                <button onClick={handleShare}
                  className="mt-3 flex items-center gap-1.5 rounded-lg border border-primary/20 bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition">
                  <Share2 className="h-3.5 w-3.5" /> Copy link
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
