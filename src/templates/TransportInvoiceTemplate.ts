import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import { format } from "date-fns";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import { amountInWords } from "./DispatchVoucherTemplate";
import type { TransportInvoice } from "@/services/transportApi";

// Transport Bill Invoice, laid out like the paper invoice: header details, one
// row per day of the bill period with the Morning / Evening KMs run, Total Km,
// Rate per KM and Amount, the amount in words and the signatures. Every figure
// comes from the server (GET /web/transport/invoice).

export interface InvoiceMeta {
  businessName: string;
  billNo: string;
  billDate: string; // yyyy-MM-dd
}

const toDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dayLabel = (value: string) => format(toDate(value), "d-MMM-yy");
const periodLabel = (value: string) => format(toDate(value), "dd MMM yy");
const dmy = (value: string) => format(toDate(value), "dd/MM/yyyy");
const km = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
const money = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CERTIFICATE =
  "We hereby certify that we have not availed credit of duty paid on inputs or capital goods under the provisions of " +
  "CENVAT credit rules 2004 nor have availed the benefit of notification no 12/2003-ST dated 20.06.2003.";

// The header lines shared by the PDF and the Excel file
const headerRows = (inv: TransportInvoice, meta: InvoiceMeta): [string, string, string, string][] => {
  const tr = inv.transport;
  const routeNames = inv.routes.map((r) => r.route_name).join(", ");
  const routeNos = inv.routes.map((r) => String(r.route_id)).join(", ");
  const ccNames = [...new Set(inv.routes.map((r) => r.cc_name).filter(Boolean))].join(", ");
  return [
    ["Transporter Name :", tr.name, "Address :", tr.address || ""],
    ["Bill To :", meta.businessName, "Bill No :", meta.billNo],
    ["Vendor Code :", tr.vendor_code || "", "Bill Date :", meta.billDate ? dmy(meta.billDate) : ""],
    ["Service Tax Reg No :", tr.service_tax_no || "NA", "Bill Period :", `${periodLabel(inv.period.from)} TO ${periodLabel(inv.period.to)}`],
    ["Description of Goods :", "Transport of milk", "BMCC/MCC Name :", ccNames],
    ["Route Name :", routeNames, "Route No :", routeNos],
    ["Work Order No. :", tr.work_order_no || "", "Vehicle No :", tr.vehicle_number || ""],
    ["PAN No. :", tr.pan_no || "", "Vehicle Capacity / Type :", tr.vehicle_capacity || ""],
  ];
};

const ratesLabel = (inv: TransportInvoice) => inv.rates.map((r) => r.toFixed(2)).join(" / ") || "0.00";

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export const generateTransportInvoicePDF = (inv: TransportInvoice, meta: InvoiceMeta) => {
  const grid = {
    hLineWidth: () => 0.6, vLineWidth: () => 0.6,
    hLineColor: () => "#111827", vLineColor: () => "#111827",
    paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 1, paddingBottom: () => 1,
  };
  const bold = (text: string, extra: Record<string, any> = {}) => ({ text, bold: true, ...extra });

  const dayRows = inv.days.map((d, i) => [
    { text: String(i + 1), alignment: "right" },
    { text: dayLabel(d.date), alignment: "center" },
    { text: d.bmc_name || "", alignment: "center" },
    i === 0 ? { text: ratesLabel(inv), rowSpan: inv.days.length, alignment: "center", bold: true, margin: [0, (inv.days.length * 5), 0, 0] } : {},
    { text: d.morning_km ? km(d.morning_km) : "", alignment: "center" },
    { text: d.evening_km ? km(d.evening_km) : "", alignment: "center" },
    { text: km(d.total_km), alignment: "center" },
  ]);

  const docDefinition: any = {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [24, 16, 24, 16],
    content: [
      {
        table: {
          widths: ["*"],
          body: [
            [{ text: meta.businessName, fontSize: 14, bold: true, alignment: "center" }],
            [{ text: "INVOICE", alignment: "center", bold: true }],
          ],
        },
        layout: grid,
      },
      {
        table: {
          widths: [96, "*", 104, "*"],
          body: headerRows(inv, meta).map(([l1, v1, l2, v2]) => [bold(l1), v1, bold(l2), v2]),
        },
        layout: grid,
      },
      {
        table: {
          headerRows: 2,
          widths: [28, 56, "*", 70, 52, 52, 70],
          body: [
            [
              bold("S No", { rowSpan: 2, alignment: "center" }),
              bold("Date", { rowSpan: 2, alignment: "center" }),
              bold("FROM BMC Name", { rowSpan: 2, alignment: "center" }),
              bold("Rate per KM (Rs)", { rowSpan: 2, alignment: "center" }),
              bold("KMS", { colSpan: 2, alignment: "center" }), {},
              bold("Total Kms", { rowSpan: 2, alignment: "center" }),
            ],
            [{}, {}, {}, {}, bold("Morning", { alignment: "center" }), bold("Evening", { alignment: "center" }), {}],
            ...dayRows,
            ["", "", bold("Total Km"), "", bold(km(inv.totals.morning_km), { alignment: "center" }), bold(km(inv.totals.evening_km), { alignment: "center" }), bold(km(inv.totals.total_km), { alignment: "center" })],
            ["", "", bold("Rate per KM (Rs) @"), "", bold(ratesLabel(inv), { colSpan: 2, alignment: "center" }), {}, ""],
            ["", "", bold("Amount"), "", { text: "", colSpan: 2 }, {}, bold(money(inv.totals.amount), { alignment: "center" })],
          ],
        },
        layout: grid,
      },
      {
        table: {
          widths: ["*"],
          body: [
            [{ text: [bold("Rupees In : "), amountInWords(inv.totals.amount)] }],
            [{ text: CERTIFICATE, fontSize: 8 }],
          ],
        },
        layout: grid,
      },
      {
        table: {
          widths: [140, "*", 200],
          heights: [40],
          body: [[
            bold("Transporter Signature", { alignment: "center" }),
            "",
            bold(`Manager Signatory${meta.businessName ? ` — ${meta.businessName}` : ""}`, { alignment: "center" }),
          ]],
        },
        layout: grid,
      },
    ],
    defaultStyle: { fontSize: 8.5, color: "#111827", font: PDF_FONT },
  };

  pdfMake.createPdf(docDefinition).download(fileName("pdf", inv));
};

