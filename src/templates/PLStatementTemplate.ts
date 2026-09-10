import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";
import type { PLLine, PLDailyRow, PLPeriodCharge, PLFarmerRow } from "@/utils/plStatement";

export interface PLStatementPdfData {
  vlcName: string;
  dairyName: string;
  fromDate: string;
  toDate: string;
  income: PLLine[];
  expenses: PLLine[];
  otherExpenses: PLLine[];
  otherExpensesTotal: number;
  grossProfit: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  status: string;
  marginPercent: number;
  netPerLiterCollected: number;
  fixedCommissionTotal: number;
  vlcWideFixedTotal: number;
  periodCharges: PLPeriodCharge[];
  farmers: PLFarmerRow[];
  daily: PLDailyRow[];
  collectionsWithoutCommission: number;
  warnings: string[];
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

/** "farmer wise / per liter @ 2" — which rule produced this farmer's commission. */
const commissionRule = (row: PLFarmerRow) => {
  const parts = [(row.commissionSource || '-').replace(/_/g, ' ')];
  if (row.commissionType) parts.push(`/ ${row.commissionType.replace(/_/g, ' ')}`);
  if (row.ratesApplied.length) parts.push(`@ ${row.ratesApplied.join(', ')}`);
  return parts.join(' ');
};

const sectionRows = (lines: PLLine[], emptyLabel: string) => {
  if (!lines.length) {
    return [[
      { text: emptyLabel, style: 'tableValue', colSpan: 2, alignment: 'center', italics: true },
      {},
    ]];
  }
  const rows: any[] = [];
  lines.forEach((line) => {
    rows.push([
      {
        stack: [
          { text: line.label, style: 'tableValue', bold: true },
          ...(line.meta ? [{ text: line.meta, style: 'hint' }] : []),
          ...(line.hint ? [{ text: line.hint, style: 'hint', italics: true }] : []),
        ],
      },
      { text: money(line.amount), style: 'tableValue', bold: true, alignment: 'right' },
    ]);
    line.subLines?.forEach((sub) => {
      rows.push([
        { text: sub.label, style: 'subValue', margin: [16, 3, 4, 3] },
        { text: money(sub.amount), style: 'subValue', alignment: 'right' },
      ]);
    });
  });
  return rows;
};

export const generatePLStatementPDF = (data: PLStatementPdfData) => {
  const {
    vlcName, dairyName, fromDate, toDate,
    income, expenses, otherExpenses, otherExpensesTotal, grossProfit, totalIncome, totalExpenses,
    netProfit, status, marginPercent, netPerLiterCollected,
    fixedCommissionTotal, vlcWideFixedTotal, periodCharges, farmers, daily,
    collectionsWithoutCommission, warnings,
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
            { text: 'Milk Purchase', style: 'tableHeader' },
            { text: 'Amount (Rs.)', style: 'tableHeader', alignment: 'right' },
          ],
          ...sectionRows(expenses, 'No milk purchase recorded for this period'),
          [
            { text: 'Total Milk Purchase', style: 'totalLabel' },
            { text: money(totalExpenses), style: 'totalValue', alignment: 'right' },
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
            { text: 'Milk Sale', style: 'tableHeader' },
            { text: 'Amount (Rs.)', style: 'tableHeader', alignment: 'right' },
          ],
          ...sectionRows(income, 'No milk sale recorded for this period'),
          [
            { text: 'Total Milk Sale', style: 'totalLabel' },
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
            { text: 'Other Expenses', style: 'tableHeader' },
            { text: 'Amount (Rs.)', style: 'tableHeader', alignment: 'right' },
          ],
          ...sectionRows(otherExpenses, 'No other expenses recorded for this period'),
          [
            { text: 'Total Other Expenses', style: 'totalLabel' },
            { text: money(otherExpensesTotal), style: 'totalValue', alignment: 'right' },
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
            { text: 'Total Milk Sale', style: 'tableValue' },
            { text: money(totalIncome), style: 'tableValue', alignment: 'right' },
          ],
          [
            { text: 'Less: Milk Purchase', style: 'tableValue' },
            { text: money(-totalExpenses), style: 'tableValue', alignment: 'right' },
          ],
          [
            { text: 'Gross Profit', style: 'totalLabel' },
            { text: money(grossProfit), style: 'totalValue', alignment: 'right' },
          ],
          [
            { text: 'Less: Other Expenses', style: 'tableValue' },
            { text: money(-otherExpensesTotal), style: 'tableValue', alignment: 'right' },
          ],
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

  if (warnings.length) {
    content.push({
      text: `Warnings: ${warnings.join(' | ')}`,
      style: 'note',
      margin: [0, 0, 0, 12],
    });
  }

  if (collectionsWithoutCommission > 0) {
    content.push({
      text: `Note: ${collectionsWithoutCommission} collection(s) predate every configured effective date and earn zero commission. The Tally API back-dates onto the oldest entry instead, so small commission differences between the two are expected.`,
      style: 'note',
      margin: [0, 0, 0, 20],
    });
  }

  if (periodCharges.length) {
    content.push({
      text: 'Period Charges (VLC-wide Fixed)',
      style: 'sectionTitle',
      margin: [0, 0, 0, 4],
    });
    content.push({
      text: 'Charged once for the whole range — not once per day.',
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
            { text: money(vlcWideFixedTotal), style: 'totalValue', alignment: 'right' },
          ],
        ],
      },
      margin: [0, 0, 0, 20],
    });
  }

  if (farmers.length) {
    content.push({
      text: 'Farmer-wise Cost',
      style: 'sectionTitle',
      margin: [0, 0, 0, 4],
    });
    content.push({
      text: 'Purchase amount plus the purchase commission rule applied to each farmer.',
      style: 'hint',
      margin: [0, 0, 0, 8],
    });
    const farmerTotals = farmers.reduce(
      (acc, row) => ({
        quantity: acc.quantity + row.quantity,
        purchaseAmount: acc.purchaseAmount + row.purchaseAmount,
        commissionTotal: acc.commissionTotal + row.commissionTotal,
        totalCost: acc.totalCost + row.totalCost,
      }),
      { quantity: 0, purchaseAmount: 0, commissionTotal: 0, totalCost: 0 }
    );

    content.push({
      table: {
        headerRows: 1,
        widths: [36, '*', 30, 50, 62, 78, 56, 62],
        body: [
          [
            { text: 'Code', style: 'tableHeader' },
            { text: 'Farmer Name', style: 'tableHeader' },
            { text: 'Ent.', style: 'tableHeader', alignment: 'right' },
            { text: 'Qty (L)', style: 'tableHeader', alignment: 'right' },
            { text: 'Purchase', style: 'tableHeader', alignment: 'right' },
            { text: 'Comm. Rule', style: 'tableHeader' },
            { text: 'Comm.', style: 'tableHeader', alignment: 'right' },
            { text: 'Total Cost', style: 'tableHeader', alignment: 'right' },
          ],
          ...farmers.map((row) => ([
            { text: row.farmerId || '-', style: 'smallValue' },
            { text: row.farmerName || '-', style: 'smallValue' },
            { text: String(row.entries), style: 'smallValue', alignment: 'right' },
            { text: row.quantity.toFixed(2), style: 'smallValue', alignment: 'right' },
            { text: money(row.purchaseAmount), style: 'smallValue', alignment: 'right' },
            { text: commissionRule(row), style: 'smallValue' },
            { text: money(row.commissionTotal), style: 'smallValue', alignment: 'right' },
            { text: money(row.totalCost), style: 'smallValue', alignment: 'right' },
          ])),
          [
            { text: 'Total', style: 'totalLabel', colSpan: 3 },
            {},
            {},
            { text: farmerTotals.quantity.toFixed(2), style: 'totalValue', alignment: 'right' },
            { text: money(farmerTotals.purchaseAmount), style: 'totalValue', alignment: 'right' },
            { text: '', style: 'totalValue' },
            { text: money(farmerTotals.commissionTotal), style: 'totalValue', alignment: 'right' },
            { text: money(farmerTotals.totalCost), style: 'totalValue', alignment: 'right' },
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
      text: 'Excludes fixed purchase commission — a flat range fee belongs to no single day.',
      style: 'hint',
      margin: [0, 0, 0, 8],
    });
    const dailyTotals = daily.reduce(
      (acc, row) => ({
        collectionQuantity: acc.collectionQuantity + row.collectionQuantity,
        collectionCost: acc.collectionCost + row.collectionCost,
        purchaseCommission: acc.purchaseCommission + row.purchaseCommission,
        income: acc.income + row.income,
        otherExpenses: acc.otherExpenses + row.otherExpenses,
      }),
      { collectionQuantity: 0, collectionCost: 0, purchaseCommission: 0, income: 0, otherExpenses: 0 }
    );

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 50, 64, 64, 64, 60, 64],
        body: [
          [
            { text: 'Date', style: 'tableHeader' },
            { text: 'Qty (L)', style: 'tableHeader', alignment: 'right' },
            { text: 'Coll. Cost', style: 'tableHeader', alignment: 'right' },
            { text: 'Purch. Comm.', style: 'tableHeader', alignment: 'right' },
            { text: 'Milk Sale', style: 'tableHeader', alignment: 'right' },
            { text: 'Other Exp.', style: 'tableHeader', alignment: 'right' },
            { text: 'Net', style: 'tableHeader', alignment: 'right' },
          ],
          ...daily.map((row) => ([
            { text: row.date, style: 'smallValue' },
            { text: row.collectionQuantity.toFixed(2), style: 'smallValue', alignment: 'right' },
            { text: money(row.collectionCost), style: 'smallValue', alignment: 'right' },
            { text: money(row.purchaseCommission), style: 'smallValue', alignment: 'right' },
            { text: money(row.income), style: 'smallValue', alignment: 'right' },
            { text: money(row.otherExpenses), style: 'smallValue', alignment: 'right' },
            { text: money(row.net), style: 'smallValue', alignment: 'right' },
          ])),
          [
            { text: 'Total', style: 'totalLabel' },
            { text: dailyTotals.collectionQuantity.toFixed(2), style: 'totalValue', alignment: 'right' },
            { text: money(dailyTotals.collectionCost), style: 'totalValue', alignment: 'right' },
            { text: money(dailyTotals.purchaseCommission), style: 'totalValue', alignment: 'right' },
            { text: money(dailyTotals.income), style: 'totalValue', alignment: 'right' },
            { text: money(dailyTotals.otherExpenses), style: 'totalValue', alignment: 'right' },
            { text: money(dailyNetSum), style: 'totalValue', alignment: 'right' },
          ],
        ],
      },
      margin: [0, 0, 0, 8],
    });
    content.push({
      text: 'Sum of daily net = Net Profit + Fixed Purchase Commission = ' +
        money(netProfit + fixedCommissionTotal),
      style: 'hint',
    });
  }

  const docDefinition: any = {
    defaultStyle: { font: PDF_FONT },
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
      subValue: { fontSize: 9, color: '#555555', margin: [4, 3, 4, 3] },
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
