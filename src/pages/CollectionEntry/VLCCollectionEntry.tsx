import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { HelpCircle, Upload, Download, ChevronDown, Search, Check, X, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import LastEntryDetails from "@/components/LastEntryDetails";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { usePostApi, usePutApi, useDeleteApi } from "@/services/use-api";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { rateChartApi } from "@/services/rateChartApi";
import { calculateCLRFromFatAndSNF, calculateSNFFromFatAndCLR } from "@/utils/milkCalculations";
import { useTranslation } from "react-i18next";
import * as XLSX from 'xlsx';
import { VLCDropdown } from "@/components/ui/vlc-dropdown";


interface FormData {
  date: Date | undefined;
  shift: string;
  userId: string;
  vlcName: string;
  milkType: 'Cow' | 'Buffalo';
  rateChartName: string;
  weight: string;
  fat: string;
  snf: string;
  clr: string;
  rate: string;
  amount: number;
  type: 'Cow' | 'Buffalo' | 'Both';
}

const VLCCollectionEntry = () => {
  const { t } = useTranslation();
  const { postData, isLoading } = usePostApi({
    path: "/api/web/collection/vlc-entry"
  });
  const { postData: fetchEntries } = usePostApi({
    path: "/api/web/collection/vlc-entries"
  });
  const { postData: bulkPostData, isLoading: isBulkLoading } = usePostApi({
    path: "/api/web/collection/bulk-vlc-entries"
  });
  const { putData, isLoading: isUpdating } = usePutApi({
    path: "/api/web/collection/vlc-entry"
  });
  const { deleteData } = useDeleteApi({
    path: "/api/web/collection/vlc-entry"
  });
  const { branches } = useAppSelector((state) => state.branch);
  const [lastEntries, setLastEntries] = useState([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vlcOpen, setVlcOpen] = useState(false);
  const [vlcSearch, setVlcSearch] = useState("");
  const vlcSearchRef = useRef<HTMLInputElement>(null);
  const vlcWrapperRef = useRef<HTMLDivElement>(null);

  const [bulkVlcOpen, setBulkVlcOpen] = useState(false);
  const [bulkVlcSearch, setBulkVlcSearch] = useState("");
  const bulkVlcSearchRef = useRef<HTMLInputElement>(null);
  const bulkVlcWrapperRef = useRef<HTMLDivElement>(null);



  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 17 ? "evening" : "morning";
  };

  const [bulkFormData, setBulkFormData] = useState({
    date: new Date(),
    shift: getDefaultShift(),
    vlcId: '',
    vlcName: '',
    type: 'Both' as 'Cow' | 'Buffalo' | 'Both'
  });

  const [formData, setFormData] = useState<FormData>({
    date: new Date(),
    shift: getDefaultShift(),
    userId: "",
    vlcName: "",
    milkType: 'Cow',
    rateChartName: 'Rate Chart 1',
    weight: "",
    fat: "",
    snf: "",
    clr: "",
    rate: "",
    amount: 0,
    type: 'Both',
  });

  const handleInputChange = (field: keyof FormData, value: string | Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVLCIdChange = (username: string) => {
    const selectedBranch = branches?.find(branch => branch.username === username);
    setFormData(prev => ({
      ...prev,
      userId: username,
      vlcName: selectedBranch?.name || ""
    }));
  };

  // Auto-calculate CLR from FAT and SNF
  useEffect(() => {
    if (formData.fat && formData.snf && !formData.clr) {
      const calculatedCLR = calculateCLRFromFatAndSNF(formData.fat, formData.snf);
      if (calculatedCLR) setFormData(prev => ({ ...prev, clr: calculatedCLR }));
    }
  }, [formData.fat, formData.snf]);

  // Auto-calculate SNF from FAT and CLR
  useEffect(() => {
    if (formData.fat && formData.clr && !formData.snf) {
      const calculatedSNF = calculateSNFFromFatAndCLR(formData.fat, formData.clr);
      if (calculatedSNF) setFormData(prev => ({ ...prev, snf: calculatedSNF }));
    }
  }, [formData.fat, formData.clr]);

  // Calculate rate and amount when fat, snf, and weight change
  useEffect(() => {
    const fetchRate = async () => {
      if (!formData.fat || !formData.snf || !formData.userId || !formData.date || !formData.rateChartName) return;

      const selectedBranch = branches?.find(branch => branch.username === formData.userId);
      if (!selectedBranch) return;

      try {
        const response = await rateChartApi.getRate(
          parseFloat(formData.fat),
          parseFloat(formData.snf),
          selectedBranch.branch_id,
          formData.rateChartName,
          formData.type === 'Buffalo' ? 'Buffalo' : 'Cow',
          format(formData.date, 'yyyy-MM-dd'),
          formData.shift.charAt(0).toUpperCase() + formData.shift.slice(1) as 'Morning' | 'Evening'
        );

        if (response?.price) {
          const rate = response.price.toString();
          const amount = formData.weight ? parseFloat(formData.weight) * parseFloat(rate) : 0;
          setFormData(prev => ({
            ...prev,
            rate,
            amount
          }));
        } else {
          setFormData(prev => ({ ...prev, rate: '0', amount: 0 }));
        }
      } catch (error: any) {
        console.error('❌ Error fetching rate:', error);
        setFormData(prev => ({ ...prev, rate: '0', amount: 0 }));
        if (error?.response?.status === 404) {
          toast.error('Rate not found for selected parameters');
        }
      }
    };

    const timer = setTimeout(fetchRate, 300);
    return () => clearTimeout(timer);
  }, [formData.fat, formData.snf, formData.weight, formData.userId, formData.date, formData.type, formData.rateChartName, formData.shift, branches]);

  const fetchLastEntries = async () => {
    if (!branches?.length || !formData.date || !formData.shift) return;

    try {
      const vlcIds = branches.map(branch => branch.username);
      const payload = {
        vlc_ids: vlcIds,
        date: format(formData.date, 'yyyy-MM-dd'),
        shift: formData.shift.charAt(0).toUpperCase() + formData.shift.slice(1)
      };
      const response = await fetchEntries(payload);

      if (response?.data?.success) {
        setLastEntries(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch last entries:', error);
    }
  };

  useEffect(() => {
    fetchLastEntries();
  }, [branches, formData.date, formData.shift]);

  const getFilteredEntries = () => {
    return lastEntries;
  };

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
          fetchLastEntries();
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

  const handleSubmit = async () => {
    // Validation
    if (!formData.date || !formData.shift || !formData.userId || !formData.vlcName ||
      !formData.weight || !formData.fat || !formData.snf || !formData.clr || !formData.rate) {
      toast.error("All fields are required");
      return;
    }

    try {
      const payload = {
        date: format(formData.date, 'yyyy-MM-dd HH:mm:ss'),
        shift: formData.shift.charAt(0).toUpperCase() + formData.shift.slice(1),
        vlc_id: formData.userId,
        vlc_name: formData.vlcName,
        weight: parseFloat(formData.weight),
        fat: parseFloat(formData.fat),
        snf: parseFloat(formData.snf),
        clr: parseFloat(formData.clr),
        rate: parseFloat(formData.rate),
        amount: formData.amount,
        type: formData.type
      };

      console.log('📤 Submitting VLC entry:', payload);

      const response = editingId
        ? await putData(payload, `/api/web/collection/vlc-entry/${editingId}`)
        : await postData(payload);

      if (response?.data?.success) {
        toast.success(editingId ? "VLC entry updated successfully" : "VLC entry created successfully");
        // Reset form but keep date and shift
        const currentDate = formData.date;
        const currentShift = formData.shift;
        setEditingId(null);
        setFormData({
          date: currentDate,
          shift: currentShift,
          userId: "",
          vlcName: "",
          milkType: 'Cow',
          rateChartName: 'Rate Chart 1',
          weight: "",
          fat: "",
          snf: "",
          clr: "",
          rate: "",
          amount: 0,
          type: 'Both',
        });
        fetchLastEntries();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} VLC entry`);
    }
  };

  const handleEdit = (entry: any) => {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setEditingId(entry.id);
    setFormData({
      date: new Date(entry.date),
      shift: entry.shift.toLowerCase(),
      userId: entry.vlc_id,
      vlcName: entry.vlc_name,
      milkType: entry.type === 'Buffalo' ? 'Buffalo' : 'Cow',
      rateChartName: 'Rate Chart 1',
      weight: entry.weight.toString(),
      fat: entry.fat.toString(),
      snf: entry.snf.toString(),
      clr: entry.clr.toString(),
      rate: entry.rate ? entry.rate.toString() : "",
      amount: Number(entry.amount || (entry.weight * entry.rate) || 0),
      type: (entry.type as 'Cow' | 'Buffalo' | 'Both') || 'Both'
    });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        const response = await deleteData(`/api/web/collection/vlc-entry/${id}`);
        if (response?.data?.success) {
          fetchLastEntries();
        }
      } catch (error) {
        console.error("Failed to delete entry:", error);
      }
    }
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

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 w-full p-4 md:p-6 max-w-7xl mx-auto min-w-0 overflow-x-hidden" onKeyDown={handleEnterAsTab}>
      <div className="w-full lg:w-[65%] space-y-4 md:space-y-6 min-w-0">
        
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
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto mt-3 sm:mt-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleBulkImport}
                  className="hidden"
                />
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
            </div>


        <Card className="shadow-sm border border-gray-200/60 bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 space-y-6 enter-nav-container">
            {/* Date, Shift, VLC ID in one row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('date')}
                </Label>
                <Input
                  type="date"
                  id="date"
                  value={formData.date ? format(formData.date, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (isValid(d)) handleInputChange("date", d);
                  }}
                  className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm text-sm enter-field"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shift" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('shift')}
                </Label>
                <Select value={formData.shift} onValueChange={(value) => handleInputChange("shift", value)}>
                  <SelectTrigger className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm text-sm enter-field">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-lg border-gray-100">
                    <SelectItem value="morning" className="cursor-pointer hover:bg-gray-50 rounded-lg">{t('morning')}</SelectItem>
                    <SelectItem value="evening" className="cursor-pointer hover:bg-gray-50 rounded-lg">{t('evening')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 overflow-visible">
                <Label htmlFor="userId" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('vlc_id')}
                </Label>
                <VLCDropdown
                  branches={branches || []}
                  value={formData.userId}
                  onChange={handleVLCIdChange}
                />
              </div>
            </div>

            {/* VLC Name and Type in one row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="vlcName" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('vlc_name')}
                </Label>
                <Input
                  id="vlcName"
                  placeholder="VLC Name"
                  value={formData.vlcName}
                  readOnly
                  className="bg-gray-50/70 border-gray-200 text-gray-600 w-full h-10 rounded-xl cursor-not-allowed shadow-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </Label>
                <Select value={formData.type} onValueChange={(value: 'Cow' | 'Buffalo' | 'Both') => handleInputChange("type", value)}>
                  <SelectTrigger className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm text-sm enter-field">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-lg border-gray-100">
                    <SelectItem value="Cow" className="cursor-pointer hover:bg-gray-50 rounded-lg">Cow</SelectItem>
                    <SelectItem value="Buffalo" className="cursor-pointer hover:bg-gray-50 rounded-lg">Buffalo</SelectItem>
                    <SelectItem value="Both" className="cursor-pointer hover:bg-gray-50 rounded-lg">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Weight, Fat, SNF in one row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="weight" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('weight')} <span className="text-gray-400 normal-case font-normal">(kg)</span>
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900 enter-field"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fat" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('fat')} <span className="text-gray-400 normal-case font-normal">(%)</span>
                </Label>
                <Input
                  id="fat"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.fat}
                  onChange={(e) => handleInputChange("fat", e.target.value)}
                  className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900 enter-field"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="snf" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('snf')} <span className="text-gray-400 normal-case font-normal">(%)</span>
                </Label>
                <Input
                  id="snf"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.snf}
                  onChange={(e) => {
                    handleInputChange("snf", e.target.value);
                    if (e.target.value) setFormData(prev => ({ ...prev, clr: '' }));
                  }}
                  className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900 enter-field"
                />
              </div>
            </div>

            {/* CLR, Rate, Amount in one row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="clr" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('clr')}
                </Label>
                <Input
                  id="clr"
                  type="number"
                  step="0.1"
                  placeholder="0.0"

                  value={formData.clr}
                  onChange={(e) => {
                    handleInputChange("clr", e.target.value);
                    if (e.target.value) setFormData(prev => ({ ...prev, snf: '' }));
                  }}
                  className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900 enter-field"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rate" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('rate_per_kg')}
                </Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.rate}
                  readOnly
                  className="bg-blue-50/30 border-blue-100 text-blue-900 font-semibold w-full h-10 rounded-xl shadow-inner cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('total_amount')}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={Number(formData.amount || 0).toFixed(2)}
                    readOnly
                    className="bg-green-50/30 border-green-200 text-green-900 font-bold w-full h-10 rounded-xl shadow-inner pl-7 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
              {editingId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentDate = formData.date;
                    const currentShift = formData.shift;
                    setEditingId(null);
                    setFormData({
                      date: currentDate,
                      shift: currentShift,
                      userId: "",
                      vlcName: "",
                      milkType: 'Cow',
                      rateChartName: 'Rate Chart 1',
                      weight: "",
                      fat: "",
                      snf: "",
                      clr: "",
                      rate: "",
                      amount: 0,
                      type: 'Both',
                    });
                  }}
                  className="w-full sm:w-auto border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl px-6"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={isLoading || isUpdating}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-10 shadow-md shadow-blue-500/20 font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 enter-field"
              >
                {isLoading || isUpdating ? t('submitting') : editingId ? "Update Entry" : t('submit_entry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full lg:w-[35%] min-w-0">
        <LastEntryDetails
          entries={getFilteredEntries()}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

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
                <VLCDropdown
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
