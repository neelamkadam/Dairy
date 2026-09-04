import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/config';
import { useAppSelector } from '@/redux/store';
import { toast } from 'react-toastify';
import { generateTemplate2, generateTemplate4, generateTemplate5MilkBill, generateTemplateDetailedHorizontal, FarmerBillData, BankDetails } from '@/templates/FarmerBillInvoiceTemplate';
import { generateFarmer2PerPage } from '@/templates/FarmerBill2PerPageTemplate';
import { bankSummaryApi } from '@/services/bankSummaryApi';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PdfLoader from '@/components/PdfLoader';
import { useTranslation } from 'react-i18next';
import { billApi } from '@/services/billApi';
import { bonusApi } from '@/services/bonusApi';
import { settingsApi } from '@/services/settingsApi';
import { reportsApi } from '@/services/reportsApi';
import { vlcCommissionApi } from '@/services/vlcCommissionApi';
import { generateTemplate3Farmers, FarmerReportData } from '@/templates/FarmerBillInvoiceTemplate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Pencil, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { userApi } from '@/services/userApi';
import { rateChartApi } from '@/services/rateChartApi';
import { collectionApi } from '@/services/collectionApi';
import { calculateCLRFromFatAndSNF } from '@/utils/milkCalculations';

interface CollectionRecord {
  date: string;
  shift: string;
  type: string;
  farmer_id: string;
  farmer_name: string;
  liters: string;
  fat: string;
  snf: string;
  clr: string;
  water: string;
  rate: string;
  amount: string;
}

interface FarmerBill {
  farmer_id: string;
  farmer_name: string;
  milk_total: number;
  received_total: number;
  net_payable: number;
  deductions: {
    advance: number;
    cattle_feed: number;
    other1: number;
    other2: number;
  };
}

interface FarmerPayment {
  id: number;
  farmer_id: string;
  farmer_name: string;
  payment_type: string;
  amount_taken: string;
  received: string;
  date: string;
}

