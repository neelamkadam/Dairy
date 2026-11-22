import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdvanceLimit } from "@/services/paymentApi";

// The VLC's advance limit for one farmer (General Settings → Advance Limit): how
// much more advance / cattle feed / Other1 / Other2 can be given right now.
// Load it with useAdvanceLimit (hooks/useAdvanceLimit.ts).

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ddmmyyyy = (ymd: string) => ymd.split("-").reverse().join("-");

const AdvanceLimitNote = ({ limit, className }: { limit: AdvanceLimit | null; className?: string }) => {
  const { t } = useTranslation();
  if (!limit || !limit.enabled) return null;
  const blocked = limit.available <= 0;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-left",
        blocked ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50",
        className
      )}
    >
      <Wallet className={cn("mt-0.5 h-5 w-5 flex-shrink-0", blocked ? "text-red-500" : "text-emerald-600")} />
      <div className="min-w-0">
        <div className={cn("text-sm font-semibold", blocked ? "text-red-800" : "text-emerald-900")}>
          {blocked
            ? t("advance_limit_reached", "Advance limit reached: nothing more can be given now")
            : t("advance_limit_can_give", "Can give up to {{amount}} more", { amount: rupees(limit.available) })}
        </div>
        <div className="mt-0.5 text-xs text-gray-600">
          {t("advance_limit_detail", "Limit {{percent}}% of {{milk}} milk since {{since}} = {{limit}} · Owes {{owed}}", {
            percent: limit.percent,
            milk: rupees(limit.milk_amount),
            since: ddmmyyyy(limit.since),
            limit: rupees(limit.limit),
            owed: rupees(limit.owed),
          })}
        </div>
      </div>
    </div>
  );
};

export default AdvanceLimitNote;
