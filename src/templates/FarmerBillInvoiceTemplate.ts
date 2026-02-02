export interface FarmerBillData {
  date: string;
  shift: string;
  type: string;
  liters: number;
  fat: number;
  snf: number;
  clr: number;
  water?: number | null;
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
  farmerBill?:
    | {
        farmer_id: string;
        milk_total: number;
        received_total: number;
        net_payable: number;
        deductions: {
          advance: number;
          cattle_feed: number;
          other1: number;
          other2: number;
        };
        remaining: {
          advance_remaining: number;
          cattlefeed_remaining: number;
          other1_remaining: number;
          other2_remaining: number;
        };
        farmer_payments?: {
          farmer_id: string;
          payment_type: string;
          amount_taken: string;
          received: string;
        }[];
        data?: {
          date: string;
          farmers: {
            farmer_id: string;
            farmer_name: string;
            milk_total: number;
            net_payable: number;
            deductions: {
              advance: number;
              cattle_feed: number;
              other1: number;
              other2: number;
            };
            from_bills: {
              advance_total: number;
              cattlefeed_total: number;
              other1_total: number;
              other2_total: number;
            };
            previous_bill?: {
              advance_remaining: number;
              cattlefeed_remaining: number;
              other1_remaining: number;
              other2_remaining: number;
            };
          }[];
        }[];
        farmerwise_bills?: any[]; 
      }[]
    | {
        farmer_payments?: {
          farmer_id: string;
          payment_type: string;
          amount_taken: string;
          received: string;
        }[];
        data?: any[];
        farmerwise_bills?: any[];
      } | any;
  paymentSummary?: {
    data: {
      date: string;
      farmers: {
        farmer_id: string;
        farmer_name: string;
        milk_total: number;
        net_payable: number;
        deductions: {
          advance: number;
          cattle_feed: number;
          other1: number;
          other2: number;
        };
        from_bills: {
          advance_total: number;
          cattlefeed_total: number;
          other1_total: number;
          other2_total: number;
        };
        previous_bill?: {
          advance_remaining: number;
          cattlefeed_remaining: number;
          other1_remaining: number;
          other2_remaining: number;
        };
      }[];
    }[];
  };
  bankDetails?: BankDetails;
  hideRateAmount?: boolean;
  hideHeader?: boolean;
  hideSummary?: boolean;
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
  console.log("Template1 - Input data:", JSON.stringify(templateData, null, 2));

  // Find farmer bill data for this specific farmer
  let farmerBillData = null;
  console.log(
    `🔍 Template1 - Searching for farmer ${templateData.farmerCode}:`,
    {
      farmerId: templateData.farmerCode,
      farmerBillExists: !!templateData.farmerBill,
      isArray: Array.isArray(templateData.farmerBill),
    }
  );

  if (templateData.farmerBill) {
    let billsToSearch: any[] = [];
    
    // Handle new API structure (cow/buffalo arrays)
    if (templateData.farmerBill.cow || templateData.farmerBill.buffalo) {
         if (Array.isArray(templateData.farmerBill.cow)) {
             billsToSearch = [...billsToSearch, ...templateData.farmerBill.cow];
         }
         if (Array.isArray(templateData.farmerBill.buffalo)) {
             billsToSearch = [...billsToSearch, ...templateData.farmerBill.buffalo];
         }
    } 
    // Handle old/existing structure
    else if (templateData.farmerBill.farmerwise_bills) {
        billsToSearch = templateData.farmerBill.farmerwise_bills;
    }
    // Handle case where farmerBill is the array itself
    else if (Array.isArray(templateData.farmerBill)) {
        billsToSearch = templateData.farmerBill;
    }

    console.log(
      `🔍 Template1 - Available farmer IDs in search list:`,
      billsToSearch.map((b: any) => b.farmer_id)
    );

    // Enhanced matching logic
    farmerBillData = billsToSearch.find((bill: any) => {
      const billId = String(bill.farmer_id).trim();
      const searchId = String(templateData.farmerCode).trim();
      console.log(`🔍 Template1 - Comparing: "${billId}" vs "${searchId}"`);

      // Exact match
      if (billId === searchId) {
        console.log(`✅ Template1 - Exact match found: ${billId}`);
        return true;
      }

      // Try matching with leading zeros normalized
      const billIdPadded = billId.padStart(4, "0");
      const searchIdPadded = searchId.padStart(4, "0");
      if (billIdPadded === searchIdPadded) {
        console.log(`✅ Template1 - Padded match found: ${billIdPadded}`);
        return true;
      }

      // Try matching with leading zeros removed
      const billIdNum = parseInt(billId);
      const searchIdNum = parseInt(searchId);
      if (
        !isNaN(billIdNum) &&
        !isNaN(searchIdNum) &&
        billIdNum === searchIdNum
      ) {
        console.log(`✅ Template1 - Numeric match found: ${billIdNum}`);
        return true;
      }

      return false;
    });

    console.log(
      `🔍 Template1 - Final result for farmer ${templateData.farmerCode}:`,
      {
        found: !!farmerBillData,
        data: farmerBillData,
      }
    );
  }
  console.log(
    `PDF Generator - Farmer ${templateData.farmerCode} bill data:`,
    farmerBillData ? "Found" : "null"
  );

  console.log(
    "Template1 - FarmerBill data:",
    JSON.stringify(farmerBillData, null, 2)
  );

  // Parse bill cycle dates
  const fromDateParts = templateData.fromDate.includes("/")
    ? templateData.fromDate.split("/")
    : templateData.fromDate.split("-");
  const toDateParts = templateData.toDate.includes("/")
    ? templateData.toDate.split("/")
    : templateData.toDate.split("-");

  const fromDate = templateData.fromDate.includes("/")
    ? new Date(
        parseInt(fromDateParts[2]),
        parseInt(fromDateParts[1]) - 1,
        parseInt(fromDateParts[0])
      )
    : new Date(templateData.fromDate);
  const toDate = templateData.toDate.includes("/")
    ? new Date(
        parseInt(toDateParts[2]),
        parseInt(toDateParts[1]) - 1,
        parseInt(toDateParts[0])
      )
    : new Date(templateData.toDate);

  // Group data by date, shift, and milk type
  const groupedData = new Map<string, FarmerBillData>();
  const cowData = new Map<string, FarmerBillData>();
  const buffaloData = new Map<string, FarmerBillData>();

  for (const item of templateData.data) {
    const itemDate = new Date(item.date);
    const dateKey = `${itemDate.getDate().toString().padStart(2, "0")}/${(
      itemDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${itemDate.getFullYear()}`;
    const key = `${dateKey}_${item.shift}`;
    const milkType = (item.type || '').toString().toLowerCase().trim();
    
    groupedData.set(key, item);
    
    if (milkType === "cow") {
      cowData.set(key, item);
    } else if (milkType === "buffalo") {
      buffaloData.set(key, item);
    }
  }

  // Calculate totals by milk type
  // Pre-filter data if a specific milk type is requested
  let processedData = templateData.data;
  if (templateData.milkType === 'Cow') {
    processedData = templateData.data.filter(item => (item.type || '').toString().toLowerCase().trim() === 'cow');
  } else if (templateData.milkType === 'Buffalo') {
    processedData = templateData.data.filter(item => (item.type || '').toString().toLowerCase().trim() === 'buffalo');
  }

  // Calculate totals by milk type
  let cowLiters = 0,
    cowAmount = 0;
  let buffaloLiters = 0,
    buffaloAmount = 0;
  let totalLiters = 0,
    totalAmount = 0;
  let totalFat = 0,
    totalSnf = 0,
    totalClr = 0,
    recordCount = 0;

  processedData.forEach((item) => {
    // Normalize milk type to handle case variations
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
  
  // These specific totals are less relevant now that we pre-filter, but good to keep for the hybrid 'All' view
  const cowTotalFat = processedData.filter(item => (item.type || '').toString().toLowerCase().trim() === "cow").reduce((sum, item) => sum + item.fat, 0);
  const cowTotalSnf = processedData.filter(item => (item.type || '').toString().toLowerCase().trim() === "cow").reduce((sum, item) => sum + item.snf, 0);
  const cowTotalClr = processedData.filter(item => (item.type || '').toString().toLowerCase().trim() === "cow").reduce((sum, item) => sum + item.clr, 0);
  
  const buffaloTotalFat = processedData.filter(item => (item.type || '').toString().toLowerCase().trim() === "buffalo").reduce((sum, item) => sum + item.fat, 0);
  const buffaloTotalSnf = processedData.filter(item => (item.type || '').toString().toLowerCase().trim() === "buffalo").reduce((sum, item) => sum + item.snf, 0);
  const buffaloTotalClr = processedData.filter(item => (item.type || '').toString().toLowerCase().trim() === "buffalo").reduce((sum, item) => sum + item.clr, 0);

  // Generate table rows based on milk types present
  let hasCowData = cowLiters > 0;
  let hasBuffaloData = buffaloLiters > 0;

  // STRICT FILTERING: If the template requested a specific milk type, force the other type to be false
  // This allows the parent component to call this function twice (once for Cow, once for Buffalo) 
  // to facilitate generating separate PDF pages.
  if (templateData.milkType === 'Cow') {
    hasBuffaloData = false;
  } else if (templateData.milkType === 'Buffalo') {
    hasCowData = false;
  }

  const hasBothTypes = hasCowData && hasBuffaloData;
  
  let tableRows = "";
  
  // Function to generate table for specific milk type
  const generateTableForType = (dataMap: Map<string, FarmerBillData>, typeLabel: string) => {
    let rows = "";
    
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const displayDate = `${currentDate.getDate().toString().padStart(2, "0")}/${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate.getFullYear()}`;

      // Morning shift
      const morningKey = `${displayDate}_Morning`;
      const morningData = dataMap.get(morningKey);
      rows += `<tr><td>${displayDate}</td><td>Morning</td>`;
      if (morningData) {
        rows += `<td>${morningData.liters.toFixed(1)}</td><td>${morningData.fat.toFixed(1)}</td><td>${morningData.snf.toFixed(1)}</td><td>${morningData.clr.toFixed(1)}</td><td>${morningData.rate.toFixed(1)}</td><td>${morningData.amount.toFixed(1)}</td>`;
      } else {
        rows += `<td></td><td></td><td></td><td></td><td></td><td></td>`;
      }
      rows += `</tr>`;

      // Evening shift
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
  
  if (hasBothTypes) {
    tableRows += generateTableForType(cowData, "");
  } else {
    const dataToUse = hasCowData ? cowData : (hasBuffaloData ? buffaloData : groupedData);
    tableRows += generateTableForType(dataToUse, "");
  }

  // Handle new date-wise farmer data structure
  let paymentsAdvance = 0, paymentsCattleFeed = 0, paymentsOther1 = 0, paymentsOther2 = 0;
  let deductionAdvance = 0, deductionCattleFeed = 0, deductionOther1 = 0, deductionOther2 = 0;
  let previousAdvanceRemaining = 0, previousCattleFeedRemaining = 0, previousOther1Remaining = 0, previousOther2Remaining = 0;
  let milkTotal = totalAmount;
  let netPayable = totalAmount;
  
  // Check if we have the new date-wise data structure (from payment summary API)
  if (templateData.paymentSummary?.data && Array.isArray(templateData.paymentSummary.data)) {
    const dateWiseData = templateData.paymentSummary.data;
    
    // Sum up all deductions (payments) from all dates for this farmer
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
    
    // Get deduction values and previous bill remaining amounts from first date's from_bills
    const firstDateGroup = dateWiseData[0];
    if (firstDateGroup && firstDateGroup.farmers) {
      // Find farmer in the first date group, but robustly check types 
      const farmerData = firstDateGroup.farmers.find((f: any) => String(f.farmer_id) === String(templateData.farmerCode));
      
      // Get deduction values from from_bills
      if (farmerData && farmerData.from_bills) {
        deductionAdvance = farmerData.from_bills.advance_total || 0;
        deductionCattleFeed = farmerData.from_bills.cattlefeed_total || 0;
        deductionOther1 = farmerData.from_bills.other1_total || 0;
        deductionOther2 = farmerData.from_bills.other2_total || 0;
      }
      
      // Get previous bill remaining amounts
      if (farmerData && farmerData.previous_bill) {
        previousAdvanceRemaining = farmerData.previous_bill.advance_remaining || 0;
        previousCattleFeedRemaining = farmerData.previous_bill.cattlefeed_remaining || 0;
        previousOther1Remaining = farmerData.previous_bill.other1_remaining || 0;
        previousOther2Remaining = farmerData.previous_bill.other2_remaining || 0;
      }
    }
    
    // Calculate totals from date-wise data
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
  } else if (templateData.farmerBill?.data && Array.isArray(templateData.farmerBill.data)) {
    // This is the fallback for the old farmerBill.data structure
    const dateWiseData = templateData.farmerBill.data;
    
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
  } else {
    // Fallback to old structure
    const advance = farmerBillData?.deductions?.advance || 0;
    const cattleFeed = farmerBillData?.deductions?.cattle_feed || 0;
    const other1 = farmerBillData?.deductions?.other1 || 0;
    const other2 = farmerBillData?.deductions?.other2 || 0;
    
    paymentsAdvance = advance;
    paymentsCattleFeed = cattleFeed;
    paymentsOther1 = other1;
    paymentsOther2 = other2;
    
    milkTotal = farmerBillData?.milk_total || totalAmount;
    netPayable = farmerBillData?.net_payable || (milkTotal - (advance + cattleFeed + other1 + other2));
  }
  
  const totalDeduction = deductionAdvance + deductionCattleFeed + deductionOther1 + deductionOther2;
  const totalPreviousRemaining = previousAdvanceRemaining + previousCattleFeedRemaining + previousOther1Remaining + previousOther2Remaining;
  const totalPayments = paymentsAdvance + paymentsCattleFeed + paymentsOther1 + paymentsOther2;
  
  // Calculate current balance (Previous + Payments - Deductions)
  const advanceRemaining = previousAdvanceRemaining + paymentsAdvance - deductionAdvance;
  const cattleFeedRemaining = previousCattleFeedRemaining + paymentsCattleFeed - deductionCattleFeed;
  const other1Remaining = previousOther1Remaining + paymentsOther1 - deductionOther1;
  const other2Remaining = previousOther2Remaining + paymentsOther2 - deductionOther2;
  const totalRemaining = advanceRemaining + cattleFeedRemaining + other1Remaining + other2Remaining;
  
  console.log('Template1 - New Data Structure:', {
    'Data Source': templateData.paymentSummary?.data ? 'paymentSummary' : (templateData.farmerBill?.data ? 'farmerBill.data' : 'farmerwise_bills'),
    'Payments (Deductions)': { paymentsAdvance, paymentsCattleFeed, paymentsOther1, paymentsOther2 },
    'Deduction Values': { deductionAdvance, deductionCattleFeed, deductionOther1, deductionOther2 },
    'Previous Remaining': { previousAdvanceRemaining, previousCattleFeedRemaining, previousOther1Remaining, previousOther2Remaining },
    'Current Balance': { advanceRemaining, cattleFeedRemaining, other1Remaining, other2Remaining },
    'Totals': { milkTotal, netPayable, totalDeduction, totalRemaining }
  });

  console.log("Template1 - Deduction values:", {
    paymentsAdvance, paymentsCattleFeed, paymentsOther1, paymentsOther2, totalDeduction, netPayable
  });


  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 20px;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    .invoice-layout { 
      font-family: Arial, sans-serif; 
      font-size: 16px; 
      line-height: 1.2; 
      margin: 0;
      padding: 10px;
      box-sizing: border-box;
      width: 100%;
    }
    .header { 
      text-align: center; 
      font-size: 20px; 
      font-weight: bold; 
      margin: 0; 
      margin-bottom: 20px;
    }

    .invoice-info { 
      display: flex; 
      justify-content: space-between; 
      margin: 10px 0; 
      font-size: 14px; 
      line-height: 1.6;
    }
    .main-table { 
      width: 80%; 
      border-collapse: collapse; 
      margin: 5px 0 25px 0; 
      border: 1px solid black; 
    }
    .main-table th, .main-table td { 
      padding: 6px 3px 8px 3px; 
      text-align: center; 
      vertical-align: middle;
      font-size: 12px; 
      border-left: none; 
      border-right: none;
      line-height: normal;
    }
    .main-table th { background-color: #f0f0f0; font-weight: bold; border-bottom: 1px solid black; }
    .main-table tbody tr td { border-top: none; border-bottom: none; }
    .total-row td { border-top: 1px solid black !important; border-bottom: 1px solid black !important; }
    .summary-section { margin-top: 25px; }
    .summary-table { width: 100%; border-collapse: collapse; }
    .summary-table td { border: 1px solid black; padding: 3px; font-size: 13px; vertical-align: top; }
    .summary-left { width: 50%; }
    .summary-right { width: 50%; }
    .deduction-table { width: 100%; border-collapse: collapse; }
    .deduction-table td { border: 1px solid black; padding: 5px; text-align: center; font-size: 12px; }
    .payment-details { text-align: left; padding: 2px; line-height: 1.8; }
    .total-row { font-weight: bold; background-color: #f0f0f0; }
    .page-break { page-break-before: always; break-before: page; }
    @media print {
      .page-break { page-break-before: always; break-before: page; }
      div[style*="page-break-before: always"] { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="invoice-layout">

  ${!templateData.hideHeader ? `
  <div class="header">
  ${templateData.branchName}
</div>
  
  <div class="invoice-info">
    <div>
      <strong>Code & Name:</strong> ${templateData.farmerCode} ${
    templateData.farmerName
  }<br>
    </div>
    <div>
      <strong>Invoice No.</strong> 1<br>
      <strong>Invoice Date</strong> ${new Date().toLocaleDateString(
        "en-GB"
      )}<br>
      <strong>Bill Date</strong> ${templateData.fromDate} <strong>To</strong> ${
    templateData.toDate
  }
    </div>
  </div>` : '<div style="height: 20px;"></div>'}

  ${hasBothTypes ? `
  <h3 style="text-align: center; margin: 10px 0; font-size: 16px;">Cow Milk</h3>
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
        <td colspan="2">Cow Total</td>
        <td>${cowLiters.toFixed(1)}</td>
        <td>${cowData.size > 0 ? (cowTotalFat / cowData.size).toFixed(1) : '0.0'}</td>
        <td>${cowData.size > 0 ? (cowTotalSnf / cowData.size).toFixed(1) : '0.0'}</td>
        <td>${cowData.size > 0 ? (cowTotalClr / cowData.size).toFixed(1) : '0.0'}</td>
        <td>${cowLiters > 0 ? (cowAmount / cowLiters).toFixed(1) : "0.0"}</td>
        <td>${cowAmount.toFixed(1)}</td>
      </tr>
    </tbody>
  </table>
  </div>
  
  <div style="page-break-before: always; break-before: page; display: block; height: 0; clear: both;"></div>
  
  <div class="invoice-layout">
  <div class="header">${templateData.branchName}</div>
  <div class="invoice-info"><div><strong>Code & Name:</strong> ${templateData.farmerCode} ${templateData.farmerName}<br></div><div><strong>Invoice No.</strong> 1<br><strong>Invoice Date</strong> ${new Date().toLocaleDateString("en-GB")}<br><strong>Bill Date</strong> ${templateData.fromDate} <strong>To</strong> ${templateData.toDate}</div></div>
  <h3 style="text-align: center; margin: 10px 0; font-size: 16px;">Buffalo Milk</h3>
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
      ${generateTableForType(buffaloData, "")}
      <tr class="total-row">
        <td colspan="2">Buffalo Total</td>
        <td>${buffaloLiters.toFixed(1)}</td>
        <td>${buffaloData.size > 0 ? (buffaloTotalFat / buffaloData.size).toFixed(1) : '0.0'}</td>
        <td>${buffaloData.size > 0 ? (buffaloTotalSnf / buffaloData.size).toFixed(1) : '0.0'}</td>
        <td>${buffaloData.size > 0 ? (buffaloTotalClr / buffaloData.size).toFixed(1) : '0.0'}</td>
        <td>${buffaloLiters > 0 ? (buffaloAmount / buffaloLiters).toFixed(1) : "0.0"}</td>
        <td>${buffaloAmount.toFixed(1)}</td>
      </tr>
    </tbody>
  </table>
  ` : `
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
        <td colspan="2">${hasCowData ? 'Cow Total' : (hasBuffaloData ? 'Buffalo Total' : 'Total')}</td>
        <td>${hasCowData ? cowLiters.toFixed(1) : (hasBuffaloData ? buffaloLiters.toFixed(1) : totalLiters.toFixed(1))}</td>
        <td>${hasCowData ? (cowData.size > 0 ? (cowTotalFat / cowData.size).toFixed(1) : '0.0') : (hasBuffaloData ? (buffaloData.size > 0 ? (buffaloTotalFat / buffaloData.size).toFixed(1) : '0.0') : avgFat)}</td>
        <td>${hasCowData ? (cowData.size > 0 ? (cowTotalSnf / cowData.size).toFixed(1) : '0.0') : (hasBuffaloData ? (buffaloData.size > 0 ? (buffaloTotalSnf / buffaloData.size).toFixed(1) : '0.0') : avgSnf)}</td>
        <td>${hasCowData ? (cowData.size > 0 ? (cowTotalClr / cowData.size).toFixed(1) : '0.0') : (hasBuffaloData ? (buffaloData.size > 0 ? (buffaloTotalClr / buffaloData.size).toFixed(1) : '0.0') : avgClr)}</td>
        <td>${hasCowData ? (cowLiters > 0 ? (cowAmount / cowLiters).toFixed(1) : '0.0') : (hasBuffaloData ? (buffaloLiters > 0 ? (buffaloAmount / buffaloLiters).toFixed(1) : '0.0') : (totalLiters > 0 ? (totalAmount / totalLiters).toFixed(1) : "0.0"))}</td>
        <td>${hasCowData ? cowAmount.toFixed(1) : (hasBuffaloData ? buffaloAmount.toFixed(1) : totalAmount.toFixed(1))}</td>
      </tr>
    </tbody>
  </table>
  `}

  ${hasBothTypes ? '<div class="page-break"></div>' : ''}}
  
  ${!templateData.hideSummary ? `
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
              <strong>A/C No.:</strong> ${
                templateData.bankDetails?.accountNumber || farmerBillData?.farmer_details?.accountNumber || "N/A"
              }<br>
              <strong>IFSC:</strong> ${
                templateData.bankDetails?.ifscCode || farmerBillData?.farmer_details?.ifscCode || "N/A"
              }<br>
              <strong>Bank:</strong> ${
                templateData.bankDetails?.bankName || farmerBillData?.farmer_details?.bankName || "N/A"
              }
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>` : ''}
  </div>
</body>
</html>`;
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
      </div>`
;
  };
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { margin: 0; padding: 0; font-family: Arial, sans-serif; } @page { size: A4; margin: 0; } .page-container { width: 210mm; height: 297mm; display: flex; flex-direction: column; }</style></head><body><div class="page-container">${templateData.farmers.map(getFarmerHtml).join('')}</div></body></html>`;

};
