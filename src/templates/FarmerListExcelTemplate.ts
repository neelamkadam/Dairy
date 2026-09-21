import * as XLSX from 'xlsx';

export interface FarmerListExcelSection {
  vlcName: string;
  farmers: any[];
}

const farmerRows = (vlcName: string, farmers: any[]) => [
  ['Farmer List'],
  [`VLC: ${vlcName}`],
  [`Total Farmers: ${farmers.length}`],
  [],
  ['Farmer ID', 'Name', 'Contact', 'Milk Type', 'Rate Chart', 'Bank Name', 'Account Number', 'IFSC Code'],
  ...farmers.map(farmer => [
    farmer.username || '',
    farmer.fullName || '',
    farmer.mobile_number || '',
    farmer.milkType || '',
    farmer.rateChart || '',
    farmer.bankName || '-',
    farmer.accountNumber || '-',
    farmer.ifscCode || '-'
  ])
];

// Excel sheet names: at most 31 characters, none of []:*?/\ , unique in the workbook.
const sheetName = (label: string, used: Set<string>) => {
  const base = (label.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim() || 'Dairy').slice(0, 31);
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n++) {
    const suffix = ` (${n})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name.toLowerCase());
  return name;
};

/**
 * Farmer list for one or more dairies. One dairy: the single 'Farmer List'
 * sheet as before. Several: a Summary sheet, then one sheet per dairy in order.
 */
export const generateFarmerListExcelForDairies = (sections: FarmerListExcelSection[]) => {
  const workbook = XLSX.utils.book_new();

  if (sections.length === 1) {
    const [{ vlcName, farmers }] = sections;
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(farmerRows(vlcName, farmers)), 'Farmer List');
    XLSX.writeFile(workbook, `Farmer_List_${vlcName}.xlsx`);
    return;
  }

  const total = sections.reduce((sum, s) => sum + s.farmers.length, 0);
  const used = new Set<string>(['summary']);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Farmer List'],
    [`Dairies: ${sections.length}`],
    [`Total Farmers: ${total}`],
    [],
    ['#', 'VLC', 'Farmers'],
    ...sections.map((s, i) => [i + 1, s.vlcName, s.farmers.length]),
    ['', 'Total', total],
  ]), 'Summary');

  sections.forEach(({ vlcName, farmers }) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(farmerRows(vlcName, farmers)), sheetName(vlcName, used));
  });

  XLSX.writeFile(workbook, `Farmer_List_${sections.length}_Dairies.xlsx`);
};

export const generateFarmerListExcel = (vlcName: string, farmers: any[]) =>
  generateFarmerListExcelForDairies([{ vlcName, farmers }]);
