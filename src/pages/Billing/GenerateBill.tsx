import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, CheckCircle, Unlock } from "lucide-react";
import { billApi } from "@/services/billApi";
import { deductionApi } from "@/services/deductionApi";
import { bonusApi } from "@/services/bonusApi";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";

const GenerateBill = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [selectedDairy, setSelectedDairy] = useState<number>(0);
  const selectedVlc = branches.find(b => b.branch_id === selectedDairy);
  
  const calculateDateRange = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const cycleDays = selectedVlc?.days || 10;
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

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handleStartDateChange = (newDate: string) => {
    const dates = calculateDateRange(newDate);
    setStartDate(dates.from);
    setEndDate(dates.to);
  };
  const [loading, setLoading] = useState(false);
  const [farmersData, setFarmersData] = useState<any[]>([]);
  const [isBillFinalized, setIsBillFinalized] = useState(false);
  const [resetting, setResetting] = useState(false);

  const totals = farmersData.reduce(
    (acc, farmer) => {
      return {
        totalAmount: acc.totalAmount + farmer.milk_total,
        totalDeduction: acc.totalDeduction + (farmer.advanceDeduction || 0) + (farmer.cattleFeedDeduction || 0) + (farmer.other1Deduction || 0) + (farmer.other2Deduction || 0),
        totalBonus: acc.totalBonus + (farmer.bonusAmount || 0),
        totalFixed: acc.totalFixed + (farmer.fixedAmount || 0),
        totalRemaining: acc.totalRemaining + (farmer.totalRemaining || 0),
        totalNetPayable: acc.totalNetPayable + (farmer.finalAmount || 0),
      };
    },
    { totalAmount: 0, totalDeduction: 0, totalBonus: 0, totalFixed: 0, totalRemaining: 0, totalNetPayable: 0 }
  );

  useEffect(() => {
    if (branches.length > 0 && selectedDairy === 0) {
      setSelectedDairy(branches[0].branch_id);
    }
  }, [branches]);

  useEffect(() => {
    if (selectedDairy !== 0) {
      const dates = calculateDateRange(format(startDate, "yyyy-MM-dd"));
      setStartDate(dates.from);
      setEndDate(dates.to);
    }
  }, [selectedDairy, branches]); // Added branches to dependency to ensure selectedVlc is available

  const fetchBillData = async () => {
    try {
      const { data } = await deductionApi.getAllFarmersBalance(
        selectedDairy,
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );
      
      // Process the nested data structure
      const farmerMap = new Map();
      
      (data.data || []).forEach((dateEntry: any) => {
        dateEntry.farmers.forEach((farmer: any) => {
          const farmerId = farmer.farmer_id;
          
            if (farmerMap.has(farmerId)) {
            const existing = farmerMap.get(farmerId);
            existing.milk_total += farmer.milk_total || 0;
            existing.quantity += farmer.quantity || 0;
            existing.advance_total += farmer.deductions?.advance || 0;
            existing.cattlefeed_total += farmer.deductions?.cattle_feed || 0;
            existing.other1_total += farmer.deductions?.other1 || 0;
            existing.other2_total += farmer.deductions?.other2 || 0;
            existing.received_total += farmer.total_received || 0;
          } else {
            farmerMap.set(farmerId, {
              farmer_id: farmerId,
              name: farmer.farmer_name || `Farmer ${farmerId}`,
              milk_total: farmer.milk_total || 0,
              quantity: farmer.quantity || 0,
              advance: farmer.deductions?.advance || 0,
              advanceDeduction: farmer.deductions?.advance || 0,
              cattleFeedAmount: farmer.deductions?.cattle_feed || 0,
              cattleFeedDeduction: farmer.deductions?.cattle_feed || 0,
              other1Amount: farmer.deductions?.other1 || 0,
              other1Deduction: farmer.deductions?.other1 || 0,
              other2Amount: farmer.deductions?.other2 || 0,
              other2Deduction: farmer.deductions?.other2 || 0,
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
      console.log('📊 Step 1 - Initial Processed Data:', processedData.map(f => ({
        farmer_id: f.farmer_id,
        milk_total: f.milk_total,
        quantity: f.quantity,
        advance: f.advance,
        advanceDeduction: f.advanceDeduction,
        cattleFeed: f.cattleFeedAmount,
        cattleFeedDeduction: f.cattleFeedDeduction
      })));

      // Fetch bonus/fixed deductions
      const bonusResponse = await bonusApi.getBonusDeductions({
        dairy_id: selectedDairy,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      });
      console.log('🎁 Step 2 - Bonus Response:', bonusResponse.data);

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
        const billDetailsResponse = await deductionApi.getBillDetailsByFarmers(
          selectedDairy,
          farmerIds,
          format(startDate, "yyyy-MM-dd"),
          format(endDate, "yyyy-MM-dd")
        );

        // Check if bills are finalized from EITHER source (same logic as FarmerDeduction)
        const billDetailsMap = new Map(
          (billDetailsResponse.data.data || []).map((detail: any) => [
            detail.farmer_id,
            detail
          ])
        );
        
        // Check if ANY farmer has finalized bills from EITHER source
        const hasFinalized = processedData.some(farmer => {
          // Source 1: Check from_bills for finalized status
          if (farmer.from_bills && farmer.from_bills.is_finalized === 1) {
            console.log(`✅ Farmer ${farmer.farmer_id} has finalized bill in from_bills`);
            return true;
          }
          
          // Source 2: Check if farmer has finalized bills from detailed API data
          const billDetail = billDetailsMap.get(farmer.farmer_id) as any;
          if (billDetail && billDetail.is_finalized === 1) {
            console.log(`✅ Farmer ${farmer.farmer_id} has finalized bill in bill details`);
            return true;
          }
          
          return false;
        });

        setIsBillFinalized(hasFinalized);
        console.log('🔒 Bills Finalized Status:', hasFinalized);

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
              farmer.advance = advTotal + advRemaining;
              farmer.advanceDeduction = advTotal;
              farmer.cattleFeedAmount = cfTotal + cfRemaining;
              farmer.cattleFeedDeduction = cfTotal;
              farmer.other1Amount = o1Total + o1Remaining;
              farmer.other1Deduction = o1Total;
              farmer.other2Amount = o2Total + o2Remaining;
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
            console.log(`🎁 Farmer ${farmer.farmer_id} Bonus/Fixed:`, {
              effective_from: bonusEntry.effective_from,
              periodEndDate: periodEndDate?.toISOString(),
              shouldApply: shouldApplyBonusFixed,
              quantity: farmer.quantity,
              bonusRate: farmer.bonusRate,
              bonusAmount: farmer.bonusAmount,
              fixedAmount: farmer.fixedAmount
            });
          }
        });

        console.log('📋 Step 3 - After Bill Details & Bonus:', processedData.map(f => ({
          farmer_id: f.farmer_id,
          milk_total: f.milk_total,
          advance: f.advance,
          advanceDeduction: f.advanceDeduction,
          advance_remaining: f.advance_remaining,
          cattleFeed: f.cattleFeedAmount,
          cattleFeedDeduction: f.cattleFeedDeduction,
          cattlefeed_remaining: f.cattlefeed_remaining,
          bonusAmount: f.bonusAmount,
          fixedAmount: f.fixedAmount,
          hasBill: f.hasBill
        })));
      }

      // Apply priority-based adjustment with bonus/fixed first
      const adjustedData = processedData.map(farmer => {
        console.log(`\n💰 Processing Farmer ${farmer.farmer_id}:`);
        console.log('  Initial Values:', {
          milk_total: farmer.milk_total,
          quantity: farmer.quantity,
          hasBill: farmer.hasBill,
          advance: farmer.advance,
          advanceDeduction: farmer.advanceDeduction,
          cattleFeedAmount: farmer.cattleFeedAmount,
          cattleFeedDeduction: farmer.cattleFeedDeduction,
          other1Amount: farmer.other1Amount,
          other1Deduction: farmer.other1Deduction,
          other2Amount: farmer.other2Amount,
          other2Deduction: farmer.other2Deduction,
          bonusAmount: farmer.bonusAmount,
          fixedAmount: farmer.fixedAmount,
          advance_remaining: farmer.advance_remaining,
          cattlefeed_remaining: farmer.cattlefeed_remaining,
        });

        // If bills are finalized for this period, just display saved values
        if (isBillFinalized && farmer.hasBill) {
          console.log('  ✅ Bills Finalized - Using Saved Values');
          
          const totalBonusFixed = farmer.bonusAmount + farmer.fixedAmount;
          const netPayableBeforeBonusFixed = farmer.milk_total - (farmer.advanceDeduction + farmer.cattleFeedDeduction + farmer.other1Deduction + farmer.other2Deduction);
          const finalAmount = netPayableBeforeBonusFixed - totalBonusFixed;

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
        const remainingAfterBonusFixed = farmer.milk_total - totalBonusFixed;

        console.log('  Bonus/Fixed Calc:', {
          totalBonusFixed,
          remainingAfterBonusFixed
        });

        // Original deduction amounts
        // If hasBill is true, use *Deduction fields (current bill totals)
        // If hasBill is false, use *Amount fields (current period balance)
        const originalAdvance = farmer.hasBill ? farmer.advanceDeduction : (farmer.advance || 0);
        const originalCattleFeed = farmer.hasBill ? farmer.cattleFeedDeduction : (farmer.cattleFeedAmount || 0);
        const originalOther1 = farmer.hasBill ? farmer.other1Deduction : (farmer.other1Amount || 0);
        const originalOther2 = farmer.hasBill ? farmer.other2Deduction : (farmer.other2Amount || 0);
        
        console.log('  Original Deductions:', {
          originalAdvance,
          originalCattleFeed,
          originalOther1,
          originalOther2,
          source: farmer.hasBill ? 'Bill Details (*Deduction fields)' : 'Current Period Balance (*Amount fields)'
        });
        
        const totalDeductions = originalAdvance + originalCattleFeed + originalOther1 + originalOther2;

        console.log('  Total Deductions:', totalDeductions);
        console.log('  Needs Adjustment?', remainingAfterBonusFixed < totalDeductions);

        let finalAdvance = originalAdvance;
        let finalCattleFeed = originalCattleFeed;
        let finalOther1 = originalOther1;
        let finalOther2 = originalOther2;

        // Apply priority adjustment if remaining after bonus/fixed is less than total deductions
        if (remainingAfterBonusFixed < totalDeductions) {
          let remaining = Math.max(0, remainingAfterBonusFixed);
          
          console.log('  🔄 Applying Priority Adjustment...');
          console.log('    Available:', remaining);
          
          // Priority order: Advance → Cattle Feed → Other1 → Other2
          finalAdvance = Math.min(originalAdvance, remaining);
          remaining = Math.max(0, remaining - finalAdvance);
          console.log('    After Advance:', { finalAdvance, remaining });
          
          finalCattleFeed = Math.min(originalCattleFeed, remaining);
          remaining = Math.max(0, remaining - finalCattleFeed);
          console.log('    After CattleFeed:', { finalCattleFeed, remaining });
          
          finalOther1 = Math.min(originalOther1, remaining);
          remaining = Math.max(0, remaining - finalOther1);
          console.log('    After Other1:', { finalOther1, remaining });
          
          finalOther2 = Math.min(originalOther2, remaining);
          console.log('    After Other2:', { finalOther2, remaining: Math.max(0, remaining - finalOther2) });
        }

        console.log('  Final Deductions:', {
          finalAdvance,
          finalCattleFeed,
          finalOther1,
          finalOther2
        });

        // Calculate remaining amounts for next cycle
        const currentAdvanceRemaining = originalAdvance - finalAdvance;
        const currentCattleFeedRemaining = originalCattleFeed - finalCattleFeed;
        const currentOther1Remaining = originalOther1 - finalOther1;
        const currentOther2Remaining = originalOther2 - finalOther2;

        console.log('  Current Cycle Remaining:', {
          currentAdvanceRemaining,
          currentCattleFeedRemaining,
          currentOther1Remaining,
          currentOther2Remaining
        });

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
          
          console.log('  Previous from Bill Details:', {
            prevAdvanceFromBill,
            prevCattleFeedFromBill,
            prevOther1FromBill,
            prevOther2FromBill
          });
        } else {
          // No bills yet - calculate from balance data
          totalAdvanceRemaining = (farmer.advance_remaining || 0) + currentAdvanceRemaining;
          totalCattleFeedRemaining = (farmer.cattlefeed_remaining || 0) + currentCattleFeedRemaining;
          totalOther1Remaining = (farmer.other1_remaining || 0) + currentOther1Remaining;
          totalOther2Remaining = (farmer.other2_remaining || 0) + currentOther2Remaining;
          
          console.log('  Previous from Balance Data:', {
            advance_remaining: farmer.advance_remaining,
            cattlefeed_remaining: farmer.cattlefeed_remaining,
            other1_remaining: farmer.other1_remaining,
            other2_remaining: farmer.other2_remaining
          });
        }

        console.log('  Total Remaining for Next Cycle:', {
          totalAdvanceRemaining,
          totalCattleFeedRemaining,
          totalOther1Remaining,
          totalOther2Remaining
        });

        // Calculate net payable before bonus/fixed
        const netPayableBeforeBonusFixed = farmer.milk_total - (finalAdvance + finalCattleFeed + finalOther1 + finalOther2);
        
        // Final amount = net payable before bonus/fixed - total bonus/fixed
        const finalAmount = netPayableBeforeBonusFixed - totalBonusFixed;

        console.log('  Final Calculation:', {
          netPayableBeforeBonusFixed,
          totalBonusFixed,
          finalAmount
        });

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

      console.log('✅ Step 4 - Final Adjusted Data:', adjustedData.map(f => ({
        farmer_id: f.farmer_id,
        milk_total: f.milk_total,
        advanceDeduction: f.advanceDeduction,
        cattleFeedDeduction: f.cattleFeedDeduction,
        other1Deduction: f.other1Deduction,
        other2Deduction: f.other2Deduction,
        bonusAmount: f.bonusAmount,
        fixedAmount: f.fixedAmount,
        advance_remaining_display: f.advance_remaining_display,
        cattlefeed_remaining_display: f.cattlefeed_remaining_display,
        totalRemaining: f.totalRemaining,
        finalAmount: f.finalAmount
      })));

      setFarmersData(adjustedData);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch bill data");
    }
  };

  const handleResetToUnfinalized = async () => {
    try {
      setResetting(true);
      const response = await deductionApi.resetToPending(
        selectedDairy,
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );
      
      if (response.data.success) {
        toast.success(`Successfully reset ${response.data.updatedCount} bills to unfinalized status`);
        // Refresh the data to show updated status
        await fetchBillData();
      }
    } catch (error: any) {
      console.error('❌ Error resetting bills:', error);
      toast.error(error?.response?.data?.message || "Failed to reset bills");
    } finally {
      setResetting(false);
    }
  };

  const calculatePreviousBillCycle = (currentStartDate: Date) => {
    const [year, month, day] = format(currentStartDate, 'yyyy-MM-dd').split('-').map(Number);
    
    let prevStartDay: number, prevEndDay: number;
    if (day === 1) {
      // If current cycle starts on 1st, previous is 21st to last day of previous month
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      prevStartDay = 21;
      prevEndDay = new Date(prevYear, prevMonth, 0).getDate();
      return {
        from: new Date(prevYear, prevMonth - 1, prevStartDay),
        to: new Date(prevYear, prevMonth - 1, prevEndDay)
      };
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
    
    return {
      from: new Date(year, month - 1, prevStartDay),
      to: new Date(year, month - 1, prevEndDay)
    };
  };

  const checkPreviousBillCycle = async () => {
    const previousCycle = calculatePreviousBillCycle(startDate);
    if (!previousCycle) return true;

    try {
      const { data } = await deductionApi.getAllFarmersBalance(
        selectedDairy,
        format(previousCycle.from, "yyyy-MM-dd"),
        format(previousCycle.to, "yyyy-MM-dd")
      );

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
      const billDetailsResponse = await deductionApi.getBillDetailsByFarmers(
        selectedDairy,
        farmerIds,
        format(previousCycle.from, "yyyy-MM-dd"),
        format(previousCycle.to, "yyyy-MM-dd")
      );

      // If bill details exist, bills have been generated - allow next cycle
      const hasBillData = billDetailsResponse.data.data && billDetailsResponse.data.data.length > 0;
      
      return hasBillData; // Return true if bills exist, false if not
    } catch (error) {
      console.error('Error checking previous bill cycle:', error);
      return true; // Allow generation if check fails
    }
  };

  const handleGenerateBill = async () => {
    setLoading(true);
    try {
      const canGenerate = await checkPreviousBillCycle();
      if (!canGenerate) {
        const previousCycle = calculatePreviousBillCycle(startDate);
        if (previousCycle) {
          toast.error(
            `Please generate and finalize bills for previous cycle (${format(previousCycle.from, 'dd-MM-yyyy')} to ${format(previousCycle.to, 'dd-MM-yyyy')}) first.`
          );
        }
        setLoading(false);
        return;
      }

      const records = farmersData.map((farmer) => {
        const record = {
          farmer_id: normalizeFarmerId(farmer.farmer_id),
          dairy_id: selectedDairy,
          period_start: format(startDate, "yyyy-MM-dd"),
          period_end: format(endDate, "yyyy-MM-dd"),
          milk_total: farmer.milk_total,
          advance_total: farmer.advanceDeduction,
          cattlefeed_total: farmer.cattleFeedDeduction,
          other1_total: farmer.other1Deduction,
          other2_total: farmer.other2Deduction,
          received_total: farmer.received_total || 0,
          bonus_deduction: farmer.bonusAmount || 0,
          fixed_deduction: farmer.fixedAmount || 0,
          net_payable: farmer.finalAmount,
          advance_remaining: farmer.advance_remaining_display || 0,
          cattlefeed_remaining: farmer.cattlefeed_remaining_display || 0,
          other1_remaining: farmer.other1_remaining_display || 0,
          other2_remaining: farmer.other2_remaining_display || 0,
          status: "GENERATED",
          is_finalized: 1,
        };
        console.log(`📤 Bill Record for ${farmer.farmer_id}:`, record);
        return record;
      });

      const billsData = {
        success: true,
        dairy_id: selectedDairy,
        records,
      };

      const response = await billApi.generateBills(billsData);
      const billIds = response.data?.billIds || response.data?.data?.billIds || [];

      if (billIds.length > 0) {
        await deductionApi.getFinalizedBills(billIds);
      }

      // Create bonus/fixed deduction logs for farmers with bonus/fixed > 0
      const bonusLogPromises = farmersData
        .filter(farmer => (farmer.bonusAmount || 0) > 0 || (farmer.fixedAmount || 0) > 0)
        .map(farmer => 
          bonusApi.createBonusDeductionLog({
            dairy_id: selectedDairy,
            farmer_id: normalizeFarmerId(farmer.farmer_id),
            start_date: format(startDate, "yyyy-MM-dd"),
            end_date: format(endDate, "yyyy-MM-dd"),
            bonus_deduction: farmer.bonusAmount || 0,
            fixed_deduction: farmer.fixedAmount || 0,
          })
        );

      if (bonusLogPromises.length > 0) {
        await Promise.all(bonusLogPromises);
        console.log('✅ Bonus/fixed deduction logs created successfully');
      }

      toast.success("Bills generated and finalized successfully");
      await fetchBillData();
    } catch (error: any) {
      console.error('❌ Error generating bills:', error);
      toast.error(error?.response?.data?.message || "Failed to generate bills");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl text-left font-bold text-gray-900">
                  Generate Bill
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className=" max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left bg-white">
        <Card className="mb-5 border-none">
          <CardHeader>
            <CardTitle>Select Bill Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Select VLC:</Label>
                  <Select value={selectedDairy.toString()} onValueChange={(value) => setSelectedDairy(parseInt(value))}>
                    <SelectTrigger className="w-48 bg-white border-gray-300">
                      <SelectValue placeholder="Select VLC" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300 shadow-lg">
                      {branches.map((branch) => (
                        <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                          {branch.username} - {branch.name} - {branch.branchName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Start Date:</Label>
                  <Input
                    type="date"
                    value={format(startDate, "yyyy-MM-dd")}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>End Date:</Label>
                  <Input
                    type="date"
                    value={format(endDate, "yyyy-MM-dd")}
                    disabled
                    className="border-gray-300 bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <Button 
                  onClick={fetchBillData}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? "Loading..." : "Show"}
                </Button>
              </div>
              {farmersData.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap ${
                    isBillFinalized 
                      ? 'bg-gray-200 text-gray-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {isBillFinalized ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Bills Already Finalized</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Bills Not Finalized</span>
                      </>
                    )}
                  </div>
                  {isBillFinalized && (
                    <Button
                      onClick={handleResetToUnfinalized}
                      disabled={resetting}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 flex items-center gap-1.5"
                    >
                      {resetting ? (
                        'Resetting...'
                      ) : (
                        <>
                          <Unlock className="w-4 h-4" />
                          <span>Reset to Unfinalized</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardContent className="p-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Liter
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Advance
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Cattle Feed
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Other1
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Other2
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Bonus
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Fixed
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Remaining
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Final Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {farmersData.map((farmer) => (
                    <tr key={farmer.farmer_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">
                        {farmer.farmer_id}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900">
                        {farmer.name}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900">
                        {farmer.quantity?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900">
                        ₹{(farmer.milk_total).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="text-red-600 font-medium">₹{(farmer.advanceDeduction || 0).toFixed(2)}</div>
                        {(farmer.advance_remaining_display > 0) && (
                           <div className="text-[10px] text-yellow-600">
                            ₹{(farmer.advance_remaining_display || 0).toFixed(2)}
                           </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="text-red-600 font-medium">₹{(farmer.cattleFeedDeduction || 0).toFixed(2)}</div>
                        {(farmer.cattlefeed_remaining_display > 0) && (
                          <div className="text-[10px] text-yellow-600">
                           ₹{(farmer.cattlefeed_remaining_display || 0).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="text-red-600 font-medium">₹{(farmer.other1Deduction || 0).toFixed(2)}</div>
                        {(farmer.other1_remaining_display > 0) && (
                          <div className="text-[10px] text-yellow-600">
                           ₹{(farmer.other1_remaining_display || 0).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="text-red-600 font-medium">₹{(farmer.other2Deduction || 0).toFixed(2)}</div>
                        {(farmer.other2_remaining_display > 0) && (
                          <div className="text-[10px] text-yellow-600">
                           ₹{(farmer.other2_remaining_display || 0).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600 font-medium">
                        ₹{(farmer.bonusAmount || 0).toFixed(2)}
                        {farmer.bonusRate > 0 && (
                          <div className="text-[10px] text-gray-500">
                            @₹{farmer.bonusRate.toFixed(2)}/L
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600 font-medium">
                        ₹{(farmer.fixedAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs text-yellow-600 font-medium">
                        ₹{(farmer.totalRemaining || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-green-600">
                        ₹{(farmer.finalAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-300">
              <div className="flex justify-between items-center text-sm">
                <div className="flex gap-6">
                  <div>
                    <span className="text-xs font-medium text-gray-600">Total Amount</span>
                    <p className="text-sm font-bold text-gray-900">₹{totals.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">Total Deduction</span>
                    <p className="text-sm font-bold text-red-600">₹{totals.totalDeduction.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">Total Bonus</span>
                    <p className="text-sm font-bold text-red-600">₹{totals.totalBonus.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">Total Fixed</span>
                    <p className="text-sm font-bold text-red-600">₹{totals.totalFixed.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">Total Remaining</span>
                    <p className="text-sm font-bold text-yellow-600">₹{totals.totalRemaining.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">Total Net Payable</span>
                    <p className="text-sm font-bold text-green-600">₹{totals.totalNetPayable.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full text-center">
              <Button
                onClick={handleGenerateBill}
                disabled={loading || isBillFinalized}
                className="bg-blue-600 hover:bg-blue-700 text-white w-[17%] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Generating..." : "Generate Bill"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default GenerateBill;
