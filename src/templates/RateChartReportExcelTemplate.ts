import * as XLSX from 'xlsx';

export const generateRateChartReportExcel = (
  vlcName: string,
  milkType: string,
  rateMatrix: any[][]
) => {
  const worksheetData = [
    ...rateMatrix
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rate Chart');

  XLSX.writeFile(workbook, `Rate_Chart_${vlcName}_${milkType}.xlsx`);
};
