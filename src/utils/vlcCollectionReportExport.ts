import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { registerDevanagariFont } from "@/utils/pdfFonts";
import {
  totalsOfRows,
  type VlcReportGroup,
  type VlcReportStatus,
  type VlcReportSummary,
} from "@/pages/Reports/vlcCollectionReportData";

interface ExportInput {
  date: string; // yyyy-MM-dd
  shift: "Morning" | "Evening";
  groups: VlcReportGroup[]; // what is on screen (filter + search applied)
  summary: VlcReportSummary; // the whole shift, for the header
  filterLabel?: string | null; // e.g. "Pending analysis" when a status filter is on
  numberOf?: (vlcId: string) => number | null; // VLC numbering (1, 2, 3 …) when enabled
}

// File labels stay in English like the other report exports — the embedded PDF
// font covers Latin and Devanagari only.
export const STATUS_TEXT: Record<VlcReportStatus, string> = {
  completed: "Completed",
  pending: "Pending analysis",
  not_collected: "Not collected",
};
const STATUS_COLOR: Record<VlcReportStatus, [number, number, number]> = {
  completed: [22, 163, 74],
  pending: [217, 119, 6],
  not_collected: [220, 38, 38],
};

const fixed = (n: number | null, digits = 2) => (n == null ? "" : n.toFixed(digits));
const displayDate = (d: string) => d.split("-").reverse().join("-");

const buildTable = ({ groups, numberOf }: ExportInput) => {
  const numbered = !!numberOf && groups.some((g) => numberOf(g.vlcId) != null);
  const head = [
    ...(numbered ? ["No."] : []),
    "VLC ID", "VLC Name", "Status", "Sample #", "Type", "Weight (kg)", "FAT", "SNF", "CLR", "Rate", "Amount",
  ];
  const statuses: VlcReportStatus[] = [];
  const body = groups.flatMap((g) =>
    g.rows.map((r, i) => {
      statuses.push(r.status);
      return [
        ...(numbered ? [i === 0 ? String(numberOf!(g.vlcId) ?? "") : ""] : []),
        i === 0 ? g.vlcId : "",
        i === 0 ? g.vlcName : "",
        STATUS_TEXT[r.status],
        r.sampleId != null ? String(r.sampleId) : "",
        r.type ?? "",
        fixed(r.weight),
        fixed(r.fat),
        fixed(r.snf),
        fixed(r.clr),
        fixed(r.rate),
        fixed(r.amount),
      ];
    })
  );
  // Totals of the rows being exported (not the whole shift), so they add up on paper.
  const totals = totalsOfRows(groups.flatMap((g) => g.rows));
  const totalRow = [
    ...(numbered ? [""] : []),
    "Total", "", "", "", "", fixed(totals.weight), fixed(totals.fat), fixed(totals.snf), "", "", fixed(totals.amount),
  ];
  return { head, body, totalRow, statuses, statusCol: numbered ? 3 : 2 };
};

const headerLines = ({ date, shift, summary, filterLabel }: ExportInput) => [
  `Date: ${displayDate(date)}    Shift: ${shift}`,
  `VLCs: ${summary.totalVlcs}  ·  Completed: ${summary.completedVlcs}  ·  Pending analysis: ${summary.pendingVlcs}  ·  Not collected: ${summary.notCollectedVlcs}`,
  ...(filterLabel ? [`Showing: ${filterLabel}`] : []),
];

const fileBase = (input: ExportInput) => `VLC_Collection_Entry_Report_${input.date}_${input.shift}`;

export const exportVlcCollectionReportPdf = async (input: ExportInput) => {
  const doc = new jsPDF({ orientation: "landscape" });
  // VLC names are often Marathi.
  const font = await registerDevanagariFont(doc);
  const { head, body, totalRow, statuses, statusCol } = buildTable(input);

  doc.setFont(font, "normal");
  doc.setFontSize(16);
  doc.text("VLC Collection Entry Report", 14, 15);
  doc.setFontSize(10);
  const lines = headerLines(input);
  lines.forEach((line, i) => doc.text(line, 14, 22 + i * 6));

  autoTable(doc, {
    startY: 22 + lines.length * 6 + 2,
    head: [head],
    body: [...body, totalRow],
    theme: "grid",
    styles: { font, fontSize: 9 },
    headStyles: { font, fillColor: [66, 139, 202] },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.row.index === body.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [226, 232, 240];
      } else if (data.column.index === statusCol) {
        data.cell.styles.textColor = STATUS_COLOR[statuses[data.row.index]];
      }
      if (data.column.index >= head.length - 6) data.cell.styles.halign = "right";
    },
  });

  doc.save(`${fileBase(input)}.pdf`);
};

export const exportVlcCollectionReportExcel = (input: ExportInput) => {
  const { head, body, totalRow } = buildTable(input);
  const sheet = XLSX.utils.aoa_to_sheet([
    ["VLC Collection Entry Report"],
    ...headerLines(input).map((line) => [line]),
    [],
    head,
    ...body,
    totalRow,
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "VLC Collection");
  XLSX.writeFile(book, `${fileBase(input)}.xlsx`);
};
