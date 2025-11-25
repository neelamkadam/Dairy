import * as XLSX from 'xlsx';

export const generateFarmerListExcel = (
  vlcName: string,
  farmers: any[]
) => {
  const worksheetData = [
    ['Farmer List'],
    [`VLC: ${vlcName}`],
    [`Total Farmers: ${farmers.length}`],
    [],
    ['Farmer ID', 'Name', 'Contact', 'Milk Type', 'Rate Chart'],
    ...farmers.map(farmer => [
      farmer.username || '',
      farmer.fullName || '',
      farmer.mobile_number || '',
      farmer.milkType || '',
      farmer.rateChart || ''
    ])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Farmer List');

  XLSX.writeFile(workbook, `Farmer_List_${vlcName}.xlsx`);
};
