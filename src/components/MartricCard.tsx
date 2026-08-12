import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
  icon: LucideIcon;
  iconColor: string;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change,
  changeType,
  icon: Icon, 
  iconColor,
  className 
}: MetricCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={cn("p-2 rounded-lg bg-slate-50 border border-slate-100", iconColor)}>
          <Icon size={18} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {change && (
          <p className={cn(
            "text-xs font-medium mt-1 flex items-center gap-1",
            changeType === "positive" ? "text-emerald-600" : "text-rose-600"
          )}>
            {change}
          </p>
        )}
      </div>
    </div>
  );
}
