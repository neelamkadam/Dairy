import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import type { TransportNeftRow, TransportNeftTotals } from "@/services/transportApi";

// Transport NEFT statement, laid out like the bank upload sheet: one row per
// transport, then "Total Amount". Every figure comes from the server.
//   Payable Amount = Net Payable Amount (what the bank transfers)
//   Shift          = trips run in the period
//   KMS / Rate     = KMs per trip / rate per KM (several when the route changed)

type Kind = "text" | "amount" | "number";
interface Column {
  label: string;
  kind: Kind;
  value: (r: TransportNeftRow) => string | number;
  total?: (t: TransportNeftTotals) => number;
  width: number;
}

const joinNumbers = (values: number[]) => values.map((v) => v.toFixed(2)).join(" / ");

export const TRANSPORT_NEFT_COLUMNS: Column[] = [
  { label: "A/C Number", kind: "text", value: (r) => r.account_number, width: 20 },
  { label: "Account Holder", kind: "text", value: (r) => r.account_holder, width: 28 },
  { label: "Payable Amount", kind: "amount", value: (r) => r.net_payable, total: (t) => t.net_payable, width: 15 },
  { label: "IFSCode", kind: "text", value: (r) => r.ifsc_code, width: 14 },
  { label: "Route Name", kind: "text", value: (r) => r.route_names.join(", "), width: 22 },
  { label: "KMS", kind: "text", value: (r) => joinNumbers(r.km_per_trip), width: 10 },
  { label: "Shift", kind: "number", value: (r) => r.trips, total: (t) => t.trips, width: 8 },
  { label: "Total Kms", kind: "amount", value: (r) => r.total_km, total: (t) => t.total_km, width: 11 },
  { label: "Rate", kind: "text", value: (r) => joinNumbers(r.rates), width: 9 },
  { label: "Avg Cost/lit", kind: "amount", value: (r) => r.avg_cost_per_liter, width: 11 },
  { label: "Milk Collection on Route", kind: "amount", value: (r) => r.milk, total: (t) => t.milk, width: 16 },
  { label: "Payment Amount", kind: "amount", value: (r) => r.payment_amount, total: (t) => t.payment_amount, width: 15 },
  { label: "Advance", kind: "amount", value: (r) => r.advance, total: (t) => t.advance, width: 12 },
  { label: "Deduction from DCA Report", kind: "amount", value: (r) => r.dca_deduction, total: (t) => t.dca_deduction, width: 16 },
  { label: "Net Payable Amount", kind: "amount", value: (r) => r.net_payable, total: (t) => t.net_payable, width: 16 },
];

const money = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fileName = (ext: string, from: string, to: string) => `Transport_NEFT_${from}_to_${to}.${ext}`;
const formatDate = (value: string) => {
  const [y, m, d] = value.split("-");
  return `${d}-${m}-${y}`;
};

export const generateTransportNeftExcel = (rows: TransportNeftRow[], totals: TransportNeftTotals, from: string, to: string) => {
  const aoa: (string | number)[][] = [
    TRANSPORT_NEFT_COLUMNS.map((c) => c.label),
    ...rows.map((r) => TRANSPORT_NEFT_COLUMNS.map((c) => c.value(r))),
    TRANSPORT_NEFT_COLUMNS.map((c, i) => (c.total ? c.total(totals) : i === 0 ? "Total Amount" : "")),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // A/C numbers stay text so Excel does not turn them into 1.23E+13
  for (let r = 1; r < aoa.length; r++) {
    TRANSPORT_NEFT_COLUMNS.forEach((c, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c: i })];
      if (!cell) return;
      if (c.kind === "amount" && cell.t === "n") cell.z = "0.00";
      if (c.kind === "text") cell.t = "s";
    });
  }
  ws["!cols"] = TRANSPORT_NEFT_COLUMNS.map((c) => ({ wch: c.width }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transport NEFT");
  XLSX.writeFile(wb, fileName("xlsx", from, to));
};

export const generateTransportNeftPDF = (
  rows: TransportNeftRow[],
  totals: TransportNeftTotals,
  businessName: string,
  from: string,
  to: string
) => {
  const cell = (c: Column, value: string | number, extra: Record<string, any> = {}) =>
    c.kind === "text"
      ? { text: String(value ?? ""), ...extra }
      : { text: c.kind === "amount" ? money(Number(value)) : String(value), alignment: "right", ...extra };

  const body: any[][] = [
    TRANSPORT_NEFT_COLUMNS.map((c) => ({ text: c.label, bold: true, alignment: c.kind === "text" ? "left" : "right", fillColor: "#f3f4f6" })),
    ...rows.map((r) => TRANSPORT_NEFT_COLUMNS.map((c) => cell(c, c.value(r)))),
    TRANSPORT_NEFT_COLUMNS.map((c, i) =>
      c.total
        ? cell(c, c.total(totals), { bold: true, fillColor: "#fef3c7" })
        : { text: i === 0 ? "Total Amount" : "", bold: true, fillColor: "#fef3c7" }
    ),
  ];

  const docDefinition: any = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [16, 20, 16, 24],
    content: [
      { text: businessName, fontSize: 13, bold: true, alignment: "center" },
      { text: "Transport NEFT Statement", fontSize: 11, alignment: "center", margin: [0, 2, 0, 0] },
      { text: `Period: ${formatDate(from)} to ${formatDate(to)}`, fontSize: 8, bold: true, margin: [0, 8, 0, 6] },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: [52, "*", 46, 46, 50, 30, 22, 34, 28, 30, 42, 44, 36, 40, 46],
          body,
        },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => "#9ca3af", vLineColor: () => "#9ca3af",
          paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 2, paddingBottom: () => 2,
        },
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} of ${pageCount}`, alignment: "right", fontSize: 7, color: "#6b7280", margin: [0, 4, 16, 0],
    }),
    defaultStyle: { fontSize: 6.5, color: "#1f2937", font: PDF_FONT },
  };
  pdfMake.createPdf(docDefinition).download(fileName("pdf", from, to));
};
