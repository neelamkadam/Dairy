import pdfMake from "pdfmake/build/pdfmake";
import * as XLSX from "xlsx";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import type { TankerSaleRow, TankerVoucherRow } from "@/services/tankerApi";

// Tanker Day-wise report: every purchase and every sale dated in the range, each
// by its own date, grouped day by day with a total per day and a grand total.
// The UI table, the PDF and the Excel file are all built from the same rows.

export interface TradeGroup {
  qty: number;
  fat: number;     // litre-weighted
  snf: number;     // litre-weighted
  rate: number;    // litre-weighted rate per liter (commission excluded)
  amount: number;  // total amount (commission included)
}

const num = (value: any) => {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
};

export const formatReportDate = (value?: string) => {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}-${m}-${y}` : value;
};

const aggregateTankerVouchers = (vouchers: TankerVoucherRow[]): TradeGroup | null => {
  if (vouchers.length === 0) return null;
  let qty = 0, fatW = 0, snfW = 0, rateW = 0, amount = 0;
  vouchers.forEach((v) => {
    const q = num(v.liter);
    qty += q;
    fatW += num(v.avg_fat) * q;
    snfW += num(v.avg_snf) * q;
    rateW += num(v.rate_per_liter) * q;
    amount += num(v.total_amount);
  });
  const avg = (w: number) => (qty > 0 ? w / qty : 0);
  return { qty, fat: avg(fatW), snf: avg(snfW), rate: avg(rateW), amount };
};

export interface DaywiseRow {
  kind: "purchase" | "sale" | "day_total" | "grand_total";
  date?: string;
  voucher?: string;
  fromPurchase?: string;   // sale rows: the tanker it was sold out of
  party?: string;
  vehicle?: string;
  driver?: string;
  milkType?: string;
  purchase: TradeGroup | null;
  sale: TradeGroup | null;
  purchaseCount?: number;
  saleCount?: number;
}

export const buildTankerDaywiseRows = (purchases: TankerVoucherRow[], sales: TankerSaleRow[]): DaywiseRow[] => {
  const days = new Map<string, { purchases: TankerVoucherRow[]; sales: TankerSaleRow[] }>();
  const dayOf = (date: string) => {
    if (!days.has(date)) days.set(date, { purchases: [], sales: [] });
    return days.get(date)!;
  };
  purchases.forEach((p) => dayOf(p.date).purchases.push(p));
  sales.forEach((s) => dayOf(s.date).sales.push(s));

  const rows: DaywiseRow[] = [];
  // yyyy-MM-dd sorts chronologically as a string
  Array.from(days.keys()).sort().forEach((date) => {
    const day = days.get(date)!;
    day.purchases.forEach((p) => rows.push({
      kind: "purchase",
      date,
      voucher: `P-${p.id}`,
      party: p.party_name,
      vehicle: p.vehicle_number || "-",
      driver: p.driver_name || "-",
      milkType: p.milk_type,
      purchase: aggregateTankerVouchers([p]),
      sale: null,
    }));
    day.sales.forEach((s) => rows.push({
      kind: "sale",
      date,
      voucher: `S-${s.id}`,
      fromPurchase: `P-${s.purchase_id}`,
      party: s.party_name,
      vehicle: s.vehicle_number || "-",
      driver: s.driver_name || "-",
      milkType: s.milk_type,
      purchase: null,
      sale: aggregateTankerVouchers([s]),
    }));
    rows.push({
      kind: "day_total",
      date,
      purchase: aggregateTankerVouchers(day.purchases),
      sale: aggregateTankerVouchers(day.sales),
      purchaseCount: day.purchases.length,
      saleCount: day.sales.length,
    });
  });

  if (days.size > 0) {
    rows.push({
      kind: "grand_total",
      purchase: aggregateTankerVouchers(purchases),
      sale: aggregateTankerVouchers(sales),
      purchaseCount: purchases.length,
      saleCount: sales.length,
    });
  }
  return rows;
};

const countLabel = (row: DaywiseRow) =>
  `${row.purchaseCount ?? 0} purchase${row.purchaseCount === 1 ? "" : "s"}, ${row.saleCount ?? 0} sale${row.saleCount === 1 ? "" : "s"}`;

const groupValues = (g: TradeGroup | null) => (g ? [g.qty, g.fat, g.snf, g.rate, g.amount] : null);

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const PURCHASE_FILL = "#eff6ff";
const SALE_FILL = "#f0fdf4";
const DAY_FILL = "#f3f4f6";
const TOTAL_FILL = "#fef3c7";

export const generateTankerDaywiseReportPDF = (
  rows: DaywiseRow[],
  meta: { businessName: string; from: string; to: string }
) => {
  const head = (text: string, extra: Record<string, any> = {}) => ({ text, bold: true, alignment: "center", ...extra });
  const numCells = (g: TradeGroup | null, fill: string, bold = false) => {
    const values = groupValues(g);
    return [0, 1, 2, 3, 4].map((i) => ({
      text: values ? values[i].toFixed(2) : "-",
      alignment: "right",
      fillColor: fill,
      bold,
    }));
  };

  const header = [
    [
      head("Date", { rowSpan: 2 }),
      head("Type", { rowSpan: 2 }),
      head("Voucher", { rowSpan: 2 }),
      head("Supplier / Buyer", { rowSpan: 2 }),
      head("Vehicle / Driver", { rowSpan: 2 }),
      head("Milk", { rowSpan: 2 }),
      head("PURCHASE", { colSpan: 5, fillColor: PURCHASE_FILL }), {}, {}, {}, {},
      head("SALE", { colSpan: 5, fillColor: SALE_FILL }), {}, {}, {}, {},
    ],
    [
      {}, {}, {}, {}, {}, {},
      ...["Qty", "Fat", "SNF", "Rate", "Amount"].map((l) => head(l, { fillColor: PURCHASE_FILL })),
      ...["Qty", "Fat", "SNF", "Rate", "Amount"].map((l) => head(l, { fillColor: SALE_FILL })),
    ],
  ];

  const body = rows.map((row) => {
    if (row.kind === "day_total" || row.kind === "grand_total") {
      const grand = row.kind === "grand_total";
      const fill = grand ? TOTAL_FILL : DAY_FILL;
      const label = grand
        ? `GRAND TOTAL (${countLabel(row)})`
        : `Day Total ${formatReportDate(row.date)} (${countLabel(row)})`;
      return [
        { text: label, bold: true, colSpan: 6, fillColor: fill }, {}, {}, {}, {}, {},
        ...numCells(row.purchase, fill, true),
        ...numCells(row.sale, fill, true),
      ];
    }
    const isSale = row.kind === "sale";
    return [
      { text: formatReportDate(row.date) },
      { text: isSale ? "Sale" : "Purchase", color: isSale ? "#15803d" : "#1d4ed8", bold: true },
      { text: [{ text: row.voucher || "-" }, ...(row.fromPurchase ? [{ text: `\nfrom ${row.fromPurchase}`, color: "#6b7280" }] : [])] },
      { text: row.party || "-" },
      { text: [{ text: row.vehicle || "-" }, { text: `\n${row.driver || "-"}`, color: "#6b7280" }] },
      { text: row.milkType || "-" },
      ...numCells(row.purchase, PURCHASE_FILL),
      ...numCells(row.sale, SALE_FILL),
    ];
  });

  const docDefinition: any = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [20, 20, 20, 24],
    content: [
      { text: "Tanker Day-wise Purchase & Sale Report", fontSize: 14, bold: true, alignment: "center" },
      { text: meta.businessName, fontSize: 10, alignment: "center", color: "#374151", margin: [0, 2, 0, 0] },
      {
        columns: [
          { text: `Period: ${formatReportDate(meta.from)} to ${formatReportDate(meta.to)}`, bold: true },
          { text: `Generated On: ${formatReportDate(new Date().toISOString().slice(0, 10))}`, alignment: "right" },
        ],
        fontSize: 8,
        margin: [0, 8, 0, 6],
      },
      {
        table: {
          headerRows: 2,
          dontBreakRows: true,
          // pdfmake adds cell padding on top of these, so 16 columns must leave room for it
          // Qty, Fat, SNF, Rate, Amount per side; Amount is wide enough for crores
          widths: [40, 34, 42, "*", 60, 26, 38, 26, 26, 30, 48, 38, 26, 26, 30, 48],
          body: [...header, ...body],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#9ca3af",
          vLineColor: () => "#9ca3af",
          paddingLeft: () => 2,
          paddingRight: () => 2,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      },
      {
        text: "Each voucher is listed on its own date. Rate excludes commission; Amount includes it.",
        fontSize: 7,
        color: "#6b7280",
        margin: [0, 6, 0, 0],
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} of ${pageCount}`,
      alignment: "right",
      fontSize: 7,
      color: "#6b7280",
      margin: [0, 4, 20, 0],
    }),
    defaultStyle: { fontSize: 7, color: "#1f2937", font: PDF_FONT },
  };

  pdfMake.createPdf(docDefinition).download(`Tanker_Daywise_Report_${meta.from}_to_${meta.to}.pdf`);
};

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

