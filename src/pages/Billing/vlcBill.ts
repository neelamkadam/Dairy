import { format } from "date-fns";
import { billApi } from "@/services/billApi";
import { deductionApi } from "@/services/deductionApi";
import { bonusApi } from "@/services/bonusApi";
import { vlcCommissionApi } from "@/services/vlcCommissionApi";
import { buildCommissionLookup, computeTravelCommission } from "@/utils/travelCommission";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";

// One VLC's bill for one period, as Generate Bill fetches, shows and saves it.

export interface BillPeriod {
  from: Date;
  to: Date;
}

const ymd = (date: Date) => format(date, "yyyy-MM-dd");

// The bill cycle (10 days, 15 days or a month, per the VLC's `days`) that holds the date.
export const billCycleOf = (dateStr: string, cycleDays: number): BillPeriod => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  let startDay: number, endDay: number;

  if (cycleDays === 15) {
    if (day >= 1 && day <= 15) {
      startDay = 1;
      endDay = 15;
    } else {
      startDay = 16;
      endDay = lastDayOfMonth;
    }
  } else if (cycleDays >= 28) { // Handle 30, 31, or month-end cycles
    startDay = 1;
    endDay = lastDayOfMonth;
  } else {
    // Default to 10 days logic
    if (day >= 1 && day <= 10) {
      startDay = 1;
      endDay = 10;
    } else if (day >= 11 && day <= 20) {
      startDay = 11;
      endDay = 20;
    } else {
      startDay = 21;
      endDay = lastDayOfMonth;
    }
  }

  return {
    from: new Date(year, month - 1, startDay),
    to: new Date(year, month - 1, endDay)
  };
};

// The cycle before the one starting on `currentStartDate`, or null when that is not a cycle start.
export const previousBillCycle = (currentStartDate: Date, cycleDays: number): BillPeriod | null => {
  const [year, month, day] = ymd(currentStartDate).split('-').map(Number);

  let prevStartDay: number, prevEndDay: number;
  let prevMonth = month;
  let prevYear = year;

  if (cycleDays === 15) {
    if (day === 1) {
      // If current is 1st-15th, previous is 16th to end of previous month
      prevMonth = month === 1 ? 12 : month - 1;
      prevYear = month === 1 ? year - 1 : year;
      prevStartDay = 16;
      prevEndDay = new Date(prevYear, prevMonth, 0).getDate();
    } else if (day === 16) {
      // If current is 16th to end, previous is 1st to 15th
      prevStartDay = 1;
      prevEndDay = 15;
    } else {
      return null;
    }
  } else if (cycleDays >= 28) {
    // Monthly cycle. If current is 1st, previous is 1st to end of previous month
    if (day === 1) {
      prevMonth = month === 1 ? 12 : month - 1;
      prevYear = month === 1 ? year - 1 : year;
      prevStartDay = 1;
      prevEndDay = new Date(prevYear, prevMonth, 0).getDate();
    } else {
      return null;
    }
  } else {
    // Default 10-day cycle
    if (day === 1) {
      // If current cycle starts on 1st, previous is 21st to last day of previous month
      prevMonth = month === 1 ? 12 : month - 1;
      prevYear = month === 1 ? year - 1 : year;
      prevStartDay = 21;
      prevEndDay = new Date(prevYear, prevMonth, 0).getDate();
    } else if (day === 11) {
      // If current cycle starts on 11th, previous is 1st to 10th
      prevStartDay = 1;
      prevEndDay = 10;
    } else if (day === 21) {
      // If current cycle starts on 21st, previous is 11th to 20th
      prevStartDay = 11;
      prevEndDay = 20;
    } else {
      return null;
    }
  }

  return {
    from: new Date(prevYear, prevMonth - 1, prevStartDay),
    to: new Date(prevYear, prevMonth - 1, prevEndDay)
  };
};

