import * as XLSX from 'xlsx';
import { collectionTotals } from '@/utils/farmerCollectionTotals';

export const generateFarmerCollectionExcel = (
  reportData: any[],
  vlcName: string,
  fromDate: string,
  toDate: string,
  shift: string,
  milkType: string
) => {
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Same totals as the cards on the report screen.
  const totals = collectionTotals(reportData);
  const totalRow = [
    'Total',
    '',
    `${totals.entries} entries`,
    '',
    round2(totals.liters),
    round2(totals.kg),
    round2(totals.fat),
    round2(totals.snf),
    round2(totals.clr),
    '',
    '',
    round2(totals.rate),
    round2(totals.amount),
  ];

  const worksheetData = [
    ['Farmer Collection Report'],
    [`VLC: ${vlcName}`],
    [`Period: ${fromDate} to ${toDate} | Shift: ${shift} | Milk Type: ${milkType}`],
    [],
    ['Date', 'VLC Id', 'Farmer Id', 'Name', 'Liter', 'Kg', 'Fat', 'Snf', 'Clr', 'Milk Type', 'Shift', 'Rate', 'Amount'],
    ...reportData.map(row => [
      new Date(row.created_at).toLocaleDateString('en-GB'),
      row.vlc_id ?? '',
      row.farmer_code,
      row.farmer_name,
      row.quantity,
      (parseFloat(row.quantity) * 1.03).toFixed(2),
      row.fat,
      row.snf,
      row.clr,
      row.type,
      row.shift,
      row.rate,
      row.amount
    ]),
    totalRow,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Farmer Collection');

  XLSX.writeFile(workbook, `Farmer_Collection_${vlcName}_${fromDate}_${toDate}.xlsx`);
};
