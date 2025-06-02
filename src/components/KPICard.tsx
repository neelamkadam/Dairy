import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  gradient: string;
}

const KPICard = ({ title, value, change, icon: Icon, gradient }: KPICardProps) => {
  const isPositive = change.startsWith("+");
  
  return (
    <div className={`${gradient} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/80 text-sm font-medium">{title}</h3>
        <Icon className="h-5 w-5 text-white/80" />
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold">{value}</div>
        <div className={`text-sm font-medium ${isPositive ? 'text-green-200' : 'text-red-200'}`}>
          {change}
        </div>
      </div>
    </div>
  );
};

export default KPICard;
