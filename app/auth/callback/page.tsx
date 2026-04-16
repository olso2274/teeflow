"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell message="Signing you in..." />}>
      <CallbackHandler />
    </Suspense>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const supabase = createClient();
    const code = searchParams.get("code");
    let mounted = true;

    const redirectAfterAuth = () => {
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

      // 4. Timeout fallback
      setTimeout(() => {
        subscription.unsubscribe();
        if (mounted) {
          setMessage("Redirecting...");
          router.replace("/");
        }
      }, 8000);
    };

    handleAuth();

    return () => {
      mounted = false;
    };
  }, [router, searchParams]);

  return <CallbackShell message={message} />;
}

function CallbackShell({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="relative mx-auto mb-5 h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
        <p className="text-sm font-medium text-gray-600">{message}</p>
        <p className="mt-1 text-xs text-gray-400">
          You&apos;ll be redirected automatically
        </p>
      </div>
    </div>
  );
}
