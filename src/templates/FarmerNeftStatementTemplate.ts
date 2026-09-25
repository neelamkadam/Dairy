import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import { NEFT_COLUMNS, NeftRow, formatAmount, neftTotals } from "@/utils/farmerNeftStatement";

const fileName = (ext: string, fromDate: string, toDate: string) =>
  `Farmer_NEFT_Statement_${fromDate}_${toDate}.${ext}`.replace(/\//g, "-");

// Bank-upload sheet: header row + one row per farmer, nothing else.
// Account numbers stay text so Excel does not turn them into 1.23E+13.
export const generateFarmerNeftExcel = (rows: NeftRow[], fromDate: string, toDate: string) => {
  const aoa = [
    NEFT_COLUMNS.map((c) => c.label),
    ...rows.map((r) => NEFT_COLUMNS.map((c) => (c.amount ? Number((r[c.key] as number).toFixed(2)) : String(r[c.key] || "")))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let r = 1; r <= range.e.r; r++) {
    NEFT_COLUMNS.forEach((c, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c: i })];
      if (!cell) return;
      if (c.amount) cell.z = "0.00";
      else cell.t = "s";
    });
  }
  ws["!cols"] = [{ wch: 22 }, { wch: 32 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NEFT");
  XLSX.writeFile(wb, fileName("xlsx", fromDate, toDate));
};

export const generateFarmerNeftPDF = (
  rows: NeftRow[],
  dairyName: string,
  title: string,
  fromDate: string,
  toDate: string
) => {
  const totals = neftTotals(rows);
  const body: any[][] = [
    NEFT_COLUMNS.map((c) => ({ text: c.label, bold: true, alignment: c.amount ? "right" : "left" })),
    ...rows.map((r) =>
      NEFT_COLUMNS.map((c) =>
        c.amount
          ? { text: formatAmount(r[c.key] as number), alignment: "right" }
          : { text: String(r[c.key] || ""), fillColor: r.missingBank && (c.key === "accountNumber" || c.key === "ifscCode") ? "#fef3c7" : null }
      )
    ),
    NEFT_COLUMNS.map((c, i) =>
      c.amount
        ? { text: formatAmount(totals[c.key as keyof typeof totals]), alignment: "right", bold: true }
        : { text: i === 0 ? `Total (${rows.length})` : "", bold: true }
    ),
  ];

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
        table: { headerRows: 1, widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto", "auto"], body },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 || rowIndex === body.length - 1 ? "#d1d5db" : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
      },
    ],
  };

  pdfMake.createPdf(docDefinition).download(fileName("pdf", fromDate, toDate));
};
