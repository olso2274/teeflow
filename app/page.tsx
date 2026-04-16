"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { useRouter } from "next/navigation";
import SearchForm from "./components/SearchForm";
import AuthModal from "./components/AuthModal";

export default function Home() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{
    date: Date;
    startHour: number;
    endHour: number;
  } | null>(null);

  // Called when user hits "Find Real Tee Times"
  const handleSearch = (date: Date, startHour: number, endHour: number) => {
    setPendingSearch({ date, startHour, endHour });
    setShowAuth(true);
  };

  // Called after successful auth
  const handleAuthSuccess = () => {
    if (!pendingSearch) return;
    const dateStr = format(pendingSearch.date, "yyyy-MM-dd");
    router.push(
      `/tee-times?date=${dateStr}&startHour=${pendingSearch.startHour}&endHour=${pendingSearch.endHour}`
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <div className="text-3xl">⛳</div>
            <h1 className="text-2xl font-bold text-primary">TeeFlow</h1>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h2 className="text-4xl font-bold text-gray-900 md:text-5xl">
            Hey Eddie, when do you<br className="hidden sm:block" /> want to be golfing?
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Real live tee times from Chaska, Pioneer Creek &amp; Braemar.
          </p>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SearchForm
            onSearch={handleSearch}
            loading={false}
            defaultDate={addDays(new Date(), 1)}
          />
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 grid gap-6 sm:grid-cols-3"
        >
          {[
            { icon: "📅", title: "Pick a date & time", desc: "Choose when you want to play" },
            { icon: "🔍", title: "We find real times", desc: "Live data pulled from course websites" },
            { icon: "🏌️", title: "Book in one click", desc: "Direct link to the course booking page" },
          ].map((step) => (
            <div
              key={step.title}
              className="rounded-xl border border-gray-200 bg-white px-6 py-5 text-center"
            >
              <div className="text-3xl mb-2">{step.icon}</div>
              <p className="font-semibold text-gray-800">{step.title}</p>
              <p className="mt-1 text-sm text-gray-500">{step.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-400">
        Live data from Chaska CPS · Pioneer Creek CPS · Braemar ForeUp
      </footer>

      {/* Auth Modal */}
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
