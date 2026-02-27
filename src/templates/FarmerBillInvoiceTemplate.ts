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
  bankDetails?: BankDetails;
  hideRateAmount?: boolean;
  hideHeader?: boolean;
  hideSummary?: boolean;
  collections_summary?: {
    total_quantity: number;
    weighted_avg_fat: number;
    weighted_avg_snf: number;
    weighted_avg_clr: number;
    weighted_avg_water: number;
    avg_rate: number;
    total_amount: number;
  };
  farmer_details?: {
    fullName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  payments?: {
    payment_type: string;
    amount_taken: string;
    received: string;
  }[];
  current_bill?: {
    milk_total: string;
    advance_total: string;
    net_payable: string;
    advance_remaining: string;
    cattlefeed_remaining: string;
    other1_remaining: string;
    other2_remaining: string;
    cattlefeed_total: string;
    other1_total: string;
    other2_total: string;
  };
  previous_bill?: {
    advance_remaining: string;
    cattlefeed_remaining: string;
    other1_remaining: string;
    other2_remaining: string;
  };
  bonus_deduction_info?: {
    bonus_amount: number;
    fixed_amount: number;
    remark?: string;
    total_bonus_till_date?: number | string;
  } | null;
  bonus_deduction_logs_summary?: {
    dairy_id: number;
    farmers: {
      farmer_id: string;
      total_bonus_deduction: string;
    }[];
  } | null;
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

const getLabels = (language: string = 'en') => {
  const translations: any = {
    en: {
      date: 'Date',
      shift: 'Shift',
      quantity: 'Liter',
      fat: 'Fat',
      snf: 'SNF',
      clr: 'CLR',
      rate: 'Rate',
      amount: 'Amount',
      total: 'Total',
      name: 'Name',
      invoice: 'Invoice',
      bill: 'Bill',
      to: 'To',
      payment: 'Payment',
      feed: 'Cattle Feed',
      advance: 'Advance',
      other1: 'Other 1',
      other2: 'Other 2',
      milk: 'Milk',
      cow: 'Cow',
      buffalo: 'Buffalo',
      netPayable: 'Net Payable',
      totalBonusTillDate: 'Total Bonus Till Date',
      prevRemaining: 'Previous Remaining',
      deduction: 'Deduction',
      balance: 'Balance',
      morning: 'Morning',
      evening: 'Evening',
      gross: 'Gross Amount',
      additionalDeductions: 'Additional Deductions',
      bonusDeduction: 'Bonus Deduction',
      bankDetail: 'Bank Detail',
      accountNumber: 'A/c No.',
      ifsc: 'IFSC',
      bank: 'Bank',
      branch: 'Branch',
      farmer: 'Farmer',
      code: 'Code',
      morningShort: 'M',
      eveningShort: 'E'
    },
    hi: {
      date: 'दिनांक',
      shift: 'शिफ्ट',
      quantity: 'लीटर',
      fat: 'फैट',
      snf: 'एसएनएफ',
      clr: 'सीएलआर',
      rate: 'दर',
      amount: 'राशि',
      total: 'कुल',
      name: 'नाम',
      invoice: 'इनवॉइस',
      bill: 'बिल',
      to: 'तक',
      payment: 'भुगतान',
      feed: 'पशु आहार',
      advance: 'एडवांस',
      other1: 'अन्य 1',
      other2: 'अन्य 2',
      milk: 'दूध',
      cow: 'गाय',
      buffalo: 'भैंस',
      netPayable: 'शुद्ध देय',
      totalBonusTillDate: 'अब तक का कुल बोनस',
      prevRemaining: 'पिछली शेषराशि',
      deduction: 'कटौती',
      balance: 'शेष',
      morning: 'सुबह',
      evening: 'शाम',
      gross: 'कुल राशि',
      additionalDeductions: 'अतिरिक्त कटौती',
      bonusDeduction: 'बोनस कटौती',
      bankDetail: 'बैंक विवरण',
      accountNumber: 'खाता संख्या',
      ifsc: 'आईएफएससी',
      bank: 'बैंक',
      branch: 'शाखा',
      farmer: 'किसान',
      code: 'कोड',
      morningShort: 'स',
      eveningShort: 'श'
    },
    mr: {
      date: 'दिनांक',
      shift: 'शिफ्ट',
      quantity: 'लिटर',
      fat: 'फॅट',
      snf: 'एसएनएफ',
      clr: 'सीएलआर',
      rate: 'दर',
      amount: 'रक्कम',
      total: 'एकूण',
      name: 'नाव',
      invoice: 'इनव्हॉइस',
      bill: 'बिल',
      to: 'पर्यंत',
      payment: 'पेमेंट',
      feed: 'खाद्य',
      advance: 'आगाऊ',
      other1: 'इतर1',
      other2: 'इतर2',
      milk: 'दूध',
      cow: 'गाय',
      buffalo: 'म्हैस',
      netPayable: 'निव्वळ देय',
      totalBonusTillDate: 'आजपर्यंतचा एकूण बोनस',
      prevRemaining: 'मागील शिल्लक',
      deduction: 'वजावट',
      balance: 'शिल्लक रक्कम',
      morning: 'सकाळ',
      evening: 'संध्याकाळ',
      gross: 'एकूण रक्कम',
      additionalDeductions: 'अतिरिक्त वजावट',
      bonusDeduction: 'बोनस वजावट',
      bankDetail: 'बँक तपशील',
      accountNumber: 'खाते क्र.',
      ifsc: 'आयएफएससी',
      bank: 'बँक',
      branch: 'शाखा',
      farmer: 'सभासद/शेतकरी',
      code: 'कोड',
      morningShort: 'स',
      eveningShort: 'सा'
    }
  };
  return translations[language] || translations.en;
};

export const generateTemplate2 = (templateData: Template2Data, language: string = 'mr'): string => {
  const labels = getLabels(language);
  
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

  // Pre-filter data if a specific milk type is requested
  let processedData = templateData.data;
  if (templateData.milkType === 'Cow') {
    processedData = templateData.data.filter(item => (item.type || '').toString().toLowerCase().trim() === 'cow');
  } else if (templateData.milkType === 'Buffalo') {
    processedData = templateData.data.filter(item => (item.type || '').toString().toLowerCase().trim() === 'buffalo');
  }

  // Calculate totals
  let cowLiters = 0, cowAmount = 0;
  let buffaloLiters = 0, buffaloAmount = 0;
  let totalLiters = 0, totalAmount = 0;
  let totalFat = 0, totalSnf = 0, totalClr = 0, recordCount = 0;

  processedData.forEach((item) => {
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
  
  const cowTotalFat = processedData.filter(item => (item.type || '').toString().toLowerCase().trim() === "cow").reduce((sum, item) => sum + item.fat, 0);
  const cowDataSize = processedData.filter(item => (item.type || '').toString().toLowerCase().trim() === "cow").length;
  
  const buffaloTotalFat = processedData.filter(item => (item.type || '').toString().toLowerCase().trim() === "buffalo").reduce((sum, item) => sum + item.fat, 0);
  const buffaloDataSize = processedData.filter(item => (item.type || '').toString().toLowerCase().trim() === "buffalo").length;

  let hasCowData = cowLiters > 0;
  let hasBuffaloData = buffaloLiters > 0;

  if (templateData.milkType === 'Cow') hasBuffaloData = false;
  else if (templateData.milkType === 'Buffalo') hasCowData = false;

  const hasBothTypes = hasCowData && hasBuffaloData;
  
  const generateTableForType = (dataMap: Map<string, FarmerBillData>) => {
    let rows = "";
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const displayDate = `${currentDate.getDate().toString().padStart(2, "0")}/${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate.getFullYear()}`;
      
      ['Morning', 'Evening'].forEach(shift => {
        const key = `${displayDate}_${shift}`;
        const item = dataMap.get(key);
        const shiftLabel = shift === 'Morning' ? labels.morning : labels.evening;
        rows += `<tr>
          <td style="padding: 2px 4px;">${shift === 'Morning' ? displayDate : ''}</td>
          <td style="padding: 2px 4px;">${shiftLabel}</td>
          <td style="padding: 2px 4px;">${item ? item.liters.toFixed(1) : ''}</td>
          <td style="padding: 2px 4px;">${item ? item.fat.toFixed(1) : ''}</td>
          <td style="padding: 2px 4px;">${item ? item.snf.toFixed(1) : ''}</td>
          <td style="padding: 2px 4px;">${item ? item.clr.toFixed(1) : ''}</td>
          <td style="padding: 2px 4px;">${item ? (item.water || 0).toFixed(1) : ''}</td>
          <td style="padding: 2px 4px;">${item ? item.rate.toFixed(1) : ''}</td>
          <td style="padding: 2px 4px;">${item ? item.amount.toFixed(1) : ''}</td>
        </tr>`;
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return rows;
  };

  const tableRows = hasBothTypes ? generateTableForType(cowData) : generateTableForType(hasCowData ? cowData : (hasBuffaloData ? buffaloData : groupedData));

  // --- DEDUCTION LOGIC ---
  const getSumOfPayments = (type: string) => {
    return (templateData.payments || [])
      .filter(p => p.payment_type.toLowerCase().trim() === type.toLowerCase().trim())
      .reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0);
  };

  const deductionInfo = [
    {
      label: labels.feed,
      prev: parseFloat(templateData.previous_bill?.cattlefeed_remaining || '0'),
      payment: getSumOfPayments('cattle feed'),
      deduction: parseFloat(templateData.current_bill?.cattlefeed_total || '0')
    },
    {
      label: labels.advance,
      prev: parseFloat(templateData.previous_bill?.advance_remaining || '0'),
      payment: getSumOfPayments('advance'),
      deduction: parseFloat(templateData.current_bill?.advance_total || '0')
    },
    {
      label: labels.other1,
      prev: parseFloat(templateData.previous_bill?.other1_remaining || '0'),
      payment: getSumOfPayments('other1') + getSumOfPayments('other 1'),
      deduction: parseFloat(templateData.current_bill?.other1_total || '0')
    },
    {
      label: labels.other2,
      prev: parseFloat(templateData.previous_bill?.other2_remaining || '0'),
      payment: getSumOfPayments('other2') + getSumOfPayments('other 2'),
      deduction: parseFloat(templateData.current_bill?.other2_total || '0')
    }
  ].map(d => ({
    ...d,
    balance: d.prev + d.payment - d.deduction
  }));

  const totalPrev = deductionInfo.reduce((sum, d) => sum + d.prev, 0);
  const totalPay = deductionInfo.reduce((sum, d) => sum + d.payment, 0);
  const totalDed = deductionInfo.reduce((sum, d) => sum + d.deduction, 0);
  const totalBal = deductionInfo.reduce((sum, d) => sum + d.balance, 0);

  const bonusAmount = templateData.bonus_deduction_info?.bonus_amount || 0;
  const fixedAmount = templateData.bonus_deduction_info?.fixed_amount || 0;
  const bonusFixedTotal = bonusAmount + fixedAmount;

  // Map total bonus from logs summary
  let totalBonusTillDate = templateData.bonus_deduction_info?.total_bonus_till_date || 0;
  if (templateData.bonus_deduction_logs_summary?.farmers) {
    const farmerBonus = templateData.bonus_deduction_logs_summary.farmers.find(
      (f) => String(f.farmer_id).padStart(4, "0") === String(templateData.farmerCode).padStart(4, "0") ||
             String(f.farmer_id) === String(templateData.farmerCode)
    );
    if (farmerBonus) {
      totalBonusTillDate = farmerBonus.total_bonus_deduction;
    }
  }

  const netPayable = parseFloat(templateData.current_bill?.net_payable || '0');

  const totalWater = processedData.reduce((sum, item) => sum + (item.water || 0), 0);
  const avgWater = recordCount > 0 ? (totalWater / recordCount).toFixed(1) : "0.0";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      font-size: 16px; 
      line-height: 1.0; 
      margin: 0;
      padding: 40px 25px 10px 25px; /* Increased side padding */
    }
    .header { 
      text-align: center; 
      font-size: 24px; 
      font-weight: bold; 
      margin: 0; 
      margin-bottom: 5px;
    }
    .dairy-code {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .invoice-info { display: flex; justify-content: space-between; margin: 20px 0; font-size: 15px; line-height: 1.8; }
    .main-table { width: 100%; border-collapse: collapse; margin: 25px 0; border: 1px solid black; }
    .main-table th { padding: 12px 6px; text-align: center; font-size: 15px; border-bottom: 2px solid black; border-right: 1px solid #ccc; background-color: #f0f0f0; font-weight: bold; }
    .main-table td { padding: 10px 6px; text-align: center; font-size: 14px; border-right: 1px solid #eee; }
    .main-table th:last-child, .main-table td:last-child { border-right: none; }
    .total-row { font-weight: bold; background-color: #f0f0f0; border-top: 1px solid black; border-bottom: 1px solid black; }
    .summary-section { margin-top: 2px; }
    .summary-table { width: 100%; border-collapse: collapse; }
    .summary-table td { border: none; padding: 15px 5px; font-size: 16px; vertical-align: top; }
    .summary-left { width: 55%; }
    .summary-right { width: 45%; }
    .deduction-table { width: 100%; border-collapse: collapse; border: 1px solid black; }
    .deduction-table tr.header-row { font-weight: bold; background: #f0f0f0; border-bottom: 1px solid black; }
    .deduction-table td { padding: 12px 4px; text-align: center; font-size: 14px; border: none; }
    .deduction-table tr.total-row-ded { font-weight: bold; background: #f0f0f0; border-top: 1px solid black; border-bottom: 1px solid black; }
    .payment-details { text-align: left; padding: 2px; line-height: 1.4; }
  </style>
</head>
<body>
  ${!templateData.hideHeader ? `
  <div class="header">${templateData.dairyName}</div>
  <div class="dairy-code">${templateData.dairyCode || ''}</div>
  <div class="invoice-info">
    <div>
      <strong>${labels.code} & ${labels.name}:</strong> ${templateData.farmerCode} ${templateData.farmerName}<br>
      <strong>${labels.branch}:</strong> ${templateData.branchName}
    </div>
    <div>
      <strong>${labels.invoice} No.</strong> 1<br>
      <strong>${labels.invoice} ${labels.date}</strong> ${new Date().toLocaleDateString("en-GB")}<br>
      <strong>${labels.bill} ${labels.date}</strong> ${templateData.fromDate} <strong>${labels.to}</strong> ${templateData.toDate}
    </div>
  </div>` : '<div style="height: 30px;"></div>'}

  <table class="main-table">
    <thead>
      <tr>
        <th>${labels.date}</th>
        <th>${labels.shift}</th>
        <th>${labels.quantity}</th>
        <th>${labels.fat}</th>
        <th>${labels.snf}</th>
        <th>${labels.clr}</th>
        <th>Water</th>
        <th>${labels.rate}</th>
        <th>${labels.amount}</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="total-row">
        <td colspan="2">${labels.total}</td>
        <td>${totalLiters.toFixed(1)}</td>
        <td>${avgFat}</td>
        <td>${avgSnf}</td>
        <td>${avgClr}</td>
        <td>${avgWater}</td>
        <td>${totalLiters > 0 ? (totalAmount / totalLiters).toFixed(1) : "0.0"}</td>
        <td>${totalAmount.toFixed(1)}</td>
      </tr>
    </tbody>
  </table>

  ${!templateData.hideSummary ? `
  <div class="summary-section">
    <table class="summary-table">
      <tr>
        <td class="summary-left">
          <table class="deduction-table">
            <tr class="header-row">
              <td>${labels.name}</td>
              <td>${labels.prevRemaining}</td>
              <td>${labels.payment}</td>
              <td>${labels.deduction}</td>
              <td>${labels.balance}</td>
            </tr>
            ${deductionInfo.map(d => `
              <tr>
                <td>${d.label}</td>
                <td>${d.prev.toFixed(2)}</td>
                <td>${d.payment.toFixed(2)}</td>
                <td>${d.deduction.toFixed(2)}</td>
                <td>${d.balance.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row-ded">
              <td>${labels.total}</td>
              <td>${totalPrev.toFixed(2)}</td>
              <td>${totalPay.toFixed(2)}</td>
              <td>${totalDed.toFixed(2)}</td>
              <td>${totalBal.toFixed(2)}</td>
            </tr>
          </table>
          ${(templateData.bonus_deduction_info || parseFloat(String(totalBonusTillDate)) > 0) ? `
          <div style="margin-top: 10px; padding: 8px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; line-height: 1.4;">
            <div style="font-weight: bold; margin-bottom: 4px;">${labels.additionalDeductions}:</div>
            ${bonusAmount > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>${labels.bonusDeduction}:</span>
              <span>₹${bonusAmount.toFixed(2)}</span>
            </div>` : ''}
            ${fixedAmount > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>${templateData.bonus_deduction_info?.remark || 'इमारत निधी'}:</span>
              <span>₹${fixedAmount.toFixed(2)}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px solid #ddd; padding-top: 4px; font-weight: bold;">
              <span>${labels.totalBonusTillDate}:</span>
              <span>₹${parseFloat(String(totalBonusTillDate)).toFixed(2)}</span>
            </div>
          </div>
          ` : ''}
        </td>
        <td class="summary-right">
          <div class="payment-details">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 2px;"><strong>एकूण रक्कम:</strong> <span>${totalAmount.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 2px;"><strong>गाय दूध:</strong> <span>${cowLiters.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 2px;"><strong>म्हैस दूध:</strong> <span>${buffaloLiters.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 2px;"><strong>एकूण दूध:</strong> <span>${totalLiters.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 2px;"><strong>एकूण Deduction:</strong> <span>${totalDed.toFixed(2)}</span></div>
            ${bonusFixedTotal > 0 ? `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 2px;"><strong>Bonus + Fixed Deduction:</strong> <span>${bonusFixedTotal.toFixed(2)}</span></div>` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 16px; border-top: 1px solid black; margin-top: 4px; padding-top: 4px; font-weight: bold;">
              <strong>${labels.netPayable}:</strong> <span>${netPayable.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; border-bottom: 1px dashed #ccc; padding-bottom: 2px;"><strong>Remaining रक्कम:</strong> <span>${totalBal.toFixed(2)}</span></div>
            <div style="margin-top: 10px; font-size: 11px; border-top: 1px dashed #ccc; padding-top: 4px;">
              <strong>${labels.bankDetail}:</strong><br>
              ${labels.accountNumber}: ${templateData.bankDetails?.accountNumber || templateData.farmer_details?.accountNumber || "N/A"}<br>
              ${labels.ifsc}: ${templateData.bankDetails?.ifscCode || templateData.farmer_details?.ifscCode || "N/A"}<br>
              ${labels.bank}: ${templateData.bankDetails?.bankName || templateData.farmer_details?.bankName || "N/A"}
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>` : ''}
</body>
</html>`;
};

export const generateTemplate3Farmers = (templateData: Template3Data): string => {
  const labels = getLabels('mr');
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
      tableRows += `<tr><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none;">${date}</td><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: center;">${labels.morningShort}</td>`;
      if (dayData.Morning) {
        const m = dayData.Morning;
        tableRows += `<td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: center;">${m.type ? m.type[0] : '-'}</td><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: right;">${Number(m.quantity).toFixed(1)}</td><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: right;">${Number(m.fat).toFixed(1)}</td><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: right;">${Number(m.snf).toFixed(1)}</td>${!templateData.hideRateAmount ? `<td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: right;">${Number(m.rate).toFixed(1)}</td><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: right;">${Number(m.amount).toFixed(0)}</td>` : ''}`;
      } else {
        tableRows += `<td colspan="${!templateData.hideRateAmount ? 6 : 4}"></td>`;
      }
      tableRows += `</tr>`;

      // Evening
      tableRows += `<tr><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none;"></td><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: center;">${labels.eveningShort}</td>`;
      if (dayData.Evening) {
        const e = dayData.Evening;
        tableRows += `<td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: center;">${e.type ? e.type[0] : '-'}</td><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: right;">${Number(e.quantity).toFixed(1)}</td><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: right;">${Number(e.fat).toFixed(1)}</td><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: right;">${Number(e.snf).toFixed(1)}</td>${!templateData.hideRateAmount ? `<td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: right;">${Number(e.rate).toFixed(1)}</td><td style="padding: 2px 4px; border-left: none; border-right: none; border-top: none; border-bottom: none; text-align: right;">${Number(e.amount).toFixed(0)}</td>` : ''}`;
      } else {
        tableRows += `<td colspan="${!templateData.hideRateAmount ? 6 : 4}"></td>`;
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
      <div class="invoice-container" style="height: 33.33%; border-bottom: 2px dashed #000; padding: 15px 25px; box-sizing: border-box; overflow: hidden; line-height: 1.3; font-family: Arial, sans-serif;">
        <table style="width: 100%; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
          <tr>
            <td style="font-size: 11px; font-weight: bold; width: 30%; line-height: 1.5;">${labels.code}: ${templateData.dairyCode || ''}</td>
            <td style="font-size: 18px; font-weight: bold; text-align: center; text-transform: uppercase;">${templateData.dairyName}</td>
            <td style="font-size: 11px; width: 30%; text-align: right; font-weight: bold; line-height: 1.5;">${templateData.fromDate} - ${templateData.toDate}</td>
          </tr>
        </table>
        <div style="font-size: 11px; margin-bottom: 8px; background: #f0f0f0; padding: 4px 10px;">
          <div style="display: flex; justify-content: space-between;">
            <div><b>${labels.farmer}: ${farmer.farmer_id} - ${farmer.farmer_details?.fullName || 'Unknown'}</b></div>
            <div style="font-size: 10px;">
              <b>${labels.bank}:</b> ${farmer.farmer_details?.bankName || '-'} | <b>${labels.accountNumber}:</b> ${farmer.farmer_details?.accountNumber || '-'}
            </div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px; border: 1px solid black;">
          <thead style="background: #e0e0e0; border-bottom: 1px solid black;">
            <tr>
              <th style="padding: 6px 4px; border-right: 1px solid black;">Date</th>
              <th style="padding: 6px 4px; border-right: 1px solid black;">S</th>
              <th style="padding: 6px 4px; border-right: 1px solid black;">T</th>
              <th style="padding: 6px 4px; border-right: 1px solid black;">Qty</th>
              <th style="padding: 6px 4px; border-right: 1px solid black;">Fat</th>
              <th style="padding: 6px 4px; border-right: 1px solid black;">SNF</th>
              ${!templateData.hideRateAmount ? '<th style="padding: 6px 4px; border-right: 1px solid black;">Rate</th><th style="padding: 6px 4px;">Amt</th>' : ''}
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot style="font-weight: bold; background: #f0f0f0; border-top: 1px solid black;">
             <tr style="font-weight: bold; background: #f0f0f0;">
              <td colspan="3" style="padding: 10px 4px; border-left: none; border-right: 1px solid black; text-align: center;">${labels.total}</td>
              <td style="padding: 10px 4px; border-left: none; border-right: 1px solid black; text-align: right;">${Number(summary.total_quantity).toFixed(1)}</td>
              <td style="padding: 10px 4px; border-left: none; border-right: 1px solid black; text-align: right;">${Number(summary.weighted_avg_fat).toFixed(1)}</td>
              <td style="padding: 10px 4px; border-left: none; border-right: 1px solid black; text-align: right;">${Number(summary.weighted_avg_snf).toFixed(1)}</td>
              ${!templateData.hideRateAmount ? `<td style="padding: 10px 4px; border-left: none; border-right: 1px solid black; text-align: right;">${Number(summary.avg_rate).toFixed(1)}</td><td style="padding: 10px 4px; border-left: none; border-right: none; text-align: right;">${Number(summary.total_amount).toFixed(0)}</td>` : ''}
            </tr>
          </tfoot>
        </table>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid black;">
          <tr style="border-bottom: 1px solid black;">
            <td style="padding: 6px 2px; width: 15%; border-right: 1px solid black;"><b>${labels.gross}:</b> ${Number(summary.total_amount).toFixed(0)}</td>
            <td style="padding: 6px 2px; width: 15%; border-right: 1px solid black;"><b>${labels.prevRemaining}:</b> ${Number(prevBalance).toFixed(0)}</td>
            <td style="padding: 6px 2px; font-size: 11px;">
               <b>${labels.deduction}:</b> ${labels.feed}:${Number(currentBill?.cattlefeed_total || 0).toFixed(0)} | ${labels.advance}:${Number(currentBill?.advance_total || 0).toFixed(0)} | ${labels.other1}:${(Number(currentBill?.other1_total || 0) + Number(currentBill?.other2_total || 0)).toFixed(0)}
            </td>
          </tr>
          <tr style="background: #f0f0f0;">
            <td style="padding: 6px 2px; border-right: 1px solid black;"><b>${labels.total} ${labels.deduction}:</b> ${Number(currentDeductions).toFixed(0)}</td>
            <td style="padding: 6px 2px; background: #e0e0e0;" colspan="2"><b>${labels.netPayable}:</b> <span style="font-size:16px;">${Number(netPayable).toFixed(0)}</span></td>
          </tr>
        </table>
      </div>`;
  };
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { margin: 0; padding: 0; font-family: Arial, sans-serif; } @page { size: A4; margin: 0; } .page-container { width: 210mm; height: 297mm; display: flex; flex-direction: column; }</style></head><body><div class="page-container">${templateData.farmers.map(getFarmerHtml).join('')}</div></body></html>`;

};
