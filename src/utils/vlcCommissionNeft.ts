import { reportsApi } from "@/services/reportsApi";
import { createDairyApi } from "@/services/createDairyApi";

// VLC commission NEFT, one row per VLC:
//   Commission Amount    latest VLC commission in effect by the end date:
//                        per-liter rate × the VLC's collected litres, or the fixed amount
//   Advance              always blank: filled in by hand on the exported sheet
//   Deduction From CDA   the VLC's Composite − Dispatch amount (composite amount
//                        minus dispatch amount) over the dates, when negative
//   Net Payable          Commission − Deduction, rounded to the nearest rupee;
//                        Payable Amount is the same

export interface VlcNeftRow {
  branchId: string;
  vlcId: string; // VLC login id (500xxx)
  vspName: string;
  accountNumber: string;
  accountHolder: string;
  ifscCode: string;
  commission: number;
  commissionNote: string; // "1.50 /L × 820.00 L" or "Fixed"
  advance: string; // always "" — entered by hand after export
  compositeDispatch: number; // net Composite − Dispatch amount over the dates
  deduction: number;
  netPayable: number;
  payableAmount: number;
  missingBank: boolean;
}

interface VlcInput {
  branchId: string;
  vlcId: string;
  vspName: string;
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Latest commission entry in effect by `end`, applied to the period's litres.
const commissionFor = (vlc: any, end: string) => {
  const litres = num(vlc?.total_quantity);
  const entries: any[] = Array.isArray(vlc?.commissions) ? vlc.commissions : [];
  const effective = entries
    .filter((c) => !c.effective_from || String(c.effective_from).slice(0, 10) <= end)
    .sort((a, b) => String(b.effective_from || "").localeCompare(String(a.effective_from || "")));
  const c = effective[0];
  if (!c) return { amount: 0, note: "" };
  if (c.type === "Commission") {
    return { amount: round2(litres * num(c.amount)), note: `${num(c.amount).toFixed(2)} /L × ${litres.toFixed(2)} L` };
  }
  return { amount: round2(num(c.amount)), note: c.type || "Fixed" };
};

/**
 * Net Composite − Dispatch amount for one VLC — composite (dairy) amount minus
 * dispatch (milk_collection) amount — from the Difference Report 2 API rows.
 * Computed here rather than taken from the API's milk_collection_dairy_diff,
 * which is Dispatch − Composite despite that report's "Composite − Dispatch" label.
 * The API returns a Cow, a Buffalo and a Both row per date and shift; the Both
 * row compares all collections with dispatches entered as "Both", so for each
 * date+shift it is used when dispatch was entered as Both, else Cow + Buffalo —
 * never all three, which would count the collections twice.
 */
const compositeMinusDispatch = (row: any) =>
  num(row?.dairy?.total_amount) - num(row?.milk_collection?.total_amount);

const compositeDispatchFor = (rows: any[]) => {
  const slots = new Map<string, any[]>();
  rows.forEach((r) => {
    const key = `${r.period}_${r.shift}`;
    if (!slots.has(key)) slots.set(key, []);
    slots.get(key)!.push(r);
  });
  let total = 0;
  slots.forEach((items) => {
    const both = items.find((i) => i.type === "Both");
    if (both && num(both.milk_collection?.total_weight) > 0) {
      total += compositeMinusDispatch(both);
    } else {
      items
        .filter((i) => i.type === "Cow" || i.type === "Buffalo")
        .forEach((i) => { total += compositeMinusDispatch(i); });
    }
  });
  return round2(total);
};

export const fetchVlcCommissionNeft = async (
  vlcs: VlcInput[],
  from: string,
  to: string,
  userId: number
): Promise<VlcNeftRow[]> => {
  const [commissionRes, dairyRes, differences] = await Promise.all([
    reportsApi.getVlcCommissionReport({ vlc_id: vlcs.map((v) => v.branchId).join(","), start_date: from, end_date: to }),
    createDairyApi.listUserDairies(userId).catch(() => ({ data: [] as any[] })),
    mapWithConcurrency(vlcs, 4, async (v) => {
      try {
        const res = await reportsApi.getVlcDifferenceReport({
          dairy_id: v.branchId,
          vlc_id: v.vlcId,
          from,
          to,
          shift: "All",
          type: "Both",
        } as any);
        return res?.success && Array.isArray(res.data) ? compositeDispatchFor(res.data) : 0;
      } catch {
        return 0;
      }
    }),
  ]);

  const commissionByVlc = new Map<string, any>(
    (commissionRes?.data || []).map((c: any) => [String(c.vlc_id), c])
  );
  const bankByDairy = new Map<string, any>(
    (dairyRes?.data || []).map((d: any) => [String(d.dairy_id), d])
  );

  return vlcs.map((v, i) => {
    const bank = bankByDairy.get(v.branchId);
    const accountNumber = String(bank?.account_number || "").trim();
    const ifscCode = String(bank?.ifsc_code || "").trim();
    const { amount: commission, note } = commissionFor(commissionByVlc.get(v.branchId), to);
    const compositeDispatch = differences[i];
    const deduction = compositeDispatch < 0 ? round2(-compositeDispatch) : 0;
    const netPayable = Math.round(round2(commission - deduction)) || 0;
    return {
      branchId: v.branchId,
      vlcId: v.vlcId,
      vspName: v.vspName,
      accountNumber,
      accountHolder: String(bank?.account_holder || bank?.ownername || "").trim(),
      ifscCode,
      commission,
      commissionNote: note,
      advance: "",
      compositeDispatch,
      deduction,
      netPayable,
      payableAmount: netPayable,
      missingBank: !accountNumber || !ifscCode,
    };
  });
};

// Column order of the NEFT format. wholeRupees: rounded, shown without paise.
export const VLC_NEFT_COLUMNS: Array<{ key: keyof VlcNeftRow; label: string; amount?: boolean; wholeRupees?: boolean }> = [
  { key: "accountNumber", label: "A/C Number" },
  { key: "accountHolder", label: "Account Holder" },
  { key: "payableAmount", label: "Payable Amount", amount: true, wholeRupees: true },
  { key: "ifscCode", label: "IFSCode" },
  { key: "vspName", label: "VSP Name" },
  { key: "commission", label: "Commission Amount", amount: true },
  { key: "advance", label: "Advance" }, // blank column, filled in by hand
  { key: "deduction", label: "Deduction From CDA", amount: true },
  { key: "netPayable", label: "Net Payable Amount", amount: true, wholeRupees: true },
];

export const vlcNeftTotals = (rows: VlcNeftRow[]) => {
  const totals: Partial<Record<keyof VlcNeftRow, number>> = {};
  VLC_NEFT_COLUMNS.filter((c) => c.amount).forEach((c) => {
    totals[c.key] = round2(rows.reduce((s, r) => s + (r[c.key] as number), 0));
  });
  return totals;
};

export const formatAmount = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Final amounts: nearest rupee, no paise ("|| 0" keeps -0 from printing as "-0")
export const formatRupees = (n: number) => (Math.round(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const formatColumnAmount = (column: { wholeRupees?: boolean }, n: number) =>
  column.wholeRupees ? formatRupees(n) : formatAmount(n);
