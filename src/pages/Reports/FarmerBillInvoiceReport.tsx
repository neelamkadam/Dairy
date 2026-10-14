import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/config';
import { useAppSelector } from '@/redux/store';
import { useVlcNumbering } from "@/utils/vlcSectionLabel";
import { toast } from 'react-toastify';
import { generateTemplate2, generateTemplate4, generateTemplate5MilkBill, generateTemplate6, generateTemplate7, generateTemplate8, generateTemplateDetailedHorizontal, FarmerBillData, BankDetails, BillHeaderInfo, BillTravelCommission, DailyCommission } from '@/templates/FarmerBillInvoiceTemplate';
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
import { vlcCommissionApi } from '@/services/vlcCommissionApi';
import { buildCommissionLookup, computeTravelCommission, perLiterRate, CommissionLookup } from '@/utils/travelCommission';
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
import { Pencil, Loader2, Download, FileText, Info } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { userApi } from '@/services/userApi';
import { rateChartApi } from '@/services/rateChartApi';
import { collectionApi } from '@/services/collectionApi';
import { calculateCLRFromFatAndSNF } from '@/utils/milkCalculations';
import { webUserApi, CompanyProfile } from '@/services/webUserApi';
import { createDairyApi, UserDairy } from '@/services/createDairyApi';

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

