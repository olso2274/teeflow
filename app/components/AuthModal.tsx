"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { X, ArrowLeft, Mail } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "check-email">("form");

  const supabase = createClient();

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
        });
        onSuccess(user.id);
        return;
      }

      setStep("check-email");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          name: name.trim(),
          phone: phone.trim(),
        });
        onSuccess(data.user.id);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid code. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("form");
        setError(null);
      }, 300);
    }
  }, [open]);

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
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <X className="h-4 w-4" />
            </button>

            {step === "form" ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Create your account
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    We&apos;ll email you a link to sign in &mdash; no password
                    needed.
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
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Eddie Olson"
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
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="eddie@example.com"
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 mt-1"
                  >
                    {loading ? "Sending..." : "Continue"}
                  </button>
                </form>
              </>
            ) : (
              <OtpStep
                email={email}
                loading={loading}
                error={error}
                onVerify={handleVerifyOtp}
                onBack={() => {
                  setStep("form");
                  setError(null);
                }}
                onResend={handleSubmit}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── OTP verification step ── */
function OtpStep({
  email,
  loading,
  error,
  onVerify,
  onBack,
  onResend,
}: {
  email: string;
  loading: boolean;
  error: string | null;
  onVerify: (token: string) => void;
  onBack: () => void;
  onResend: (e: React.FormEvent) => void;
}) {
  const [token, setToken] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = useCallback(() => {
    setCooldown(60);
  }, []);

  // Start cooldown on mount
  useEffect(() => {
    startCooldown();
  }, [startCooldown]);

  // Tick down
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResend = (e: React.FormEvent) => {
    onResend(e);
    startCooldown();
  };

  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            We sent a sign-in link to{" "}
            <span className="font-medium text-gray-700">{email}</span>. Click
            the link, or enter the 6-digit code below.
          </p>
        </div>
      </div>

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={token}
        onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
        placeholder="000000"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.3em] font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 mb-3 transition"
        autoFocus
      />

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        onClick={() => onVerify(token)}
        disabled={loading || token.length < 6}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 mb-4"
      >
        {loading ? "Verifying..." : "Verify code"}
      </button>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-sm text-primary font-medium hover:text-primary/80 disabled:text-gray-400 disabled:cursor-default transition"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}
