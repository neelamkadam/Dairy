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
  stock_name?: string;
  stock?: string | number;
  date?: string;
  created_at?: string;
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
    total_bonus_till_date?: number | string;
  } | null;
}

export interface Template2PerPageData {
  dairyName: string;
  dairyCode?: string;
  branchName?: string;
  farmers: FarmerReportData[];
  fromDate: string;
  toDate: string;
  hideRateAmount?: boolean;
  language?: string;
  bonus_deduction_logs_summary?: {
    dairy_id: number;
    farmers: { farmer_id: string; total_bonus_deduction: string; }[];
  } | null;
}

// Translation object for multi-language support
const translations = {
  en: {
    branch: 'Branch',
    milkType: 'Milk Type',
    billPeriod: 'Bill Period',
    date: 'Date',
    codeNo: 'Code No',
    to: 'to',
    cow: 'Cow',
    buffalo: 'Buffalo',
    morning: 'Morning',
    evening: 'Evening',
    deductions: 'Deductions',
    liter: 'Ltr',
    fat: 'Fat',
    snf: 'SNF',
    rate: 'Rate',
    amount: 'Amt',
    previousBalance: 'Previous Balance',
    name: 'Name',
    credit: 'Credit',
    deduction: 'Deduction',
    remainingBalance: 'Remaining Balance',
    totalLiter: 'Total Liter',
    netPayable: 'Net Payable',
    totalAmount: 'Total Amount',
    cattleFeed: 'Cattle Feed',
    advance: 'Advance',
    total: 'Total',
    bonus: 'Bonus',
    totalBonusTillDate: 'Total Bonus Till Date'
  },
  mr: {
    branch: 'शाखा',
    milkType: 'प्रकार',
    billPeriod: 'दुध बिल कालावधी',
    date: 'दिनांक',
    codeNo: 'कोड नं',
    to: 'ते',
    cow: 'गाय',
    buffalo: 'म्हैस',
    morning: 'सकाळ',
    evening: 'सायंकाळ',
    deductions: 'प्रकार कपात',
    liter: 'लिटर',
    fat: 'फॅट',
    snf: 'SNF',
    rate: 'दर',
    amount: 'रक्कम',
    previousBalance: 'मागील बाकी',
    name: 'नावे',
    credit: 'जमा',
    deduction: 'कपात',
    remainingBalance: 'शेष बाकी',
    totalLiter: 'एकूण लिटर',
    netPayable: 'निव्वळ देय रक्कम',
    totalAmount: 'एकूण रक्कम',
    cattleFeed: 'गाजयाबाडा',
    advance: 'शेड्डाम',
    total: 'एकूण',
    bonus: 'बोनस',
    totalBonusTillDate: 'आजपर्यंतचा एकूण बोनस'
  },
  hi: {
    branch: 'शाखा',
    milkType: 'प्रकार',
    billPeriod: 'दूध बिल अवधि',
    date: 'तारीख',
    codeNo: 'कोड नं',
    to: 'से',
    cow: 'गाय',
    buffalo: 'भैंस',
    morning: 'सुबह',
    evening: 'शाम',
    deductions: 'प्रकार कटौती',
    liter: 'लीटर',
    fat: 'फैट',
    snf: 'SNF',
    rate: 'दर',
    amount: 'राशि',
    previousBalance: 'पिछला बकाया',
    name: 'नाम',
    credit: 'जमा',
    deduction: 'कटौती',
    remainingBalance: 'शेष बकाया',
    totalLiter: 'कुल लीटर',
    netPayable: 'शुद्ध देय राशि',
    totalAmount: 'कुल राशि',
    cattleFeed: 'पशु आहार',
    advance: 'अग्रिम',
    total: 'कुल',
    bonus: 'बोनस',
    totalBonusTillDate: 'अब तक का कुल बोनस'
  }
};

