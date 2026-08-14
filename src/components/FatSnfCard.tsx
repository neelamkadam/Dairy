import { TrendingUp } from "lucide-react";

interface FatSnfCardProps {
  fat: number;
  snf: number;
}

const FatSnfCard = ({ fat, snf }: FatSnfCardProps) => {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-white to-teal-50 rounded-xl border border-teal-100 border-l-4 border-l-teal-500 p-4 shadow-sm hover:shadow-md transition-all duration-300 group`}>
      {/* Decorative background element */}
      <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-20 transition-transform group-hover:scale-150 duration-700 bg-teal-100"></div>

      <div className="relative z-10 flex items-center justify-between mb-2">
        <h3 className="text-slate-600 text-sm font-semibold tracking-wide">Fat / SNF</h3>
        <div className="p-2 rounded-lg bg-teal-100 bg-opacity-60 shadow-sm">
            <TrendingUp className="h-4 w-4 text-teal-600" />
        </div>
      </div>
      
      <div className="relative z-10 flex items-center justify-between gap-4 mt-1">
        <div className="flex-1">
          <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">Fat %</div>
          <div className="text-2xl font-bold text-slate-800 tracking-tight">{fat.toFixed(2)}</div>
        </div>
        
        <div className="h-8 w-px bg-slate-200"></div>
        
        <div className="flex-1">
          <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">SNF %</div>
          <div className="text-2xl font-bold text-slate-800 tracking-tight">{snf.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default FatSnfCard;
