import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import { format, parseISO } from "date-fns";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import {
  COMPARISON_METRICS,
  ComparisonTotals,
  DayComparison,
  formatFigure,
} from "@/utils/farmerDayComparison";

const dayLabel = (d: string) => format(parseISO(d), "dd/MM/yy");
const fileName = (c: DayComparison, ext: string) =>
  `Farmer_Collection_Difference_${c.yesterdayDate}_vs_${c.todayDate}.${ext}`;
const METRIC_COUNT = COMPARISON_METRICS.length;
const COL_COUNT = 3 + METRIC_COUNT * 3;

const blockValues = (t: ComparisonTotals) => [
  ...COMPARISON_METRICS.map((m) => Number(t.yesterday[m.key].toFixed(m.digits))),
  ...COMPARISON_METRICS.map((m) => Number(t.today[m.key].toFixed(m.digits))),
  ...COMPARISON_METRICS.map((m) => Number(t.diff[m.key].toFixed(m.digits))),
];

export const generateFarmerDayComparisonExcel = (c: DayComparison, dairyName: string, filterLine: string) => {
  const rows: (string | number)[][] = [
    [dairyName],
    [`Yesterday: ${dayLabel(c.yesterdayDate)}   Today: ${dayLabel(c.todayDate)}   ${filterLine}`],
    [
      "Sr No",
      "Farmer ID",
      "Farmer Name",
      `Yesterday (${dayLabel(c.yesterdayDate)})`, ...Array(METRIC_COUNT - 1).fill(""),
      `Today (${dayLabel(c.todayDate)})`, ...Array(METRIC_COUNT - 1).fill(""),
      "Difference", ...Array(METRIC_COUNT - 1).fill(""),
    ],
    ["", "", "", ...[0, 1, 2].flatMap(() => COMPARISON_METRICS.map((m) => m.label))],
  ];
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COL_COUNT - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: COL_COUNT - 1 } },
    ...[0, 1, 2].map((i) => ({ s: { r: 2, c: i }, e: { r: 3, c: i } })),
    ...[0, 1, 2].map((b) => ({ s: { r: 2, c: 3 + b * METRIC_COUNT }, e: { r: 2, c: 2 + (b + 1) * METRIC_COUNT } })),
  ];

  c.groups.forEach((g) => {
    merges.push({ s: { r: rows.length, c: 2 }, e: { r: rows.length, c: COL_COUNT - 1 } });
    rows.push(["VSP Name", "", g.label]);
    g.farmers.forEach((f, i) => rows.push([i + 1, f.farmerCode, f.farmerName, ...blockValues(f)]));
    rows.push(["", "", g.label, ...blockValues(g.total)]);
  });
  rows.push([]);
  rows.push(["", "", "Total :", ...blockValues(c.total)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let r = 4; r <= range.e.r; r++) {
    for (let col = 3; col < COL_COUNT; col++) {
      const cellRef = ws[XLSX.utils.encode_cell({ r, c: col })];
      if (cellRef && cellRef.t === "n") cellRef.z = "#,##0.00";
    }
    const idCell = ws[XLSX.utils.encode_cell({ r, c: 1 })];
    if (idCell) idCell.t = "s";
  }
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 9 }, { wch: 10 }, { wch: 30 }, ...Array(METRIC_COUNT * 3).fill({ wch: 11 })];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Difference");
  XLSX.writeFile(wb, fileName(c, "xlsx"));
};

export const generateFarmerDayComparisonPDF = (c: DayComparison, dairyName: string, filterLine: string) => {
  const figureCells = (t: ComparisonTotals, bold = false) => [
    ...COMPARISON_METRICS.map((m) => ({ text: formatFigure(t.yesterday[m.key], m.digits), alignment: "right", bold })),
    ...COMPARISON_METRICS.map((m) => ({ text: formatFigure(t.today[m.key], m.digits), alignment: "right", bold })),
    ...COMPARISON_METRICS.map((m) => {
      const v = Number(t.diff[m.key].toFixed(m.digits));
      return {
        text: formatFigure(t.diff[m.key], m.digits, true),
        alignment: "right",
        bold,
        color: v < 0 ? "#b91c1c" : v > 0 ? "#047857" : "#6b7280",
      };
    }),
  ];
  const span = (text: string, colSpan: number, extra: Record<string, unknown> = {}) => [
    { text, colSpan, ...extra },
    ...Array(colSpan - 1).fill({}),
  ];

  const body: any[][] = [
    [
      { text: "Sr No", bold: true, rowSpan: 2 },
      { text: "Farmer ID", bold: true, rowSpan: 2 },
      { text: "Farmer Name", bold: true, rowSpan: 2 },
      ...span(`Yesterday (${dayLabel(c.yesterdayDate)})`, METRIC_COUNT, { bold: true, alignment: "center" }),
      ...span(`Today (${dayLabel(c.todayDate)})`, METRIC_COUNT, { bold: true, alignment: "center", fillColor: "#dbeafe" }),
      ...span("Difference", METRIC_COUNT, { bold: true, alignment: "center", fillColor: "#fef3c7" }),
    ],
    [{}, {}, {}, ...[0, 1, 2].flatMap(() => COMPARISON_METRICS.map((m) => ({ text: m.label, bold: true, alignment: "right" })))],
  ];
  const shaded = new Set<number>();

  c.groups.forEach((g) => {
    body.push([{ text: "VSP Name", bold: true, colSpan: 2 }, {}, ...span(g.label, COL_COUNT - 2, { bold: true })]);
    g.farmers.forEach((f, i) =>
      body.push([{ text: String(i + 1), alignment: "right" }, f.farmerCode, f.farmerName, ...figureCells(f)])
    );
    shaded.add(body.length);
    body.push([...span(g.label, 3, { bold: true }), ...figureCells(g.total, true)]);
  });
  shaded.add(body.length);
  body.push([...span("Total :", 3, { bold: true }), ...figureCells(c.total, true)]);

  const docDefinition: any = {
    defaultStyle: { font: PDF_FONT, fontSize: 7 },
    pageOrientation: "landscape",
    pageSize: "A4",
    pageMargins: [20, 30, 20, 30],
    content: [
      { text: dairyName, fontSize: 14, bold: true, alignment: "center", margin: [0, 0, 0, 2] },
      { text: "Farmer Collection — Day Difference", fontSize: 11, bold: true, alignment: "center", margin: [0, 0, 0, 2] },
      {
        text: `Yesterday: ${dayLabel(c.yesterdayDate)}     Today: ${dayLabel(c.todayDate)}     ${filterLine}`,
        alignment: "center",
        fontSize: 9,
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 2,
          dontBreakRows: true,
          widths: ["auto", "auto", "*", ...Array(METRIC_COUNT * 3).fill("auto")],
          body,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex < 2) return "#d1d5db";
            if (shaded.has(rowIndex)) return "#f3f4f6";
            return null;
          },
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingLeft: () => 3,
          paddingRight: () => 3,
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

  pdfMake.createPdf(docDefinition).download(fileName(c, "pdf"));
};
