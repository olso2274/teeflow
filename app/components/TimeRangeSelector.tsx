"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface TimeRangeSelectorProps {
  preset: "morning" | "midday" | "afternoon" | null;
  startHour: number;
  endHour: number;
  onPresetClick: (preset: "morning" | "midday" | "afternoon") => void;
  onCustomChange: (start: number, end: number) => void;
}

export default function TimeRangeSelector({
  preset,
  startHour,
  endHour,
  onPresetClick,
  onCustomChange,
}: TimeRangeSelectorProps) {
  const presets = [
    { name: "morning", label: "Morning", start: 6, end: 10 },
    { name: "midday", label: "Midday", start: 10, end: 14 },
    { name: "afternoon", label: "Afternoon", start: 14, end: 18 },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {presets.map((p) => (
          <Button
            key={p.name}
            onClick={() => onPresetClick(p.name)}
            variant={preset === p.name ? "default" : "outline"}
            className="text-xs sm:text-sm"
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Custom Time Range Display */}
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="mb-4 flex justify-between text-sm font-semibold">
          <span>
            {startHour.toString().padStart(2, "0")}:00 -{" "}
            {endHour.toString().padStart(2, "0")}:00
          </span>
          <span className="text-gray-600">
            {endHour - startHour} {endHour - startHour === 1 ? "hour" : "hours"}
          </span>
        </div>

        {/* Slider */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-600">Start Hour</label>
            <Slider
              min={6}
              max={16}
              step={1}
              value={[startHour]}
              onValueChange={(val) => {
                if (val[0] < endHour) {
                  onCustomChange(val[0], endHour);
                }
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">End Hour</label>
            <Slider
              min={startHour + 1}
              max={18}
              step={1}
              value={[endHour]}
              onValueChange={(val) => {
                onCustomChange(startHour, val[0]);
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
