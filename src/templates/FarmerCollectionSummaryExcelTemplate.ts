import * as XLSX from 'xlsx';
import {
  CollectionSummary,
  SUMMARY_COLUMNS,
  SummaryColumn,
  SummaryFarmerRow,
  SummaryTotals,
} from '@/utils/farmerCollectionSummary';

export const generateFarmerCollectionSummaryExcel = (
  summary: CollectionSummary,
  dairyName: string,
  fromDate: string,
  toDate: string,
  columns: SummaryColumn[] = SUMMARY_COLUMNS,
  fileTitle = 'Farmer_Collection_Summary'
) => {
  const totalCols = 2 + columns.length;
  const values = (t: SummaryTotals | SummaryFarmerRow) =>
    columns.map((c) =>
      c.text
        ? String((t as unknown as Record<string, unknown>)[c.key] ?? '')
        : Number((t[c.key as keyof SummaryTotals] as number).toFixed(c.digits))
    );

  const rows: (string | number)[][] = [
    [dairyName],
    ['', 'From Date', fromDate, 'To Date', toDate],
    ['Sr No', 'Farmer Name', ...columns.map((c) => c.label)],
  ];

  summary.groups.forEach((g) => {
    rows.push(['VSP Name', g.label]);
    g.farmers.forEach((f, i) => rows.push([i + 1, f.farmerName, ...values(f)]));
    rows.push(['', g.label, ...values(g.total)]);
  });
  rows.push([]);
  rows.push(['', 'Total :', ...values(summary.total)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Keep the fixed decimals visible in Excel (e.g. 0.00 instead of 0).
  const range = XLSX.utils.decode_range(ws['!ref'] as string);
  for (let r = 3; r <= range.e.r; r++) {
    columns.forEach((c, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c: i + 2 })];
      if (cell && cell.t === 'n') cell.z = c.digits ? `#,##0.${'0'.repeat(c.digits)}` : '0';
    });
  }

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
  ws['!cols'] = [{ wch: 9 }, { wch: 30 }, ...columns.map((c) => ({ wch: Math.max(10, c.label.length + 2) }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${fileTitle}_${fromDate}_${toDate}.xlsx`.replace(/\//g, '-'));
};
