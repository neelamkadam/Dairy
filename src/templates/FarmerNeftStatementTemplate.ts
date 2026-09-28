import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import { NEFT_COLUMNS, NeftGroup, NeftRow, formatAmount, neftTotals } from "@/utils/farmerNeftStatement";

const fileName = (ext: string, fromDate: string, toDate: string) =>
  `Farmer_NEFT_Statement_${fromDate}_${toDate}.${ext}`.replace(/\//g, "-");

const groupHeading = (g: NeftGroup) => `${g.label}  (${g.rows.length} Farmers)`;

// Excel column order (bank-upload sheet). Differs from the screen / PDF: no
// Farmer ID, and the VLC (1 - VLC name - branch) sits after IFSCode.
type ExcelColumn = { key: keyof NeftRow | "vlc"; label: string; amount?: boolean; width: number };
const EXCEL_COLUMNS: ExcelColumn[] = [
  { key: "accountNumber", label: "A/C Number", width: 22 },
  { key: "accountHolder", label: "Account Holder", width: 32 },
  { key: "payableAmount", label: "Payable Amount", amount: true, width: 16 },
  { key: "ifscCode", label: "IFSCode", width: 14 },
  { key: "vlc", label: "VLC", width: 34 },
  { key: "purchaseAmount", label: "Purchase Amount", amount: true, width: 16 },
  { key: "advance", label: "Advance", amount: true, width: 12 },
  { key: "deduction", label: "Deduction", amount: true, width: 12 },
  { key: "netPayable", label: "Net Payable Amount", amount: true, width: 20 },
];

// Header row, one row per farmer, then the total row. No VLC heading rows.
// Account numbers stay text so Excel does not turn them into 1.23E+13.
export const generateFarmerNeftExcel = (groups: NeftGroup[], fromDate: string, toDate: string) => {
  const rows = groups.flatMap((g) => g.rows);
  const totals = neftTotals(rows);

  const aoa: (string | number)[][] = [EXCEL_COLUMNS.map((c) => c.label)];
  groups.forEach((g) =>
    g.rows.forEach((r) =>
      aoa.push(
        EXCEL_COLUMNS.map((c) =>
          c.key === "vlc"
            ? g.vlcColumn
            : c.amount
              ? Number((r[c.key] as number).toFixed(2))
              : String(r[c.key] || "")
        )
      )
    )
  );
  aoa.push(
    EXCEL_COLUMNS.map((c, i) =>
      c.amount ? Number(totals[c.key as keyof typeof totals].toFixed(2)) : i === 0 ? `Total (${rows.length})` : ""
    )
  );

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let r = 1; r <= range.e.r; r++) {
    EXCEL_COLUMNS.forEach((c, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c: i })];
      if (!cell) return;
      if (c.amount) cell.z = "0.00";
      else cell.t = "s";
    });
  }
  ws["!cols"] = EXCEL_COLUMNS.map((c) => ({ wch: c.width }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NEFT");
  XLSX.writeFile(wb, fileName("xlsx", fromDate, toDate));
};

export const generateFarmerNeftPDF = (
  groups: NeftGroup[],
  dairyName: string,
  title: string,
  fromDate: string,
  toDate: string
) => {
  const rows = groups.flatMap((g) => g.rows);
  const totals = neftTotals(rows);
  const span = NEFT_COLUMNS.length;

  const body: any[][] = [NEFT_COLUMNS.map((c) => ({ text: c.label, bold: true, alignment: c.amount ? "right" : "left" }))];
  groups.forEach((g) => {
    body.push([
      { text: groupHeading(g), bold: true, color: "#1e3a8a", fillColor: "#dbeafe", colSpan: span },
      ...Array(span - 1).fill({}),
    ]);
    g.rows.forEach((r) =>
      body.push(
        NEFT_COLUMNS.map((c) =>
          c.amount
            ? { text: formatAmount(r[c.key] as number), alignment: "right" }
            : { text: String(r[c.key] || ""), fillColor: r.missingBank && (c.key === "accountNumber" || c.key === "ifscCode") ? "#fef3c7" : null }
        )
      )
    );
  });
  body.push(
    NEFT_COLUMNS.map((c, i) =>
      c.amount
        ? { text: formatAmount(totals[c.key as keyof typeof totals]), alignment: "right", bold: true }
        : { text: i === 0 ? `Total (${rows.length})` : "", bold: true }
    )
  );

  const docDefinition: any = {
    defaultStyle: { font: PDF_FONT, fontSize: 8 },
    pageOrientation: "landscape",
    pageSize: "A4",
    pageMargins: [20, 30, 20, 30],
    content: [
      { text: dairyName, fontSize: 14, bold: true, alignment: "center", margin: [0, 0, 0, 2] },
      { text: title, fontSize: 11, bold: true, alignment: "center", margin: [0, 0, 0, 2] },
      { text: `From Date: ${fromDate}     To Date: ${toDate}`, alignment: "center", fontSize: 9, margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ["auto", "auto", "*", "auto", "auto", "auto", "auto", "auto", "auto"],
          body,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 || rowIndex === body.length - 1 ? "#d1d5db" : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
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
