import * as XLSX from 'xlsx';

export const generateShiftReportExcel = (
  reportData: any[],
  vlcName: string,
  date: string,
  shift: string,
  milkType: string,
  totals: any
) => {
  const worksheetData = [
    ['Daily Shift Report'],
    [`VLC: ${vlcName}`],
    [`Date: ${date} | Shift: ${shift} | Milk Type: ${milkType || "All"}`],
    [],
    ['Farmer ID', 'Quantity', 'Fat', 'SNF', 'Milk Type', 'Rate', 'Total Amount'],
    ...reportData.map(row => [
      row.code,
      row.quantity,
      row.fat,
      row.snf,
      row.type,
      row.rate,
      row.amount
    ]),
    [],
    ['Summary Statistics'],
    ['Total Quantity (L)', 'Average Fat (%)', 'Average SNF (%)', 'Total Amount (₹)'],
    [totals.quantity, totals.avgFat, totals.avgSnf, totals.totalAmount]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Shift Report');

  XLSX.writeFile(workbook, `Shift_Report_${vlcName}_${date}_${shift}.xlsx`);
};
