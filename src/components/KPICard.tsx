import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  theme?: "cyan" | "emerald" | "blue" | "violet" | "pink" | "indigo" | "amber" | "teal";
  onClick?: () => void;
}

const colorMap = {
  cyan: { gradient: "from-cyan-100 to-cyan-50", border: "border-cyan-200", accent: "border-l-cyan-500", text: "text-cyan-700", bg: "bg-cyan-200" },
  emerald: { gradient: "from-emerald-100 to-emerald-50", border: "border-emerald-200", accent: "border-l-emerald-500", text: "text-emerald-700", bg: "bg-emerald-200" },
  blue: { gradient: "from-blue-100 to-blue-50", border: "border-blue-200", accent: "border-l-blue-500", text: "text-blue-700", bg: "bg-blue-200" },
  violet: { gradient: "from-violet-100 to-violet-50", border: "border-violet-200", accent: "border-l-violet-500", text: "text-violet-700", bg: "bg-violet-200" },
  pink: { gradient: "from-pink-100 to-pink-50", border: "border-pink-200", accent: "border-l-pink-500", text: "text-pink-700", bg: "bg-pink-200" },
  indigo: { gradient: "from-indigo-100 to-indigo-50", border: "border-indigo-200", accent: "border-l-indigo-500", text: "text-indigo-700", bg: "bg-indigo-200" },
  amber: { gradient: "from-amber-100 to-amber-50", border: "border-amber-200", accent: "border-l-amber-500", text: "text-amber-700", bg: "bg-amber-200" },
  teal: { gradient: "from-teal-100 to-teal-50", border: "border-teal-200", accent: "border-l-teal-500", text: "text-teal-700", bg: "bg-teal-200" },
};

const KPICard = ({ title, value, change, icon: Icon, theme = "blue", onClick }: KPICardProps) => {
  const isPositive = change?.startsWith("+");
  const colors = colorMap[theme] || colorMap.blue;
  
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={`relative overflow-hidden bg-gradient-to-br ${colors.gradient} rounded-xl border ${colors.border} border-l-4 ${colors.accent} p-4 shadow-sm hover:shadow-md transition-all duration-300 group ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Decorative background element */}
      <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-20 transition-transform group-hover:scale-150 duration-700 ${colors.bg}`}></div>

      <div className="relative z-10 flex items-center justify-between mb-2">
        <h3 className="text-slate-600 text-sm font-semibold tracking-wide">{title}</h3>
        <div className={`p-2 rounded-lg ${colors.bg} bg-opacity-60 shadow-sm`}>
            <Icon className={`h-4 w-4 ${colors.text}`} />
        </div>
      </div>
      
      <div className="relative z-10 flex items-end justify-between mt-1">
        <div className="text-2xl font-bold text-slate-800 tracking-tight">{value}</div>
        {change && (
            <div className={`text-xs font-bold px-2 py-1 rounded-md shadow-sm ${isPositive ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>
            {change}
            </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
