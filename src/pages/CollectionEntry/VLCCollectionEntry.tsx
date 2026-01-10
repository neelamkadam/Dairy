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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon, HelpCircle, Upload, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import LastEntryDetails from "@/components/LastEntryDetails";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { usePostApi } from "@/services/use-api";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { rateChartApi } from "@/services/rateChartApi";
import { calculateCLRFromFatAndSNF, calculateSNFFromFatAndCLR } from "@/utils/milkCalculations";
import { useTranslation } from "react-i18next";
import * as XLSX from 'xlsx';


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
}

const VLCCollectionEntry = () => {
  const { t } = useTranslation();
  const { postData, isLoading } = usePostApi({
    path: "/web/collection/vlc-entry"
  });
  const { postData: fetchEntries } = usePostApi({
    path: "/web/collection/vlc-entries"
  });
  const { postData: bulkPostData, isLoading: isBulkLoading } = usePostApi({
    path: "/web/collection/bulk-vlc-entries"
  });
  const { branches } = useAppSelector((state) => state.branch);
  const [lastEntries, setLastEntries] = useState([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 16 ? "evening" : "morning";
  };

  const [bulkFormData, setBulkFormData] = useState({
    date: new Date(),
    shift: getDefaultShift(),
    vlcId: '',
    vlcName: ''
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
          formData.milkType,
          format(formData.date, 'yyyy-MM-dd')
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
  }, [formData.fat, formData.snf, formData.weight, formData.userId, formData.date, formData.milkType, formData.rateChartName, branches]);

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
    const headers = ['weight', 'fat', 'snf', 'clr', 'rate', 'amount'];
    const sampleData = [
      ['100', '4.5', '8.5', '28', '45', '4500']
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
              amount: parseFloat(entry.amount)
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
              amount: parseFloat(entry.amount)
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
            vlcName: ''
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
        amount: formData.amount
      };

      console.log('📤 Submitting VLC entry:', payload);

      const response = await postData(payload);
      
      if (response?.data?.success) {
        toast.success("VLC entry created successfully");
        // Reset form
        setFormData({
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
        });
        fetchLastEntries();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create VLC entry");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 w-full px-4 md:w-[95%] m-auto mt-4 md:mt-10">
      <div className="w-full lg:w-[65%]">
        <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800">
              {t('vlc_collection_entry')}
            </CardTitle>
            <div className="flex items-center gap-2">
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
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
              <Button
                onClick={() => setIsBulkDialogOpen(true)}
                disabled={isBulkLoading}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isBulkLoading ? 'Importing...' : 'Bulk Import'}
              </Button>
              <HelpCircle className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Shift Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                {t('date')}
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? (
                      format(formData.date, "dd-MM-yyyy")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white z-50" align="start" sideOffset={5}>
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => {
                      if (date) {
                        handleInputChange("date", date);
                        setIsCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 ">
              <Label htmlFor="shift" className="text-sm font-medium text-gray-700">
                {t('shift')}
              </Label>
              <Select value={formData.shift} onValueChange={(value) => handleInputChange("shift", value)} >
                <SelectTrigger className="bg-gray-50 border-gray-200 hover:bg-gray-100 w-full">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent className="bg-white" >
                  <SelectItem value="morning">{t('morning')}</SelectItem>
                  <SelectItem value="evening">{t('evening')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <hr className="border-gray-300" />

          {/* User ID and VLC Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-sm font-medium text-gray-700">
                {t('vlc_id')}
              </Label>
              <Select value={formData.userId} onValueChange={handleVLCIdChange}>
                <SelectTrigger className="bg-gray-50 border-gray-200 hover:bg-gray-100 w-full">
                  <SelectValue placeholder="Select VLC ID" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {branches?.length > 0 ? branches.map((branch) => 
                    branch?.username ? (
                      <SelectItem key={branch.username} value={branch.username}>
                        {branch.username}
                      </SelectItem>
                    ) : null
                  ) : (
                    <SelectItem value="" disabled>
                      No VLC branches available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vlcName" className="text-sm font-medium text-gray-700">
                {t('vlc_name')}
              </Label>
              <Input
                id="vlcName"
                placeholder="VLC Name"
                value={formData.vlcName}
                readOnly
                className="bg-gray-100 border-gray-200 text-gray-700"
              />
            </div>
          </div>

          {/* Weight and Fat Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-sm font-medium text-gray-700">
                {t('weight')} (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fat" className="text-sm font-medium text-gray-700">
                {t('fat')} (%)
              </Label>
              <Input
                id="fat"
                type="number"
                step="0.1"
                placeholder="0.0"
                value={formData.fat}
                onChange={(e) => handleInputChange("fat", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          {/* SNF and CLR Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="snf" className="text-sm font-medium text-gray-700">
                {t('snf')} (%)
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
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clr" className="text-sm font-medium text-gray-700">
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
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          {/* Rate and Amount Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="rate" className="text-sm font-medium text-gray-700">
                {t('rate_per_kg')}
              </Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.rate}
                readOnly
                className="bg-gray-100 border-gray-200 text-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                {t('total_amount')}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount.toFixed(2)}
                readOnly
                className="bg-gray-100 border-gray-200 text-gray-700 font-semibold"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? t('submitting') : t('submit_entry')}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
      
      <div className="w-full lg:w-[35%]">
        <LastEntryDetails entries={getFilteredEntries()} />
      </div>

      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-semibold text-gray-800">Bulk Import VLC Entries</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-gray-50 border-gray-200 hover:bg-gray-100">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {bulkFormData.date ? format(bulkFormData.date, "dd-MM-yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={bulkFormData.date}
                      onSelect={(date) => date && setBulkFormData(prev => ({ ...prev, date }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Shift</Label>
                <Select value={bulkFormData.shift} onValueChange={(value) => setBulkFormData(prev => ({ ...prev, shift: value }))}>
                  <SelectTrigger className="bg-gray-50 border-gray-200 hover:bg-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">VLC ID</Label>
                <Select value={bulkFormData.vlcId} onValueChange={handleBulkVLCIdChange}>
                  <SelectTrigger className="bg-gray-50 border-gray-200 hover:bg-gray-100">
                    <SelectValue placeholder="Select VLC ID" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {branches?.map((branch) => branch?.username && (
                      <SelectItem key={branch.username} value={branch.username}>
                        {branch.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">VLC Name</Label>
                <Input value={bulkFormData.vlcName} readOnly className="bg-gray-100 border-gray-200 text-gray-700" placeholder="Auto-filled" />
              </div>
            </div>

            <div className="border-t pt-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Upload Excel/CSV File</Label>
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
                  className="w-full h-24 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Click to choose file</span>
                    <span className="text-xs text-gray-400">Supports .csv, .xlsx, .xls</span>
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
