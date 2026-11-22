import { addDays, format, isAfter, parseISO } from "date-fns";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";

// Farmer Date-wise report: one VLC, one bill cycle, one block per farmer.
// Each block lists every date of the cycle with that day's Morning and Evening
// collection side by side, then what the farmer took and repaid in the cycle.
// The screen and the Excel file are both built from these blocks.
//
// Amounts are litres × rate, the way bills compute milk_total, so the Milk
// Amount here agrees with the farmer's bill for the same cycle.

export interface ShiftFigures {
  qty: number;
  fat: number; // litre-weighted
  snf: number; // litre-weighted
  rate: number; // amount ÷ litres
  amount: number;
}

export interface DatewiseDay {
  date: string; // yyyy-MM-dd
  morning: ShiftFigures | null;
  evening: ShiftFigures | null;
  all: ShiftFigures | null;
}

export interface FarmerPayments {
  advance: number;
  cattleFeed: number;
  other1: number;
  other2: number;
  totalDeduction: number;
  // Repaid in the cycle, cattle feed included (it is stored apart from the rest).
  received: number;
  // Milk Amount − Total Deduction + Received: the bill summary's net for the dates.
  net: number;
  // The saved bill whose period starts in the cycle; null when none was generated.
  bill: { netPayable: number; finalized: boolean } | null;
}

export interface FarmerDatewise {
  farmerId: string; // as stored, e.g. "0012"
  name: string;
  milkTypes: string[];
  days: DatewiseDay[];
  total: { morning: ShiftFigures | null; evening: ShiftFigures | null; all: ShiftFigures | null };
  payments: FarmerPayments;
}

// A row of /webreports/collections (only the fields used here).
export interface CollectionRow {
  farmer_id?: string | number | null;
  farmer_code?: string | null;
  farmer_name?: string | null;
  type?: string | null;
  shift?: string | null;
  quantity?: unknown;
  fat?: unknown;
  snf?: unknown;
  rate?: unknown;
  created_at?: string | null;
}

// One farmer on one date in /payments/getdairybillsummary (only the fields used here).
export interface BillSummaryFarmer {
  farmer_id?: string | number | null;
  farmer_name?: string | null;
  deductions?: { advance?: unknown; cattle_feed?: unknown; other1?: unknown; other2?: unknown } | null;
  total_received?: unknown;
  received?: { cattle_feed?: unknown } | null;
  from_bills?: { net_payable?: unknown; is_finalized?: number | null; status?: string | null } | null;
}

export interface BillSummaryDate {
  date?: string;
  farmers?: BillSummaryFarmer[];
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? 0 : n;
};

interface Entry {
  qty: number;
  fat: number;
  snf: number;
  amount: number;
}

const aggregate = (entries: Entry[]): ShiftFigures | null => {
  if (entries.length === 0) return null;
  let qty = 0, fatW = 0, snfW = 0, amount = 0;
  entries.forEach((e) => {
    qty += e.qty;
    fatW += e.fat * e.qty;
    snfW += e.snf * e.qty;
    amount += e.amount;
  });
  const per = (w: number) => (qty > 0 ? w / qty : 0);
  return { qty, fat: per(fatW), snf: per(snfW), rate: per(amount), amount };
};

// Morning / Evening from the shift column; anything else (e.g. "Both") by the
// time it was poured, before noon being Morning — as the P/L statement does.
const shiftOf = (row: CollectionRow): "morning" | "evening" => {
  const s = String(row.shift ?? "").toLowerCase();
  if (s === "morning" || s === "evening") return s;
  const at = row.created_at ? new Date(row.created_at) : null;
  return at && !isNaN(at.getTime()) && at.getHours() >= 12 ? "evening" : "morning";
};

// The day as every other collection report shows it (browser-local date of created_at).
const dayOf = (row: CollectionRow) => (row.created_at ? format(new Date(row.created_at), "yyyy-MM-dd") : "");

const datesBetween = (from: string, to: string) => {
  const dates: string[] = [];
  const end = parseISO(to);
  for (let d = parseISO(from); !isAfter(d, end); d = addDays(d, 1)) dates.push(format(d, "yyyy-MM-dd"));
  return dates;
};

const emptyPayments = (): FarmerPayments => ({
  advance: 0, cattleFeed: 0, other1: 0, other2: 0, totalDeduction: 0, received: 0, net: 0, bill: null,
});

const compareIds = (a: string, b: string) => {
  const na = Number(a), nb = Number(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b);
};

