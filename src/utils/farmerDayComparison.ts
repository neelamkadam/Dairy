import { format } from "date-fns";
import { normalizeFarmerCode } from "@/utils/farmerCollectionSummary";

// Farmer-wise comparison of two days (the To Date and the day before), grouped
// by VLC: litres and amount summed, FAT / SNF weighted by litres,
// Difference = Today − Yesterday. Farmers who poured on either day are listed;
// a day with no collection shows zeros.

export interface DayFigures {
  liters: number;
  fat: number;
  snf: number;
  amount: number;
}

export interface ComparisonTotals {
  yesterday: DayFigures;
  today: DayFigures;
  diff: DayFigures;
}

export interface ComparisonFarmerRow extends ComparisonTotals {
  farmerCode: string;
  farmerName: string;
}

export interface ComparisonGroup {
  label: string;
  farmers: ComparisonFarmerRow[];
  total: ComparisonTotals;
}

export interface DayComparison {
  yesterdayDate: string; // yyyy-MM-dd
  todayDate: string;
  groups: ComparisonGroup[];
  total: ComparisonTotals;
}

export const COMPARISON_METRICS: Array<{ key: keyof DayFigures; label: string; digits: number }> = [
  { key: "liters", label: "Liter", digits: 2 },
  { key: "fat", label: "FAT", digits: 2 },
  { key: "snf", label: "SNF", digits: 2 },
  { key: "amount", label: "Amount", digits: 2 },
];

interface Acc {
  liters: number;
  fatQty: number;
  snfQty: number;
  amount: number;
}

const emptyAcc = (): Acc => ({ liters: 0, fatQty: 0, snfQty: 0, amount: 0 });
const addAcc = (into: Acc, from: Acc) => {
  into.liters += from.liters;
  into.fatQty += from.fatQty;
  into.snfQty += from.snfQty;
  into.amount += from.amount;
};
const figures = (a: Acc): DayFigures => ({
  liters: a.liters,
  fat: a.liters > 0 ? a.fatQty / a.liters : 0,
  snf: a.liters > 0 ? a.snfQty / a.liters : 0,
  amount: a.amount,
});
const totalsOf = (y: Acc, t: Acc): ComparisonTotals => {
  const yesterday = figures(y);
  const today = figures(t);
  return {
    yesterday,
    today,
    diff: {
      liters: today.liters - yesterday.liters,
      fat: today.fat - yesterday.fat,
      snf: today.snf - yesterday.snf,
      amount: today.amount - yesterday.amount,
    },
  };
};

const num = (v: unknown) => parseFloat(String(v ?? "")) || 0;

/**
 * @param rows      collection entries covering at least both days, each stamped with its `branch_id`
 * @param vlcOrder  VLCs in display order: branch id + heading label
 */
export const buildDayComparison = (
  rows: any[],
  vlcOrder: Array<{ dairyId: string; name: string }>,
  todayDate: string,
  yesterdayDate: string
): DayComparison => {
  const byVlc = new Map<string, Map<string, { name: string; y: Acc; t: Acc }>>();

  rows.forEach((r) => {
    // Rows fetched for one day carry that day in compare_day, which matches the
    // database's DATE(created_at); created_at is only a fallback (the browser's
    // timezone can move a late entry to the next day).
    const day = r.compare_day ?? (r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd") : "");
    if (day !== todayDate && day !== yesterdayDate) return;

    const vlcKey = String(r.branch_id ?? r.dairy_id ?? "");
    if (!byVlc.has(vlcKey)) byVlc.set(vlcKey, new Map());
    const farmers = byVlc.get(vlcKey)!;
    const code = normalizeFarmerCode(r.farmer_code ?? r.farmer_id);
    if (!farmers.has(code)) farmers.set(code, { name: r.farmer_name || "", y: emptyAcc(), t: emptyAcc() });
    const f = farmers.get(code)!;
    if (!f.name && r.farmer_name) f.name = r.farmer_name;

    const q = num(r.quantity);
    const acc = day === todayDate ? f.t : f.y;
    acc.liters += q;
    acc.fatQty += num(r.fat) * q;
    acc.snfQty += num(r.snf) * q;
    acc.amount += num(r.amount);
  });

  const grandY = emptyAcc();
  const grandT = emptyAcc();
  const groups: ComparisonGroup[] = [];

  vlcOrder.forEach(({ dairyId, name }) => {
    const farmers = byVlc.get(dairyId);
    if (!farmers?.size) return;
    const groupY = emptyAcc();
    const groupT = emptyAcc();
    const farmerRows = [...farmers.entries()]
      .sort(([a], [b]) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b))
      .map(([code, f]) => {
        addAcc(groupY, f.y);
        addAcc(groupT, f.t);
        return { farmerCode: code, farmerName: f.name, ...totalsOf(f.y, f.t) };
      });
    addAcc(grandY, groupY);
    addAcc(grandT, groupT);
    groups.push({ label: name, farmers: farmerRows, total: totalsOf(groupY, groupT) });
  });

  return { yesterdayDate, todayDate, groups, total: totalsOf(grandY, grandT) };
};

export const formatFigure = (n: number, digits = 2, signed = false) => {
  const text = Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (!signed) return (n < 0 ? "-" : "") + text;
  const rounded = Number(n.toFixed(digits));
  return rounded > 0 ? `+${text}` : rounded < 0 ? `-${text}` : text;
};
