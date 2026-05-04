import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

interface AppDatePickerProps {
  date: string | Date | undefined;
  onChange: (date: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const AppDatePicker: React.FC<AppDatePickerProps> = ({ 
  date, 
  onChange, 
  placeholder, 
  className,
  disabled = false
}) => {
  
  // Convert incoming date to YYYY-MM-DD string for the native input
  const dateValue = React.useMemo(() => {
    if (!date) return ""
    if (date instanceof Date) {
      return isValid(date) ? format(date, "yyyy-MM-dd") : ""
    }
    // If it's already a string, assume it's YYYY-MM-DD or try to parse it
    const parsed = parseISO(date)
    return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : date
  }, [date])

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      <CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <input
        type="date"
        value={dateValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-sm font-medium border-none outline-none bg-transparent cursor-pointer min-h-[20px]"
        style={{ colorScheme: "light" }}
      />
    </div>
  )
}
