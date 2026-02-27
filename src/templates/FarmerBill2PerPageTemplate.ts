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
  branchName?: string;
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

    const cowData = new Map();
    const buffaloData = new Map();
    farmer.collections.forEach((c) => {
      const date = new Date(c.created_at).toLocaleDateString("en-GB");
      const key = `${date}_${c.shift}`;
      const milkType = (c.type || '').toString().toLowerCase().trim();
      if (milkType === 'cow') cowData.set(key, c);
      else if (milkType === 'buffalo') buffaloData.set(key, c);
    });

    const hasCow = cowData.size > 0;
    const hasBuff = buffaloData.size > 0;

    const generateTable = (dataMap: Map<any, any>, label: string) => {
      let rows = '';
      let mLiters = 0, eLiters = 0, mFat = 0, eFat = 0, mSnf = 0, eSnf = 0, mAmt = 0, eAmt = 0, mCnt = 0, eCnt = 0;
      const cd = new Date(fromDate);
      while (cd <= toDate) {
        const dk = cd.toLocaleDateString("en-GB");
        const m = dataMap.get(`${dk}_Morning`);
        const e = dataMap.get(`${dk}_Evening`);
        if (m) { mLiters += Number(m.quantity); mFat += Number(m.fat); mSnf += Number(m.snf); mAmt += Number(m.amount); mCnt++; }
        if (e) { eLiters += Number(e.quantity); eFat += Number(e.fat); eSnf += Number(e.snf); eAmt += Number(e.amount); eCnt++; }
        rows += `<tr><td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${dk.substring(0, 5)}</td><td style="border-left: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${m ? Number(m.quantity).toFixed(1) : '-'}</td><td style="border-left: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${m ? Number(m.fat).toFixed(1) : '-'}</td><td style="border-left: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${m ? Number(m.snf).toFixed(1) : '-'}</td><td style="border-left: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${m ? Number(m.rate).toFixed(1) : '-'}</td><td style="border-left: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${m ? Number(m.amount).toFixed(0) : '-'}</td><td style="border-left: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${e ? Number(e.quantity).toFixed(1) : '-'}</td><td style="border-left: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${e ? Number(e.fat).toFixed(1) : '-'}</td><td style="border-left: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${e ? Number(e.snf).toFixed(1) : '-'}</td><td style="border-left: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${e ? Number(e.rate).toFixed(1) : '-'}</td><td style="border-left: 1px solid black; border-right: 1px solid black; padding: 2px 3px; text-align: center; font-size: 9px;">${e ? Number(e.amount).toFixed(0) : '-'}</td></tr>`;
        cd.setDate(cd.getDate() + 1);
      }
      return { rows, mLiters, eLiters, mFat: mCnt > 0 ? (mFat / mCnt).toFixed(1) : '0.0', eFat: eCnt > 0 ? (eFat / eCnt).toFixed(1) : '0.0', mSnf: mCnt > 0 ? (mSnf / mCnt).toFixed(1) : '0.0', eSnf: eCnt > 0 ? (eSnf / eCnt).toFixed(1) : '0.0', mAmt, eAmt };
    };

    const cowTable = hasCow ? generateTable(cowData, 'Cow') : null;
    const buffTable = hasBuff ? generateTable(buffaloData, 'Buffalo') : null;
    const hasBothTypes = hasCow && hasBuff;

    const totalLiters = (cowTable?.mLiters || 0) + (cowTable?.eLiters || 0) + (buffTable?.mLiters || 0) + (buffTable?.eLiters || 0);
    const totalAmount = (cowTable?.mAmt || 0) + (cowTable?.eAmt || 0) + (buffTable?.mAmt || 0) + (buffTable?.eAmt || 0);

    const cowSection = cowTable ? `
        <div style="text-align: center; font-weight: bold; margin-bottom: 2px; font-size: 11px;">Cow Milk</div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 5px; font-size: 9px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th rowspan="2" style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">Date</th>
              <th colspan="5" style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">Morning</th>
              <th colspan="5" style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">Evening</th>
            </tr>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid black; padding: 4px; text-align: center;">Ltr</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Fat</th><th style="border: 1px solid black; padding: 4px; text-align: center;">SNF</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Rate</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Amt</th>
              <th style="border: 1px solid black; padding: 4px; text-align: center;">Ltr</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Fat</th><th style="border: 1px solid black; padding: 4px; text-align: center;">SNF</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Rate</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Amt</th>
            </tr>
          </thead>
          <tbody>${cowTable.rows}</tbody>
          <tfoot style="font-weight: bold; background-color: #f0f0f0;">
            <tr>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">Cow Total</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${cowTable.mLiters.toFixed(1)}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${cowTable.mFat}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${cowTable.mSnf}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">-</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${cowTable.mAmt.toFixed(0)}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${cowTable.eLiters.toFixed(1)}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${cowTable.eFat}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${cowTable.eSnf}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">-</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${cowTable.eAmt.toFixed(0)}</td>
            </tr>
          </tfoot>
        </table>` : '';

    const buffSection = buffTable ? `
        ${hasBothTypes ? '<div style="page-break-before: always;"></div>' : ''}
        <div style="text-align: center; font-weight: bold; margin-bottom: 2px; font-size: 11px; margin-top: 5px;">Buffalo Milk</div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 5px; font-size: 9px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th rowspan="2" style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">Date</th>
              <th colspan="5" style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">Morning</th>
              <th colspan="5" style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">Evening</th>
            </tr>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid black; padding: 4px; text-align: center;">Ltr</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Fat</th><th style="border: 1px solid black; padding: 4px; text-align: center;">SNF</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Rate</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Amt</th>
              <th style="border: 1px solid black; padding: 4px; text-align: center;">Ltr</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Fat</th><th style="border: 1px solid black; padding: 4px; text-align: center;">SNF</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Rate</th><th style="border: 1px solid black; padding: 4px; text-align: center;">Amt</th>
            </tr>
          </thead>
          <tbody>${buffTable.rows}</tbody>
          <tfoot style="font-weight: bold; background-color: #f0f0f0;">
            <tr>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">Buffalo Total</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${buffTable.mLiters.toFixed(1)}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${buffTable.mFat}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${buffTable.mSnf}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">-</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${buffTable.mAmt.toFixed(0)}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${buffTable.eLiters.toFixed(1)}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${buffTable.eFat}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${buffTable.eSnf}</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">-</td>
              <td style="border: 1px solid black; padding: 6px 3px; text-align: center;">${buffTable.eAmt.toFixed(0)}</td>
            </tr>
          </tfoot>
        </table>` : '';

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
      <div style="width: 100%; font-family: Arial, sans-serif; font-size: 10px; margin-bottom: 20px; border: 1px solid black; padding: 40px 80px; box-sizing: border-box; ${hasBothTypes ? 'page-break-after: always;' : 'page-break-inside: avoid;'} font-weight: normal;">
        ${!hasBothTypes ? `
          <div style="text-align: center; margin-bottom: 2px; border-bottom: 1px solid black; padding-bottom: 2px;"><h2 style="margin: 0; font-size: 14px; font-weight: bold;">${templateData.dairyName}</h2></div>
          <div style="text-align: center; margin-bottom: 5px; font-size: 11px; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 2px;">${templateData.dairyCode || ''}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
            <div><b>Farmer:</b> ${farmer.farmer_id} - ${farmer.farmer_details?.fullName || 'Unknown'} | <b>Branch:</b> ${templateData.branchName || ''}</div>
            <div><b>Bill Cycle:</b> ${templateData.fromDate} to ${templateData.toDate}</div>
          </div>
        ` : ''}
        ${cowSection}${buffSection}
        
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 7px; font-weight: normal;">
          <tr>
            <td colspan="3" style="border: 1px solid black; padding: 4px; text-align: center;">Total Liter</td>
            <td colspan="3" style="border: 1px solid black; padding: 4px; text-align: center;">${summaryTotalLiters.toFixed(2)}</td>
            <td colspan="2" style="border: 1px solid black; padding: 4px; text-align: center;">Total Amount</td>
            <td colspan="2" style="border: 1px solid black; padding: 4px; text-align: center;">${summaryTotalAmount.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border: 1px solid black; padding: 4px; text-align: center;">Property Details</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;"></td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;"></td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">Previous Balance</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">Current Balance</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">Total Balance</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">Deduction</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">Remaining</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">Total Payable</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px;">Milk Amount</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">${summaryTotalAmount.toFixed(0)}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">Cattle Feed</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${prevCattleFeedRemaining.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${currentCattleFeed.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${totalCattleFeedBalance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${cattleFeed.toFixed(0)}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">${cattleFeedRemaining.toFixed(0)}</td>
            <td rowspan="4" style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: middle; font-size: 10px;">Total<br>${summaryTotalAmount.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px;">Bonus</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">0</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">Advance</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${prevAdvanceRemaining.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${currentAdvance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${totalAdvanceBalance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${advance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">${advanceRemaining.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px;">Fixed</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">0</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">Other1</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${prevOther1Remaining.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${currentOther1.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${totalOther1Balance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${other1.toFixed(0)}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">${other1Remaining.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px;"></td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;"></td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">Other2</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${prevOther2Remaining.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${currentOther2.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${totalOther2Balance.toFixed(0)}</td>
            <td style="border-left: 1px solid black; padding: 4px; text-align: center;">${other2.toFixed(0)}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">${other2Remaining.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="2" style="border: 1px solid black; padding: 4px;">Total</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${summaryTotalAmount.toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">Total</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${(prevAdvanceRemaining + prevCattleFeedRemaining + prevOther1Remaining + prevOther2Remaining).toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${(currentAdvance + currentCattleFeed + currentOther1 + currentOther2).toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${(totalAdvanceBalance + totalCattleFeedBalance + totalOther1Balance + totalOther2Balance).toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${totalDeductions.toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${totalRemaining.toFixed(0)}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 10px;">Total Deduction<br>${totalDeductions.toFixed(0)}</td>
          </tr>
          
          <tr>
            <td colspan="9" style="border: 1px solid black; padding: 4px;"></td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 10px;">Net Payable<br>${netPayable.toFixed(0)}</td>
          </tr>
        </table>
      </div>
    `;
  };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { margin: 0; padding: 0; font-family: Arial, sans-serif; } @page { size: A4; margin: 0; }</style></head><body>${templateData.farmers.map(getFarmerHtml).join('')}</body></html>`;
};