"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import SearchForm from "./components/SearchForm";
import ResultsList from "./components/ResultsList";
import LoadingSpinner from "./components/LoadingSpinner";
import { ResultTeeTime } from "@/lib/types";

export default function Home() {
  const [results, setResults] = useState<ResultTeeTime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearch = async (
    date: Date,
    startHour: number,
    endHour: number
  ) => {
    setLoading(true);
    setError(null);
    setSearchPerformed(true);

    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const response = await fetch(
        `/api/scrape-tee-times?date=${dateStr}&startHour=${startHour}&endHour=${endHour}`
      );

      if (!response.ok) {
        throw new Error("Failed to search for tee times");
      }

      const data = await response.json();
      setResults(data.tee_times || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setResults([]);
    } finally {
      setLoading(false);
    }
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-4xl font-bold text-gray-900 md:text-5xl">
            When do you want to be golfing?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Find real tee times across Minnesota courses.
          </p>
        </motion.section>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12"
        >
          <SearchForm
            onSearch={handleSearch}
            loading={loading}
            defaultDate={addDays(new Date(), 1)}
          />
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-lg bg-red-50 p-4 text-red-800"
          >
            <p className="font-semibold">Error searching for tee times</p>
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && <LoadingSpinner />}

        {/* Results */}
        {searchPerformed && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {results.length > 0 ? (
              <>
                <h3 className="mb-6 text-2xl font-bold text-gray-900">
                  Available Tee Times ({results.length})
                </h3>
                <ResultsList results={results} />
              </>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <p className="text-lg text-gray-600">
                  No tee times available for your search. Try different dates or
                  times.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Initial State Message */}
        {!searchPerformed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center"
          >
            <div className="text-5xl mb-4">🏌️</div>
            <p className="text-lg text-gray-600">
              Select a date and time to find real tee times at local courses
            </p>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-600 sm:px-6 lg:px-8">
          <p>Powered by real golf course data • Updated live</p>
        </div>
      </footer>
    </div>
  );
}
