import * as XLSX from 'xlsx';

export const generateTotalCollectionReportExcel = (
  vlcName: string,
  startDate: string,
  startShift: string,
  endDate: string,
  endShift: string,
  milkType: string,
  summary: any
) => {
  const worksheetData = [
    ['Total Collection Report'],
    [`VLC: ${vlcName}`],
    [`Period: ${startDate} (${startShift}) to ${endDate} (${endShift}) | Milk Type: ${milkType}`],
    [],
    ['Metric', 'Value'],
    ['Total Collection', `${parseFloat(summary.total_liters).toFixed(2)} L`],
    ['Average FAT', `${parseFloat(summary.avg_fat).toFixed(2)}%`],
    ['Average SNF', `${parseFloat(summary.avg_snf).toFixed(2)}%`],
    ['Total Amount', `₹${parseFloat(summary.total_amount).toFixed(2)}`],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Total Collection');

  XLSX.writeFile(workbook, `Total_Collection_Report_${vlcName}_${startDate}_${endDate}.xlsx`);
};
