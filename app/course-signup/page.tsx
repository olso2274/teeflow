"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle2, Flag, Zap } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

const BYPASS_COURSE_EMAILS = new Set([
  "eo18@rubegolf.com",
  "ml18@rubegolf.com",
  "test18@rubegolf.com",
]);

export default function CourseSignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [courseName, setCourseName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isBypass, setIsBypass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isExisting, setIsExisting] = useState(false);

  const handleDevSignin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: ensure user exists server-side
      const res = await fetch("/api/dev-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Dev sign-in failed.");

      // Step 2: sign in with password on the client
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: "RubeGolf2024!",
      });
      if (signInErr) throw new Error(signInErr.message);

      router.push("/course-dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/course/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseName, contactName, email, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setIsExisting(data.existing ?? false);
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xl" aria-hidden>&#9971;</span>
            <span className="text-lg font-bold tracking-tight text-primary">RubeGolf</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          {!submitted ? (
            <div className="rounded-2xl bg-white p-7 shadow-search sm:p-9">
              {/* Header */}
              <div className="mb-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                  <Flag className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Golf Course Portal</h1>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  List your course on RubeGolf and post tee time openings directly to thousands of
                  golfers searching in your area.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course name
                  </label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="Braemar Golf Course"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setIsBypass(BYPASS_COURSE_EMAILS.has(e.target.value.trim().toLowerCase()));
                    }}
                    placeholder="jane@braemar.com"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(612) 555-0123"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
                )}

                {isBypass ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleDevSignin}
                    className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    {loading ? "Signing in..." : "Quick access"}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 mt-1"
                  >
                    {loading ? "Submitting..." : "Get started — it's free"}
                  </button>
                )}
              </form>

              <p className="mt-5 text-center text-xs text-gray-400">
                Already registered?{" "}
                <Link href="/course-dashboard" className="text-primary hover:underline">
                  Go to your dashboard
                </Link>
              </p>
            </div>
          ) : (
            /* ── Success state ── */
            <div className="rounded-2xl bg-white p-8 shadow-search text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
              <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
                {isExisting
                  ? "We sent a new sign-in link to "
                  : "We sent a sign-in link to "}
                <span className="font-medium text-gray-700">{email}</span>.
                {!isExisting && " Click it to access your course dashboard."}
              </p>

              <div className="mt-6 rounded-xl bg-gray-50 px-4 py-3 text-left">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-500">
                    The link will sign you in and take you directly to your course dashboard where
                    you can post tee time openings. Check spam if you don&apos;t see it within a
                    minute.
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setSubmitted(false); setError(null); }}
                className="mt-6 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Use a different email
              </button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
