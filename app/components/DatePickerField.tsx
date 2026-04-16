"use client";

import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerFieldProps {
  value: Date;
  onChange: (date: Date) => void;
}

export default function DatePickerField({
  value,
  onChange,
}: DatePickerFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal h-12"
        >
          <Calendar className="mr-2 h-4 w-4" />
          {format(value, "MMM d, yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={value}
          onSelect={(date) => date && onChange(date)}
          disabled={(date) =>
            date < new Date(new Date().setHours(0, 0, 0, 0))
          }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