export const generateFarmer2PerPage = (templateData: Template2PerPageData): string => {
  console.log('=== TEMPLATE FUNCTION CALLED ===');
  console.log('Template Data:', templateData);
  console.log('Number of Farmers:', templateData.farmers.length);
  
  const lang = templateData.language || 'en';
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  const getFarmerHtml = (farmer: FarmerReportData) => {
    if (!farmer) return '';
    
    console.log(`\n=== PROCESSING FARMER ${farmer.farmer_id} ===`);
    console.log('Farmer Details:', farmer.farmer_details);
    console.log('Collections Count:', farmer.collections.length);
    console.log('Collections:', farmer.collections);
    console.log('Payments:', farmer.payments);
    console.log('Current Bill:', farmer.current_bill);
    console.log('Previous Bill:', farmer.previous_bill);

    // Determine which milk type this entry represents
    const displayMilkType: 'Cow' | 'Buffalo' = (farmer as any)._displayMilkType || 'Cow';
    const milkTypeLabel = displayMilkType === 'Buffalo' ? t.buffalo : t.cow;
    // hideDeductions: true for cow entry when farmer also has buffalo (deductions shown on buffalo only)
    const hideDeductions = !!(farmer as any)._hideDeductions;
    // For bonus calc on buffalo entry of a mixed farmer, use combined cow+buffalo liters
    const combinedTotalQty = Number((farmer as any)._combinedTotalQty || farmer.collections_summary?.total_quantity || 0);

    const fromDateParts = templateData.fromDate.split(/[-/]/);
    const toDateParts = templateData.toDate.split(/[-/]/);
    const fromDate = new Date(parseInt(fromDateParts[2]), parseInt(fromDateParts[1]) - 1, parseInt(fromDateParts[0]));
    const toDate = new Date(parseInt(toDateParts[2]), parseInt(toDateParts[1]) - 1, parseInt(toDateParts[0]));

    // Create a map with date_shift_type as key for quick lookup
    const collectionMap = new Map();
    farmer.collections.forEach((c) => {
      const date = new Date(c.created_at).toLocaleDateString("en-GB");
      const key = `${date}_${c.shift}_${(c.type || '').toLowerCase().trim()}`;
      collectionMap.set(key, c);
    });

    // Calculate payments and deductions
    const currentBill = farmer.current_bill;
    const previousBill = farmer.previous_bill;
    
    const prevCattleFeedRemaining = Number(previousBill?.cattlefeed_remaining || 0);
    const prevAdvanceRemaining = Number(previousBill?.advance_remaining || 0);

    // Filter payments with proper type matching (including pashukhady)
    const cattleFeedPayments = farmer.payments?.filter((p) => {
      const pType = p.payment_type.toLowerCase().trim().replace(/\s/g, '');
      return pType === 'cattlefeed' || pType === 'pashukhady';
    }) || [];
    
    const advancePayments = farmer.payments?.filter((p) => {
      const pType = p.payment_type.toLowerCase().trim().replace(/\s/g, '');
      return pType === 'advance';
    }) || [];

    const currentCattleFeed = cattleFeedPayments.reduce((sum, p) => sum + Number(p.amount_taken || 0), 0);
    const currentAdvance = advancePayments.reduce((sum, p) => sum + Number(p.amount_taken || 0), 0);

    console.log('Payment Summary:', {
      cattleFeedPayments: cattleFeedPayments,
      advancePayments: advancePayments,
      currentCattleFeed,
      currentAdvance,
      prevCattleFeedRemaining,
      prevAdvanceRemaining
    });

    const totalCattleFeedBalance = prevCattleFeedRemaining + currentCattleFeed;
    const totalAdvanceBalance = prevAdvanceRemaining + currentAdvance;

    const cattleFeed = Number(currentBill?.cattlefeed_total || 0);
    const advance = Number(currentBill?.advance_total || 0);
    const totalDeductions = advance + cattleFeed;

    const cattleFeedRemaining = totalCattleFeedBalance - cattleFeed;
    const advanceRemaining = totalAdvanceBalance - advance;

    // --- BONUS / FIXED DEDUCTION ---
    const bonusAmount = Number(farmer.bonus_deduction_info?.bonus_amount || 0);
    const fixedAmount = Number(farmer.bonus_deduction_info?.fixed_amount || 0);
    const bonusRemark = farmer.bonus_deduction_info?.remark || 'इमारत निधी';
    let totalBonusTillDate: number | string = farmer.bonus_deduction_info?.total_bonus_till_date || 0;
    if (templateData.bonus_deduction_logs_summary?.farmers) {
      const farmerBonus = templateData.bonus_deduction_logs_summary.farmers.find(
        (f) => String(f.farmer_id).padStart(4, '0') === String(farmer.farmer_id).padStart(4, '0') ||
               String(f.farmer_id) === String(farmer.farmer_id)
      );
      if (farmerBonus) totalBonusTillDate = farmerBonus.total_bonus_deduction;
    }
    const hasBonusOrFixed = bonusAmount > 0 || fixedAmount > 0 || parseFloat(String(totalBonusTillDate)) > 0;

    // Build deduction rows — only summary rows (no individual payment detail rows)
    const deductionRows: Array<{ label: string; prev: string; curr: string; ded: string; rem: string; isBold?: boolean }> = [];
    
    // Summary rows
    deductionRows.push({
      label: `${t.total} ${t.cattleFeed}`,
      prev: prevCattleFeedRemaining.toFixed(2),
      curr: currentCattleFeed.toFixed(2),
      ded: cattleFeed.toFixed(2),
      rem: cattleFeedRemaining.toFixed(2)
    });
    
    deductionRows.push({
      label: t.advance,
      prev: prevAdvanceRemaining.toFixed(2),
      curr: currentAdvance.toFixed(2),
      ded: advance.toFixed(2),
      rem: advanceRemaining.toFixed(2)
    });
    
    // Grand total row
    deductionRows.push({
      label: t.total,
      prev: (prevCattleFeedRemaining + prevAdvanceRemaining).toFixed(2),
      curr: (currentCattleFeed + currentAdvance).toFixed(2),
      ded: (cattleFeed + advance).toFixed(2),
      rem: (cattleFeedRemaining + advanceRemaining).toFixed(2),
      isBold: true
    });

    // Total quantity (liters) for bonus — use combined qty when buffalo entry of mixed farmer
    const totalQtyForBonus = combinedTotalQty;
    // bonus_amount is per-liter rate; multiply by total liters to get bill bonus deduction
    const bonusThisBill = bonusAmount * totalQtyForBonus;

    // Bonus / Fixed deduction rows (only if present)
    if (bonusAmount > 0) {
      deductionRows.push({
        label: `${t.bonus} (${bonusAmount} × ${totalQtyForBonus.toFixed(1)})`,
        prev: '', curr: bonusThisBill.toFixed(2), ded: '', rem: ''
      });
    }
    if (fixedAmount > 0) {
      deductionRows.push({ label: bonusRemark, prev: '', curr: fixedAmount.toFixed(2), ded: '', rem: '' });
    }
    if (hasBonusOrFixed) {
      deductionRows.push({
        label: t.totalBonusTillDate,
        prev: '', curr: parseFloat(String(totalBonusTillDate)).toFixed(2), ded: '', rem: '',
        isBold: true
      });
    }

    // Build unified table rows
    let tableRows = '';
    let mLiters = 0, eLiters = 0, mAmt = 0, eAmt = 0;
    let rowIndex = 0;
    
    const cd = new Date(fromDate);

    while (cd <= toDate) {
      const dk = cd.toLocaleDateString("en-GB");
      const displayDate = dk.substring(0, 5); // DD/MM format
      
      // Get morning and evening collections (combine cow and buffalo)
      const mCow = collectionMap.get(`${dk}_Morning_cow`);
      const mBuff = collectionMap.get(`${dk}_Morning_buffalo`);
      const eCow = collectionMap.get(`${dk}_Evening_cow`);
      const eBuff = collectionMap.get(`${dk}_Evening_buffalo`);
      
      // Combine cow and buffalo data if both exist
      const combineCollections = (c1: BillCollection | undefined, c2: BillCollection | undefined) => {
        if (!c1 && !c2) return null;
        if (!c1) return c2;
        if (!c2) return c1;
        
        // Both exist - combine them
        const totalQty = Number(c1.quantity) + Number(c2.quantity);
        return {
          quantity: totalQty,
          fat: totalQty > 0 ? ((Number(c1.quantity) * Number(c1.fat)) + (Number(c2.quantity) * Number(c2.fat))) / totalQty : 0,
          snf: totalQty > 0 ? ((Number(c1.quantity) * Number(c1.snf)) + (Number(c2.quantity) * Number(c2.snf))) / totalQty : 0,
          rate: totalQty > 0 ? ((Number(c1.quantity) * Number(c1.rate)) + (Number(c2.quantity) * Number(c2.rate))) / totalQty : 0,
          amount: Number(c1.amount) + Number(c2.amount)
        };
      };
      
      const m = combineCollections(mCow, mBuff);
      const e = combineCollections(eCow, eBuff);
      
      if (m) { 
        mLiters += Number(m.quantity);
        mAmt += Number(m.amount);
      }
      if (e) { 
        eLiters += Number(e.quantity);
        eAmt += Number(e.amount);
      }

      // Add deduction columns — skip entirely when cow entry of a mixed farmer
      let deductionCols = '';
      if (!hideDeductions) {
        if (rowIndex < deductionRows.length) {
          const ded = deductionRows[rowIndex];
          const fontWeight = ded.isBold ? 'font-weight: bold;' : '';
          const bgColor = ded.isBold ? 'background-color: #f0f0f0;' : '';
          deductionCols = `
            <td style="border-left: 1px solid black; padding: 6px 5px; text-align: left; font-size: 7px; ${fontWeight} ${bgColor}">${ded.label}</td>
            <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px; ${fontWeight} ${bgColor}">${ded.prev}</td>
            <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px; ${fontWeight} ${bgColor}">${ded.curr}</td>
            <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px; ${fontWeight} ${bgColor}">${ded.ded}</td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px; ${fontWeight} ${bgColor}">${ded.rem}</td>
          `;
        } else {
          deductionCols = `
            <td style="border-left: 1px solid black; padding: 6px 5px;"></td>
            <td style="border-left: 1px solid black; padding: 6px 5px;"></td>
            <td style="border-left: 1px solid black; padding: 6px 5px;"></td>
            <td style="border-left: 1px solid black; padding: 6px 5px;"></td>
            <td style="border-left: 1px solid black; border-right: 1px solid black; padding: 6px 5px;"></td>
          `;
        }
      }

      tableRows += `
        <tr>
          <td style="border-left: 1px solid black; padding: 6px 6px; text-align: center; font-size: 8px;">${displayDate}</td>
          <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${m ? Number(m.quantity).toFixed(1) : ''}</td>
          <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${m ? Number(m.fat).toFixed(1) : ''}</td>
          <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${m ? Number(m.snf).toFixed(1) : ''}</td>
          <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${m ? Number(m.rate).toFixed(2) : ''}</td>
          <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${m ? Number(m.amount).toFixed(2) : ''}</td>
          <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${e ? Number(e.quantity).toFixed(1) : ''}</td>
          <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${e ? Number(e.fat).toFixed(1) : ''}</td>
          <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${e ? Number(e.snf).toFixed(1) : ''}</td>
          <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${e ? Number(e.rate).toFixed(2) : ''}</td>
          <td style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${e ? Number(e.amount).toFixed(2) : ''}</td>
          ${deductionCols}
        </tr>
      `;
      
      cd.setDate(cd.getDate() + 1);
      rowIndex++;
    }

    const totalLiters = mLiters + eLiters;
    const totalAmount = mAmt + eAmt;
    const summaryTotalLiters = farmer.collections_summary?.total_quantity || totalLiters;
    const summaryTotalAmount = farmer.collections_summary?.total_amount || totalAmount;
    // For displayTotalLiters / displayTotalAmount: if buffalo entry of a mixed farmer,
    // show combined cow+buffalo totals in the bottom summary
    const displayTotalLiters = combinedTotalQty > summaryTotalLiters ? combinedTotalQty : summaryTotalLiters;
    const combinedTotalAmount = Number((farmer as any)._combinedTotalAmount || 0);
    const displayTotalAmount = combinedTotalAmount > 0 ? combinedTotalAmount : summaryTotalAmount;
    // Use server-computed net_payable (already accounts for bonus/fixed deductions)
    const netPayable = farmer.current_bill?.net_payable != null
      ? Number(farmer.current_bill.net_payable)
      : Number(summaryTotalAmount - totalDeductions);

    // Generate HTML with new unified table format matching the image
    return `
      <div style="width: 100%; font-family: Arial, sans-serif; font-size: 9px; padding: 8px 12px; box-sizing: border-box; page-break-inside: avoid; font-weight: normal;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 2px;">
          <div style="font-size: 12px; font-weight: bold;">${templateData.dairyName}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 9px;">
          <div><b>${t.branch}:</b> ${templateData.branchName || ''}</div>
          <div style="text-align: center;"><b>${t.milkType}</b> ${milkTypeLabel} &nbsp;&nbsp;</div>
          <div style="text-align: right;"><b>${t.billPeriod}</b> ${templateData.fromDate} ${t.to} ${templateData.toDate}</div>
        </div>
        <div style="margin-bottom: 10px; font-size: 9px;">
          <b>${t.codeNo}</b> ${farmer.farmer_id} &nbsp;&nbsp; <b>${farmer.farmer_details?.fullName || ''}</b>
        </div>

        <!-- Unified Table -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 8px;">
          <thead>
            <tr style="background-color: #f0f0f0; border-bottom: 1px solid black;">
              <th rowspan="2" style="border-left: 1px solid black; padding: 4px 6px; text-align: center; font-weight: bold; font-size: 8px; min-width: 45px;">${t.date}</th>
              <th colspan="5" style="border-left: 1px solid black; padding: 4px 6px; text-align: center; font-weight: bold; font-size: 8px;">${t.morning}</th>
              <th colspan="5" style="border-left: 1px solid black; padding: 4px 6px; text-align: center; font-weight: bold; font-size: 8px;">${t.evening}</th>
               ${!hideDeductions ? `<th colspan="5" style="border-left: 1px solid black; border-right: 1px solid black; padding: 4px 6px; text-align: center; font-weight: bold; font-size: 8px;">${t.deductions}</th>` : ''}
            </tr>
            <tr style="background-color: #f0f0f0; border-bottom: 1px solid black;">
              <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.liter}</th>
              <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.fat}</th>
              <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.snf}</th>
              <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.rate}</th>
              <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.amount}</th>
              <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.liter}</th>
              <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.fat}</th>
              <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.snf}</th>
              <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.rate}</th>
              <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.amount}</th>
               ${!hideDeductions ? `
               <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.name}</th>
               <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.previousBalance}</th>
               <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.credit}</th>
               <th style="border-left: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.deduction}</th>
               <th style="border-left: 1px solid black; border-right: 1px solid black; padding: 5px 5px; text-align: center; font-size: 7px;">${t.remainingBalance}</th>
               ` : ''}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot style="font-weight: bold; background-color: #f0f0f0;">
            <tr style="border-top: 1px solid black;">
              <td style="border-left: 1px solid black; padding: 6px 6px; text-align: center; font-size: 8px;">${t.totalLiter}</td>
              <td colspan="2" style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${mLiters.toFixed(1)}</td>
              <td colspan="3" style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${mAmt.toFixed(2)}</td>
              <td colspan="2" style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${eLiters.toFixed(1)}</td>
              <td colspan="3" style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${eAmt.toFixed(2)}</td>
               ${!hideDeductions ? `
               <td colspan="2" style="border-left: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${t.netPayable}</td>
               <td colspan="3" style="border-left: 1px solid black; border-right: 1px solid black; padding: 6px 5px; text-align: center; font-size: 8px;">${netPayable.toFixed(2)}</td>
               ` : ''}
            </tr>
          </tfoot>
        </table>

        ${!hideDeductions ? `
        <!-- Bottom Summary (hidden on cow entry of mixed farmer) -->
        <div style="margin-top: 4px; font-size: 8px; border-top: 1px solid black; padding-top: 2px;">
          <div style="display: flex; justify-content: space-between;">
            <div><b>${displayTotalLiters.toFixed(1)}</b> ${t.totalLiter}</div>
            <div>${t.totalAmount} <b>${displayTotalAmount.toFixed(2)}</b></div>
            <div>${t.netPayable} <b>${netPayable.toFixed(2)}</b></div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  };

  // Generate HTML for each farmer with proper spacing
  const farmerHtmlArray = templateData.farmers.map((farmer, index) => {
    const farmerHtml = getFarmerHtml(farmer);
    // Add page break and spacing after every 2nd farmer (odd index: 1, 3, 5, etc.)
    if (index % 2 === 1 && index < templateData.farmers.length - 1) {
      return farmerHtml + '<div style="page-break-after: always;"></div>';
    }
    // Add spacing between first and second farmer on same page
    if (index % 2 === 0 && index < templateData.farmers.length - 1) {
      return farmerHtml + '<div style="height: 25mm;"></div>';
    }
    return farmerHtml;
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      margin: 0; 
      padding: 0;
      font-family: Arial, sans-serif; 
      width: 210mm;
    }
    @page { 
      size: A4; 
      margin: 0; 
    }
    @media print {
      body { 
        margin: 0; 
        padding: 10mm 8mm 6mm 8mm; 
      }
    }
  </style>
</head>
<body><div style="padding: 25mm 8mm 6mm 8mm; box-sizing: border-box;">${farmerHtmlArray.join('')}</div></body>
</html>`;
};
