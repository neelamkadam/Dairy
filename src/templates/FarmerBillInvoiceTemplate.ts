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
  dairyPhone?: string;
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
  renderOnly?: 'Cow' | 'Buffalo';
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
    created_at?: string;
    descriptions?: string;
    stock?: number;
    stock_name?: string;
    cattlefeed_stock?: any;
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
    received_total: string;
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
  travel_commission?: {
    type: string;
    rate: number;
    amount: number;
    effective_from?: string;
    cow_amount?: number;
    buffalo_amount?: number;
  };
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
  created_at?: string;
  descriptions?: string;
  stock?: number;
  stock_name?: string;
  cattlefeed_stock?: any;
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
  bonus_deduction_info?: {
    bonus_amount: number;
    fixed_amount: number;
    remark?: string;
    total_bonus_till_date: number | string;
  } | null;
  travel_commission?: {
    type: string;
    rate: number;
    amount: number;
    effective_from?: string;
    cow_amount?: number;
    buffalo_amount?: number;
  };
}

export interface Template3Data {
  dairyName: string;
  dairyCode?: string;
  dairyPhone?: string;
  branchName?: string;
  farmers: FarmerReportData[];
  fromDate: string;
  toDate: string;
  hideRateAmount?: boolean;
  bonus_deduction_logs_summary?: {
    farmers: {
      farmer_id: string;
      total_bonus_deduction: string;
    }[];
  } | null;
}

// --- GENERATOR FUNCTIONS ---

const getLabels = (language: string = 'mr') => {
  const lang = language.split('-')[0].toLowerCase();
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
      other1: 'Kirana',
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
      eveningShort: 'E',
      accNo: 'Acc No',
      mobile: 'Mo. No',
      period: 'Period',
      maagilBaaki: 'Prev Balance',
      chaluRakkam: 'Curr Amount',
      ekunBaaki: 'Total Balance',
      kapatRakkam: 'Deduction',
      yeneBaaki: 'Remaining',
      vahantuk: 'Transport',
      ekunKapat: 'Total Deduction',
      adaRakkam: 'Paid Amount',
      pashuKhady: 'Cattle Feed',
      otherDeduction: 'Other Deduction',
      transportDeduction: 'Transport Deduction',
      travelCommission: 'Travel Commission',
      details: 'Details',
      noDetails: 'No details available'
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
      other1: 'किराना',
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
      eveningShort: 'श',
      accNo: 'खाता नं',
      mobile: 'मो. नं',
      period: 'कालावधी',
      maagilBaaki: 'पिछली शेषराशि',
      chaluRakkam: 'चालू राशि',
      ekunBaaki: 'कुल शेष',
      kapatRakkam: 'कटौती राशि',
      yeneBaaki: 'शेष राशि',
      vahantuk: 'परिवहन',
      ekunKapat: 'कुल कटौती',
      adaRakkam: 'भुगतान राशि',
      pashuKhady: 'पशु आहार',
      otherDeduction: 'अन्य कटौती',
      transportDeduction: 'परिवहन कटौती',
      travelCommission: 'यात्रा कमीशन',
      details: 'विवरण',
      noDetails: 'कोई विवरण उपलब्ध नहीं है'
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
      feed: 'पशुखाद्य',
      advance: 'ॲडव्हान्स',
      other1: 'किराणा',
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
      eveningShort: 'सा',
      accNo: 'खाते नं',
      mobile: 'मो. नं',
      period: 'कालावधी',
      maagilBaaki: 'मागील बाकी',
      chaluRakkam: 'चालू रक्कम',
      ekunBaaki: 'एकूण बाकी',
      kapatRakkam: 'कपात रक्कम',
      yeneBaaki: 'येणे बाकी',
      vahantuk: 'वाहतूक',
      ekunKapat: 'एकूण कपात',
      adaRakkam: 'अदा रक्कम',
      pashuKhady: 'पशुखाद्य',
      otherDeduction: 'इतर कपात',
      transportDeduction: 'वाह कपात',
      travelCommission: 'वहातुक कमिशन',
      details: 'तपशील',
      noDetails: 'तपशील उपलब्ध नाही'
    }
  };
  const selected = { ... (translations[lang] || translations.mr || translations.en) };
  // Ensure all keys from mr exist in the returned object (fallback to mr then en)
  Object.keys(translations.mr).forEach(key => {
    if (selected[key] === undefined) {
      selected[key] = translations.mr[key] || translations.en[key];
    }
  });
  return selected;
};

