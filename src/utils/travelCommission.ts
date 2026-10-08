// Travel commission for a farmer's bill — the one rule shared by Generate Bill,
// Farmer Deduction and the bill PDFs, so the amount put into a bill's net payable,
// the amount printed on it and its per-day breakdown always agree.
//
// Entries come from GET /web/billing/vlc-commission?vlcc= (newest effective_from
// first); only the newest entry for each farmer + milk type is used.
//   - When the farmer or the VLC has a Cow- or Buffalo-specific entry, each milk
//     type is paid on its own: farmer + type → VLC + type → farmer general →
//     VLC general.
//   - Otherwise one general entry (farmer → VLC) applies to all the farmer's milk.
// An entry counts only if it took effect before the bill's end date.
// 'Commission' pays rate × litres; any other type (Fixed) pays its amount once.

export interface CommissionEntry {
  farmer_id?: string | null;
  milk_type?: string | null;
  type: string;
  amount: string | number;
  effective_from?: string | null;
}

export type CommissionLookup = Map<string, CommissionEntry>;

export interface TravelCommission {
  total: number;
  /** rate × litres parts, per milk type */
  cow: number;
  buffalo: number;
  /** flat (Fixed) amounts, paid once per bill — not tied to any day */
  fixed: number;
  /** The entry each milk type is paid on, or null when none applies */
  cowEntry: CommissionEntry | null;
  buffaloEntry: CommissionEntry | null;
}

export const buildCommissionLookup = (records: CommissionEntry[]): CommissionLookup => {
  const lookup: CommissionLookup = new Map();
  records.forEach((r) => {
    const key = `${r.farmer_id || ""}_${r.milk_type || "null"}`;
    if (!lookup.has(key)) lookup.set(key, r);
  });
  return lookup;
};

const isPerLiter = (entry: CommissionEntry) => entry.type === "Commission";
const rateOf = (entry: CommissionEntry) => parseFloat(String(entry.amount || "0")) || 0;

const isActive = (entry: CommissionEntry, endDate: Date | null | undefined) => {
  const effectiveDate = entry.effective_from ? new Date(entry.effective_from) : null;
  return !(effectiveDate && endDate && endDate <= effectiveDate);
};

export const computeTravelCommission = (
  lookup: CommissionLookup,
  farmerId: string,
  quantity: { cow: number; buffalo: number; total?: number },
  endDate: Date | null | undefined
): TravelCommission => {
  const result: TravelCommission = { total: 0, cow: 0, buffalo: 0, fixed: 0, cowEntry: null, buffaloEntry: null };
  const usable = (entry: CommissionEntry | null, qty: number) =>
    entry && qty !== 0 && isActive(entry, endDate) ? entry : null;

  const typed = (milkType: string) =>
    lookup.get(`${farmerId}_${milkType}`) ?? lookup.get(`_${milkType}`) ?? null;
  const generic = lookup.get(`${farmerId}_null`) ?? lookup.get(`_null`) ?? null;
  const cowTyped = typed("Cow");
  const buffaloTyped = typed("Buffalo");

  if (cowTyped || buffaloTyped) {
    result.cowEntry = usable(cowTyped ?? generic, quantity.cow);
    result.buffaloEntry = usable(buffaloTyped ?? generic, quantity.buffalo);
    ([["cow", result.cowEntry, quantity.cow], ["buffalo", result.buffaloEntry, quantity.buffalo]] as const)
      .forEach(([side, entry, qty]) => {
        if (!entry) return;
        if (isPerLiter(entry)) result[side] += qty * rateOf(entry);
        else result.fixed += rateOf(entry);
      });
  } else {
    // One general entry on all of the farmer's milk
    const totalQty = quantity.total ?? quantity.cow + quantity.buffalo;
    const entry = usable(generic, totalQty);
    if (entry) {
      result.cowEntry = quantity.cow ? entry : null;
      result.buffaloEntry = quantity.buffalo ? entry : null;
      if (isPerLiter(entry)) {
        result.cow = quantity.cow * rateOf(entry);
        result.buffalo = quantity.buffalo * rateOf(entry);
        // Any litres not split by milk type still earn the rate
        const unsplit = totalQty - quantity.cow - quantity.buffalo;
        if (Math.abs(unsplit) > 1e-9) result.fixed += unsplit * rateOf(entry);
      } else {
        result.fixed = rateOf(entry);
      }
    }
  }

  result.total = result.cow + result.buffalo + result.fixed;
  return result;
};

/** The per-litre rate a milk type is paid at in this bill, or 0 (none, or a Fixed entry). */
export const perLiterRate = (commission: TravelCommission, milkType: "Cow" | "Buffalo") => {
  const entry = milkType === "Cow" ? commission.cowEntry : commission.buffaloEntry;
  return entry && isPerLiter(entry) ? rateOf(entry) : 0;
};
