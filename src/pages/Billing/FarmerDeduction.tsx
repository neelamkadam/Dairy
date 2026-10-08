import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, Search, CalendarIcon, Settings, ArrowUp, ArrowDown, GripVertical, Loader2, CircleUserRound, Receipt } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import SummaryCards from "@/components/SummaryCards";
import Pagination from "@/components/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deductionApi } from "@/services/deductionApi";
import { bonusApi } from "@/services/bonusApi";
import { webUserApi } from "@/services/webUserApi";
import { vlcCommissionApi } from "@/services/vlcCommissionApi";
import { buildCommissionLookup, computeTravelCommission } from "@/utils/travelCommission";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";

const FarmerDeduction = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [searchTerm, setSearchTerm] = useState("");
  const [vlcName, setVlcName] = useState("");
  const selectedVlc = branches.find(b => b.branch_id.toString() === vlcName);

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
    } else if (cycleDays >= 28) {
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

  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dates = calculateDateRange(dateStr);
      setStartDate(dates.from);
      setEndDate(dates.to);
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [farmerData, setFarmerData] = useState<any[]>([]);
  const { userData } = useAppSelector((state) => state.authData);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [previousRemainingOpen, setPreviousRemainingOpen] = useState(false);
  const [priority, setPriority] = useState<string[]>(['bonus', 'fixed', 'advance', 'cattleFeed', 'other1', 'other2']);
  const [isBillFinalized, setIsBillFinalized] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  // Helper functions to check if columns should be shown
  const shouldShowAdvance = () => farmerData.some(f => f.advance > 0 || f.advanceDeduction > 0);
  const shouldShowCattleFeed = () => farmerData.some(f => f.cattleFeedAmount > 0 || f.cattleFeedDeduction > 0);
  const shouldShowOther1 = () => farmerData.some(f => f.other1Amount > 0 || f.other1Deduction > 0);
  const shouldShowOther2 = () => farmerData.some(f => f.other2Amount > 0 || f.other2Deduction > 0);
  const shouldShowBonus = () => farmerData.some(f => f.bonusAmount > 0 || f.bonusRate > 0);
  const shouldShowFixed = () => farmerData.some(f => f.fixedAmount > 0);
  const shouldShowTravelCommission = () => farmerData.some(f => (f.travelCommissionAmount || 0) > 0);

  useEffect(() => {
    if (branches.length > 0 && !vlcName) {
      setVlcName(branches[0].branch_id.toString());
    }
  }, [branches]);

  useEffect(() => {
    if (vlcName && startDate) {
      const dateStr = format(startDate, 'yyyy-MM-dd');
      const dates = calculateDateRange(dateStr);
      setStartDate(dates.from);
      setEndDate(dates.to);
    }
  }, [vlcName, branches]);

  useEffect(() => {
    if (userData?.id) {
      fetchPriority();
    }
  }, [userData?.id]);

  const fetchPriority = async () => {
    try {
      const { data } = await webUserApi.getPriority(parseInt(userData.id!));
      setPriority(data.data);
    } catch (error) {
      console.error('❌ [API ERROR] getPriority:', error);
    }
  };

  const fetchDeductions = async () => {
    if (!startDate || !endDate || !vlcName) {
      toast.error(t("please_select_vlc_and_date_range", "Please select VLC and date range"));
      return;
    }

    setFetchLoading(true);
    try {
      const { data } = await deductionApi.getAllFarmersBalance(
        parseInt(vlcName),
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );
      console.log('📤 [DEDUCTION API] getAllFarmersBalance - Response:', data);

      const farmerMap = new Map();
      
      (data.data || []).forEach((dateEntry: any) => {
        dateEntry.farmers.forEach((farmer: any) => {
          const farmerId = farmer.farmer_id;
          
          // Debug: Check what quantity value is coming from API
          
          if (farmerMap.has(farmerId)) {
            const existing = farmerMap.get(farmerId);
            const beforeQty = existing.quantity;
            existing.billAmount += farmer.milk_total || 0;
            existing.quantity += farmer.quantity || 0;
            existing.cowQuantity += farmer.qty_breakup?.cow || 0;
            existing.buffaloQuantity += farmer.qty_breakup?.buffalo || 0;
            existing.advance += farmer.deductions?.advance || 0;
            existing.cattleFeedAmount += farmer.deductions?.cattle_feed || 0;
            existing.other1Amount += farmer.deductions?.other1 || 0;
            existing.other2Amount += farmer.deductions?.other2 || 0;
            existing.receivedAmount += farmer.total_received || 0;
            existing.finalAmount += farmer.net_payable || 0;

          } else {
            const initQuantity = farmer.quantity || 0;

            farmerMap.set(farmerId, {
              farmer_id: farmerId,
              name: `${farmerId} - ${farmer.farmer_name || `Farmer ${farmerId}`}`,
              billAmount: farmer.milk_total || 0,
              quantity: initQuantity,
              cowQuantity: farmer.qty_breakup?.cow || 0,
              buffaloQuantity: farmer.qty_breakup?.buffalo || 0,
              dateRange: `${format(startDate, "dd-MM-yyyy")} - ${format(endDate, "dd-MM-yyyy")}`,
              bonusRate: 0,
              bonusAmount: 0,
              fixedAmount: 0,
              effectiveFrom: null,
              from_bills: farmer.from_bills || null,
              advance: (farmer.deductions?.advance || 0) + parseFloat(farmer.previous_bill?.advance_remaining || 0),
              advanceDeduction: 0,
              cattleFeedAmount: (farmer.deductions?.cattle_feed || 0) + parseFloat(farmer.previous_bill?.cattlefeed_remaining || 0),
              cattleFeedDeduction: 0,
              other1Amount: (farmer.deductions?.other1 || 0) + parseFloat(farmer.previous_bill?.other1_remaining || 0),
              other1Deduction: 0,
              other2Amount: (farmer.deductions?.other2 || 0) + parseFloat(farmer.previous_bill?.other2_remaining || 0),
              other2Deduction: 0,
              receivedAmount: farmer.total_received || 0,
              finalAmount: farmer.net_payable || 0,
              previousRemaining: (
                parseFloat(farmer.previous_bill?.advance_remaining || 0) +
                parseFloat(farmer.previous_bill?.cattlefeed_remaining || 0) +
                parseFloat(farmer.previous_bill?.other1_remaining || 0) +
                parseFloat(farmer.previous_bill?.other2_remaining || 0)
              ),
              previousBillDetails: {
                advance: parseFloat(farmer.previous_bill?.advance_remaining || 0),
                cattleFeed: parseFloat(farmer.previous_bill?.cattlefeed_remaining || 0),
                other1: parseFloat(farmer.previous_bill?.other1_remaining || 0),
                other2: parseFloat(farmer.previous_bill?.other2_remaining || 0)
              },
              hasBill: false,
            });
          }
        });
      });
      
      const processedData = Array.from(farmerMap.values());
      
      // Debug: Check final aggregated quantities
      processedData.forEach(farmer => {
        // console.log(`  ${farmer.farmer_id}: quantity=${farmer.quantity}, billAmount=${farmer.billAmount}`);
      });

      // Fetch bonus/fixed deductions
      if (processedData.length > 0) {
        try {
          const bonusResponse = await bonusApi.getBonusDeductions({
            dairy_id: parseInt(vlcName),
            start_date: format(startDate, "yyyy-MM-dd"),
            end_date: format(endDate, "yyyy-MM-dd")
          });

          // Create bonus/fixed map by farmer (get latest entry - highest ID)
          const bonusMap = new Map();
          (bonusResponse.data.data || []).forEach((bonus: any) => {
            const existing = bonusMap.get(bonus.farmer_id);
            if (!existing || bonus.id > existing.id) {
              bonusMap.set(bonus.farmer_id, bonus);
            }
          });

          processedData.forEach(farmer => {
            const bonusEntry = bonusMap.get(farmer.farmer_id);
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
        } catch (error) {
          console.error('❌ [BONUS API ERROR]:', error);
        }
      }

      if (processedData.length > 0) {
        const farmerIds = processedData.map(f => f.farmer_id);
        
        const billDetailsResponse = await deductionApi.getBillDetailsByFarmers(
          parseInt(vlcName),
          farmerIds,
          format(startDate, "yyyy-MM-dd"),
          format(endDate, "yyyy-MM-dd")
        );
        console.log('📤 [DEDUCTION API] getBillDetailsByFarmers - Response:', billDetailsResponse.data);

        const billDetailsMap = new Map(
          (billDetailsResponse.data.data || []).map((detail: any) => [
            detail.farmer_id,
            detail
          ])
        );
        
        // Check if bills are finalized from EITHER source
        const hasFinalized = processedData.some(farmer => {
          // Source 1: Check from_bills for finalized status
          if (farmer.from_bills && farmer.from_bills.is_finalized === 1) {
            console.log(`✅ Farmer ${farmer.farmer_id} has finalized bill in from_bills`);
            return true;
          }
          
          // Source 2: Check if farmer has finalized bills from detailed API data
          const billDetail = billDetailsMap.get(farmer.farmer_id);
          if (billDetail && (billDetail as any).is_finalized === 1) {
            return true;
          }
          
          return false;
        });

        setIsBillFinalized(hasFinalized);

        processedData.forEach(farmer => {
          const billDetail = billDetailsMap.get(farmer.farmer_id);
          if (billDetail) {
            const advTotal = parseFloat((billDetail as any).advance_total || 0);
            const advRemaining = parseFloat((billDetail as any).advance_remaining || 0);
            const cfTotal = parseFloat((billDetail as any).cattlefeed_total || 0);
            const cfRemaining = parseFloat((billDetail as any).cattlefeed_remaining || 0);
            const o1Total = parseFloat((billDetail as any).other1_total || 0);
            const o1Remaining = parseFloat((billDetail as any).other1_remaining || 0);
            const o2Total = parseFloat((billDetail as any).other2_total || 0);
            const o2Remaining = parseFloat((billDetail as any).other2_remaining || 0);

            const hasData = advTotal > 0 || advRemaining > 0 || cfTotal > 0 || cfRemaining > 0 || 
                           o1Total > 0 || o1Remaining > 0 || o2Total > 0 || o2Remaining > 0;

            if (hasData) {
              // Keep aggregated amounts — they correctly include new daily advances/deductions
              // given after the bill was last saved. Only pull the deduction amounts from the
              // saved bill so the UI shows what was already processed.
              farmer.advanceDeduction = advTotal;
              farmer.cattleFeedDeduction = cfTotal;
              farmer.other1Deduction = o1Total;
              farmer.other2Deduction = o2Total;
              farmer.hasBill = true;
            }
          }
        });
      }

      // Fetch travel commissions with cow/buffalo split
      if (processedData.length > 0) {
        try {
          const commResponse = await vlcCommissionApi.getByVlcc(vlcName);
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

      const adjustedData = processedData.map(farmer => {
        const fieldMap: any = {
          bonus: { deduction: 'bonusAmount', amount: 'bonusAmount' },
          fixed: { deduction: 'fixedAmount', amount: 'fixedAmount' },
          advance: { deduction: 'advanceDeduction', amount: 'advance' },
          cattleFeed: { deduction: 'cattleFeedDeduction', amount: 'cattleFeedAmount' },
          other1: { deduction: 'other1Deduction', amount: 'other1Amount' },
          other2: { deduction: 'other2Deduction', amount: 'other2Amount' }
        };

        if (farmer.hasBill) return farmer;

        const updated = { ...farmer };
        let remainingBillAmount = farmer.billAmount + (farmer.travelCommissionAmount || 0);

        // Bonus and fixed are already calculated based on date validation
        let bonusAmount = updated.bonusAmount || 0;
        let fixedAmount = updated.fixedAmount || 0;
        remainingBillAmount = remainingBillAmount - bonusAmount - fixedAmount;

        for (const key of priority) {
          // Skip bonus and fixed as they're already deducted
          if (key === 'bonus' || key === 'fixed') continue;
          
          const field = fieldMap[key];
          const availableAmount = updated[field.amount];
          
          if (availableAmount > 0 && remainingBillAmount > 0) {
            const deductAmount = Math.min(availableAmount, remainingBillAmount);
            updated[field.deduction] = deductAmount;
            remainingBillAmount -= deductAmount;
          } else {
            updated[field.deduction] = 0;
          }
        }
        
        updated.modified = true;
        return updated;
      });

      setFarmerData(adjustedData);
    } catch (error: any) {
      console.error('❌ [API ERROR] fetchDeductions:', error);
      toast.error(error?.response?.data?.message || t("failed_to_fetch_deductions", "Failed to fetch deductions"));
    } finally {
      setFetchLoading(false);
    }
  };



  const handleDeductionChange = (farmerId: string, field: string, value: string) => {
    let numValue = parseFloat(value) || 0;
    
    setFarmerData(prev => prev.map(farmer => {
      if (farmer.farmer_id === farmerId) {
        const bonusAmount = farmer.bonusAmount || 0;
        const fixedAmount = farmer.fixedAmount || 0;
        const otherDeductions = 
          bonusAmount +
          fixedAmount +
          (field !== 'advanceDeduction' ? farmer.advanceDeduction : 0) + 
          (field !== 'cattleFeedDeduction' ? farmer.cattleFeedDeduction : 0) + 
          (field !== 'other1Deduction' ? farmer.other1Deduction : 0) + 
          (field !== 'other2Deduction' ? farmer.other2Deduction : 0);
        
        const maxAllowed = farmer.billAmount + (farmer.travelCommissionAmount || 0) - otherDeductions;

        if (numValue > maxAllowed) {
          const correctedValue = Math.max(0, maxAllowed);
          toast.warning(t("value_auto_corrected_to", "Value auto-corrected to ") + `${correctedValue.toFixed(2)}` + t("total_deductions_cannot_exceed", ". Total deductions cannot exceed bill amount + travel commission."));
          numValue = correctedValue;
        }
        
        const updatedFarmer = { ...farmer, [field]: numValue };
        const totalDeductions = 
          bonusAmount +
          fixedAmount +
          updatedFarmer.advanceDeduction + 
          updatedFarmer.cattleFeedDeduction + 
          updatedFarmer.other1Deduction + 
          updatedFarmer.other2Deduction;
        
        return { ...updatedFarmer, modified: true };
      }
      return farmer;
    }));
  };

  const movePriority = async (index: number, direction: 'up' | 'down') => {
    const newPriority = [...priority];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newPriority[index], newPriority[swapIndex]] = [newPriority[swapIndex], newPriority[index]];
    setPriority(newPriority);
    
    try {
      await webUserApi.updatePriority(parseInt(userData.id!), newPriority);
      toast.success(t("priority_updated", "Priority updated"));
    } catch (error) {
      console.error('❌ [API ERROR] updatePriority:', error);
      toast.error(t("failed_to_update_priority", "Failed to update priority"));
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex === dropIndex) return;
    
    const newPriority = [...priority];
    const [removed] = newPriority.splice(dragIndex, 1);
    newPriority.splice(dropIndex, 0, removed);
    setPriority(newPriority);
    
    try {
      await webUserApi.updatePriority(parseInt(userData.id!), newPriority);
      toast.success(t("priority_updated", "Priority updated"));
    } catch (error) {
      console.error('❌ [API ERROR] updatePriority:', error);
      toast.error(t("failed_to_update_priority", "Failed to update priority"));
    }
  };

  const handleClearAdvanceDeductions = () => {
    setFarmerData(prev => prev.map(farmer => ({
      ...farmer,
      advanceDeduction: 0
    })));
    toast.success(t("all_advance_deductions_cleared", "All advance deductions cleared"));
  };

  const handleSave = async () => {
    if (!startDate || !endDate || !vlcName) {
      toast.error(t("please_select_vlc_and_date_range", "Please select VLC and date range"));
      return;
    }

    try {
      const modifiedFarmers = farmerData.filter(f => f.modified);
      
      if (modifiedFarmers.length === 0) {
        toast.info(t("no_changes_to_save", "No changes to save"));
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const farmer of modifiedFarmers) {
        try {
          const bonusAmount = farmer.bonusRate || 0;
          const fixedAmount = farmer.fixedAmount || 0;
          const travelCommissionAmount = farmer.travelCommissionAmount || 0;
          const totalDeductions = bonusAmount + fixedAmount + farmer.advanceDeduction + farmer.cattleFeedDeduction + farmer.other1Deduction + farmer.other2Deduction;
          const netPayable = farmer.billAmount - totalDeductions + travelCommissionAmount;
          
          const billData = {
            farmer_id: farmer.farmer_id,
            dairy_id: parseInt(vlcName),
            period_start: format(startDate, "yyyy-MM-dd"),
            period_end: format(endDate, "yyyy-MM-dd"),
            milk_total: farmer.billAmount,
            advance_total: farmer.advanceDeduction,
            cattlefeed_total: farmer.cattleFeedDeduction,
            other1_total: farmer.other1Deduction,
            other2_total: farmer.other2Deduction,
            received_total: farmer.receivedAmount,
            net_payable: netPayable,
            // Already inside net_payable — stored so the bill PDF prints it without adding it again
            travel_commission: travelCommissionAmount,
            advance_remaining: farmer.advance - farmer.advanceDeduction,
            cattlefeed_remaining: farmer.cattleFeedAmount - farmer.cattleFeedDeduction,
            other1_remaining: farmer.other1Amount - farmer.other1Deduction,
            other2_remaining: farmer.other2Amount - farmer.other2Deduction
          };

          await deductionApi.updateFarmerBillWeb(billData);
          
          // Create bonus/fixed deduction log
          if (bonusAmount > 0 || fixedAmount > 0) {
            try {
              const logData = {
                farmer_id: farmer.farmer_id,
                dairy_id: parseInt(vlcName),
                bonus_deduction: bonusAmount,
                fixed_deduction: fixedAmount,
                start_date: format(startDate, "yyyy-MM-dd"),
                end_date: format(endDate, "yyyy-MM-dd")
              };
              await bonusApi.createBonusDeductionLog(logData);
            } catch (logError) {
              console.error(`❌ [BONUS LOG ERROR] Farmer ${farmer.farmer_id}:`, logError);
            }
          }
          
          successCount++;
        } catch (error) {
          console.error(`❌ [API ERROR] updateFarmerBillWeb - Farmer ${farmer.farmer_id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(t("successfully_updated", "Successfully updated ") + successCount + t("farmer_bills", " farmer bill(s)"));
        fetchDeductions();
      }
      if (errorCount > 0) {
        toast.error(t("failed_to_update", "Failed to update ") + errorCount + t("farmer_bills", " farmer bill(s)"));
      }
    } catch (error: any) {
      console.error('❌ [API ERROR] handleSave:', error);
      toast.error(error?.response?.data?.message || t("failed_to_update_deductions", "Failed to update deductions"));
    }
  };

  const filteredData = farmerData.filter((farmer) =>
    farmer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col items-start text-left gap-1.5 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            {t("farmer_deduction", "Farmer Deduction")}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {t("manage_auto_deductions_for_farmers", "Manage auto-deductions for farmers per billing cycle efficiently.")}
          </p>
        </div>

        {/* Top Filter Card */}
        <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl py-0 gap-0">
          <CardHeader className="px-4 py-3 !pb-3 border-b border-slate-100/50 bg-white/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-500" />
                {t("filter_configuration", "Filter & Configuration")}
              </CardTitle>
              <div className="flex items-center gap-3">
                {farmerData.length > 0 && (
                  <div className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shadow-sm border ${
                    isBillFinalized 
                      ? 'bg-gray-100 text-gray-700 border-gray-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {isBillFinalized ? '🔒 ' + t("bills_finalized", "Bills Finalized") : '✅ ' + t("bills_not_finalized", "Bills Not Finalized")}
                  </div>
                )}
                
                <Dialog open={priorityOpen} onOpenChange={setPriorityOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-8 px-3 text-xs flex items-center gap-2 border-gray-200 shadow-sm">
                      <Settings className="h-3.5 w-3.5" />
                      {t("priority", "Priority")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white">
                    <DialogHeader>
                      <DialogTitle>{t("set_deduction_priority", "Set Deduction Priority")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                      {priority.map((item, index) => (
                        <div 
                          key={item} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-move hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                            <span className="capitalize">
                              {item === 'cattleFeed' ? t("cattle_feed", "Cattle Feed") : 
                               item === 'bonus' ? t("bonus", "Bonus") :
                               item === 'fixed' ? t("fixed", "Fixed") :
                               item}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={index === 0}
                              onClick={() => movePriority(index, 'up')}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={index === priority.length - 1}
                              onClick={() => movePriority(index, 'down')}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="space-y-1.5 group lg:col-span-1">
                <Label className="text-sm font-medium text-gray-700">{t("select_vlc", "Select VLC")}</Label>
                <VLCDropdown
                  branches={branches}
                  value={vlcName}
                  onChange={setVlcName}
                  valueKey="branch_id"
                  placeholder={t("select_vlc", "Select VLC")}
                />
              </div>

              <div className="space-y-1.5 group lg:col-span-1">
                <Label className="text-sm font-medium text-gray-700">{t("start_date", "Start Date")}</Label>
                <Input
                  type="date"
                  value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const newDateStr = e.target.value;
                    if (newDateStr) {
                      handleStartDateChange(new Date(newDateStr));
                    }
                  }}
                  className="w-full h-10 border-gray-200"
                />
              </div>

              <div className="space-y-1.5 group lg:col-span-1">
                <Label className="text-sm font-medium text-gray-700">{t("end_date", "End Date")}</Label>
                <Input
                  type="date"
                  value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                  disabled
                  className="w-full h-10 border-gray-200 bg-gray-50 cursor-not-allowed text-gray-500"
                />
              </div>
              
              <div className="space-y-1.5 group lg:col-span-1">
                <Label className="text-sm font-medium text-gray-700">{t("search", "Search")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={t("search_farmers", "Search farmers...")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 border-gray-200 w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group lg:col-span-1">
                <Button
                  onClick={fetchDeductions}
                  disabled={fetchLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md hover:shadow-indigo-500/20 transition-all active:scale-[0.98] h-10"
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

        {/* Summary Cards */}
        <SummaryCards 
          className="p-4 w-[75%]"
          data={{
            totalBillAmount: farmerData.reduce((sum, farmer) => sum + farmer.billAmount, 0),
            totalDeductions: farmerData.reduce((sum, farmer) => sum + (farmer.bonusAmount || 0) + (farmer.fixedAmount || 0) + farmer.advance + farmer.cattleFeedAmount + farmer.other1Amount + farmer.other2Amount, 0),
            totalFinalAmount: Math.max(0, farmerData.reduce((sum, farmer) => sum + farmer.finalAmount, 0)),
            remainingBalance: farmerData.reduce((sum, farmer) => sum + farmer.previousRemaining, 0)
          }}
        />

        {/* Save Button */}
        {farmerData.length > 0 && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-4">
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 items-center px-2">
              <Dialog open={previousRemainingOpen} onOpenChange={setPreviousRemainingOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-10 px-5 border-gray-200 shadow-sm font-medium text-slate-700 hover:text-slate-900">
                    {t("previous_remaining", "Previous Remaining")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white max-w-4xl max-h-[80vh] overflow-y-auto rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{t("previous_remaining_balances", "Previous Remaining Balances")}</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <Table>
                      <TableHeader className="bg-gray-50/80">
                        <TableRow>
                          <TableHead className="font-semibold text-slate-700">{t("farmer_name", "Farmer Name")}</TableHead>
                          <TableHead className="font-semibold text-slate-700">{t("advance", "Advance")}</TableHead>
                          <TableHead className="font-semibold text-slate-700">{t("cattle_feed", "Cattle Feed")}</TableHead>
                          <TableHead className="font-semibold text-slate-700">{t("other_1", "Other 1")}</TableHead>
                          <TableHead className="font-semibold text-slate-700">{t("other_2", "Other 2")}</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">{t("total", "Total")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {farmerData.filter(f => f.previousRemaining > 0).map((farmer) => (
                          <TableRow key={farmer.farmer_id} className="hover:bg-gray-50/50">
                            <TableCell className="font-medium text-slate-800">{farmer.name}</TableCell>
                            <TableCell className="text-rose-600 font-medium">
                              {farmer.previousBillDetails?.advance > 0 ? `₹${farmer.previousBillDetails.advance.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-rose-600 font-medium">
                              {farmer.previousBillDetails?.cattleFeed > 0 ? `₹${farmer.previousBillDetails.cattleFeed.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-rose-600 font-medium">
                              {farmer.previousBillDetails?.other1 > 0 ? `₹${farmer.previousBillDetails.other1.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-rose-600 font-medium">
                              {farmer.previousBillDetails?.other2 > 0 ? `₹${farmer.previousBillDetails.other2.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="font-bold text-rose-600 text-right">
                              ₹{farmer.previousRemaining.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {farmerData.filter(f => f.previousRemaining > 0).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                              {t("no_previous_remaining_balances_found", "No previous remaining balances found")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>

              {shouldShowAdvance() && (
                <Button 
                  onClick={handleClearAdvanceDeductions}
                  variant="outline"
                  className="h-10 px-5 text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 font-medium shadow-sm transition-colors"
                  disabled={isBillFinalized}
                >
                  {t("clear_advance", "Clear Advance")}
                </Button>
              )}
              
              <Button 
                onClick={handleSave}
                className={`h-10 px-6 font-semibold shadow-md transition-all active:scale-[0.98] ${
                  isBillFinalized 
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" 
                    : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-500/20"
                }`}
                disabled={isBillFinalized}
              >
                {isBillFinalized ? t("cannot_save_bills_finalized", "Cannot Save - Bills Finalized") : t("save_changes", "Save Changes")}
              </Button>
            </div>

            {/* Farmer Table */}
            <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden rounded-2xl py-0 gap-0">
          <div className="overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader className="bg-gray-200">
                <TableRow className="border-b border-gray-200">
                  <TableHead className="font-semibold text-gray-700 px-2 py-2">
                    Farmer Name
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 px-2 py-2">
                    Qty (L)
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 px-2 py-2">
                    Bill Amount
                  </TableHead>
                  {shouldShowAdvance() && (
                    <>
                      <TableHead className="font-semibold text-gray-700 px-2 py-2">
                        Advance
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 px-2 py-2">
                        Adv Ded
                      </TableHead>
                    </>
                  )}
                  {shouldShowCattleFeed() && (
                    <>
                      <TableHead className="font-semibold text-gray-700 px-2 py-2">
                        CF Amt
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 px-2 py-2">
                        CF Ded
                      </TableHead>
                    </>
                  )}
                  {shouldShowOther1() && (
                    <>
                      <TableHead className="font-semibold text-gray-700 px-2 py-2">
                        O1 Amt
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 px-2 py-2">
                        O1 Ded
                      </TableHead>
                    </>
                  )}
                  {shouldShowOther2() && (
                    <>
                      <TableHead className="font-semibold text-gray-700 px-2 py-2">
                        O2 Amt
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 px-2 py-2">
                        O2 Ded
                      </TableHead>
                    </>
                  )}
                  <TableHead className="font-semibold text-gray-700 px-2 py-2">
                    Received
                  </TableHead>
                  {shouldShowTravelCommission() && (
                    <TableHead className="font-semibold text-gray-700 bg-orange-50 px-2 py-2">
                      Travel Comm
                    </TableHead>
                  )}
                    {shouldShowBonus() && (
                    <TableHead className="font-semibold text-gray-700 bg-red-50 px-2 py-2">
                      Bonus
                    </TableHead>
                  )}
                  {shouldShowFixed() && (
                    <TableHead className="font-semibold text-gray-700 bg-red-50 px-2 py-2">
                      Fixed
                    </TableHead>
                  )}
                  <TableHead className="font-semibold text-gray-700 px-2 py-2">
                    Final Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((farmer, index) => (
                  <TableRow
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <TableCell className="font-medium text-gray-900 px-2 py-2 text-xs">
                      {farmer.name}
                    </TableCell>
                    <TableCell className="text-gray-700 px-2 py-2 text-xs font-semibold">
                      {farmer.quantity?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell className="text-gray-700 px-2 py-2 text-xs">
                      ₹{farmer.billAmount.toFixed(2)}
                    </TableCell>
                    {shouldShowAdvance() && (
                      <>
                        <TableCell className="text-gray-700 px-2 py-2 text-xs">
                          ₹{farmer.advance.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="number"
                            value={farmer.advanceDeduction}
                            onChange={(e) => handleDeductionChange(farmer.farmer_id, 'advanceDeduction', e.target.value)}
                            className="w-20 h-8 text-red-600 text-xs"
                            disabled={isBillFinalized}
                          />
                        </TableCell>
                      </>
                    )}
                    {shouldShowCattleFeed() && (
                      <>
                        <TableCell className="text-gray-700 px-2 py-2 text-xs">
                          ₹{farmer.cattleFeedAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="number"
                            value={farmer.cattleFeedDeduction}
                            onChange={(e) => handleDeductionChange(farmer.farmer_id, 'cattleFeedDeduction', e.target.value)}
                            className="w-20 h-8 text-red-600 text-xs"
                            disabled={isBillFinalized}
                          />
                        </TableCell>
                      </>
                    )}
                    {shouldShowOther1() && (
                      <>
                        <TableCell className="text-gray-700 px-2 py-2 text-xs">
                          ₹{farmer.other1Amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="number"
                            value={farmer.other1Deduction}
                            onChange={(e) => handleDeductionChange(farmer.farmer_id, 'other1Deduction', e.target.value)}
                            className="w-20 h-8 text-red-600 text-xs"
                            disabled={isBillFinalized}
                          />
                        </TableCell>
                      </>
                    )}
                    {shouldShowOther2() && (
                      <>
                        <TableCell className="text-gray-700 px-2 py-2 text-xs">
                          ₹{farmer.other2Amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Input
                            type="number"
                            value={farmer.other2Deduction}
                            onChange={(e) => handleDeductionChange(farmer.farmer_id, 'other2Deduction', e.target.value)}
                            className="w-20 h-8 text-red-600 text-xs"
                            disabled={isBillFinalized}
                          />
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-green-600 px-2 py-2 text-xs">
                      ₹{farmer.receivedAmount.toFixed(2)}
                    </TableCell>
                    {shouldShowTravelCommission() && (
                      <TableCell className="text-orange-600 bg-orange-50 px-2 py-2 text-xs">
                        {(farmer.travelCommissionAmount || 0) > 0
                          ? `₹${(farmer.travelCommissionAmount as number).toFixed(2)}`
                          : '-'}
                      </TableCell>
                    )}
                    {shouldShowBonus() && (
                      <TableCell className="text-red-600 bg-red-50 px-2 py-2 text-xs">
                        {farmer.bonusAmount > 0 ? (
                          <div>
                            <div className="font-medium">₹{farmer.bonusAmount.toFixed(2)}</div>
                            {farmer.bonusRate > 0 && (
                              <div className="text-[10px] text-gray-500">
                                @₹{farmer.bonusRate.toFixed(2)}/L
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                    )}
                    {shouldShowFixed() && (
                      <TableCell className="text-red-600 bg-red-50 px-2 py-2 text-xs">
                        {farmer.fixedAmount > 0 ? `₹${farmer.fixedAmount.toFixed(2)}` : '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-green-600 font-semibold px-2 py-2 text-xs">
                      ₹{(
                        farmer.billAmount -
                        (farmer.bonusAmount || 0) -
                        (farmer.fixedAmount || 0) -
                        farmer.advanceDeduction -
                        farmer.cattleFeedDeduction -
                        farmer.other1Deduction -
                        farmer.other2Deduction +
                        (farmer.travelCommissionAmount || 0)
                      ).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Pagination */}
        {filteredData.length > 10 && (
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            totalItems={filteredData.length}
          />
        )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerDeduction;
