import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Loader2, Search, ChevronLeft, ChevronRight, Save, FileDown } from "lucide-react";
import { useAppSelector, RootState } from "@/redux/store";
import { useSelector } from "react-redux";
import { format, startOfMonth, endOfMonth, isWithinInterval, addDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { deductionApi } from "@/services/deductionApi";
import { api } from "@/services/config";
import { bankSummaryApi } from "@/services/bankSummaryApi";
import { paymentApi } from "@/services/paymentApi";
import { generateTemplateDetailedHorizontal, Template2Data, BankDetails, FarmerBillData } from "@/templates/FarmerBillInvoiceTemplate";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import PdfLoader from "@/components/PdfLoader";

const DynamicBillCycle = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const userId = useSelector((state: RootState) => state.authData?.userData?.id);
  const userPhone = useSelector((state: RootState) => state.authData?.userData?.phone);
  const hideRateAmount = userId === '7';
  
  // State definitions (must be at top)
  const [vlcId, setVlcId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [farmersData, setFarmersData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFarmerIndex, setSelectedFarmerIndex] = useState(0);
  const [billStatus, setBillStatus] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const today = new Date();
    setSelectedDate(today);
    const initialDates = calculateDateRange(format(today, 'yyyy-MM-dd'), 10);
    setStartDate(initialDates.from);
    setEndDate(initialDates.to);
  }, []);

  useEffect(() => {
    if (branches.length > 0 && !vlcId) {
      setVlcId(branches[0].branch_id.toString());
    }
  }, [branches, vlcId]);

  // Auto-fetch when VLC is selected (User selection as requested)
  useEffect(() => {
    if (vlcId && startDate) {
      handleShow();
    }
  }, [vlcId]);
  
  const calculateDateRange = (dateStr: string, cycle: number = 10) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    let startDay: number, endDay: number;
    
    if (cycle === 15) {
      if (day <= 15) {
        startDay = 1;
        endDay = 15;
      } else {
        startDay = 16;
        endDay = new Date(year, month + 1, 0).getDate();
      }
    } else if (cycle === 30) {
      startDay = 1;
      endDay = new Date(year, month + 1, 0).getDate();
    } else { // default 10
      if (day <= 10) {
        startDay = 1;
        endDay = 10;
      } else if (day <= 20) {
        startDay = 11;
        endDay = 20;
      } else {
        startDay = 21;
        endDay = new Date(year, month + 1, 0).getDate();
      }
    }
    
    return {
      from: startOfDay(new Date(year, month, startDay)),
      to: endOfDay(new Date(year, month, endDay))
    };
  };

  const handleDateChange = (dateString: string) => {
    if (dateString) {
      const date = new Date(dateString);
      setSelectedDate(date);
      const dates = calculateDateRange(dateString, 10);
      setStartDate(dates.from);
      setEndDate(dates.to);
    }
  };

  const handleCycleChange = (cycle: string) => {
    const current = filteredFarmers[selectedFarmerIndex];
    if (!current) return;
    const newCycle = parseInt(cycle);
    
    // Recalculate date range based on new cycle
    const dates = calculateDateRange(format(selectedDate, 'yyyy-MM-dd'), newCycle);
    setStartDate(dates.from);
    setEndDate(dates.to);
    
    setFarmersData(prev => prev.map(f => 
      f.farmer_id === current.farmer_id ? { ...f, bill_cycle: newCycle, modified: true } : f
    ));
  };

  const computeFarmerStats = (farmer: any) => {
    if (!farmer || !selectedDate) return null;
    
    const cycle = farmer.bill_cycle || 10;
    const range = calculateDateRange(format(selectedDate, 'yyyy-MM-dd'), cycle);
    const start = range.from;
    const end = range.to;
    
    // Filter daily records
    const records = (farmer.daily_records || []).filter((r: any) => {
      const d = new Date(r.date);
      return d >= start && d <= end;
    });
    
    // Aggregate data from relevant days
    let quantity = 0, milk_total = 0, received_total = 0;
    let advance_sum = 0, cf_sum = 0, o1_sum = 0, o2_sum = 0;
    let fat_sum = 0, snf_sum = 0, water_sum = 0, records_with_fat = 0;

    records.forEach((r: any) => {
      quantity += parseFloat(r.quantity) || 0;
      milk_total += parseFloat(r.milk_total) || 0;
      received_total += parseFloat(r.total_received) || 0;
      advance_sum += r.deductions?.advance || 0;
      cf_sum += r.deductions?.cattle_feed || 0;
      o1_sum += r.deductions?.other1 || 0;
      o2_sum += r.deductions?.other2 || 0;
      
      if (r.fat > 0) {
        fat_sum += (parseFloat(r.fat) || 0) * (parseFloat(r.quantity) || 0);
        snf_sum += (parseFloat(r.snf) || 0) * (parseFloat(r.quantity) || 0);
        water_sum += (parseFloat(r.water) || 0) * (parseFloat(r.quantity) || 0);
        records_with_fat += (parseFloat(r.quantity) || 0);
      }
    });

    const avg_fat = records_with_fat > 0 ? fat_sum / records_with_fat : 0;
    const avg_snf = records_with_fat > 0 ? snf_sum / records_with_fat : 0;
    const avg_water = records_with_fat > 0 ? water_sum / records_with_fat : 0;

    // Filter type specific entries (Cow/Buffalo) for the dynamic range
    const filteredTypeEntries = (farmer.type_records || []).filter((r: any) => {
      const d = new Date(r.created_at || r.date);
      return d >= start && d <= end;
    });

    const aggregateType = (recs: any[]) => {
      if (recs.length === 0) return null;
      let total_quantity = 0, fat_sum_t = 0, snf_sum_t = 0, water_sum_t = 0, amt_sum_t = 0;
      recs.forEach(r => {
        const qty = parseFloat(r.total_quantity || r.quantity) || 0;
        total_quantity += qty;
        fat_sum_t += (parseFloat(r.avg_fat || r.fat) || 0) * qty;
        snf_sum_t += (parseFloat(r.avg_snf || r.snf) || 0) * qty;
        water_sum_t += (parseFloat(r.avg_water || r.water) || 0) * qty;
        amt_sum_t += parseFloat(r.avg_amount || r.amount) || 0;
      });
      return {
        total_quantity,
        avg_fat: total_quantity > 0 ? fat_sum_t / total_quantity : 0,
        avg_snf: total_quantity > 0 ? snf_sum_t / total_quantity : 0,
        avg_water: total_quantity > 0 ? water_sum_t / total_quantity : 0,
        avg_amount: amt_sum_t
      };
    };

    const cow_data = aggregateType(filteredTypeEntries.filter(r => r.type?.toLowerCase() === 'cow'));
    const buffalo_data = aggregateType(filteredTypeEntries.filter(r => r.type?.toLowerCase() === 'buffalo'));

    // Use monthly remaining from bill_details
    const bd = farmer.bill_details || {};
    
    return {
      ...farmer,
      quantity,
      milk_total,
      received_total,
      advance: (parseFloat(bd.advance_total) || 0) + (parseFloat(bd.advance_remaining) || 0),
      advance_remaining: parseFloat(bd.advance_remaining) || 0,
      cattleFeedAmount: (parseFloat(bd.cattlefeed_total) || 0) + (parseFloat(bd.cattlefeed_remaining) || 0),
      cattlefeed_remaining: parseFloat(bd.cattlefeed_remaining) || 0,
      other1Amount: (parseFloat(bd.other1_total) || 0) + (parseFloat(bd.other1_remaining) || 0),
      other1_remaining: parseFloat(bd.other1_remaining) || 0,
      other2Amount: (parseFloat(bd.other2_total) || 0) + (parseFloat(bd.other2_remaining) || 0),
      other2_remaining: parseFloat(bd.other2_remaining) || 0,
      avg_fat,
      avg_snf,
      avg_water,
      cow_data,
      buffalo_data,
      hasBothTypes: !!(cow_data && buffalo_data),
      periodStart: start,
      periodEnd: end,
      records_count: records.length
    };
  };
  
  const handleShow = async () => {
    if (!vlcId) {
      toast.error(t("please_select_vlc"));
      return;
    }
    if (!startDate) {
      toast.error(t("please_select_date_range"));
      return;
    }

    setLoading(true);
    try {
      // Fetch for the entire month to enable dynamic cycle billing
      const monthStart = startOfMonth(startDate);
      const monthEnd = endOfMonth(startDate);

      const { data } = await deductionApi.getAllFarmersBalance(
        parseInt(vlcId),
        format(monthStart, "yyyy-MM-dd"),
        format(monthEnd, "yyyy-MM-dd")
      );

      console.log("getAllFarmersBalance response for full month:", data);

      // Store separate collection data - grouped by farmer and type
      let typeSpecificEntries = new Map<string, any[]>();
      
      try {
        const collectionResponse = await api.get('/collections/by-dairy-date-range', {
          params: {
            dairy_id: vlcId,
            start_date: format(monthStart, "yyyy-MM-dd"),
            end_date: format(monthEnd, "yyyy-MM-dd")
          }
        });
        
        (collectionResponse.data.data || []).forEach((item: any) => {
          const farmerId = item.farmer_id;
          if (!typeSpecificEntries.has(farmerId)) typeSpecificEntries.set(farmerId, []);
          typeSpecificEntries.get(farmerId)!.push(item);
        });
      } catch (error) {
        console.error('Failed to fetch collection data:', error);
      }

      // Initialize farmer map with daily entries
      const farmerMap = new Map();
      
      (data.data || []).forEach((dateEntry: any) => {
        const entryDate = dateEntry.date;
        dateEntry.farmers.forEach((farmer: any) => {
          const farmerId = farmer.farmer_id;
          if (!farmerMap.has(farmerId)) {
            farmerMap.set(farmerId, {
              farmer_id: farmerId,
              name: farmer.farmer_name || `Farmer ${farmerId}`,
              daily_records: [],
              type_records: typeSpecificEntries.get(farmerId) || [],
              bill_cycle: 10, // Initial default cycle
              paymentAdvance: "",
              paymentCattleFeed: "",
              paymentOther1: "",
              paymentOther2: "",
              advanceDeduction: 0,
              cattleFeedDeduction: 0,
              other1Deduction: 0,
              other2Deduction: 0
            });
          }
          
          const record = farmerMap.get(farmerId);
          record.daily_records.push({
            ...farmer,
            date: entryDate
          });
        });
      });
      
      const processedData = Array.from(farmerMap.values());

      // Fetch initial bill details for all farmers
      if (processedData.length > 0) {
        const farmerIds = processedData.map(f => f.farmer_id);
        const billDetailsResponse = await deductionApi.getBillDetailsByFarmers(
          parseInt(vlcId),
          farmerIds,
          format(monthStart, "yyyy-MM-dd"),
          format(monthEnd, "yyyy-MM-dd")
        );

        const billDetailsMap = new Map(
          (billDetailsResponse.data.data || []).map((detail: any) => [detail.farmer_id, detail])
        );

        // Track bill generation status
        const statusMap: {[key: string]: boolean} = {};
        
        processedData.forEach(farmer => {
          const billDetail = billDetailsMap.get(farmer.farmer_id);
          farmer.bill_details = billDetail || null;
          // Check if bill is already generated (has is_finalized = 1 or status = 'finalized')
          statusMap[farmer.farmer_id] = !!(billDetail && (billDetail.is_finalized === 1 || billDetail.status === 'finalized'));
        });
        
        setBillStatus(statusMap);
      }

      setFarmersData(processedData);
      setSelectedFarmerIndex(0);
      setSearchTerm("");
      toast.success("Data loaded for the selected month");
    } catch (error: any) {
      console.error("API Error:", error);
      toast.error(error?.response?.data?.message || t("failed_to_fetch_collections"));
    } finally {
      setLoading(false);
    }
  };

  const filteredFarmers = useMemo(() => {
    return farmersData.filter(farmer =>
      farmer.farmer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [farmersData, searchTerm]);

  const currentFarmerRaw = filteredFarmers[selectedFarmerIndex];
  
  const currentFarmer: any = useMemo(() => {
    return computeFarmerStats(currentFarmerRaw);
  }, [currentFarmerRaw, selectedDate, farmersData]);

  const handlePaymentSubmit = async (paymentType: "Advance" | "Cattle Feed" | "Other1" | "Other2", amount: string) => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (!startDate || !vlcId) return;

    const currentFarmer = filteredFarmers[selectedFarmerIndex];
    if (!currentFarmer) return;

    try {
      const selectedBranch = branches.find(b => b.branch_id.toString() === vlcId);
      await paymentApi.create({
        date: format(startDate, "yyyy-MM-dd"),
        dairy_id: selectedBranch?.dairy_id || vlcId,
        farmer_id: currentFarmer.farmer_id,
        farmer_name: currentFarmer.name,
        payment_type: paymentType,
        amount_taken: parseFloat(amount),
        received: 0
      });
      toast.success(`${paymentType} payment recorded`);
      
      // Update local state immediately
      const paymentAmount = parseFloat(amount);
      setFarmersData(prev => prev.map((farmer) => {
        if (farmer.farmer_id === currentFarmer.farmer_id) {
          const updated = { ...farmer };
          if (paymentType === "Advance") {
            updated.advance = (farmer.advance || 0) + paymentAmount;
            updated.paymentAdvance = "";
          } else if (paymentType === "Cattle Feed") {
            updated.cattleFeedAmount = (farmer.cattleFeedAmount || 0) + paymentAmount;
            updated.paymentCattleFeed = "";
          } else if (paymentType === "Other1") {
            updated.other1Amount = (farmer.other1Amount || 0) + paymentAmount;
            updated.paymentOther1 = "";
          } else if (paymentType === "Other2") {
            updated.other2Amount = (farmer.other2Amount || 0) + paymentAmount;
            updated.paymentOther2 = "";
          }
          return updated;
        }
        return farmer;
      }));
    } catch (error) {
      toast.error(`Failed to record ${paymentType} payment`);
    }
  };

  const refreshCurrentFarmer = async () => {
    if (!startDate || !endDate || !vlcId) return;
    
    const currentFarmer = filteredFarmers[selectedFarmerIndex];
    if (!currentFarmer) return;

    try {
      const billDetailsResponse = await deductionApi.getBillDetailsByFarmers(
        parseInt(vlcId),
        [currentFarmer.farmer_id],
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );

      console.log('Refresh Bill Details Response:', billDetailsResponse.data);

      const billDetail = billDetailsResponse.data.data?.[0];
      if (billDetail) {
        const advTotal = parseFloat(billDetail.advance_total || 0);
        const advRemaining = parseFloat(billDetail.advance_remaining || 0);
        const cfTotal = parseFloat(billDetail.cattlefeed_total || 0);
        const cfRemaining = parseFloat(billDetail.cattlefeed_remaining || 0);
        const o1Total = parseFloat(billDetail.other1_total || 0);
        const o1Remaining = parseFloat(billDetail.other1_remaining || 0);
        const o2Total = parseFloat(billDetail.other2_total || 0);
        const o2Remaining = parseFloat(billDetail.other2_remaining || 0);

        console.log('Parsed values:', {
          advance: advTotal + advRemaining,
          cattleFeed: cfTotal + cfRemaining,
          other1: o1Total + o1Remaining,
          other2: o2Total + o2Remaining
        });

        setFarmersData(prev => prev.map((farmer) => 
          farmer.farmer_id === currentFarmer.farmer_id
            ? {
                ...farmer,
                advance: advTotal + advRemaining,
                advance_remaining: advRemaining,
                advanceDeduction: farmer.advanceDeduction || 0,
                cattleFeedAmount: cfTotal + cfRemaining,
                cattlefeed_remaining: cfRemaining,
                cattleFeedDeduction: farmer.cattleFeedDeduction || 0,
                other1Amount: o1Total + o1Remaining,
                other1_remaining: o1Remaining,
                other1Deduction: farmer.other1Deduction || 0,
                other2Amount: o2Total + o2Remaining,
                other2_remaining: o2Remaining,
                other2Deduction: farmer.other2Deduction || 0
              }
            : farmer
        ));
      } else {
        console.log('No bill detail found in response');
      }
    } catch (error) {
      console.error("Failed to refresh farmer data", error);
    }
  };

  const handleDeductionChange = (field: string, value: string) => {
    const currentFarmer = filteredFarmers[selectedFarmerIndex];
    if (!currentFarmer) return;

    let numValue = field.startsWith('payment') ? value : (parseFloat(value) || 0);
    
    // Validate deduction fields don't exceed available amounts
    if (field === 'advanceDeduction' && typeof numValue === 'number') {
      const maxValue = currentFarmer.advance;
      if (numValue > maxValue) {
        toast.warning(`Advance deduction cannot exceed ₹${maxValue.toFixed(2)}`);
        numValue = maxValue;
      }
    } else if (field === 'cattleFeedDeduction' && typeof numValue === 'number') {
      const maxValue = currentFarmer.cattleFeedAmount;
      if (numValue > maxValue) {
        toast.warning(`Cattle Feed deduction cannot exceed ₹${maxValue.toFixed(2)}`);
        numValue = maxValue;
      }
    } else if (field === 'other1Deduction' && typeof numValue === 'number') {
      const maxValue = currentFarmer.other1Amount;
      if (numValue > maxValue) {
        toast.warning(`Other 1 deduction cannot exceed ₹${maxValue.toFixed(2)}`);
        numValue = maxValue;
      }
    } else if (field === 'other2Deduction' && typeof numValue === 'number') {
      const maxValue = currentFarmer.other2Amount;
      if (numValue > maxValue) {
        toast.warning(`Other 2 deduction cannot exceed ₹${maxValue.toFixed(2)}`);
        numValue = maxValue;
      }
    }

    // Validate total deductions don't exceed net payable
    if (typeof numValue === 'number' && field.includes('Deduction')) {
      const tempFarmer = { ...currentFarmer, [field]: numValue };
      const totalDeductions = tempFarmer.advanceDeduction + tempFarmer.cattleFeedDeduction + tempFarmer.other1Deduction + tempFarmer.other2Deduction;
      const maxAllowed = tempFarmer.milk_total + tempFarmer.received_total;
      
      if (totalDeductions > maxAllowed) {
        const currentDeductions = currentFarmer.advanceDeduction + currentFarmer.cattleFeedDeduction + currentFarmer.other1Deduction + currentFarmer.other2Deduction;
        const fieldCurrentValue = currentFarmer[field] || 0;
        const cappedValue = Math.max(0, maxAllowed - (currentDeductions - fieldCurrentValue));
        toast.error(`Total deductions cannot exceed Net Payable (₹${maxAllowed.toFixed(2)}). Value capped to ₹${cappedValue.toFixed(2)}`);
        numValue = cappedValue;
      }
    }

    setFarmersData(prev => prev.map((farmer) => 
      farmer.farmer_id === currentFarmer.farmer_id
        ? { ...farmer, [field]: numValue, modified: true }
        : farmer
    ));
  };

  const handleRateChange = (value: string) => {
    const currentFarmer = filteredFarmers[selectedFarmerIndex];
    if (!currentFarmer) return;
    
    const rate = value === '' ? '' : (parseFloat(value) || 0);
    setFarmersData(prev => prev.map((farmer) => {
      if (farmer.farmer_id === currentFarmer.farmer_id) {
        const numRate = typeof rate === 'number' ? rate : 0;
        const newMilkTotal = farmer.quantity * numRate;
        return { 
          ...farmer, 
          rate: rate,
          milk_total: newMilkTotal,
          modified: true 
        };
      }
      return farmer;
    }));
  };

  // Handle type-specific rate change (for Cow or Buffalo)
  const handleTypeRateChange = (type: 'cow' | 'buffalo', value: string) => {
    const currentFarmer = filteredFarmers[selectedFarmerIndex];
    if (!currentFarmer) return;
    
    setFarmersData(prev => prev.map((farmer) => {
      if (farmer.farmer_id === currentFarmer.farmer_id) {
        const typeKey = type === 'cow' ? 'cow_data' : 'buffalo_data';
        const parsedRate = value === '' ? 0 : parseFloat(value);
        
        // Update the specific type data with new rate, preserving the value as entered
        const updatedTypeData = farmer[typeKey] ? { ...farmer[typeKey], avg_rate: value } : null;
        
        // Recalculate milk_total based on both types using parsed numeric values
        const cowQty = farmer.cow_data?.total_quantity || 0;
        const cowRate = type === 'cow' ? parsedRate : (parseFloat(String(farmer.cow_data?.avg_rate || 0)) || 0);
        const buffaloQty = farmer.buffalo_data?.total_quantity || 0;
        const buffaloRate = type === 'buffalo' ? parsedRate : (parseFloat(String(farmer.buffalo_data?.avg_rate || 0)) || 0);
        
        const newMilkTotal = (cowQty * cowRate) + (buffaloQty * buffaloRate);
        
        return { 
          ...farmer,
          [typeKey]: updatedTypeData,
          milk_total: newMilkTotal,
          modified: true 
        };
      }
      return farmer;
    }));
  };

  const updateRates = async () => {
    const currentFarmer = farmersData[selectedFarmerIndex];
    if (!currentFarmer) return;

    const collections = [];
    
    // Handle multi-type farmers (cow and buffalo)
    if (currentFarmer.cow_data?.collection_ids) {
      const ids = currentFarmer.cow_data.collection_ids.split(',').map((id: string) => parseInt(id.trim()));
      const rate = parseFloat(String(currentFarmer.cow_data.avg_rate || 0)) || 0;
      collections.push({ ids, rate });
    }
    
    if (currentFarmer.buffalo_data?.collection_ids) {
      const ids = currentFarmer.buffalo_data.collection_ids.split(',').map((id: string) => parseInt(id.trim()));
      const rate = parseFloat(String(currentFarmer.buffalo_data.avg_rate || 0)) || 0;
      collections.push({ ids, rate });
    }
    
    // Handle single-type farmers
    if (!currentFarmer.hasBothTypes && currentFarmer.collection_ids) {
      const ids = currentFarmer.collection_ids.split(',').map((id: string) => parseInt(id.trim()));
      const rate = parseFloat(String(currentFarmer.rate || 0)) || 0;
      collections.push({ ids, rate });
    }
    
    if (collections.length > 0) {
      await api.put('/collections/update-rates', { collections });
      toast.success('Rates updated successfully');
    }
  };

  const handleSave = async () => {
    if (!startDate || !endDate || !vlcId) {
      toast.error("Please select VLC and date range");
      return;
    }

    const currentFarmer = filteredFarmers[selectedFarmerIndex];
    if (!currentFarmer) {
      toast.error("No farmer selected");
      return;
    }

    // Check if bill is already generated
    if (billStatus[currentFarmer.farmer_id]) {
      toast.info(`Bill already generated for farmer ${currentFarmer.farmer_id}`);
      return;
    }

    setSaving(true);
    try {
      // Create payments if any payment fields have values
      const paymentPromises = [];
      const dateStr = format(startDate, "yyyy-MM-dd");
      const selectedBranch = branches.find(b => b.branch_id.toString() === vlcId);
      
      if (currentFarmer.paymentAdvance && parseFloat(currentFarmer.paymentAdvance) > 0) {
        paymentPromises.push(
          paymentApi.create({
            date: dateStr,
            dairy_id: selectedBranch?.dairy_id || vlcId,
            farmer_id: currentFarmer.farmer_id,
            farmer_name: currentFarmer.name,
            payment_type: "Advance",
            amount_taken: parseFloat(currentFarmer.paymentAdvance),
            received: 0
          })
        );
      }
      
      if (currentFarmer.paymentCattleFeed && parseFloat(currentFarmer.paymentCattleFeed) > 0) {
        paymentPromises.push(
          paymentApi.create({
            date: dateStr,
            dairy_id: selectedBranch?.dairy_id || vlcId,
            farmer_id: currentFarmer.farmer_id,
            farmer_name: currentFarmer.name,
            payment_type: "Cattle Feed",
            amount_taken: parseFloat(currentFarmer.paymentCattleFeed),
            received: 0
          })
        );
      }
      
      if (currentFarmer.paymentOther1 && parseFloat(currentFarmer.paymentOther1) > 0) {
        paymentPromises.push(
          paymentApi.create({
            date: dateStr,
            dairy_id: selectedBranch?.dairy_id || vlcId,
            farmer_id: currentFarmer.farmer_id,
            farmer_name: currentFarmer.name,
            payment_type: "Other1",
            amount_taken: parseFloat(currentFarmer.paymentOther1),
            received: 0
          })
        );
      }
      
      if (currentFarmer.paymentOther2 && parseFloat(currentFarmer.paymentOther2) > 0) {
        paymentPromises.push(
          paymentApi.create({
            date: dateStr,
            dairy_id: selectedBranch?.dairy_id || vlcId,
            farmer_id: currentFarmer.farmer_id,
            farmer_name: currentFarmer.name,
            payment_type: "Other2",
            amount_taken: parseFloat(currentFarmer.paymentOther2),
            received: 0
          })
        );
      }
      
      // Execute all payment creations
      if (paymentPromises.length > 0) {
        await Promise.all(paymentPromises);
      }

      // First, update rates if farmer has Cow/Buffalo types with collection IDs
      if (currentFarmer.hasBothTypes || currentFarmer.cow_data || currentFarmer.buffalo_data) {
        const collections = [];
        
        if (currentFarmer.cow_data && currentFarmer.cow_data.collection_ids) {
          const ids = currentFarmer.cow_data.collection_ids.split(',').map((id: string) => parseInt(id.trim()));
          const rate = parseFloat(String(currentFarmer.cow_data.avg_rate || 0)) || 0;
          collections.push({ ids, rate });
        }
        
        if (currentFarmer.buffalo_data && currentFarmer.buffalo_data.collection_ids) {
          const ids = currentFarmer.buffalo_data.collection_ids.split(',').map((id: string) => parseInt(id.trim()));
          const rate = parseFloat(String(currentFarmer.buffalo_data.avg_rate || 0)) || 0;
          collections.push({ ids, rate });
        }
        
        if (collections.length > 0) {
          try {
            await api.put('/collections/update-rates', { collections });
            console.log('Rates updated successfully for collection IDs');
          } catch (error) {
            console.error('Failed to update rates:', error);
            toast.error('Failed to update rates');
            setSaving(false);
            return;
          }
        }
      }

      // Then update the farmer bill
      const billData = {
        farmer_id: currentFarmer.farmer_id,
        dairy_id: parseInt(vlcId),
        period_start: format(startDate, "yyyy-MM-dd"),
        period_end: format(endDate, "yyyy-MM-dd"),
        milk_total: currentFarmer.milk_total,
        advance_total: currentFarmer.advanceDeduction,
        cattlefeed_total: currentFarmer.cattleFeedDeduction,
        other1_total: currentFarmer.other1Deduction,
        other2_total: currentFarmer.other2Deduction,
        received_total: currentFarmer.received_total,
        net_payable: currentFarmer.milk_total - (currentFarmer.advanceDeduction + currentFarmer.cattleFeedDeduction + currentFarmer.other1Deduction + currentFarmer.other2Deduction),
        advance_remaining: currentFarmer.advance - currentFarmer.advanceDeduction,
        cattlefeed_remaining: currentFarmer.cattleFeedAmount - currentFarmer.cattleFeedDeduction,
        other1_remaining: currentFarmer.other1Amount - currentFarmer.other1Deduction,
        other2_remaining: currentFarmer.other2Amount - currentFarmer.other2Deduction
      };

      await deductionApi.updateFarmerBillWeb(billData);
      
      // Update bill status to generated
      setBillStatus(prev => ({
        ...prev,
        [currentFarmer.farmer_id]: true
      }));
      
      // Update local state to mark as saved and clear payment fields
      // Preserve cow_data and buffalo_data with their collection_ids and rates
      setFarmersData(prev => prev.map((farmer) => 
        farmer.farmer_id === currentFarmer.farmer_id
          ? { 
              ...farmer,
              cow_data: farmer.cow_data ? { ...farmer.cow_data } : null,
              buffalo_data: farmer.buffalo_data ? { ...farmer.buffalo_data } : null,
              modified: false,
              paymentAdvance: "",
              paymentCattleFeed: "",
              paymentOther1: "",
              paymentOther2: ""
            }
          : farmer
      ));
      
      toast.success("Farmer bill updated successfully");
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(error?.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };


  const goToPrevious = () => {
    if (selectedFarmerIndex > 0) {
      setSelectedFarmerIndex(selectedFarmerIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedFarmerIndex < filteredFarmers.length - 1) {
      setSelectedFarmerIndex(selectedFarmerIndex + 1);
    }
  };

  const selectFarmerFromSearch = (farmerId: string) => {
    const index = farmersData.findIndex(f => f.farmer_id === farmerId);
    if (index !== -1) {
      setSelectedFarmerIndex(index);
      setSearchTerm(""); // Clear search term to hide results dropdown
    }
  };

  const calculateNetPayable = (farmer: any) => {
    if (!farmer) return 0;
    const milk = parseFloat(farmer.milk_total) || 0;
    const adv = parseFloat(farmer.advanceDeduction) || 0;
    const cf = parseFloat(farmer.cattleFeedDeduction) || 0;
    const o1 = parseFloat(farmer.other1Deduction) || 0;
    const o2 = parseFloat(farmer.other2Deduction) || 0;
    const rec = parseFloat(farmer.received_total) || 0;
    return milk - adv - cf - o1 - o2 + rec;
  };

  const exportToPDF = async () => {
    if (!vlcId || !startDate || !endDate) {
      toast.error("Please select VLC and date range first");
      return;
    }

    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(b => b.branch_id.toString() === vlcId);
      const vlcName = selectedBranch?.name || 'VLC Center';
      const dairyName = selectedBranch?.name || selectedBranch?.username || 'Dairy';
      const fromDateApi = format(startDate, 'yyyy-MM-dd');
      const toDateApi = format(endDate, 'yyyy-MM-dd');
      const fromDateDisplay = format(startDate, 'dd MMM yyyy');
      const toDateDisplay = format(endDate, 'dd MMM yyyy');

      // Fetch collection data from the same API as FarmerBillInvoiceReport
      const apiUrl = '/report/shift-collection-report';
      const params = {
        dairyid: selectedBranch?.branch_id,
        startDate: fromDateApi,
        startShift: 'Morning',
        endDate: toDateApi,
        endShift: 'Evening',
        milkType: 'All'
      };

      const collectionResponse = await api.get(apiUrl, { params });
      const collectionData = collectionResponse.data.report || [];
      const farmerBills = collectionResponse.data.farmerwise_bills || [];
      const farmerPayments = collectionResponse.data.farmer_payments || [];

      if (collectionData.length === 0) {
        toast.error("No collection data found for the selected period");
        setPdfLoading(false);
        return;
      }

      // Remove separate payment fetching - use API response
      // Fetch bank details
      let bankDetailsMap = new Map<string, BankDetails>();
      try {
        const bankResponse = await bankSummaryApi.getBankSummary({
          dairy_id: vlcId,
          start_date: fromDateApi,
          end_date: toDateApi
        });
        
        (bankResponse.data || []).forEach((farmer: any) => {
          bankDetailsMap.set(farmer.farmer_id, {
            accountNumber: farmer.accountNumber,
            ifscCode: farmer.ifscCode,
            bankName: farmer.bankName,
            branchName: farmer.branchName
          });
        });
      } catch (error) {
        console.error('Failed to fetch bank details:', error);
      }

      // Group by farmer
      const grouped: { [key: string]: any[] } = {};
      collectionData.forEach((item: any) => {
        if (!grouped[item.farmer_id]) grouped[item.farmer_id] = [];
        grouped[item.farmer_id].push(item);
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const farmerIds = Object.keys(grouped);

      for (let i = 0; i < farmerIds.length; i++) {
        const farmerId = farmerIds[i];
        const farmerData = grouped[farmerId];
        const farmerName = farmerData[0].farmer_name;
        
        const farmerPaymentsFiltered = farmerPayments.filter((p: any) => p.farmer_id === farmerId);
        
        const templateData: FarmerBillData[] = farmerData.map((item: any) => ({
          date: item.date,
          shift: item.shift,
          type: item.type,
          liters: parseFloat(item.liters),
          fat: parseFloat(item.fat),
          snf: parseFloat(item.snf),
          clr: parseFloat(item.clr),
          water: item.water ? parseFloat(item.water) : null,
          rate: parseFloat(item.rate),
          amount: parseFloat(item.amount),
          farmer_id: item.farmer_id,
          farmer_name: item.farmer_name
        }));

        const htmlContent = generateTemplateDetailedHorizontal({
          dairyName: dairyName,
          branchName: vlcName,
          dairyPhone: userPhone,
          farmerCode: farmerId,
          farmerName: farmerName,
          fromDate: fromDateDisplay,
          toDate: toDateDisplay,
          milkType: 'All',
          data: templateData,
          current_bill: farmerBills.find((b: any) => b.farmer_id === farmerId),
          payments: farmerPaymentsFiltered,
          bankDetails: bankDetailsMap.get(farmerId),
          hideRateAmount: hideRateAmount
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '210mm';
        document.body.appendChild(tempDiv);

        try {
          // Check if both milk types exist by looking for page-break elements
          const pageBreaks = tempDiv.querySelectorAll('.page-break');
          
          if (pageBreaks.length > 0) {
            // Multi-page: capture each section separately
            const bodyElement = tempDiv.querySelector('body');
            if (!bodyElement) throw new Error('Body element not found');
            
            const sections = [];
            let currentSection = document.createElement('div');
            currentSection.style.width = '210mm';
            
            Array.from(bodyElement.children).forEach((child: any) => {
              if (child.classList && child.classList.contains('page-break')) {
                sections.push(currentSection);
                currentSection = document.createElement('div');
                currentSection.style.width = '210mm';
              } else {
                currentSection.appendChild(child.cloneNode(true));
              }
            });
            sections.push(currentSection);
            
            for (let s = 0; s < sections.length; s++) {
              const sectionDiv = document.createElement('div');
              sectionDiv.style.position = 'absolute';
              sectionDiv.style.left = '-9999px';
              sectionDiv.style.width = '210mm';
              sectionDiv.innerHTML = `<html><head>${tempDiv.querySelector('head')?.innerHTML || ''}</head><body></body></html>`;
              sectionDiv.querySelector('body')?.appendChild(sections[s]);
              document.body.appendChild(sectionDiv);
              
              const canvas = await html2canvas(sectionDiv, { 
                scale: 1.5,
                useCORS: true,
                logging: false,
                windowWidth: 794
              });
              const imgData = canvas.toDataURL('image/png');
              const imgWidth = 210;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              
              if (i > 0 || s > 0) pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
              
              document.body.removeChild(sectionDiv);
            }
          } else {
            // Single page
            const canvas = await html2canvas(tempDiv, { 
              scale: 1.5,
              useCORS: true,
              logging: false,
              windowWidth: 794
            });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          }
        } finally {
          document.body.removeChild(tempDiv);
        }
      }

      pdf.save(`Farmer_Bill_${fromDateApi}_to_${toDateApi}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('PDF Error:', error);
      toast.error(error?.response?.data?.message || 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // Export PDF for single farmer (currently displayed)
  const exportSingleFarmerPDF = async () => {
    if (!vlcId || !startDate || !endDate || !currentFarmer) {
      toast.error("Please select VLC, date range and ensure farmer is loaded");
      return;
    }

    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(b => b.branch_id.toString() === vlcId);
      const vlcName = selectedBranch?.name || 'VLC Center';
      const dairyName = selectedBranch?.name || selectedBranch?.username || 'Dairy';
      const fromDateApi = format(currentFarmer.periodStart, 'yyyy-MM-dd');
      const toDateApi = format(currentFarmer.periodEnd, 'yyyy-MM-dd');
      const fromDateDisplay = format(currentFarmer.periodStart, 'dd MMM yyyy');
      const toDateDisplay = format(currentFarmer.periodEnd, 'dd MMM yyyy');

      console.log('PDF Export - Request params:', {
        dairyid: selectedBranch?.branch_id,
        startDate: fromDateApi,
        startShift: 'Morning',
        endDate: toDateApi,
        endShift: 'Evening',
        milkType: 'All'
      });

      // Fetch collection data from the same API as FarmerBillInvoiceReport
      const apiUrl = '/report/shift-collection-report';
      const params = {
        dairyid: selectedBranch?.branch_id,
        startDate: fromDateApi,
        startShift: 'Morning',
        endDate: toDateApi,
        endShift: 'Evening',
        milkType: 'All'
      };

      const collectionResponse = await api.get(apiUrl, { params });
      const allCollectionData = collectionResponse.data.report || [];
      const farmerBills = collectionResponse.data.farmerwise_bills || [];
      const allFarmerPayments = collectionResponse.data.farmer_payments || [];

      console.log('PDF Export - Farmer Bills:', farmerBills);

      // Filter to only current farmer's data
      const farmerId = currentFarmer.farmer_id;
      const farmerData = allCollectionData.filter((item: any) => item.farmer_id === farmerId);

      console.log('PDF Export - Filtered Farmer Data:', farmerData);

      if (farmerData.length === 0) {
        toast.error("No collection data found for this farmer");
        setPdfLoading(false);
        return;
      }

      const farmerPaymentsFiltered = allFarmerPayments.filter((p: any) => p.farmer_id === farmerId);

      // Fetch bank details for this farmer
      let bankDetails: BankDetails | undefined;
      try {
        const bankResponse = await bankSummaryApi.getBankSummary({
          dairy_id: vlcId,
          start_date: fromDateApi,
          end_date: toDateApi
        });
        
        console.log('PDF Export - Bank Response:', bankResponse.data);
        
        const farmerBankData = (bankResponse.data || []).find((f: any) => f.farmer_id === farmerId);
        if (farmerBankData) {
          bankDetails = {
            accountNumber: farmerBankData.accountNumber,
            ifscCode: farmerBankData.ifscCode,
            bankName: farmerBankData.bankName,
            branchName: farmerBankData.branchName
          };
        }
      } catch (error) {
        console.error('Failed to fetch bank details:', error);
      }

      const farmerName = farmerData[0].farmer_name;
      
      const templateData: FarmerBillData[] = farmerData.map((item: any) => ({
        date: item.date,
        shift: item.shift,
        type: item.type,
        liters: parseFloat(item.liters),
        fat: parseFloat(item.fat),
        snf: parseFloat(item.snf),
        clr: parseFloat(item.clr),
        water: item.water ? parseFloat(item.water) : null,
        rate: parseFloat(item.rate),
        amount: parseFloat(item.amount),
        farmer_id: item.farmer_id,
        farmer_name: item.farmer_name
      }));

      console.log('PDF Export - Template Data:', templateData);

      const htmlContent = generateTemplateDetailedHorizontal({
        dairyName: dairyName,
        branchName: vlcName,
        dairyPhone: userPhone,
        farmerCode: farmerId,
        farmerName: farmerName,
        fromDate: fromDateDisplay,
        toDate: toDateDisplay,
        milkType: 'All',
        data: templateData,
        current_bill: farmerBills.find((b: any) => b.farmer_id === farmerId),
        payments: farmerPaymentsFiltered,
        bankDetails: bankDetails,
        hideRateAmount: hideRateAmount
      });

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '210mm';
      document.body.appendChild(tempDiv);

      try {
        const pageBreaks = tempDiv.querySelectorAll('.page-break');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        if (pageBreaks.length > 0) {
          const sections = [];
          let currentSection = document.createElement('div');
          currentSection.style.width = '210mm';
          
          Array.from(tempDiv.children).forEach((child: any) => {
            if (child.classList && child.classList.contains('page-break')) {
              sections.push(currentSection);
              currentSection = document.createElement('div');
              currentSection.style.width = '210mm';
            } else {
              currentSection.appendChild(child.cloneNode(true));
            }
          });
          sections.push(currentSection);
          
          for (let s = 0; s < sections.length; s++) {
            const sectionDiv = document.createElement('div');
            sectionDiv.style.position = 'absolute';
            sectionDiv.style.left = '-9999px';
            sectionDiv.style.width = '210mm';
            sectionDiv.appendChild(sections[s]);
            document.body.appendChild(sectionDiv);
            
            const canvas = await html2canvas(sectionDiv, { 
              scale: 1.5,
              useCORS: true,
              logging: false,
              windowWidth: 794
            });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            if (s > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            
            document.body.removeChild(sectionDiv);
          }
        } else {
          const canvas = await html2canvas(tempDiv, { 
            scale: 1.5,
            useCORS: true,
            logging: false,
            windowWidth: 794
          });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        }
        
        pdf.save(`Farmer_Bill_${farmerId}_${fromDateApi}_to_${toDateApi}.pdf`);
        toast.success('PDF downloaded successfully');
      } finally {
        document.body.removeChild(tempDiv);
      }
    } catch (error: any) {
      console.error('PDF Error:', error);
      toast.error(error?.response?.data?.message || 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <PdfLoader isLoading={pdfLoading} />
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg border-none">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold">Dynamic Bill Cycle</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Filters */}
            <div className="space-y-4 mb-6">
              {/* Selector Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("vlc_id")}</label>
                  <Select value={vlcId} onValueChange={setVlcId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("select_vlc")} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {branches.map((branch) => (
                        <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                          {branch.username} - {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                  <Input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button 
                    onClick={handleShow} 
                    disabled={loading} 
                    className="flex-1 sm:w-32 bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Show"}
                  </Button>
                  <Button 
                    onClick={exportToPDF} 
                    disabled={pdfLoading || !vlcId} 
                    className="flex-1 sm:w-32 bg-red-600 hover:bg-red-700"
                  >
                    {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                    {t("export_pdf")}
                  </Button>
                </div>
              </div>
            </div>

            {/* Search and Navigation */}
            {farmersData.length > 0 && (
              <div className="mb-6">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedFarmerIndex(0);
                    }}
                    placeholder={t("search_by_farmer")}
                    className="pl-10"
                  />
                </div>
                
                {/* Farmer dropdown list when searching */}
                {searchTerm && filteredFarmers.length > 0 && (
                  <div className="mb-4 max-h-48 overflow-y-auto border rounded-lg bg-white shadow-sm">
                    {filteredFarmers.map((farmer) => (
                      <div
                        key={farmer.farmer_id}
                        onClick={() => selectFarmerFromSearch(farmer.farmer_id)}
                        className={`px-4 py-2 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 ${
                          currentFarmer?.farmer_id === farmer.farmer_id ? 'bg-blue-100' : ''
                        }`}
                      >
                        <span className="font-medium">{farmer.farmer_id}</span> - {farmer.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    onClick={goToPrevious}
                    disabled={selectedFarmerIndex === 0}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    {filteredFarmers.length > 0 
                      ? `${selectedFarmerIndex + 1} of ${filteredFarmers.length} farmers`
                      : 'No farmers found'
                    }
                  </span>
                  <Button
                    variant="outline"
                    onClick={goToNext}
                    disabled={selectedFarmerIndex >= filteredFarmers.length - 1}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Farmer Card */}
            {currentFarmer && (
              <Card className={`border-2 ${currentFarmer.modified ? 'border-yellow-400' : 'border-gray-200'} shadow-md`}>
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 py-3 px-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg text-gray-800">
                        {currentFarmer.farmer_id} - {currentFarmer.name}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
                          Period: {format(currentFarmer.periodStart, "dd MMM")} to {format(currentFarmer.periodEnd, "dd MMM yyyy")}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase text-gray-400 font-bold">Cycle:</span>
                          <Select 
                            value={currentFarmerRaw?.bill_cycle?.toString() || "10"} 
                            onValueChange={handleCycleChange}
                          >
                            <SelectTrigger className="h-6 w-24 text-[11px] font-medium border-gray-300">
                              <SelectValue placeholder="Cycle" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="10">10 Days</SelectItem>
                              <SelectItem value="15">15 Days</SelectItem>
                              <SelectItem value="30">1 Month</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {billStatus[currentFarmer.farmer_id] && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Bill Generated
                        </span>
                      )}
                      {currentFarmer.modified && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                          Modified
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Summary Row */}
                  <div className={`grid ${currentFarmer.hasBothTypes ? 'grid-cols-3' : 'grid-cols-4'} gap-2`}>
                    <div className="bg-blue-50 p-2 rounded-lg text-center">
                      <p className="text-xs text-gray-600">Quantity (L)</p>
                      <p className="text-lg font-bold text-blue-600">{currentFarmer.quantity?.toFixed(1) || "0.0"}</p>
                    </div>
                    {/* Only show Rate field if farmer has single type */}
                    {!currentFarmer.hasBothTypes && (
                      <div className="bg-orange-50 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-600">Rate (₹/L)</p>
                        <Input
                          type="number"
                          value={currentFarmer.rate === '' ? '' : (currentFarmer.rate || (currentFarmer.quantity > 0 ? (currentFarmer.milk_total / currentFarmer.quantity).toFixed(2) : ''))}
                          onChange={(e) => handleRateChange(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              try {
                                await updateRates();
                              } catch (error) {
                                toast.error('Failed to update rates');
                              }
                            }
                          }}
                          disabled={false}
                          readOnly={false}
                          className="h-7 text-center text-sm font-bold text-orange-600 bg-transparent border-orange-300"
                        />
                      </div>
                    )}
                    <div className="bg-green-50 p-2 rounded-lg text-center">
                      <p className="text-xs text-gray-600">Bill Amount</p>
                      <p className="text-lg font-bold text-green-600">₹{currentFarmer.milk_total?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-lg text-center">
                      <p className="text-xs text-gray-600">Received</p>
                      <p className="text-lg font-bold text-purple-600">₹{currentFarmer.received_total?.toFixed(2) || "0.00"}</p>
                    </div>
                  </div>

                  {/* Quality Metrics - Separate Cow/Buffalo if both exist */}
                  {currentFarmer.hasBothTypes ? (
                    <div className="space-y-2">
                      {/* Cow Stats */}
                      {currentFarmer.cow_data && (
                        <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                          <p className="text-xs font-semibold text-amber-800 mb-1">🐄 Cow</p>
                          <div className="grid grid-cols-5 gap-1 text-center">
                            <div>
                              <p className="text-xs text-gray-500">Qty</p>
                              <p className="text-sm font-bold text-amber-700">{currentFarmer.cow_data.total_quantity?.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">FAT%</p>
                              <p className="text-sm font-bold text-amber-700">{currentFarmer.cow_data.avg_fat?.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">SNF%</p>
                              <p className="text-sm font-bold text-amber-700">{currentFarmer.cow_data.avg_snf?.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Water%</p>
                              <p className="text-sm font-bold text-amber-700">{currentFarmer.cow_data.avg_water?.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Rate</p>
                              <Input
                                type="number"
                                step="any"
                                value={currentFarmer.cow_data.avg_rate || ''}
                                onChange={(e) => handleTypeRateChange('cow', e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    try {
                                      await updateRates();
                                    } catch (error) {
                                      toast.error('Failed to update rates');
                                    }
                                  }
                                }}
                                className="h-6 w-16 text-center text-xs font-bold text-amber-700 bg-white border-amber-300"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Buffalo Stats */}
                      {currentFarmer.buffalo_data && (
                        <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                          <p className="text-xs font-semibold text-indigo-800 mb-1">🐃 Buffalo</p>
                          <div className="grid grid-cols-5 gap-1 text-center">
                            <div>
                              <p className="text-xs text-gray-500">Qty</p>
                              <p className="text-sm font-bold text-indigo-700">{currentFarmer.buffalo_data.total_quantity?.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">FAT%</p>
                              <p className="text-sm font-bold text-indigo-700">{currentFarmer.buffalo_data.avg_fat?.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">SNF%</p>
                              <p className="text-sm font-bold text-indigo-700">{currentFarmer.buffalo_data.avg_snf?.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Water%</p>
                              <p className="text-sm font-bold text-indigo-700">{currentFarmer.buffalo_data.avg_water?.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Rate</p>
                              <Input
                                type="number"
                                step="any"
                                value={currentFarmer.buffalo_data.avg_rate || ''}
                                onChange={(e) => handleTypeRateChange('buffalo', e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    try {
                                      await updateRates();
                                    } catch (error) {
                                      toast.error('Failed to update rates');
                                    }
                                  }
                                }}
                                className="h-6 w-16 text-center text-xs font-bold text-indigo-700 bg-white border-indigo-300"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Single type - show combined averages */
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-yellow-50 p-2 rounded-lg text-center border border-yellow-200">
                        <p className="text-xs text-gray-600">Avg FAT %</p>
                        <p className="text-base font-bold text-yellow-700">{currentFarmer.avg_fat?.toFixed(1) || "0.0"}</p>
                      </div>
                      <div className="bg-cyan-50 p-2 rounded-lg text-center border border-cyan-200">
                        <p className="text-xs text-gray-600">Avg SNF %</p>
                        <p className="text-base font-bold text-cyan-700">{currentFarmer.avg_snf?.toFixed(1) || "0.0"}</p>
                      </div>
                      <div className="bg-teal-50 p-2 rounded-lg text-center border border-teal-200">
                        <p className="text-xs text-gray-600">Avg Water %</p>
                        <p className="text-base font-bold text-teal-700">{currentFarmer.avg_water?.toFixed(1) || "0.0"}</p>
                      </div>
                    </div>
                  )}

                  {/* Payment and Deduction Fields - Combined in 3 Columns */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-4 mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">Type / Amount</h3>
                      <h3 className="text-sm font-semibold text-gray-700">Payments</h3>
                      <h3 className="text-sm font-semibold text-gray-700">Deductions</h3>
                    </div>
                    
                    {/* Kirana Row */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                      <div>
                        <p className="text-xs font-medium text-gray-700">Kirana:</p>
                        <p className="text-sm font-bold text-gray-800">₹{currentFarmer.other1Amount?.toFixed(2) || "0.00"}</p>
                        {currentFarmer.other1_remaining > 0 && (
                          <p className="text-xs text-red-500">Rem: ₹{currentFarmer.other1_remaining?.toFixed(2)}</p>
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={currentFarmer.paymentOther1 || ""}
                        onChange={(e) => handleDeductionChange('paymentOther1', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handlePaymentSubmit('Other1', currentFarmer.paymentOther1);
                          }
                        }}
                        className="h-7 text-sm"
                      />
                      <div className="space-y-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={currentFarmer.other1Deduction || ""}
                          onChange={(e) => handleDeductionChange('other1Deduction', e.target.value)}
                          className="h-7 text-sm"
                        />
                        <p className="text-xs text-green-600">After: ₹{((currentFarmer.other1Amount || 0) - (currentFarmer.other1Deduction || 0)).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Cattle Feed Row */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                      <div>
                        <p className="text-xs font-medium text-gray-700">Cattle Feed:</p>
                        <p className="text-sm font-bold text-gray-800">₹{currentFarmer.cattleFeedAmount?.toFixed(2) || "0.00"}</p>
                        {currentFarmer.cattlefeed_remaining > 0 && (
                          <p className="text-xs text-red-500">Rem: ₹{currentFarmer.cattlefeed_remaining?.toFixed(2)}</p>
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={currentFarmer.paymentCattleFeed || ""}
                        onChange={(e) => handleDeductionChange('paymentCattleFeed', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handlePaymentSubmit('Cattle Feed', currentFarmer.paymentCattleFeed);
                          }
                        }}
                        className="h-7 text-sm"
                      />
                      <div className="space-y-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={currentFarmer.cattleFeedDeduction || ""}
                          onChange={(e) => handleDeductionChange('cattleFeedDeduction', e.target.value)}
                          className="h-7 text-sm"
                        />
                        <p className="text-xs text-green-600">After: ₹{((currentFarmer.cattleFeedAmount || 0) - (currentFarmer.cattleFeedDeduction || 0)).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Advance Row */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                      <div>
                        <p className="text-xs font-medium text-gray-700">Advance:</p>
                        <p className="text-sm font-bold text-gray-800">₹{currentFarmer.advance?.toFixed(2) || "0.00"}</p>
                        {currentFarmer.advance_remaining > 0 && (
                          <p className="text-xs text-red-500">Rem: ₹{currentFarmer.advance_remaining?.toFixed(2)}</p>
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={currentFarmer.paymentAdvance || ""}
                        onChange={(e) => handleDeductionChange('paymentAdvance', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handlePaymentSubmit('Advance', currentFarmer.paymentAdvance);
                          }
                        }}
                        className="h-7 text-sm"
                      />
                      <div className="space-y-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={currentFarmer.advanceDeduction || ""}
                          onChange={(e) => handleDeductionChange('advanceDeduction', e.target.value)}
                          className="h-7 text-sm"
                        />
                        <p className="text-xs text-green-600">After: ₹{((currentFarmer.advance || 0) - (currentFarmer.advanceDeduction || 0)).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Other2 Row */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                      <div>
                        <p className="text-xs font-medium text-gray-700">Other 2:</p>
                        <p className="text-sm font-bold text-gray-800">₹{currentFarmer.other2Amount?.toFixed(2) || "0.00"}</p>
                        {currentFarmer.other2_remaining > 0 && (
                          <p className="text-xs text-red-500">Rem: ₹{currentFarmer.other2_remaining?.toFixed(2)}</p>
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={currentFarmer.paymentOther2 || ""}
                        onChange={(e) => handleDeductionChange('paymentOther2', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handlePaymentSubmit('Other2', currentFarmer.paymentOther2);
                          }
                        }}
                        className="h-7 text-sm"
                      />
                      <div className="space-y-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={currentFarmer.other2Deduction || ""}
                          onChange={(e) => handleDeductionChange('other2Deduction', e.target.value)}
                          className="h-7 text-sm"
                        />
                        <p className="text-xs text-green-600">After: ₹{((currentFarmer.other2Amount || 0) - (currentFarmer.other2Deduction || 0)).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Net Payable */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-600">Net Payable</p>
                        <p className={`text-xl font-bold ${calculateNetPayable(currentFarmer) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{calculateNetPayable(currentFarmer).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSave} 
                          disabled={saving}
                          className={`px-4 py-2 h-9 text-white ${
                            billStatus[currentFarmer.farmer_id] 
                              ? 'bg-gray-500 hover:bg-gray-600' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          {billStatus[currentFarmer.farmer_id] ? 'Already Freezed' : 'Freeze'}
                        </Button>
                        <Button 
                          onClick={exportSingleFarmerPDF} 
                          disabled={pdfLoading}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 h-9"
                        >
                          {pdfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                          Export PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {farmersData.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No data to display</p>
                <p className="text-sm">Select VLC and date range, then click Show</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DynamicBillCycle;
