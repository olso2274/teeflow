"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import DatePickerField from "./DatePickerField";
import TimeRangeSelector from "./TimeRangeSelector";

interface SearchFormProps {
  onSearch: (date: Date, startHour: number, endHour: number) => void;
  loading: boolean;
  defaultDate: Date;
}

export default function SearchForm({
  onSearch,
  loading,
  defaultDate,
}: SearchFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [startHour, setStartHour] = useState(6);
  const [endHour, setEndHour] = useState(18);
  const [preset, setPreset] = useState<"morning" | "midday" | "afternoon" | null>(
    null
  );

  const handlePresetClick = (
    presetName: "morning" | "midday" | "afternoon"
  ) => {
    setPreset(presetName);
    switch (presetName) {
      case "morning":
        setStartHour(6);
        setEndHour(10);
        break;
      case "midday":
        setStartHour(10);
        setEndHour(14);
        break;
      case "afternoon":
        setStartHour(14);
        setEndHour(18);
        break;
    }
  };

  const handleCustomTime = (start: number, end: number) => {
    setPreset(null);
    setStartHour(start);
    setEndHour(end);
  };

  const handleSearch = () => {
    onSearch(selectedDate, startHour, endHour);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Date Picker */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Select Date
          </label>
          <DatePickerField
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>

        {/* Time Range */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Time Range
          </label>
          <TimeRangeSelector
            preset={preset}
            startHour={startHour}
            endHour={endHour}
            onPresetClick={handlePresetClick}
            onCustomChange={handleCustomTime}
          />
        </div>
      </div>

      {/* Search Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 flex gap-4"
      >
        <Button
          onClick={handleSearch}
          disabled={loading}
          className="flex-1 h-12 text-lg bg-primary hover:bg-primary/90"
        >
          {loading ? "Searching..." : "Find Real Tee Times"}
        </Button>
        <Button
          onClick={() => {
            handlePresetClick("morning");
          }}
          variant="outline"
          className="h-12"
          title="Refresh live tee times"
        >
          🔄
        </Button>
      </motion.div>

      <p className="mt-4 text-xs text-gray-500">
        ✨ Live data from Chaska CPS, Pioneer Creek, and Braemar Golf Club
      </p>
    </motion.div>
  );
}
