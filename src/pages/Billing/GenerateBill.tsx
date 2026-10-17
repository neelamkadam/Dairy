import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { Lock, CheckCircle, Unlock, Loader2 } from "lucide-react";
import { billApi } from "@/services/billApi";
import { deductionApi } from "@/services/deductionApi";
import { bonusApi } from "@/services/bonusApi";
import { vlcCommissionApi } from "@/services/vlcCommissionApi";
import { buildCommissionLookup, computeTravelCommission } from "@/utils/travelCommission";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { useRouteFilter } from "@/hooks/useRouteFilter";
import RouteSelect from "@/components/RouteSelect";

const GenerateBill = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [selectedDairy, setSelectedDairy] = useState<number>(0);
  const selectedVlc = branches.find(b => b.branch_id === selectedDairy);
  // A route only narrows the VLC list; bills are still generated one VLC at a time.
  const { routes, routeId, setRouteId, branchesOf, routeBranches } = useRouteFilter();
  
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
  const [fetchLoading, setFetchLoading] = useState(false);
  const [farmersData, setFarmersData] = useState<any[]>([]);
  const [isBillFinalized, setIsBillFinalized] = useState(false);
  const [resetting, setResetting] = useState(false);

  const shouldShowTravelCommission = () => farmersData.some(f => (f.travelCommissionAmount || 0) > 0);

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

  // Keep the selected VLC when it is on the new route, otherwise move to the
  // route's first VLC and drop the fetched rows, which belong to the old VLC.
  const handleRouteChange = (id: string) => {
    setRouteId(id);
    const vlcs = branchesOf(id);
    if (vlcs.length > 0 && !vlcs.some((b) => b.branch_id === selectedDairy)) {
      setSelectedDairy(vlcs[0].branch_id);
      setFarmersData([]);
      setIsBillFinalized(false);
    }
  };

  useEffect(() => {
    if (selectedDairy !== 0) {
      const dates = calculateDateRange(format(startDate, "yyyy-MM-dd"));
      setStartDate(dates.from);
      setEndDate(dates.to);
    }
  }, [selectedDairy, branches]); // Added branches to dependency to ensure selectedVlc is available

  const fetchBillData = async () => {
    setFetchLoading(true);
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

      // Fetch travel commissions (shared rule: utils/travelCommission)
      if (processedData.length > 0) {
        try {
          const commResponse = await vlcCommissionApi.getByVlcc(selectedDairy.toString());
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

        // Final amount = net payable before bonus/fixed - total bonus/fixed + travel commission
        const finalAmount = netPayableBeforeBonusFixed - totalBonusFixed + (farmer.travelCommissionAmount || 0);

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
      toast.error(error?.response?.data?.message || t("failed_to_fetch_bill_data", "Failed to fetch bill data"));
    } finally {
      setFetchLoading(false);
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
        toast.success(t("successfully_reset", "Successfully reset ") + response.data.updatedCount + t("bills_to_unfinalized_status", " bills to unfinalized status"));
        // Refresh the data to show updated status
        await fetchBillData();
      }
    } catch (error: any) {
      console.error('❌ Error resetting bills:', error);
      toast.error(error?.response?.data?.message || t("failed_to_reset_bills", "Failed to reset bills"));
    } finally {
      setResetting(false);
    }
  };

  const calculatePreviousBillCycle = (currentStartDate: Date) => {
    const [year, month, day] = format(currentStartDate, 'yyyy-MM-dd').split('-').map(Number);
    const cycleDays = selectedVlc?.days || 10;
    
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
            t("please_generate_and_finalize_bills", "Please generate and finalize bills for previous cycle (") + `${format(previousCycle.from, 'dd-MM-yyyy')} to ${format(previousCycle.to, 'dd-MM-yyyy')}` + t("first_parentheses", ") first.")
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
          travel_commission: farmer.travelCommissionAmount || 0,
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

      toast.success(t("bills_generated_and_finalized_successfully", "Bills generated and finalized successfully"));
      await fetchBillData();
    } catch (error: any) {
      console.error('❌ Error generating bills:', error);
      toast.error(error?.response?.data?.message || t("failed_to_generate_bills", "Failed to generate bills"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col items-start text-left gap-1.5 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            {t("generate_bill", "Generate Bill")}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {t("select_criteria_to_generate_bills", "Select criteria to generate bills for farmers")}
          </p>
        </div>
        
        {/* Header & Controls Card */}
        <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl py-0 gap-0">
          <CardHeader className="px-4 py-3 !pb-2 border-b border-slate-100/50 bg-white/50">
            <CardTitle className="text-lg font-semibold text-slate-800">
              {t("select_bill_cycle", "Select Bill Cycle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 items-end ${routes.length > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
              {routes.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">{t("route", "Route")}</Label>
                  <RouteSelect routes={routes} value={routeId} onChange={handleRouteChange} className="h-10" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">{t("select_vlc", "Select VLC")}</Label>
                <VLCDropdown
                  branches={routeBranches}
                  value={String(selectedDairy)}
                  onChange={(val) => setSelectedDairy(Number(val))}
                  valueKey="branch_id"
                  placeholder={t("select_vlc", "Select VLC")}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">{t("start_date", "Start Date")}</Label>
                <Input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full h-10 border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">{t("end_date", "End Date")}</Label>
                <Input
                  type="date"
                  value={format(endDate, "yyyy-MM-dd")}
                  disabled
                  className="w-full h-10 border-gray-200 bg-gray-50 cursor-not-allowed text-gray-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <Button
                  onClick={fetchBillData}
                  disabled={fetchLoading}
                  className="w-full h-10 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm transition-all active:scale-[0.98]"
                >
                  {fetchLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("fetching", "Fetching...")}</span>
                    </div>
                  ) : (
                    t("fetch_data", "Fetch Data")
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate Bill Section (Only shown if data exists) */}
        {farmersData.length > 0 && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-6">
            
            {/* Status & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap shadow-sm backdrop-blur-sm ${
                isBillFinalized 
                  ? 'bg-gray-100/80 text-gray-700 border border-gray-200' 
                  : 'bg-emerald-50/80 text-emerald-700 border border-emerald-100'
              }`}>
                {isBillFinalized ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{t("bills_finalized", "Bills Finalized")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t("ready_to_generate", "Ready to Generate")}</span>
                  </>
                )}
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                {isBillFinalized && (
                  <Button
                    onClick={handleResetToUnfinalized}
                    disabled={resetting}
                    variant="outline"
                    className="flex-1 sm:flex-none h-11 bg-white hover:bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-300 shadow-sm transition-all"
                  >
                    {resetting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Unlock className="w-4 h-4 mr-2" />
                    )}
                    {t("reset_status", "Reset Status")}
                  </Button>
                )}
                
                <Button
                  onClick={handleGenerateBill}
                  disabled={loading || isBillFinalized}
                  className={`flex-1 sm:flex-none h-11 px-8 font-semibold shadow-md transition-all active:scale-[0.98] ${
                    isBillFinalized 
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" 
                      : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/20"
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("generating", "Generating...")}</span>
                    </div>
                  ) : (
                    t("generate_bills", "Generate Bills")
                  )}
                </Button>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("total_amount", "Total Amount")}</p>
                <p className="text-lg font-bold text-gray-900">₹{totals.totalAmount.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("total_deduction", "Total Deduction")}</p>
                <p className="text-lg font-bold text-rose-600">₹{totals.totalDeduction.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("total_bonus", "Total Bonus")}</p>
                <p className="text-lg font-bold text-emerald-600">₹{totals.totalBonus.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("total_fixed", "Total Fixed")}</p>
                <p className="text-lg font-bold text-rose-600">₹{totals.totalFixed.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("total_remaining", "Total Remaining")}</p>
                <p className="text-lg font-bold text-yellow-600">₹{totals.totalRemaining.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-emerald-100 shadow-sm ring-1 ring-emerald-500/10">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">{t("net_payable", "Net Payable")}</p>
                <p className="text-xl font-bold text-emerald-600">₹{totals.totalNetPayable.toFixed(2)}</p>
              </div>
            </div>

            {/* Data Table */}
            <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden rounded-2xl py-0 gap-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("id", "ID")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("name", "Name")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("liter", "Liter")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("amount", "Amount")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("advance", "Advance")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("cattle_feed", "Cattle Feed")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("other1", "Other1")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("other2", "Other2")}</th>
                      {shouldShowTravelCommission() && (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-orange-600 bg-orange-50 uppercase tracking-wider">{t("travel_comm", "Travel Comm")}</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("bonus", "Bonus")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("fixed", "Fixed")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("remaining", "Remaining")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("final_amount", "Final Amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50">
                    {farmersData.map((farmer) => (
                      <tr key={farmer.farmer_id} className="hover:bg-white/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">{farmer.farmer_id}</td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">{farmer.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{farmer.quantity?.toFixed(2) || "0.00"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-medium">₹{(farmer.milk_total).toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs">
                          <div className="text-rose-600 font-medium">₹{(farmer.advanceDeduction || 0).toFixed(2)}</div>
                          {(farmer.advance_remaining_display > 0) && (
                             <div className="text-[10px] text-yellow-600/80 font-medium">
                              {t("bal_rs", "Bal: ₹")}{(farmer.advance_remaining_display || 0).toFixed(2)}
                             </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="text-rose-600 font-medium">₹{(farmer.cattleFeedDeduction || 0).toFixed(2)}</div>
                          {(farmer.cattlefeed_remaining_display > 0) && (
                            <div className="text-[10px] text-yellow-600/80 font-medium">
                             {t("bal_rs", "Bal: ₹")}{(farmer.cattlefeed_remaining_display || 0).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="text-rose-600 font-medium">₹{(farmer.other1Deduction || 0).toFixed(2)}</div>
                          {(farmer.other1_remaining_display > 0) && (
                            <div className="text-[10px] text-yellow-600/80 font-medium">
                             {t("bal_rs", "Bal: ₹")}{(farmer.other1_remaining_display || 0).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="text-rose-600 font-medium">₹{(farmer.other2Deduction || 0).toFixed(2)}</div>
                          {(farmer.other2_remaining_display > 0) && (
                            <div className="text-[10px] text-yellow-600/80 font-medium">
                             {t("bal_rs", "Bal: ₹")}{(farmer.other2_remaining_display || 0).toFixed(2)}
                            </div>
                          )}
                        </td>
                        {shouldShowTravelCommission() && (
                          <td className="px-4 py-3 text-xs text-orange-600 font-medium bg-orange-50/50">
                            {(farmer.travelCommissionAmount || 0) > 0
                              ? `₹${(farmer.travelCommissionAmount as number).toFixed(2)}`
                              : '-'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-xs">
                          <div className="text-emerald-600 font-medium">₹{(farmer.bonusAmount || 0).toFixed(2)}</div>
                          {farmer.bonusRate > 0 && (
                            <div className="text-[10px] text-slate-500">
                              @₹{farmer.bonusRate.toFixed(2)}/L
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-rose-600 font-medium">
                          ₹{(farmer.fixedAmount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs text-yellow-600 font-medium">
                          ₹{(farmer.totalRemaining || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-emerald-600 bg-emerald-50/30">
                          ₹{(farmer.finalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateBill;
