// Totals of the Farmer Collection report's detailed rows, shared by the
// on-screen cards and the Excel total row so both always agree:
// litres, kg (litres × 1.03, as the rows) and amount summed; FAT / SNF / CLR
// weighted by litres; rate = total amount ÷ total litres.

export interface CollectionTotals {
  entries: number;
  farmers: number;
  liters: number;
  kg: number;
  fat: number;
  snf: number;
  clr: number;
  rate: number;
  amount: number;
}

const num = (v: unknown) => parseFloat(String(v ?? "")) || 0;

export const collectionTotals = (rows: any[]): CollectionTotals => {
  const liters = rows.reduce((s, r) => s + num(r.quantity), 0);
  const amount = rows.reduce((s, r) => s + num(r.amount), 0);
  const weighted = (key: string) =>
    liters > 0 ? rows.reduce((s, r) => s + num(r[key]) * num(r.quantity), 0) / liters : 0;
  return {
    entries: rows.length,
    farmers: new Set(rows.map((r) => `${r.vlc_id ?? r.dairy_id}_${r.farmer_code}`)).size,
    liters,
    kg: liters * 1.03,
    fat: weighted("fat"),
    snf: weighted("snf"),
    clr: weighted("clr"),
    rate: liters > 0 ? amount / liters : 0,
    amount,
  };
};
