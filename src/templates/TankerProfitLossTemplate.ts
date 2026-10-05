import pdfMake from "pdfmake/build/pdfmake";
import * as XLSX from "xlsx";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import type { TankerPLReport } from "@/services/tankerApi";

// Tanker Profit & Loss — PDF and Excel. Every figure comes from the server
// (GET /web/tanker/profit-loss); nothing is recalculated here, only formatted.

export const formatPLDate = (value?: string) => {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}-${m}-${y}` : value;
};

export const formatMoney = (value: number) =>
  `₹${value < 0 ? "-" : ""}${Math.abs(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatLiter = (value: number) =>
  `${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;

const show = (value?: string | null) => (value === undefined || value === null || value === "" ? "-" : value);

const PROFIT = "#047857";
const LOSS = "#b91c1c";
const plColor = (value: number) => (value > 0.005 ? PROFIT : value < -0.005 ? LOSS : "#374151");

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export const generateTankerProfitLossPDF = (report: TankerPLReport, businessName: string) => {
  const { summary: s, tankers, period } = report;
  const num = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const right = (text: string, extra: Record<string, any> = {}) => ({ text, alignment: "right", ...extra });
  const head = (text: string) => ({ text, bold: true, alignment: "center", fillColor: "#f3f4f6" });

  const keyValueTable = (title: string, rows: [string, any, Record<string, any>?][]) => ({
    table: {
      widths: ["*", "auto"],
      body: [
        [{ text: title, bold: true, colSpan: 2, fillColor: "#f3f4f6" }, {}],
        ...rows.map(([label, value, style]) => [{ text: label, ...(style || {}) }, right(value, style || {})]),
      ],
    },
    layout: {
      hLineWidth: () => 0.5, vLineWidth: () => 0.5,
      hLineColor: () => "#d1d5db", vLineColor: () => "#d1d5db",
      paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 3, paddingBottom: () => 3,
    },
  });

  const resultLabel = s.status === "Loss" ? "Gross Loss" : "Gross Profit";

  const header = [
    "Date", "Voucher", "Supplier / Buyer", "Vehicle", "Milk", "Qty (L)", "Rate",
    "Purchase Amt", "Sold Qty (L)", "Sale Amt", "Cost of Sold", "Profit / Loss", "Status",
  ].map(head);

  const body: any[] = [];
  tankers.forEach((tk) => {
    body.push([
      formatPLDate(tk.date),
      { text: tk.voucher_no, bold: true },
      { text: tk.supplier_name, bold: true },
      show(tk.vehicle_number),
      show(tk.milk_type),
      right(num(tk.purchase_liter)),
      right(num(tk.purchase_rate)),
      right(num(tk.purchase_amount)),
      right(num(tk.sold_liter)),
      right(num(tk.sale_amount)),
      right(num(tk.cost_of_sold)),
      right(num(tk.profit), { bold: true, color: plColor(tk.profit) }),
      { text: tk.status, alignment: "center" },
    ]);
    tk.sales.forEach((sale) => {
      body.push([
        { text: formatPLDate(sale.date), color: "#4b5563" },
        { text: sale.voucher_no, color: "#4b5563" },
        { text: sale.buyer_name, color: "#4b5563", margin: [8, 0, 0, 0] },
        { text: show(sale.vehicle_number), color: "#4b5563" },
        { text: show(sale.milk_type), color: "#4b5563" },
        "",
        right(num(sale.rate_per_liter), { color: "#4b5563" }),
        "",
        right(num(sale.liter), { color: "#4b5563" }),
        right(num(sale.total_amount), { color: "#4b5563" }),
        "", "", "",
      ]);
    });
  });
  body.push([
    { text: "TOTAL", bold: true, colSpan: 5, fillColor: "#fef3c7" }, {}, {}, {}, {},
    right(num(s.purchase_liter), { bold: true, fillColor: "#fef3c7" }),
    { text: "", fillColor: "#fef3c7" },
    right(num(s.purchase_amount), { bold: true, fillColor: "#fef3c7" }),
    right(num(s.sold_liter), { bold: true, fillColor: "#fef3c7" }),
    right(num(s.sale_amount), { bold: true, fillColor: "#fef3c7" }),
    right(num(s.cost_of_sold), { bold: true, fillColor: "#fef3c7" }),
    right(num(s.gross_profit), { bold: true, fillColor: "#fef3c7", color: plColor(s.gross_profit) }),
    { text: "", fillColor: "#fef3c7" },
  ]);

  const docDefinition: any = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [20, 20, 20, 24],
    content: [
      { text: "Tanker Profit & Loss Report", fontSize: 14, bold: true, alignment: "center" },
      { text: businessName, fontSize: 10, alignment: "center", color: "#374151", margin: [0, 2, 0, 0] },
      {
        columns: [
          { text: `Period: ${formatPLDate(period.from)} to ${formatPLDate(period.to)}`, bold: true },
          { text: `Generated On: ${formatPLDate(new Date().toISOString().slice(0, 10))}`, alignment: "right" },
        ],
        fontSize: 8,
        margin: [0, 8, 0, 8],
      },
      {
        columns: [
          keyValueTable("Profit & Loss", [
            ["Total Sale", formatMoney(s.sale_amount)],
            ["Less: Cost of Milk Sold", formatMoney(-s.cost_of_sold), { color: LOSS }],
            [resultLabel, formatMoney(s.gross_profit), { bold: true, color: plColor(s.gross_profit) }],
            ["Margin", `${s.margin_percent.toFixed(2)}%`],
          ]),
          keyValueTable("Purchase & Stock", [
            [`Tankers Purchased (${s.purchase_count})`, `${formatLiter(s.purchase_liter)}  ·  ${formatMoney(s.purchase_amount)}`],
            [`Milk Sold (${s.sale_count} sale${s.sale_count === 1 ? "" : "s"})`, formatLiter(s.sold_liter)],
            ["Unsold Milk (at purchase cost)", `${formatLiter(s.unsold_liter)}  ·  ${formatMoney(s.unsold_value)}`],
          ]),
        ],
        columnGap: 12,
        fontSize: 8,
        margin: [0, 0, 0, 10],
      },
      { text: "Tanker-wise Profit & Loss", bold: true, fontSize: 9, margin: [0, 0, 0, 4] },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: [42, 30, "*", 58, 32, 44, 32, 54, 46, 54, 54, 54, 40],
          body: [header, ...body],
        },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => "#9ca3af", vLineColor: () => "#9ca3af",
          paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 2, paddingBottom: () => 2,
        },
      },
      {
        text: "Tankers purchased in the period, with every sale made from them. Profit = sale amount - purchase cost of the milk sold; unsold milk is stock at purchase cost, not a loss. Amounts include commission.",
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

  pdfMake.createPdf(docDefinition).download(`Tanker_Profit_Loss_${period.from}_to_${period.to}.pdf`);
};

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

export const generateTankerProfitLossExcel = (report: TankerPLReport, businessName: string) => {
  const { summary: s, tankers, period } = report;
  const TABLE_HEADER = [
    "Date", "Voucher", "Type", "Supplier / Buyer", "Vehicle", "Driver", "Milk",
    "Qty (L)", "Rate", "Purchase Amount", "Sold Qty (L)", "Sale Amount", "Cost of Sold", "Profit / Loss", "Status",
  ];
  const FIRST_NUM_COL = 7;

  const aoa: (string | number)[][] = [
    ["Tanker Profit & Loss Report"],
    [businessName],
    ["Period", `${formatPLDate(period.from)} to ${formatPLDate(period.to)}`],
    [],
    ["Profit & Loss"],
    ["Total Sale", s.sale_amount],
    ["Less: Cost of Milk Sold", -s.cost_of_sold],
    [s.status === "Loss" ? "Gross Loss" : "Gross Profit", s.gross_profit],
    ["Margin %", s.margin_percent],
    [],
    ["Purchase & Stock", "Litres", "Amount"],
    [`Tankers Purchased (${s.purchase_count})`, s.purchase_liter, s.purchase_amount],
    [`Milk Sold (${s.sale_count})`, s.sold_liter, s.sale_amount],
    ["Unsold Milk (at purchase cost)", s.unsold_liter, s.unsold_value],
    [],
    TABLE_HEADER,
  ];
  const tableStart = aoa.length;

  tankers.forEach((tk) => {
    aoa.push([
      formatPLDate(tk.date), tk.voucher_no, "Purchase", tk.supplier_name, show(tk.vehicle_number), show(tk.driver_name), show(tk.milk_type),
      tk.purchase_liter, tk.purchase_rate, tk.purchase_amount, tk.sold_liter, tk.sale_amount, tk.cost_of_sold, tk.profit, tk.status,
    ]);
    tk.sales.forEach((sale) => {
      aoa.push([
        formatPLDate(sale.date), sale.voucher_no, "Sale", sale.buyer_name, show(sale.vehicle_number), show(sale.driver_name), show(sale.milk_type),
        "", sale.rate_per_liter, "", sale.liter, sale.total_amount, "", "", "",
      ]);
    });
  });
  aoa.push([
    "", "", "Total", "", "", "", "",
    s.purchase_liter, "", s.purchase_amount, s.sold_liter, s.sale_amount, s.cost_of_sold, s.gross_profit, "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const twoDecimals = (r: number, c: number) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (cell && cell.t === "n") cell.z = "#,##0.00";
  };
  // Summary block (rows 5-13, columns B-C) and every figure in the table
  for (let r = 5; r < tableStart; r++) [1, 2].forEach((c) => twoDecimals(r, c));
  for (let r = tableStart; r < aoa.length; r++) {
    for (let c = FIRST_NUM_COL; c < FIRST_NUM_COL + 7; c++) twoDecimals(r, c);
  }

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: TABLE_HEADER.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: TABLE_HEADER.length - 1 } },
  ];
  ws["!cols"] = [
    { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 26 }, { wch: 14 }, { wch: 18 }, { wch: 9 },
    { wch: 11 }, { wch: 9 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
  XLSX.writeFile(wb, `Tanker_Profit_Loss_${period.from}_to_${period.to}.xlsx`);
};
