import { TrendingUp } from "lucide-react";

interface FatSnfCardProps {
  fat: number;
  snf: number;
}

const FatSnfCard = ({ fat, snf }: FatSnfCardProps) => {
  return (
    <div className="bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/80 text-sm font-medium">Fat / SNF</h3>
        <TrendingUp className="h-5 w-5 text-white/80" />
      </div>
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-xs text-white/70 mb-1">Fat %</div>
          <div className="text-2xl font-bold">{fat.toFixed(2)}</div>
        </div>
        
        <div className="h-12 w-px bg-white/30"></div>
        
        <div className="flex-1">
          <div className="text-xs text-white/70 mb-1">SNF %</div>
          <div className="text-2xl font-bold">{snf.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default FatSnfCard;
