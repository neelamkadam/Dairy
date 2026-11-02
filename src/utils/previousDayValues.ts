/**
 * The "use previous day" tick on Farmer Collection Entry: FAT, SNF and CLR come
 * from the farmer's entry for the same shift on the day before, instead of the
 * analyser. Quantity is never copied, and the rate is priced afresh.
 */

export interface PreviousDayRow {
  shift?: string;
  type?: string;
  milkType?: string;
  fat?: string | number | null;
  snf?: string | number | null;
  clr?: string | number | null;
}

export interface PreviousDayReadings {
  fat: string;
  snf: string;
  /** Empty when the entry has none: the page works it out from FAT and SNF. */
  clr: string;
}

const positive = (value: string | number | null | undefined): number | null => {
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// The columns are DECIMAL(5,2), so 3.5 comes back as "3.50". Show it as 3.5, but
// keep a stored 3.45 as it is: it is a copy, not a new reading.
const formatReading = (value: number): string => {
  const twoPlaces = value.toFixed(2);
  return twoPlaces.endsWith("0") ? value.toFixed(1) : twoPlaces;
};

/**
 * The readings for one shift and milk type, or null when there is nothing usable
 * to copy. `rows` is one farmer's day, oldest first as the server sends it; a
 * farmer can have more than one row, and the latest is the one that stands. FAT
 * and SNF are required: the page prices on them and a save needs both.
 */
export function findPreviousDayReadings(
  rows: PreviousDayRow[],
  shift: string,
  milkType: string
): PreviousDayReadings | null {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row.shift !== shift || (row.type || row.milkType) !== milkType) continue;

    const fat = positive(row.fat);
    const snf = positive(row.snf);
    if (fat === null || snf === null) continue;

    const clr = positive(row.clr);
    return {
      fat: formatReading(fat),
      snf: formatReading(snf),
      clr: clr === null ? "" : formatReading(clr),
    };
  }
  return null;
}