// The farmers' bill rows for the period, and whether its bills are already finalized.
export const loadVlcBill = async (dairyId: number, startDate: Date, endDate: Date) => {
  const { data } = await deductionApi.getAllFarmersBalance(dairyId, ymd(startDate), ymd(endDate));

  // Process the nested data structure
  const farmerMap = new Map();

  (data.data || []).forEach((dateEntry: any) => {
    dateEntry.farmers.forEach((farmer: any) => {
      const farmerId = farmer.farmer_id;

      if (farmerMap.has(farmerId)) {
        const existing = farmerMap.get(farmerId);
        existing.milk_total += farmer.milk_total || 0;
        existing.quantity += farmer.quantity || 0;
        existing.cowQuantity += farmer.qty_breakup?.cow || 0;
        existing.buffaloQuantity += farmer.qty_breakup?.buffalo || 0;
        existing.advance += farmer.deductions?.advance || 0;
        existing.cattleFeedAmount += farmer.deductions?.cattle_feed || 0;
        existing.other1Amount += farmer.deductions?.other1 || 0;
        existing.other2Amount += farmer.deductions?.other2 || 0;
        existing.received_total += farmer.total_received || 0;
      } else {
        farmerMap.set(farmerId, {
          farmer_id: farmerId,
          name: farmer.farmer_name || `Farmer ${farmerId}`,
          milk_total: farmer.milk_total || 0,
          quantity: farmer.quantity || 0,
          cowQuantity: farmer.qty_breakup?.cow || 0,
          buffaloQuantity: farmer.qty_breakup?.buffalo || 0,
          travelCommissionAmount: 0,
          advance: (farmer.deductions?.advance || 0) + parseFloat(farmer.previous_bill?.advance_remaining || 0),
          advanceDeduction: 0,
          cattleFeedAmount: (farmer.deductions?.cattle_feed || 0) + parseFloat(farmer.previous_bill?.cattlefeed_remaining || 0),
          cattleFeedDeduction: 0,
          other1Amount: (farmer.deductions?.other1 || 0) + parseFloat(farmer.previous_bill?.other1_remaining || 0),
          other1Deduction: 0,
          other2Amount: (farmer.deductions?.other2 || 0) + parseFloat(farmer.previous_bill?.other2_remaining || 0),
          other2Deduction: 0,
          received_total: farmer.total_received || 0,
          net_payable: farmer.net_payable || 0,
          hasBill: false,
          from_bills: farmer.from_bills || null,
          bonusAmount: 0,
          fixedAmount: 0,
          bonusRate: 0,
          effectiveFrom: null,
          advance_remaining: 0,
          cattlefeed_remaining: 0,
          other1_remaining: 0,
          other2_remaining: 0,
        });
      }
    });
  });

  const processedData = Array.from(farmerMap.values());
  let isBillFinalized = false;

  // Fetch bonus/fixed deductions
  const bonusResponse = await bonusApi.getBonusDeductions({
    dairy_id: dairyId,
    start_date: ymd(startDate),
    end_date: ymd(endDate),
  });

  // Create bonus/fixed map by farmer (get latest entry - highest ID)
  const bonusByFarmer = new Map();
  (bonusResponse.data.data || []).forEach((bonus: any) => {
    const existing = bonusByFarmer.get(bonus.farmer_id);
    if (!existing || bonus.id > existing.id) {
      bonusByFarmer.set(bonus.farmer_id, bonus);
    }
  });

  // Fetch bill details like FarmerDeduction page
  if (processedData.length > 0) {
    const farmerIds = processedData.map(f => f.farmer_id);
    const billDetailsResponse = await deductionApi.getBillDetailsByFarmers(dairyId, farmerIds, ymd(startDate), ymd(endDate));

    // Check if bills are finalized from EITHER source (same logic as FarmerDeduction)
    const billDetailsMap = new Map(
      (billDetailsResponse.data.data || []).map((detail: any) => [
        detail.farmer_id,
        detail
      ])
    );

    // Check if ANY farmer has finalized bills from EITHER source
    isBillFinalized = processedData.some(farmer => {
      // Source 1: Check from_bills for finalized status
      if (farmer.from_bills && farmer.from_bills.is_finalized === 1) return true;

      // Source 2: Check if farmer has finalized bills from detailed API data
      const billDetail = billDetailsMap.get(farmer.farmer_id) as any;
      return !!billDetail && billDetail.is_finalized === 1;
    });

    processedData.forEach(farmer => {
      const billDetail = billDetailsMap.get(farmer.farmer_id) as any;
      if (billDetail) {
        const advTotal = parseFloat(billDetail.advance_total || 0);
        const advRemaining = parseFloat(billDetail.advance_remaining || 0);
        const cfTotal = parseFloat(billDetail.cattlefeed_total || 0);
        const cfRemaining = parseFloat(billDetail.cattlefeed_remaining || 0);
        const o1Total = parseFloat(billDetail.other1_total || 0);
        const o1Remaining = parseFloat(billDetail.other1_remaining || 0);
        const o2Total = parseFloat(billDetail.other2_total || 0);
        const o2Remaining = parseFloat(billDetail.other2_remaining || 0);

        farmer.advance_remaining = advRemaining;
        farmer.cattlefeed_remaining = cfRemaining;
        farmer.other1_remaining = o1Remaining;
        farmer.other2_remaining = o2Remaining;

        const hasData = advTotal > 0 || advRemaining > 0 || cfTotal > 0 || cfRemaining > 0 ||
                       o1Total > 0 || o1Remaining > 0 || o2Total > 0 || o2Remaining > 0;

        if (hasData) {
          // Keep aggregated *Amount fields — they include new deductions added after the last save.
          // Only pull the deduction amounts from the saved bill.
          farmer.advanceDeduction = advTotal;
          farmer.cattleFeedDeduction = cfTotal;
          farmer.other1Deduction = o1Total;
          farmer.other2Deduction = o2Total;
          farmer.hasBill = true;
        }
      }

      // Apply bonus/fixed deductions
      const bonusEntry = bonusByFarmer.get(farmer.farmer_id);
      if (bonusEntry) {
        // Check if period end date is greater than effective_from date
        const periodEndDate = endDate;
        const effectiveDate = bonusEntry.effective_from ? new Date(bonusEntry.effective_from) : null;
        const shouldApplyBonusFixed = effectiveDate && periodEndDate && periodEndDate > effectiveDate;

        if (shouldApplyBonusFixed) {
          farmer.bonusRate = parseFloat(bonusEntry.bonus_deduction || 0);
          farmer.bonusAmount = farmer.quantity * farmer.bonusRate;
          farmer.fixedAmount = parseFloat(bonusEntry.fixed_deduction || 0);
          farmer.effectiveFrom = bonusEntry.effective_from;
        } else {
          farmer.bonusRate = 0;
          farmer.bonusAmount = 0;
          farmer.fixedAmount = 0;
          farmer.effectiveFrom = bonusEntry.effective_from;
        }
      }
    });
  }

  // Fetch travel commissions (shared rule: utils/travelCommission)
  if (processedData.length > 0) {
    try {
      const commResponse = await vlcCommissionApi.getByVlcc(dairyId.toString());
      const lookup = buildCommissionLookup(commResponse.data?.data ?? []);

      processedData.forEach(farmer => {
        farmer.travelCommissionAmount = computeTravelCommission(
          lookup,
          farmer.farmer_id,
          { cow: farmer.cowQuantity, buffalo: farmer.buffaloQuantity, total: farmer.quantity },
          endDate
        ).total;
      });
    } catch (error) {
      console.error('❌ [COMMISSION API ERROR]:', error);
      processedData.forEach(farmer => { farmer.travelCommissionAmount = 0; });
    }
  }

  // Apply priority-based adjustment with bonus/fixed first
  const farmers = processedData.map(farmer => {
    // If bills are finalized for this period, just display saved values
    if (isBillFinalized && farmer.hasBill) {
      const totalBonusFixed = farmer.bonusAmount + farmer.fixedAmount;
      const travelComm = farmer.travelCommissionAmount || 0;
      const netPayableBeforeBonusFixed = farmer.milk_total - (farmer.advanceDeduction + farmer.cattleFeedDeduction + farmer.other1Deduction + farmer.other2Deduction);
      const finalAmount = netPayableBeforeBonusFixed - totalBonusFixed + travelComm;

      return {
        ...farmer,
        advance_remaining_display: farmer.advance_remaining,
        cattlefeed_remaining_display: farmer.cattlefeed_remaining,
        other1_remaining_display: farmer.other1_remaining,
        other2_remaining_display: farmer.other2_remaining,
        totalRemaining: farmer.advance_remaining + farmer.cattlefeed_remaining + farmer.other1_remaining + farmer.other2_remaining,
        netPayableBeforeBonusFixed: netPayableBeforeBonusFixed,
        finalAmount: finalAmount,
      };
    }

    const totalBonusFixed = farmer.bonusAmount + farmer.fixedAmount;
    const remainingAfterBonusFixed = farmer.milk_total + (farmer.travelCommissionAmount || 0) - totalBonusFixed;

    // Original deduction amounts
    // If hasBill is true, use *Deduction fields (current bill totals)
    // If hasBill is false, use *Amount fields (current period balance)
    const originalAdvance = farmer.hasBill ? farmer.advanceDeduction : (farmer.advance || 0);
    const originalCattleFeed = farmer.hasBill ? farmer.cattleFeedDeduction : (farmer.cattleFeedAmount || 0);
    const originalOther1 = farmer.hasBill ? farmer.other1Deduction : (farmer.other1Amount || 0);
    const originalOther2 = farmer.hasBill ? farmer.other2Deduction : (farmer.other2Amount || 0);

    const totalDeductions = originalAdvance + originalCattleFeed + originalOther1 + originalOther2;

    let finalAdvance = originalAdvance;
    let finalCattleFeed = originalCattleFeed;
    let finalOther1 = originalOther1;
    let finalOther2 = originalOther2;

    // Apply priority adjustment if remaining after bonus/fixed is less than total deductions
    if (remainingAfterBonusFixed < totalDeductions) {
      let remaining = Math.max(0, remainingAfterBonusFixed);

      // Priority order: Advance → Cattle Feed → Other1 → Other2
      finalAdvance = Math.min(originalAdvance, remaining);
      remaining = Math.max(0, remaining - finalAdvance);

      finalCattleFeed = Math.min(originalCattleFeed, remaining);
      remaining = Math.max(0, remaining - finalCattleFeed);

      finalOther1 = Math.min(originalOther1, remaining);
      remaining = Math.max(0, remaining - finalOther1);

      finalOther2 = Math.min(originalOther2, remaining);
    }

    // Calculate remaining amounts for next cycle
    const currentAdvanceRemaining = originalAdvance - finalAdvance;
    const currentCattleFeedRemaining = originalCattleFeed - finalCattleFeed;
    const currentOther1Remaining = originalOther1 - finalOther1;
    const currentOther2Remaining = originalOther2 - finalOther2;

    // Total remaining calculation:
    // If hasBill = true: Remaining values from bill details are ALREADY calculated total
    // If hasBill = false: Need to add previous remaining (from balance API) + current cycle remaining
    let totalAdvanceRemaining, totalCattleFeedRemaining, totalOther1Remaining, totalOther2Remaining;

    if (farmer.hasBill) {
      // Bills exist - the saved remaining values already include everything
      // Just use the base remaining + current cycle that couldn't be deducted
      const prevAdvanceFromBill = farmer.advance - farmer.advanceDeduction; // Previous remaining
      const prevCattleFeedFromBill = farmer.cattleFeedAmount - farmer.cattleFeedDeduction;
      const prevOther1FromBill = farmer.other1Amount - farmer.other1Deduction;
      const prevOther2FromBill = farmer.other2Amount - farmer.other2Deduction;

      totalAdvanceRemaining = prevAdvanceFromBill + currentAdvanceRemaining;
      totalCattleFeedRemaining = prevCattleFeedFromBill + currentCattleFeedRemaining;
      totalOther1Remaining = prevOther1FromBill + currentOther1Remaining;
      totalOther2Remaining = prevOther2FromBill + currentOther2Remaining;
    } else {
      // No bills yet - calculate from balance data
      totalAdvanceRemaining = (farmer.advance_remaining || 0) + currentAdvanceRemaining;
      totalCattleFeedRemaining = (farmer.cattlefeed_remaining || 0) + currentCattleFeedRemaining;
      totalOther1Remaining = (farmer.other1_remaining || 0) + currentOther1Remaining;
      totalOther2Remaining = (farmer.other2_remaining || 0) + currentOther2Remaining;
    }

    // Calculate net payable before bonus/fixed
    const netPayableBeforeBonusFixed = farmer.milk_total - (finalAdvance + finalCattleFeed + finalOther1 + finalOther2);

    // Final amount = net payable before bonus/fixed - total bonus/fixed + travel commission
    const finalAmount = netPayableBeforeBonusFixed - totalBonusFixed + (farmer.travelCommissionAmount || 0);

    return {
      ...farmer,
      advanceDeduction: finalAdvance,
      cattleFeedDeduction: finalCattleFeed,
      other1Deduction: finalOther1,
      other2Deduction: finalOther2,
      advance_remaining_display: totalAdvanceRemaining,
      cattlefeed_remaining_display: totalCattleFeedRemaining,
      other1_remaining_display: totalOther1Remaining,
      other2_remaining_display: totalOther2Remaining,
      totalRemaining: totalAdvanceRemaining + totalCattleFeedRemaining + totalOther1Remaining + totalOther2Remaining,
      netPayableBeforeBonusFixed: netPayableBeforeBonusFixed,
      finalAmount: finalAmount,
    };
  });

  return { farmers, isBillFinalized };
};

