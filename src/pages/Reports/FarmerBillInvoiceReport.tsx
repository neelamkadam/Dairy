import React, { useState, useEffect, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/config';
import { useAppSelector } from '@/redux/store';
import { toast } from 'react-toastify';
import { generateTemplate2, generateTemplateDetailedHorizontal, FarmerBillData, BankDetails } from '@/templates/FarmerBillInvoiceTemplate';
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
  const [exportFormat, setExportFormat] = useState<'1-per-page' | '2-per-page' | '3-per-page' | 'detailed-horizontal'>('1-per-page');
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

  // Helper: Fetch VLC Commission settings
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

  const exportToPDF = async () => {
    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(v => v.branch_id.toString() === selectedVLC);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.username || '';
      const branchName = selectedBranch?.branchName || '';
      // @ts-ignore
      const dairyId = selectedBranch?.branch_id || selectedBranch?.id;

      // Fetch farmer data, bonus data, and report language in parallel
      const [response, bonusMap, reportLang, vlcComm] = await Promise.all([
        billApi.getFarmerReport({ dairy_id: dairyId, start_date: fromDate, end_date: toDate }),
        fetchBonusMap(dairyId),
        fetchReportLanguage(selectedVLC),
        fetchVlcCommissionSettings(selectedVLC)
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
          payments: farmerInfo.payments,
          current_bill: farmerInfo.current_bill,
          previous_bill: farmerInfo.previous_bill,
          bonus_deduction_info: attachBonus(farmerInfo, bonusMap, templateDataItems.reduce((s, i) => s + i.liters, 0)).bonus_deduction_info,
          bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary,
          travel_commission: vlcComm ? {
            type: vlcComm.type,
            rate: parseFloat(vlcComm.amount),
            amount: vlcComm.type === 'Commission' 
              ? templateDataItems.reduce((s, i) => s + i.liters, 0) * parseFloat(vlcComm.amount) 
              : parseFloat(vlcComm.amount),
            effective_from: vlcComm.effective_from
          } : undefined,
          bankDetails: farmerInfo.farmer_details ? {
            accountNumber: farmerInfo.farmer_details.accountNumber,
            ifscCode: farmerInfo.farmer_details.ifscCode,
            bankName: farmerInfo.farmer_details.bankName,
          } : undefined,
          hideRateAmount: hideRateAmount
        };

        // Check for mixed types (only relevant when milkTypeFilter is 'All')
        const hasCow = templateDataItems.some(item => item.type === 'Cow');
        const hasBuffalo = templateDataItems.some(item => item.type === 'Buffalo');
        const isMixed = milkTypeFilter === 'All' && hasCow && hasBuffalo;

        if (isMixed) {
          // 1. Cow Page (Header YES, Summary NO)
          const cowHtml = generateTemplate2({ 
            ...baseParams, 
            milkType: 'Cow',
            hideHeader: false,
            hideSummary: true 
          }, reportLang);
          const cowPage = await generatePage(cowHtml);
          if (i > 0) pdf.addPage(); 
          else if (pdf.getNumberOfPages() > 1) pdf.addPage(); 
          
          pdf.addImage(cowPage.imgData, 'JPEG', 0, 0, cowPage.imgWidth, cowPage.imgHeight);

          // 2. Buffalo Page (Header NO, Summary YES)
          const buffaloHtml = generateTemplate2({ 
            ...baseParams, 
            milkType: 'Buffalo',
            hideHeader: true,
            hideSummary: false
          }, reportLang);
          const buffaloPage = await generatePage(buffaloHtml);
          pdf.addPage();
          pdf.addImage(buffaloPage.imgData, 'JPEG', 0, 0, buffaloPage.imgWidth, buffaloPage.imgHeight);

        } else {
          // Single type (standard)
          const htmlContent = generateTemplate2({ ...baseParams, milkType: milkTypeFilter }, reportLang);
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

      // Fetch farmer data, bonus data, and report language in parallel
      const [response, bonusMap, reportLang, vlcComm] = await Promise.all([
        billApi.getFarmerReport({ dairy_id: dairyId, start_date: fromDate, end_date: toDate }),
        fetchBonusMap(dairyId),
        fetchReportLanguage(selectedVLC),
        fetchVlcCommissionSettings(selectedVLC)
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
        const enrichedPayments = (farmer.payments || []).map((p: any) => {
          const logs = (farmer as any).payment_logs?.data || [];
          const logMatch = logs.find((l: any) => 
            l.payment_type.toLowerCase().trim().replace(/\s/g, '') === p.payment_type.toLowerCase().trim().replace(/\s/g, '') &&
            parseFloat(l.amount_taken) === parseFloat(p.amount_taken)
          );
          
          const merged = logMatch ? { ...p, ...logMatch } : p;
          const enriched = {
            ...merged,
            stock_name: merged.stock_name || '',
            stock: merged.stock || '',
            date: merged.date || merged.created_at || ''
          };
          
          return enriched;
        });

        return { 
          ...farmer, 
          payments: enrichedPayments
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
          travel_commission: vlcComm ? {
            type: vlcComm.type,
            rate: parseFloat(vlcComm.amount),
            amount: vlcComm.type === 'Commission' 
              ? (farmer.collections_summary?.total_quantity || 0) * parseFloat(vlcComm.amount) 
              : parseFloat(vlcComm.amount),
            effective_from: vlcComm.effective_from
          } : undefined
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

      // Fetch farmer data, bonus data, and report language in parallel
      const [response, bonusMap, reportLang, vlcComm] = await Promise.all([
        billApi.getFarmerReport({ dairy_id: dairyId, start_date: fromDate, end_date: toDate }),
        fetchBonusMap(dairyId),
        fetchReportLanguage(selectedVLC),
        fetchVlcCommissionSettings(selectedVLC)
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
          payments: (farmer.payments || []).map((p: any) => {
            const logs = (farmer as any).payment_logs?.data || [];
            const logMatch = logs.find((l: any) => 
              l.payment_type.toLowerCase().trim().replace(/\s/g, '') === p.payment_type.toLowerCase().trim().replace(/\s/g, '') &&
              parseFloat(l.amount_taken) === parseFloat(p.amount_taken)
            );
            const merged = logMatch ? { ...p, ...logMatch } : p;
            return {
              ...merged,
              stock_name: merged.stock_name,
              stock: merged.stock,
              date: merged.date || merged.created_at
            };
          }),
          bonus_deduction_info: attachBonus(farmer, bonusMap, farmer.collections_summary?.total_quantity || 0).bonus_deduction_info,
          bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary || null,
          travel_commission: vlcComm ? {
            type: vlcComm.type,
            rate: parseFloat(vlcComm.amount),
            amount: vlcComm.type === 'Commission' 
              ? farmerBillData.reduce((s, i) => s + i.liters, 0) * parseFloat(vlcComm.amount) 
              : parseFloat(vlcComm.amount),
            effective_from: vlcComm.effective_from
          } : undefined
        };

        const hasCow = farmerBillData.some(d => d.type === 'Cow');
        const hasBuffalo = farmerBillData.some(d => d.type === 'Buffalo' || d.type === 'Buffaloes');

        if (hasCow && hasBuffalo) {
          // Page 1: Cow only, hide summary
          const cowHtml = generateTemplateDetailedHorizontal({ ...templateData, renderOnly: 'Cow', hideSummary: true } as any, reportLang);
          const cowPage = await generatePage(cowHtml);
          if (i > 0) pdf.addPage();
          pdf.addImage(cowPage.imgData, 'JPEG', 0, 0, cowPage.imgWidth, cowPage.imgHeight);

          // Page 2: Buffalo only, show summary
          const buffHtml = generateTemplateDetailedHorizontal({ ...templateData, renderOnly: 'Buffalo', hideSummary: false } as any, reportLang);
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
    if (exportFormat === '1-per-page' && collectionData.length === 0) {
      toast.error(t('please_click_show_first_for_detailed_report'));
      return;
    }
    setShowExportModal(false);
    if (exportFormat === 'detailed-horizontal') {
      exportDetailedHorizontalPDF();
    } else if (exportFormat === '1-per-page') {
      exportToPDF();
    } else if (exportFormat === '2-per-page') {
      exportMultiPerPagePDF(1);
    } else {
      exportMultiPerPagePDF(3);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PdfLoader isLoading={pdfLoading} />
      <h1 className="text-2xl font-bold">{t('farmer_bill_invoice_report')}</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="lg:col-span-2">
              <Label>{t('vlcc_center')}</Label>
              <Select value={selectedVLC} onValueChange={setSelectedVLC}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder={t('select_vlc_center')}>
                    {selectedVLC && (() => {
                      const selected = branches.find(b => b.branch_id.toString() === selectedVLC);
                      if (selected) {
                        const text = `${selected.username} - ${selected.name}`;
                        return text.length > 25 ? text.substring(0, 40) + '...' : text;
                      }
                      return t('select_vlc_center');
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white w-full min-w-[400px]">
                  {branches.map(vlc => (
                    <SelectItem key={vlc.branch_id} value={vlc.branch_id.toString()}>
                      {vlc.username} - {vlc.name} - {vlc.branchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button className='bg-blue-600 text-white' onClick={handleShow} disabled={loading}>
              {loading ? t('loading') : t('show')}
            </Button>
            <Button 
              className='bg-red-600 text-white' 
              onClick={() => setShowExportModal(true)} 
              disabled={!selectedVLC || pdfLoading} 
              variant="outline"
            >
              {t('export_pdf')}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                              <td className="border p-2" colSpan={hideRateAmount ? 8 : 13}>
                                {type}
                              </td>
                            </tr>
                            {dateRows.map(([dateKey, row]) => {
                              const totalLiters = row.morning.liters + row.evening.liters;
                              const totalAmount = row.morning.amount + row.evening.amount;
                              return (
                                <tr key={`${type}-${dateKey}`} className="hover:bg-gray-50">
                                  <td className="border p-2">{dateKey}</td>
                                  <td className="border p-2 text-right">{row.morning.liters ? row.morning.liters.toFixed(1) : ''}</td>
                                  <td className="border p-2 text-right">{formatAvg(row.morning.fatWeighted, row.morning.liters)}</td>
                                  <td className="border p-2 text-right">{formatAvg(row.morning.snfWeighted, row.morning.liters)}</td>
                                  {!hideRateAmount && <td className="border p-2 text-right">{formatAvg(row.morning.rateWeighted, row.morning.liters, 2)}</td>}
                                  {!hideRateAmount && <td className="border p-2 text-right">{row.morning.amount ? row.morning.amount.toFixed(2) : ''}</td>}
                                  <td className="border p-2 border-l-2 border-black text-right">{row.evening.liters ? row.evening.liters.toFixed(1) : ''}</td>
                                  <td className="border p-2 text-right">{formatAvg(row.evening.fatWeighted, row.evening.liters)}</td>
                                  <td className="border p-2 text-right">{formatAvg(row.evening.snfWeighted, row.evening.liters)}</td>
                                  {!hideRateAmount && <td className="border p-2 text-right">{formatAvg(row.evening.rateWeighted, row.evening.liters, 2)}</td>}
                                  {!hideRateAmount && <td className="border p-2 text-right">{row.evening.amount ? row.evening.amount.toFixed(2) : ''}</td>}
                                  <td className="border p-2 text-right">{totalLiters ? totalLiters.toFixed(1) : ''}</td>
                                  {!hideRateAmount && <td className="border p-2 text-right">{totalAmount ? totalAmount.toFixed(2) : ''}</td>}
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
