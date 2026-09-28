import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import { VLC_NEFT_COLUMNS, VlcNeftRow, formatAmount, vlcNeftTotals } from "@/utils/vlcCommissionNeft";

const fileName = (ext: string, fromDate: string, toDate: string) =>
  `VLC_Commission_NEFT_${fromDate}_${toDate}.${ext}`.replace(/\//g, "-");

const totalRow = <T>(rows: VlcNeftRow[], amountCell: (n: number) => T, blank: T, label: T) => {
  const totals = vlcNeftTotals(rows);
  return VLC_NEFT_COLUMNS.map((c, i) => (c.amount ? amountCell(totals[c.key] ?? 0) : i === 0 ? label : blank));
};

// Header row, one row per VLC, then "Total Amount". A/C numbers stay text so
// Excel does not turn them into 1.23E+13.
export const generateVlcCommissionNeftExcel = (rows: VlcNeftRow[], fromDate: string, toDate: string) => {
  const aoa: (string | number)[][] = [
    VLC_NEFT_COLUMNS.map((c) => c.label),
    ...rows.map((r) =>
      VLC_NEFT_COLUMNS.map((c) => (c.amount ? Number((r[c.key] as number).toFixed(2)) : String(r[c.key] ?? "")))
    ),
    totalRow<string | number>(rows, (n) => Number(n.toFixed(2)), "", "Total Amount"),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let r = 1; r <= range.e.r; r++) {
    VLC_NEFT_COLUMNS.forEach((c, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c: i })];
      if (!cell) return;
      if (c.amount) cell.z = "0.00";
      else cell.t = "s";
    });
  }
  ws["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "VLC Commission NEFT");
  XLSX.writeFile(wb, fileName("xlsx", fromDate, toDate));
};

export const generateVlcCommissionNeftPDF = (
  rows: VlcNeftRow[],
  dairyName: string,
  title: string,
  fromDate: string,
  toDate: string
) => {
  const body: any[][] = [
    VLC_NEFT_COLUMNS.map((c) => ({ text: c.label, bold: true, alignment: c.amount ? "right" : "left" })),
    ...rows.map((r) =>
      VLC_NEFT_COLUMNS.map((c) =>
        c.amount
          ? { text: formatAmount(r[c.key] as number), alignment: "right", color: (r[c.key] as number) < 0 ? "#b91c1c" : undefined }
          : { text: String(r[c.key] ?? ""), fillColor: r.missingBank && (c.key === "accountNumber" || c.key === "ifscCode") ? "#fef3c7" : null }
      )
    ),
    totalRow<any>(
      rows,
      (n) => ({ text: formatAmount(n), alignment: "right", bold: true }),
      { text: "" },
      { text: "Total Amount", bold: true }
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
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ["auto", "*", "auto", "auto", "*", "auto", "auto", "auto", "auto"],
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
