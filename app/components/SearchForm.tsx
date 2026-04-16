"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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
  const [preset, setPreset] = useState<
    "morning" | "midday" | "afternoon" | null
  >(null);

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

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        {/* Date */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <DatePickerField value={selectedDate} onChange={setSelectedDate} />
        </div>

        {/* Time */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            Time window
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

      <Button
        onClick={() => onSearch(selectedDate, startHour, endHour)}
        disabled={loading}
        className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl gap-2"
      >
        <Search className="h-4 w-4" />
        {loading ? "Searching..." : "Find Tee Times"}
      </Button>
    </div>
  );
}
