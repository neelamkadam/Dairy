export interface FarmerBillData {
  date: string;
  shift: string;
  type: string;
  liters: number;
  fat: number;
  snf: number;
  clr: number;
  water: number | null;
  rate: number;
  amount: number;
  farmer_id?: string;
  farmer_name?: string;
}

export interface PaymentData {
  advance: number;
  cattleFeed: number;
  other1: number;
  other2: number;
  received: number;
  netPayable: number;
}

export interface BankDetails {
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branchName?: string;
}

export interface Template2Data {
  dairyName: string;
  branchName: string;
  dairyCode?: string;
  farmerCode: string;
  farmerName: string;
  fromDate: string;
  toDate: string;
  milkType: string;
  data: FarmerBillData[];
  farmerBill?: any;
  paymentSummary?: any;
  bankDetails?: BankDetails;
  hideRateAmount?: boolean;
}

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

export interface Template3Data {
  dairyName: string;
  dairyCode?: string;
  farmers: FarmerReportData[];
  fromDate: string;
  toDate: string;
  hideRateAmount?: boolean;
}

// --- GENERATOR FUNCTIONS ---

export const generateTemplate2 = (templateData: Template2Data): string => {
  const fromDateParts = templateData.fromDate.includes("/")
    ? templateData.fromDate.split("/")
    : templateData.fromDate.split("-");
  
  const fromDate = templateData.fromDate.includes("/")
    ? new Date(parseInt(fromDateParts[2]), parseInt(fromDateParts[1]) - 1, parseInt(fromDateParts[0]))
    : new Date(templateData.fromDate);
  
  const toDateParts = templateData.toDate.includes("/")
    ? templateData.toDate.split("/")
    : templateData.toDate.split("-");
    
  const toDate = templateData.toDate.includes("/")
    ? new Date(parseInt(toDateParts[2]), parseInt(toDateParts[1]) - 1, parseInt(toDateParts[0]))
    : new Date(templateData.toDate);

  const cowData = new Map<string, FarmerBillData>();
  const buffaloData = new Map<string, FarmerBillData>();
  const groupedData = new Map<string, FarmerBillData>();

  for (const item of templateData.data) {
    const itemDate = new Date(item.date);
    const dateKey = `${itemDate.getDate().toString().padStart(2, "0")}/${(itemDate.getMonth() + 1).toString().padStart(2, "0")}/${itemDate.getFullYear()}`;
    const key = `${dateKey}_${item.shift}`;
    const milkType = (item.type || '').toString().toLowerCase().trim();
    
    groupedData.set(key, item);
    if (milkType === "cow") cowData.set(key, item);
    else if (milkType === "buffalo") buffaloData.set(key, item);
  }

  const generateTableForType = (dataMap: Map<string, FarmerBillData>) => {
    let rows = "";
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const displayDate = `${currentDate.getDate().toString().padStart(2, "0")}/${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate.getFullYear()}`;
      
      // Morning
      const morningKey = `${displayDate}_Morning`;
      const m = dataMap.get(morningKey);
      rows += `<tr><td>${displayDate}</td><td>Morning</td>`;
      if (m) {
        rows += `<td>${Number(m.liters).toFixed(1)}</td><td>${Number(m.fat).toFixed(1)}</td><td>${Number(m.snf).toFixed(1)}</td><td>${Number(m.clr).toFixed(1)}</td><td>${m.water != null ? Number(m.water).toFixed(1) : '-'}</td>`;
        if (!templateData.hideRateAmount) rows += `<td>${Number(m.rate).toFixed(1)}</td><td>${Number(m.amount).toFixed(1)}</td>`;
      } else {
        rows += `<td></td><td></td><td></td><td></td><td></td>${!templateData.hideRateAmount ? '<td></td><td></td>' : ''}`;
      }
      rows += `</tr>`;

      // Evening
      const eveningKey = `${displayDate}_Evening`;
      const e = dataMap.get(eveningKey);
      rows += `<tr><td></td><td>Evening</td>`;
      if (e) {
        rows += `<td>${Number(e.liters).toFixed(1)}</td><td>${Number(e.fat).toFixed(1)}</td><td>${Number(e.snf).toFixed(1)}</td><td>${Number(e.clr).toFixed(1)}</td><td>${e.water != null ? Number(e.water).toFixed(1) : '-'}</td>`;
        if (!templateData.hideRateAmount) rows += `<td>${Number(e.rate).toFixed(1)}</td><td>${Number(e.amount).toFixed(1)}</td>`;
      } else {
        rows += `<td></td><td></td><td></td><td></td><td></td>${!templateData.hideRateAmount ? '<td></td><td></td>' : ''}`;
      }
      rows += `</tr>`;
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return rows;
  };

  const hasCow = Array.from(templateData.data).some(d => d.type?.toLowerCase() === 'cow');
  const hasBuffalo = Array.from(templateData.data).some(d => d.type?.toLowerCase() === 'buffalo');
  
  let tableRows = "";
  if (hasCow && hasBuffalo) {
    tableRows += '<tr><td colspan="9" style="background:#eee"><b>Cow Milk</b></td></tr>' + generateTableForType(cowData);
    tableRows += '<tr><td colspan="9" style="background:#eee"><b>Buffalo Milk</b></td></tr>' + generateTableForType(buffaloData);
  } else {
    tableRows += generateTableForType(hasCow ? cowData : (hasBuffalo ? buffaloData : groupedData));
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: Arial, sans-serif; font-size: 14px; margin: 0; padding: 10px; } .header-section { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 10px; } .main-table { width: 100%; border-collapse: collapse; margin: 5px 0; border: 1px solid black; } .main-table th, .main-table td { padding: 3px; text-align: center; font-size: 12px; border: 1px solid black; }</style></head><body><div class="header-section"><div>Code: ${templateData.dairyCode || ''}</div><div style="font-size:22px; font-weight:bold;">${templateData.dairyName}</div><div>Branch: ${templateData.branchName}</div></div><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><div><strong>Farmer:</strong> ${templateData.farmerCode} ${templateData.farmerName}</div><div><strong>Period:</strong> ${templateData.fromDate} to ${templateData.toDate}</div></div><table class="main-table"><thead><tr><th>Date</th><th>Shift</th><th>Liter</th><th>Fat</th><th>SNF</th><th>CLR</th><th>Water</th>${!templateData.hideRateAmount ? '<th>Rate</th><th>Amount</th>' : ''}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
};

