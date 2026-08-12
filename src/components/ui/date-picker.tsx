import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface AppDatePickerProps {
  date: string | Date | undefined;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const AppDatePicker: React.FC<AppDatePickerProps> = ({ 
  date, 
  onChange, 
  placeholder = "Select date", 
  className,
  disabled = false
}) => {
  
  const dateValue = React.useMemo(() => {
    if (!date) return undefined;
    if (date instanceof Date) {
      return isValid(date) ? date : undefined;
    }
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : undefined;
  }, [date])

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(format(selectedDate, "yyyy-MM-dd"));
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-[180px] h-9 px-3 justify-start text-left font-medium bg-transparent border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors",
            !dateValue && "text-slate-500",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
          {dateValue ? format(dateValue, "MMM dd, yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white border-slate-200 shadow-md rounded-lg z-50" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          initialFocus
          className="bg-white rounded-lg pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  )
}
