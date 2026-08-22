import type { CattleFeedDateValue, CattleFeedPurchaseEntry } from "@/services/cattleFeedApi";

/**
 * The `date` column on a cattlefeed_stock row is a purchase log, not a single
 * timestamp. Every restock appends an entry so reports can show what was bought
 * on which day. Older rows still hold a bare date string (or a JSON array of
 * them), so everything here tolerates both shapes.
 */

type StockLike = {
  date?: CattleFeedDateValue[] | string | null;
  stock?: number | string;
  purchase_rate?: number | string;
};

const toNumber = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeDay = (value: string): string =>
  value.includes("T") ? value.split("T")[0] : value;

/** Unwraps the column into its raw entries without interpreting them. */
export const toRawEntries = (value: StockLike["date"]): CattleFeedDateValue[] => {
  if (Array.isArray(value)) return value as CattleFeedDateValue[];

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed as CattleFeedDateValue[];
      } catch {
        // Not JSON after all - fall through and treat it as a bare date.
      }
    }
    return [trimmed];
  }

  return [];
};

/**
 * Reads the purchase log as structured entries, sorted oldest first.
 *
 * A legacy bare-date entry carries no quantity of its own. When it is the only
 * entry we attribute the row's whole balance to it (matching how the VLC
 * purchases report reads the same data); when there are several we leave the
 * quantity at 0 rather than counting the same balance repeatedly.
 */
export const parsePurchaseEntries = (stock: StockLike): CattleFeedPurchaseEntry[] => {
  const raw = toRawEntries(stock.date);
  const fallbackRate = toNumber(stock.purchase_rate);
  const soleEntry = raw.length === 1;

  return raw
    .map((item) => {
      if (typeof item === "string") {
        const day = normalizeDay(item.trim());
        if (!day) return null;
        return {
          purchase_date: day,
          qty: soleEntry ? toNumber(stock.stock) : 0,
          purchase_rate: fallbackRate,
        };
      }

      if (item && typeof item === "object") {
        const source = item as Partial<CattleFeedPurchaseEntry> & { date?: string };
        const day = normalizeDay(String(source.purchase_date || source.date || "").trim());
        if (!day) return null;
        return {
          purchase_date: day,
          qty: toNumber(source.qty),
          purchase_rate: source.purchase_rate === undefined
            ? fallbackRate
            : toNumber(source.purchase_rate),
        };
      }

      return null;
    })
    .filter((entry): entry is CattleFeedPurchaseEntry => entry !== null)
    .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));
};

/**
 * Appends a purchase to the log, leaving existing entries untouched so historic
 * rows are never rewritten with guessed quantities.
 */
export const appendPurchaseEntry = (
  stock: StockLike,
  entry: CattleFeedPurchaseEntry
): CattleFeedDateValue[] => [...toRawEntries(stock.date), entry];

/** Most recent purchase day, or null when the log is empty. */
export const latestPurchaseDate = (stock: StockLike): string | null => {
  const entries = parsePurchaseEntries(stock);
  return entries.length ? entries[entries.length - 1].purchase_date : null;
};

export const totalPurchasedQty = (entries: CattleFeedPurchaseEntry[]): number =>
  entries.reduce((sum, entry) => sum + entry.qty, 0);

export const totalPurchasedValue = (entries: CattleFeedPurchaseEntry[]): number =>
  entries.reduce((sum, entry) => sum + entry.qty * entry.purchase_rate, 0);
