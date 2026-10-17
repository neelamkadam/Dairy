import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import { formatRupees } from "@/utils/farmerNeftStatement";
import { BANK_SUMMARY_COLUMNS, BankGroup, bankGroupLabel, bankSummaryCell } from "@/utils/bankSummaryReport";

const fileName = (ext: string, fromDate: string, toDate: string) =>
  `Bank_Summary_${fromDate}_${toDate}.${ext}`.replace(/\//g, "-");

const farmerCount = (groups: BankGroup[]) => groups.reduce((n, g) => n + g.rows.length, 0);
const grandTotal = (groups: BankGroup[]) => groups.reduce((sum, g) => sum + g.total, 0);

const EXCEL_WIDTHS = [32, 22, 14, 26, 12];

// One sheet, the banks one under another as in the bank's sheet: header row, farmers,
// total row, blank row. Then the bank-wise totals and the grand total.
// Account numbers stay text so Excel keeps leading zeros and does not show 1.23E+13.
export const generateBankSummaryExcel = (groups: BankGroup[], notSetLabel: string, fromDate: string, toDate: string) => {
  const amountCol = BANK_SUMMARY_COLUMNS.length - 1;
  const aoa: (string | number)[][] = [];
  const amountCells: Array<[number, number]> = [];
  const pushAmount = (row: (string | number)[], col: number) => {
    amountCells.push([aoa.length, col]);
    aoa.push(row);
  };

  groups.forEach((g) => {
    aoa.push(BANK_SUMMARY_COLUMNS.map((c) => c.excelLabel));
    g.rows.forEach((r) => pushAmount(BANK_SUMMARY_COLUMNS.map((c) => bankSummaryCell(c.key, r, g) ?? ""), amountCol));
    pushAmount(
      BANK_SUMMARY_COLUMNS.map((c, i) => (i === 0 ? `${bankGroupLabel(g, notSetLabel)} Total (${g.rows.length})` : i === amountCol ? g.total : "")),
      amountCol
    );
    aoa.push([]);
  });

  aoa.push(["Bank_Name", "Farmers", "Amount"]);
  groups.forEach((g) => pushAmount([bankGroupLabel(g, notSetLabel), g.rows.length, g.total], 2));
  pushAmount(["Grand Total", farmerCount(groups), grandTotal(groups)], 2);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  amountCells.forEach(([r, c]) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (cell && typeof cell.v === "number") cell.z = "0";
  });
  ws["!cols"] = EXCEL_WIDTHS.map((wch) => ({ wch }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bank Summary");
  XLSX.writeFile(wb, fileName("xlsx", fromDate, toDate));
};

export const generateBankSummaryPDF = (
  groups: BankGroup[],
  notSetLabel: string,
  dairyName: string,
  title: string,
  fromDate: string,
  toDate: string
) => {
  const span = BANK_SUMMARY_COLUMNS.length;
  const isAmount = (key: string) => key === "amount";

  const body: any[][] = [
    BANK_SUMMARY_COLUMNS.map((c) => ({ text: c.label, bold: true, alignment: isAmount(c.key) ? "right" : "left", fillColor: "#d1d5db" })),
  ];
  groups.forEach((g) => {
    body.push([
      { text: `${bankGroupLabel(g, notSetLabel)}  (${g.rows.length} Farmers)`, bold: true, color: "#1e3a8a", fillColor: "#dbeafe", colSpan: span },
      ...Array(span - 1).fill({}),
    ]);
    g.rows.forEach((r) =>
      body.push(
        BANK_SUMMARY_COLUMNS.map((c) =>
          isAmount(c.key)
            ? { text: formatRupees(r.netPayable), alignment: "right" }
            : {
                text: String(bankSummaryCell(c.key, r, g) || ""),
                fillColor: r.missingBank && (c.key === "accountNumber" || c.key === "ifscCode") ? "#fef3c7" : null,
              }
        )
      )
    );
    body.push([
      { text: `Total (${g.rows.length})`, bold: true, colSpan: span - 1, fillColor: "#f3f4f6" },
      ...Array(span - 2).fill({}),
      { text: formatRupees(g.total), bold: true, alignment: "right", fillColor: "#f3f4f6" },
    ]);
  });
  body.push([
    { text: `Grand Total (${farmerCount(groups)})`, bold: true, colSpan: span - 1, fillColor: "#d1d5db" },
    ...Array(span - 2).fill({}),
    { text: formatRupees(grandTotal(groups)), bold: true, alignment: "right", fillColor: "#d1d5db" },
  ]);

  const recap: any[][] = [
    [
      { text: "Bank Name", bold: true, fillColor: "#d1d5db" },
      { text: "Farmers", bold: true, alignment: "right", fillColor: "#d1d5db" },
      { text: "Amount", bold: true, alignment: "right", fillColor: "#d1d5db" },
    ],
    ...groups.map((g) => [
      bankGroupLabel(g, notSetLabel),
      { text: String(g.rows.length), alignment: "right" },
      { text: formatRupees(g.total), alignment: "right" },
    ]),
    [
      { text: "Grand Total", bold: true, fillColor: "#d1d5db" },
      { text: String(farmerCount(groups)), bold: true, alignment: "right", fillColor: "#d1d5db" },
      { text: formatRupees(grandTotal(groups)), bold: true, alignment: "right", fillColor: "#d1d5db" },
    ],
  ];

  const lines = { hLineWidth: () => 0.5, vLineWidth: () => 0.5 };
  const docDefinition: any = {
    defaultStyle: { font: PDF_FONT, fontSize: 8 },
    pageSize: "A4",
    pageMargins: [20, 30, 20, 30],
    content: [
      { text: dairyName, fontSize: 14, bold: true, alignment: "center", margin: [0, 0, 0, 2] },
      { text: title, fontSize: 11, bold: true, alignment: "center", margin: [0, 0, 0, 2] },
      { text: `From Date: ${fromDate}     To Date: ${toDate}`, alignment: "center", fontSize: 9, margin: [0, 0, 0, 8] },
      {
        table: { headerRows: 1, dontBreakRows: true, widths: ["*", "auto", "auto", "auto", "auto"], body },
        layout: lines,
      },
      { text: "Bank-wise Total", fontSize: 10, bold: true, margin: [0, 12, 0, 4] },
      {
        table: { headerRows: 1, dontBreakRows: true, widths: ["*", "auto", "auto"], body: recap },
        layout: lines,
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} of ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      color: "#6b7280",
      margin: [0, 10, 0, 0],
    }),
  };

  pdfMake.createPdf(docDefinition).download(fileName("pdf", fromDate, toDate));
};
