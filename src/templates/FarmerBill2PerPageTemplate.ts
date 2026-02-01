export interface BillCollection {
  id: number;
  farmer_id: string;
  dairy_id: number;
  type: string;
  quantity: number;
  fat: number;
  snf: number;
  clr: number;
  rate: number;
  amount: number;
  shift: string;
  water: number;
  created_at: string;
}

export interface BillCollectionsSummary {
  total_quantity: number;
  weighted_avg_fat: number;
  weighted_avg_snf: number;
  weighted_avg_clr: number;
  weighted_avg_water: number;
  avg_rate: number;
  total_amount: number;
}

export interface BillPayment {
  payment_type: string;
  amount_taken: number;
  received: number;
}

export interface BillDetail {
  id: number;
  farmer_id: string;
  dairy_id: number;
  period_start: string;
  period_end: string;
  milk_total: number;
  advance_total: number;
  received_total: number;
  net_payable: number;
  status: string;
  is_finalized: number;
  advance_remaining: number;
  cattlefeed_remaining: number;
  other1_remaining: number;
  other2_remaining: number;
  cattlefeed_total: number;
  other1_total: number;
  other2_total: number;
  created_at: string;
}

export interface FarmerReportData {
  farmer_id: string;
  collections: BillCollection[];
  collections_summary: BillCollectionsSummary;
  farmer_details: {
    fullName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  } | null;
  payments: BillPayment[];
  current_bill: BillDetail | null;
  previous_bill: BillDetail | null;
}

export interface Template2PerPageData {
  dairyName: string;
  dairyCode?: string;
  farmers: FarmerReportData[];
  fromDate: string;
  toDate: string;
  hideRateAmount?: boolean;
}

