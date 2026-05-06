import { useState, useEffect } from "react";
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
import { Filter, Search, CalendarIcon, Settings, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deductionApi } from "@/services/deductionApi";
import { bonusApi } from "@/services/bonusApi";
import { webUserApi } from "@/services/webUserApi";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";

const FarmerDeduction = () => {
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

  // Helper functions to check if columns should be shown
  const shouldShowAdvance = () => farmerData.some(f => f.advance > 0 || f.advanceDeduction > 0);
  const shouldShowCattleFeed = () => farmerData.some(f => f.cattleFeedAmount > 0 || f.cattleFeedDeduction > 0);
  const shouldShowOther1 = () => farmerData.some(f => f.other1Amount > 0 || f.other1Deduction > 0);
  const shouldShowOther2 = () => farmerData.some(f => f.other2Amount > 0 || f.other2Deduction > 0);
  const shouldShowBonus = () => farmerData.some(f => f.bonusAmount > 0 || f.bonusRate > 0);
  const shouldShowFixed = () => farmerData.some(f => f.fixedAmount > 0);

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
      toast.error("Please select VLC and date range");
      return;
    }

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
          console.log(`🔍 [DEBUG] Farmer ${farmerId}:`, {
            quantity: farmer.quantity,
            milk_total: farmer.milk_total,
            hasQuantityField: 'quantity' in farmer
          });
          
          if (farmerMap.has(farmerId)) {
            const existing = farmerMap.get(farmerId);
            const beforeQty = existing.quantity;
            existing.billAmount += farmer.milk_total || 0;
            existing.quantity += farmer.quantity || 0;
            existing.advance += farmer.deductions?.advance || 0;
            existing.cattleFeedAmount += farmer.deductions?.cattle_feed || 0;
            existing.other1Amount += farmer.deductions?.other1 || 0;
            existing.other2Amount += farmer.deductions?.other2 || 0;
            existing.receivedAmount += farmer.total_received || 0;
            existing.finalAmount += farmer.net_payable || 0;
            
            console.log(`  📊 Aggregating: ${beforeQty} + ${farmer.quantity || 0} = ${existing.quantity}`);
          } else {
            const initQuantity = farmer.quantity || 0;
            console.log(`  ✨ New farmer - Initial quantity: ${initQuantity}`);
            
            farmerMap.set(farmerId, {
              farmer_id: farmerId,
              name: `${farmerId} - ${farmer.farmer_name || `Farmer ${farmerId}`}`,
              billAmount: farmer.milk_total || 0,
              quantity: initQuantity,
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
      console.log('📋 [DEBUG] Final Aggregated Data:');
      processedData.forEach(farmer => {
        console.log(`  ${farmer.farmer_id}: quantity=${farmer.quantity}, billAmount=${farmer.billAmount}`);
      });

      // Fetch bonus/fixed deductions
      if (processedData.length > 0) {
        try {
          const bonusResponse = await bonusApi.getBonusDeductions({
            dairy_id: parseInt(vlcName),
            start_date: format(startDate, "yyyy-MM-dd"),
            end_date: format(endDate, "yyyy-MM-dd")
          });
          console.log('🎁 [BONUS API] getBonusDeductions - Response:', bonusResponse.data);

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

              console.log(`🎁 [DEBUG] Farmer ${farmer.farmer_id} Bonus Calc:`, {
                quantity: farmer.quantity,
                bonusRate: parseFloat(bonusEntry.bonus_deduction || 0),
                shouldApply: shouldApplyBonusFixed,
                effectiveFrom: bonusEntry.effective_from,
                periodEndDate: periodEndDate?.toISOString()
              });

              if (shouldApplyBonusFixed) {
                farmer.bonusRate = parseFloat(bonusEntry.bonus_deduction || 0);
                farmer.bonusAmount = farmer.quantity * farmer.bonusRate;
                farmer.fixedAmount = parseFloat(bonusEntry.fixed_deduction || 0);
                farmer.effectiveFrom = bonusEntry.effective_from;
                
                console.log(`  ✅ Applied: bonusAmount = ${farmer.quantity} * ${farmer.bonusRate} = ${farmer.bonusAmount}`);
              } else {
                farmer.bonusRate = 0;
                farmer.bonusAmount = 0;
                farmer.fixedAmount = 0;
                farmer.effectiveFrom = bonusEntry.effective_from;
                
                console.log(`  ❌ Not Applied: Date condition not met`);
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
          if (billDetail && billDetail.is_finalized === 1) {
            console.log(`✅ Farmer ${farmer.farmer_id} has finalized bill in bill details`);
            return true;
          }
          
          return false;
        });

        setIsBillFinalized(hasFinalized);
        console.log('🔒 Bills Finalized Status:', hasFinalized);

        processedData.forEach(farmer => {
          const billDetail = billDetailsMap.get(farmer.farmer_id);
          if (billDetail) {
            const advTotal = parseFloat(billDetail.advance_total || 0);
            const advRemaining = parseFloat(billDetail.advance_remaining || 0);
            const cfTotal = parseFloat(billDetail.cattlefeed_total || 0);
            const cfRemaining = parseFloat(billDetail.cattlefeed_remaining || 0);
            const o1Total = parseFloat(billDetail.other1_total || 0);
            const o1Remaining = parseFloat(billDetail.other1_remaining || 0);
            const o2Total = parseFloat(billDetail.other2_total || 0);
            const o2Remaining = parseFloat(billDetail.other2_remaining || 0);

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
        });
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
        let remainingBillAmount = farmer.billAmount;

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
      toast.error(error?.response?.data?.message || "Failed to fetch deductions");
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
        
        const maxAllowed = farmer.billAmount - otherDeductions;
        
        if (numValue > maxAllowed) {
          const correctedValue = Math.max(0, maxAllowed);
          toast.warning(`Value auto-corrected to ${correctedValue.toFixed(2)}. Total deductions cannot exceed bill amount.`);
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
      toast.success('Priority updated');
    } catch (error) {
      console.error('❌ [API ERROR] updatePriority:', error);
      toast.error('Failed to update priority');
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
      toast.success('Priority updated');
    } catch (error) {
      console.error('❌ [API ERROR] updatePriority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleClearAdvanceDeductions = () => {
    setFarmerData(prev => prev.map(farmer => ({
      ...farmer,
      advanceDeduction: 0
    })));
    toast.success('All advance deductions cleared');
  };

  const handleSave = async () => {
    if (!startDate || !endDate || !vlcName) {
      toast.error("Please select VLC and date range");
      return;
    }

    try {
      const modifiedFarmers = farmerData.filter(f => f.modified);
      
      if (modifiedFarmers.length === 0) {
        toast.info("No changes to save");
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const farmer of modifiedFarmers) {
        try {
          const bonusAmount = farmer.bonusRate || 0;
          const fixedAmount = farmer.fixedAmount || 0;
          const totalDeductions = bonusAmount + fixedAmount + farmer.advanceDeduction + farmer.cattleFeedDeduction + farmer.other1Deduction + farmer.other2Deduction;
          const netPayable = farmer.billAmount - totalDeductions;
          
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
              console.log('✅ [BONUS LOG] Created for farmer:', farmer.farmer_id);
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
        toast.success(`Successfully updated ${successCount} farmer bill(s)`);
        fetchDeductions();
      }
      if (errorCount > 0) {
        toast.error(`Failed to update ${errorCount} farmer bill(s)`);
      }
    } catch (error: any) {
      console.error('❌ [API ERROR] handleSave:', error);
      toast.error(error?.response?.data?.message || "Failed to update deductions");
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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between bg-white p-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Farmer Deduction
            </h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search farmers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Dialog open={priorityOpen} onOpenChange={setPriorityOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Priority
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>Set Deduction Priority</DialogTitle>
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
                            {item === 'cattleFeed' ? 'Cattle Feed' : 
                             item === 'bonus' ? 'Bonus' :
                             item === 'fixed' ? 'Fixed' :
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
          {/* Filters */}
          <hr className="text-gray-300 "/>
          <div className="flex items-center gap-2 mb-4 p-4 bg-white mt-0">
            <label className="text-sm font-medium text-gray-700">
              Select VLC
            </label>
            <Select value={vlcName} onValueChange={setVlcName}>
              <SelectTrigger className="w-32 bg-white border-gray-300">
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
          <div className="flex items-center justify-between mb-5 pl-4 pr-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Start Date:</label>
                <Input
                  type="date"
                  value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const newDateStr = e.target.value;
                    if (newDateStr) {
                      handleStartDateChange(new Date(newDateStr));
                    }
                  }}
                  className="border-gray-300"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">End Date:</label>
                <Input
                  type="date"
                  value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                  disabled
                  className="border-gray-300 bg-gray-100 cursor-not-allowed"
                />
              </div>
              
              <Button 
                onClick={fetchDeductions}
                className="bg-red-600 hover:bg-red-700 text-white px-8"
              >
                Fetch Data
              </Button>
            </div>

            {farmerData.length > 0 && (
              <div className={`px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap ${
                isBillFinalized 
                  ? 'bg-gray-200 text-gray-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {isBillFinalized ? '🔒 Bills Already Finalized' : '✅ Bills Not Finalized'}
              </div>
            )}
          </div>
        </div>

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
          <div className="flex justify-end gap-2 px-4 mb-4">
            <Dialog open={previousRemainingOpen} onOpenChange={setPreviousRemainingOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="px-6">
                  Previous Remaining
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Previous Remaining Balances</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer Name</TableHead>
                        <TableHead>Advance</TableHead>
                        <TableHead>Cattle Feed</TableHead>
                        <TableHead>Other1</TableHead>
                        <TableHead>Other2</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {farmerData.filter(f => f.previousRemaining > 0).map((farmer) => (
                        <TableRow key={farmer.farmer_id}>
                          <TableCell className="font-medium">{farmer.name}</TableCell>
                          <TableCell className="text-red-600">
                            {farmer.previousBillDetails?.advance > 0 ? `₹${farmer.previousBillDetails.advance.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {farmer.previousBillDetails?.cattleFeed > 0 ? `₹${farmer.previousBillDetails.cattleFeed.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {farmer.previousBillDetails?.other1 > 0 ? `₹${farmer.previousBillDetails.other1.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {farmer.previousBillDetails?.other2 > 0 ? `₹${farmer.previousBillDetails.other2.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">
                            ₹{farmer.previousRemaining.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {farmerData.filter(f => f.previousRemaining > 0).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500">
                            No previous remaining balances found
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
                className="px-6 text-red-600 border-red-600 hover:bg-red-50"
                disabled={isBillFinalized}
              >
                Clear Advance Deductions
              </Button>
            )}
            <Button 
              onClick={handleSave}
              className={isBillFinalized ? "bg-gray-400 cursor-not-allowed text-white px-8" : "bg-green-600 hover:bg-green-700 text-white px-8"}
              disabled={isBillFinalized}
            >
              {isBillFinalized ? 'Cannot Save - Bills Finalized' : 'Save Changes'}
            </Button>
          </div>
        )}

        {/* Farmer Table */}
        <Card className="bg-white shadow-sm border border-gray-200 mb-6 mt-0 pl-4 pr-4">
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
                        farmer.other2Deduction
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
    </div>
  );
};

export default FarmerDeduction;
