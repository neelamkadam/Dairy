import * as XLSX from "xlsx";
import { displayDate, type FarmerDatewise, type ShiftFigures } from "@/utils/farmerDatewiseReport";

// Farmer Date-wise report as one sheet: every loaded farmer stacked one after
// another, each with its date rows (Morning | Evening | Day Total), a total row
// and the cycle's payment summary — the same blocks the screen shows.

const SUB = ["Ltr", "FAT", "SNF", "Rate", "Amount"];
const COLS = 1 + SUB.length * 2 + 2; // Date, Morning ×5, Evening ×5, Day Total (Ltr, Amount)
const PAYMENT_HEAD = [
  "Milk Amount", "Advance", "Cattle Feed", "Other1", "Other2",
  "Total Deduction", "Received", "Net Amount", "Bill Net Payable",
];

const r2 = (n: number) => Math.round(n * 100) / 100;
const shiftCells = (s: ShiftFigures | null) =>
  s ? [r2(s.qty), r2(s.fat), r2(s.snf), r2(s.rate), r2(s.amount)] : ["-", "-", "-", "-", "-"];
const dayTotalCells = (s: ShiftFigures | null) => (s ? [r2(s.qty), r2(s.amount)] : ["-", "-"]);

export const generateFarmerDatewiseExcel = (
  farmers: FarmerDatewise[],
  meta: { dairyName: string; vlcLabel: string; from: string; to: string; farmerFilter?: string }
) => {
  const aoa: (string | number)[][] = [];
  const merges: XLSX.Range[] = [];
  const numberRows: number[] = []; // rows whose numbers get two decimals
  const merge = (r: number, c1: number, c2: number) => merges.push({ s: { r, c: c1 }, e: { r, c: c2 } });

  aoa.push(["Farmer Date-wise Report"]);
  merge(0, 0, COLS - 1);
  aoa.push([meta.dairyName]);
  merge(1, 0, COLS - 1);
  aoa.push([`VLC: ${meta.vlcLabel}`, "", "", "", "", "", `Bill Cycle: ${displayDate(meta.from)} to ${displayDate(meta.to)}`]);
  merge(2, 0, 5);
  merge(2, 6, COLS - 1);
  aoa.push([]);

  farmers.forEach((f) => {
    let r = aoa.length;
    const types = f.milkTypes.length ? `  (${f.milkTypes.join(", ")})` : "";
    aoa.push([`Farmer: ${f.farmerId}${f.name ? ` - ${f.name}` : ""}${types}`]);
    merge(r, 0, COLS - 1);

    r = aoa.length;
    aoa.push(["", "Morning", "", "", "", "", "Evening", "", "", "", "", "Day Total", ""]);
    merge(r, 1, 5);
    merge(r, 6, 10);
    merge(r, 11, 12);
    aoa.push(["Date", ...SUB, ...SUB, "Ltr", "Amount"]);

    f.days.forEach((d) => {
      numberRows.push(aoa.length);
      aoa.push([displayDate(d.date), ...shiftCells(d.morning), ...shiftCells(d.evening), ...dayTotalCells(d.all)]);
    });
    numberRows.push(aoa.length);
    aoa.push(["Total", ...shiftCells(f.total.morning), ...shiftCells(f.total.evening), ...dayTotalCells(f.total.all)]);

    aoa.push([]);
    aoa.push(PAYMENT_HEAD);
    const p = f.payments;
    numberRows.push(aoa.length);
    aoa.push([
      r2(f.total.all?.amount ?? 0), r2(p.advance), r2(p.cattleFeed), r2(p.other1), r2(p.other2),
      r2(p.totalDeduction), r2(p.received), r2(p.net),
      p.bill ? r2(p.bill.netPayable) : "Not generated",
    ]);
    aoa.push([]);
    aoa.push([]);
  });

  aoa.push(["Net Amount = Milk Amount - Total Deduction + Received, for what was taken and repaid in these dates. Bill Net Payable is the saved bill for this cycle (after bonus, commission and carried-forward dues)."]);
  merge(aoa.length - 1, 0, COLS - 1);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  numberRows.forEach((r) => {
    for (let c = 0; c < COLS; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === "n") cell.z = "#,##0.00";
    }
  });
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 13 },
    ...Array(SUB.length * 2).fill(0).map((_, i) => ({ wch: i % SUB.length === 4 ? 13 : 9 })),
    { wch: 10 }, { wch: 13 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Farmer Date-wise");
  const who = meta.farmerFilter ? `Farmer_${meta.farmerFilter}` : "All_Farmers";
  const safe = (s: string) => s.replace(/[\\/:*?"<>|\s]+/g, "_");
  XLSX.writeFile(wb, `Farmer_Datewise_${safe(meta.vlcLabel.split(" - ")[0] || "VLC")}_${who}_${meta.from}_to_${meta.to}.xlsx`);
};
