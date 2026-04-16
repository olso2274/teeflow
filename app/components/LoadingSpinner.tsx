"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSpinner() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="inline-block text-5xl"
        >
          🏌️
        </motion.div>
        <p className="mt-4 text-lg text-gray-600">
          Searching live tee times...
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <Skeleton className="mb-4 h-6 w-3/4" />
            <Skeleton className="mb-3 h-4 w-full" />
            <Skeleton className="mb-4 h-4 w-2/3" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
