import { format } from "date-fns";
import { vlcCommissionApi } from "@/services/vlcCommissionApi";

// Farmer-wise collection summary grouped by VLC (VSP), as used by the
// Farmer Collection / Farmer Commission reports and their Excel / PDF exports.

export interface CommissionRecord {
  id?: number;
  farmer_id?: string;
  type: string; // 'Commission' (per liter) | 'Fixed'
  amount: string | number;
  effective_from: string;
  milk_type?: string | null;
}

export interface SummaryTotals {
  cow: number;
  buffalo: number;
  liters: number;
  fat: number;
  snf: number;
  rate: number;
  amount: number;
  commission: number;
  payAmount: number;
  degree: number;
  kg: number;
  kgFat: number;
  kgSnf: number;
}

export interface SummaryFarmerRow extends SummaryTotals {
  farmerCode: string;
  farmerName: string;
  commType: string; // "Per Liter" | "Fixed" | "Per Liter / Fixed" | ""
  commRate: string; // "1.50" or "1.50, 2.00" when it changed within the period
}

export interface SummaryGroup {
  label: string; // "500381 - Barbadi - Pune" (VLC id - VLC name - branch name)
  farmers: SummaryFarmerRow[];
  total: SummaryTotals;
}

export interface CollectionSummary {
  groups: SummaryGroup[];
  total: SummaryTotals;
}

interface Acc {
  cow: number;
  buffalo: number;
  liters: number;
  amount: number;
  commission: number;
  fatQty: number;
  snfQty: number;
  clrQty: number;
  kg: number;
  kgFat: number;
  kgSnf: number;
}

const emptyAcc = (): Acc => ({
  cow: 0, buffalo: 0, liters: 0, amount: 0, commission: 0,
  fatQty: 0, snfQty: 0, clrQty: 0, kg: 0, kgFat: 0, kgSnf: 0,
});

const addAcc = (into: Acc, from: Acc) => {
  (Object.keys(into) as (keyof Acc)[]).forEach((k) => { into[k] += from[k]; });
};

const toTotals = (a: Acc): SummaryTotals => ({
  cow: a.cow,
  buffalo: a.buffalo,
  liters: a.liters,
  fat: a.liters > 0 ? a.fatQty / a.liters : 0,
  snf: a.liters > 0 ? a.snfQty / a.liters : 0,
  rate: a.liters > 0 ? a.amount / a.liters : 0,
  amount: a.amount,
  commission: a.commission,
  payAmount: a.amount + a.commission,
  degree: a.liters > 0 ? a.clrQty / a.liters : 0,
  kg: a.kg,
  kgFat: a.kgFat,
  kgSnf: a.kgSnf,
});

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

// Farmer codes come zero-padded from some APIs ("0012") and bare from others ("12").
export const normalizeFarmerCode = (code: unknown) => {
  const s = String(code ?? "").trim();
  return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s;
};

/**
 * Farmer commissions for one VLC, keyed by normalized farmer code.
 * They are saved against the VLC login id; older ones may be keyed by
 * branch_id, so both are read and de-duplicated.
 */
export const fetchFarmerCommissions = async (branchId: string, vlcUsername?: string) => {
  const keys = [...new Set([vlcUsername ? String(vlcUsername) : "", branchId].filter(Boolean))];
  const results = await Promise.allSettled(keys.map((k) => vlcCommissionApi.getByVlcc(k)));
  const seen = new Set<string>();
  const byFarmer = new Map<string, CommissionRecord[]>();
  results.forEach((res) => {
    if (res.status !== "fulfilled") return;
    (res.value.data?.data ?? []).forEach((r: CommissionRecord) => {
      if (!r.farmer_id) return;
      const id = String(r.id ?? `${r.farmer_id}_${r.milk_type}_${r.effective_from}_${r.amount}`);
      if (seen.has(id)) return;
      seen.add(id);
      const code = normalizeFarmerCode(r.farmer_id);
      if (!byFarmer.has(code)) byFarmer.set(code, []);
      byFarmer.get(code)!.push(r);
    });
  });
  return byFarmer;
};

/**
 * Picks the farmer commission effective on `date` for the given milk type:
 * a milk-type-specific record wins over a generic one, and among those the
 * latest effective_from that is not after the entry date.
 */
const findCommission = (records: CommissionRecord[] | undefined, milkType: string, date: string) => {
  if (!records?.length) return null;
  const effective = records.filter((r) => String(r.effective_from || "").slice(0, 10) <= date);
  const latest = (list: CommissionRecord[]) =>
    list.reduce<CommissionRecord | null>(
      (best, r) => (!best || String(r.effective_from) > String(best.effective_from) ? r : best),
      null
    );
  return latest(effective.filter((r) => r.milk_type === milkType)) ?? latest(effective.filter((r) => !r.milk_type));
};

/**
 * @param rows          raw collection entries (each stamped with its `branch_id`)
 * @param vlcOrder      VLCs in display order: dairy_id + display name
 * @param commissions   dairy_id → normalized farmer code → commission records
 */
