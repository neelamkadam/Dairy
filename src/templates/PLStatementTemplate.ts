import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { PLLine, PLDailyRow, PLPeriodCharge } from "@/pages/Reports/PLStatement";

if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;
}

export interface PLStatementPdfData {
  vlcName: string;
  dairyName: string;
  fromDate: string;
  toDate: string;
  income: PLLine[];
  expenses: PLLine[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  status: string;
  marginPercent: number;
  netPerLiterCollected: number;
  fixedCommissionTotal: number;
  periodCharges: PLPeriodCharge[];
  daily: PLDailyRow[];
  collectionsWithoutCommission: number;
}

const money = (value: number) =>
  `${value < 0 ? '-' : ''}${Math.abs(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${date.getDate()} - ${months[date.getMonth()]} - ${date.getFullYear()}`;
};

const sectionRows = (lines: PLLine[], emptyLabel: string) => {
  if (!lines.length) {
    return [[
      { text: emptyLabel, style: 'tableValue', colSpan: 2, alignment: 'center', italics: true },
      {},
    ]];
  }
  return lines.map((line) => ([
    {
      stack: [
        { text: line.label, style: 'tableValue' },
        ...(line.hint ? [{ text: line.hint, style: 'hint' }] : []),
      ],
    },
    { text: money(line.amount), style: 'tableValue', alignment: 'right' },
  ]));
};