export const generateTemplate2perPage = (templateData: Template3Data): string => {
  const getFarmerHtml = (farmer: FarmerReportData) => {
    if (!farmer) return '<div class="invoice-container" style="visibility: hidden;"></div>';

    let tableRows = '';
    const sortedCollections = [...farmer.collections].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const groupedByDate: { [key: string]: { Morning?: BillCollection, Evening?: BillCollection } } = {};
    
    sortedCollections.forEach(c => {
      const date = new Date(c.created_at).toLocaleDateString("en-GB");
      if (!groupedByDate[date]) groupedByDate[date] = {};
      if (c.shift === 'Morning') groupedByDate[date].Morning = c;
      if (c.shift === 'Evening') groupedByDate[date].Evening = c;
    });

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
    });

    sortedDates.forEach(date => {
      const dayData = groupedByDate[date];
      tableRows += `<tr><td style="padding: 4px; border: 1px solid #000;">${date}</td><td style="padding: 4px; border: 1px solid #000; text-align: center;">M</td>`;
      if (dayData.Morning) {
        const m = dayData.Morning;
        tableRows += `<td style="padding: 4px; border: 1px solid #000; text-align: center;">${m.type ? m.type[0] : '-'}</td><td style="padding: 4px; border: 1px solid #000; text-align: right;">${Number(m.quantity).toFixed(1)}</td><td style="padding: 4px; border: 1px solid #000; text-align: right;">${Number(m.fat).toFixed(1)}</td><td style="padding: 4px; border: 1px solid #000; text-align: right;">${Number(m.snf).toFixed(1)}</td>${!templateData.hideRateAmount ? `<td style="padding: 4px; border: 1px solid #000; text-align: right;">${Number(m.rate).toFixed(1)}</td><td style="padding: 4px; border: 1px solid #000; text-align: right;">${Number(m.amount).toFixed(0)}</td>` : ''}`;
      } else {
        tableRows += `<td colspan="${!templateData.hideRateAmount ? 6 : 4}" style="border: 1px solid #000;"></td>`;
      }
      tableRows += `</tr><tr><td style="padding: 4px; border: 1px solid #000;"></td><td style="padding: 4px; border: 1px solid #000; text-align: center;">E</td>`;
      if (dayData.Evening) {
        const e = dayData.Evening;
        tableRows += `<td style="padding: 4px; border: 1px solid #000; text-align: center;">${e.type ? e.type[0] : '-'}</td><td style="padding: 4px; border: 1px solid #000; text-align: right;">${Number(e.quantity).toFixed(1)}</td><td style="padding: 4px; border: 1px solid #000; text-align: right;">${Number(e.fat).toFixed(1)}</td><td style="padding: 4px; border: 1px solid #000; text-align: right;">${Number(e.snf).toFixed(1)}</td>${!templateData.hideRateAmount ? `<td style="padding: 4px; border: 1px solid #000; text-align: right;">${Number(e.rate).toFixed(1)}</td><td style="padding: 4px; border: 1px solid #000; text-align: right;">${Number(e.amount).toFixed(0)}</td>` : ''}`;
      } else {
        tableRows += `<td colspan="${!templateData.hideRateAmount ? 6 : 4}" style="border: 1px solid #000;"></td>`;
      }
      tableRows += `</tr>`;
    });

    const summary = farmer.collections_summary;
    const currentBill = farmer.current_bill;
    const previousBill = farmer.previous_bill;
    const prevBalance = previousBill ? (Number(previousBill.advance_remaining) + Number(previousBill.cattlefeed_remaining) + Number(previousBill.other1_remaining) + Number(previousBill.other2_remaining)) : 0;
    const currentDeductions = currentBill ? (Number(currentBill.advance_total) + Number(currentBill.cattlefeed_total) + Number(currentBill.other1_total) + Number(currentBill.other2_total)) : 0;
    const netPayable = currentBill?.net_payable || 0;

    return `
      <div class="invoice-container" style="height: 50%; border-bottom: 2px dashed #000; padding: 20px; box-sizing: border-box; overflow: hidden; line-height: 1.4; font-family: Arial, sans-serif;">
        <table style="width: 100%; border-bottom: 1px solid #000; margin-bottom: 10px;">
          <tr>
            <td style="font-size: 12px; font-weight: bold; width: 25%;">Code: ${templateData.dairyCode || ''}</td>
            <td style="font-size: 20px; font-weight: bold; text-align: center; text-transform: uppercase;">${templateData.dairyName}</td>
            <td style="font-size: 12px; width: 25%; text-align: right; font-weight: bold;">${templateData.fromDate} - ${templateData.toDate}</td>
          </tr>
        </table>
        <div style="font-size: 13px; margin-bottom: 10px; background: #f0f0f0; padding: 6px 10px; border: 1px solid #000;">
          <div style="display: flex; justify-content: space-between;">
            <div><b>Farmer: ${farmer.farmer_id} - ${farmer.farmer_details?.fullName || 'Unknown'}</b></div>
            <div>
              <b>Bank:</b> ${farmer.farmer_details?.bankName || '-'} | <b>A/c:</b> ${farmer.farmer_details?.accountNumber || '-'}
            </div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000; margin-bottom: 15px;">
          <thead style="background: #e0e0e0;">
            <tr>
              <th style="padding: 6px; border: 1px solid #000;">Date</th>
              <th style="padding: 6px; border: 1px solid #000;">S</th>
              <th style="padding: 6px; border: 1px solid #000;">T</th>
              <th style="padding: 6px; border: 1px solid #000;">Qty</th>
              <th style="padding: 6px; border: 1px solid #000;">Fat</th>
              <th style="padding: 6px; border: 1px solid #000;">SNF</th>
              ${!templateData.hideRateAmount ? '<th style="padding: 6px; border: 1px solid #000;">Rate</th><th style="padding: 6px; border: 1px solid #000;">Amt</th>' : ''}
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot style="font-weight: bold; background: #f0f0f0;">
            <tr>
              <td colspan="3" style="border: 1px solid #000; text-align: center; padding: 6px;">TOTAL</td>
              <td style="border: 1px solid #000; text-align: right; padding: 6px;">${Number(summary.total_quantity).toFixed(1)}</td>
              <td style="border: 1px solid #000; text-align: right; padding: 6px;">${Number(summary.weighted_avg_fat).toFixed(1)}</td>
              <td style="border: 1px solid #000; text-align: right; padding: 6px;">${Number(summary.weighted_avg_snf).toFixed(1)}</td>
              ${!templateData.hideRateAmount ? `<td style="border: 1px solid #000; text-align: right; padding: 6px;">${Number(summary.avg_rate).toFixed(1)}</td><td style="border: 1px solid #000; text-align: right; padding: 6px;">${Number(summary.total_amount).toFixed(0)}</td>` : ''}
            </tr>
          </tfoot>
        </table>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 13px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #000; width: 25%;"><b>Gross:</b> ${Number(summary.total_amount).toFixed(0)}</td>
            <td style="padding: 8px; border: 1px solid #000; width: 25%;"><b>Prev Bal:</b> ${Number(prevBalance).toFixed(0)}</td>
            <td style="padding: 8px; border: 1px solid #000; font-size: 12px;">
               <b>Deductions:</b> Feed:${Number(currentBill?.cattlefeed_total || 0).toFixed(0)} | Adv:${Number(currentBill?.advance_total || 0).toFixed(0)} | Oth:${(Number(currentBill?.other1_total || 0) + Number(currentBill?.other2_total || 0)).toFixed(0)}
            </td>
          </tr>
          <tr style="background: #f0f0f0;">
            <td style="padding: 8px; border: 1px solid #000;"><b>Total Ded:</b> ${Number(currentDeductions).toFixed(0)}</td>
            <td style="padding: 8px; border: 1px solid #000; background: #e0e0e0;" colspan="2"><b>NET PAYABLE:</b> <span style="font-size:18px;">${Number(netPayable).toFixed(0)}</span></td>
          </tr>
        </table>
      </div>`;
  };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { margin: 0; padding: 0; font-family: Arial, sans-serif; } @page { size: A4; margin: 0; } .page-container { width: 210mm; height: 297mm; display: flex; flex-direction: column; }</style></head><body><div class="page-container">${templateData.farmers.map(getFarmerHtml).join('')}</div></body></html>`;
};

export const generateTemplate3Farmers = (templateData: Template3Data): string => {
  const getFarmerHtml = (farmer: FarmerReportData) => {
    if (!farmer) return '<div class="invoice-container" style="visibility: hidden;"></div>';

    let tableRows = '';
    const sortedCollections = [...farmer.collections].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const groupedByDate: { [key: string]: { Morning?: BillCollection, Evening?: BillCollection } } = {};
    
    sortedCollections.forEach(c => {
      const date = new Date(c.created_at).toLocaleDateString("en-GB");
      if (!groupedByDate[date]) groupedByDate[date] = {};
      if (c.shift === 'Morning') groupedByDate[date].Morning = c;
      if (c.shift === 'Evening') groupedByDate[date].Evening = c;
    });

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
    });

    sortedDates.forEach(date => {
      const dayData = groupedByDate[date];
      
      // Morning
      tableRows += `<tr><td style="padding: 2px 4px; border: 1px solid #000;">${date}</td><td style="padding: 2px 4px; border: 1px solid #000; text-align: center;">M</td>`;
      if (dayData.Morning) {
        const m = dayData.Morning;
        tableRows += `<td style="padding: 2px 4px; border: 1px solid #000; text-align: center;">${m.type ? m.type[0] : '-'}</td><td style="padding: 2px 4px; border: 1px solid #000; text-align: right;">${Number(m.quantity).toFixed(1)}</td><td style="padding: 2px 4px; border: 1px solid #000; text-align: right;">${Number(m.fat).toFixed(1)}</td><td style="padding: 2px 4px; border: 1px solid #000; text-align: right;">${Number(m.snf).toFixed(1)}</td>${!templateData.hideRateAmount ? `<td style="padding: 2px 4px; border: 1px solid #000; text-align: right;">${Number(m.rate).toFixed(1)}</td><td style="padding: 2px 4px; border: 1px solid #000; text-align: right;">${Number(m.amount).toFixed(0)}</td>` : ''}`;
      } else {
        tableRows += `<td colspan="${!templateData.hideRateAmount ? 6 : 4}" style="border: 1px solid #000;"></td>`;
      }
      tableRows += `</tr>`;

      // Evening
      tableRows += `<tr><td style="padding: 2px 4px; border: 1px solid #000;"></td><td style="padding: 2px 4px; border: 1px solid #000; text-align: center;">E</td>`;
      if (dayData.Evening) {
        const e = dayData.Evening;
        tableRows += `<td style="padding: 2px 4px; border: 1px solid #000; text-align: center;">${e.type ? e.type[0] : '-'}</td><td style="padding: 2px 4px; border: 1px solid #000; text-align: right;">${Number(e.quantity).toFixed(1)}</td><td style="padding: 2px 4px; border: 1px solid #000; text-align: right;">${Number(e.fat).toFixed(1)}</td><td style="padding: 2px 4px; border: 1px solid #000; text-align: right;">${Number(e.snf).toFixed(1)}</td>${!templateData.hideRateAmount ? `<td style="padding: 2px 4px; border: 1px solid #000; text-align: right;">${Number(e.rate).toFixed(1)}</td><td style="padding: 2px 4px; border: 1px solid #000; text-align: right;">${Number(e.amount).toFixed(0)}</td>` : ''}`;
      } else {
        tableRows += `<td colspan="${!templateData.hideRateAmount ? 6 : 4}" style="border: 1px solid #000;"></td>`;
      }
      tableRows += `</tr>`;
    });

    const summary = farmer.collections_summary;
    const currentBill = farmer.current_bill;
    const previousBill = farmer.previous_bill;
    const prevBalance = previousBill ? (Number(previousBill.advance_remaining) + Number(previousBill.cattlefeed_remaining) + Number(previousBill.other1_remaining) + Number(previousBill.other2_remaining)) : 0;
    const currentDeductions = currentBill ? (Number(currentBill.advance_total) + Number(currentBill.cattlefeed_total) + Number(currentBill.other1_total) + Number(currentBill.other2_total)) : 0;
    const netPayable = currentBill?.net_payable || 0;

    return `
      <div class="invoice-container" style="height: 33.33%; border-bottom: 2px dashed #000; padding: 10px; box-sizing: border-box; overflow: hidden; line-height: 1.2; font-family: Arial, sans-serif;">
        <table style="width: 100%; border-bottom: 1px solid #000; margin-bottom: 5px;">
          <tr>
            <td style="font-size: 10px; font-weight: bold; width: 25%;">Code: ${templateData.dairyCode || ''}</td>
            <td style="font-size: 16px; font-weight: bold; text-align: center; text-transform: uppercase;">${templateData.dairyName}</td>
            <td style="font-size: 10px; width: 25%; text-align: right; font-weight: bold;">${templateData.fromDate} - ${templateData.toDate}</td>
          </tr>
        </table>
        <div style="font-size: 11px; margin-bottom: 5px; background: #f0f0f0; padding: 4px 8px; border: 1px solid #000;">
          <div style="display: flex; justify-content: space-between;">
            <div><b>Farmer: ${farmer.farmer_id} - ${farmer.farmer_details?.fullName || 'Unknown'}</b></div>
            <div style="font-size: 10px;">
              <b>Bank:</b> ${farmer.farmer_details?.bankName || '-'} | <b>A/c:</b> ${farmer.farmer_details?.accountNumber || '-'}
            </div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #000; margin-bottom: 8px;">
          <thead style="background: #e0e0e0;">
            <tr>
              <th style="padding: 4px; border: 1px solid #000;">Date</th>
              <th style="padding: 4px; border: 1px solid #000;">S</th>
              <th style="padding: 4px; border: 1px solid #000;">T</th>
              <th style="padding: 4px; border: 1px solid #000;">Qty</th>
              <th style="padding: 4px; border: 1px solid #000;">Fat</th>
              <th style="padding: 4px; border: 1px solid #000;">SNF</th>
              ${!templateData.hideRateAmount ? '<th style="padding: 4px; border: 1px solid #000;">Rate</th><th style="padding: 4px; border: 1px solid #000;">Amt</th>' : ''}
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot style="font-weight: bold; background: #f0f0f0;">
            <tr>
              <td colspan="3" style="border: 1px solid #000; text-align: center;">TOTAL</td>
              <td style="border: 1px solid #000; text-align: right;">${Number(summary.total_quantity).toFixed(1)}</td>
              <td style="border: 1px solid #000; text-align: right;">${Number(summary.weighted_avg_fat).toFixed(1)}</td>
              <td style="border: 1px solid #000; text-align: right;">${Number(summary.weighted_avg_snf).toFixed(1)}</td>
              ${!templateData.hideRateAmount ? `<td style="border: 1px solid #000; text-align: right;">${Number(summary.avg_rate).toFixed(1)}</td><td style="border: 1px solid #000; text-align: right;">${Number(summary.total_amount).toFixed(0)}</td>` : ''}
            </tr>
          </tfoot>
        </table>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11px;">
          <tr>
            <td style="padding: 4px; border: 1px solid #000; width: 15%;"><b>Gross:</b> ${Number(summary.total_amount).toFixed(0)}</td>
            <td style="padding: 4px; border: 1px solid #000; width: 15%;"><b>Prev Bal:</b> ${Number(prevBalance).toFixed(0)}</td>
            <td style="padding: 4px; border: 1px solid #000; font-size: 10px;">
               <b>Deductions:</b> Feed:${Number(currentBill?.cattlefeed_total || 0).toFixed(0)} | Adv:${Number(currentBill?.advance_total || 0).toFixed(0)} | Oth:${(Number(currentBill?.other1_total || 0) + Number(currentBill?.other2_total || 0)).toFixed(0)}
            </td>
          </tr>
          <tr style="background: #f0f0f0;">
            <td style="padding: 4px; border: 1px solid #000;"><b>Total Ded:</b> ${Number(currentDeductions).toFixed(0)}</td>
            <td style="padding: 4px; border: 1px solid #000; background: #e0e0e0;" colspan="2"><b>NET PAYABLE:</b> <span style="font-size:14px;">${Number(netPayable).toFixed(0)}</span></td>
          </tr>
        </table>
      </div>`;
  };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { margin: 0; padding: 0; font-family: Arial, sans-serif; } @page { size: A4; margin: 0; } .page-container { width: 210mm; height: 297mm; display: flex; flex-direction: column; }</style></head><body><div class="page-container">${templateData.farmers.map(getFarmerHtml).join('')}</div></body></html>`;
};
