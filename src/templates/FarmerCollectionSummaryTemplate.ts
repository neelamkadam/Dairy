import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import {
  CollectionSummary,
  SUMMARY_COLUMNS,
  SummaryColumn,
  SummaryFarmerRow,
  SummaryTotals,
  formatSummaryValue,
} from "@/utils/farmerCollectionSummary";

export const generateFarmerCollectionSummaryPDF = (
  summary: CollectionSummary,
  dairyName: string,
  fromDate: string,
  toDate: string,
  columns: SummaryColumn[] = SUMMARY_COLUMNS,
  reportTitle = "",
  fileTitle = "Farmer_Collection_Summary"
) => {
  const totalCols = 2 + columns.length;
  const values = (t: SummaryTotals | SummaryFarmerRow, bold = false) =>
    columns.map((c) => ({ text: formatSummaryValue(t, c), alignment: c.text ? "center" : "right", bold }));
  const spanRow = (first: string, label: string) => [
    { text: first, bold: true },
    { text: label, bold: true, colSpan: totalCols - 1 },
    ...Array(totalCols - 2).fill({}),
  ];

  const body: any[][] = [
    [
      { text: "Sr No", style: "tableHeader" },
      { text: "Farmer Name", style: "tableHeader" },
      ...columns.map((c) => ({ text: c.label, style: "tableHeader", alignment: "center" })),
    ],
  ];
  const subtotalRows = new Set<number>();

  summary.groups.forEach((g) => {
    body.push(spanRow("VSP Name", g.label));
    g.farmers.forEach((f, i) => body.push([{ text: String(i + 1), alignment: "right" }, f.farmerName, ...values(f)]));
    subtotalRows.add(body.length);
    body.push(["", { text: g.label, bold: true }, ...values(g.total, true)]);
  });
  subtotalRows.add(body.length);
  body.push(["", { text: "Total :", bold: true }, ...values(summary.total, true)]);

  const docDefinition: any = {
    defaultStyle: { font: PDF_FONT, fontSize: columns.length > 13 ? 6.5 : 7 },
    pageOrientation: "landscape",
    pageSize: "A4",
    pageMargins: [20, 30, 20, 30],
    content: [
      { text: dairyName, style: "header" },
      ...(reportTitle ? [{ text: reportTitle, alignment: "center", fontSize: 11, bold: true, margin: [0, 0, 0, 2] }] : []),
      { text: `From Date: ${fromDate}     To Date: ${toDate}`, alignment: "center", fontSize: 9, margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", ...columns.map(() => "auto")],
          body,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return "#d1d5db";
            if (subtotalRows.has(rowIndex)) return "#f3f4f6";
            return null;
          },
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingLeft: () => 3,
          paddingRight: () => 3,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      },
    ],
    styles: {
      header: { fontSize: 14, bold: true, alignment: "center", margin: [0, 0, 0, 4] },
      tableHeader: { bold: true, fontSize: 7.5 },
    },
  };

  pdfMake.createPdf(docDefinition).download(`${fileTitle}_${fromDate}_${toDate}.pdf`.replace(/\//g, "-"));
};
