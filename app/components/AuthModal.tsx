"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { X, Mail, CheckCircle2, Zap } from "lucide-react";

const STORAGE_KEY = "rubegolf_user";

const BYPASS_EMAILS = new Set([
  "eo@rubegolf.com",
  "ml@rubegolf.com",
  "testgolfer@rubegolf.com",
  "eo18@rubegolf.com",
  "ml18@rubegolf.com",
  "test18@rubegolf.com",
]);

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (userId: string) => void;
}

export default function AuthModal({
  open,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isReturning, setIsReturning] = useState(false);
  const [isBypass, setIsBypass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const supabase = createClient();

  // Pre-populate from localStorage when modal opens
  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { name: savedName, email: savedEmail, phone: savedPhone } = JSON.parse(saved);
        if (savedEmail) {
          setName(savedName ?? "");
          setEmail(savedEmail);
          setPhone(savedPhone ?? "");
          setIsReturning(true);
          setIsBypass(BYPASS_EMAILS.has(savedEmail.trim().toLowerCase()));
        }
      }
    } catch {
      /* localStorage unavailable */
    }
  }, [open]);

  const handleDevSignin = async (emailVal: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Dev sign-in failed.");

      const supabase = createClient();
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        saveToStorage(name.trim(), emailVal.trim(), phone.trim());
        if (data.isCourse) {
          window.location.href = "/course-dashboard";
        } else {
          onSuccess(user.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const saveToStorage = (n: string, e: string, p: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: n, email: e, phone: p }));
    } catch { /* no-op */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          data: { name: name.trim(), phone: phone.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) throw signInError;

      // Check if user already has a session (returning user)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          name: name.trim(),
          phone: phone.trim(),
          email: user.email ?? email.trim(),
        });
        saveToStorage(name.trim(), email.trim(), phone.trim());
        onSuccess(user.id);
        return;
      }

      saveToStorage(name.trim(), email.trim(), phone.trim());
      setEmailSent(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setEmailSent(false);
        setError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const firstName = name.trim().split(" ")[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl sm:p-8"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <X className="h-4 w-4" />
            </button>

            {!emailSent ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {isReturning && firstName
                      ? `Welcome back, ${firstName}!`
                      : "Login or create your account"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {isReturning
                      ? "We\u2019ll send a sign-in link to your email \u2014 no password needed."
                      : "We\u2019ll email you a sign-in link \u2014 no password needed."}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setIsReturning(false); }}
                      placeholder="Jared Smith"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsReturning(false);
                        setIsBypass(BYPASS_EMAILS.has(e.target.value.trim().toLowerCase()));
                      }}
                      placeholder="jared@example.com"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(612) 555-0123"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                      required
                    />
                  </div>

                  {error && (
                    <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  {isBypass ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleDevSignin(email)}
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
                      {loading ? "Sending link..." : "Continue"}
                    </button>
                  )}
                </form>

                <p className="mt-5 text-center text-xs text-gray-400">
                  Golf course?{" "}
                  <a
                    href="/course-signup"
                    className="font-medium text-primary hover:underline"
                    onClick={onClose}
                  >
                    Click here to list your course
                  </a>
                </p>
              </>
            ) : (
              /* ── Email sent confirmation ── */
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Check your email
                </h2>
                <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
                  We sent a sign-in link to{" "}
                  <span className="font-medium text-gray-700">{email}</span>.
                  Click the link to continue.
                </p>

                <div className="mt-6 rounded-xl bg-gray-50 px-4 py-3 text-left">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-500">
                      The link will sign you in and take you directly to your
                      tee time results. Check your spam folder if you don&apos;t
                      see it.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-4">
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setError(null);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    Try a different email
                  </button>
                  <button
                    onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                    disabled={loading}
                    className="text-sm font-medium text-primary hover:text-primary/80 disabled:text-gray-400 transition"
                  >
                    {loading ? "Sending..." : "Resend link"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