const fileName = (ext: string, inv: TransportInvoice) =>
  `Transport_Invoice_${inv.transport.name.replace(/[\\/:*?"<>|\s]+/g, "_")}_${inv.period.from}_to_${inv.period.to}.${ext}`;

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

export const generateTransportInvoiceExcel = (inv: TransportInvoice, meta: InvoiceMeta) => {
  const COLS = 7;
  const blank = (n: number) => Array(n).fill("");
  const aoa: (string | number)[][] = [
    [meta.businessName, ...blank(COLS - 1)],
    ["INVOICE", ...blank(COLS - 1)],
    // label, value (2 cols), label, value (2 cols)
    ...headerRows(inv, meta).map(([l1, v1, l2, v2]) => [l1, v1, "", l2, v2, "", ""]),
    [],
  ];
  const tableStart = aoa.length;
  aoa.push(["S No", "Date", "FROM BMC Name", "Rate per KM (Rs)", "KMS", "", "Total Kms"]);
  aoa.push(["", "", "", "", "Morning", "Evening", ""]);
  inv.days.forEach((d, i) => {
    aoa.push([i + 1, dayLabel(d.date), d.bmc_name || "", i === 0 ? ratesLabel(inv) : "", d.morning_km || "", d.evening_km || "", d.total_km]);
  });
  const totalsStart = aoa.length;
  aoa.push(["", "", "Total Km", "", inv.totals.morning_km, inv.totals.evening_km, inv.totals.total_km]);
  aoa.push(["", "", "Rate per KM (Rs) @", "", ratesLabel(inv), "", ""]);
  aoa.push(["", "", "Amount", "", "", "", inv.totals.amount]);
  aoa.push([`Rupees In : ${amountInWords(inv.totals.amount)}`, ...blank(COLS - 1)]);
  aoa.push([CERTIFICATE, ...blank(COLS - 1)]);
  aoa.push([]);
  aoa.push(["Transporter Signature", "", "", "", `Manager Signatory${meta.businessName ? ` — ${meta.businessName}` : ""}`, "", ""]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const merge = (r1: number, c1: number, r2: number, c2: number) => ({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  const merges = [merge(0, 0, 0, COLS - 1), merge(1, 0, 1, COLS - 1)];
  headerRows(inv, meta).forEach((_, i) => {
    merges.push(merge(2 + i, 1, 2 + i, 2), merge(2 + i, 4, 2 + i, 6));
  });
  merges.push(
    merge(tableStart, 0, tableStart + 1, 0), merge(tableStart, 1, tableStart + 1, 1), merge(tableStart, 2, tableStart + 1, 2),
    merge(tableStart, 3, tableStart + 1, 3), merge(tableStart, 4, tableStart, 5), merge(tableStart, 6, tableStart + 1, 6),
    merge(tableStart + 2, 3, totalsStart - 1, 3),
    merge(totalsStart + 1, 4, totalsStart + 1, 5),
    merge(totalsStart + 3, 0, totalsStart + 3, COLS - 1),
    merge(totalsStart + 4, 0, totalsStart + 4, COLS - 1),
    merge(totalsStart + 6, 0, totalsStart + 6, 3), merge(totalsStart + 6, 4, totalsStart + 6, 6)
  );
  ws["!merges"] = merges;
  const amountCell = ws[XLSX.utils.encode_cell({ r: totalsStart + 2, c: 6 })];
  if (amountCell) amountCell.z = "#,##0.00";
  ws["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoice");
  XLSX.writeFile(wb, fileName("xlsx", inv));
};
