"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell failed={false} />}>
      <CallbackHandler />
    </Suspense>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const code = searchParams.get("code");
    let mounted = true;

    const redirectAfterAuth = async () => {
      // Explicit ?next= param (used by course portal magic links)
      const next = searchParams.get("next");
      if (next && next.startsWith("/")) {
        router.replace(next);
        return;
      }

      // Restore pending tee-time search (golfer flow)
      try {
        const pending = sessionStorage.getItem("rubegolf_pending_search");
        if (pending) {
          sessionStorage.removeItem("rubegolf_pending_search");
          router.replace(pending);
          return;
        }
      } catch {
        /* sessionStorage may not be available */
      }

      // No explicit destination — detect if this is a course user
      // and send them to the right place rather than always dumping to home
      try {
        const courseRes = await fetch("/api/course/me");
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          if (courseData.account) {
            router.replace("/course-dashboard");
            return;
          }
        }
      } catch {
        /* non-critical — fall through to home */
      }

      router.replace("/");
    };

    const handleAuth = async () => {
      // 1. Hash fragment tokens (implicit flow — used by admin-generated magic links)
      //    Supabase SSR doesn't auto-parse the hash, so we do it explicitly.
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.slice(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (!error) {
            if (mounted) redirectAfterAuth();
            return;
          }
        }
      }

      // 2. PKCE code exchange (standard client-initiated magic-link / OTP flow)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          if (mounted) redirectAfterAuth();
          return;
        }
        // Code exchange failed — fall through in case session was set another way
      }

      // 3. Session already set (e.g. same-tab OTP that Supabase processed)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (mounted) redirectAfterAuth();
        return;
      }

      // 4. Wait for auth state change (last resort)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          subscription.unsubscribe();
          if (mounted) redirectAfterAuth();
        }
      });

      // 5. Timeout — link was likely expired or already used
      setTimeout(() => {
        subscription.unsubscribe();
        if (mounted) setFailed(true);
      }, 12000);
    };

    handleAuth();
    return () => { mounted = false; };
  }, [router, searchParams]);

  return <CallbackShell failed={failed} />;
}

function CallbackShell({ failed }: { failed: boolean }) {
  if (failed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <span className="text-2xl">&#9888;</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Sign-in link expired</h2>
          <p className="mt-2 text-sm text-gray-500">
            This link may have already been used or has expired. Sign-in links
            are valid for 1 hour.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              href="/"
              className="inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition"
            >
              Back to RubeGolf
            </Link>
            <Link
              href="/course-signup"
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Course portal sign-in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="relative mx-auto mb-5 h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
        <p className="text-sm font-medium text-gray-600">Signing you in...</p>
        <p className="mt-1 text-xs text-gray-400">
          You&apos;ll be redirected automatically
        </p>
      </div>
    </div>
  );
}
