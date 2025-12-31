export interface FarmerBillData {
  date: string;
  shift: string;
  type: string;
  liters: number;
  fat: number;
  snf: number;
  clr: number;
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
  farmerCode: string;
  farmerName: string;
  fromDate: string;
  toDate: string;
  milkType: string;
  data: FarmerBillData[];
  farmerBill?: any;
  paymentSummary?: any;
  bankDetails?: BankDetails;
}

export const generateTemplate2 = (templateData: Template2Data): string => {
  console.log("Template2 - Input data:", JSON.stringify(templateData, null, 2));

  let farmerBillData = null;
  console.log(`🔍 Template2 - Searching for farmer ${templateData.farmerCode}:`, {
    farmerId: templateData.farmerCode,
    farmerBillExists: !!templateData.farmerBill,
    isArray: Array.isArray(templateData.farmerBill),
  });

  if (templateData.farmerBill?.farmerwise_bills) {
    const farmerwiseBills = templateData.farmerBill.farmerwise_bills;
    console.log(`🔍 Template2 - Available farmer IDs:`, farmerwiseBills.map((b: any) => b.farmer_id));

    farmerBillData = farmerwiseBills.find((bill: any) => {
      const billId = String(bill.farmer_id).trim();
      const searchId = String(templateData.farmerCode).trim();
      console.log(`🔍 Template2 - Comparing: "${billId}" vs "${searchId}"`);

      if (billId === searchId) {
        console.log(`✅ Template2 - Exact match found: ${billId}`);
        return true;
      }

      const billIdPadded = billId.padStart(4, "0");
      const searchIdPadded = searchId.padStart(4, "0");
      if (billIdPadded === searchIdPadded) {
        console.log(`✅ Template2 - Padded match found: ${billIdPadded}`);
        return true;
      }

      const billIdNum = parseInt(billId);
      const searchIdNum = parseInt(searchId);
      if (!isNaN(billIdNum) && !isNaN(searchIdNum) && billIdNum === searchIdNum) {
        console.log(`✅ Template2 - Numeric match found: ${billIdNum}`);
        return true;
      }

      return false;
    });

    console.log(`🔍 Template2 - Final result for farmer ${templateData.farmerCode}:`, {
      found: !!farmerBillData,
      data: farmerBillData,
    });
  }

  const fromDateParts = templateData.fromDate.includes("/")
    ? templateData.fromDate.split("/")
    : templateData.fromDate.split("-");
  const toDateParts = templateData.toDate.includes("/")
    ? templateData.toDate.split("/")
    : templateData.toDate.split("-");

  const fromDate = templateData.fromDate.includes("/")
    ? new Date(parseInt(fromDateParts[2]), parseInt(fromDateParts[1]) - 1, parseInt(fromDateParts[0]))
    : new Date(templateData.fromDate);
  const toDate = templateData.toDate.includes("/")
    ? new Date(parseInt(toDateParts[2]), parseInt(toDateParts[1]) - 1, parseInt(toDateParts[0]))
    : new Date(templateData.toDate);

  const groupedData = new Map<string, FarmerBillData>();
  const cowData = new Map<string, FarmerBillData>();
  const buffaloData = new Map<string, FarmerBillData>();

  for (const item of templateData.data) {
    const itemDate = new Date(item.date);
    const dateKey = `${itemDate.getDate().toString().padStart(2, "0")}/${(itemDate.getMonth() + 1).toString().padStart(2, "0")}/${itemDate.getFullYear()}`;
    const key = `${dateKey}_${item.shift}`;
    const milkType = (item.type || '').toString().toLowerCase().trim();
    
    groupedData.set(key, item);
    
    if (milkType === "cow") {
      cowData.set(key, item);
    } else if (milkType === "buffalo") {
      buffaloData.set(key, item);
    }
  }

  let cowLiters = 0, cowAmount = 0;
  let buffaloLiters = 0, buffaloAmount = 0;
  let totalLiters = 0, totalAmount = 0;
  let totalFat = 0, totalSnf = 0, totalClr = 0, recordCount = 0;

  templateData.data.forEach((item) => {
    const milkType = (item.type || '').toString().toLowerCase().trim();
    
    if (milkType === "cow") {
      cowLiters += item.liters;
      cowAmount += item.amount;
    } else if (milkType === "buffalo") {
      buffaloLiters += item.liters;
      buffaloAmount += item.amount;
    }
    totalLiters += item.liters;
    totalAmount += item.amount;
    totalFat += item.fat;
    totalSnf += item.snf;
    totalClr += item.clr;
    recordCount++;
  });

  const avgFat = recordCount > 0 ? (totalFat / recordCount).toFixed(1) : "0.0";
  const avgSnf = recordCount > 0 ? (totalSnf / recordCount).toFixed(1) : "0.0";
  const avgClr = recordCount > 0 ? (totalClr / recordCount).toFixed(1) : "0.0";

  const generateTableForType = (dataMap: Map<string, FarmerBillData>) => {
    let rows = "";
    
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const displayDate = `${currentDate.getDate().toString().padStart(2, "0")}/${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate.getFullYear()}`;

      const morningKey = `${displayDate}_Morning`;
      const morningData = dataMap.get(morningKey);
      rows += `<tr><td>${displayDate}</td><td>Morning</td>`;
      if (morningData) {
        rows += `<td>${morningData.liters.toFixed(1)}</td><td>${morningData.fat.toFixed(1)}</td><td>${morningData.snf.toFixed(1)}</td><td>${morningData.clr.toFixed(1)}</td><td>${morningData.rate.toFixed(1)}</td><td>${morningData.amount.toFixed(1)}</td>`;
      } else {
        rows += `<td></td><td></td><td></td><td></td><td></td><td></td>`;
      }
      rows += `</tr>`;

      const eveningKey = `${displayDate}_Evening`;
      const eveningData = dataMap.get(eveningKey);
      rows += `<tr><td></td><td>Evening</td>`;
      if (eveningData) {
        rows += `<td>${eveningData.liters.toFixed(1)}</td><td>${eveningData.fat.toFixed(1)}</td><td>${eveningData.snf.toFixed(1)}</td><td>${eveningData.clr.toFixed(1)}</td><td>${eveningData.rate.toFixed(1)}</td><td>${eveningData.amount.toFixed(1)}</td>`;
      } else {
        rows += `<td></td><td></td><td></td><td></td><td></td><td></td>`;
      }
      rows += `</tr>`;

      currentDate.setDate(currentDate.getDate() + 1);
    }
    return rows;
  };

  const hasCowData = cowLiters > 0;
  const hasBuffaloData = buffaloLiters > 0;
  const hasBothTypes = hasCowData && hasBuffaloData;
  
  let tableRows = "";
  
  if (hasBothTypes) {
    tableRows += '<div class="milk-type-label">Cow Milk</div>';
    tableRows += generateTableForType(cowData);
    tableRows += `</tbody></table><div style="page-break-before: always;"></div><div class="milk-type-label">Buffalo Milk</div><table class="main-table"><thead><tr><th>Date</th><th>Shift</th><th>Liter</th><th>Fat</th><th>SNF</th><th>CLR</th><th>Rate</th><th>Amount</th></tr></thead><tbody>`;
    tableRows += generateTableForType(buffaloData);
  } else {
    const dataToUse = hasCowData ? cowData : (hasBuffaloData ? buffaloData : groupedData);
    tableRows += generateTableForType(dataToUse);
  }

  let paymentsAdvance = 0, paymentsCattleFeed = 0, paymentsOther1 = 0, paymentsOther2 = 0;
  let deductionAdvance = 0, deductionCattleFeed = 0, deductionOther1 = 0, deductionOther2 = 0;
  let previousAdvanceRemaining = 0, previousCattleFeedRemaining = 0, previousOther1Remaining = 0, previousOther2Remaining = 0;
  let milkTotal = totalAmount;
  let netPayable = totalAmount;
  
  if (templateData.paymentSummary?.data && Array.isArray(templateData.paymentSummary.data)) {
    const dateWiseData = templateData.paymentSummary.data;
    
    dateWiseData.forEach((dateGroup: any) => {
      const farmersForDate = dateGroup.farmers || [];
      const farmerData = farmersForDate.find((f: any) => String(f.farmer_id) === String(templateData.farmerCode));
      
      if (farmerData && farmerData.deductions) {
        paymentsAdvance += farmerData.deductions.advance || 0;
        paymentsCattleFeed += farmerData.deductions.cattle_feed || 0;
        paymentsOther1 += farmerData.deductions.other1 || 0;
        paymentsOther2 += farmerData.deductions.other2 || 0;
      }
    });
    
    const firstDateGroup = dateWiseData[0];
    if (firstDateGroup && firstDateGroup.farmers) {
      const farmerData = firstDateGroup.farmers.find((f: any) => String(f.farmer_id) === String(templateData.farmerCode));
      
      if (farmerData && farmerData.from_bills) {
        deductionAdvance = farmerData.from_bills.advance_total || 0;
        deductionCattleFeed = farmerData.from_bills.cattlefeed_total || 0;
        deductionOther1 = farmerData.from_bills.other1_total || 0;
        deductionOther2 = farmerData.from_bills.other2_total || 0;
      }
      
      if (farmerData && farmerData.previous_bill) {
        previousAdvanceRemaining = farmerData.previous_bill.advance_remaining || 0;
        previousCattleFeedRemaining = farmerData.previous_bill.cattlefeed_remaining || 0;
        previousOther1Remaining = farmerData.previous_bill.other1_remaining || 0;
        previousOther2Remaining = farmerData.previous_bill.other2_remaining || 0;
      }
    }
    
    milkTotal = dateWiseData.reduce((total: number, dateGroup: any) => {
      const farmersForDate = dateGroup.farmers || [];
      const farmerData = farmersForDate.find((f: any) => String(f.farmer_id) === String(templateData.farmerCode));
      return total + (farmerData?.milk_total || 0);
    }, 0);
    
    netPayable = dateWiseData.reduce((total: number, dateGroup: any) => {
      const farmersForDate = dateGroup.farmers || [];
      const farmerData = farmersForDate.find((f: any) => String(f.farmer_id) === String(templateData.farmerCode));
      return total + (farmerData?.net_payable || 0);
    }, 0);
  }
  
  const totalDeduction = deductionAdvance + deductionCattleFeed + deductionOther1 + deductionOther2;
  const totalPreviousRemaining = previousAdvanceRemaining + previousCattleFeedRemaining + previousOther1Remaining + previousOther2Remaining;
  const totalPayments = paymentsAdvance + paymentsCattleFeed + paymentsOther1 + paymentsOther2;
  
  const advanceRemaining = previousAdvanceRemaining + paymentsAdvance - deductionAdvance;
  const cattleFeedRemaining = previousCattleFeedRemaining + paymentsCattleFeed - deductionCattleFeed;
  const other1Remaining = previousOther1Remaining + paymentsOther1 - deductionOther1;
  const other2Remaining = previousOther2Remaining + paymentsOther2 - deductionOther2;
  const totalRemaining = advanceRemaining + cattleFeedRemaining + other1Remaining + other2Remaining;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 16px; line-height: 1.0; margin: 0; padding: 8px; }
    .header { text-align: center; font-size: 20px; font-weight: bold; margin: 0; margin-bottom: 1px; }
    .invoice-info { display: flex; justify-content: space-between; margin: 1px 0; font-size: 14px; }
    .main-table { width: 80%; border-collapse: collapse; margin: 2px 0; border: 1px solid black; }
    .main-table th, .main-table td { padding: 3px; text-align: center; font-size: 12px; border-left: none; border-right: none; }
    .main-table th { background-color: #f0f0f0; font-weight: bold; border-bottom: 1px solid black; }
    .main-table tbody tr td { border-top: none; border-bottom: none; }
    .total-row td { border-top: 1px solid black !important; border-bottom: 1px solid black !important; }
    .summary-section { margin-top: 3px; }
    .summary-table { width: 100%; border-collapse: collapse; }
    .summary-table td { border: 1px solid black; padding: 3px; font-size: 13px; vertical-align: top; }
    .summary-left { width: 50%; }
    .summary-right { width: 50%; }
    .deduction-table { width: 100%; border-collapse: collapse; }
    .deduction-table td { border: 1px solid black; padding: 1px; text-align: center; font-size: 12px; }
    .payment-details { text-align: left; padding: 2px; }
    .total-row { font-weight: bold; background-color: #f0f0f0; }
    @media print {
      .page-break { page-break-before: always; }
      div[style*="page-break-before: always"] { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="header">${templateData.dairyName}</div>
  
  <div class="invoice-info">
    <div>
      <strong>Code & Name:</strong> ${templateData.farmerCode} ${templateData.farmerName}<br>
      <strong>Branch:</strong> ${templateData.branchName}
    </div>
    <div>
      <strong>Invoice No.</strong> 1<br>
      <strong>Invoice Date</strong> ${new Date().toLocaleDateString("en-GB")}<br>
      <strong>Bill Date</strong> ${templateData.fromDate} <strong>To</strong> ${templateData.toDate}
    </div>
  </div>

  <table class="main-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Shift</th>
        <th>Liter</th>
        <th>Fat</th>
        <th>SNF</th>
        <th>CLR</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="total-row">
        <td colspan="2">Total</td>
        <td>${totalLiters.toFixed(1)}</td>
        <td>${avgFat}</td>
        <td>${avgSnf}</td>
        <td>${avgClr}</td>
        <td>${totalLiters > 0 ? (totalAmount / totalLiters).toFixed(1) : "0.0"}</td>
        <td>${totalAmount.toFixed(1)}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary-section">
    <table class="summary-table">
      <tr>
        <td class="summary-left">
          <table class="deduction-table">
            <tr><td><strong>Deduction Name</strong></td><td><strong>Previous Remaning</strong></td><td><strong>Payments</strong></td><td><strong>Deduction</strong></td><td><strong>Balance</strong></td></tr>
            <tr><td>Cattle Feed</td><td>${previousCattleFeedRemaining.toFixed(2)}</td><td>${paymentsCattleFeed.toFixed(2)}</td><td>${deductionCattleFeed.toFixed(2)}</td><td>${cattleFeedRemaining.toFixed(2)}</td></tr>
            <tr><td>Advance</td><td>${previousAdvanceRemaining.toFixed(2)}</td><td>${paymentsAdvance.toFixed(2)}</td><td>${deductionAdvance.toFixed(2)}</td><td>${advanceRemaining.toFixed(2)}</td></tr>
            <tr><td>Other 1</td><td>${previousOther1Remaining.toFixed(2)}</td><td>${paymentsOther1.toFixed(2)}</td><td>${deductionOther1.toFixed(2)}</td><td>${other1Remaining.toFixed(2)}</td></tr>
            <tr><td>Other 2</td><td>${previousOther2Remaining.toFixed(2)}</td><td>${paymentsOther2.toFixed(2)}</td><td>${deductionOther2.toFixed(2)}</td><td>${other2Remaining.toFixed(2)}</td></tr>
            <tr class="total-row"><td><strong>Total</strong></td><td><strong>${totalPreviousRemaining.toFixed(2)}</strong></td><td><strong>${totalPayments.toFixed(2)}</strong></td><td><strong>${totalDeduction.toFixed(2)}</strong></td><td><strong>${totalRemaining.toFixed(2)}</strong></td></tr>
          </table>
        </td>
        <td class="summary-right">
          <div class="payment-details" style="display: flex; justify-content: space-between;">
            <div>
              <strong>Total Amount:</strong> ${milkTotal.toFixed(2)}<br>
              <strong>Cow Milk:</strong> ${cowLiters.toFixed(2)}<br>
              <strong>Buffalo Milk:</strong> ${buffaloLiters.toFixed(2)}<br>
              <strong>Total Milk:</strong> ${totalLiters.toFixed(2)}<br>
              <strong>Total Deduction:</strong> ${totalDeduction.toFixed(2)}<br>
              <strong>Net Payable:</strong> ${Math.max(0, totalAmount - totalDeduction).toFixed(2)}<br>
              <strong>Remaining Amount:</strong> ${totalRemaining.toFixed(2)}
            </div>
            <div>
              <strong>Bank Details:</strong><br>
              <strong>A/C No.:</strong> ${templateData.bankDetails?.accountNumber || "N/A"}<br>
              <strong>IFSC:</strong> ${templateData.bankDetails?.ifscCode || "N/A"}<br>
              <strong>Bank:</strong> ${templateData.bankDetails?.bankName || "N/A"}
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
};
