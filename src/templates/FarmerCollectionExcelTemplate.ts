import * as XLSX from 'xlsx';

export const generateFarmerCollectionExcel = (
  reportData: any[],
  vlcName: string,
  fromDate: string,
  toDate: string,
  shift: string,
  milkType: string
) => {
  const worksheetData = [
    ['Farmer Collection Report'],
    [`VLC: ${vlcName}`],
    [`Period: ${fromDate} to ${toDate} | Shift: ${shift} | Milk Type: ${milkType}`],
    [],
    ['Date', 'Farmer Id', 'Name', 'Liter', 'Kg', 'Fat', 'Snf', 'Clr', 'Milk Type', 'Shift', 'Rate', 'Amount'],
    ...reportData.map(row => [
      new Date(row.created_at).toLocaleDateString('en-GB'),
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
    ])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Farmer Collection');

  XLSX.writeFile(workbook, `Farmer_Collection_${vlcName}_${fromDate}_${toDate}.xlsx`);
};
