import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format, isValid, parse } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CustomDatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function CustomDatePicker({ value, onChange, placeholder = "DD/MM/YYYY", className }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Sync input value with external value prop
  React.useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    // Only parse and update parent when a full date string is typed
    if (text.length === 10) {
      const parsed = parse(text, 'dd/MM/yyyy', new Date());
      if (isValid(parsed)) {
        onChange(parsed);
      } else {
        const parsedIso = parse(text, 'yyyy-MM-dd', new Date());
        if (isValid(parsedIso)) {
           onChange(parsedIso);
        }
      }
    } else if (text === "") {
      onChange(undefined);
    }
  };

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(selectedDate);
      setInputValue(format(selectedDate, "dd/MM/yyyy"));
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        className="pr-10 w-full h-10 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-gray-800 shadow-sm enter-field"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            type="button"
            className="absolute right-0 h-10 w-10 p-0 rounded-r-xl hover:bg-transparent text-gray-400 hover:text-blue-500"
            tabIndex={-1} // prevent tab stop on the icon to keep form navigation smooth
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white rounded-xl shadow-lg border-gray-100 z-50" align="end">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Generate times array like ["12:00 AM", "12:30 AM", "01:00 AM", ... "11:30 PM"]
const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const h = Math.floor(i / 2);
  const hours = h === 0 ? 12 : (h > 12 ? h - 12 : h);
  const minutes = (i % 2 === 0 ? '00' : '30');
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
});

interface CustomTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomTimePicker({ value, onChange, placeholder = "HH:MM AM", className }: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow typing numbers, colons, spaces, and A/P/M/a/p/m
    const val = e.target.value.replace(/[^0-9:\sAaPpMm]/g, '');
    onChange(val);
  };

  const handleSelectTime = (time: string) => {
    onChange(time);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        maxLength={8}
        className="pr-10 w-full h-10 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-gray-800 shadow-sm enter-field"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            type="button"
            className="absolute right-0 h-10 w-10 p-0 rounded-r-xl hover:bg-transparent text-gray-400 hover:text-blue-500"
            tabIndex={-1}
          >
            <Clock className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-0 bg-white rounded-xl shadow-lg border-gray-100 z-50" align="end">
          <ScrollArea className="h-64 rounded-xl">
            <div className="flex flex-col p-1">
              {TIME_OPTIONS.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => handleSelectTime(time)}
                  className={cn(
                    "px-3 py-2 text-sm text-left rounded-lg transition-colors hover:bg-blue-50 hover:text-blue-600",
                    value === time ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
