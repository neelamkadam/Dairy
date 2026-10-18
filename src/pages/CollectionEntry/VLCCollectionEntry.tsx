import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, isValid } from "date-fns";
import { Upload, Download, Building, Scale, FlaskConical, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { usePostApi } from "@/services/use-api";
import { getSidebarAccess, getVlcStepAccess } from "@/services/sidebarAccessApi";
import { useMachineEntryLock } from "@/hooks/useMachineEntryLock";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { useTranslation } from "react-i18next";
import * as XLSX from 'xlsx';
import VLCIdPicker from "./VLCIdPicker";
import VLCWeightEntry from "./VLCWeightEntry";
import VLCAnalyserEntry from "./VLCAnalyserEntry";
import { VLCMilkType } from "@/services/vlcCollectionApi";

type CollectionStep = 'weight' | 'analyser';

const STEP_STORAGE_KEY = 'vlc_collection_step';

const VLCCollectionEntry = () => {
  const { t } = useTranslation();
  const { postData: bulkPostData, isLoading: isBulkLoading } = usePostApi({
    path: "/api/web/collection/bulk-vlc-entries"
  });
  const { branches } = useAppSelector((state) => state.branch);
  const userId = useAppSelector((state) => state.authData?.userData?.id);

  // Which steps this user may open (Sidebar Access). Nothing renders until it is
  // known, so an analyser-only user never glimpses the weight list.
  const [stepAccess, setStepAccess] = useState<{ weight: boolean; analyser: boolean } | null>(null);
  const [accessFailed, setAccessFailed] = useState(false);

  const loadAccess = useCallback(async () => {
    if (!userId) return;
    setAccessFailed(false);
    try {
      const response = await getSidebarAccess(Number(userId));
      if (!response?.success) throw new Error(response?.message);
      setStepAccess(getVlcStepAccess(response.data));
    } catch (error) {
      console.error('Failed to load VLC step access:', error);
      setAccessFailed(true);
    }
  }, [userId]);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Weight-entry milk type: defaults to Cow and sticks while the user stays on this page
  const [weightMilkType, setWeightMilkType] = useState<VLCMilkType>('Cow');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 17 ? "evening" : "morning";
  };

  // Weighing and analysing usually happen at different desks, so each machine remembers its step
  const [step, setStep] = useState<CollectionStep>(() =>
    localStorage.getItem(STEP_STORAGE_KEY) === 'analyser' ? 'analyser' : 'weight'
  );
  const [date, setDate] = useState<Date>(new Date());
  const [shift, setShift] = useState(getDefaultShift());

  const dateParam = format(date, 'yyyy-MM-dd');
  const shiftParam = (shift.charAt(0).toUpperCase() + shift.slice(1)) as 'Morning' | 'Evening';

  const handleStepChange = (next: CollectionStep) => {
    setStep(next);
    localStorage.setItem(STEP_STORAGE_KEY, next);
  };

  const [bulkFormData, setBulkFormData] = useState({
    date: new Date(),
    shift: getDefaultShift(),
    vlcId: '',
    vlcName: '',
    type: 'Both' as 'Cow' | 'Buffalo' | 'Both'
  });

  const downloadTemplate = () => {
    const headers = ['weight', 'fat', 'snf', 'clr', 'rate', 'amount', 'type'];
    const sampleData = [
      ['100', '4.5', '8.5', '28', '45', '4500', 'Cow']
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VLC Template');
    XLSX.writeFile(wb, 'vlc_bulk_import_template.xlsx');
  };

  const handleBulkVLCIdChange = (username: string) => {
    const selectedBranch = branches?.find(branch => branch.username === username);
    setBulkFormData(prev => ({
      ...prev,
      vlcId: username,
      vlcName: selectedBranch?.name || ''
    }));
  };

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!bulkFormData.date || !bulkFormData.shift || !bulkFormData.vlcId || !bulkFormData.vlcName) {
      toast.error('Please fill all fields before uploading file');
      return;
    }

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let entries = [];

        if (isExcel) {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            toast.error('Excel file is empty or invalid');
            return;
          }

          const headers = jsonData[0].map((h: any) => h.toString().trim().toLowerCase());

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const entry: any = {};
            headers.forEach((header, index) => {
              entry[header] = row[index];
            });

            entries.push({
              date: format(bulkFormData.date, 'yyyy-MM-dd'),
              shift: bulkFormData.shift.charAt(0).toUpperCase() + bulkFormData.shift.slice(1),
              vlc_id: bulkFormData.vlcId,
              vlc_name: bulkFormData.vlcName,
              weight: parseFloat(entry.weight),
              fat: parseFloat(entry.fat),
              snf: parseFloat(entry.snf),
              clr: parseFloat(entry.clr),
              rate: parseFloat(entry.rate),
              amount: parseFloat(entry.amount),
              type: entry.type || bulkFormData.type
            });
          }
        } else {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());

          if (lines.length < 2) {
            toast.error('CSV file is empty or invalid');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const entry: any = {};

            headers.forEach((header, index) => {
              entry[header] = values[index];
            });

            entries.push({
              date: format(bulkFormData.date, 'yyyy-MM-dd'),
              shift: bulkFormData.shift.charAt(0).toUpperCase() + bulkFormData.shift.slice(1),
              vlc_id: bulkFormData.vlcId,
              vlc_name: bulkFormData.vlcName,
              weight: parseFloat(entry.weight),
              fat: parseFloat(entry.fat),
              snf: parseFloat(entry.snf),
              clr: parseFloat(entry.clr),
              rate: parseFloat(entry.rate),
              amount: parseFloat(entry.amount),
              type: entry.type || bulkFormData.type
            });
          }
        }

        const response = await bulkPostData({ entries });

        if (response?.data?.success) {
          toast.success(`${response.data.message}`);
          setIsBulkDialogOpen(false);
          setBulkFormData({
            date: new Date(),
            shift: getDefaultShift(),
            vlcId: '',
            vlcName: '',
            type: 'Both'
          });
          setRefreshKey(key => key + 1);
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to import bulk entries');
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEnterAsTab = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('enter-field')) return;

      e.preventDefault();

      const container = target.closest('.enter-nav-container');
      if (!container) return;

      const fields = Array.from(
        container.querySelectorAll('.enter-field:not([disabled]):not([readonly])')
      ) as HTMLElement[];

      const index = fields.indexOf(target);
      if (index > -1 && index < fields.length - 1) {
        fields[index + 1].focus();
      } else if (index === fields.length - 1 && target.tagName === 'BUTTON') {
        fields[index].click();
      }
    }
  };

  const steps: { key: CollectionStep; label: string; hint: string; icon: ReactNode }[] = [
    { key: 'weight', label: t('weight_collection'), hint: 'Step 1', icon: <Scale className="h-4 w-4" /> },
    { key: 'analyser', label: t('analyser_collection'), hint: 'Step 2', icon: <FlaskConical className="h-4 w-4" /> },
  ];
  const allowedSteps = steps.filter((s) => stepAccess?.[s.key]);
  // The remembered step may no longer be allowed; fall back to one that is.
  const activeStep = allowedSteps.some((s) => s.key === step) ? step : allowedSteps[0]?.key;
  const machineLock = useMachineEntryLock();
  // Bulk import writes weight and quality together, so it needs both steps;
  // it is typed-in data, so not for a user under Machine Entry Lock.
  const canBulkImport = !!stepAccess?.weight && !!stepAccess?.analyser && !machineLock.analyser && !machineLock.weight;

  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full p-4 md:p-6 max-w-7xl mx-auto min-w-0 overflow-x-hidden" onKeyDown={handleEnterAsTab}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Building className="h-6 w-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
            {t('vlc_collection_entry')}
          </h1>
        </div>
        {canBulkImport && (
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto mt-3 sm:mt-0">
          <Button
            onClick={downloadTemplate}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none text-green-700 bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 hover:text-green-800 transition-colors shadow-sm rounded-lg px-3"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Template
          </Button>
          <Button
            onClick={() => setIsBulkDialogOpen(true)}
            disabled={isBulkLoading}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800 transition-colors shadow-sm rounded-lg px-3"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {isBulkLoading ? 'Importing...' : 'Bulk Import'}
          </Button>
        </div>
        )}
      </div>

      {!stepAccess ? (
        <div className="flex flex-col items-center justify-center gap-3 h-48 bg-white rounded-2xl border border-gray-100 shadow-sm">
          {accessFailed ? (
            <>
              <p className="text-sm text-gray-600">{t('failed_to_load_access', 'Could not load your access')}</p>
              <Button variant="outline" size="sm" onClick={loadAccess} className="rounded-lg">
                {t('retry', 'Retry')}
              </Button>
            </>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          )}
        </div>
      ) : !activeStep ? (
        <div className="flex flex-col items-center justify-center gap-2 h-48 px-4 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <Lock className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">
            {t('no_vlc_collection_access', "You don't have access to VLC Collection Entry")}
          </p>
          <p className="text-xs text-gray-500 max-w-sm">
            {t('ask_admin_vlc_access', 'Ask your admin to turn on Weight Collection or Analyser Collection for you in Sidebar Access.')}
          </p>
        </div>
      ) : (
      <>
      {/* Step switch + shared date / shift */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        {allowedSteps.length > 1 ? (
          <div className="flex p-1 bg-gray-100 rounded-xl w-full md:w-auto">
            {allowedSteps.map(({ key, label, hint, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleStepChange(key)}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-2 h-11 px-4 rounded-lg text-sm font-semibold transition-all",
                  activeStep === key
                    ? key === 'weight'
                      ? "bg-white text-blue-600 shadow-sm"
                      : "bg-white text-purple-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {icon}
                <span className="truncate">{label}</span>
                <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-wider text-gray-400">{hint}</span>
              </button>
            ))}
          </div>
        ) : (
          // Only one step allowed: name it, nothing to switch to.
          <div
            className={cn(
              "flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold",
              activeStep === 'weight' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
            )}
          >
            {allowedSteps[0].icon}
            {allowedSteps[0].label}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:ml-auto md:w-[360px]">
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {t('date')}
            </Label>
            <Input
              type="date"
              id="date"
              value={dateParam}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (isValid(d)) setDate(d);
              }}
              className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shift" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {t('shift')}
            </Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm text-sm">
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl shadow-lg border-gray-100">
                <SelectItem value="morning" className="cursor-pointer hover:bg-gray-50 rounded-lg">{t('morning')}</SelectItem>
                <SelectItem value="evening" className="cursor-pointer hover:bg-gray-50 rounded-lg">{t('evening')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {activeStep === 'weight' ? (
        <VLCWeightEntry
          date={dateParam}
          shift={shiftParam}
          refreshKey={refreshKey}
          type={weightMilkType}
          onTypeChange={setWeightMilkType}
        />
      ) : (
        <VLCAnalyserEntry date={dateParam} shift={shiftParam} refreshKey={refreshKey} />
      )}
      </>
      )}

      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent
          className="sm:max-w-[550px] bg-white border-0 shadow-2xl p-0 overflow-hidden rounded-2xl [&>button]:right-6 [&>button]:top-5 [&>button]:text-white/80 hover:[&>button]:text-white [&>button]:focus:ring-white/20"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 pr-12">
            <DialogHeader className="m-0 space-y-0 text-left">
              <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-100" />
                Bulk Import VLC Entries
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6 bg-slate-50/50 enter-nav-container">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Date</Label>
                <Input
                  type="date"
                  value={bulkFormData.date ? format(bulkFormData.date, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (isValid(d)) setBulkFormData(prev => ({ ...prev, date: d }));
                  }}
                  className="bg-white border-slate-200 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 w-full h-11 rounded-xl transition-all shadow-sm text-slate-700 enter-field"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Shift</Label>
                <Select value={bulkFormData.shift} onValueChange={(value) => setBulkFormData(prev => ({ ...prev, shift: value }))}>
                  <SelectTrigger className="bg-white border-slate-200 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 h-11 rounded-xl transition-all shadow-sm text-slate-700 enter-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl border-slate-200 shadow-lg">
                    <SelectItem value="morning" className="rounded-lg focus:bg-blue-50 focus:text-blue-700 font-medium">Morning</SelectItem>
                    <SelectItem value="evening" className="rounded-lg focus:bg-blue-50 focus:text-blue-700 font-medium">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2 overflow-visible">
                <Label className="text-sm font-semibold text-slate-700">VLC ID</Label>
                <VLCIdPicker
                  branches={branches || []}
                  value={bulkFormData.vlcId}
                  onChange={handleBulkVLCIdChange}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">VLC Name</Label>
                <Input
                  value={bulkFormData.vlcName}
                  readOnly
                  className="bg-slate-100/70 border-slate-200 text-slate-600 font-medium h-11 rounded-xl shadow-inner cursor-not-allowed placeholder:text-slate-400"
                  placeholder="Auto-filled"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Type (Default)</Label>
              <Select value={bulkFormData.type} onValueChange={(value: 'Cow' | 'Buffalo' | 'Both') => setBulkFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="bg-white border-slate-200 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 h-11 rounded-xl transition-all shadow-sm text-slate-700 enter-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="Cow" className="rounded-lg focus:bg-blue-50 focus:text-blue-700 font-medium">Cow</SelectItem>
                  <SelectItem value="Buffalo" className="rounded-lg focus:bg-blue-50 focus:text-blue-700 font-medium">Buffalo</SelectItem>
                  <SelectItem value="Both" className="rounded-lg focus:bg-blue-50 focus:text-blue-700 font-medium">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <div className="space-y-3 relative group">
                <Label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  Upload Excel/CSV File
                  <span className="text-xs font-normal text-slate-400 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">Max 5MB</span>
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleBulkImport}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-32 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 transition-all rounded-2xl bg-white shadow-sm hover:shadow-md group-hover:border-blue-400 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/50 group-hover:to-blue-100/50 transition-all opacity-50 pointer-events-none" />
                  <div className="flex flex-col items-center gap-3 relative z-10">
                    <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300 shadow-sm border border-blue-100">
                      <Upload className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                        Click to browse or drag & drop
                      </span>
                      <span className="text-[13px] text-slate-500 font-medium">
                        Supports <span className="text-slate-700 font-semibold">.csv</span>, <span className="text-slate-700 font-semibold">.xlsx</span>, <span className="text-slate-700 font-semibold">.xls</span>
                      </span>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VLCCollectionEntry;
