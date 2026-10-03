import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import type { TankerReportPurchase, TankerVoucherRow } from "@/services/tankerApi";

// Tanker Purchase & Sale report: one row per purchased tanker, the sales made
// out of it indented underneath, and a grand total. The purchase row carries
// the tanker's sales rolled up and the difference (sale - purchase), so a fully
// sold tanker's Amount difference is its profit (or loss).

export interface TradeGroup {
  qty: number;
  fat: number;     // litre-weighted
  snf: number;     // litre-weighted
  rate: number;    // litre-weighted rate per liter (commission excluded)
  amount: number;  // total amount (commission included)
}

export interface TradeDiff {
  qty: number;
  fat: number;
  snf: number;
  amount: number;
}

export interface TankerTradeRow {
  kind: "purchase" | "sale" | "total";
  date?: string;
  voucher?: string;
  vehicle?: string;
  driver?: string;
  party?: string;
  milkType?: string;
  purchase: TradeGroup | null;
  sale: TradeGroup | null;
  diff: TradeDiff | null;
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

const aggregate = (vouchers: TankerVoucherRow[]): TradeGroup | null => {
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

const difference = (purchase: TradeGroup | null, sale: TradeGroup | null): TradeDiff | null =>
  purchase && sale
    ? { qty: sale.qty - purchase.qty, fat: sale.fat - purchase.fat, snf: sale.snf - purchase.snf, amount: sale.amount - purchase.amount }
    : null;

export const buildTankerTradeRows = (purchases: TankerReportPurchase[]): TankerTradeRow[] => {
  const rows: TankerTradeRow[] = [];

  purchases.forEach((p) => {
    const purchase = aggregate([p]);
    const sale = aggregate(p.sales);
    rows.push({
      kind: "purchase",
      date: p.date,
      voucher: `P-${p.id}`,
      vehicle: p.vehicle_number || "-",
      driver: p.driver_name || "-",
      party: p.party_name,
      milkType: p.milk_type,
      purchase,
      sale,
      diff: difference(purchase, sale),
    });
    p.sales.forEach((s) => {
      rows.push({
        kind: "sale",
        date: s.date,
        voucher: `S-${s.id}`,
        vehicle: s.vehicle_number || "-",
        driver: s.driver_name || "-",
        party: s.party_name,
        milkType: s.milk_type,
        purchase: null,
        sale: aggregate([s]),
        diff: null,
      });
    });
  });

  if (purchases.length > 0) {
    const purchase = aggregate(purchases);
    const sale = aggregate(purchases.flatMap((p) => p.sales));
    // A tanker not sold yet would read as a loss of its whole cost, so the
    // total difference only compares tankers that have at least one sale.
    const soldTankers = purchases.filter((p) => p.sales.length > 0);
    rows.push({ kind: "total", purchase, sale, diff: difference(aggregate(soldTankers), sale) });
  }

  return rows;
};

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const PURCHASE_FILL = "#eff6ff";
const SALE_FILL = "#f0fdf4";
const DIFF_FILL = "#faf5ff";
const TOTAL_FILL = "#fef3c7";

const fmt = (value: number | undefined | null, decimals = 2) =>
  value === undefined || value === null ? "-" : value.toFixed(decimals);

const diffColor = (value?: number | null) => {
  if (value === undefined || value === null || Math.abs(value) < 0.005) return "#4b5563";
  return value < 0 ? "#dc2626" : "#16a34a";
};

const groupCells = (g: TradeGroup | null, fill: string, bold: boolean) =>
  [g?.qty, g?.fat, g?.snf, g?.rate, g?.amount].map((v) => ({
    text: g ? fmt(v) : "-",
    alignment: "right",
    fillColor: fill,
    bold,
  }));

const diffCells = (d: TradeDiff | null, fill: string, bold: boolean) =>
  [d?.qty, d?.fat, d?.snf, d?.amount].map((v) => ({
    text: d ? fmt(v) : "-",
    alignment: "right",
    fillColor: fill,
    color: diffColor(v),
    bold,
  }));

export const generateTankerTradeReportPDF = (
  rows: TankerTradeRow[],
  meta: { businessName: string; from: string; to: string }
) => {
  const head = (text: string, extra: Record<string, any> = {}) => ({ text, bold: true, alignment: "center", ...extra });

  const headerRow1 = [
    head("Date", { rowSpan: 2 }),
    head("Voucher", { rowSpan: 2 }),
    head("Vehicle / Driver", { rowSpan: 2 }),
    head("Supplier / Buyer", { rowSpan: 2 }),
    head("Milk", { rowSpan: 2 }),
    head("PURCHASE", { colSpan: 5, fillColor: PURCHASE_FILL }), {}, {}, {}, {},
    head("SALE", { colSpan: 5, fillColor: SALE_FILL }), {}, {}, {}, {},
    head("DIFFERENCE (SALE - PURCHASE)", { colSpan: 4, fillColor: DIFF_FILL }), {}, {}, {},
  ];
  const sub = (fill: string) => ["Qty", "Fat", "SNF", "Rate", "Amount"].map((label) => head(label, { fillColor: fill }));
  const headerRow2 = [
    {}, {}, {}, {}, {},
    ...sub(PURCHASE_FILL),
    ...sub(SALE_FILL),
    ...["Qty", "Fat", "SNF", "Amount"].map((label) => head(label, { fillColor: DIFF_FILL })),
  ];

  const body = rows.map((row) => {
    if (row.kind === "total") {
      return [
        { text: "TOTAL", bold: true, colSpan: 5, fillColor: TOTAL_FILL }, {}, {}, {}, {},
        ...groupCells(row.purchase, TOTAL_FILL, true),
        ...groupCells(row.sale, TOTAL_FILL, true),
        ...diffCells(row.diff, TOTAL_FILL, true),
      ];
    }
    const isSale = row.kind === "sale";
    const textColor = isSale ? "#4b5563" : "#111827";
    return [
      { text: formatReportDate(row.date), color: textColor },
      { text: row.voucher, bold: !isSale, color: textColor },
      { text: [{ text: row.vehicle || "-" }, { text: `\n${row.driver || "-"}`, color: "#6b7280" }], color: textColor },
      { text: row.party || "-", bold: !isSale, color: textColor, margin: [isSale ? 8 : 0, 0, 0, 0] },
      { text: row.milkType || "-", color: textColor },
      ...groupCells(row.purchase, PURCHASE_FILL, false),
      ...groupCells(row.sale, SALE_FILL, false),
      ...diffCells(row.diff, DIFF_FILL, !isSale),
    ];
  });

  const docDefinition: any = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [20, 20, 20, 24],
    content: [
      { text: "Tanker Purchase & Sale Report", fontSize: 14, bold: true, alignment: "center" },
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
          // pdfmake adds cell padding on top of these, so 19 columns must leave room for it
          widths: [40, 28, 58, "*", 26, ...Array(14).fill(33)],
          body: [headerRow1, headerRow2, ...body],
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
        text: "Purchase rows show the tanker's sales rolled up; indented rows are the individual sales. The total difference counts only tankers with at least one sale. Rate excludes commission; Amount includes it.",
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

  pdfMake.createPdf(docDefinition).download(`Tanker_Purchase_Sale_Report_${meta.from}_to_${meta.to}.pdf`);
};
