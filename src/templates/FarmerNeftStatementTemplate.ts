import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import { NEFT_COLUMNS, NeftGroup, formatAmount, neftTotals } from "@/utils/farmerNeftStatement";

const fileName = (ext: string, fromDate: string, toDate: string) =>
  `Farmer_NEFT_Statement_${fromDate}_${toDate}.${ext}`.replace(/\//g, "-");

const groupHeading = (g: NeftGroup) => `${g.label}  (${g.rows.length} Farmers)`;

// Header row, then each VLC's heading row and its farmers, then the total row (as in the PDF).
// Farmer IDs and account numbers stay text so Excel keeps leading zeros and does not
// turn long account numbers into 1.23E+13.
export const generateFarmerNeftExcel = (groups: NeftGroup[], fromDate: string, toDate: string) => {
  const rows = groups.flatMap((g) => g.rows);
  const totals = neftTotals(rows);
  const lastCol = NEFT_COLUMNS.length - 1;

  const aoa: (string | number)[][] = [NEFT_COLUMNS.map((c) => c.label)];
  const merges: XLSX.Range[] = [];
  const headingRows = new Set<number>();
  groups.forEach((g) => {
    headingRows.add(aoa.length);
    merges.push({ s: { r: aoa.length, c: 0 }, e: { r: aoa.length, c: lastCol } });
    aoa.push([groupHeading(g)]);
    g.rows.forEach((r) =>
      aoa.push(NEFT_COLUMNS.map((c) => (c.amount ? Number((r[c.key] as number).toFixed(2)) : String(r[c.key] || ""))))
    );
  });
  aoa.push(
    NEFT_COLUMNS.map((c, i) =>
      c.amount
        ? Number(totals[c.key as keyof typeof totals].toFixed(2))
        : i === 0 ? `Total (${rows.length})` : ""
    )
  );

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let r = 1; r <= range.e.r; r++) {
    if (headingRows.has(r)) continue;
    NEFT_COLUMNS.forEach((c, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c: i })];
      if (!cell) return;
      if (c.amount) cell.z = "0.00";
      else cell.t = "s";
    });
  }
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 11 }, { wch: 22 }, { wch: 32 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];

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
