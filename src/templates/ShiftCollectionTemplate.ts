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

export interface BankDetails {
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branchName?: string;
}

export interface Template2Data {
  dairyName: string;
  branchName: string;
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

export const generateTemplate4 = (templateData: Template2Data): string => {
  const fromDateParts = templateData.fromDate.includes("/") ? templateData.fromDate.split("/") : templateData.fromDate.split("-");
  const toDateParts = templateData.toDate.includes("/") ? templateData.toDate.split("/") : templateData.toDate.split("-");
  const fromDate = templateData.fromDate.includes("/") ? new Date(parseInt(fromDateParts[2]), parseInt(fromDateParts[1]) - 1, parseInt(fromDateParts[0])) : new Date(templateData.fromDate);
  const toDate = templateData.toDate.includes("/") ? new Date(parseInt(toDateParts[2]), parseInt(toDateParts[1]) - 1, parseInt(toDateParts[0])) : new Date(templateData.toDate);

  const groupedData = new Map<string, FarmerBillData>();
  const cowData = new Map<string, FarmerBillData>();
  const buffaloData = new Map<string, FarmerBillData>();

  for (const item of templateData.data) {
    const itemDate = new Date(item.date);
    const dateKey = `${itemDate.getDate().toString().padStart(2, "0")}/${(itemDate.getMonth() + 1).toString().padStart(2, "0")}/${itemDate.getFullYear()}`;
    const key = `${dateKey}_${item.shift}`;
    const milkType = (item.type || '').toString().toLowerCase().trim();
    groupedData.set(key, item);
    if (milkType === "cow") cowData.set(key, item);
    else if (milkType === "buffalo") buffaloData.set(key, item);
  }

  let cowLiters = 0, cowAmount = 0, buffaloLiters = 0, buffaloAmount = 0, totalLiters = 0, totalAmount = 0;
  let totalFat = 0, totalSnf = 0, totalClr = 0, totalWater = 0, recordCount = 0, waterCount = 0;

  templateData.data.forEach((item) => {
    const milkType = (item.type || '').toString().toLowerCase().trim();
    if (milkType === "cow") { cowLiters += item.liters; cowAmount += item.amount; }
    else if (milkType === "buffalo") { buffaloLiters += item.liters; buffaloAmount += item.amount; }
    totalLiters += item.liters; totalAmount += item.amount; totalFat += item.fat; totalSnf += item.snf; totalClr += item.clr;
    if (item.water !== null && item.water !== undefined) { totalWater += item.water; waterCount++; }
    recordCount++;
  });

  const avgFat = recordCount > 0 ? (totalFat / recordCount).toFixed(1) : "0.0";
  const avgSnf = recordCount > 0 ? (totalSnf / recordCount).toFixed(1) : "0.0";
  const avgClr = recordCount > 0 ? (totalClr / recordCount).toFixed(1) : "0.0";
  const avgWater = waterCount > 0 ? (totalWater / waterCount).toFixed(1) : "-";

  const generateTableForType = (dataMap: Map<string, FarmerBillData>) => {
    let rows = "";
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const displayDate = `${currentDate.getDate().toString().padStart(2, "0")}/${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate.getFullYear()}`;
      const morningKey = `${displayDate}_Morning`;
      const morningData = dataMap.get(morningKey);
      rows += `<tr><td>${displayDate}</td><td>Morning</td>`;
      if (morningData) {
        rows += `<td>${morningData.liters.toFixed(1)}</td><td>${morningData.fat.toFixed(1)}</td><td>${morningData.snf.toFixed(1)}</td><td>${morningData.clr.toFixed(1)}</td><td>${morningData.water !== null && morningData.water !== undefined ? morningData.water.toFixed(1) : '-'}</td><td>${morningData.rate.toFixed(1)}</td><td>${morningData.amount.toFixed(1)}</td>`;
      } else {
        rows += `<td></td><td></td><td></td><td></td><td></td><td></td><td></td>`;
      }
      rows += `</tr>`;
      const eveningKey = `${displayDate}_Evening`;
      const eveningData = dataMap.get(eveningKey);
      rows += `<tr><td></td><td>Evening</td>`;
      if (eveningData) {
        rows += `<td>${eveningData.liters.toFixed(1)}</td><td>${eveningData.fat.toFixed(1)}</td><td>${eveningData.snf.toFixed(1)}</td><td>${eveningData.clr.toFixed(1)}</td><td>${eveningData.water !== null && eveningData.water !== undefined ? eveningData.water.toFixed(1) : '-'}</td><td>${eveningData.rate.toFixed(1)}</td><td>${eveningData.amount.toFixed(1)}</td>`;
      } else {
        rows += `<td></td><td></td><td></td><td></td><td></td><td></td><td></td>`;
      }
      rows += `</tr>`;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return rows;
  };

  const hasCowData = cowLiters > 0;
  const hasBuffaloData = buffaloLiters > 0;
  const hasBothTypes = hasCowData && hasBuffaloData;
  
  let cowTableHtml = '';
  let buffaloTableHtml = '';
  
  if (hasBothTypes) {
    const cowRows = generateTableForType(cowData);
    const cowTotal = `<tr class="total-row"><td colspan="2">Cow Total</td><td>${cowLiters.toFixed(1)}</td><td colspan="4"></td><td>${cowLiters > 0 ? (cowAmount / cowLiters).toFixed(1) : "0.0"}</td><td>${cowAmount.toFixed(1)}</td></tr>`;
    cowTableHtml = `<div class="milk-type-label">Cow Milk</div><table class="main-table"><thead><tr><th>Date</th><th>Shift</th><th>Liter</th><th>Fat</th><th>SNF</th><th>CLR</th><th>Water</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${cowRows}${cowTotal}</tbody></table>`;
    
    const buffaloRows = generateTableForType(buffaloData);
    const buffaloTotal = `<tr class="total-row"><td colspan="2">Buffalo Total</td><td>${buffaloLiters.toFixed(1)}</td><td colspan="4"></td><td>${buffaloLiters > 0 ? (buffaloAmount / buffaloLiters).toFixed(1) : "0.0"}</td><td>${buffaloAmount.toFixed(1)}</td></tr>`;
    buffaloTableHtml = `<div class="milk-type-label">Buffalo Milk</div><table class="main-table"><thead><tr><th>Date</th><th>Shift</th><th>Liter</th><th>Fat</th><th>SNF</th><th>CLR</th><th>Water</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${buffaloRows}${buffaloTotal}</tbody></table>`;
  }
  
  let tableRows = "";
  const dataToUse = hasCowData ? cowData : (hasBuffaloData ? buffaloData : groupedData);
  tableRows += generateTableForType(dataToUse);

  let paymentsAdvance = 0, paymentsCattleFeed = 0, paymentsOther1 = 0, paymentsOther2 = 0;
  let deductionAdvance = 0, deductionCattleFeed = 0, deductionOther1 = 0, deductionOther2 = 0;
  let previousAdvanceRemaining = 0, previousCattleFeedRemaining = 0, previousOther1Remaining = 0, previousOther2Remaining = 0;
  
  const farmerPayments = Array.isArray(templateData.paymentSummary?.farmer_payments) 
    ? templateData.paymentSummary.farmer_payments 
    : (Array.isArray(templateData.paymentSummary) ? templateData.paymentSummary : []);
  console.log('Template4 - Farmer', templateData.farmerCode, '- Payments:', farmerPayments.length, 'records');
  
  farmerPayments.forEach((payment: any) => {
    const paymentType = (payment.payment_type || '').toLowerCase();
    const amountTaken = parseFloat(payment.amount_taken || 0);
    if (paymentType === 'advance') paymentsAdvance += amountTaken;
    else if (paymentType === 'cattle feed') paymentsCattleFeed += amountTaken;
    else if (paymentType === 'other1') paymentsOther1 += amountTaken;
    else if (paymentType === 'other2') paymentsOther2 += amountTaken;
  });
  
  const farmerBillData = templateData.farmerBill?.farmerwise_bills?.find(
    (bill: any) => bill.farmer_id === templateData.farmerCode
  );
  if (farmerBillData) {
    if (farmerBillData.deductions) {
      deductionAdvance = parseFloat(farmerBillData.deductions.advance || 0);
      deductionCattleFeed = parseFloat(farmerBillData.deductions.cattle_feed || 0);
      deductionOther1 = parseFloat(farmerBillData.deductions.other1 || 0);
      deductionOther2 = parseFloat(farmerBillData.deductions.other2 || 0);
    }
    if (farmerBillData.remaining) {
      previousAdvanceRemaining = parseFloat(farmerBillData.remaining.advance_remaining || 0);
      previousCattleFeedRemaining = parseFloat(farmerBillData.remaining.cattlefeed_remaining || 0);
      previousOther1Remaining = parseFloat(farmerBillData.remaining.other1_remaining || 0);
      previousOther2Remaining = parseFloat(farmerBillData.remaining.other2_remaining || 0);
    }
  }
  
  const totalDeduction = deductionAdvance + deductionCattleFeed + deductionOther1 + deductionOther2;
  const totalPreviousRemaining = previousAdvanceRemaining + previousCattleFeedRemaining + previousOther1Remaining + previousOther2Remaining;
  const totalPayments = paymentsAdvance + paymentsCattleFeed + paymentsOther1 + paymentsOther2;
  const advanceRemaining = Math.max(0, previousAdvanceRemaining + paymentsAdvance - deductionAdvance);
  const cattleFeedRemaining = Math.max(0, previousCattleFeedRemaining + paymentsCattleFeed - deductionCattleFeed);
  const other1Remaining = Math.max(0, previousOther1Remaining + paymentsOther1 - deductionOther1);
  const other2Remaining = Math.max(0, previousOther2Remaining + paymentsOther2 - deductionOther2);
  const totalRemaining = Math.max(0, advanceRemaining + cattleFeedRemaining + other1Remaining + other2Remaining);

  let paymentDetailsRows = '';
  if (farmerPayments.length > 0) {
    farmerPayments.forEach((payment: any) => {
      const paymentDate = payment.date ? new Date(payment.date).toLocaleDateString('en-GB') : 'N/A';
      paymentDetailsRows += `<tr><td>${paymentDate}</td><td>${payment.payment_type || 'N/A'}</td><td>${parseFloat(payment.amount_taken || 0).toFixed(2)}</td></tr>`;
    });
  } else {
    paymentDetailsRows = '<tr><td colspan="3" style="text-align: center;">No payment data available</td></tr>';
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; margin: 0; padding: 8px; }
    .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 8px; padding-top: 14px; }
    .invoice-info { display: flex; justify-content: space-between; margin: 6px 0; font-size: 10px; border: 1px solid black; padding: 6px; }
    .main-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    .main-table th, .main-table td { padding: 4px; text-align: center; font-size: 10px; border: none; }
    .main-table th { background-color: #e0e0e0; font-weight: bold; border-bottom: 1px solid black; }
    .total-row { font-weight: bold; background-color: #f0f0f0; }
    .summary-section { margin-top: 8px; }
    .section-title { font-size: 12px; font-weight: bold; margin: 6px 0 3px 0; background-color: #e0e0e0; padding: 3px; border: 1px solid black; }
    .deduction-table, .payment-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    .deduction-table th, .deduction-table td, .payment-table th, .payment-table td { border: 1px solid black; padding: 4px; text-align: center; font-size: 10px; }
    .deduction-table th, .payment-table th { background-color: #e0e0e0; font-weight: bold; }
    .summary-info { display: flex; justify-content: space-between; border: 1px solid black; padding: 6px; font-size: 10px; }
    .summary-info > div { flex: 1; }
    .milk-type-label { font-weight: bold; font-size: 11px; margin: 4px 0; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
  <div class="header">${templateData.branchName}</div>
  <div class="header">${templateData.dairyName}</div>
  <div class="invoice-info">
    <div><strong>Code & Name:</strong> ${templateData.farmerCode} ${templateData.farmerName}<br><strong>Branch:</strong> ${templateData.branchName}</div>
    <div><strong>Invoice No.</strong> 1<br><strong>Invoice Date:</strong> ${new Date().toLocaleDateString("en-GB")}<br><strong>Bill Period:</strong> ${templateData.fromDate} <strong>To</strong> ${templateData.toDate}</div>
  </div>
  ${hasBothTypes ? cowTableHtml + buffaloTableHtml : `<table class="main-table">
    <thead><tr><th>Date</th><th>Shift</th><th>Liter</th><th>Fat</th><th>SNF</th><th>CLR</th><th>Water</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>${tableRows}<tr class="total-row"><td colspan="2">Total</td><td>${totalLiters.toFixed(1)}</td><td>${avgFat}</td><td>${avgSnf}</td><td>${avgClr}</td><td>${avgWater}</td><td>${totalLiters > 0 ? (totalAmount / totalLiters).toFixed(1) : "0.0"}</td><td>${totalAmount.toFixed(1)}</td></tr></tbody>
  </table>`}
  ${hasBothTypes ? '<div class="page-break"></div>' : ''}
  <div class="summary-section">
    <div class="section-title">Deduction Summary</div>
    <table class="deduction-table">
      <thead><tr><th>Deduction Name</th><th>Previous Remaining</th><th>Payments</th><th>Deduction</th><th>Balance</th></tr></thead>
      <tbody>
        <tr><td>Cattle Feed</td><td>0.00</td><td>${paymentsCattleFeed.toFixed(2)}</td><td>${deductionCattleFeed.toFixed(2)}</td><td>${previousCattleFeedRemaining.toFixed(2)}</td></tr>
        <tr><td>Advance</td><td>0.00</td><td>${paymentsAdvance.toFixed(2)}</td><td>${deductionAdvance.toFixed(2)}</td><td>${previousAdvanceRemaining.toFixed(2)}</td></tr>
        <tr><td>Other 1</td><td>0.00</td><td>${paymentsOther1.toFixed(2)}</td><td>${deductionOther1.toFixed(2)}</td><td>${previousOther1Remaining.toFixed(2)}</td></tr>
        <tr><td>Other 2</td><td>0.00</td><td>${paymentsOther2.toFixed(2)}</td><td>${deductionOther2.toFixed(2)}</td><td>${previousOther2Remaining.toFixed(2)}</td></tr>
        <tr class="total-row"><td><strong>Total</strong></td><td><strong>0.00</strong></td><td><strong>${totalPayments.toFixed(2)}</strong></td><td><strong>${totalDeduction.toFixed(2)}</strong></td><td><strong>${totalPreviousRemaining.toFixed(2)}</strong></td></tr>
      </tbody>
    </table>
    <div class="summary-info">
      <div>${templateData.hideRateAmount ? `<strong>Per Liter Rate:</strong> ${totalLiters > 0 ? (totalAmount / totalLiters).toFixed(2) : "0.00"}<br>` : ''}<strong>Total Amount:</strong> ${totalAmount.toFixed(2)}<br><strong>Cow Milk:</strong> ${cowLiters.toFixed(2)} L<br><strong>Buffalo Milk:</strong> ${buffaloLiters.toFixed(2)} L<br><strong>Total Milk:</strong> ${totalLiters.toFixed(2)} L<br><strong>Total Deduction:</strong> ${totalDeduction.toFixed(2)}<br><strong>Net Payable:</strong> ${Math.max(0, totalAmount - totalDeduction).toFixed(2)}<br><strong>Remaining Amount:</strong> ${totalPreviousRemaining.toFixed(2)}</div>
      <div><strong>Bank Details:</strong><br><strong>A/C No.:</strong> ${templateData.bankDetails?.accountNumber || "N/A"}<br><strong>IFSC:</strong> ${templateData.bankDetails?.ifscCode || "N/A"}<br><strong>Bank:</strong> ${templateData.bankDetails?.bankName || "N/A"}<br><strong>Branch:</strong> ${templateData.bankDetails?.branchName || "N/A"}</div>
    </div>
  </div>
</body>
</html>`;
};