/**
 * @param collections rows from /webreports/collections for the VLC and cycle
 * @param billSummary the `data` array of /payments/getdairybillsummary for the same
 * @param onlyFarmer  a farmer id to keep (any form: "12" or "0012"); empty keeps all
 */
export const buildFarmerDatewise = (
  collections: CollectionRow[],
  billSummary: BillSummaryDate[],
  from: string,
  to: string,
  onlyFarmer = ""
): FarmerDatewise[] => {
  const wanted = onlyFarmer.trim() ? normalizeFarmerId(onlyFarmer) : "";

  interface Acc {
    farmerId: string;
    name: string;
    types: Set<string>;
    byDay: Map<string, { morning: Entry[]; evening: Entry[] }>;
    payments: FarmerPayments;
    bills: { netPayable: number; finalized: boolean }[];
  }
  const farmers = new Map<string, Acc>();
  const farmerOf = (rawId: unknown) => {
    const id = normalizeFarmerId(String(rawId ?? ""));
    if (!id || (wanted && id !== wanted)) return null;
    if (!farmers.has(id)) {
      farmers.set(id, { farmerId: id, name: "", types: new Set(), byDay: new Map(), payments: emptyPayments(), bills: [] });
    }
    return farmers.get(id)!;
  };

  collections.forEach((row) => {
    const f = farmerOf(row.farmer_id ?? row.farmer_code);
    if (!f) return;
    if (!f.name && row.farmer_name) f.name = String(row.farmer_name);
    if (row.type) f.types.add(String(row.type));
    const day = dayOf(row);
    if (!f.byDay.has(day)) f.byDay.set(day, { morning: [], evening: [] });
    const qty = num(row.quantity);
    f.byDay.get(day)![shiftOf(row)].push({
      qty,
      fat: num(row.fat),
      snf: num(row.snf),
      amount: qty * num(row.rate),
    });
  });

  (billSummary || []).forEach((dateEntry) => {
    (dateEntry?.farmers || []).forEach((p) => {
      const f = farmerOf(p.farmer_id);
      if (!f) return;
      if (!f.name && p.farmer_name && p.farmer_name !== "-") f.name = String(p.farmer_name);
      const d = p.deductions || {};
      f.payments.advance += num(d.advance);
      f.payments.cattleFeed += num(d.cattle_feed);
      f.payments.other1 += num(d.other1);
      f.payments.other2 += num(d.other2);
      // total_received leaves cattle feed repayments out (they live in another table).
      f.payments.received += num(p.total_received) + num(p.received?.cattle_feed);
      // Every entry carries a placeholder bill; a real one has a status other than pending.
      const b = p.from_bills;
      if (b && (b.is_finalized === 1 || (b.status && String(b.status).toLowerCase() !== "pending"))) {
        f.bills.push({ netPayable: num(b.net_payable), finalized: b.is_finalized === 1 });
      }
    });
  });

  const cycleDates = datesBetween(from, to);

  return Array.from(farmers.values())
    .sort((a, b) => compareIds(a.farmerId, b.farmerId))
    .map((f) => {
      // Every date of the cycle, plus any date a row landed on outside it, so nothing is dropped.
      const dates = Array.from(new Set([...cycleDates, ...Array.from(f.byDay.keys()).filter(Boolean)])).sort();
      const days: DatewiseDay[] = dates.map((date) => {
        const d = f.byDay.get(date);
        return {
          date,
          morning: aggregate(d?.morning ?? []),
          evening: aggregate(d?.evening ?? []),
          all: aggregate([...(d?.morning ?? []), ...(d?.evening ?? [])]),
        };
      });
      const allMorning = Array.from(f.byDay.values()).flatMap((d) => d.morning);
      const allEvening = Array.from(f.byDay.values()).flatMap((d) => d.evening);
      const total = {
        morning: aggregate(allMorning),
        evening: aggregate(allEvening),
        all: aggregate([...allMorning, ...allEvening]),
      };

      const p = f.payments;
      p.totalDeduction = p.advance + p.cattleFeed + p.other1 + p.other2;
      p.net = (total.all?.amount ?? 0) - p.totalDeduction + p.received;
      p.bill = f.bills.length
        ? { netPayable: f.bills.reduce((s, b) => s + b.netPayable, 0), finalized: f.bills.every((b) => b.finalized) }
        : null;

      return {
        farmerId: f.farmerId,
        name: f.name,
        milkTypes: Array.from(f.types),
        days,
        total,
        payments: p,
      };
    });
};

/** dd-MM-yyyy from yyyy-MM-dd. */
export const displayDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-");
  return y && m && d ? `${d}-${m}-${y}` : ymd;
};