// Bills must go out cycle by cycle: false while the previous cycle has collection but no bills.
export const isPreviousCycleBilled = async (dairyId: number, startDate: Date, cycleDays: number) => {
  const previousCycle = previousBillCycle(startDate, cycleDays);
  if (!previousCycle) return true;

  try {
    const { data } = await deductionApi.getAllFarmersBalance(dairyId, ymd(previousCycle.from), ymd(previousCycle.to));

    // If no data or no farmers exist, allow generation (new customer)
    if (!data.data || data.data.length === 0) return true;

    // Get all farmer IDs from previous cycle
    const farmerIds: string[] = [];
    data.data.forEach((dateEntry: any) => {
      dateEntry.farmers?.forEach((farmer: any) => {
        if (!farmerIds.includes(farmer.farmer_id)) {
          farmerIds.push(farmer.farmer_id);
        }
      });
    });

    if (farmerIds.length === 0) return true;

    // Check if bills exist for previous cycle using bill details API
    const billDetailsResponse = await deductionApi.getBillDetailsByFarmers(dairyId, farmerIds, ymd(previousCycle.from), ymd(previousCycle.to));

    // If bill details exist, bills have been generated - allow next cycle
    return !!(billDetailsResponse.data.data && billDetailsResponse.data.data.length > 0);
  } catch (error) {
    console.error('Error checking previous bill cycle:', error);
    return true; // Allow generation if check fails
  }
};

