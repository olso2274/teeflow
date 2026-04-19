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

    const redirectAfterAuth = () => {
      const next = searchParams.get("next");
      if (next && next.startsWith("/")) {
        router.replace(next);
        return;
      }
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
      router.replace("/");
    };

    const handleAuth = async () => {
      // 1. Try PKCE code exchange (if code in URL)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          if (mounted) redirectAfterAuth();
          return;
        }
        // Code exchange failed — show error rather than silently spinning
        if (mounted) {
          setFailed(true);
          return;
        }
      }

      // 2. Check if Supabase already processed hash tokens
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        if (mounted) redirectAfterAuth();
        return;
      }

      // 3. Wait for auth state change (hash token processing)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          subscription.unsubscribe();
          if (mounted) redirectAfterAuth();
        }
      });

      // 4. Timeout fallback — show error instead of silently redirecting
      setTimeout(() => {
        subscription.unsubscribe();
        if (mounted) setFailed(true);
      }, 10000);
    };

    handleAuth();

    return () => {
      mounted = false;
    };
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
            This link may have already been used or has expired. Sign-in links are valid for 1 hour.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            Back to RubeGolf
          </Link>
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
