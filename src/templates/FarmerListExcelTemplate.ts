import * as XLSX from 'xlsx';

export interface FarmerListExcelSection {
  vlcName: string;
  farmers: any[];
}

const HEADER = ['Farmer ID', 'Name', 'Contact', 'Milk Type', 'Rate Chart', 'Bank Name', 'Account Number', 'IFSC Code'];

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Farmer list for one or more dairies on a single sheet, laid out like the
 * on-screen table: one header row, then each dairy's heading row followed by
 * its farmers, one dairy after another, and the total at the end.
 */
export const generateFarmerListExcelForDairies = (sections: FarmerListExcelSection[]) => {
  const total = sections.reduce((sum, s) => sum + s.farmers.length, 0);
  const lastCol = HEADER.length - 1;

  const rows: (string | number)[][] = [
    ['Farmer List'],
    [`Date: ${formatDate(new Date())}`],
    [sections.length > 1 ? `${sections.length} dairies · Total Farmers: ${total}` : `Total Farmers: ${total}`],
    [],
    HEADER,
  ];
  const merges: XLSX.Range[] = [0, 1, 2].map((r) => ({ s: { r, c: 0 }, e: { r, c: lastCol } }));

  sections.forEach(({ vlcName, farmers }) => {
    merges.push({ s: { r: rows.length, c: 0 }, e: { r: rows.length, c: lastCol } });
    rows.push([`${vlcName}  (${farmers.length} Farmers)`]);

    if (!farmers.length) {
      merges.push({ s: { r: rows.length, c: 0 }, e: { r: rows.length, c: lastCol } });
      rows.push(['No farmers registered for this dairy']);
      return;
    }
    farmers.forEach((farmer) =>
      rows.push([
        String(farmer.username || ''),
        farmer.fullName || '',
        String(farmer.mobile_number || ''),
        farmer.milkType || '',
        farmer.rateChart || '',
        farmer.bankName || '-',
        // Text, so Excel does not turn long account numbers into 1.23E+13.
        String(farmer.accountNumber || '-'),
        farmer.ifscCode || '-',
      ])
    );
  });

  rows.push([]);
  rows.push(['Total Farmers', total]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 11 }, { wch: 30 }, { wch: 14 }, { wch: 11 }, { wch: 34 }, { wch: 24 }, { wch: 22 }, { wch: 14 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'Farmer List');
  const fileName = sections.length === 1
    ? `Farmer_List_${sections[0].vlcName}.xlsx`
    : `Farmer_List_${sections.length}_Dairies.xlsx`;
  XLSX.writeFile(workbook, fileName.replace(/[\\/:*?"<>|]/g, '-'));
};

export const generateFarmerListExcel = (vlcName: string, farmers: any[]) =>
  generateFarmerListExcelForDairies([{ vlcName, farmers }]);