export const generatePLStatementPDF = (data: PLStatementPdfData) => {
  const {
    vlcName, dairyName, fromDate, toDate,
    income, expenses, totalIncome, totalExpenses,
    netProfit, status, marginPercent, netPerLiterCollected,
    fixedCommissionTotal, periodCharges, daily, collectionsWithoutCommission,
  } = data;

  const isProfit = netProfit >= 0;
  const dailyNetSum = daily.reduce((sum, row) => sum + row.net, 0);

  const content: any[] = [
    {
      columns: [
        { text: '', width: '*' },
        {
          stack: [
            { text: vlcName, style: 'branchName', alignment: 'center' },
            { text: `Dairy: ${dairyName}`, style: 'userName', alignment: 'center' },
          ],
          width: 'auto',
        },
        { text: `Date: ${formatDate(new Date().toISOString())}`, style: 'rightInfo', alignment: 'right', width: '*' },
      ],
      margin: [0, 0, 0, 20],
    },
    { text: 'Profit & Loss Statement', style: 'header' },
    {
      text: `Period: ${formatDate(fromDate)} to ${formatDate(toDate)}`,
      style: 'subheader',
      margin: [0, 0, 0, 24],
    },
    {
      table: {
        headerRows: 1,
        widths: ['*', 120],
        body: [
          [
            { text: 'Income', style: 'tableHeader' },
            { text: 'Amount (Rs.)', style: 'tableHeader', alignment: 'right' },
          ],
          ...sectionRows(income, 'No income recorded for this period'),
          [
            { text: 'Total Income', style: 'totalLabel' },
            { text: money(totalIncome), style: 'totalValue', alignment: 'right' },
          ],
        ],
      },
      margin: [0, 0, 0, 20],
    },
    {
      table: {
        headerRows: 1,
        widths: ['*', 120],
        body: [
          [
            { text: 'Expenses', style: 'tableHeader' },
            { text: 'Amount (Rs.)', style: 'tableHeader', alignment: 'right' },
          ],
          ...sectionRows(expenses, 'No expenses recorded for this period'),
          [
            { text: 'Total Expenses', style: 'totalLabel' },
            { text: money(totalExpenses), style: 'totalValue', alignment: 'right' },
          ],
        ],
      },
      margin: [0, 0, 0, 20],
    },
    {
      table: {
        widths: ['*', 120],
        body: [
          [
            { text: isProfit ? 'Net Profit' : 'Net Loss', style: 'netLabel' },
            { text: money(netProfit), style: 'netValue', alignment: 'right' },
          ],
          [
            { text: 'Status', style: 'tableValue' },
            { text: String(status || '').toUpperCase(), style: 'tableValue', alignment: 'right' },
          ],
          [
            { text: 'Margin', style: 'tableValue' },
            { text: `${marginPercent.toFixed(2)}%`, style: 'tableValue', alignment: 'right' },
          ],
          [
            { text: 'Net per Litre Collected', style: 'tableValue' },
            { text: money(netPerLiterCollected), style: 'tableValue', alignment: 'right' },
          ],
        ],
      },
      margin: [0, 0, 0, 20],
    },
  ];

  if (collectionsWithoutCommission > 0) {
    content.push({
      text: `Note: ${collectionsWithoutCommission} collection(s) predate every configured effective date and earn zero commission. The Tally API back-dates onto the oldest entry instead, so small commission differences between the two are expected.`,
      style: 'note',
      margin: [0, 0, 0, 20],
    });
  }

  if (periodCharges.length) {
    content.push({
      text: 'Period Charges (Fixed)',
      style: 'sectionTitle',
      margin: [0, 0, 0, 4],
    });
    content.push({
      text: 'Charged once per commission entry for the whole range — not once globally.',
      style: 'hint',
      margin: [0, 0, 0, 8],
    });
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', '*', 100],
        body: [
          [
            { text: 'Entry', style: 'tableHeader' },
            { text: 'Reason', style: 'tableHeader' },
            { text: 'Amount', style: 'tableHeader', alignment: 'right' },
          ],
          ...periodCharges.map((charge) => ([
            { text: charge.label, style: 'tableValue' },
            { text: charge.reason || '-', style: 'tableValue' },
            { text: money(charge.amount), style: 'tableValue', alignment: 'right' },
          ])),
          [
            { text: 'Total Fixed Charges', style: 'totalLabel', colSpan: 2 },
            {},
            { text: money(fixedCommissionTotal), style: 'totalValue', alignment: 'right' },
          ],
        ],
      },
      margin: [0, 0, 0, 20],
    });
  }

  if (daily.length) {
    content.push({
      text: 'Daily Breakdown',
      style: 'sectionTitle',
      pageBreak: 'before',
      margin: [0, 0, 0, 4],
    });
    content.push({
      text: 'Excludes fixed period charges — a flat range fee belongs to no single day.',
      style: 'hint',
      margin: [0, 0, 0, 8],
    });
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 60, 75, 75, 75, 75],
        body: [
          [
            { text: 'Date', style: 'tableHeader' },
            { text: 'Litres', style: 'tableHeader', alignment: 'right' },
            { text: 'Dispatch', style: 'tableHeader', alignment: 'right' },
            { text: 'Commission', style: 'tableHeader', alignment: 'right' },
            { text: 'Purchase', style: 'tableHeader', alignment: 'right' },
            { text: 'Net', style: 'tableHeader', alignment: 'right' },
          ],
          ...daily.map((row) => ([
            { text: row.date, style: 'smallValue' },
            { text: row.liters.toFixed(2), style: 'smallValue', alignment: 'right' },
            { text: money(row.dispatch), style: 'smallValue', alignment: 'right' },
            { text: money(row.commission), style: 'smallValue', alignment: 'right' },
            { text: money(row.purchase), style: 'smallValue', alignment: 'right' },
            { text: money(row.net), style: 'smallValue', alignment: 'right' },
          ])),
          [
            { text: 'Sum of daily net', style: 'totalLabel', colSpan: 5 },
            {}, {}, {}, {},
            { text: money(dailyNetSum), style: 'totalValue', alignment: 'right' },
          ],
        ],
      },
      margin: [0, 0, 0, 8],
    });
    content.push({
      text: `Sum of daily net = Net Profit - Total Fixed Charges = ${money(netProfit - fixedCommissionTotal)}`,
      style: 'hint',
    });
  }

  const docDefinition: any = {
    pageOrientation: 'portrait',
    pageMargins: [40, 60, 40, 60],
    content,
    styles: {
      branchName: { fontSize: 16, bold: true },
      userName: { fontSize: 11, color: '#555555' },
      rightInfo: { fontSize: 10, color: '#555555' },
      header: { fontSize: 18, bold: true, alignment: 'center' },
      subheader: { fontSize: 11, alignment: 'center', color: '#555555' },
      sectionTitle: { fontSize: 13, bold: true },
      tableHeader: { fontSize: 11, bold: true, fillColor: '#eef2ff', margin: [4, 6, 4, 6] },
      tableValue: { fontSize: 11, margin: [4, 5, 4, 5] },
      smallValue: { fontSize: 9, margin: [3, 3, 3, 3] },
      hint: { fontSize: 9, color: '#666666' },
      note: { fontSize: 9, color: '#8a6d3b', italics: true },
      totalLabel: { fontSize: 12, bold: true, fillColor: '#f8fafc', margin: [4, 6, 4, 6] },
      totalValue: { fontSize: 12, bold: true, fillColor: '#f8fafc', margin: [4, 6, 4, 6] },
      netLabel: { fontSize: 13, bold: true, margin: [4, 7, 4, 7] },
      netValue: { fontSize: 13, bold: true, margin: [4, 7, 4, 7] },
    },
  };

  pdfMake.createPdf(docDefinition).download(`PL_Statement_${fromDate}_to_${toDate}.pdf`);
};
