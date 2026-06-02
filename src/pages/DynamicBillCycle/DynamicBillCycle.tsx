import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Loader2, Search, ChevronLeft, ChevronRight, Save, FileDown } from "lucide-react";
import { useAppSelector } from "@/redux/store";
import { format, startOfMonth, endOfMonth, isWithinInterval, addDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { deductionApi } from "@/services/deductionApi";
import { api } from "@/services/config";
import { bankSummaryApi } from "@/services/bankSummaryApi";
import { paymentApi } from "@/services/paymentApi";
import { billApi } from "@/services/billApi";
import { bonusApi } from "@/services/bonusApi";
import { settingsApi } from "@/services/settingsApi";
import { generateTemplateDetailedHorizontal, Template2Data, BankDetails, FarmerBillData, FarmerReportData, generateTemplate3Farmers } from "@/templates/FarmerBillInvoiceTemplate";
import { generateFarmer2PerPage } from '@/templates/FarmerBill2PerPageTemplate';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import PdfLoader from "@/components/PdfLoader";
import { reportsApi } from "@/services/reportsApi";
import { vlcCommissionApi } from "@/services/vlcCommissionApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const DynamicBillCycle = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const userId = useAppSelector((state) => state.authData?.userData?.id);
  const userPhone = useAppSelector((state) => state.authData?.userData?.phone);
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
  const [bonusDeductionInfo, setBonusDeductionInfo] = useState<any>(null);
  const [vlcCommission, setVlcCommission] = useState<any>(null);
  const [globalCycle, setGlobalCycle] = useState<number>(10);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'1-per-page' | '2-per-page' | '3-per-page' | 'detailed-horizontal'>('detailed-horizontal');

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
      fetchBonusInfo();
    }
  }, [vlcId]);

  const fetchBonusInfo = async () => {
    if (!vlcId) return;
    try {
      const response = await bonusApi.getBonusDeduction(parseInt(vlcId));
      if (response.data && response.data.success) {
        setBonusDeductionInfo(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch bonus info:", error);
    }
  };

  // Helper: Fetch VLC Commission settings
  const fetchVlcCommissionSettings = async (vlcId: string) => {
    if (!vlcId || !startDate || !endDate) return null;
    try {
      const response = await reportsApi.getVlcCommissionReport({
        vlc_id: vlcId,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd')
      });
      if (response.success && response.data && response.data.length > 0) {
        const vlc = response.data[0];
        // Find if there's a Travel commission setting
        const travelComm = vlc.commissions.find((c: any) => c.type === 'Commission' || c.type === 'Fixed' || c.type === 'Travel');
        if (travelComm) {
          return {
            ...travelComm,
            effective_from: travelComm.effective_from
          };
        }
        return null;
      }
    } catch (error) {
      console.error('Error fetching VLC commission:', error);
    }
    return null;
  };

  // ── Fetch all farmer-specific commissions for a VLC keyed by farmer_id ──
  const fetchFarmerCommissionMap = async (vlcId: string): Promise<Map<string, any>> => {
    try {
      const res = await vlcCommissionApi.getByVlcc(vlcId);
      const records: any[] = res.data?.data ?? [];
      const map = new Map<string, any>();
      // API returns DESC → first occurrence is latest active for each key
      records.forEach((r) => {
        if (!r.farmer_id) return;
        // Store milk-type-specific record (e.g. "F001_Cow", "F001_Buffalo")
        const typedKey = r.milk_type ? `${r.farmer_id}_${r.milk_type}` : r.farmer_id;
        if (!map.has(typedKey)) map.set(typedKey, r);
        // Also keep generic fallback keyed by farmer_id alone
        if (!map.has(r.farmer_id)) map.set(r.farmer_id, r);
      });
      return map;
    } catch {
      return new Map(); // graceful fallback
    }
  };

  // ── Priority: farmer+type-specific → farmer-generic → VLC-level → null ──
  const resolveFarmerCommission = (
    farmerId: string,
    milkType: string,
    farmerCommMap: Map<string, any>,
    vlcComm: any | null
  ): { type: string; amount: string; effective_from: string } | null => {
    const farmerRecord = farmerCommMap.get(`${farmerId}_${milkType}`) ?? farmerCommMap.get(farmerId);
    if (farmerRecord) return { type: farmerRecord.type, amount: farmerRecord.amount, effective_from: farmerRecord.effective_from };
    if (vlcComm) return { type: vlcComm.type, amount: vlcComm.amount, effective_from: vlcComm.effective_from };
    return null;
  };

  // ── Build the travel_commission template payload (returns undefined if no commission) ──
  const buildTravelCommission = (
    comm: { type: string; amount: string; effective_from: string } | null,
    totalLiters: number
  ) => {
    if (!comm) return undefined;
    return {
      type: comm.type,
      rate: parseFloat(comm.amount),
      amount: comm.type === 'Commission'
        ? totalLiters * parseFloat(comm.amount)
        : parseFloat(comm.amount),
      effective_from: comm.effective_from
    };
  };
  
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
      const dates = calculateDateRange(dateString, globalCycle);
      setStartDate(dates.from);
      setEndDate(dates.to);
    }
  };

  const handleGlobalCycleChange = (cycle: number) => {
    setGlobalCycle(cycle);
    const dates = calculateDateRange(format(selectedDate, 'yyyy-MM-dd'), cycle);
    setStartDate(dates.from);
    setEndDate(dates.to);
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
    
    // Treat bill as non-existent if it's just zeroed out data
    const bd = farmer.bill_details || {};
    const hasSavedBill = !!(bd && (
      (parseFloat(bd.milk_total) || 0) !== 0 || 
      (parseFloat(bd.advance_total) || 0) !== 0 ||
      (parseFloat(bd.cattlefeed_total) || 0) !== 0 ||
      (parseFloat(bd.other1_total) || 0) !== 0 ||
      (parseFloat(bd.other2_total) || 0) !== 0 ||
      bd.is_finalized === 1
    ));

    let advance_sum = 0, cf_sum = 0, o1_sum = 0, o2_sum = 0;
    let fat_sum = 0, snf_sum = 0, water_sum = 0, records_with_fat = 0;

    records.forEach((r: any) => {
      quantity += parseFloat(r.quantity) || 0;
      milk_total += parseFloat(r.milk_total) || 0;
      received_total += parseFloat(r.total_received) || 0;
      if (!hasSavedBill) {
        advance_sum += r.deductions?.advance || 0;
        cf_sum += r.deductions?.cattle_feed || 0;
        o1_sum += r.deductions?.other1 || 0;
        o2_sum += r.deductions?.other2 || 0;
      }
      
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

    // Prev = carry-forward from the previous frozen bill's remaining balance
    // Pay  = new purchases/payments in the current period
    //
    // When previous_bill exists:
    //   Prev = previous_bill.X_remaining  (what was still outstanding after last bill)
    //   Pay  = current_bill.X_remaining   (new in current period, when bill is already saved)
    //          or daily-record accumulation (when no saved bill yet)
    //
    // When previous_bill is absent (first-ever period):
    //   Fall back: Prev = current_bill.X_total + current_bill.X_remaining
    const pb = farmer.previous_bill;

    const prev_advance = pb
      ? parseFloat(pb.advance_remaining || '0')
      : (parseFloat(bd.advance_total || '0') + parseFloat(bd.advance_remaining || '0'));
    const prev_cattlefeed = pb
      ? parseFloat(pb.cattlefeed_remaining || '0')
      : (parseFloat(bd.cattlefeed_total || '0') + parseFloat(bd.cattlefeed_remaining || '0'));
    const prev_other1 = pb
      ? parseFloat(pb.other1_remaining || '0')
      : (parseFloat(bd.other1_total || '0') + parseFloat(bd.other1_remaining || '0'));
    const prev_other2 = pb
      ? parseFloat(pb.other2_remaining || '0')
      : (parseFloat(bd.other2_total || '0') + parseFloat(bd.other2_remaining || '0'));

    // Pay = new amounts in current period
    const pay_advance    = (pb && hasSavedBill) ? parseFloat(bd.advance_remaining    || '0') : advance_sum;
    const pay_cattlefeed = (pb && hasSavedBill) ? parseFloat(bd.cattlefeed_remaining || '0') : cf_sum;
    const pay_other1     = (pb && hasSavedBill) ? parseFloat(bd.other1_remaining     || '0') : o1_sum;
    const pay_other2     = (pb && hasSavedBill) ? parseFloat(bd.other2_remaining     || '0') : o2_sum;

    return {
      ...farmer,
      quantity,
      milk_total,
      received_total,
      advance_prev: prev_advance,
      advance_pay: pay_advance,
      advance_total_avail: prev_advance + pay_advance,

      cattlefeed_prev: prev_cattlefeed,
      cattlefeed_pay: pay_cattlefeed,
      cattlefeed_total_avail: prev_cattlefeed + pay_cattlefeed,

      other1_prev: prev_other1,
      other1_pay: pay_other1,
      other1_total_avail: prev_other1 + pay_other1,

      other2_prev: prev_other2,
      other2_pay: pay_other2,
      other2_total_avail: prev_other2 + pay_other2,

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
      const fromStr = format(startDate, "yyyy-MM-dd");
      const toStr = format(endDate, "yyyy-MM-dd");

      const [balanceRes, vlcComm, billReport] = await Promise.all([
        deductionApi.getAllFarmersBalance(parseInt(vlcId), fromStr, toStr),
        fetchVlcCommissionSettings(vlcId),
        billApi.getFarmerReport({ dairy_id: parseInt(vlcId), start_date: fromStr, end_date: toStr })
      ]);

      const data = balanceRes.data;
      setVlcCommission(vlcComm);

      // Build bills map: farmer_id → { current_bill, previous_bill, payments, payment_logs }
      const billsMap = new Map<string, { current_bill: any; previous_bill: any; payments: any[]; payment_logs: any }>();
      if (billReport?.data?.success) {
        const cowBills: any[] = billReport.data.cow || [];
        const buffBills: any[] = billReport.data.buffalo || [];
        [...cowBills, ...buffBills].forEach((f: any) => {
          const existing = billsMap.get(f.farmer_id);
          if (!existing) {
            billsMap.set(f.farmer_id, {
              current_bill: f.current_bill || null,
              previous_bill: f.previous_bill || null,
              payments: f.payments || [],
              payment_logs: f.payment_logs || {}
            });
          } else {
            if (!existing.current_bill && f.current_bill) existing.current_bill = f.current_bill;
            if (!existing.previous_bill && f.previous_bill) existing.previous_bill = f.previous_bill;
          }
        });
      }


      // Store separate collection data - grouped by farmer and type
      let typeSpecificEntries = new Map<string, any[]>();
      
      try {
        const collectionResponse = await api.get('/collections/by-dairy-date-range', {
          params: {
            dairy_id: vlcId,
            start_date: fromStr,
            end_date: toStr
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

      // Track bill generation status
      const statusMap: {[key: string]: boolean} = {};
      
      // Initialize farmer map with daily entries
      const farmerMap = new Map();
      
      (data.data || []).forEach((dateEntry: any) => {
        dateEntry.farmers.forEach((farmer: any) => {
          const farmerId = farmer.farmer_id;
          if (!farmerMap.has(farmerId)) {
            // Strictly use from_bills data as requested
            const fb = farmer.from_bills || {};
            const billInfo = billsMap.get(farmerId);

            farmerMap.set(farmerId, {
              farmer_id: farmerId,
              name: farmer.farmer_name || `Farmer ${farmerId}`,
              daily_records: [],
              type_records: typeSpecificEntries.get(farmerId) || [],
              bill_cycle: globalCycle,
              paymentAdvance: "",
              paymentCattleFeed: "",
              paymentOther1: "",
              paymentOther2: "",
              advanceDeduction: parseFloat(fb.advance_total) || 0,
              cattleFeedDeduction: parseFloat(fb.cattlefeed_total) || 0,
              other1Deduction: parseFloat(fb.other1_total) || 0,
              other2Deduction: parseFloat(fb.other2_total) || 0,
              bill_details: fb,
              current_bill: billInfo?.current_bill || null,
              previous_bill: billInfo?.previous_bill || null,
              payments: billInfo?.payments || [],
              payment_logs: billInfo?.payment_logs || {}
            });

            // Set bill status from is_finalized
            statusMap[farmerId] = !!(fb.is_finalized === 1 || fb.status === 'finalized');
          }
          
          const record = farmerMap.get(farmerId);
          record.daily_records.push({
            ...farmer,
            date: dateEntry.date
          });
        });
      });
      
      setBillStatus(statusMap);
      setFarmersData(Array.from(farmerMap.values()));
      setSelectedFarmerIndex(0);
      setSearchTerm("");
      toast.success(`Data loaded for ${fromStr} to ${toStr}`);
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
      const maxValue = currentFarmer.advance_total_avail;
      if (numValue > maxValue) {
        toast.warning(`Advance deduction cannot exceed ₹${maxValue.toFixed(2)}`);
        numValue = maxValue;
      }
    } else if (field === 'cattleFeedDeduction' && typeof numValue === 'number') {
      const maxValue = currentFarmer.cattlefeed_total_avail;
      if (numValue > maxValue) {
        toast.warning(`Cattle Feed deduction cannot exceed ₹${maxValue.toFixed(2)}`);
        numValue = maxValue;
      }
    } else if (field === 'other1Deduction' && typeof numValue === 'number') {
      const maxValue = currentFarmer.other1_total_avail;
      if (numValue > maxValue) {
        toast.warning(`Kirana deduction cannot exceed ₹${maxValue.toFixed(2)}`);
        numValue = maxValue;
      }
    } else if (field === 'other2Deduction' && typeof numValue === 'number') {
      const maxValue = currentFarmer.other2_total_avail;
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

    const farmerRaw = filteredFarmers[selectedFarmerIndex];
    if (!farmerRaw) {
      toast.error("No farmer selected");
      return;
    }

    // Check if bill is already generated
    if (billStatus[farmerRaw.farmer_id]) {
      toast.info(`Bill already generated for farmer ${farmerRaw.farmer_id}`);
      return;
    }

    setSaving(true);
    try {
      // Create payments if any payment fields have values
      const paymentPromises = [];
      const dateStr = format(startDate, "yyyy-MM-dd");
      const selectedBranch = branches.find(b => b.branch_id.toString() === vlcId);
      
      if (farmerRaw.paymentAdvance && parseFloat(farmerRaw.paymentAdvance) > 0) {
        paymentPromises.push(
          paymentApi.create({
            date: dateStr,
            dairy_id: selectedBranch?.dairy_id || vlcId,
            farmer_id: farmerRaw.farmer_id,
            farmer_name: farmerRaw.name,
            payment_type: "Advance",
            amount_taken: parseFloat(farmerRaw.paymentAdvance),
            received: 0
          })
        );
      }
      
      if (farmerRaw.paymentCattleFeed && parseFloat(farmerRaw.paymentCattleFeed) > 0) {
        paymentPromises.push(
          paymentApi.create({
            date: dateStr,
            dairy_id: selectedBranch?.dairy_id || vlcId,
            farmer_id: farmerRaw.farmer_id,
            farmer_name: farmerRaw.name,
            payment_type: "Cattle Feed",
            amount_taken: parseFloat(farmerRaw.paymentCattleFeed),
            received: 0
          })
        );
      }
      
      if (farmerRaw.paymentOther1 && parseFloat(farmerRaw.paymentOther1) > 0) {
        paymentPromises.push(
          paymentApi.create({
            date: dateStr,
            dairy_id: selectedBranch?.dairy_id || vlcId,
            farmer_id: farmerRaw.farmer_id,
            farmer_name: farmerRaw.name,
            payment_type: "Other1",
            amount_taken: parseFloat(farmerRaw.paymentOther1),
            received: 0
          })
        );
      }
      
      if (farmerRaw.paymentOther2 && parseFloat(farmerRaw.paymentOther2) > 0) {
        paymentPromises.push(
          paymentApi.create({
            date: dateStr,
            dairy_id: selectedBranch?.dairy_id || vlcId,
            farmer_id: farmerRaw.farmer_id,
            farmer_name: farmerRaw.name,
            payment_type: "Other2",
            amount_taken: parseFloat(farmerRaw.paymentOther2),
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
        milk_total: Number(currentFarmer.milk_total.toFixed(2)),
        advance_total: Number(currentFarmer.advanceDeduction.toFixed(2)),
        cattlefeed_total: Number(currentFarmer.cattleFeedDeduction.toFixed(2)),
        other1_total: Number(currentFarmer.other1Deduction.toFixed(2)),
        other2_total: Number(currentFarmer.other2Deduction.toFixed(2)),
        received_total: Number(currentFarmer.received_total.toFixed(2)),
        net_payable: Number(calculateNetPayable(currentFarmer).toFixed(2)),
        advance_remaining: Number(Math.max(0, currentFarmer.advance_total_avail - currentFarmer.advanceDeduction).toFixed(2)),
        cattlefeed_remaining: Number(Math.max(0, currentFarmer.cattlefeed_total_avail - currentFarmer.cattleFeedDeduction).toFixed(2)),
        other1_remaining: Number(Math.max(0, currentFarmer.other1_total_avail - currentFarmer.other1Deduction).toFixed(2)),
        other2_remaining: Number(Math.max(0, currentFarmer.other2_total_avail - currentFarmer.other2Deduction).toFixed(2))
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
      
      toast.success("Bill freezed and saved successfully!");
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(error?.response?.data?.message || "Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBill = async () => {
    if (!vlcId || !startDate || !endDate || !currentFarmer) return;
    
    setSaving(true);
    try {
      const billData = {
        farmer_id: currentFarmer.farmer_id,
        dairy_id: parseInt(vlcId),
        period_start: format(startDate, "yyyy-MM-dd"),
        period_end: format(endDate, "yyyy-MM-dd"),
        milk_total: Number(currentFarmer.milk_total.toFixed(2)),
        advance_total: Number(currentFarmer.advanceDeduction.toFixed(2)),
        cattlefeed_total: Number(currentFarmer.cattleFeedDeduction.toFixed(2)),
        other1_total: Number(currentFarmer.other1Deduction.toFixed(2)),
        other2_total: Number(currentFarmer.other2Deduction.toFixed(2)),
        received_total: Number(currentFarmer.received_total.toFixed(2)),
        net_payable: Number(calculateNetPayable(currentFarmer).toFixed(2)),
        advance_remaining: Number(Math.max(0, currentFarmer.advance_total_avail - currentFarmer.advanceDeduction).toFixed(2)),
        cattlefeed_remaining: Number(Math.max(0, currentFarmer.cattlefeed_total_avail - currentFarmer.cattleFeedDeduction).toFixed(2)),
        other1_remaining: Number(Math.max(0, currentFarmer.other1_total_avail - currentFarmer.other1Deduction).toFixed(2)),
        other2_remaining: Number(Math.max(0, currentFarmer.other2_total_avail - currentFarmer.other2Deduction).toFixed(2))
      };

      await deductionApi.updateFarmerBillWeb(billData);
      toast.success("Bill data updated successfully!");
      
      // Update local farmersData to clear 'modified' flag
      setFarmersData(prev => prev.map(f => 
        f.farmer_id === currentFarmer.farmer_id ? { ...f, modified: false } : f
      ));
      
    } catch (error: any) {
      console.error("Update Error:", error);
      toast.error(error?.response?.data?.message || "Failed to update bill data");
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
    
    // Safety check for bonusDeductionInfo
    const bonusRate = bonusDeductionInfo?.bonus_deduction || 0;
    const fixedAmount = bonusDeductionInfo?.fixed_deduction || 0;
    const bonusDeduction = bonusRate * (farmer.quantity || 0);
    
    return milk - adv - cf - o1 - o2 - bonusDeduction - fixedAmount + rec;
  };

      const getTravelQuantity = (
        farmer: {
          cow_data?: { total_quantity?: number | string } | null;
          buffalo_data?: { total_quantity?: number | string } | null;
          collections_summary?: { total_quantity?: number | string } | null;
          quantity?: number | string;
        } | null | undefined
      ) => {
        if (!farmer) return 0;

        const cowQty = parseFloat(String(farmer.cow_data?.total_quantity || 0)) || 0;
        const buffaloQty = parseFloat(String(farmer.buffalo_data?.total_quantity || 0)) || 0;

        if (cowQty > 0 || buffaloQty > 0) {
          return cowQty + buffaloQty;
        }

        const summaryQty = parseFloat(String(farmer.collections_summary?.total_quantity || 0)) || 0;
        if (summaryQty > 0) {
          return summaryQty;
        }

        return parseFloat(String(farmer.quantity || 0)) || 0;
      };

      const getExportTravelQuantity = (collections: Array<{ quantity?: number | string }> | undefined) => {
        if (!collections || collections.length === 0) return 0;

        return collections.reduce((sum, item) => {
          return sum + (parseFloat(String(item.quantity || 0)) || 0);
        }, 0);
      };

  // ── Shared helper: fetch report language from settings ──
  const fetchReportLanguage = async (vlc: string): Promise<string> => {
    try {
      const { data } = await settingsApi.get(vlc);
      if (data.success && data.data && data.data.report_language) {
        const lang = data.data.report_language.toLowerCase();
        if (lang === 'hindi') return 'hi';
        if (lang === 'english') return 'en';
        if (lang === 'marathi') return 'mr';
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    return 'mr'; // fallback default
  };

  // ── Shared helper: fetch bonus deductions and build a map keyed by farmer_id ──
  const fetchBonusMap = async (dairyId: number, fromDate: string, toDate: string): Promise<Map<string, any>> => {
    try {
      const bonusResponse = await bonusApi.getBonusDeductions({
        dairy_id: dairyId,
        start_date: fromDate,
        end_date: toDate,
      });
      const bonusMap = new Map<string, any>();
      (bonusResponse.data.data || []).forEach((entry: any) => {
        const existing = bonusMap.get(entry.farmer_id);
        if (!existing || entry.id > existing.id) {
          bonusMap.set(entry.farmer_id, entry);
        }
      });
      return bonusMap;
    } catch {
      return new Map();
    }
  };

  const attachBonus = (farmer: any, bonusMap: Map<string, any>, totalQty: number, toDate: string) => {
    const entry = bonusMap.get(farmer.farmer_id);
    if (!entry) return { ...farmer, bonus_deduction_info: null };
    const periodEnd = new Date(toDate);
    const effectiveFrom = new Date(entry.effective_from);
    if (periodEnd <= effectiveFrom) return { ...farmer, bonus_deduction_info: null };
    return {
      ...farmer,
      bonus_deduction_info: {
        bonus_amount: parseFloat(entry.bonus_deduction || 0),
        fixed_amount: parseFloat(entry.fixed_deduction || 0),
        remark: entry.remark || 'इमारत निधी',
        total_bonus_till_date: 0
      }
    };
  };

  const getNormalizedPayments = (farmer: any) => {
    const logs = farmer.payment_logs?.data || [];
    const payments = [...(farmer.payments || [])];
    const matchedLogIds = new Set<number>();
    
    // First, mark logs that are already represented in payments
    payments.forEach((p: any) => {
      const pType = p.payment_type?.toLowerCase().trim().replace(/\s/g, '');
      const logMatch = logs.find((l: any) => 
        !matchedLogIds.has(l.id) &&
        l.payment_type?.toLowerCase().trim().replace(/\s/g, '') === pType &&
        parseFloat(l.amount_taken || '0') === parseFloat(p.amount_taken || '0')
      );
      if (logMatch) matchedLogIds.add(logMatch.id);
    });

    // Add remaining logs to payments (especially stock-based ones like cattlefeed)
    logs.forEach((log: any) => {
      if (!matchedLogIds.has(log.id)) {
        payments.push(log);
        matchedLogIds.add(log.id);
      }
    });

    // Re-initialize matched IDs for the final mapping to ensure correct merging
    const finalMatchedIds = new Set<number>();
    const result = payments.map((p: any) => {
      const pType = p.payment_type?.toLowerCase().trim().replace(/\s/g, '');
      const logMatch = logs.find((l: any) => 
        !finalMatchedIds.has(l.id) &&
        l.payment_type?.toLowerCase().trim().replace(/\s/g, '') === pType &&
        parseFloat(l.amount_taken || '0') === parseFloat(p.amount_taken || '0')
      );
      
      const merged = logMatch ? { ...p, ...logMatch } : p;
      if (logMatch) finalMatchedIds.add(logMatch.id);

      return {
        ...merged,
        stock_name: merged.stock_name,
        stock: merged.stock,
        date: merged.date || merged.created_at
      };
    });

    return result;
  };

  const generatePage = async (htmlContent: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm';
    document.body.appendChild(tempDiv);
    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        windowWidth: 794,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              --color-gray-50: #f9fafb !important;
              --color-gray-100: #f3f4f6 !important;
              --color-gray-200: #e5e7eb !important;
              --color-blue-600: #2563eb !important;
              --color-blue-700: #1d4ed8 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      return { imgData, imgWidth, imgHeight };
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handleExport = () => {
    if (exportFormat === 'detailed-horizontal') {
      exportToPDF();
    } else if (exportFormat === '2-per-page') {
      exportMultiPerPagePDF(2);
    } else if (exportFormat === '3-per-page') {
      exportMultiPerPagePDF(3);
    }
  };

  const exportMultiPerPagePDF = async (chunkSize: number) => {
    if (!vlcId || !startDate || !endDate) {
      toast.error("Please select VLC and date range first");
      return;
    }

    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(b => b.branch_id.toString() === vlcId);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.username || '';
      const branchName = selectedBranch?.branchName || '';
      const dairyId = parseInt(vlcId);
      const fromDateApi = format(startDate, 'yyyy-MM-dd');
      const toDateApi = format(endDate, 'yyyy-MM-dd');

      const [response, bonusMap, reportLang, vlcComm, farmerCommMap] = await Promise.all([
        billApi.getFarmerReport({ dairy_id: dairyId, start_date: fromDateApi, end_date: toDateApi }),
        fetchBonusMap(dairyId, fromDateApi, toDateApi),
        fetchReportLanguage(vlcId),
        fetchVlcCommissionSettings(vlcId),
        fetchFarmerCommissionMap(vlcId)
      ]);

      if (!response.data.success) {
        toast.error('Failed to fetch farmer report data');
        return;
      }

      const cowData: FarmerReportData[] = response.data.cow || [];
      const buffaloData: FarmerReportData[] = response.data.buffalo || [];

      // Keep cow and buffalo as separate entries so each gets its own commission
      const cowIds = new Set(cowData.map(f => f.farmer_id));
      const buffaloIds = new Set(buffaloData.map(f => f.farmer_id));
      const allIds = Array.from(new Set([...cowIds, ...buffaloIds])).sort((a, b) => parseInt(a) - parseInt(b));

      const allData: Array<FarmerReportData & Record<string, unknown>> = [];
      allIds.forEach(id => {
        const cow = cowData.find(f => f.farmer_id === id);
        const buffalo = buffaloData.find(f => f.farmer_id === id);
        const isMixed = !!(cow && buffalo);
        if (cow) {
          const withBonus = attachBonus(cow, bonusMap, cow.collections_summary?.total_quantity || 0, toDateApi);
          allData.push({ ...withBonus, _displayMilkType: 'Cow', _hideDeductions: isMixed });
        }
        if (buffalo) {
          const withBonus = attachBonus(buffalo, bonusMap, buffalo.collections_summary?.total_quantity || 0, toDateApi);
          const combinedLiters = isMixed
            ? (cow!.collections_summary?.total_quantity || 0) + (buffalo.collections_summary?.total_quantity || 0)
            : buffalo.collections_summary?.total_quantity || 0;
          const combinedAmount = isMixed
            ? (cow!.collections_summary?.total_amount || 0) + (buffalo.collections_summary?.total_amount || 0)
            : 0;
          allData.push({ ...withBonus, _displayMilkType: 'Buffalo', _hideDeductions: false, _combinedTotalQty: combinedLiters, _combinedTotalAmount: combinedAmount });
        }
      });

      if (allData.length === 0) {
        toast.info('No data found for selected criteria');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');

      for (let i = 0; i < allData.length; i += chunkSize) {
        const chunk = allData.slice(i, i + chunkSize);

        const farmersWithComm = chunk.map(farmer => ({
          ...farmer,
          payments: getNormalizedPayments(farmer),
          travel_commission: buildTravelCommission(
            resolveFarmerCommission(farmer.farmer_id, farmer._displayMilkType as string, farmerCommMap, vlcComm),
            farmer.collections_summary?.total_quantity || 0
          )
        }));

        let htmlContent = "";
        const fmtDate = (d: string | Date) => {
            const date = new Date(d);
            return format(date, 'dd-MM-yyyy');
        };

        if (chunkSize === 3) {
          htmlContent = generateTemplate3Farmers({
            dairyName,
            dairyCode,
            branchName,
            farmers: farmersWithComm as any,
            fromDate: fmtDate(startDate),
            toDate: fmtDate(endDate),
            hideRateAmount: hideRateAmount,
            bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary
          }, reportLang);
        } else {
          htmlContent = generateFarmer2PerPage({
            dairyName,
            branchName,
            farmers: farmersWithComm as any,
            fromDate: fmtDate(startDate),
            toDate: fmtDate(endDate),
            hideRateAmount: hideRateAmount,
            language: reportLang,
            bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary || null
          });
        }

        const { imgData, imgWidth, imgHeight } = await generatePage(htmlContent);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`Farmer_Bill_${chunkSize}perPage_${fromDateApi}_to_${toDateApi}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!vlcId || !startDate || !endDate) {
      toast.error("Please select VLC and date range first");
      return;
    }

    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(b => b.branch_id.toString() === vlcId);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.username || '';
      const branchName = selectedBranch?.branchName || '';
      const dairyId = parseInt(vlcId);
      const fromDateApi = format(startDate, 'yyyy-MM-dd');
      const toDateApi = format(endDate, 'yyyy-MM-dd');

      const [response, bonusMap, reportLang, farmerCommMap] = await Promise.all([
        billApi.getFarmerReport({ dairy_id: dairyId, start_date: fromDateApi, end_date: toDateApi }),
        fetchBonusMap(dairyId, fromDateApi, toDateApi),
        fetchReportLanguage(vlcId),
        fetchFarmerCommissionMap(vlcId)
      ]);

      if (!response.data.success) {
        toast.error('Failed to fetch farmer report data');
        return;
      }

      const cowData: FarmerReportData[] = response.data.cow || [];
      const buffaloData: FarmerReportData[] = response.data.buffalo || [];
      const farmerData = [...cowData, ...buffaloData];
      
      const farmerMap = new Map<string, FarmerReportData>();
      farmerData.forEach(farmer => {
        if (farmerMap.has(farmer.farmer_id)) {
          const existing = farmerMap.get(farmer.farmer_id)! as any;
          existing.collections = [...existing.collections, ...(farmer as any).collections];
          // Carry forward current_bill / previous_bill from the second type if first is missing
          if (!existing.current_bill && (farmer as any).current_bill) existing.current_bill = (farmer as any).current_bill;
          if (!existing.previous_bill && (farmer as any).previous_bill) existing.previous_bill = (farmer as any).previous_bill;
        } else {
          farmerMap.set(farmer.farmer_id, { ...farmer });
        }
      });

      const sortedFarmers = Array.from(farmerMap.values())
        .sort((a, b) => parseInt(a.farmer_id) - parseInt(b.farmer_id));

      if (sortedFarmers.length === 0) {
        toast.info('No data found for selected criteria');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      for (let i = 0; i < sortedFarmers.length; i++) {
        const farmer = sortedFarmers[i];
        const farmerBillData: FarmerBillData[] = farmer.collections.map((c: any) => ({
          date: c.created_at,
          shift: c.shift as 'Morning' | 'Evening',
          type: c.type as 'Cow' | 'Buffalo',
          liters: Number(c.quantity),
          fat: Number(c.fat),
          snf: Number(c.snf),
          clr: Number(c.clr || 0),
          rate: Number(c.rate),
          amount: Number(c.amount),
          water: Number(c.water || 0)
        }));

        const templateData = {
          dairyName,
          branchName,
          dairyCode,
          farmerCode: farmer.farmer_id,
          farmerName: farmer.farmer_details?.fullName || 'Unknown',
          fromDate: fromDateApi,
          toDate: toDateApi,
          milkType: 'All',
          data: farmerBillData,
          bankDetails: {
            accountNumber: farmer.farmer_details?.accountNumber || '',
            ifscCode: farmer.farmer_details?.ifscCode || '',
            bankName: farmer.farmer_details?.bankName || '',
            branchName: (farmer.farmer_details as any)?.branchName || ''
          },
          current_bill: farmer.current_bill,
          previous_bill: (farmer as any).previous_bill,
          payments: getNormalizedPayments(farmer),
          bonus_deduction_info: attachBonus(farmer, bonusMap, farmer.collections_summary?.total_quantity || 0, toDateApi).bonus_deduction_info,
          bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary || null,
          travel_commission: buildTravelCommission(
            resolveFarmerCommission(farmer.farmer_id, farmerBillData[0]?.type || 'Cow', farmerCommMap, vlcCommission),
            getExportTravelQuantity(farmer.collections)
          ),
          hideRateAmount: hideRateAmount
        };

        console.log(`[EXPORT farmer=${farmer.farmer_id}]`, {
          current_bill: templateData.current_bill,
          previous_bill: templateData.previous_bill
        });

        const hasCow = farmerBillData.some(d => d.type === 'Cow');
        const hasBuffalo = farmerBillData.some(d => d.type === 'Buffalo' || d.type === 'Buffaloes');

        if (hasCow && hasBuffalo) {
          const cowBillData = farmerBillData.filter(d => d.type === 'Cow');
          const buffaloBillData = farmerBillData.filter(d => d.type === 'Buffalo' || (d.type as string) === 'Buffaloes');
          const cowLiters = cowBillData.reduce((s, item) => s + item.liters, 0);
          const buffLiters = buffaloBillData.reduce((s, item) => s + item.liters, 0);

          const cowComm = resolveFarmerCommission(farmer.farmer_id, 'Cow', farmerCommMap, vlcCommission);
          const buffComm = resolveFarmerCommission(farmer.farmer_id, 'Buffalo', farmerCommMap, vlcCommission);
          const cowTravelAmt = cowComm
            ? (cowComm.type === 'Commission' ? cowLiters * parseFloat(cowComm.amount) : parseFloat(cowComm.amount))
            : 0;
          const buffTravelAmt = buffComm
            ? (buffComm.type === 'Commission' ? buffLiters * parseFloat(buffComm.amount) : parseFloat(buffComm.amount))
            : 0;
          const combinedTravelComm = (cowComm || buffComm) ? {
            type: 'Commission',
            rate: 0,
            amount: cowTravelAmt + buffTravelAmt,
            effective_from: (buffComm ?? cowComm)!.effective_from,
            cow_amount: cowTravelAmt,
            buffalo_amount: buffTravelAmt
          } : undefined;

          const cowHtml = generateTemplateDetailedHorizontal({ ...templateData, renderOnly: 'Cow', hideSummary: true, travel_commission: buildTravelCommission(cowComm, cowLiters) } as unknown as Template2Data, reportLang);
          const cowPage = await generatePage(cowHtml);
          if (i > 0) pdf.addPage();
          pdf.addImage(cowPage.imgData, 'JPEG', 0, 0, cowPage.imgWidth, cowPage.imgHeight);

          const buffHtml = generateTemplateDetailedHorizontal({ ...templateData, renderOnly: 'Buffalo', hideSummary: false, travel_commission: combinedTravelComm } as unknown as Template2Data, reportLang);
          const buffPage = await generatePage(buffHtml);
          pdf.addPage();
          pdf.addImage(buffPage.imgData, 'JPEG', 0, 0, buffPage.imgWidth, buffPage.imgHeight);
        } else {
          const html = generateTemplateDetailedHorizontal(templateData as any, reportLang);
          const { imgData, imgWidth, imgHeight } = await generatePage(html);
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
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
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.username || '';
      const branchName = selectedBranch?.branchName || '';
      const dairyId = parseInt(vlcId);
      const fromDateApi = format(currentFarmer.periodStart, 'yyyy-MM-dd');
      const toDateApi = format(currentFarmer.periodEnd, 'yyyy-MM-dd');
      const farmerId = currentFarmer.farmer_id;

      const [response, bonusMap, reportLang, farmerCommMap] = await Promise.all([
        billApi.getFarmerReport({ dairy_id: dairyId, start_date: fromDateApi, end_date: toDateApi }),
        fetchBonusMap(dairyId, fromDateApi, toDateApi),
        fetchReportLanguage(vlcId),
        fetchFarmerCommissionMap(vlcId)
      ]);

      if (!response.data.success) {
        toast.error('Failed to fetch farmer report data');
        return;
      }

      const cowData: FarmerReportData[] = response.data.cow || [];
      const buffaloData: FarmerReportData[] = response.data.buffalo || [];
      const allData = [...cowData, ...buffaloData];
      
      const farmerRecords = allData.filter(f => f.farmer_id === farmerId);
      if (farmerRecords.length === 0) {
        toast.error("No data found for this farmer");
        return;
      }

      // Merge collections if farmer has both; also carry current_bill/previous_bill from second type if first is missing
      const mergedFarmer: any = { ...farmerRecords[0] };
      if (farmerRecords.length > 1) {
        mergedFarmer.collections = [...farmerRecords[0].collections, ...farmerRecords[1].collections];
        if (!mergedFarmer.current_bill && (farmerRecords[1] as any).current_bill) mergedFarmer.current_bill = (farmerRecords[1] as any).current_bill;
        if (!mergedFarmer.previous_bill && (farmerRecords[1] as any).previous_bill) mergedFarmer.previous_bill = (farmerRecords[1] as any).previous_bill;
      }

      const farmerBillData: FarmerBillData[] = mergedFarmer.collections.map((c: any) => ({
        date: c.created_at,
        shift: c.shift as 'Morning' | 'Evening',
        type: c.type as 'Cow' | 'Buffalo',
        liters: Number(c.quantity),
        fat: Number(c.fat),
        snf: Number(c.snf),
        clr: Number(c.clr || 0),
        rate: Number(c.rate),
        amount: Number(c.amount),
        water: Number(c.water || 0)
      }));

      const templateData = {
        dairyName,
        branchName,
        dairyCode,
        farmerCode: mergedFarmer.farmer_id,
        farmerName: mergedFarmer.farmer_details?.fullName || 'Unknown',
        fromDate: fromDateApi,
        toDate: toDateApi,
        milkType: 'All',
        data: farmerBillData,
        bankDetails: {
          accountNumber: mergedFarmer.farmer_details?.accountNumber || '',
          ifscCode: mergedFarmer.farmer_details?.ifscCode || '',
          bankName: mergedFarmer.farmer_details?.bankName || '',
          branchName: (mergedFarmer.farmer_details as any)?.branchName || ''
        },
        current_bill: mergedFarmer.current_bill,
        previous_bill: (mergedFarmer as any).previous_bill,
        payments: getNormalizedPayments(mergedFarmer),
        bonus_deduction_info: attachBonus(mergedFarmer, bonusMap, mergedFarmer.collections_summary?.total_quantity || 0, toDateApi).bonus_deduction_info,
        bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary || null,
        travel_commission: buildTravelCommission(
          resolveFarmerCommission(mergedFarmer.farmer_id, farmerBillData[0]?.type || 'Cow', farmerCommMap, vlcCommission),
          getExportTravelQuantity(mergedFarmer.collections)
        ),
        hideRateAmount: hideRateAmount
      };

      console.log(`[SINGLE EXPORT farmer=${mergedFarmer.farmer_id}]`, {
        current_bill: templateData.current_bill,
        previous_bill: templateData.previous_bill
      });

      const hasCow = farmerBillData.some(d => d.type === 'Cow');
      const hasBuffalo = farmerBillData.some(d => d.type === 'Buffalo' || d.type === 'Buffaloes');

      const pdf = new jsPDF('p', 'mm', 'a4');

      if (hasCow && hasBuffalo) {
        const cowBillData = farmerBillData.filter(d => d.type === 'Cow');
        const buffaloBillData = farmerBillData.filter(d => d.type === 'Buffalo' || (d.type as string) === 'Buffaloes');
        const cowLiters = cowBillData.reduce((s, item) => s + item.liters, 0);
        const buffLiters = buffaloBillData.reduce((s, item) => s + item.liters, 0);

        const cowComm = resolveFarmerCommission(mergedFarmer.farmer_id, 'Cow', farmerCommMap, vlcCommission);
        const buffComm = resolveFarmerCommission(mergedFarmer.farmer_id, 'Buffalo', farmerCommMap, vlcCommission);
        const cowTravelAmt = cowComm
          ? (cowComm.type === 'Commission' ? cowLiters * parseFloat(cowComm.amount) : parseFloat(cowComm.amount))
          : 0;
        const buffTravelAmt = buffComm
          ? (buffComm.type === 'Commission' ? buffLiters * parseFloat(buffComm.amount) : parseFloat(buffComm.amount))
          : 0;
        const combinedTravelComm = (cowComm || buffComm) ? {
          type: 'Commission',
          rate: 0,
          amount: cowTravelAmt + buffTravelAmt,
          effective_from: (buffComm ?? cowComm)!.effective_from,
          cow_amount: cowTravelAmt,
          buffalo_amount: buffTravelAmt
        } : undefined;

        const cowHtml = generateTemplateDetailedHorizontal({ ...templateData, renderOnly: 'Cow', hideSummary: true, travel_commission: buildTravelCommission(cowComm, cowLiters) } as unknown as Template2Data, reportLang);
        const cowPage = await generatePage(cowHtml);
        pdf.addImage(cowPage.imgData, 'JPEG', 0, 0, cowPage.imgWidth, cowPage.imgHeight);

        const buffHtml = generateTemplateDetailedHorizontal({ ...templateData, renderOnly: 'Buffalo', hideSummary: false, travel_commission: combinedTravelComm } as unknown as Template2Data, reportLang);
        const buffPage = await generatePage(buffHtml);
        pdf.addPage();
        pdf.addImage(buffPage.imgData, 'JPEG', 0, 0, buffPage.imgWidth, buffPage.imgHeight);
      } else {
        const html = generateTemplateDetailedHorizontal(templateData as any, reportLang);
        const { imgData, imgWidth, imgHeight } = await generatePage(html);
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`Farmer_Bill_${farmerId}_${fromDateApi}_to_${toDateApi}.pdf`);
      toast.success('PDF downloaded successfully');
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

                <div className="w-full sm:w-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cycle (Days)</label>
                  <div className="flex bg-white rounded-md border border-gray-300 p-1 h-10">
                    {[10, 15, 30].map((cycle) => (
                      <button
                        key={cycle}
                        onClick={() => handleGlobalCycleChange(cycle)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          globalCycle === cycle 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {cycle}
                      </button>
                    ))}
                  </div>
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
                    onClick={() => setShowExportModal(true)} 
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
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Deductions Summary</h4>
                      <Button
                        size="sm"
                        onClick={handleUpdateBill}
                        disabled={saving}
                        className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                        Save Bill
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b pb-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">Type / Amount</h3>
                      <h3 className="text-sm font-semibold text-gray-700">Payments</h3>
                      <h3 className="text-sm font-semibold text-gray-700">Deduction</h3>
                    </div>
                    
                    {/* Kirana Row */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-700">Kirana Balance:</p>
                        <div className="flex flex-col text-[10px] text-gray-500">
                          <span>Prev: ₹{currentFarmer.other1_prev?.toFixed(2)}</span>
                          <span>Pay: ₹{currentFarmer.other1_pay?.toFixed(2)}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 border-t pt-1">Total: ₹{currentFarmer.other1_total_avail?.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center pt-6">
                        <p className="text-sm font-semibold text-gray-700">₹{currentFarmer.other1_pay?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div className="space-y-1 pt-4">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={currentFarmer.other1Deduction || ""}
                          onChange={(e) => handleDeductionChange('other1Deduction', e.target.value)}
                          className="h-7 text-sm"
                        />
                        <p className="text-[10px] font-bold text-red-500">Rem: ₹{(currentFarmer.other1_total_avail - (currentFarmer.other1Deduction || 0)).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Cattle Feed Row */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-700">Cattle Feed Balance:</p>
                        <div className="flex flex-col text-[10px] text-gray-500">
                          <span>Prev: ₹{currentFarmer.cattlefeed_prev?.toFixed(2)}</span>
                          <span>Pay: ₹{currentFarmer.cattlefeed_pay?.toFixed(2)}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 border-t pt-1">Total: ₹{currentFarmer.cattlefeed_total_avail?.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center pt-6">
                        <p className="text-sm font-semibold text-gray-700">₹{currentFarmer.cattlefeed_pay?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div className="space-y-1 pt-4">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={currentFarmer.cattleFeedDeduction || ""}
                          onChange={(e) => handleDeductionChange('cattleFeedDeduction', e.target.value)}
                          className="h-7 text-sm"
                        />
                        <p className="text-[10px] font-bold text-red-500">Rem: ₹{(currentFarmer.cattlefeed_total_avail - (currentFarmer.cattleFeedDeduction || 0)).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Advance Row */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-700">Advance Balance:</p>
                        <div className="flex flex-col text-[10px] text-gray-500">
                          <span>Prev: ₹{currentFarmer.advance_prev?.toFixed(2)}</span>
                          <span>Pay: ₹{currentFarmer.advance_pay?.toFixed(2)}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 border-t pt-1">Total: ₹{currentFarmer.advance_total_avail?.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center pt-6">
                        <p className="text-sm font-semibold text-gray-700">₹{currentFarmer.advance_pay?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div className="space-y-1 pt-4">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={currentFarmer.advanceDeduction || ""}
                          onChange={(e) => handleDeductionChange('advanceDeduction', e.target.value)}
                          className="h-7 text-sm"
                        />
                        <p className="text-[10px] font-bold text-red-500">Rem: ₹{(currentFarmer.advance_total_avail - (currentFarmer.advanceDeduction || 0)).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Other 2 Row */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-700">Other 2 Balance:</p>
                        <div className="flex flex-col text-[10px] text-gray-500">
                          <span>Prev: ₹{currentFarmer.other2_prev?.toFixed(2)}</span>
                          <span>Pay: ₹{currentFarmer.other2_pay?.toFixed(2)}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 border-t pt-1">Total: ₹{currentFarmer.other2_total_avail?.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center pt-6">
                        <p className="text-sm font-semibold text-gray-700">₹{currentFarmer.other2_pay?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div className="space-y-1 pt-4">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={currentFarmer.other2Deduction || ""}
                          onChange={(e) => handleDeductionChange('other2Deduction', e.target.value)}
                          className="h-7 text-sm"
                        />
                        <p className="text-[10px] font-bold text-red-500">Rem: ₹{(currentFarmer.other2_total_avail - (currentFarmer.other2Deduction || 0)).toFixed(2)}</p>
                      </div>
                    </div>

                      {/* Bonus & Fixed Deduction Summary */}
                      {(bonusDeductionInfo?.bonus_deduction > 0 || bonusDeductionInfo?.fixed_deduction > 0 || (vlcCommission && (new Date(endDate || new Date()) >= new Date(vlcCommission.effective_from)))) && (
                        <div className="pt-2 mt-2 border-t border-dashed border-gray-200">
                          {bonusDeductionInfo?.bonus_deduction > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Bonus Deduction ({bonusDeductionInfo.bonus_deduction}/L):</span>
                              <span className="font-semibold text-red-500">- ₹{(bonusDeductionInfo.bonus_deduction * (currentFarmer.quantity || 0)).toFixed(2)}</span>
                            </div>
                          )}
                          {bonusDeductionInfo?.fixed_deduction > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>{bonusDeductionInfo.remark || 'इमारत निधी'}:</span>
                              <span className="font-semibold text-red-500">- ₹{(bonusDeductionInfo.fixed_deduction || 0).toFixed(2)}</span>
                            </div>
                          )}
                          {vlcCommission && (new Date(endDate || new Date()) >= new Date(vlcCommission.effective_from)) && (
                            <div className="flex justify-between text-xs text-blue-600 mb-1">
                              <span>{t('travel_commission')}:</span>
                              <span className="font-semibold text-blue-600">+ ₹{(vlcCommission.type === 'Commission' 
                                ? (getTravelQuantity(currentFarmer) * parseFloat(vlcCommission.amount))
                                : parseFloat(vlcCommission.amount)
                              ).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  {/* Previous Bill Summary
                  {currentFarmer.previous_bill && (
                    <div className="pt-2 mt-1 border border-dashed border-orange-200 rounded-lg p-3 bg-orange-50">
                      <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">Previous Bill</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-gray-500">Milk Total</p>
                          <p className="text-sm font-bold text-gray-700">₹{parseFloat(currentFarmer.previous_bill.milk_total || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Deductions</p>
                          <p className="text-sm font-bold text-red-600">
                            ₹{(
                              parseFloat(currentFarmer.previous_bill.advance_total || 0) +
                              parseFloat(currentFarmer.previous_bill.cattlefeed_total || 0) +
                              parseFloat(currentFarmer.previous_bill.other1_total || 0) +
                              parseFloat(currentFarmer.previous_bill.other2_total || 0)
                            ).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Net Payable</p>
                          <p className="text-sm font-bold text-green-700">₹{parseFloat(currentFarmer.previous_bill.net_payable || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )} */}

                  {/* Net Payable */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-600">Net Payable</p>
                        <p className={`text-xl font-bold ${(() => {
                          const net = calculateNetPayable(currentFarmer);
                          const travel = (vlcCommission && (new Date(endDate || new Date()) >= new Date(vlcCommission.effective_from))) ? (vlcCommission.type === 'Commission' 
                            ? (getTravelQuantity(currentFarmer) * parseFloat(vlcCommission.amount))
                            : parseFloat(vlcCommission.amount)
                          ) : 0;
                          return (net + travel) >= 0 ? 'text-green-600' : 'text-red-600';
                        })()}`}>
                          ₹{(() => {
                            const net = calculateNetPayable(currentFarmer);
                            const travel = (vlcCommission && (new Date(endDate || new Date()) >= new Date(vlcCommission.effective_from))) ? (vlcCommission.type === 'Commission' 
                              ? (getTravelQuantity(currentFarmer) * parseFloat(vlcCommission.amount))
                              : parseFloat(vlcCommission.amount)
                            ) : 0;
                            return (net + travel).toFixed(2);
                          })()}
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

      {/* Export Format Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>{t('export_options')}</DialogTitle>
            <DialogDescription>
              {t('choose_your_preferred_pdf_format')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup 
              value={exportFormat} 
              onValueChange={(val: any) => setExportFormat(val)}
              className="grid grid-cols-1 gap-4"
            >
              <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="detailed-horizontal" id="detailed-horizontal" />
                <Label htmlFor="detailed-horizontal" className="flex-1 cursor-pointer">
                  <div className="font-medium">1 Farmer Per Page (Horizontal)</div>
                  <div className="text-xs text-gray-500">Full details with date-wise split</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="2-per-page" id="2-per-page" />
                <Label htmlFor="2-per-page" className="flex-1 cursor-pointer">
                  <div className="font-medium">2 Farmers Per Page</div>
                  <div className="text-xs text-gray-500">Compact format, saves paper</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="3-per-page" id="3-per-page" />
                <Label htmlFor="3-per-page" className="flex-1 cursor-pointer">
                  <div className="font-medium">3 Farmers Per Page (Format 3)</div>
                  <div className="text-xs text-gray-500">Ultra compact vertical format</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              {t('cancel')}
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={() => {
                setShowExportModal(false);
                handleExport();
              }}
            >
              {t('export')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DynamicBillCycle;
