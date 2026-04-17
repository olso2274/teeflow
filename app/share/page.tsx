"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { useState, Suspense } from "react";
import Link from "next/link";

function ShareContent() {
  const searchParams = useSearchParams();
  const teeDetails = searchParams.get("tee") || "";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(teeDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  if (!teeDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500">No tee time details to share</p>
          <Link href="/" className="mt-4 inline-block text-primary hover:underline">
            ← Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-primary-700 to-emerald-950">
      <header className="glass-nav">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white p-8 shadow-2xl"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Share This Tee Time</h1>
          <p className="text-gray-500 mb-6">Copy the details below and share with your friends</p>

          {/* Details box */}
          <div className="rounded-xl bg-gray-50 p-6 mb-6 border border-gray-200 whitespace-pre-wrap font-mono text-sm text-gray-700">
            {teeDetails}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-base font-semibold text-white transition hover:bg-primary/90 active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="h-5 w-5" />
                Copied to clipboard!
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Copy to clipboard
              </>
            )}
          </button>

          {/* Info */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Share this with your golf buddies or save it for later
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