export const generateTemplate2 = (templateData: Template2Data, language: string = 'mr'): string => {
  const labels = getLabels(language);
  
  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts[0].length === 4) return new Date(dateStr); // YYYY-MM-DD
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])); // DD-MM-YYYY
    }
    return new Date(dateStr);
  };

  const fromDate = parseDate(templateData.fromDate);
  const toDate = parseDate(templateData.toDate);

  const formatDisplayDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Group data by date, shift, and milk type — aggregate multiple records for the same slot
  interface AggEntry {
    base: FarmerBillData;
    liters: number;
    amount: number;
    fatWeighted: number;
    snfWeighted: number;
    clrWeighted: number;
    rateWeighted: number;
    water: number;
  }
  const groupedAgg = new Map<string, AggEntry>();
  const cowAgg = new Map<string, AggEntry>();
  const buffaloAgg = new Map<string, AggEntry>();

  const aggregateInto = (map: Map<string, AggEntry>, key: string, item: FarmerBillData) => {
    const liters = item.liters || 0;
    const amount = item.amount || 0;
    const fat = item.fat || 0;
    const snf = item.snf || 0;
    const clr = item.clr || 0;
    const rate = item.rate || 0;
    const water = item.water || 0;
    if (map.has(key)) {
      const agg = map.get(key)!;
      agg.liters += liters;
      agg.amount += amount;
      agg.fatWeighted += fat * liters;
      agg.snfWeighted += snf * liters;
      agg.clrWeighted += clr * liters;
      agg.rateWeighted += rate * liters;
      agg.water += water;
    } else {
      map.set(key, {
        base: item,
        liters,
        amount,
        fatWeighted: fat * liters,
        snfWeighted: snf * liters,
        clrWeighted: clr * liters,
        rateWeighted: rate * liters,
        water,
      });
    }
  };

  const aggToFarmerBillData = (agg: AggEntry): FarmerBillData => {
    const l = agg.liters;
    return {
      ...agg.base,
      liters: l,
      amount: agg.amount,
      fat: l > 0 ? agg.fatWeighted / l : 0,
      snf: l > 0 ? agg.snfWeighted / l : 0,
      clr: l > 0 ? agg.clrWeighted / l : 0,
      rate: l > 0 ? agg.rateWeighted / l : 0,
      water: agg.water,
    };
  };

  for (const item of templateData.data) {
    const itemDate = new Date(item.date);
    const dateKey = `${itemDate.getDate().toString().padStart(2, "0")}/${(
      itemDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${itemDate.getFullYear()}`;
    const key = `${dateKey}_${item.shift}`;
    const milkType = (item.type || '').toString().toLowerCase().trim();

    aggregateInto(groupedAgg, key, item);

    if (milkType === "cow") {
      aggregateInto(cowAgg, key, item);
    } else if (milkType === "buffalo") {
      aggregateInto(buffaloAgg, key, item);
    }
  }

  const groupedData = new Map<string, FarmerBillData>(
    Array.from(groupedAgg.entries()).map(([k, v]) => [k, aggToFarmerBillData(v)])
  );
  const cowData = new Map<string, FarmerBillData>(
    Array.from(cowAgg.entries()).map(([k, v]) => [k, aggToFarmerBillData(v)])
  );
  const buffaloData = new Map<string, FarmerBillData>(
    Array.from(buffaloAgg.entries()).map(([k, v]) => [k, aggToFarmerBillData(v)])
  );

  // Pre-filter data if a specific milk type is requested
  let processedData = templateData.data;
  if (templateData.milkType === 'Cow') {
    processedData = templateData.data.filter(item => (item.type || '').toString().toLowerCase().trim() === 'cow');
  } else if (templateData.milkType === 'Buffalo') {
    processedData = templateData.data.filter(item => (item.type || '').toString().toLowerCase().trim() === 'buffalo');
  }

  // Calculate totals for the table (from filtered processedData)
  let totalLiters = 0, totalAmount = 0;
  let totalFat = 0, totalSnf = 0, totalClr = 0, recordCount = 0;

  processedData.forEach((item) => {
    totalLiters += item.liters;
    totalAmount += item.amount;
    totalFat += item.fat;
    totalSnf += item.snf;
    totalClr += item.clr;
    recordCount++;
  });

  // Calculate summary totals from COMPLETE data (for summary section)
  let cowLiters = 0, cowAmount = 0;
  let buffaloLiters = 0, buffaloAmount = 0;
  let summaryTotalAmount = 0;

  templateData.data.forEach((item) => {
    const milkType = (item.type || '').toString().toLowerCase().trim();
    if (milkType === "cow") {
      cowLiters += item.liters;
      cowAmount += item.amount;
    } else if (milkType === "buffalo") {
      buffaloLiters += item.liters;
      buffaloAmount += item.amount;
    }
    summaryTotalAmount += item.amount;
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
    const searchType = type.toLowerCase().trim().replace(/\s/g, '');
    const isCattleFeed = searchType === 'cattlefeed' || searchType === 'pashukhady' || searchType === 'पशुखाद्य';
    
    return (templateData.payments || [])
      .filter(p => {
        const pType = p.payment_type.toLowerCase().trim().replace(/\s/g, '');
        if (isCattleFeed) return pType === 'cattlefeed' || pType === 'pashukhady' || pType === 'पशुखाद्य';
        return pType === searchType;
      })
      .reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0);
  };

  const deductionInfo = [
    {
      label: labels.other1, // Kirana - always show
      prev: parseFloat(templateData.previous_bill?.other1_remaining || '0'),
      payment: getSumOfPayments('other1') + getSumOfPayments('other 1'),
      deduction: parseFloat(templateData.current_bill?.other1_total || '0')
    },
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
    }
  ];

  // Add Other2 only if it has values
  const other2Prev = parseFloat(templateData.previous_bill?.other2_remaining || '0');
  const other2Payment = getSumOfPayments('other2') + getSumOfPayments('other 2');
  const other2Deduction = parseFloat(templateData.current_bill?.other2_total || '0');
  
  if (other2Prev > 0 || other2Payment > 0 || other2Deduction > 0) {
    deductionInfo.push({
      label: labels.other2,
      prev: other2Prev,
      payment: other2Payment,
      deduction: other2Deduction
    });
  }

  // Calculate balances
  const processedDeductionInfo = deductionInfo.map(d => ({
    ...d,
    balance: d.prev + d.payment - d.deduction
  }));

  const totalPrev = processedDeductionInfo.reduce((sum, d) => sum + d.prev, 0);
  const totalPay = processedDeductionInfo.reduce((sum, d) => sum + d.payment, 0);
  const totalDed = processedDeductionInfo.reduce((sum, d) => sum + d.deduction, 0);
  const totalBal = processedDeductionInfo.reduce((sum, d) => sum + d.balance, 0);

  const summaryTotalLiters = cowLiters + buffaloLiters;
  const bonusRate = templateData.bonus_deduction_info?.bonus_amount || 0;
  const bonusAmount = bonusRate * summaryTotalLiters;
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

  let netPayable = parseFloat(templateData.current_bill?.net_payable || '0');
  const travelComm = templateData.travel_commission;
  const isTravelValid = travelComm && travelComm.effective_from && (new Date(toDate) >= new Date(travelComm.effective_from));
  const travelAmount = isTravelValid ? travelComm.amount : 0;
  
  if (isTravelValid) {
    netPayable += travelAmount;
  }

  const totalWater = processedData.reduce((sum, item) => sum + (item.water || 0), 0);
  const avgWater = recordCount > 0 ? (totalWater / recordCount).toFixed(1) : "0.0";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 16px; 
      line-height: 1.0; 
      margin: 0;
      padding: 0;
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
<body style="margin: 0; padding: 0;">
  <div style="padding: 60px 80px 20px 80px; box-sizing: border-box; background-color: white;">
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
      <strong>${labels.bill} ${labels.date}</strong> ${formatDisplayDate(fromDate)} <strong>${labels.to}</strong> ${formatDisplayDate(toDate)}
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
            ${processedDeductionInfo.map(d => `
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
          ${(templateData.bonus_deduction_info || parseFloat(String(totalBonusTillDate)) > 0 || isTravelValid) ? `
          <div style="margin-top: 10px; padding: 8px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; line-height: 1.4;">
            <div style="font-weight: bold; margin-bottom: 4px;">${labels.additionalDeductions}:</div>
            ${bonusAmount > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>${labels.bonusDeduction} (${bonusRate} x ${(cowLiters + buffaloLiters).toFixed(1)}):</span>
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
            ${isTravelValid ? (travelComm!.cow_amount !== undefined && travelComm!.buffalo_amount !== undefined) ? `
            <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px solid #ddd; padding-top: 4px;">
              <span>${labels.cow} ${labels.travelCommission} :</span>
              <span>₹${travelComm!.cow_amount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>${labels.buffalo} ${labels.travelCommission} :</span>
              <span>₹${travelComm!.buffalo_amount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #ddd; padding-top: 2px; margin-top: 2px;">
              <span>${labels.travelCommission} :</span>
              <span>₹${travelAmount.toFixed(2)}</span>
            </div>` : `
            <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px solid #ddd; padding-top: 4px; font-weight: bold;">
              <span>${labels.travelCommission} :</span>
              <span>₹${travelAmount.toFixed(2)}</span>
            </div>` : ''}
          </div>
          ` : ''}
          <div style="margin-top: 15px; font-size: 20px; font-weight: bold; padding: 12px; background-color: #2563eb; color: white; border-radius: 4px; display: flex; justify-content: space-between;">
            <span>${labels.netPayable}:</span>
            <span>₹${netPayable.toFixed(2)}</span>
          </div>
        </td>
        <td class="summary-right">
          <div class="payment-details">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 2px;"><strong>एकूण रक्कम:</strong> <span>${summaryTotalAmount.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 2px;"><strong>गाय दूध:</strong> <span>${cowLiters.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 2px;"><strong>म्हैस दूध:</strong> <span>${buffaloLiters.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 2px;"><strong>एकूण दूध:</strong> <span>${(cowLiters + buffaloLiters).toFixed(2)}</span></div>
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
  </div>
</body>
</html>`;
};

export const generateTemplateDetailedHorizontal = (templateData: Template2Data, language: string = 'mr'): string => {
  const labels = getLabels(language);
  
  // Group data by date and type (Cow/Buffalo)
  const groupedData = new Map<string, { 
    Cow?: { morning?: FarmerBillData, evening?: FarmerBillData },
    Buffalo?: { morning?: FarmerBillData, evening?: FarmerBillData }
  }>();
  
  templateData.data.forEach(item => {
    const itemDate = new Date(item.date);
    const dateStr = itemDate.toLocaleDateString("en-GB");
    const mType = (item.type === 'Buffalo' || item.type === 'Buffaloes') ? 'Buffalo' : 'Cow';
    
    if (!groupedData.has(dateStr)) {
      groupedData.set(dateStr, {});
    }
    const dayData = groupedData.get(dateStr)!;
    if (!dayData[mType]) dayData[mType] = {};
    
    if (item.shift === 'Morning') dayData[mType]!.morning = item;
    else dayData[mType]!.evening = item;
  });

  const hasCow = (templateData.renderOnly === 'Cow' || !templateData.renderOnly) && templateData.data.some(d => d.type === 'Cow');
  const hasBuffalo = (templateData.renderOnly === 'Buffalo' || !templateData.renderOnly) && templateData.data.some(d => d.type === 'Buffalo');

  const parseDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return new Date();
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length < 3) return new Date();
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts.length < 3) return new Date();
      if (parts[0].length === 4) return new Date(dateStr); // YYYY-MM-DD
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])); // DD-MM-YYYY
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const startDate = parseDate(templateData.fromDate);
  const endDate = parseDate(templateData.toDate);

  const formatDisplayDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const allDates: string[] = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    allDates.push(currentDate.toLocaleDateString("en-GB"));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  let cowMLtr = 0, cowMAmt = 0, cowMFatTot = 0, cowMSnfTot = 0;
  let cowELtr = 0, cowEAmt = 0, cowEFatTot = 0, cowESnfTot = 0;
  let buffMLtr = 0, buffMAmt = 0, buffMFatTot = 0, buffMSnfTot = 0;
  let buffELtr = 0, buffEAmt = 0, buffEFatTot = 0, buffESnfTot = 0;

  templateData.data.forEach(d => {
    const ltrs = Number(d.liters || 0);
    const fat = Number(d.fat || 0);
    const snf = Number(d.snf || 0);
    const amt = Number(d.amount || 0);

    if (d.type === 'Cow') {
      if (d.shift === 'Morning') { 
        cowMLtr += ltrs; cowMAmt += amt; 
        cowMFatTot += ltrs * fat; cowMSnfTot += ltrs * snf;
      } else { 
        cowELtr += ltrs; cowEAmt += amt; 
        cowEFatTot += ltrs * fat; cowESnfTot += ltrs * snf;
      }
    } else if (d.type === 'Buffalo' || d.type === 'Buffaloes') {
      if (d.shift === 'Morning') { 
        buffMLtr += ltrs; buffMAmt += amt; 
        buffMFatTot += ltrs * fat; buffMSnfTot += ltrs * snf;
      } else { 
        buffELtr += ltrs; buffEAmt += amt; 
        buffEFatTot += ltrs * fat; buffESnfTot += ltrs * snf;
      }
    }
  });

  const getTablesContent = () => {
    let content = '';
    
    // COW SECTION
    if (hasCow) {
      content += `<tr style="font-weight: bold; background: #fafafa; border-bottom: 1px solid black; border-top: 1px solid black;">
        <td style="padding: 6px 8px; text-align: left; border: none; border-bottom: 1px solid black; border-right: 1px solid black;">${labels.cow}</td>
        ${Array(12).fill('<td style="border: none; border-bottom: 1px solid black; border-right: 1px solid black;"></td>').join('')}
      </tr>`;
      content += allDates.map(date => {
        const day = groupedData.get(date);
        const m = day?.Cow?.morning;
        const e = day?.Cow?.evening;
        return `
          <tr style="height: 22px;">
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">${date.substring(0, 5)}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${m ? Number(m.liters).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${m ? Number(m.fat).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${m ? Number(m.snf).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${m ? Number(m.rate).toFixed(2) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${m ? Number(m.amount).toFixed(2) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${e ? Number(e.liters).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${e ? Number(e.fat).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${e ? Number(e.snf).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${e ? Number(e.rate).toFixed(2) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${e ? Number(e.amount).toFixed(2) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right; background: #f9f9f9;">${(m || e) ? (Number(m?.liters || 0) + Number(e?.liters || 0)).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right; background: #f9f9f9; border-right: 1px solid black;">${(m || e) ? (Number(m?.amount || 0) + Number(e?.amount || 0)).toFixed(2) : ''}</td>
          </tr>
        `;
      }).join('');
      
      if (hasCow) {
        content += `
          <tr style="font-weight: bold; background: #fdfdfd; border-top: 1px solid black; border-bottom: 1px solid black;">
            <td class="text-center" style="padding: 4px;">${labels.total} (${labels.cow}):</td>
            <td class="text-right" style="padding: 4px;">${cowMLtr.toFixed(1)}</td>
            <td class="text-right" style="padding: 4px;">${cowMLtr > 0 ? (cowMFatTot / cowMLtr).toFixed(1) : ''}</td>
            <td class="text-right" style="padding: 4px;">${cowMLtr > 0 ? (cowMSnfTot / cowMLtr).toFixed(1) : ''}</td>
            <td class="text-right" style="padding: 4px;">${cowMLtr > 0 ? (cowMAmt / cowMLtr).toFixed(2) : ''}</td>
            <td class="text-right">${cowMAmt.toFixed(2)}</td>
            <td class="text-right">${cowELtr.toFixed(1)}</td>
            <td class="text-right" style="padding: 4px;">${cowELtr > 0 ? (cowEFatTot / cowELtr).toFixed(1) : ''}</td>
            <td class="text-right" style="padding: 4px;">${cowELtr > 0 ? (cowESnfTot / cowELtr).toFixed(1) : ''}</td>
            <td class="text-right" style="padding: 4px;">${cowELtr > 0 ? (cowEAmt / cowELtr).toFixed(2) : ''}</td>
            <td class="text-right">${cowEAmt.toFixed(2)}</td>
            <td class="text-right">${(cowMLtr + cowELtr).toFixed(1)}</td>
            <td class="text-right">${(cowMAmt + cowEAmt).toFixed(2)}</td>
          </tr>
        `;
      }
    }

    // BUFFALO SECTION
    if (hasBuffalo) {
      content += `<tr style="font-weight: bold; background: #fafafa; border-bottom: 1px solid black; border-top: 1px solid black;">
        <td style="padding: 6px 8px; text-align: left; border: none; border-bottom: 1px solid black; border-right: 1px solid black;">${labels.buffalo}</td>
        ${Array(12).fill('<td style="border: none; border-bottom: 1px solid black; border-right: 1px solid black;"></td>').join('')}
      </tr>`;
      content += allDates.map(date => {
        const day = groupedData.get(date);
        const m = day?.Buffalo?.morning;
        const e = day?.Buffalo?.evening;
        return `
          <tr style="height: 22px;">
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">${date.substring(0, 5)}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${m ? Number(m.liters).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${m ? Number(m.fat).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${m ? Number(m.snf).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${m ? Number(m.rate).toFixed(2) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${m ? Number(m.amount).toFixed(2) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${e ? Number(e.liters).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${e ? Number(e.fat).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${e ? Number(e.snf).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${e ? Number(e.rate).toFixed(2) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right;">${e ? Number(e.amount).toFixed(2) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right; background: #f9f9f9;">${(m || e) ? (Number(m?.liters || 0) + Number(e?.liters || 0)).toFixed(1) : ''}</td>
            <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: right; background: #f9f9f9; border-right: 1px solid black;">${(m || e) ? (Number(m?.amount || 0) + Number(e?.amount || 0)).toFixed(2) : ''}</td>
          </tr>
        `;
      }).join('');
      
      if (hasBuffalo) {
        content += `
          <tr style="font-weight: bold; background: #fdfdfd; border-top: 1px solid black; border-bottom: 1px solid black;">
            <td class="text-center" style="padding: 4px;">${labels.total} (${labels.buffalo}):</td>
            <td class="text-right" style="padding: 4px;">${buffMLtr.toFixed(1)}</td>
            <td class="text-right" style="padding: 4px;">${buffMLtr > 0 ? (buffMFatTot / buffMLtr).toFixed(1) : ''}</td>
            <td class="text-right" style="padding: 4px;">${buffMLtr > 0 ? (buffMSnfTot / buffMLtr).toFixed(1) : ''}</td>
            <td class="text-right" style="padding: 4px;">${buffMLtr > 0 ? (buffMAmt / buffMLtr).toFixed(2) : ''}</td>
            <td class="text-right">${buffMAmt.toFixed(2)}</td>
            <td class="text-right">${buffELtr.toFixed(1)}</td>
            <td class="text-right" style="padding: 4px;">${buffELtr > 0 ? (buffEFatTot / buffELtr).toFixed(1) : ''}</td>
            <td class="text-right" style="padding: 4px;">${buffELtr > 0 ? (buffESnfTot / buffELtr).toFixed(1) : ''}</td>
            <td class="text-right" style="padding: 4px;">${buffELtr > 0 ? (buffEAmt / buffELtr).toFixed(2) : ''}</td>
            <td class="text-right">${buffEAmt.toFixed(2)}</td>
            <td class="text-right">${(buffMLtr + buffELtr).toFixed(1)}</td>
            <td class="text-right">${(buffMAmt + buffEAmt).toFixed(2)}</td>
          </tr>
        `;
      }
    }

    // IF NEITHER EXISTS (Fallback to 10 empty rows)
    if (!hasCow && !hasBuffalo) {
      content += allDates.map(date => `
        <tr style="height: 22px;">
          <td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px; text-align: center;">${date.substring(0, 5)}</td>
          ${Array(12).fill('<td style="border: none; border-left: 1px solid black; border-right: 1px solid black; padding: 4px;"></td>').join('')}
        </tr>
      `).join('');
    }
    
    return content;
  };

  let totalMLtr = 0, totalMAmt = 0, totalMFatTot = 0, totalMSnfTot = 0;
  let totalELtr = 0, totalEAmt = 0, totalEFatTot = 0, totalESnfTot = 0;
  templateData.data.forEach(d => {
    const ltrs = Number(d.liters || 0);
    const fat = Number(d.fat || 0);
    const snf = Number(d.snf || 0);
    const amt = Number(d.amount || 0);

    if (d.shift === 'Morning') {
      totalMLtr += ltrs;
      totalMAmt += amt;
      totalMFatTot += ltrs * fat;
      totalMSnfTot += ltrs * snf;
    } else {
      totalELtr += ltrs;
      totalEAmt += amt;
      totalEFatTot += ltrs * fat;
      totalESnfTot += ltrs * snf;
    }
  });


  const bonusRate = templateData.bonus_deduction_info?.bonus_amount || 0;
  const bonusAmount = bonusRate * (cowMLtr + cowELtr + buffMLtr + buffELtr);
  const fixedAmount = templateData.bonus_deduction_info?.fixed_amount || 0;
  const bonusFixedTotal = bonusAmount + fixedAmount;

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

  const travelComm = templateData.travel_commission;
  const isTravelValid = travelComm && travelComm.effective_from && (new Date(endDate) >= new Date(travelComm.effective_from));
  const travelAmount = isTravelValid ? travelComm.amount : 0;

  const summary = {
    prevAdvance: parseFloat(templateData.previous_bill?.advance_remaining || '0'),
    prevFeed: parseFloat(templateData.previous_bill?.cattlefeed_remaining || '0'),
    currAdvance: (templateData.payments || []).filter(p => p.payment_type.toLowerCase().trim().replace(/\s/g, '') === 'advance').reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0),
    currFeed: (templateData.payments || []).filter(p => {
      const pType = p.payment_type.toLowerCase().trim().replace(/\s/g, '');
      return pType === 'cattlefeed' || pType === 'pashukhady' || pType === 'पशुखाद्य';
    }).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0),
    dedAdvance: parseFloat(templateData.current_bill?.advance_total || '0'),
    dedFeed: parseFloat(templateData.current_bill?.cattlefeed_total || '0'),
    otherDeductions: parseFloat(templateData.current_bill?.other1_total || '0') + parseFloat(templateData.current_bill?.other2_total || '0'),
    totalAmount: totalMAmt + totalEAmt,
    totalDeductions: parseFloat(templateData.current_bill?.advance_total || '0') + parseFloat(templateData.current_bill?.cattlefeed_total || '0') + parseFloat(templateData.current_bill?.other1_total || '0') + parseFloat(templateData.current_bill?.other2_total || '0') + bonusFixedTotal,
    receivedAmount: (totalMAmt + totalEAmt) - (parseFloat(templateData.current_bill?.advance_total || '0') + parseFloat(templateData.current_bill?.cattlefeed_total || '0') + parseFloat(templateData.current_bill?.other1_total || '0') + parseFloat(templateData.current_bill?.other2_total || '0') + bonusFixedTotal),
  };

  const netPayable = summary.receivedAmount - travelAmount;

  // Check if we need to show Other2 row (Kirana always shows)
  const showOther2 = (parseFloat(templateData.previous_bill?.other2_remaining || '0') > 0 || 
                     parseFloat(templateData.current_bill?.other2_total || '0') > 0 ||
                     (templateData.payments || []).some(p => p.payment_type.toLowerCase().includes('other2')));

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 11px; margin: 0; padding: 0; line-height: 1.2; }
    table { width: 100%; border-collapse: collapse; border: 1px solid black; table-layout: fixed; }
    th, td { border: 1px solid black; padding: 4px; overflow: hidden; white-space: nowrap; }
    th { background: #f2f2f2; font-weight: bold; }
    .header-info { margin-bottom: 8px; width: 100%; border: none; }
    .header-info table { border: none; }
    .summary-grid td { padding: 4px; height: 30px; }
    .no-border td { border: none !important; padding: 2px 0; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
  </style>
</head>
<body style="margin: 0; padding: 0;">
  <div style="padding: 20px 30px; box-sizing: border-box; background-color: white;">
    <div class="text-center bold" style="font-size: 20px; letter-spacing: 1px; margin-bottom: 2px; border: none;">${templateData.dairyName}</div>
  <div class="text-center" style="font-size: 11px; margin-bottom: 6px; border: none;">Mo. ${templateData.dairyPhone || templateData.dairyCode || ''}</div>
  
  <div class="header-info">
    <table class="no-border">
      <tr style="height: 25px;">
        <td style="width: 75%; font-size: 13px; vertical-align: middle;" colspan="2">
          <strong>${labels.accNo} :</strong> ${templateData.farmerCode} &nbsp;&nbsp;&nbsp; <strong>${templateData.farmerName}</strong>
        </td>
        <td style="width: 25%; text-align: right; font-size: 11px; vertical-align: middle;"></td>
      </tr>
      <tr style="height: 20px;">
        <td style="font-size: 11px; vertical-align: middle;"><strong>${labels.bankDetail} :</strong> ${templateData.bankDetails?.accountNumber || ''}</td>
        <td style="text-align: center; font-size: 11px; vertical-align: middle;"><strong>${labels.period} :</strong> ${formatDisplayDate(startDate)} To ${formatDisplayDate(endDate)}</td>
        <td></td>
      </tr>
    </table>
  </div>

  <table>
    <thead>
      <tr>
        <th rowspan="2" style="width: 52px;">${labels.date}</th>
        <th colspan="5">---------- ${labels.morning} ----------</th>
        <th colspan="5">---------- ${labels.evening} ----------</th>
        <th colspan="2">${labels.total}</th>
      </tr>
      <tr>
        <th style="width: 44px;">${labels.quantity}</th><th style="width: 27px;">${labels.fat}</th><th style="width: 27px;">SNF</th><th style="width: 44px;">${labels.rate}</th><th style="width: 69px;">${labels.amount}</th>
        <th style="width: 44px;">${labels.quantity}</th><th style="width: 27px;">${labels.fat}</th><th style="width: 27px;">SNF</th><th style="width: 44px;">${labels.rate}</th><th style="width: 69px;">${labels.amount}</th>
        <th style="width: 48px;">${labels.quantity}</th><th style="width: 95px;">${labels.amount}</th>
      </tr>
    </thead>
    <tbody>
      ${getTablesContent()}
      ${(hasCow && hasBuffalo) && !templateData.hideSummary ? `
      <tr style="font-weight: bold; background: #f2f2f2; height: 30px;">
        <td class="text-center">${labels.total} :</td>
        <td class="text-right">${totalMLtr.toFixed(1)}</td>
        <td class="text-right">${totalMLtr > 0 ? (totalMFatTot / totalMLtr).toFixed(1) : ''}</td>
        <td class="text-right">${totalMLtr > 0 ? (totalMSnfTot / totalMLtr).toFixed(1) : ''}</td>
        <td class="text-right">${totalMLtr > 0 ? (totalMAmt / totalMLtr).toFixed(2) : ''}</td>
        <td class="text-right">${totalMAmt.toFixed(2)}</td>
        <td class="text-right">${totalELtr.toFixed(1)}</td>
        <td class="text-right">${totalELtr > 0 ? (totalEFatTot / totalELtr).toFixed(1) : ''}</td>
        <td class="text-right">${totalELtr > 0 ? (totalESnfTot / totalELtr).toFixed(1) : ''}</td>
        <td class="text-right">${totalELtr > 0 ? (totalEAmt / totalELtr).toFixed(2) : ''}</td>
        <td class="text-right">${totalEAmt.toFixed(2)}</td>
        <td class="text-right">${(totalMLtr + totalELtr).toFixed(1)}</td>
        <td class="text-right">${(totalMAmt + totalEAmt).toFixed(2)}</td>
      </tr>
      ` : ''}
    </tbody>
  </table>

  ${!templateData.hideSummary ? `
  <div style="margin-top: 10px;">
    <table class="summary-grid">
      <tr class="bold text-center" style="background: #f2f2f2; font-size: 10px;">
        <td style="width: 12%;"></td>
        <td style="width: 12%;">${labels.maagilBaaki}</td>
        <td style="width: 12%;">${labels.chaluRakkam}</td>
        <td style="width: 12%;">${labels.ekunBaaki}</td>
        <td style="width: 12%;">${labels.kapatRakkam}</td>
        <td style="width: 12%;">${labels.yeneBaaki}</td>
        <td rowspan="5" style="width: 28%; padding: 0;">
          <table style="width: 100%; border: none; height: 100%;" class="no-border">
            ${bonusAmount > 0 ? `<tr><td style="padding-left: 8px; font-size: 9px;">${labels.bonusDeduction} : </td><td class="text-right bold" style="padding-right: 8px; font-size: 9px;">${bonusAmount.toFixed(2)}</td></tr>` : ''}
            ${fixedAmount > 0 ? `<tr><td style="padding-left: 8px; font-size: 9px;">${templateData.bonus_deduction_info?.remark || 'इमारत निधी'} : </td><td class="text-right bold" style="padding-right: 8px; font-size: 9px;">${fixedAmount.toFixed(2)}</td></tr>` : ''}
            ${(templateData.travel_commission && templateData.travel_commission.effective_from && new Date(templateData.toDate) >= new Date(templateData.travel_commission.effective_from)) ?
              (templateData.travel_commission.cow_amount !== undefined && templateData.travel_commission.buffalo_amount !== undefined) ?
                `<tr><td style="padding-left: 8px; font-size: 9px;">${labels.cow} ${labels.travelCommission} : </td><td class="text-right bold" style="padding-right: 8px; font-size: 9px;">${templateData.travel_commission.cow_amount.toFixed(2)}</td></tr>
                 <tr><td style="padding-left: 8px; font-size: 9px;">${labels.buffalo} ${labels.travelCommission} : </td><td class="text-right bold" style="padding-right: 8px; font-size: 9px;">${templateData.travel_commission.buffalo_amount.toFixed(2)}</td></tr>
                 <tr><td style="padding-left: 8px; font-size: 9px;">${labels.travelCommission} : </td><td class="text-right bold" style="padding-right: 8px; font-size: 9px;">${templateData.travel_commission.amount.toFixed(2)}</td></tr>` :
                `<tr><td style="padding-left: 8px; font-size: 9px;">${labels.travelCommission} : </td><td class="text-right bold" style="padding-right: 8px; font-size: 9px;">${templateData.travel_commission.amount.toFixed(2)}</td></tr>`
              : ''}
            <tr class="bold"><td style="padding-left: 8px; font-size: 10px;">बिल रक्कम : </td><td class="text-right" style="padding-right: 8px; font-size: 10px;">${summary.totalAmount.toFixed(2)}</td></tr>
            <tr class="bold"><td style="padding-left: 8px; font-size: 10px;">${labels.ekunKapat} : </td><td class="text-right" style="padding-right: 8px; font-size: 10px;">${(summary.totalDeductions).toFixed(2)}</td></tr>
            <tr class="bold" style="font-size: 11px; border-top: 1px solid black; background: #eee;"><td style="padding-left: 8px; padding-top: 4px; padding-bottom: 4px;">${labels.adaRakkam} : </td><td class="text-right" style="padding-right: 8px;">${(summary.receivedAmount + ((templateData.travel_commission && templateData.travel_commission.effective_from && new Date(templateData.toDate) >= new Date(templateData.travel_commission.effective_from)) ? templateData.travel_commission.amount : 0)).toFixed(2)}</td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="bold text-center">${labels.other1}</td>
        <td class="text-right">${(parseFloat(templateData.previous_bill?.other1_remaining || '0')).toFixed(2)}</td>
        <td class="text-right">${((templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other1')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0)).toFixed(2)}</td>
        <td class="text-right">${(parseFloat(templateData.previous_bill?.other1_remaining || '0') + (templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other1')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0)).toFixed(2)}</td>
        <td class="text-right">${(parseFloat(templateData.current_bill?.other1_total || '0')).toFixed(2)}</td>
        <td class="text-right">${(parseFloat(templateData.previous_bill?.other1_remaining || '0') + (templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other1')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0) - parseFloat(templateData.current_bill?.other1_total || '0')).toFixed(2)}</td>
      </tr>
      <tr>
        <td class="bold text-center">${labels.pashuKhady}</td>
        <td class="text-right">${summary.prevFeed.toFixed(2)}</td>
        <td class="text-right">${summary.currFeed.toFixed(2)}</td>
        <td class="text-right">${(summary.prevFeed + summary.currFeed).toFixed(2)}</td>
        <td class="text-right">${summary.dedFeed.toFixed(2)}</td>
        <td class="text-right">${((summary.prevFeed + summary.currFeed) - summary.dedFeed).toFixed(2)}</td>
      </tr>
      <tr>
        <td class="bold text-center">${labels.advance}</td>
        <td class="text-right">${summary.prevAdvance.toFixed(2)}</td>
        <td class="text-right">${summary.currAdvance.toFixed(2)}</td>
        <td class="text-right">${(summary.prevAdvance + summary.currAdvance).toFixed(2)}</td>
        <td class="text-right">${summary.dedAdvance.toFixed(2)}</td>
        <td class="text-right">${((summary.prevAdvance + summary.currAdvance) - summary.dedAdvance).toFixed(2)}</td>
      </tr>
      ${showOther2 ? `
      <tr>
        <td class="bold text-center">${labels.other2}</td>
        <td class="text-right">${(parseFloat(templateData.previous_bill?.other2_remaining || '0')).toFixed(2)}</td>
        <td class="text-right">${((templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other2')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0)).toFixed(2)}</td>
        <td class="text-right">${(parseFloat(templateData.previous_bill?.other2_remaining || '0') + (templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other2')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0)).toFixed(2)}</td>
        <td class="text-right">${(parseFloat(templateData.current_bill?.other2_total || '0')).toFixed(2)}</td>
        <td class="text-right">${(parseFloat(templateData.previous_bill?.other2_remaining || '0') + (templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other2')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0) - parseFloat(templateData.current_bill?.other2_total || '0')).toFixed(2)}</td>
      </tr>` : ''}
      <tr class="bold">
        <td class="text-center">${labels.total}</td>
        <td class="text-right">${(summary.prevAdvance + summary.prevFeed + parseFloat(templateData.previous_bill?.other1_remaining || '0') + (showOther2 ? parseFloat(templateData.previous_bill?.other2_remaining || '0') : 0)).toFixed(2)}</td>
        <td class="text-right">${(summary.currAdvance + summary.currFeed + (templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other1')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0) + (showOther2 ? (templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other2')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0) : 0)).toFixed(2)}</td>
        <td class="text-right">${(summary.prevAdvance + summary.prevFeed + summary.currAdvance + summary.currFeed + parseFloat(templateData.previous_bill?.other1_remaining || '0') + (templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other1')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0) + (showOther2 ? parseFloat(templateData.previous_bill?.other2_remaining || '0') + (templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other2')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0) : 0)).toFixed(2)}</td>
        <td class="text-right">${(summary.dedAdvance + summary.dedFeed + parseFloat(templateData.current_bill?.other1_total || '0') + (showOther2 ? parseFloat(templateData.current_bill?.other2_total || '0') : 0)).toFixed(2)}</td>
        <td class="text-right">${((summary.prevAdvance + summary.prevFeed + summary.currAdvance + summary.currFeed + parseFloat(templateData.previous_bill?.other1_remaining || '0') + (templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other1')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0) + (showOther2 ? parseFloat(templateData.previous_bill?.other2_remaining || '0') + (templateData.payments || []).filter(p => p.payment_type.toLowerCase().includes('other2')).reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0) : 0)) - (summary.dedAdvance + summary.dedFeed + parseFloat(templateData.current_bill?.other1_total || '0') + (showOther2 ? parseFloat(templateData.current_bill?.other2_total || '0') : 0))).toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <div style="margin-top: 5px; font-weight: bold; font-size: 11px; border-bottom: 2px solid black; padding-bottom: 5px; display: flex; justify-content: space-between;">
    ${(bonusAmount > 0 || fixedAmount > 0 || parseFloat(String(totalBonusTillDate)) > 0) ? `
    <div style="text-align: right;">
      ${bonusAmount > 0 ? `<span>${labels.bonusDeduction} : ${bonusAmount.toFixed(2)}</span> &nbsp;&nbsp;` : ''}
      ${fixedAmount > 0 ? `<span>${templateData.bonus_deduction_info?.remark || 'इमारत निधी'}: ${fixedAmount.toFixed(2)}</span> &nbsp;&nbsp;` : ''}
      <span>${labels.totalBonusTillDate}: ${parseFloat(String(totalBonusTillDate)).toFixed(2)}</span>
    </div>` : ''}
  </div>
  ` : ''}

  </div>
</body>
</html>
  `;
};

export const generateTemplate3Farmers = (templateData: Template3Data, language: string = 'mr'): string => {
  const labels = getLabels(language);
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
    const bonusRate = Number(farmer.bonus_deduction_info?.bonus_amount || 0);
    const fixedAmount = Number(farmer.bonus_deduction_info?.fixed_amount || 0);
    const bonusAmount = bonusRate * Number(summary.total_quantity || 0);
    const bonusFixedTotal = bonusAmount + fixedAmount;

    const getSumOfPayments = (type: string) => {
      const searchType = type.toLowerCase().trim().replace(/\s/g, '');
      const isCattleFeed = searchType === 'cattlefeed' || searchType === 'pashukhady' || searchType === 'पशुखाद्य';
      
      return (farmer.payments || [])
        .filter(p => {
          const pType = p.payment_type.toLowerCase().trim().replace(/\s/g, '');
          if (isCattleFeed) return pType === 'cattlefeed' || pType === 'pashukhady' || pType === 'पशुखाद्य';
          return pType === searchType;
        })
        .reduce((sum, p) => sum + parseFloat(p.amount_taken || '0'), 0);
    };

    const feedTotal = Number(currentBill?.cattlefeed_total || 0) || getSumOfPayments('cattle feed');
    const advanceTotal = Number(currentBill?.advance_total || 0) || getSumOfPayments('advance');
    const other1Total = Number(currentBill?.other1_total || 0) || getSumOfPayments('other1');
    const other2Total = Number(currentBill?.other2_total || 0) || getSumOfPayments('other2');

    const currentDeductions = (feedTotal + advanceTotal + other1Total + other2Total + bonusFixedTotal);
    
    const travelComm = farmer.travel_commission;
    const isTravelValid = travelComm && travelComm.effective_from && (new Date(templateData.toDate) >= new Date(travelComm.effective_from));
    const travelAmount = isTravelValid ? travelComm.amount : 0;
    const netPayable = (Number(currentBill?.net_payable || summary.total_amount) - (currentDeductions - bonusFixedTotal)) + travelAmount;

    const bonusRemark = farmer.bonus_deduction_info?.remark || 'इमारत निधी';

    let totalBonusTillDate = farmer.bonus_deduction_info?.total_bonus_till_date || 0;
    if (templateData.bonus_deduction_logs_summary?.farmers) {
      const farmerBonus = templateData.bonus_deduction_logs_summary.farmers.find(
        (f) => String(f.farmer_id).padStart(4, "0") === String(farmer.farmer_id).padStart(4, "0") ||
               String(f.farmer_id) === String(farmer.farmer_id)
      );
      if (farmerBonus) totalBonusTillDate = farmerBonus.total_bonus_deduction;
    }

    const showOther2 = (parseFloat(farmer.previous_bill?.other2_remaining || '0') > 0 || 
                       parseFloat(farmer.current_bill?.other2_total || '0') > 0 ||
                       (farmer.payments || []).some(p => p.payment_type.toLowerCase().includes('other2')));

    return `
      <div class="invoice-container" style="height: 33.33%; border-bottom: 2px dashed #000; padding: 40px 80px; box-sizing: border-box; overflow: hidden; line-height: 1.3; font-family: Arial, sans-serif;">
        <div style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 2px;">${templateData.dairyName}</div>
        <div style="text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 8px;">${templateData.dairyPhone || templateData.dairyCode || ''}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin-bottom: 5px;">
           <div>${labels.code}: ${templateData.dairyCode || ''}</div>
           <div>${(() => {
             const parseDate = (d: string) => {
               if (!d) return new Date();
               if (d.includes("/")) {
                 const p = d.split("/");
                 return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
               }
               if (d.includes("-")) {
                 const p = d.split("-");
                 if (p[0].length === 4) return new Date(d);
                 return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
               }
               return new Date(d);
             };
             const fD = parseDate(templateData.fromDate);
             const tD = parseDate(templateData.toDate);
             const fmt = (date: Date) => `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
             return `${fmt(fD)} - ${fmt(tD)}`;
           })()}</div>
        </div>
        <div style="font-size: 11px; margin-bottom: 8px; background: #f0f0f0; padding: 4px 10px; border: 1px solid #000;">
          <div style="display: flex; justify-content: space-between;">
            <div><b>${labels.farmer}: ${farmer.farmer_id} - ${farmer.farmer_details?.fullName || 'Unknown'}</b> | <b>${labels.branch}:</b> ${templateData.branchName || ''}</div>
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
          <tr style="background: #fdfdfd; border-bottom: 1px solid black; font-size: 11px;">
            <td style="padding: 6px 2px; width: 40%; border-right: 1px solid black;">
               <b>${labels.deduction}:</b> ${labels.other1}:${Number(other1Total).toFixed(0)} | ${labels.feed}:${Number(feedTotal).toFixed(0)} | ${labels.advance}:${Number(advanceTotal).toFixed(0)}${showOther2 ? ` | ${labels.other2}:${Number(other2Total).toFixed(0)}` : ''}
            </td>
            <td style="padding: 6px 2px; border-right: 1px solid black;" colspan="2">
              ${(bonusAmount > 0 || fixedAmount > 0 || parseFloat(String(totalBonusTillDate)) > 0 || isTravelValid) ? `
                  ${bonusAmount > 0 ? `<b>${labels.bonusDeduction}</b> (${bonusRate} x ${Number(summary.total_quantity).toFixed(1)}): ${bonusAmount.toFixed(2)} | ` : ''}
                  ${fixedAmount > 0 ? `<b>${bonusRemark}</b>: ${fixedAmount.toFixed(2)} | ` : ''}
                  ${isTravelValid ? `<b>${labels.travelCommission}</b>: ${travelAmount.toFixed(2)} | ` : ''}
                  <b>${labels.totalBonusTillDate}</b>: ${parseFloat(String(totalBonusTillDate)).toFixed(2)}
              ` : ''}
            </td>
          </tr>
          <tr style="background: #f0f0f0;">
            <td style="padding: 6px 2px; border-right: 1px solid black;"><b>${labels.total} ${labels.deduction}:</b> ${(currentDeductions).toFixed(0)}</td>
            <td style="padding: 6px 2px; background: #e0e0e0;" colspan="2"><b>${labels.netPayable}:</b> <span style="font-size:16px;">${Number(netPayable).toFixed(0)}</span></td>
          </tr>
        </table>
      </div>`;
  };
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { margin: 0; padding: 0; font-family: Arial, sans-serif; } @page { size: A4; margin: 0; } .page-container { width: 210mm; height: 297mm; display: flex; flex-direction: column; }</style></head><body><div class="page-container">${templateData.farmers.map(getFarmerHtml).join('')}</div></body></html>`;
};