export const generateFarmer2PerPage = (templateData: Template2PerPageData): string => {
  const getFarmerHtml = (farmer: FarmerReportData) => {
    if (!farmer) return '';

    const fromDateParts = templateData.fromDate.split(/[-\/]/);
    const toDateParts = templateData.toDate.split(/[-\/]/);
    const fromDate = new Date(parseInt(fromDateParts[2]), parseInt(fromDateParts[1]) - 1, parseInt(fromDateParts[0]));
    const toDate = new Date(parseInt(toDateParts[2]), parseInt(toDateParts[1]) - 1, parseInt(toDateParts[0]));

    const groupedData = new Map();
    farmer.collections.forEach((c) => {
      const date = new Date(c.created_at).toLocaleDateString("en-GB");
      const key = `${date}_${c.shift}`;
      groupedData.set(key, c);
    });

    let tableRows = '';
    let morningTotalLiters = 0, eveningTotalLiters = 0;
    let morningTotalFat = 0, eveningTotalFat = 0;
    let morningTotalSnf = 0, eveningTotalSnf = 0;
    let morningTotalAmount = 0, eveningTotalAmount = 0;
    let morningCount = 0, eveningCount = 0;

    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const dateKey = currentDate.toLocaleDateString("en-GB");
      const morning = groupedData.get(`${dateKey}_Morning`);
      const evening = groupedData.get(`${dateKey}_Evening`);

      if (morning) {
        morningTotalLiters += Number(morning.quantity);
        morningTotalFat += Number(morning.fat);
        morningTotalSnf += Number(morning.snf);
        morningTotalAmount += Number(morning.amount);
        morningCount++;
      }
      if (evening) {
        eveningTotalLiters += Number(evening.quantity);
        eveningTotalFat += Number(evening.fat);
        eveningTotalSnf += Number(evening.snf);
        eveningTotalAmount += Number(evening.amount);
        eveningCount++;
      }

      tableRows += `
        <tr>
          <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${dateKey.substring(0, 5)}</td>
          <td style="border-left: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${morning ? Number(morning.quantity).toFixed(1) : '-'}</td>
          <td style="border-left: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${morning ? Number(morning.fat).toFixed(1) : '-'}</td>
          <td style="border-left: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${morning ? Number(morning.snf).toFixed(1) : '-'}</td>
          <td style="border-left: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${morning ? Number(morning.rate).toFixed(1) : '-'}</td>
          <td style="border-left: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${morning ? Number(morning.amount).toFixed(0) : '-'}</td>
          <td style="border-left: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${evening ? Number(evening.quantity).toFixed(1) : '-'}</td>
          <td style="border-left: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${evening ? Number(evening.fat).toFixed(1) : '-'}</td>
          <td style="border-left: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${evening ? Number(evening.snf).toFixed(1) : '-'}</td>
          <td style="border-left: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${evening ? Number(evening.rate).toFixed(1) : '-'}</td>
          <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${evening ? Number(evening.amount).toFixed(0) : '-'}</td>
        </tr>`;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const morningAvgFat = morningCount > 0 ? (morningTotalFat / morningCount).toFixed(1) : '0.0';
    const morningAvgSnf = morningCount > 0 ? (morningTotalSnf / morningCount).toFixed(1) : '0.0';
    const eveningAvgFat = eveningCount > 0 ? (eveningTotalFat / eveningCount).toFixed(1) : '0.0';
    const eveningAvgSnf = eveningCount > 0 ? (eveningTotalSnf / eveningCount).toFixed(1) : '0.0';
    const totalLiters = morningTotalLiters + eveningTotalLiters;
    const totalAmount = morningTotalAmount + eveningTotalAmount;

    const summaryTotalLiters = farmer.collections_summary?.total_quantity || totalLiters;
    const summaryTotalAmount = farmer.collections_summary?.total_amount || totalAmount;

    const currentBill = farmer.current_bill;
    const previousBill = farmer.previous_bill;
    const prevCattleFeedRemaining = Number(previousBill?.cattlefeed_remaining || 0);
    const prevAdvanceRemaining = Number(previousBill?.advance_remaining || 0);
    const prevOther1Remaining = Number(previousBill?.other1_remaining || 0);
    const prevOther2Remaining = Number(previousBill?.other2_remaining || 0);

    const currentCattleFeed = farmer.payments?.filter((p) => p.payment_type === 'cattle feed')
      .reduce((sum, p) => sum + Number(p.amount_taken || 0), 0) || 0;
    const currentAdvance = farmer.payments?.filter((p) => p.payment_type === 'advance')
      .reduce((sum, p) => sum + Number(p.amount_taken || 0), 0) || 0;
    const currentOther1 = farmer.payments?.filter((p) => p.payment_type === 'other1')
      .reduce((sum, p) => sum + Number(p.amount_taken || 0), 0) || 0;
    const currentOther2 = farmer.payments?.filter((p) => p.payment_type === 'other2')
      .reduce((sum, p) => sum + Number(p.amount_taken || 0), 0) || 0;

    const totalCattleFeedBalance = prevCattleFeedRemaining + currentCattleFeed;
    const totalAdvanceBalance = prevAdvanceRemaining + currentAdvance;
    const totalOther1Balance = prevOther1Remaining + currentOther1;
    const totalOther2Balance = prevOther2Remaining + currentOther2;

    const cattleFeed = Number(currentBill?.cattlefeed_total || 0);
    const advance = Number(currentBill?.advance_total || 0);
    const other1 = Number(currentBill?.other1_total || 0);
    const other2 = Number(currentBill?.other2_total || 0);
    const totalDeductions = advance + cattleFeed + other1 + other2;

    const cattleFeedRemaining = totalCattleFeedBalance - cattleFeed;
    const advanceRemaining = totalAdvanceBalance - advance;
    const other1Remaining = totalOther1Balance - other1;
    const other2Remaining = totalOther2Balance - other2;
    const totalRemaining = cattleFeedRemaining + advanceRemaining + other1Remaining + other2Remaining;

    const netPayable = Number((summaryTotalAmount - totalDeductions));

    return `
      <div style="width: 100%; font-family: Arial, sans-serif; font-size: 10px; margin-bottom: 40px; border: 1px solid black; padding: 6px; page-break-inside: avoid; font-weight: normal;">
        <div style="text-align: center; margin-bottom: 3px; border-bottom: 1px solid black; padding-bottom: 3px;">
          <h2 style="margin: 0; font-size: 14px; font-weight: normal;">${templateData.dairyName}</h2>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
          <div>Farmer: ${farmer.farmer_id} - ${farmer.farmer_details?.fullName || 'Unknown'}</div>
          <div>Bill Cycle: ${templateData.fromDate} to ${templateData.toDate}</div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 4px; font-size: 9px; font-weight: normal;">
          <thead>
            <tr>
              <th rowspan="2" style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px; font-weight: normal;">Date</th>
              <th colspan="5" style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px; font-weight: normal;">Morning</th>
              <th colspan="5" style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px; font-weight: normal;">Evening</th>
            </tr>
            <tr>
              <th style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8px; font-weight: normal;">Ltr</th>
              <th style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8px; font-weight: normal;">Fat</th>
              <th style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8px; font-weight: normal;">SNF</th>
              <th style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8px; font-weight: normal;">Rate</th>
              <th style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8px; font-weight: normal;">Amt</th>
              <th style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8px; font-weight: normal;">Ltr</th>
              <th style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8px; font-weight: normal;">Fat</th>
              <th style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8px; font-weight: normal;">SNF</th>
              <th style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8px; font-weight: normal;">Rate</th>
              <th style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8px; font-weight: normal;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="11" style="border: 1px solid black; padding: 10px; text-align: center;">No data</td></tr>'}
            <tr>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">Total</td>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${morningTotalLiters.toFixed(1)}</td>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${morningAvgFat}</td>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${morningAvgSnf}</td>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">-</td>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${morningTotalAmount.toFixed(0)}</td>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${eveningTotalLiters.toFixed(1)}</td>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${eveningAvgFat}</td>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${eveningAvgSnf}</td>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">-</td>
              <td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 9px;">${eveningTotalAmount.toFixed(0)}</td>
            </tr>
          </tbody>
        </table>
        
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 7px; font-weight: normal;">
          <tr>
            <td colspan="3" style="border: 1px solid black; padding: 4px; text-align: center;">Total Liter</td>
            <td colspan="3" style="border: 1px solid black; padding: 4px; text-align: center;">${summaryTotalLiters.toFixed(2)}</td>
            <td colspan="2" style="border: 1px solid black; padding: 4px; text-align: center;">Total Amount</td>
            <td colspan="2" style="border: 1px solid black; padding: 4px; text-align: center;">${summaryTotalAmount.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border: 1px solid black; padding: 4px; text-align: center;">Property Details</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;"></td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;"></td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">Previous Balance</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">Current Balance</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">Total Balance</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">Deduction</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">Remaining</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">Total Payable</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px;">Milk Amount</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">${summaryTotalAmount.toFixed(0)}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">Cattle Feed</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${prevCattleFeedRemaining.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${currentCattleFeed.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${totalCattleFeedBalance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${cattleFeed.toFixed(0)}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">${cattleFeedRemaining.toFixed(0)}</td>
            <td rowspan="4" style="border: 1px solid black; padding: 2px; text-align: center; vertical-align: middle; font-size: 10px;">Total<br>${summaryTotalAmount.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px;">Bonus</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">0</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">Advance</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${prevAdvanceRemaining.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${currentAdvance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${totalAdvanceBalance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${advance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">${advanceRemaining.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px;">Fixed</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">0</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">Other1</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${prevOther1Remaining.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${currentOther1.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${totalOther1Balance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${other1.toFixed(0)}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">${other1Remaining.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px;"></td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;"></td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">Other2</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${prevOther2Remaining.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${currentOther2.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${totalOther2Balance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 2px; text-align: center;">${other2.toFixed(0)}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px; text-align: center;">${other2Remaining.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border: 1px solid black; padding: 2px;">Total</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">${summaryTotalAmount.toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">Total</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">${(prevAdvanceRemaining + prevCattleFeedRemaining + prevOther1Remaining + prevOther2Remaining).toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">${(currentAdvance + currentCattleFeed + currentOther1 + currentOther2).toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">${(totalAdvanceBalance + totalCattleFeedBalance + totalOther1Balance + totalOther2Balance).toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">${totalDeductions.toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center;">${totalRemaining.toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 2px; text-align: center; font-size: 10px;">Total Deduction<br>${totalDeductions.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="9" style="border: 1px solid black; padding: 2px;"></td>
            <td style="border: 1px solid black; padding: 2px; text-align: center; font-size: 10px;">Net Payable<br>${netPayable.toFixed(0)}</td>
          </tr>
        </table>
      </div>
    `;
  };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { margin: 0; padding: 0; font-family: Arial, sans-serif; } @page { size: A4; margin: 0; }</style></head><body>${templateData.farmers.map(getFarmerHtml).join('')}</body></html>`;
};