const FarmerBillInvoiceReport = () => {
  const { t, i18n } = useTranslation();
  const branches = useAppSelector((state) => (state as any).branch.branches);
  const userId = useAppSelector((state) => (state as any).authData?.userData?.id);
  const hideRateAmount = userId === '7';
  const [selectedVLC, setSelectedVLC] = useState<string>('');
  const [language, setLanguage] = useState<string>(i18n.language || 'en');

  const selectedVlcObj = branches.find((b: any) => b.branch_id.toString() === selectedVLC);

  const calculateDateRange = (dateStr: string) => {
    if (!dateStr) return { from: '', to: '' };

    let year: number, month: number, day: number;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        [year, month, day] = parts.map(Number);
      } else {
        // DD-MM-YYYY
        [day, month, year] = parts.map(Number);
      }
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { from: '', to: '' };
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    }

    if (isNaN(year) || isNaN(month) || isNaN(day)) return { from: '', to: '' };

    const cycleDays = selectedVlcObj?.days || 10;
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
      from: `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    };
  };

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const handleFromDateChange = (newDate: string) => {
    const dates = calculateDateRange(newDate);
    setFromDate(dates.from);
    setToDate(dates.to);
  };
  useEffect(() => {
    if (branches.length > 0 && !selectedVLC) {
      setSelectedVLC(branches[0].branch_id.toString());
      // Initialize dates for the first branch
      const dates = calculateDateRange(new Date().toISOString().split("T")[0]);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
  }, [branches]);

  useEffect(() => {
    if (selectedVLC) {
      const dates = calculateDateRange(fromDate || new Date().toISOString().split('T')[0]);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
  }, [selectedVLC, branches]);

  const [farmerCode, setFarmerCode] = useState<string>('');
  const [collectionData, setCollectionData] = useState<CollectionRecord[]>([]);
  const [farmerBills, setFarmerBills] = useState<any[]>([]);
  const [farmerPayments, setFarmerPayments] = useState<any[]>([]);
  const [vlcCommission, setVlcCommission] = useState<any>(null);
  const [bankDetailsMap, setBankDetailsMap] = useState<Map<string, BankDetails>>(new Map());
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'1-per-page' | '2-per-page' | '3-per-page' | 'detailed-horizontal' | 'format-4' | 'format-5'>('1-per-page');

  // Edit Collection State
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editCollection, setEditCollection] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    quantity: '',
    fat: '',
    snf: '',
    rate: '',
    amount: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingFarmerData, setEditingFarmerData] = useState<any>(null);
  // Effective date of the collection being edited (yyyy-MM-dd) — rate charts are
  // versioned by effective_date, so the rate must always be resolved against the
  // day of the collection, never today.
  const [editEffectiveDate, setEditEffectiveDate] = useState<string>('');
  const [editCollectionTime, setEditCollectionTime] = useState<string>('');
  const [rateLoading, setRateLoading] = useState(false);
  const [rateUnavailable, setRateUnavailable] = useState(false);
  const rateRequestRef = useRef(0);

  // Pull "HH:mm:ss" out of whatever date shape the API returns, so an update keeps
  // the original entry time instead of stamping it with the current time.
  const extractTime = (value: unknown): string => {
    const raw = String(value ?? '');
    // ISO timestamps carry a timezone — convert to local before taking the clock time.
    if (/\d{4}-\d{2}-\d{2}T/.test(raw)) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) return format(parsed, 'HH:mm:ss');
    }
    const match = raw.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return format(new Date(), 'HH:mm:ss');
    return `${match[1]}:${match[2]}:${match[3] || '00'}`;
  };

  const resetEditState = () => {
    setEditCollection(null);
    setEditingFarmerData(null);
    setEditEffectiveDate('');
    setEditCollectionTime('');
    setEditFormData({ quantity: '', fat: '', snf: '', rate: '', amount: '' });
    setRateLoading(false);
    setRateUnavailable(false);
    rateRequestRef.current += 1;
  };

  const handleEditShift = async (fId: string, dateStr: string, shiftToEdit: 'Morning' | 'Evening', milkType: string) => {
    resetEditState();
    setEditSheetOpen(true);
    setEditLoading(true);
    try {
      const [d, m, y] = dateStr.split('-');
      const apiDate = `${y}-${m}-${d}`;

      const response = await collectionApi.getTodaysCollectionByFarmer(Number(selectedVLC), fId, apiDate);

      const collections = response.data || [];
      const collection = collections.find((c: any) => c.shift === shiftToEdit && (c.type === milkType || c.milkType === milkType));

      if (!collection) {
        toast.error(t('no_record'));
        setEditSheetOpen(false);
        return;
      }

      const farmerInfo = await userApi.getById(fId, Number(selectedVLC));

      setEditCollection(collection);
      setEditingFarmerData(farmerInfo);
      setEditEffectiveDate(apiDate);
      setEditCollectionTime(extractTime(collection.date || collection.created_at || response.date));
      setEditFormData({
        quantity: collection.quantity?.toString() || collection.qty?.toString() || '',
        fat: collection.fat?.toString() || '',
        snf: collection.snf?.toString() || '',
        rate: collection.rate?.toString() || '',
        amount: collection.amount?.toString() || ''
      });

    } catch (error) {
      console.error(error);
      toast.error(t('oops_something_went_wrong'));
      setEditSheetOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editCollection || !editFormData.quantity || !editFormData.fat || !editFormData.snf) {
      toast.error(t('please_fill_required_fields'));
      return;
    }

    if (rateLoading) {
      toast.error(t('please_wait_fetching_rate'));
      return;
    }

    const rate = parseFloat(editFormData.rate);
    if (!editFormData.rate || Number.isNaN(rate)) {
      toast.error(t('rate_not_available_for_fat_snf'));
      return;
    }

    setEditSaving(true);
    try {
      const qty = parseFloat(editFormData.quantity);
      const fat = parseFloat(editFormData.fat);
      const snf = parseFloat(editFormData.snf);
      const amt = qty * rate;
      const clr = calculateCLRFromFatAndSNF(fat.toString(), snf.toString());

      const payload = {
        ...editCollection,
        farmer_id: editCollection.farmer_id || editCollection.userId,
        dairy_id: editCollection.dairy_id || selectedVLC,
        quantity: qty,
        fat,
        snf,
        clr: parseFloat(clr || '0'),
        rate,
        amount: amt,
        // Keep the collection on its own day — never re-stamp it with today.
        date: `${editEffectiveDate} ${editCollectionTime}`
      };

      await collectionApi.update(editCollection.id, payload);
      toast.success(t('collection_updated_successfully'));
      setEditSheetOpen(false);
      resetEditState();
      handleShow();
    } catch (error) {
      console.error(error);
      toast.error(t('oops_something_went_wrong'));
    } finally {
      setEditSaving(false);
    }
  };

  // Rate is fully derived: any change to FAT/SNF (or the collection's effective date)
  // blanks it immediately, shows a loader, and refetches on a debounce. Save stays
  // disabled until a rate comes back.
  useEffect(() => {
    if (!editSheetOpen || !editCollection) return;

    const fat = editFormData.fat;
    const snf = editFormData.snf;
    const requestId = rateRequestRef.current + 1;
    rateRequestRef.current = requestId;

    setEditFormData(prev => (prev.rate === '' ? prev : { ...prev, rate: '' }));
    setRateUnavailable(false);

    if (!fat || !snf || !editingFarmerData?.rateChart || !editEffectiveDate) {
      setRateLoading(false);
      return;
    }

    setRateLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await rateChartApi.getRate(
          parseFloat(fat),
          parseFloat(snf),
          Number(selectedVLC),
          editingFarmerData.rateChart,
          editCollection.type || editCollection.milkType || 'Cow',
          editEffectiveDate,
          editCollection.shift
        );

        // Ignore a response that a newer keystroke has already superseded.
        if (rateRequestRef.current !== requestId) return;

        const price = parseFloat(response?.price);
        if (response?.price !== undefined && response?.price !== null && !Number.isNaN(price)) {
          setEditFormData(prev => ({ ...prev, rate: price.toString() }));
        } else {
          setRateUnavailable(true);
        }
      } catch (error) {
        console.error(error);
        if (rateRequestRef.current !== requestId) return;
        setRateUnavailable(true);
      } finally {
        if (rateRequestRef.current === requestId) setRateLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    editSheetOpen,
    editFormData.fat,
    editFormData.snf,
    editingFarmerData,
    editEffectiveDate,
    editCollection,
    selectedVLC
  ]);

  // Amount follows quantity × rate without touching the rate lookup.
  useEffect(() => {
    const qty = parseFloat(editFormData.quantity);
    const rate = parseFloat(editFormData.rate);
    const amount = Number.isNaN(qty) || Number.isNaN(rate) ? '' : (qty * rate).toFixed(2);
    setEditFormData(prev => (prev.amount === amount ? prev : { ...prev, amount }));
  }, [editFormData.quantity, editFormData.rate]);

  const [milkTypeFilter, setMilkTypeFilter] = useState<'All' | 'Cow' | 'Buffalo'>('All');

  const handleShow = async () => {
    if (!selectedVLC || !fromDate || !toDate) {
      toast.error(t('please_select_vlc_center_and_date_range'));
      return;
    }

    setLoading(true);
    try {
      const selectedBranch = branches.find(b => b.branch_id.toString() === selectedVLC);
      // @ts-ignore
      const dairyId = selectedBranch?.branch_id || selectedBranch?.id;

      const apiUrl = '/report/shift-collection-report';
      const params = {
        dairyid: dairyId,
        startDate: fromDate,
        startShift: 'Morning',
        endDate: toDate,
        endShift: 'Evening',
        milkType: milkTypeFilter
      };

      const [collectionResponse, billsRes, commSettings, bankResponse] = await Promise.all([
        api.get(apiUrl, { params }),
        billApi.getFarmerReport({ dairy_id: dairyId, start_date: fromDate, end_date: toDate }),
        fetchVlcCommissionSettings(selectedVLC),
        bankSummaryApi.getBankSummary({
          dairy_id: selectedVLC,
          start_date: format(new Date(fromDate), 'yyyy-MM-dd'),
          end_date: format(new Date(toDate), 'yyyy-MM-dd')
        })
      ]);

      let filteredData = collectionResponse.data.report || [];
      if (farmerCode.trim()) {
        const paddedCode = farmerCode.padStart(4, '0');
        filteredData = filteredData.filter((item: CollectionRecord) => item.farmer_id === paddedCode);
      }

      filteredData.sort((a: CollectionRecord, b: CollectionRecord) => parseInt(a.farmer_id) - parseInt(b.farmer_id));

      let finalFilteredData = filteredData;
      if (milkTypeFilter !== 'All') {
        finalFilteredData = filteredData.filter((item: CollectionRecord) => item.type === milkTypeFilter);
      }

      setCollectionData(finalFilteredData);

      let filteredBills = billsRes.data;
      if (milkTypeFilter === 'Cow' && filteredBills.cow) {
        filteredBills = filteredBills.cow;
      } else if (milkTypeFilter === 'Buffalo' && filteredBills.buffalo) {
        filteredBills = filteredBills.buffalo;
      } else if (milkTypeFilter === 'All') {
        const cowBills = filteredBills.cow || [];
        const buffBills = filteredBills.buffalo || [];
        filteredBills = [...cowBills, ...buffBills];
      }

      setFarmerBills(filteredBills as any);
      setFarmerPayments(billsRes.data.farmer_payments || []);
      setVlcCommission(commSettings);

      const bankMap = new Map<string, BankDetails>();
      (bankResponse.data || []).forEach((farmer: any) => {
        bankMap.set(farmer.farmer_id, {
          accountNumber: farmer.accountNumber,
          ifscCode: farmer.ifscCode,
          bankName: farmer.bankName,
          branchName: farmer.branchName
        });
      });
      setBankDetailsMap(bankMap);

      setCurrentPage(0);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(t('failed_to_fetch_data_with_reason', { message: error.response?.data?.message || error.message }));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calculateTotals = () => {
    let cowLiters = 0, cowAmount = 0, cowWeightedFat = 0, cowWeightedSnf = 0;
    let buffaloLiters = 0, buffaloAmount = 0, buffaloWeightedFat = 0, buffaloWeightedSnf = 0;

    collectionData.forEach(item => {
      const liters = parseFloat(item.liters || '0');
      const amount = parseFloat(item.amount || '0');
      const fat = parseFloat(item.fat || '0');
      const snf = parseFloat(item.snf || '0');

      if (item.type === 'Cow') {
        cowLiters += liters;
        cowAmount += amount;
        cowWeightedFat += fat * liters;
        cowWeightedSnf += snf * liters;
      } else if (item.type === 'Buffalo') {
        buffaloLiters += liters;
        buffaloAmount += amount;
        buffaloWeightedFat += fat * liters;
        buffaloWeightedSnf += snf * liters;
      }
    });

    const totalLiters = cowLiters + buffaloLiters;
    const totalAmount = cowAmount + buffaloAmount;

    return {
      cowLiters,
      cowAmount,
      buffaloLiters,
      buffaloAmount,
      totalLiters,
      totalAmount,
      averageFat: totalLiters > 0 ? (cowWeightedFat + buffaloWeightedFat) / totalLiters : 0,
      averageSnf: totalLiters > 0 ? (cowWeightedSnf + buffaloWeightedSnf) / totalLiters : 0
    };
  };

  const groupByFarmer = () => {
    const grouped: { [key: string]: CollectionRecord[] } = {};
    collectionData.forEach(item => {
      if (!grouped[item.farmer_id]) grouped[item.farmer_id] = [];
      grouped[item.farmer_id].push(item);
    });
    return grouped;
  };

  const generatePage = async (htmlContent: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        windowWidth: 794, // Approx 210mm at 96 DPI
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
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // JPEG = much smaller than PNG
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      return { imgData, imgWidth, imgHeight };
    } finally {
      document.body.removeChild(tempDiv);
    }
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
  const fetchBonusMap = async (dairyId: number): Promise<Map<string, any>> => {
    try {
      const bonusResponse = await bonusApi.getBonusDeductions({
        dairy_id: dairyId,
        start_date: fromDate,
        end_date: toDate,
      });
      const bonusMap = new Map<string, any>();
      (bonusResponse.data.data || []).forEach((entry: any) => {
        const existing = bonusMap.get(entry.farmer_id);
        // Keep the latest entry (highest id)
        if (!existing || entry.id > existing.id) {
          bonusMap.set(entry.farmer_id, entry);
        }
      });
      return bonusMap;
    } catch {
      return new Map(); // Graceful fallback — no bonus data
    }
  };

  // Helper: attach bonus_deduction_info to a farmer object using the bonus map
  const attachBonus = (farmer: any, bonusMap: Map<string, any>, totalQty: number) => {
    const entry = bonusMap.get(farmer.farmer_id);
    if (!entry) return { ...farmer, bonus_deduction_info: null };
    const periodEnd = new Date(toDate);
    const effectiveFrom = new Date(entry.effective_from);
    if (periodEnd <= effectiveFrom) return { ...farmer, bonus_deduction_info: null };
    return {
      ...farmer,
      bonus_deduction_info: {
        bonus_amount: parseFloat(entry.bonus_deduction || 0),   // per-liter rate
        fixed_amount: parseFloat(entry.fixed_deduction || 0),
        remark: entry.remark || 'इमारत निधी',
        total_bonus_till_date: 0  // cumulative handled by bonus_deduction_logs_summary
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
    return payments.map((p: any) => {
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
  };

  const fetchVlcCommissionSettings = async (vlcId: string) => {
    if (!vlcId || !fromDate || !toDate) return null;
    try {
      const response = await reportsApi.getVlcCommissionReport({
        vlc_id: vlcId,
        start_date: fromDate,
        end_date: toDate
      });
      if (response.success && response.data && response.data.length > 0) {
        const vlc = response.data[0];
        const travelComm = vlc.commissions.find((c: any) => c.type === 'Commission' || c.type === 'Fixed' || c.type === 'Travel');
        if (travelComm) {
          return { ...travelComm, effective_from: travelComm.effective_from };
        }
        return null;
      }
    } catch (error) {
      console.error('Error fetching VLC commission:', error);
    }
    return null;
  };

  // ── Fetch all farmer-specific commissions for a VLC and return a map keyed by farmer_id ──
  const fetchFarmerCommissionMap = async (vlcId: string): Promise<Map<string, any>> => {
    try {
      const res = await vlcCommissionApi.getByVlcc(vlcId);
      const records: any[] = res.data?.data ?? [];
      const map = new Map<string, any>();
      // API returns DESC order → first occurrence is the latest (active) for each farmer
      records.forEach((r) => {
        if (!r.farmer_id) return;
        // Store milk-type-specific record when milk_type is present (e.g. "F001_Cow")
        const typedKey = r.milk_type ? `${r.farmer_id}_${r.milk_type}` : r.farmer_id;
        if (!map.has(typedKey)) map.set(typedKey, r);
        // Also keep a generic fallback keyed by farmer_id alone (first = latest, API DESC)
        if (!map.has(r.farmer_id)) map.set(r.farmer_id, r);
      });
      return map;
    } catch {
      return new Map();
    }
  };

  // ── Resolve the commission to use for a farmer:
  //    1. farmer-specific record (farmer_id match)  → preferred
  //    2. VLC-level commission (vlcComm)             → fallback
  // Returns a normalised object { type, amount, effective_from } or null.
  const resolveFarmerCommission = (
    farmerId: string,
    milkType: string,
    farmerCommMap: Map<string, any>,
    vlcComm: any | null
  ): { type: string; amount: string; effective_from: string } | null => {
    // Prefer milk-type-specific record (e.g. "F001_Cow"), fall back to generic farmer record
    const farmerRecord = farmerCommMap.get(`${farmerId}_${milkType}`) ?? farmerCommMap.get(farmerId);
    if (farmerRecord) {
      return {
        type: farmerRecord.type,          // 'Commission' | 'Fixed'
        amount: farmerRecord.amount,
        effective_from: farmerRecord.effective_from
      };
    }
    if (vlcComm) {
      return {
        type: vlcComm.type,
        amount: vlcComm.amount,
        effective_from: vlcComm.effective_from
      };
    }
    return null;
  };

  // ── Build the travel_commission payload for a template from a resolved commission + liters ──
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

  const exportToPDF = async (templateFn: typeof generateTemplate2 = generateTemplate2) => {
    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(v => v.branch_id.toString() === selectedVLC);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.username || '';
      const branchName = selectedBranch?.branchName || '';
      // @ts-ignore
      const dairyId = selectedBranch?.branch_id || selectedBranch?.id;

      // Fetch farmer data, bonus data, report language, and commissions in parallel
      const [response, bonusMap, reportLang, vlcComm, farmerCommMap] = await Promise.all([
        billApi.getFarmerReport({ dairy_id: dairyId, start_date: fromDate, end_date: toDate }),
        fetchBonusMap(dairyId),
        fetchReportLanguage(selectedVLC),
        fetchVlcCommissionSettings(selectedVLC),
        fetchFarmerCommissionMap(selectedVLC)
      ]);

      if (!response.data.success) {
        toast.error(t('failed_to_fetch_farmer_report_data'));
        return;
      }

      let farmerData: FarmerReportData[] = [];
      if (milkTypeFilter === 'All') {
        const cowData: FarmerReportData[] = response.data.cow || [];
        const buffaloData: FarmerReportData[] = response.data.buffalo || [];
        farmerData = [...cowData, ...buffaloData];
      } else if (milkTypeFilter === 'Cow') {
        farmerData = response.data.cow || [];
      } else if (milkTypeFilter === 'Buffalo') {
        farmerData = response.data.buffalo || [];
      }

      // Create a map of farmer_id to complete farmer data (including farmer_details)
      const farmerDataMap = new Map();
      farmerData.forEach(farmer => {
        if (!farmerDataMap.has(farmer.farmer_id)) {
          farmerDataMap.set(farmer.farmer_id, farmer);
        } else {
          // Merge collections if farmer exists in both cow and buffalo (only for 'All' filter)
          if (milkTypeFilter === 'All') {
            const existing = farmerDataMap.get(farmer.farmer_id);
            existing.collections = [...existing.collections, ...farmer.collections];
          }
        }
      });

      let pdf = new jsPDF('p', 'mm', 'a4');
      const farmerIds = Array.from(farmerDataMap.keys());

      // Filter by farmerCode if specified
      const filteredFarmerIds = farmerCode.trim()
        ? farmerIds.filter(id => id === farmerCode.padStart(4, '0'))
        : farmerIds.sort((a, b) => parseInt(a) - parseInt(b));

      if (filteredFarmerIds.length === 0) {
        toast.info(t('no_data_found_for_selected_criteria'));
        return;
      }


      const BATCH_SIZE = 50;

      for (let i = 0; i < filteredFarmerIds.length; i++) {
        const farmerId = filteredFarmerIds[i];
        const farmerInfo = farmerDataMap.get(farmerId);

        // Convert collections to FarmerBillData format
        let templateDataItems: FarmerBillData[] = farmerInfo.collections;

        // Filter collections by milk type if not 'All'
        if (milkTypeFilter !== 'All') {
          templateDataItems = farmerInfo.collections.filter((c: any) => c.type === milkTypeFilter);
        }

        templateDataItems = templateDataItems
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((item: any) => ({
            date: item.created_at,
            shift: item.shift,
            type: item.type,
            liters: parseFloat(item.quantity),
            fat: parseFloat(item.fat),
            snf: parseFloat(item.snf),
            clr: parseFloat(item.clr),
            water: item.water ? parseFloat(item.water) : null,
            rate: parseFloat(item.rate),
            amount: parseFloat(item.amount),
            farmer_id: item.farmer_id,
            farmer_name: farmerInfo.farmer_details?.fullName || farmerId
          }));

        // Format 4 (Anamat) uses the latest bonus/fixed deduction as-is,
        // without the effective_from period check applied by attachBonus
        const rawBonusEntry = bonusMap.get(farmerId);
        const format4BonusInfo = rawBonusEntry ? {
          bonus_amount: parseFloat(rawBonusEntry.bonus_deduction || 0),
          fixed_amount: parseFloat(rawBonusEntry.fixed_deduction || 0),
          remark: rawBonusEntry.remark || 'इमारत निधी',
          total_bonus_till_date: 0
        } : null;

        const baseParams = {
          dairyName: dairyName,
          branchName: branchName,
          dairyCode: dairyCode,
          farmerCode: farmerId,
          farmerName: farmerInfo.farmer_details?.fullName || farmerId,
          fromDate: fromDate,
          toDate: toDate,
          milkType: milkTypeFilter,
          data: templateDataItems,
          payments: getNormalizedPayments(farmerInfo),
          current_bill: farmerInfo.current_bill,
          previous_bill: farmerInfo.previous_bill,
          bonus_deduction_info: templateFn === generateTemplate4
            ? format4BonusInfo
            : attachBonus(farmerInfo, bonusMap, templateDataItems.reduce((s, i) => s + i.liters, 0)).bonus_deduction_info,
          bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary,
          bankDetails: farmerInfo.farmer_details ? {
            accountNumber: farmerInfo.farmer_details.accountNumber,
            ifscCode: farmerInfo.farmer_details.ifscCode,
            bankName: farmerInfo.farmer_details.bankName,
          } : undefined,
          hideRateAmount: hideRateAmount
        };

        // Check for mixed types (only relevant when milkTypeFilter is 'All').
        // Format 5 (Milk Bill) keeps both types on one page, so it never splits.
        const hasCow = templateDataItems.some(item => item.type === 'Cow');
        const hasBuffalo = templateDataItems.some(item => item.type === 'Buffalo');
        const isMixed = milkTypeFilter === 'All' && hasCow && hasBuffalo && templateFn !== generateTemplate5MilkBill;

        if (isMixed) {
          const cowItems = templateDataItems.filter(i => i.type === 'Cow');
          const buffaloItems = templateDataItems.filter(i => i.type === 'Buffalo');

          const cowComm = resolveFarmerCommission(farmerId, 'Cow', farmerCommMap, vlcComm);
          const buffComm = resolveFarmerCommission(farmerId, 'Buffalo', farmerCommMap, vlcComm);
          const cowLiters = cowItems.reduce((s, i) => s + i.liters, 0);
          const buffLiters = buffaloItems.reduce((s, i) => s + i.liters, 0);

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

          // 1. Cow Page (Header YES, Summary NO)
          const cowHtml = templateFn({
            ...baseParams,
            milkType: 'Cow',
            hideHeader: false,
            hideSummary: true,
            travel_commission: buildTravelCommission(cowComm, cowLiters)
          }, reportLang);
          const cowPage = await generatePage(cowHtml);
          if (i > 0) pdf.addPage();
          else if (pdf.getNumberOfPages() > 1) pdf.addPage();

          pdf.addImage(cowPage.imgData, 'JPEG', 0, 0, cowPage.imgWidth, cowPage.imgHeight);

          // 2. Buffalo Page (Header NO, Summary YES — combined cow+buffalo travel commission)
          const buffaloHtml = templateFn({
            ...baseParams,
            milkType: 'Buffalo',
            hideHeader: true,
            hideSummary: false,
            travel_commission: combinedTravelComm
          }, reportLang);
          const buffaloPage = await generatePage(buffaloHtml);
          pdf.addPage();
          pdf.addImage(buffaloPage.imgData, 'JPEG', 0, 0, buffaloPage.imgWidth, buffaloPage.imgHeight);

        } else {
          // Detect actual milk type for single-type farmers (milkTypeFilter may be 'All')
          const actualMilkType = milkTypeFilter !== 'All' ? milkTypeFilter : (templateDataItems[0]?.type || 'Cow');
          const htmlContent = templateFn({
            ...baseParams,
            milkType: milkTypeFilter,
            travel_commission: buildTravelCommission(
              resolveFarmerCommission(farmerId, actualMilkType, farmerCommMap, vlcComm),
              templateDataItems.reduce((s, i) => s + i.liters, 0)
            )
          }, reportLang);
          const page = await generatePage(htmlContent);

          if (i > 0) pdf.addPage();
          pdf.addImage(page.imgData, 'JPEG', 0, 0, page.imgWidth, page.imgHeight);
        }

        // Save in batches to avoid memory issues
        if ((i + 1) % BATCH_SIZE === 0 && i < filteredFarmerIds.length - 1) {
          pdf.save(`Farmer_Bill_${fromDate}_to_${toDate}_Part${Math.floor(i / BATCH_SIZE) + 1}.pdf`);
          pdf = new jsPDF('p', 'mm', 'a4');
        }
      }

      pdf.save(`Farmer_Bill_${fromDate}_to_${toDate}.pdf`);
      toast.success(t('pdf_downloaded_successfully'));
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error(t('failed_to_generate_pdf'));
    } finally {
      setPdfLoading(false);
    }
  };

  const exportMultiPerPagePDF = async (chunkSize: number) => {
    if (!selectedVLC || !fromDate || !toDate) {
      toast.error(t('please_select_vlc_center_and_date_range'));
      return;
    }

    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(v => v.branch_id.toString() === selectedVLC);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.name || '';
      const branchName = selectedBranch?.branchName || '';
      // @ts-ignore
      const dairyId = selectedBranch?.branch_id || selectedBranch?.id;

      // Fetch farmer data, bonus data, report language, and commissions in parallel
      const [response, bonusMap, reportLang, vlcComm, farmerCommMap] = await Promise.all([
        billApi.getFarmerReport({ dairy_id: dairyId, start_date: fromDate, end_date: toDate }),
        fetchBonusMap(dairyId),
        fetchReportLanguage(selectedVLC),
        fetchVlcCommissionSettings(selectedVLC),
        fetchFarmerCommissionMap(selectedVLC)
      ]);

      if (!response.data.success) {
        toast.error(t('failed_to_fetch_farmer_report_data'));
        return;
      }

      const cowData: FarmerReportData[] = response.data.cow || [];
      const buffaloData: FarmerReportData[] = response.data.buffalo || [];

      // Build ordered list — cow and buffalo kept SEPARATE (not merged)
      // Each entry contains only ONE type's collections → template shows separate tables
      let allData: any[] = [];

      if (milkTypeFilter === 'All') {
        // For each farmer: cow entry first (no deductions), buffalo entry second (with combined deductions)
        const cowIds = new Set(cowData.map(f => f.farmer_id));
        const buffaloIds = new Set(buffaloData.map(f => f.farmer_id));
        const allIds = new Set([...cowIds, ...buffaloIds]);
        const sortedIds = Array.from(allIds).sort((a, b) => parseInt(a) - parseInt(b));
        sortedIds.forEach(id => {
          const cow = cowData.find(f => f.farmer_id === id);
          const buffalo = buffaloData.find(f => f.farmer_id === id);
          const isMixed = !!(cow && buffalo); // farmer has BOTH types
          if (cow) {
            const withBonus = attachBonus(cow, bonusMap, cow.collections_summary?.total_quantity || 0);
            allData.push({ ...withBonus, _displayMilkType: 'Cow', _hideDeductions: isMixed });
          }
          if (buffalo) {
            const withBonus = attachBonus(buffalo, bonusMap, buffalo.collections_summary?.total_quantity || 0);
            // When mixed, buffalo entry carries combined milk total for accurate deduction display
            const combinedLiters = isMixed
              ? (cow!.collections_summary?.total_quantity || 0) + (buffalo.collections_summary?.total_quantity || 0)
              : buffalo.collections_summary?.total_quantity || 0;
            const combinedAmount = isMixed
              ? (cow!.collections_summary?.total_amount || 0) + (buffalo.collections_summary?.total_amount || 0)
              : 0;
            allData.push({ ...withBonus, _displayMilkType: 'Buffalo', _hideDeductions: false, _combinedTotalQty: combinedLiters, _combinedTotalAmount: combinedAmount });
          }
        });
      } else if (milkTypeFilter === 'Cow') {
        allData = cowData
          .sort((a, b) => parseInt(a.farmer_id) - parseInt(b.farmer_id))
          .map(f => ({ ...attachBonus(f, bonusMap, f.collections_summary?.total_quantity || 0), _displayMilkType: 'Cow', _hideDeductions: false }));
      } else {
        allData = buffaloData
          .sort((a, b) => parseInt(a.farmer_id) - parseInt(b.farmer_id))
          .map(f => ({ ...attachBonus(f, bonusMap, f.collections_summary?.total_quantity || 0), _displayMilkType: 'Buffalo', _hideDeductions: false }));
      }

      if (allData.length === 0) {
        toast.info(t('no_data_found_for_selected_period'));
        return;
      }

      // Enrich payments with payment_logs data (same as detailed horizontal format)
      const enrichedData = allData.map((farmer) => {
        return {
          ...farmer,
          payments: getNormalizedPayments(farmer)
        };
      });

      const pdf = new jsPDF('p', 'mm', 'a4');

      // --- Filter by farmerCode if explicitly entered ---
      const filteredData = farmerCode.trim()
        ? enrichedData.filter(f => f.farmer_id === farmerCode.padStart(4, '0'))
        : enrichedData;

      if (filteredData.length === 0) {
        toast.info(t('no_data_found_for_selected_farmer_or_criteria'));
        return;
      }

      for (let i = 0; i < filteredData.length; i += chunkSize) {
        const chunk = filteredData.slice(i, i + chunkSize);

        const farmersWithComm = chunk.map(farmer => ({
          ...farmer,
          travel_commission: buildTravelCommission(
            resolveFarmerCommission(farmer.farmer_id, farmer._displayMilkType || milkTypeFilter, farmerCommMap, vlcComm),
            farmer.collections_summary?.total_quantity || 0
          )
        }));

        let htmlContent = "";
        if (chunkSize === 3) {
          htmlContent = generateTemplate3Farmers({
            dairyName: dairyName,
            dairyCode: dairyCode,
            branchName: branchName,
            farmers: farmersWithComm,
            fromDate: formatDate(fromDate),
            toDate: formatDate(toDate),
            hideRateAmount: hideRateAmount,
            bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary
          }, reportLang);
        } else {
          htmlContent = generateFarmer2PerPage({
            dairyName: dairyName,
            branchName: branchName,
            farmers: farmersWithComm,
            fromDate: formatDate(fromDate),
            toDate: formatDate(toDate),
            hideRateAmount: hideRateAmount,
            language: reportLang,
            bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary || null
          });
        }

        const { imgData, imgWidth, imgHeight } = await generatePage(htmlContent);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`Farmer_Bill_Report_${chunkSize}perPage_${fromDate}_to_${toDate}.pdf`);
      toast.success(t('pdf_downloaded_successfully'));

    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(t('failed_to_generate_pdf'));
    } finally {
      setPdfLoading(false);
    }
  };

  const exportDetailedHorizontalPDF = async () => {
    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(v => v.branch_id.toString() === selectedVLC);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.name || '';
      const branchName = selectedBranch?.branchName || '';
      // @ts-ignore
      const dairyId = selectedBranch?.branch_id || selectedBranch?.id;

      // Fetch farmer data, bonus data, report language, and commissions in parallel
      const [response, bonusMap, reportLang, vlcComm, farmerCommMap] = await Promise.all([
        billApi.getFarmerReport({ dairy_id: dairyId, start_date: fromDate, end_date: toDate }),
        fetchBonusMap(dairyId),
        fetchReportLanguage(selectedVLC),
        fetchVlcCommissionSettings(selectedVLC),
        fetchFarmerCommissionMap(selectedVLC)
      ]);

      if (!response.data.success) {
        toast.error(t('failed_to_fetch_farmer_report_data'));
        return;
      }

      let farmerData: FarmerReportData[] = [];
      if (milkTypeFilter === 'All') {
        const cowData: FarmerReportData[] = response.data.cow || [];
        const buffaloData: FarmerReportData[] = response.data.buffalo || [];
        farmerData = [...cowData, ...buffaloData];
      } else if (milkTypeFilter === 'Cow') {
        farmerData = response.data.cow || [];
      } else if (milkTypeFilter === 'Buffalo') {
        farmerData = response.data.buffalo || [];
      }

      const farmerMap = new Map<string, FarmerReportData>();

      farmerData.forEach(farmer => {
        if (farmerMap.has(farmer.farmer_id)) {
          if (milkTypeFilter === 'All') {
            const existing = farmerMap.get(farmer.farmer_id)!;
            existing.collections = [...existing.collections, ...farmer.collections];
          }
        } else {
          farmerMap.set(farmer.farmer_id, { ...farmer });
        }
      });

      // --- Filter by farmerCode if explicitly entered ---
      const sortedFarmers = Array.from(farmerMap.values())
        .sort((a, b) => parseInt(a.farmer_id) - parseInt(b.farmer_id))
        .filter(f => !farmerCode.trim() || f.farmer_id === farmerCode.padStart(4, '0'));

      if (sortedFarmers.length === 0) {
        toast.info(t('no_data_found_for_selected_farmer_or_criteria'));
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      for (let i = 0; i < sortedFarmers.length; i++) {
        const farmer = sortedFarmers[i];
        // Filter collections by milk type if not 'All'
        let filteredCollections = farmer.collections;
        if (milkTypeFilter !== 'All') {
          filteredCollections = farmer.collections.filter((c: any) => c.type === milkTypeFilter);
        }

        const farmerBillData: FarmerBillData[] = filteredCollections.map(c => ({
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
          fromDate,
          toDate,
          milkType: milkTypeFilter,
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
          bonus_deduction_info: attachBonus(farmer, bonusMap, farmer.collections_summary?.total_quantity || 0).bonus_deduction_info,
          bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary || null,
          travel_commission: buildTravelCommission(
            resolveFarmerCommission(
              farmer.farmer_id,
              milkTypeFilter !== 'All' ? milkTypeFilter : (farmerBillData[0]?.type || 'Cow'),
              farmerCommMap,
              vlcComm
            ),
            farmerBillData.reduce((s, i) => s + i.liters, 0)
          )
        };

        const hasCow = farmerBillData.some(d => d.type === 'Cow');
        const hasBuffalo = farmerBillData.some(d => d.type === 'Buffalo' || d.type === 'Buffaloes');

        if (hasCow && hasBuffalo) {
          const cowBillData = farmerBillData.filter(d => d.type === 'Cow');
          const buffaloBillData = farmerBillData.filter(d => d.type === 'Buffalo' || (d.type as string) === 'Buffaloes');

          const cowComm = resolveFarmerCommission(farmer.farmer_id, 'Cow', farmerCommMap, vlcComm);
          const buffComm = resolveFarmerCommission(farmer.farmer_id, 'Buffalo', farmerCommMap, vlcComm);
          const cowLiters = cowBillData.reduce((s, i) => s + i.liters, 0);
          const buffLiters = buffaloBillData.reduce((s, i) => s + i.liters, 0);

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

          // Page 1: Cow only, hide summary
          const cowHtml = generateTemplateDetailedHorizontal({
            ...templateData,
            renderOnly: 'Cow',
            hideSummary: true,
            travel_commission: buildTravelCommission(cowComm, cowLiters)
          } as any, reportLang);
          const cowPage = await generatePage(cowHtml);
          if (i > 0) pdf.addPage();
          pdf.addImage(cowPage.imgData, 'JPEG', 0, 0, cowPage.imgWidth, cowPage.imgHeight);

          // Page 2: Buffalo only, show summary — combined cow+buffalo travel commission
          const buffHtml = generateTemplateDetailedHorizontal({
            ...templateData,
            renderOnly: 'Buffalo',
            hideSummary: false,
            travel_commission: combinedTravelComm
          } as any, reportLang);
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
      pdf.save(`Detailed_Horizontal_Bills_${fromDate}_${toDate}.pdf`);
      toast.success(t('detailed_pdf_downloaded_successfully'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('failed_to_generate_detailed_pdf'));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExport = () => {
    if ((exportFormat === '1-per-page' || exportFormat === 'format-4' || exportFormat === 'format-5') && collectionData.length === 0) {
      toast.error(t('please_click_show_first_for_detailed_report'));
      return;
    }
    setShowExportModal(false);
    if (exportFormat === 'detailed-horizontal') {
      exportDetailedHorizontalPDF();
    } else if (exportFormat === '1-per-page') {
      exportToPDF();
    } else if (exportFormat === 'format-4') {
      exportToPDF(generateTemplate4);
    } else if (exportFormat === 'format-5') {
      exportToPDF(generateTemplate5MilkBill);
    } else if (exportFormat === '2-per-page') {
      exportMultiPerPagePDF(1);
    } else {
      exportMultiPerPagePDF(3);
    }
  };

  return (
    <div className="p-2 sm:p-4 bg-gray-50 min-h-screen text-left">
      <PdfLoader isLoading={pdfLoading} />
      {/* Header */}
      <div className="flex flex-col items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 px-2 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          {t('farmer_bill_invoice_report')}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
        <div>
          <Label>{t('vlcc_center')}</Label>
          <VLCDropdown
            branches={branches || []}
            value={selectedVLC}
            onChange={setSelectedVLC}
            valueKey="branch_id"
            placeholder={t('select_vlc_center')}
          />
        </div>

        <div>
          <Label>{t('from_date')}</Label>
          <Input type="date" value={fromDate} onChange={(e) => handleFromDateChange(e.target.value)} />
        </div>

        <div>
          <Label>{t('to_date')}</Label>
          <Input type="date" value={toDate} disabled className="bg-gray-100 cursor-not-allowed" />
        </div>

        <div>
          <Label>{t('farmer_code_optional')}</Label>
          <Input placeholder={t('enter_code')} value={farmerCode} onChange={(e) => setFarmerCode(e.target.value)} />
        </div>

        <div>
          <Label>{t('milk_type')}</Label>
          <Select value={milkTypeFilter} onValueChange={(value: 'All' | 'Cow' | 'Buffalo') => setMilkTypeFilter(value)}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="All">{t('all')}</SelectItem>
              <SelectItem value="Cow">{t('cow')}</SelectItem>
              <SelectItem value="Buffalo">{t('buffalo')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="xl:col-span-5 flex flex-wrap gap-2 justify-end">
          <Button className='bg-blue-600 text-white w-[120px]' onClick={handleShow} disabled={loading}>
            {loading ? t('loading') : t('show')}
          </Button>
          <Button
            className='bg-red-600 text-white flex items-center gap-2'
            onClick={() => setShowExportModal(true)}
            disabled={!selectedVLC || pdfLoading}
            variant="outline"
          >
            {t('export_pdf')}
          </Button>
        </div>
      </div>

      {collectionData.length === 0 && fromDate && toDate && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">{t('no_collection_data_found_for_selected_period')}</p>
          </CardContent>
        </Card>
      )}

      {collectionData.length > 0 && (() => {
        const grouped = Object.entries(groupByFarmer()).sort(([idA], [idB]) => parseInt(idA) - parseInt(idB));
        const totalPages = grouped.length;
        const [farmerId, farmerData] = grouped[currentPage] || [];
        if (!farmerId) return null;

        let searchBills: any[] = [];
        if (Array.isArray(farmerBills)) {
          searchBills = farmerBills;
        } else if (farmerBills && (typeof farmerBills === 'object')) {
          // @ts-ignore
          if (farmerBills.cow && Array.isArray(farmerBills.cow)) searchBills = [...searchBills, ...farmerBills.cow];
          // @ts-ignore
          if (farmerBills.buffalo && Array.isArray(farmerBills.buffalo)) searchBills = [...searchBills, ...farmerBills.buffalo];
          // @ts-ignore
          if (farmerBills.farmerwise_bills && Array.isArray(farmerBills.farmerwise_bills)) searchBills = [...searchBills, ...farmerBills.farmerwise_bills];
        }

        const bill = searchBills.find((b: any) => b.farmer_id === farmerId);
        const payments = farmerPayments.filter(p => p.farmer_id === farmerId);

        type ShiftAgg = {
          liters: number;
          amount: number;
          fatWeighted: number;
          snfWeighted: number;
          rateWeighted: number;
        };

        type DateRow = {
          morning: ShiftAgg;
          evening: ShiftAgg;
        };

        const emptyShift = (): ShiftAgg => ({
          liters: 0,
          amount: 0,
          fatWeighted: 0,
          snfWeighted: 0,
          rateWeighted: 0,
        });

        const typeDateMap = new Map<string, Map<string, DateRow>>();

        farmerData.forEach((item) => {
          const typeKey = item.type || 'Cow';
          const dateKey = formatDate(item.date);
          const shiftKey = (item.shift || '').toLowerCase().startsWith('e') ? 'evening' : 'morning';
          const liters = parseFloat(item.liters || '0') || 0;
          const amount = parseFloat(item.amount || '0') || 0;
          const fat = parseFloat(item.fat || '0') || 0;
          const snf = parseFloat(item.snf || '0') || 0;
          const rate = parseFloat(item.rate || '0') || 0;

          if (!typeDateMap.has(typeKey)) {
            typeDateMap.set(typeKey, new Map<string, DateRow>());
          }

          const dateMap = typeDateMap.get(typeKey)!;
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { morning: emptyShift(), evening: emptyShift() });
          }

          const dateRow = dateMap.get(dateKey)!;
          const slot = dateRow[shiftKey as 'morning' | 'evening'];
          slot.liters += liters;
          slot.amount += amount;
          slot.fatWeighted += fat * liters;
          slot.snfWeighted += snf * liters;
          slot.rateWeighted += rate * liters;
        });

        const orderedTypes = ['Cow', 'Buffalo'].filter((t) => typeDateMap.has(t));
        const extraTypes = Array.from(typeDateMap.keys()).filter((t) => !orderedTypes.includes(t));
        const displayTypes = [...orderedTypes, ...extraTypes];

        const formatAvg = (weighted: number, liters: number, digits = 1) => {
          if (!liters) return '-';
          return (weighted / liters).toFixed(digits);
        };

        return (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">{t('farmer_page_status', { current: currentPage + 1, total: totalPages })}</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  variant="outline"
                  size="sm"
                >
                  {t('previous')}
                </Button>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  {t('next')}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('farmer_with_id_name', { id: farmerId, name: farmerData[0].farmer_name })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-2" rowSpan={2}>{t('date')}</th>
                          <th className="border p-2" colSpan={hideRateAmount ? 3 : 5}>{t('morning')}</th>
                          <th className="border p-2 border-l-2 border-black" colSpan={hideRateAmount ? 3 : 5}>{t('evening')}</th>
                          <th className="border p-2" colSpan={hideRateAmount ? 1 : 2}>{t('total')}</th>
                          <th className="border p-2" rowSpan={2}>{t('actions', { defaultValue: 'Actions' })}</th>
                        </tr>
                        <tr className="bg-gray-100">
                          <th className="border p-2 border-l-2 border-black">{t('liter')}</th>
                          <th className="border p-2">{t('fat')}</th>
                          <th className="border p-2">{t('snf')}</th>
                          {!hideRateAmount && <th className="border p-2">{t('rate')}</th>}
                          {!hideRateAmount && <th className="border p-2">{t('amount')}</th>}
                          <th className="border p-2">{t('liter')}</th>
                          <th className="border p-2">{t('fat')}</th>
                          <th className="border p-2">{t('snf')}</th>
                          {!hideRateAmount && <th className="border p-2">{t('rate')}</th>}
                          {!hideRateAmount && <th className="border p-2">{t('amount')}</th>}
                          <th className="border p-2">{t('liter')}</th>
                          {!hideRateAmount && <th className="border p-2">{t('amount')}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {displayTypes.map((type) => {
                          const dateMap = typeDateMap.get(type)!;
                          const dateRows = Array.from(dateMap.entries()).sort((a, b) => {
                            const [d1, m1, y1] = a[0].split('-').map(Number);
                            const [d2, m2, y2] = b[0].split('-').map(Number);
                            return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
                          });

                          const typeTotals = dateRows.reduce(
                            (acc, [, row]) => {
                              acc.morningLiters += row.morning.liters;
                              acc.morningAmount += row.morning.amount;
                              acc.eveningLiters += row.evening.liters;
                              acc.eveningAmount += row.evening.amount;
                              acc.totalLiters += row.morning.liters + row.evening.liters;
                              acc.totalAmount += row.morning.amount + row.evening.amount;
                              return acc;
                            },
                            {
                              morningLiters: 0,
                              morningAmount: 0,
                              eveningLiters: 0,
                              eveningAmount: 0,
                              totalLiters: 0,
                              totalAmount: 0,
                            }
                          );

                          return (
                            <Fragment key={type}>
                              <tr key={`${type}-header`} className="bg-gray-50 font-semibold">
                                <td className="border p-2" colSpan={hideRateAmount ? 9 : 14}>
                                  {type}
                                </td>
                              </tr>
                              {dateRows.map(([dateKey, row]) => {
                                const totalLiters = row.morning.liters + row.evening.liters;
                                const totalAmount = row.morning.amount + row.evening.amount;
                                return (
                                  <tr key={`${type}-${dateKey}`} className="hover:bg-gray-50">
                                    <td className="border p-2">{dateKey}</td>
                                    <td className="border p-2 text-right">
                                      {row.morning.liters ? row.morning.liters.toFixed(1) : ''}
                                    </td>
                                    <td className="border p-2 text-right">{formatAvg(row.morning.fatWeighted, row.morning.liters)}</td>
                                    <td className="border p-2 text-right">{formatAvg(row.morning.snfWeighted, row.morning.liters)}</td>
                                    {!hideRateAmount && <td className="border p-2 text-right">{formatAvg(row.morning.rateWeighted, row.morning.liters, 2)}</td>}
                                    {!hideRateAmount && <td className="border p-2 text-right">{row.morning.amount ? row.morning.amount.toFixed(2) : ''}</td>}
                                    <td className="border p-2 border-l-2 border-black text-right">
                                      {row.evening.liters ? row.evening.liters.toFixed(1) : ''}
                                    </td>
                                    <td className="border p-2 text-right">{formatAvg(row.evening.fatWeighted, row.evening.liters)}</td>
                                    <td className="border p-2 text-right">{formatAvg(row.evening.snfWeighted, row.evening.liters)}</td>
                                    {!hideRateAmount && <td className="border p-2 text-right">{formatAvg(row.evening.rateWeighted, row.evening.liters, 2)}</td>}
                                    {!hideRateAmount && <td className="border p-2 text-right">{row.evening.amount ? row.evening.amount.toFixed(2) : ''}</td>}
                                    <td className="border p-2 text-right">{totalLiters ? totalLiters.toFixed(1) : ''}</td>
                                    {!hideRateAmount && <td className="border p-2 text-right">{totalAmount ? totalAmount.toFixed(2) : ''}</td>}
                                    <td className="border p-2 text-center">
                                      <div className="flex justify-center gap-2">
                                        {row.morning.liters ? (
                                          <button onClick={() => handleEditShift(farmerId, dateKey, 'Morning', type)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 transition-colors" title={`${t('edit')} ${t('morning')}`}>
                                            <span className="text-xs font-semibold">M</span><Pencil className="w-3 h-3" />
                                          </button>
                                        ) : null}
                                        {row.evening.liters ? (
                                          <button onClick={() => handleEditShift(farmerId, dateKey, 'Evening', type)} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 transition-colors" title={`${t('edit')} ${t('evening')}`}>
                                            <span className="text-xs font-semibold">E</span><Pencil className="w-3 h-3" />
                                          </button>
                                        ) : null}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr key={`${type}-total`} className="bg-blue-50 font-bold">
                                <td className="border p-2">{t('total_label')}</td>
                                <td className="border p-2 text-right">{typeTotals.morningLiters.toFixed(1)}</td>
                                <td className="border p-2"></td>
                                <td className="border p-2"></td>
                                {!hideRateAmount && <td className="border p-2"></td>}
                                {!hideRateAmount && <td className="border p-2 text-right">{typeTotals.morningAmount.toFixed(2)}</td>}
                                <td className="border p-2 border-l-2 border-black text-right">{typeTotals.eveningLiters.toFixed(1)}</td>
                                <td className="border p-2"></td>
                                <td className="border p-2"></td>
                                {!hideRateAmount && <td className="border p-2"></td>}
                                {!hideRateAmount && <td className="border p-2 text-right">{typeTotals.eveningAmount.toFixed(2)}</td>}
                                <td className="border p-2 text-right">{typeTotals.totalLiters.toFixed(1)}</td>
                                {!hideRateAmount && <td className="border p-2 text-right">{typeTotals.totalAmount.toFixed(2)}</td>}
                                <td className="border p-2"></td>
                              </tr>
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {payments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('payments_deductions')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border p-2">{t('date')}</th>
                            <th className="border p-2">{t('type')}</th>
                            <th className="border p-2">{t('amount')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="border p-2">{formatDate(payment.date)}</td>
                              <td className="border p-2">{payment.payment_type}</td>
                              <td className="border p-2 text-right">₹{parseFloat(payment.amount_taken || '0').toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {bill && bill.current_bill && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('bill_summary')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">{t('total_milk_amount')}</p>
                        <p className="text-xl font-bold">₹{parseFloat(bill.current_bill.milk_total || '0').toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">{t('advance')}</p>
                        <p className="text-xl font-bold">₹{parseFloat(bill.current_bill.advance_total || '0').toFixed(2)}</p>
                      </div>
                      {vlcCommission && (new Date(toDate) >= new Date(vlcCommission.effective_from)) && (
                        <div className="p-4 bg-gray-50 rounded">
                          <p className="text-sm text-gray-600">{t('travel_commission')}</p>
                          <p className="text-xl font-bold">
                            ₹{(vlcCommission.type === 'Commission'
                              ? (farmerData.reduce((acc, curr) => acc + parseFloat(curr.liters || '0'), 0) * parseFloat(vlcCommission.amount))
                              : parseFloat(vlcCommission.amount)
                            ).toFixed(2)}
                          </p>
                        </div>
                      )}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-600 font-semibold">{t('net_payable')}</p>
                        <p className="text-2xl font-bold text-blue-700">
                          ₹{(parseFloat(bill.current_bill.net_payable || '0') + (vlcCommission && (new Date(toDate) >= new Date(vlcCommission.effective_from)) ? (vlcCommission.type === 'Commission'
                            ? (farmerData.reduce((acc, curr) => acc + parseFloat(curr.liters || '0'), 0) * parseFloat(vlcCommission.amount))
                            : parseFloat(vlcCommission.amount)) : 0)).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">{t('other_deductions')}</p>
                        <p className="text-xl font-bold">₹{(parseFloat(bill.current_bill.other1_total || '0') + parseFloat(bill.current_bill.other2_total || '0')).toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded col-span-2">
                        <p className="text-sm text-gray-600">{t('net_payable')}</p>
                        <p className="text-2xl font-bold text-green-600">₹{parseFloat(bill.current_bill.net_payable || '0').toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        );
      })()}

      <Sheet
        open={editSheetOpen}
        onOpenChange={(open) => {
          setEditSheetOpen(open);
          if (!open) resetEditState();
        }}
      >
        <SheetContent className="bg-white z-[100] sm:max-w-md w-full overflow-y-auto" side="right">
          <SheetHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2.5 rounded-xl">
                <Pencil className="w-5 h-5 text-blue-700" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-xl font-bold text-gray-900 tracking-tight">
                  Edit Collection
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-500 mt-0.5">
                  Update milk collection records
                </SheetDescription>
              </div>
            </div>

            <div className="mt-5 bg-gray-50 p-4 rounded-xl border border-gray-100/80 flex flex-col gap-3 text-left">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Farmer Details</p>
                <p className="text-sm font-bold text-gray-800">
                  {editingFarmerData ? `${editingFarmerData.farmerName || editingFarmerData.farmer_name || 'Farmer'}` : 'Farmer Details'}
                  <span className="text-gray-500 font-medium ml-1">
                    (#{editingFarmerData?.farmerId || editingFarmerData?.farmer_id || editCollection?.farmer_id || ''})
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  {editCollection?.shift} Shift
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {editCollection?.type || editCollection?.milkType} Milk
                </span>
                {editEffectiveDate && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                    {format(new Date(editEffectiveDate), 'dd-MM-yyyy')}
                  </span>
                )}
              </div>
              {editEffectiveDate && (
                <p className="text-xs text-gray-500">
                  Rate is resolved from the rate chart effective on{' '}
                  <span className="font-semibold text-gray-700">{format(new Date(editEffectiveDate), 'dd-MM-yyyy')}</span>.
                </p>
              )}
            </div>
          </SheetHeader>
          <div className="space-y-6">
            {editLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100 shadow-sm space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Quantity (Liter)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={editFormData.quantity}
                        onChange={e => setEditFormData(p => ({ ...p, quantity: e.target.value }))}
                        className="pl-3 pr-8 py-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-all rounded-lg bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-400 text-sm font-medium">L</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Fat</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={editFormData.fat}
                        onChange={e => setEditFormData(p => ({ ...p, fat: e.target.value }))}
                        className="pl-3 pr-8 py-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-all rounded-lg bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-400 text-sm font-medium">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">SNF</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={editFormData.snf}
                        onChange={e => setEditFormData(p => ({ ...p, snf: e.target.value }))}
                        className="pl-3 pr-8 py-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-all rounded-lg bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-400 text-sm font-medium">%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-500">Rate</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-medium">₹</span>
                      <Input
                        type="number"
                        value={editFormData.rate}
                        disabled
                        placeholder={rateLoading ? '' : '—'}
                        className="pl-8 pr-9 py-2 bg-gray-100/70 border-gray-200 text-gray-600 font-medium rounded-lg cursor-not-allowed"
                      />
                      {rateLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 absolute right-3 top-3" />
                      )}
                    </div>
                    {rateLoading && (
                      <p className="text-xs text-blue-600">Fetching rate…</p>
                    )}
                    {!rateLoading && rateUnavailable && (
                      <p className="text-xs text-red-600">No rate for this FAT/SNF on this date.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-500">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-medium">₹</span>
                      <Input
                        type="number"
                        value={editFormData.amount}
                        disabled
                        className="pl-8 py-2 bg-gray-100/70 border-gray-200 text-gray-600 font-medium rounded-lg cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-xl transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleSaveEdit}
                    disabled={
                      editSaving ||
                      rateLoading ||
                      !editFormData.rate ||
                      !editFormData.quantity ||
                      !editFormData.fat ||
                      !editFormData.snf
                    }
                  >
                    {editSaving || rateLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Pencil className="w-5 h-5 mr-2" />
                    )}
                    {editSaving ? 'Saving...' : rateLoading ? 'Fetching rate…' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>{t('select_export_format')}</DialogTitle>
            <DialogDescription>
              {t('choose_farmer_bills_per_a4')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <RadioGroup
              value={exportFormat}
              onValueChange={(val) => setExportFormat(val as any)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExportFormat('1-per-page')}>
                <RadioGroupItem value="1-per-page" id="1-per-page" />
                <Label htmlFor="1-per-page" className="flex-1 font-semibold cursor-pointer">{t('export_option_1_per_page')}</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExportFormat('2-per-page')}>
                <RadioGroupItem value="2-per-page" id="2-per-page" />
                <Label htmlFor="2-per-page" className="flex-1 font-semibold cursor-pointer">{t('export_option_2_per_page')}</Label>
              </div>
              {/* 
              <div className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExportFormat('3-per-page')}>
                <RadioGroupItem value="3-per-page" id="3-per-page" />
                <Label htmlFor="3-per-page" className="flex-1 font-semibold cursor-pointer">{t('export_option_3_per_page')}</Label>
              </div>
*/}
              <div className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExportFormat('detailed-horizontal' as any)}>
                <RadioGroupItem value="detailed-horizontal" id="detailed-horizontal" />
                <Label htmlFor="detailed-horizontal" className="flex-1 font-semibold cursor-pointer">{t('export_option_detailed_horizontal')}</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExportFormat('format-4')}>
                <RadioGroupItem value="format-4" id="format-4" />
                <Label htmlFor="format-4" className="flex-1 font-semibold cursor-pointer">{t('export_option_format_4')}</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExportFormat('format-5')}>
                <RadioGroupItem value="format-5" id="format-5" />
                <Label htmlFor="format-5" className="flex-1 font-semibold cursor-pointer">{t('export_option_format_5')}</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleExport} className="bg-blue-600 text-white hover:bg-blue-700">{t('download_pdf')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerBillInvoiceReport;
