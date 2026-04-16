"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { X } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (userId: string) => void;
}

export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
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
      // Try to sign in first (returning user)
      const { error: signInError } =
        await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            data: { name: name.trim(), phone: phone.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

      if (signInError) throw signInError;

      // Update profile with name/phone in case user already exists
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          name: name.trim(),
          phone: phone.trim(),
        });
        onSuccess(user.id);
        return;
      }

      // OTP sent — show check email step
      setStep("check-email");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
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
    } catch (err: any) {
      setError(err.message ?? "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            {step === "form" ? (
              <>
                <div className="mb-6 text-center">
                  <div className="text-4xl mb-2">⛳</div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Let&apos;s find your tee time
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Tell us who you are and we&apos;ll show you real available times
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Eddie Olson"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="eddie@example.com"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(612) 555-0123"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>

                  {error && (
                    <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-primary py-3 text-base font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? "Getting your tee times..." : "Show Me Real Tee Times →"}
                  </button>
                </form>
              </>
            ) : (
              <OtpStep
                email={email}
                loading={loading}
                error={error}
                onVerify={handleVerifyOtp}
                onBack={() => setStep("form")}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OtpStep({
  email,
  loading,
  error,
  onVerify,
  onBack,
}: {
  email: string;
  loading: boolean;
  error: string | null;
  onVerify: (token: string) => void;
  onBack: () => void;
}) {
  const [token, setToken] = useState("");

  return (
    <div className="text-center">
      <div className="text-4xl mb-4">📧</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
      <p className="text-sm text-gray-500 mb-6">
        We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
      </p>

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={token}
        onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
        placeholder="000000"
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-widest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary mb-4"
        autoFocus
      />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        onClick={() => onVerify(token)}
        disabled={loading || token.length < 6}
        className="w-full rounded-lg bg-primary py-3 text-base font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 mb-3"
      >
        {loading ? "Verifying..." : "Verify & See Tee Times →"}
      </button>

      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
        ← Back
      </button>
    </div>
  );
}