export const buildFarmerCollectionSummary = (
  rows: any[],
  vlcOrder: Array<{ dairyId: string; name: string }>,
  commissions: Map<string, Map<string, CommissionRecord[]>>
): CollectionSummary => {
  const byVlc = new Map<string, any[]>();
  rows.forEach((r) => {
    const key = String(r.branch_id ?? r.dairy_id ?? "");
    if (!byVlc.has(key)) byVlc.set(key, []);
    byVlc.get(key)!.push(r);
  });

  const grand = emptyAcc();
  const groups: SummaryGroup[] = [];

  vlcOrder.forEach(({ dairyId, name }) => {
    const vlcRows = byVlc.get(dairyId);
    if (!vlcRows?.length) return;
    const vlcCommissions = commissions.get(dairyId);

    const farmers = new Map<string, {
      name: string;
      acc: Acc;
      fixedApplied: Set<string>;
      types: Set<string>;
      rates: Set<number>;
    }>();
    vlcRows.forEach((r) => {
      const code = normalizeFarmerCode(r.farmer_code);
      if (!farmers.has(code)) {
        farmers.set(code, { name: r.farmer_name || "", acc: emptyAcc(), fixedApplied: new Set(), types: new Set(), rates: new Set() });
      }
      const f = farmers.get(code)!;

      const q = num(r.quantity);
      const fat = num(r.fat);
      const snf = num(r.snf);
      const clr = num(r.clr);
      const kg = q * (1 + clr / 1000);

      if (r.type === "Buffalo") f.acc.buffalo += q;
      else f.acc.cow += q;
      f.acc.liters += q;
      f.acc.amount += num(r.amount);
      f.acc.fatQty += fat * q;
      f.acc.snfQty += snf * q;
      f.acc.clrQty += clr * q;
      f.acc.kg += kg;
      f.acc.kgFat += (kg * fat) / 100;
      f.acc.kgSnf += (kg * snf) / 100;

      const date = r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd") : "";
      const comm = findCommission(vlcCommissions?.get(code), r.type, date);
      if (comm) {
        const perLiter = comm.type === "Commission";
        f.types.add(perLiter ? "Per Liter" : "Fixed");
        f.rates.add(num(comm.amount));
        if (perLiter) {
          f.acc.commission += q * num(comm.amount);
        } else {
          // Fixed commission is paid once per period, not per entry.
          const key = String(comm.id ?? `${comm.effective_from}_${comm.milk_type ?? ""}`);
          if (!f.fixedApplied.has(key)) {
            f.fixedApplied.add(key);
            f.acc.commission += num(comm.amount);
          }
        }
      }
    });

    const groupAcc = emptyAcc();
    const farmerRows = [...farmers.entries()]
      .sort(([a], [b]) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b))
      .map(([code, f]) => {
        addAcc(groupAcc, f.acc);
        return {
          farmerCode: code,
          farmerName: f.name,
          commType: [...f.types].sort((a, b) => b.localeCompare(a)).join(" / "),
          commRate: [...f.rates].sort((a, b) => a - b).map((r) => r.toFixed(2)).join(", "),
          ...toTotals(f.acc),
        };
      });
    addAcc(grand, groupAcc);

    groups.push({ label: name, farmers: farmerRows, total: toTotals(groupAcc) });
  });

  return { groups, total: toTotals(grand) };
};

export type SummaryColumnKey = keyof SummaryTotals | "spGravity" | "commType" | "commRate";

export interface SummaryColumn {
  key: SummaryColumnKey;
  label: string;
  digits: number;
  text?: boolean; // per-farmer text value, blank on subtotal / total rows
}

// Column layout shared by the UI table and both exports.
export const SUMMARY_COLUMNS: SummaryColumn[] = [
  { key: "cow", label: "Cow", digits: 2 },
  { key: "buffalo", label: "Buffalo", digits: 2 },
  { key: "liters", label: "Total Liter", digits: 2 },
  { key: "fat", label: "FAT", digits: 1 },
  { key: "snf", label: "SNF", digits: 1 },
  { key: "rate", label: "Rate", digits: 2 },
  { key: "amount", label: "Amount", digits: 2 },
  { key: "payAmount", label: "Pay Amount", digits: 2 },
  { key: "degree", label: "Degree", digits: 1 },
  { key: "spGravity", label: "Sp Gravity", digits: 0, text: true }, // intentionally left empty
  { key: "kg", label: "Quantity In KG", digits: 2 },
  { key: "kgFat", label: "KG FAT", digits: 1 },
  { key: "kgSnf", label: "KG SNF", digits: 1 },
];

// Farmer Commission report: same layout with the commission split out before Pay Amount.
export const COMMISSION_SUMMARY_COLUMNS: SummaryColumn[] = SUMMARY_COLUMNS.flatMap((c) =>
  c.key === "payAmount"
    ? [
        { key: "commType", label: "Comm. Type", digits: 0, text: true },
        { key: "commRate", label: "Comm. Rate", digits: 0, text: true },
        { key: "commission", label: "Commission Amount", digits: 2 },
        c,
      ]
    : [c]
);

export const formatSummaryValue = (row: SummaryTotals | SummaryFarmerRow, col: SummaryColumn) => {
  if (col.text) return String((row as unknown as Record<string, unknown>)[col.key] ?? "");
  return (row[col.key as keyof SummaryTotals] as number).toLocaleString("en-IN", {
    minimumFractionDigits: col.digits,
    maximumFractionDigits: col.digits,
  });
};