// Saves and finalizes the period's bills for the farmers loaded by loadVlcBill.
export const generateVlcBill = async (dairyId: number, startDate: Date, endDate: Date, farmers: any[]) => {
  const records = farmers.map((farmer) => ({
    farmer_id: normalizeFarmerId(farmer.farmer_id),
    dairy_id: dairyId,
    period_start: ymd(startDate),
    period_end: ymd(endDate),
    milk_total: farmer.milk_total,
    advance_total: farmer.advanceDeduction,
    cattlefeed_total: farmer.cattleFeedDeduction,
    other1_total: farmer.other1Deduction,
    other2_total: farmer.other2Deduction,
    received_total: farmer.received_total || 0,
    bonus_deduction: farmer.bonusAmount || 0,
    fixed_deduction: farmer.fixedAmount || 0,
    travel_commission: farmer.travelCommissionAmount || 0,
    net_payable: farmer.finalAmount,
    advance_remaining: farmer.advance_remaining_display || 0,
    cattlefeed_remaining: farmer.cattlefeed_remaining_display || 0,
    other1_remaining: farmer.other1_remaining_display || 0,
    other2_remaining: farmer.other2_remaining_display || 0,
    status: "GENERATED",
    is_finalized: 1,
  }));

  const response = await billApi.generateBills({ success: true, dairy_id: dairyId, records });
  const billIds = response.data?.billIds || response.data?.data?.billIds || [];

  if (billIds.length > 0) {
    await deductionApi.getFinalizedBills(billIds);
  }

  // Create bonus/fixed deduction logs for farmers with bonus/fixed > 0
  const bonusLogPromises = farmers
    .filter(farmer => (farmer.bonusAmount || 0) > 0 || (farmer.fixedAmount || 0) > 0)
    .map(farmer =>
      bonusApi.createBonusDeductionLog({
        dairy_id: dairyId,
        farmer_id: normalizeFarmerId(farmer.farmer_id),
        start_date: ymd(startDate),
        end_date: ymd(endDate),
        bonus_deduction: farmer.bonusAmount || 0,
        fixed_deduction: farmer.fixedAmount || 0,
      })
    );

  if (bonusLogPromises.length > 0) {
    await Promise.all(bonusLogPromises);
  }
};