// PDF file name: "<Dairy or Farmer>_<Branch>_<from>_to_<to>[_suffix].pdf". Only characters
// that are invalid in file names are stripped, so Marathi/Hindi names are kept.
const buildPdfFileName = (name: string, branchName: string, fromDate: string, toDate: string, suffix = '') => {
  const clean = (s: string) => (s || '').replace(/[\\/:*?"<>|\x00-\x1f]+/g, '').trim().replace(/\s+/g, '_');
  const parts = [clean(name), clean(branchName), `${fromDate}_to_${toDate}`, suffix].filter(Boolean);
  return `${parts.join('_')}.pdf`;
};

// A PDF holding only one farmer's bill is named after that farmer instead of the dairy
const pdfNameFor = (dairyName: string, farmers: { farmer_id: string; farmer_details?: { fullName?: string } }[]) => {
  const single = new Set(farmers.map(f => f.farmer_id)).size === 1;
  return single ? (farmers[0].farmer_details?.fullName || farmers[0].farmer_id) : dairyName;
};

// One VLC's PDF in an export run. Each VLC gets its own bill period, since VLCs
// can bill on different cycle lengths.
interface ExportJob {
  vlcId: string;
  label: string;
  fromDate: string;
  toDate: string;
  farmerCode: string;
}

// `message` is the translation key the single-VLC toast shows
type ExportOutcome = { status: 'saved' | 'empty' | 'failed'; message: string };

// Thrown from generatePage once the user stops the export, so a half-built PDF is never saved
const EXPORT_CANCELLED = new Error('export-cancelled');

// html2canvas clones the whole document the target element lives in, once for every
// page it draws. Drawing bills inside a bare iframe that carries only the app's
// stylesheets keeps that clone small instead of copying the entire app (sidebar,
// preview table, dialogs) per page. Same stylesheets, so the bills look the same.
const createRenderHost = async () => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none;';
  document.body.appendChild(iframe);

  // Written with a doctype: a bare about:blank page is in quirks mode, which lays tables out differently
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><base href="${document.baseURI}"></head><body></body></html>`);
  doc.close();
  doc.documentElement.className = document.documentElement.className;
  doc.body.className = document.body.className;

  const linksLoaded: Promise<void>[] = [];
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    const copy = doc.importNode(node, true) as HTMLElement;
    if (node.nodeName === 'LINK') {
      linksLoaded.push(new Promise<void>((resolve) => {
        copy.addEventListener('load', () => resolve(), { once: true });
        copy.addEventListener('error', () => resolve(), { once: true });
        setTimeout(resolve, 5000);
      }));
    }
    doc.head.appendChild(copy);
  });
  await Promise.all(linksLoaded);

  return { doc, dispose: () => iframe.remove() };
};

type ExportFormat = '1-per-page' | '2-per-page' | '3-per-page' | 'detailed-horizontal' | 'format-4' | 'format-5' | 'format-6' | 'format-7' | 'format-8';

// Formats offered in the export dialog, numbered the way users refer to them.
// 3-per-page is still handled by exportJob but is not offered.
const EXPORT_FORMATS: { value: ExportFormat; number: number; labelKey: string }[] = [
  { value: '1-per-page', number: 1, labelKey: 'export_option_1_per_page' },
  { value: '2-per-page', number: 2, labelKey: 'export_option_2_per_page' },
  { value: 'detailed-horizontal', number: 3, labelKey: 'export_option_detailed_horizontal' },
  { value: 'format-4', number: 4, labelKey: 'export_option_format_4' },
  { value: 'format-5', number: 5, labelKey: 'export_option_format_5' },
  { value: 'format-6', number: 6, labelKey: 'export_option_format_6' },
  { value: 'format-7', number: 7, labelKey: 'export_option_format_7' },
  { value: 'format-8', number: 8, labelKey: 'export_option_format_8' },
];

// ── Export dialog thumbnails: a sketch of each format's page, not a real render ──
const MiniTable = ({ rows, cols, accentCol = -1 }: { rows: number; cols: number; accentCol?: number }) => (
  <div className="grid gap-x-[2px] gap-y-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
    {Array.from({ length: (rows + 1) * cols }, (_, i) => {
      const header = i < cols;
      const accent = i % cols === accentCol;
      const color = accent ? (header ? 'bg-blue-500' : 'bg-blue-300') : (header ? 'bg-slate-500' : 'bg-slate-200');
      return <span key={i} className={`rounded-full ${header ? 'h-[3px]' : 'h-[2px]'} ${color}`} />;
    })}
  </div>
);

const MiniHeader = ({ active }: { active: boolean }) => (
  <div className="space-y-[3px] mb-[5px]">
    <div className={`h-[4px] w-3/5 mx-auto rounded-full ${active ? 'bg-blue-600' : 'bg-slate-700'}`} />
    <div className="h-[2px] w-2/5 mx-auto rounded-full bg-slate-300" />
  </div>
);

const MiniSummary = ({ className = 'mt-auto' }: { className?: string }) => (
  <div className={`rounded-[2px] border border-slate-300 p-[3px] space-y-[2px] ${className}`}>
    <div className="h-[2px] w-full rounded-full bg-slate-200" />
    <div className="h-[2px] w-4/5 rounded-full bg-slate-200" />
    <div className="h-[3px] w-full rounded-full bg-emerald-400" />
  </div>
);

const FormatPreview = ({ format, active }: { format: ExportFormat; active: boolean }) => {
  const header = <MiniHeader active={active} />;
  let body: React.ReactNode;
  switch (format) {
    case '2-per-page':
      // One compact bill per page
      body = <>{header}<MiniTable rows={6} cols={5} /><MiniSummary className="mt-[5px]" /></>;
      break;
    case 'detailed-horizontal':
      // Morning and evening in one wide row per date
      body = <>{header}<MiniTable rows={10} cols={9} /><MiniSummary /></>;
      break;
    case 'format-4':
      // Compact table, then DEDUCTION and GROSS SUMMARY boxes side by side
      body = (
        <>
          {header}
          <MiniTable rows={7} cols={5} />
          <div className="mt-auto flex gap-[3px]">
            <MiniSummary className="flex-1" />
            <MiniSummary className="flex-1" />
          </div>
        </>
      );
      break;
    case 'format-5':
      // Drawn over the top 75% of the page; the bottom quarter stays empty
      body = (
        <>
          <div className="h-3/4 flex flex-col">
            {header}
            <MiniTable rows={7} cols={6} />
            <div className="mt-auto flex gap-[3px]">
              <MiniSummary className="flex-1" />
              <MiniSummary className="flex-1" />
            </div>
          </div>
          <div className="flex-1 mt-[4px] border-t border-dashed border-slate-300" />
        </>
      );
      break;
    case 'format-6':
      // Company / VSP / route lines, morning and evening tables in one box, then
      // deductions and details side by side
      body = (
        <>
          {header}
          <div className="space-y-[2px] mb-[4px]">
            <div className="h-[2px] w-1/2 mx-auto rounded-full bg-slate-300" />
            <div className="h-[2px] w-3/5 rounded-full bg-slate-400" />
            <div className="h-[2px] w-2/3 rounded-full bg-slate-400" />
          </div>
          <div className="flex rounded-[1px] border border-slate-300 p-[2px]">
            <div className="flex-1 pr-[2px] border-r border-slate-300"><MiniTable rows={6} cols={4} /></div>
            <div className="flex-1 pl-[2px]"><MiniTable rows={6} cols={4} /></div>
          </div>
          <div className="mt-auto flex gap-[3px]">
            <MiniSummary className="flex-1" />
            <MiniSummary className="flex-1" />
          </div>
        </>
      );
      break;
    case 'format-7':
      // Format 1 with a per-day commission column
      body = <>{header}<MiniTable rows={11} cols={6} accentCol={5} /><MiniSummary /></>;
      break;
    case 'format-8':
      // One row per date (morning | evening | total), then deductions,
      // the cattle feed list (highlighted) and the totals
      body = (
        <>
          {header}
          <div className="rounded-[1px] border border-slate-300 p-[2px]">
            <MiniTable rows={8} cols={9} />
          </div>
          <div className="mt-auto flex gap-[2px]">
            <div className="flex-[4] rounded-[1px] border border-slate-300 p-[2px]"><MiniTable rows={3} cols={3} /></div>
            <div className="flex-[3] rounded-[1px] border border-blue-300 p-[2px]"><MiniTable rows={3} cols={2} accentCol={0} /></div>
            <div className="flex-[2] space-y-[3px] pt-[2px]">
              <div className="h-[2px] rounded-full bg-slate-200" />
              <div className="h-[2px] rounded-full bg-slate-200" />
              <div className="h-[3px] rounded-full bg-emerald-400" />
            </div>
          </div>
        </>
      );
      break;
    default:
      body = <>{header}<MiniTable rows={11} cols={5} /><MiniSummary /></>;
  }
  return (
    <div className={`mx-auto w-[74px] aspect-[210/297] rounded-[3px] bg-white p-[6px] flex flex-col ring-1 transition-shadow ${active ? 'ring-blue-300 shadow-md' : 'ring-slate-200 shadow-sm'}`}>
      {body}
    </div>
  );
};

const FarmerBillInvoiceReport = () => {
  const { t, i18n } = useTranslation();
  const branches = useAppSelector((state) => (state as any).branch.branches);
  // VLC numbers (1, 2, 3 …) for the web user who uses them; "" for everyone else.
  const vlcNo = useVlcNumbering();
  const userId = useAppSelector((state) => (state as any).authData?.userData?.id);
  const hideRateAmount = userId === '7';
  // Export PDF downloads every selected VLC, one after another. Show, the bill
  // preview and editing work on one VLC: the first one selected.
  const [selectedVLCs, setSelectedVLCs] = useState<string[]>([]);
  const selectedVLC = selectedVLCs[0] || '';
  const [language, setLanguage] = useState<string>(i18n.language || 'en');

  const selectedVlcObj = branches.find((b: any) => b.branch_id.toString() === selectedVLC);

  const calculateDateRange = (dateStr: string, cycleDays: number = selectedVlcObj?.days || 10) => {
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
      setSelectedVLCs([branches[0].branch_id.toString()]);
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
  const [commissionLookup, setCommissionLookup] = useState<CommissionLookup>(new Map());
  const [bankDetailsMap, setBankDetailsMap] = useState<Map<string, BankDetails>>(new Map());
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ vlc: string; current: number; count: number; done: number; total: number } | null>(null);
  const cancelExportRef = useRef(false);
  // Document the bill pages are drawn in during an export (see createRenderHost)
  const renderDocRef = useRef<Document | null>(null);
  // Format 6 header data, loaded once per export run (see loadBillHeaders)
  const billHeadersRef = useRef<{ company: CompanyProfile | null; dairies: Map<string, UserDairy> } | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('1-per-page');

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
        fetchCommissionLookup(selectedVLC),
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
      setCommissionLookup(commSettings);

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
    if (cancelExportRef.current) throw EXPORT_CANCELLED;
    const doc = renderDocRef.current ?? document;
    const tempDiv = doc.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    doc.body.appendChild(tempDiv);
    // html2canvas measures text baselines in the main document's body, so the bill's own
    // styles (e.g. its body line-height) must apply there too, or text is drawn too low
    const mirroredStyles = doc === document
      ? []
      : Array.from(tempDiv.querySelectorAll('style'), (style) => document.body.appendChild(style.cloneNode(true) as HTMLStyleElement));

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
      // Free the bitmap now instead of at GC; a multi-VLC run draws hundreds of pages
      canvas.width = 0;
      canvas.height = 0;
      return { imgData, imgWidth, imgHeight };
    } finally {
      doc.body.removeChild(tempDiv);
      mirroredStyles.forEach((style) => style.remove());
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
  const fetchBonusMap = async (dairyId: number, periodFrom: string, periodTo: string): Promise<Map<string, any>> => {
    try {
      const bonusResponse = await bonusApi.getBonusDeductions({
        dairy_id: dairyId,
        start_date: periodFrom,
        end_date: periodTo,
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
  const attachBonus = (farmer: any, bonusMap: Map<string, any>, totalQty: number, periodTo: string) => {
    const entry = bonusMap.get(farmer.farmer_id);
    if (!entry) return { ...farmer, bonus_deduction_info: null };
    const periodEnd = new Date(periodTo);
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

  // ── Travel commission — the rule Generate Bill uses (utils/travelCommission) ──
  const fetchCommissionLookup = async (vlcId: string): Promise<CommissionLookup> => {
    try {
      const res = await vlcCommissionApi.getByVlcc(vlcId);
      return buildCommissionLookup(res.data?.data ?? []);
    } catch {
      return new Map();
    }
  };

  // Bill end date as a local date — what Generate Bill compares effective_from with
  const billEndDate = (periodTo: string) => {
    const [y, m, d] = periodTo.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const litresOf = (collections: any[], milkType: string) =>
    collections.filter((c) => c.type === milkType).reduce((sum, c) => sum + (parseFloat(c.quantity) || 0), 0);

  // The travel commission printed on a farmer's bill. The saved bill holds the
  // amount Generate Bill / Farmer Deduction put into its net payable; a bill saved
  // before that was stored falls back to the shared rule. Templates only print it
  // (never add it again). The cow/buffalo split is shown only when it adds up.
  const billTravelCommission = (farmerId: string, collections: any[], currentBill: any, lookup: CommissionLookup, periodTo: string = toDate) => {
    const cow = litresOf(collections, 'Cow');
    const buffalo = litresOf(collections, 'Buffalo');
    const computed = computeTravelCommission(lookup, farmerId, { cow, buffalo }, billEndDate(periodTo));
    const stored = currentBill?.travel_commission;
    const amount = stored !== undefined && stored !== null && stored !== '' ? Number(stored) : computed.total;
    const matchesBill = Math.abs(computed.total - amount) < 0.01;
    const travel: BillTravelCommission | undefined = amount > 0
      ? {
          amount,
          ...(matchesBill && computed.fixed === 0 && cow > 0 && buffalo > 0
            ? { cow_amount: computed.cow, buffalo_amount: computed.buffalo }
            : {})
        }
      : undefined;
    return { travel, computed, amount, matchesBill };
  };

  // Format 7: the per-day commission column for the milk type on one page. The
  // flat (Fixed) part and the bill check go on the page that carries the summary.
  const dailyCommissionFor = (
    bill: ReturnType<typeof billTravelCommission>,
    milkType: 'Cow' | 'Buffalo',
    withSummary: boolean
  ): DailyCommission => ({
    rate: perLiterRate(bill.computed, milkType),
    ...(withSummary ? { fixed: bill.computed.fixed, matches_bill: bill.matchesBill, billed_amount: bill.amount } : {})
  });

  // Everything one VLC's PDF needs from the API. An export run calls this for the
  // next VLC while the current one is still being drawn.
  const fetchExportData = (job: ExportJob) => {
    const branch = branches.find((b: any) => b.branch_id.toString() === job.vlcId);
    const dairyId = branch?.branch_id || branch?.id;
    return Promise.all([
      billApi.getFarmerReport({ dairy_id: dairyId, start_date: job.fromDate, end_date: job.toDate }),
      fetchBonusMap(dairyId, job.fromDate, job.toDate),
      fetchReportLanguage(job.vlcId),
      fetchCommissionLookup(job.vlcId)
    ]);
  };
  type ExportData = Awaited<ReturnType<typeof fetchExportData>>;

  // Format 6 header: the account's company profile, and each VLC's owner, route
  // and route supervisor. A failed lookup only leaves those header lines out.
  const loadBillHeaders = async () => {
    const id = Number(userId);
    const [company, dairies] = await Promise.all([
      webUserApi.getCompanyProfile(id).then(res => res.data).catch((error) => {
        console.error('Error fetching company profile:', error);
        return null;
      }),
      createDairyApi.listUserDairies(id).then(res => res.data || []).catch((error) => {
        console.error('Error fetching VLC details:', error);
        return [] as UserDairy[];
      })
    ]);
    billHeadersRef.current = { company, dairies: new Map(dairies.map(d => [String(d.dairy_id), d])) };
  };

  const billHeaderFor = (vlcId: string, vlcName: string): BillHeaderInfo => {
    const company = billHeadersRef.current?.company;
    const dairy = billHeadersRef.current?.dairies.get(vlcId);
    return {
      companyName: company?.company_name,
      companyAddress: company?.company_address,
      vlcName: dairy?.name || vlcName,
      vlcOwner: dairy?.ownername,
      routeName: dairy?.route_name,
      supervisorName: dairy?.supervisor_name,
      supervisorMobile: dairy?.supervisor_mobile
    };
  };

  const reportBillProgress = (done: number, total: number) =>
    setExportProgress((prev) => (prev ? { ...prev, done, total } : prev));

  const exportToPDF = async (job: ExportJob, exportData: Promise<ExportData>, templateFn: typeof generateTemplate2 = generateTemplate2): Promise<ExportOutcome> => {
    const { vlcId, fromDate, toDate, farmerCode } = job;

    // Format 5 (Milk Bill) is drawn at full page width and exactly 75% of the page
    // height, so the bottom 25% of every farmer's page stays empty below the table.
    // Other formats keep their existing aspect-ratio placement.
    const A4_WIDTH = 210, A4_HEIGHT = 297;
    const isMilkBill = templateFn === generateTemplate5MilkBill;
    const milkBillHeight = A4_HEIGHT * 0.75;

    try {
      const selectedBranch = branches.find(v => v.branch_id.toString() === vlcId);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.username ? `${vlcNo.prefix(selectedBranch.username)}${selectedBranch.username}` : '';
      const branchName = selectedBranch?.branchName || '';

      // Farmer data, bonus data, report language, and commissions (fetched in parallel)
      const [response, bonusMap, reportLang, commissionLookup] = await exportData;

      if (!response.data.success) {
        return { status: 'failed', message: 'failed_to_fetch_farmer_report_data' };
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
        return { status: 'empty', message: 'no_data_found_for_selected_criteria' };
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
          farmerMobile: farmerInfo.farmer_details?.mobile_number,
          fromDate: fromDate,
          toDate: toDate,
          milkType: milkTypeFilter,
          data: templateDataItems,
          payments: getNormalizedPayments(farmerInfo),
          current_bill: farmerInfo.current_bill,
          previous_bill: farmerInfo.previous_bill,
          bonus_deduction_info: templateFn === generateTemplate4
            ? format4BonusInfo
            : attachBonus(farmerInfo, bonusMap, templateDataItems.reduce((s, i) => s + i.liters, 0), toDate).bonus_deduction_info,
          bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary,
          bankDetails: farmerInfo.farmer_details ? {
            accountNumber: farmerInfo.farmer_details.accountNumber,
            ifscCode: farmerInfo.farmer_details.ifscCode,
            bankName: farmerInfo.farmer_details.bankName,
            accountHolder: farmerInfo.farmer_details.bname || undefined,
          } : undefined,
          hideRateAmount: hideRateAmount,
          ...(templateFn === generateTemplate6 || templateFn === generateTemplate8 ? { bill_header: billHeaderFor(vlcId, dairyName) } : {})
        };

        const bill = billTravelCommission(farmerId, farmerInfo.collections, farmerInfo.current_bill, commissionLookup, toDate);
        const isFormat7 = templateFn === generateTemplate7;

        // Check for mixed types (only relevant when milkTypeFilter is 'All').
        // Format 5 (Milk Bill), Format 6 and Format 8 keep both types on one page, so they never split.
        const hasCow = templateDataItems.some(item => item.type === 'Cow');
        const hasBuffalo = templateDataItems.some(item => item.type === 'Buffalo');
        const keepsTypesTogether = templateFn === generateTemplate5MilkBill || templateFn === generateTemplate6 || templateFn === generateTemplate8;
        const isMixed = milkTypeFilter === 'All' && hasCow && hasBuffalo && !keepsTypesTogether;

        if (isMixed) {
          // 1. Cow Page (Header YES, Summary NO)
          const cowHtml = templateFn({
            ...baseParams,
            milkType: 'Cow',
            hideHeader: false,
            hideSummary: true,
            travel_commission: bill.travel,
            ...(isFormat7 ? { daily_commission: dailyCommissionFor(bill, 'Cow', false) } : {})
          }, reportLang);
          const cowPage = await generatePage(cowHtml);
          if (i > 0) pdf.addPage();
          else if (pdf.getNumberOfPages() > 1) pdf.addPage();

          pdf.addImage(cowPage.imgData, 'JPEG', 0, 0, cowPage.imgWidth, cowPage.imgHeight);

          // 2. Buffalo Page (Header NO, Summary YES — the whole bill's travel commission)
          const buffaloHtml = templateFn({
            ...baseParams,
            milkType: 'Buffalo',
            hideHeader: true,
            hideSummary: false,
            travel_commission: bill.travel,
            ...(isFormat7 ? { daily_commission: dailyCommissionFor(bill, 'Buffalo', true) } : {})
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
            travel_commission: bill.travel,
            ...(isFormat7 ? { daily_commission: dailyCommissionFor(bill, actualMilkType === 'Buffalo' ? 'Buffalo' : 'Cow', true) } : {})
          }, reportLang);
          const page = await generatePage(htmlContent);

          if (i > 0) pdf.addPage();
          if (isMilkBill) {
            pdf.addImage(page.imgData, 'JPEG', 0, 0, A4_WIDTH, milkBillHeight);
          } else {
            pdf.addImage(page.imgData, 'JPEG', 0, 0, page.imgWidth, page.imgHeight);
          }
        }

        // Save in batches to avoid memory issues
        if ((i + 1) % BATCH_SIZE === 0 && i < filteredFarmerIds.length - 1) {
          pdf.save(buildPdfFileName(dairyName, branchName, fromDate, toDate, `Part${Math.floor(i / BATCH_SIZE) + 1}`));
          pdf = new jsPDF('p', 'mm', 'a4');
        }
        reportBillProgress(i + 1, filteredFarmerIds.length);
      }

      pdf.save(buildPdfFileName(pdfNameFor(dairyName, filteredFarmerIds.map(id => farmerDataMap.get(id))), branchName, fromDate, toDate));
      return { status: 'saved', message: 'pdf_downloaded_successfully' };
    } catch (error) {
      if (error === EXPORT_CANCELLED) throw error;
      console.error('PDF Generation Error:', error);
      return { status: 'failed', message: 'failed_to_generate_pdf' };
    }
  };

  const exportMultiPerPagePDF = async (job: ExportJob, exportData: Promise<ExportData>, chunkSize: number): Promise<ExportOutcome> => {
    const { vlcId, fromDate, toDate, farmerCode } = job;
    try {
      const selectedBranch = branches.find(v => v.branch_id.toString() === vlcId);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.name || '';
      const branchName = selectedBranch?.branchName || '';

      // Farmer data, bonus data, report language, and commissions (fetched in parallel)
      const [response, bonusMap, reportLang, commissionLookup] = await exportData;

      if (!response.data.success) {
        return { status: 'failed', message: 'failed_to_fetch_farmer_report_data' };
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
            const withBonus = attachBonus(cow, bonusMap, cow.collections_summary?.total_quantity || 0, toDate);
            allData.push({ ...withBonus, _displayMilkType: 'Cow', _hideDeductions: isMixed });
          }
          if (buffalo) {
            const withBonus = attachBonus(buffalo, bonusMap, buffalo.collections_summary?.total_quantity || 0, toDate);
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
          .map(f => ({ ...attachBonus(f, bonusMap, f.collections_summary?.total_quantity || 0, toDate), _displayMilkType: 'Cow', _hideDeductions: false }));
      } else {
        allData = buffaloData
          .sort((a, b) => parseInt(a.farmer_id) - parseInt(b.farmer_id))
          .map(f => ({ ...attachBonus(f, bonusMap, f.collections_summary?.total_quantity || 0, toDate), _displayMilkType: 'Buffalo', _hideDeductions: false }));
      }

      if (allData.length === 0) {
        return { status: 'empty', message: 'no_data_found_for_selected_period' };
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
        return { status: 'empty', message: 'no_data_found_for_selected_farmer_or_criteria' };
      }

      // A mixed farmer arrives as a cow entry and a buffalo entry; the commission
      // belongs to the whole bill, so it is worked out from both
      const collectionsByFarmer = new Map<string, any[]>();
      [...cowData, ...buffaloData].forEach((f) => {
        collectionsByFarmer.set(f.farmer_id, [...(collectionsByFarmer.get(f.farmer_id) || []), ...f.collections]);
      });

      for (let i = 0; i < filteredData.length; i += chunkSize) {
        const chunk = filteredData.slice(i, i + chunkSize);

        const farmersWithComm = chunk.map(farmer => ({
          ...farmer,
          travel_commission: billTravelCommission(
            farmer.farmer_id,
            collectionsByFarmer.get(farmer.farmer_id) || farmer.collections,
            farmer.current_bill,
            commissionLookup,
            toDate
          ).travel
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
        reportBillProgress(Math.min(i + chunkSize, filteredData.length), filteredData.length);
      }

      pdf.save(buildPdfFileName(pdfNameFor(dairyName, filteredData), branchName, fromDate, toDate));
      return { status: 'saved', message: 'pdf_downloaded_successfully' };

    } catch (error: any) {
      if (error === EXPORT_CANCELLED) throw error;
      console.error('Export error:', error);
      return { status: 'failed', message: 'failed_to_generate_pdf' };
    }
  };

  const exportDetailedHorizontalPDF = async (job: ExportJob, exportData: Promise<ExportData>): Promise<ExportOutcome> => {
    const { vlcId, fromDate, toDate, farmerCode } = job;
    try {
      const selectedBranch = branches.find(v => v.branch_id.toString() === vlcId);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.name || '';
      const branchName = selectedBranch?.branchName || '';

      // Farmer data, bonus data, report language, and commissions (fetched in parallel)
      const [response, bonusMap, reportLang, commissionLookup] = await exportData;

      if (!response.data.success) {
        return { status: 'failed', message: 'failed_to_fetch_farmer_report_data' };
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
        return { status: 'empty', message: 'no_data_found_for_selected_farmer_or_criteria' };
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
          bonus_deduction_info: attachBonus(farmer, bonusMap, farmer.collections_summary?.total_quantity || 0, toDate).bonus_deduction_info,
          bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary || null,
          travel_commission: billTravelCommission(farmer.farmer_id, farmer.collections, farmer.current_bill, commissionLookup, toDate).travel
        };

        const hasCow = farmerBillData.some(d => d.type === 'Cow');
        const hasBuffalo = farmerBillData.some(d => d.type === 'Buffalo' || d.type === 'Buffaloes');

        if (hasCow && hasBuffalo) {
          // Page 1: Cow only, hide summary
          const cowHtml = generateTemplateDetailedHorizontal({
            ...templateData,
            renderOnly: 'Cow',
            hideSummary: true
          } as any, reportLang);
          const cowPage = await generatePage(cowHtml);
          if (i > 0) pdf.addPage();
          pdf.addImage(cowPage.imgData, 'JPEG', 0, 0, cowPage.imgWidth, cowPage.imgHeight);

          // Page 2: Buffalo only, show summary — the whole bill's travel commission
          const buffHtml = generateTemplateDetailedHorizontal({
            ...templateData,
            renderOnly: 'Buffalo',
            hideSummary: false
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
        reportBillProgress(i + 1, sortedFarmers.length);
      }
      pdf.save(buildPdfFileName(pdfNameFor(dairyName, sortedFarmers), branchName, fromDate, toDate));
      return { status: 'saved', message: 'detailed_pdf_downloaded_successfully' };
    } catch (error) {
      if (error === EXPORT_CANCELLED) throw error;
      console.error('Export error:', error);
      return { status: 'failed', message: 'failed_to_generate_detailed_pdf' };
    }
  };

  const exportJob = (job: ExportJob, exportData: Promise<ExportData>) => {
    if (exportFormat === 'detailed-horizontal') return exportDetailedHorizontalPDF(job, exportData);
    if (exportFormat === '1-per-page') return exportToPDF(job, exportData);
    if (exportFormat === 'format-4') return exportToPDF(job, exportData, generateTemplate4);
    if (exportFormat === 'format-5') return exportToPDF(job, exportData, generateTemplate5MilkBill);
    if (exportFormat === 'format-6') return exportToPDF(job, exportData, generateTemplate6);
    if (exportFormat === 'format-7') return exportToPDF(job, exportData, generateTemplate7);
    if (exportFormat === 'format-8') return exportToPDF(job, exportData, generateTemplate8);
    if (exportFormat === '2-per-page') return exportMultiPerPagePDF(job, exportData, 1);
    return exportMultiPerPagePDF(job, exportData, 3);
  };

  // Downloads one PDF per selected VLC, one after another. While a VLC is being
  // drawn, the next VLC's data is already being fetched.
  const handleExport = async () => {
    if (selectedVLCs.length === 0 || !fromDate) {
      toast.error(t('please_select_vlc_center_and_date_range'));
      return;
    }
    const single = selectedVLCs.length === 1;
    if (single && (exportFormat === '1-per-page' || exportFormat === 'format-4' || exportFormat === 'format-5' || exportFormat === 'format-6' || exportFormat === 'format-7' || exportFormat === 'format-8') && collectionData.length === 0) {
      toast.error(t('please_click_show_first_for_detailed_report'));
      return;
    }
    setShowExportModal(false);

    // In the order the VLCs are listed, not the order they were ticked
    const jobs: ExportJob[] = branches
      .filter((b: any) => selectedVLCs.includes(b.branch_id.toString()))
      .map((b: any) => {
        // Each VLC's own bill period: the cycle around the chosen from date
        const period = calculateDateRange(fromDate, b.days || 10);
        return {
          vlcId: b.branch_id.toString(),
          label: [`${vlcNo.prefix(b.username)}${b.username}`, b.name].filter(Boolean).join(' - '),
          fromDate: period.from,
          toDate: period.to,
          // Farmer codes are per VLC, so the filter only applies to a single-VLC download
          farmerCode: single ? farmerCode : ''
        };
      });
    if (jobs.length === 0) return;

    cancelExportRef.current = false;
    setPdfLoading(true);
    const results: { job: ExportJob; outcome: ExportOutcome }[] = [];
    let cancelled = false;
    let host: Awaited<ReturnType<typeof createRenderHost>> | null = null;
    try {
      host = await createRenderHost();
      renderDocRef.current = host.doc;
      billHeadersRef.current = null;
      if (exportFormat === 'format-6' || exportFormat === 'format-8') await loadBillHeaders();

      let nextData = fetchExportData(jobs[0]);
      for (let i = 0; i < jobs.length; i++) {
        const data = nextData;
        if (i + 1 < jobs.length) {
          nextData = fetchExportData(jobs[i + 1]);
          // Awaited on its turn; this only stops an "unhandled rejection" if the run is stopped first
          nextData.catch(() => {});
        }
        setExportProgress({ vlc: jobs[i].label, current: i + 1, count: jobs.length, done: 0, total: 0 });
        try {
          results.push({ job: jobs[i], outcome: await exportJob(jobs[i], data) });
        } catch (error) {
          if (error !== EXPORT_CANCELLED) throw error;
          cancelled = true;
          break;
        }
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error(t('failed_to_generate_pdf'));
    } finally {
      renderDocRef.current = null;
      host?.dispose();
      setExportProgress(null);
      setPdfLoading(false);
    }

    if (cancelled) toast.info(t('pdf_download_stopped'));
    if (single) {
      const outcome = results[0]?.outcome;
      if (outcome?.status === 'saved') toast.success(t(outcome.message));
      else if (outcome?.status === 'empty') toast.info(t(outcome.message));
      else if (outcome) toast.error(t(outcome.message));
      return;
    }
    const saved = results.filter(r => r.outcome.status === 'saved').length;
    const labelsWith = (status: ExportOutcome['status']) => results.filter(r => r.outcome.status === status).map(r => r.job.label).join(', ');
    (saved === jobs.length ? toast.success : toast.warning)(t('multi_vlc_download_summary', { saved, count: jobs.length }));
    if (labelsWith('empty')) toast.info(t('multi_vlc_no_data', { list: labelsWith('empty') }));
    if (labelsWith('failed')) toast.error(t('multi_vlc_failed', { list: labelsWith('failed') }));
  };

  return (
    <div className="p-2 sm:p-4 bg-gray-50 min-h-screen text-left">
      <PdfLoader
        isLoading={pdfLoading}
        message={exportProgress && (
          <>
            {exportProgress.count > 1 && (
              <span className="block font-semibold">{t('pdf_export_vlc_progress', { current: exportProgress.current, count: exportProgress.count })}</span>
            )}
            <span className="block">{exportProgress.vlc}</span>
            {exportProgress.total > 0 && (
              <span className="block tabular-nums">{t('pdf_export_bill_progress', { done: exportProgress.done, total: exportProgress.total })}</span>
            )}
          </>
        )}
        onCancel={exportProgress ? () => { cancelExportRef.current = true; } : undefined}
        cancelLabel={t('cancel')}
      />
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
            value={selectedVLCs}
            onChange={setSelectedVLCs}
            valueKey="branch_id"
            isMultiSelect
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
        // The bill's travel commission is already inside its saved net payable
        const travel = bill ? billTravelCommission(
          farmerId,
          searchBills.filter((b: any) => b.farmer_id === farmerId).flatMap((b: any) => b.collections || []),
          bill.current_bill,
          commissionLookup
        ).travel : undefined;

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
                      {travel && (
                        <div className="p-4 bg-gray-50 rounded">
                          <p className="text-sm text-gray-600">{t('travel_commission')}</p>
                          <p className="text-xl font-bold">₹{travel.amount.toFixed(2)}</p>
                        </div>
                      )}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-600 font-semibold">{t('net_payable')}</p>
                        <p className="text-2xl font-bold text-blue-700">
                          ₹{parseFloat(bill.current_bill.net_payable || '0').toFixed(2)}
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
        <DialogContent className="sm:max-w-[820px] max-h-[92vh] bg-white border-none shadow-2xl rounded-2xl p-0 gap-0 overflow-hidden flex flex-col [&>button]:text-white">
          <DialogHeader className="bg-slate-900 text-white p-5 sm:p-6 text-left">
            <DialogTitle className="text-xl font-bold flex items-center">
              <FileText className="w-5 h-5 mr-3 text-blue-400" />
              {t('select_export_format')}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              {t('choose_farmer_bills_per_a4')}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto bg-slate-50/60">
            {selectedVLCs.length > 1 && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <Info className="w-4 h-4 mt-px shrink-0" />
                <p>{t('multi_vlc_download_hint', { count: selectedVLCs.length })}</p>
              </div>
            )}
            <RadioGroup
              value={exportFormat}
              onValueChange={(val) => setExportFormat(val as ExportFormat)}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
            >
              {EXPORT_FORMATS.map(({ value, number, labelKey }) => {
                const active = exportFormat === value;
                return (
                  <label
                    key={value}
                    htmlFor={`export-${value}`}
                    className={`flex flex-col gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-400 has-[:focus-visible]:ring-offset-2 ${active
                      ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-100'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-bold tabular-nums ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {number}
                      </span>
                      <RadioGroupItem
                        value={value}
                        id={`export-${value}`}
                        className={`bg-white ${active ? 'border-blue-600 [&_svg]:fill-blue-600 [&_svg]:text-blue-600' : 'border-slate-300'}`}
                      />
                    </div>
                    <div className={`rounded-lg py-3 transition-colors ${active ? 'bg-blue-100/70' : 'bg-slate-100'}`}>
                      <FormatPreview format={value} active={active} />
                    </div>
                    <span className={`text-sm font-semibold leading-snug ${active ? 'text-blue-900' : 'text-slate-700'}`}>
                      {t(labelKey)}
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          <DialogFooter className="bg-white px-4 sm:px-6 py-4 border-t border-slate-100 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowExportModal(false)} className="hover:bg-slate-100 rounded-xl px-6">
              {t('cancel')}
            </Button>
            <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 font-semibold shadow-lg shadow-blue-100">
              <Download className="w-4 h-4 mr-2" />
              {t('download_pdf')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerBillInvoiceReport;