export const generateTankerDaywiseReportExcel = (
  rows: DaywiseRow[],
  meta: { businessName: string; from: string; to: string }
) => {
  const SUB = ["Qty", "Fat", "SNF", "Rate", "Amount"];
  const LEAD = ["Date", "Type", "Voucher", "From Purchase", "Supplier / Buyer", "Vehicle", "Driver", "Milk"];
  const FIRST_NUM_COL = LEAD.length;
  const HEADER_ROWS = 5; // title, business, period, group header, sub header
  const blanks = (n: number) => Array(n).fill("");
  const nums = (g: TradeGroup | null) =>
    groupValues(g)?.map((v) => Number(v.toFixed(2))) ?? blanks(SUB.length);

  const aoa: (string | number)[][] = [
    ["Tanker Day-wise Purchase & Sale Report"],
    [meta.businessName],
    ["Period", `${formatReportDate(meta.from)} to ${formatReportDate(meta.to)}`],
    [...blanks(LEAD.length), "Purchase", ...blanks(SUB.length - 1), "Sale", ...blanks(SUB.length - 1)],
    [...LEAD, ...SUB, ...SUB],
  ];

  rows.forEach((row) => {
    if (row.kind === "day_total" || row.kind === "grand_total") {
      const grand = row.kind === "grand_total";
      aoa.push([
        grand ? "" : formatReportDate(row.date),
        grand ? "Grand Total" : "Day Total",
        countLabel(row),
        ...blanks(LEAD.length - 3),
        ...nums(row.purchase),
        ...nums(row.sale),
      ]);
      if (!grand) aoa.push([]); // a blank line between days
      return;
    }
    const isSale = row.kind === "sale";
    aoa.push([
      formatReportDate(row.date),
      isSale ? "Sale" : "Purchase",
      row.voucher || "",
      row.fromPurchase || "",
      row.party || "",
      row.vehicle || "",
      row.driver || "",
      row.milkType || "",
      ...nums(row.purchase),
      ...nums(row.sale),
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Keep two decimals visible on every figure (0.00 rather than 0)
  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let r = HEADER_ROWS; r <= range.e.r; r++) {
    for (let c = FIRST_NUM_COL; c < FIRST_NUM_COL + SUB.length * 2; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === "n") cell.z = "#,##0.00";
    }
  }

  const lastCol = FIRST_NUM_COL + SUB.length * 2 - 1;
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 3, c: FIRST_NUM_COL }, e: { r: 3, c: FIRST_NUM_COL + SUB.length - 1 } },
    { s: { r: 3, c: FIRST_NUM_COL + SUB.length }, e: { r: 3, c: lastCol } },
  ];
  ws["!cols"] = [
    { wch: 12 }, { wch: 12 }, { wch: 26 }, { wch: 13 }, { wch: 26 }, { wch: 14 }, { wch: 18 }, { wch: 9 },
    ...Array(SUB.length * 2).fill(0).map((_, i) => ({ wch: i % SUB.length === 4 ? 14 : 10 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Day-wise");
  XLSX.writeFile(wb, `Tanker_Daywise_Report_${meta.from}_to_${meta.to}.xlsx`);
};
