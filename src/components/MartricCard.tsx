import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
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
    <div className={cn("bg-white rounded-lg p-6 shadow-sm border", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className={cn(
            "text-sm font-medium mt-2",
            changeType === "positive" ? "text-green-600" : "text-red-600"
          )}>
            {change} vs last month
          </p>
        </div>
        <div className={cn("p-3 rounded-lg", iconColor)}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}
