import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Upload, FileSpreadsheet, Download, CheckCircle2, Plus, Trash2, Eye } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { api } from "@/services/config";

const AddRateChart = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [formData, setFormData] = useState({
    vlcc: "",
    rateChart: "",
    rateChartName: "",
    effectiveDate: undefined as Date | undefined,
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [isShiftWise, setIsShiftWise] = useState(false);
  const [selectedShift, setSelectedShift] = useState<"Morning" | "Evening">("Morning");
  const [creationMode, setCreationMode] = useState<"upload" | "manual">("upload");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = ['.csv', '.xls', '.xlsx'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        toast.error("Please upload a CSV or Excel file (.csv, .xls, .xlsx)");
        e.target.value = '';
        return;
      }
      
      setCsvFile(file);
      
      // Preview CSV files only
      if (fileExtension === '.csv') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const rows = text.split('\n').slice(0, 6).map(row => row.split(','));
          setPreviewData(rows);
        };
        reader.readAsText(file);
      } else {
        setPreviewData(null);
      }
    }
    e.target.value = '';
  };

  const generateSampleCSV = () => {
    // Generate FAT values from 2.0 to 10.0 (step 0.1)
    const fatValues = [];
    for (let i = 2.0; i <= 10.0; i += 0.1) {
      fatValues.push(parseFloat(i.toFixed(1)));
    }

    // Generate SNF values from 7.0 to 10.0 (step 0.1)
    const snfValues = [];
    for (let i = 7.0; i <= 10.0; i += 0.1) {
      snfValues.push(parseFloat(i.toFixed(1)));
    }

    // Create CSV header row
    let csv = 'FAT/SNF,' + snfValues.join(',') + '\n';

    // Create data rows
    fatValues.forEach((fat, fatIndex) => {
      const row = [fat];
      snfValues.forEach((snf, snfIndex) => {
        // Base rate is 27 for FAT=2.0, SNF=7.0
        // Add 0.30 for each step right (SNF) and down (FAT)
        const rate = 27 + (fatIndex * 0.30) + (snfIndex * 0.30);
        row.push(rate);
      });
      csv += row.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rate_chart_sample.csv';
    link.click();
  };

  const handleSubmit = async () => {
    if (!formData.vlcc || !formData.rateChart || !formData.rateChartName || !formData.effectiveDate || !csvFile) {
      toast.error("Please fill all fields and upload a file");
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("csv", csvFile);
      formDataToSend.append("organisation_id", formData.vlcc);
      formDataToSend.append("type", formData.rateChart);
      formDataToSend.append("name", formData.rateChartName);
      formDataToSend.append("effective_date", format(formData.effectiveDate, "yyyy-MM-dd"));
      
      // Only include shift if shift-wise is enabled
      if (isShiftWise) {
        formDataToSend.append("shift", selectedShift);
      }

      await api.post("/conf/createrate", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Rate chart uploaded successfully!");
      setFormData({ vlcc: "", rateChart: "", rateChartName: "", effectiveDate: undefined });
      setCsvFile(null);
      setPreviewData(null);
      setIsShiftWise(false);
      setSelectedShift("Morning");
      const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to upload rate chart");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t('rate_chart_management')}</h1>
          <p className="text-gray-600">{t('upload_manage_rate_charts')}</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex gap-3 mb-6">
              <Button
                type="button"
                variant={creationMode === "upload" ? "default" : "outline"}
                onClick={() => setCreationMode("upload")}
                className={cn(
                  "flex-1",
                  creationMode === "upload"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-gray-300 hover:bg-gray-50"
                )}
              >
                <Upload className="w-4 h-4 mr-2" />
                File Upload
              </Button>
              <Button
                type="button"
                variant={creationMode === "manual" ? "default" : "outline"}
                onClick={() => setCreationMode("manual")}
                className={cn(
                  "flex-1",
                  creationMode === "manual"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-gray-300 hover:bg-gray-50"
                )}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Manual Creation
              </Button>
            </div>
          </CardContent>
        </Card>

        {creationMode === "upload" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Card 
                onClick={() => setFormData({ ...formData, rateChart: "cow" })}
                className={cn(
                  "cursor-pointer border-2 shadow-lg hover:shadow-xl transition-all",
                  formData.rateChart === "cow" 
                    ? "border-green-500 bg-green-50" 
                    : "border-gray-200 bg-white hover:border-green-300"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center text-4xl",
                      formData.rateChart === "cow" ? "bg-green-100" : "bg-gray-100"
                    )}>🐄</div>
                    <div>
                      <h3 className={cn(
                        "text-xl font-bold mb-1",
                        formData.rateChart === "cow" ? "text-green-700" : "text-gray-900"
                      )}>{t('cow_rate_chart')}</h3>
                      <p className="text-gray-600 text-sm">{t('manage_cow_milk_pricing')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                onClick={() => setFormData({ ...formData, rateChart: "buffalo" })}
                className={cn(
                  "cursor-pointer border-2 shadow-lg hover:shadow-xl transition-all",
                  formData.rateChart === "buffalo" 
                    ? "border-orange-500 bg-orange-50" 
                    : "border-gray-200 bg-white hover:border-orange-300"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center text-4xl",
                      formData.rateChart === "buffalo" ? "bg-orange-100" : "bg-gray-100"
                    )}>🐃</div>
                    <div>
                      <h3 className={cn(
                        "text-xl font-bold mb-1",
                        formData.rateChart === "buffalo" ? "text-orange-700" : "text-gray-900"
                      )}>{t('buffalo_rate_chart')}</h3>
                      <p className="text-gray-600 text-sm">{t('manage_buffalo_milk_pricing')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-left">{t('select_vlcc')}</label>
                <Select value={formData.vlcc} onValueChange={(value) => setFormData({ ...formData, vlcc: value })}>
                  <SelectTrigger className="bg-gray-50 h-10">
                    <SelectValue placeholder={t('select_vlcc')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {branches.map((branch) => (
                      <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                        {branch.username} - {branch.name} - {branch.branchName || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-left">{t('milk_type')}</label>
                <Select value={formData.rateChart} onValueChange={(value) => setFormData({ ...formData, rateChart: value })}>
                  <SelectTrigger className="bg-gray-50 h-10">
                    <SelectValue placeholder={t('select_milk_type')}>
                      {formData.rateChart === "cow" ? `🐄 ${t('cow')}` : formData.rateChart === "buffalo" ? `🐃 ${t('buffalo')}` : t('select_milk_type')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="cow">🐄 {t('cow')}</SelectItem>
                    <SelectItem value="buffalo">🐃 {t('buffalo')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-left">{t('rate_chart_name')}</label>
                <Select value={formData.rateChartName} onValueChange={(value) => setFormData({ ...formData, rateChartName: value })}>
                  <SelectTrigger className="bg-gray-50 h-10">
                    <SelectValue placeholder={t('select_rate_chart')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Rate Chart 1">Rate Chart 1</SelectItem>
                    <SelectItem value="Rate Chart 2">Rate Chart 2</SelectItem>
                    <SelectItem value="Rate Chart 3">Rate Chart 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-left">{t('effective_date')}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-normal bg-gray-50", !formData.effectiveDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.effectiveDate ? format(formData.effectiveDate, "dd MMM yyyy") : t('select_date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar mode="single" selected={formData.effectiveDate} onSelect={(date) => setFormData({ ...formData, effectiveDate: date })} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="shift-wise" 
                  checked={isShiftWise} 
                  onCheckedChange={(checked) => setIsShiftWise(checked as boolean)}
                  className="border-gray-300"
                />
                <label htmlFor="shift-wise" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Enable Shift-Wise Rate Chart
                </label>
              </div>
              
              {isShiftWise && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Select Shift</label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={selectedShift === "Morning" ? "default" : "outline"}
                      onClick={() => setSelectedShift("Morning")}
                      className={cn(
                        "flex-1",
                        selectedShift === "Morning" 
                          ? "bg-blue-600 hover:bg-blue-700 text-white" 
                          : "border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      Morning
                    </Button>
                    <Button
                      type="button"
                      variant={selectedShift === "Evening" ? "default" : "outline"}
                      onClick={() => setSelectedShift("Evening")}
                      className={cn(
                        "flex-1",
                        selectedShift === "Evening" 
                          ? "bg-blue-600 hover:bg-blue-700 text-white" 
                          : "border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      Evening
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-left">
                    {formData.rateChart && formData.rateChartName 
                      ? `${formData.rateChart === "cow" ? "🐄 Cow" : "🐃 Buffalo"} ${formData.rateChartName} ${selectedShift}`
                      : "Display name will appear here"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 md:p-12 text-center hover:border-blue-400 transition-colors">
                <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} className="hidden" id="excel-upload" />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  {csvFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('file_selected')}</h3>
                      <p className="text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-full">{csvFile.name}</p>
                      <Button variant="outline" className="mt-4" onClick={(e) => { e.preventDefault(); setCsvFile(null); setPreviewData(null); }}>{t('change_file')}</Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('drop_file_or_browse')}</h3>
                      <p className="text-gray-500 text-sm">{t('supported_formats')}</p>
                    </div>
                  )}
                </label>
              </div>

              {previewData && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b">
                    <h4 className="font-semibold text-gray-700">{t('preview_first_5_rows')}</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {previewData.map((row, i) => (
                          <tr key={i} className={i === 0 ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}>
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 border-r border-b text-center">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4">
                <Button onClick={generateSampleCSV} variant="outline" className="w-full sm:w-auto border-blue-600 text-blue-600 hover:bg-blue-50">
                  <Download className="w-4 h-4 mr-2" />
                  {t('download_sample_file')}
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !csvFile || !formData.vlcc || !formData.rateChart || !formData.rateChartName || !formData.effectiveDate} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {t('uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {t('upload_rate_chart')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
          </>
        ) : (
          <ManualRateChartForm />
        )}
      </div>
    </div>
  );
};

const ManualRateChartForm = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [vlcc, setVlcc] = useState("");
  const [animalType, setAnimalType] = useState<"cow" | "buffalo">("cow");
  const [rateChartName, setRateChartName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(undefined);
  const [isShiftWise, setIsShiftWise] = useState(false);
  const [selectedShift, setSelectedShift] = useState<"Morning" | "Evening">("Morning");
  const [baseRate, setBaseRate] = useState<number>(24);
  const [fatRanges, setFatRanges] = useState<{ id: string; min: number; max: number; multiplier: number }[]>([
    { id: "1", min: 2.0, max: 3.5, multiplier: 0.5 },
    { id: "2", min: 3.6, max: 4.0, multiplier: 0.2 },
  ]);
  const [snfRanges, setSnfRanges] = useState<{ id: string; min: number; max: number; multiplier: number }[]>([
    { id: "1", min: 7.0, max: 10.0, multiplier: 0.3 },
  ]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const calculateRate = (fat: number, snf: number): number => {
    let rate = baseRate;
    
    // Find applicable FAT range and calculate increment
    for (const range of fatRanges) {
      if (fat >= range.min && fat <= range.max) {
        const steps = Math.round((fat - range.min) * 10);
        rate += steps * range.multiplier;
        break;
      }
    }
    
    // Find applicable SNF range and calculate increment
    for (const range of snfRanges) {
      if (snf >= range.min && snf <= range.max) {
        const steps = Math.round((snf - range.min) * 10);
        rate += steps * range.multiplier;
        break;
      }
    }
    
    return parseFloat(rate.toFixed(2));
  };

  const generateRateMatrix = () => {
    const rates = [];
    // Find max FAT from ranges
    const maxFat = Math.max(...fatRanges.map(r => r.max));
    // Find max SNF from ranges
    const maxSnf = Math.max(...snfRanges.map(r => r.max));
    // Find min FAT from ranges
    const minFat = Math.min(...fatRanges.map(r => r.min));
    // Find min SNF from ranges
    const minSnf = Math.min(...snfRanges.map(r => r.min));
    
    for (let fat = minFat; fat <= maxFat; fat += 0.1) {
      for (let snf = minSnf; snf <= maxSnf; snf += 0.1) {
        rates.push({
          fat: parseFloat(fat.toFixed(1)),
          snf: parseFloat(snf.toFixed(1)),
          price: calculateRate(parseFloat(fat.toFixed(1)), parseFloat(snf.toFixed(1))),
        });
      }
    }
    return rates;
  };

  const handleSubmit = async () => {
    if (!vlcc || !rateChartName || !effectiveDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const rates = generateRateMatrix();
      const displayName = `${animalType === "cow" ? "🐄 Cow" : "🐃 Buffalo"} ${rateChartName} ${isShiftWise ? selectedShift : "All Day"}`;
      const payload: any = {
        created_by: "Admin",
        organisation_id: vlcc,
        name: rateChartName,
        displayName,
        type: animalType,
        effective_date: format(effectiveDate, "yyyy-MM-dd"),
        rates,
      };
      if (isShiftWise) payload.shift = selectedShift;
      await api.post("/conf/createrate-manual", payload);
      toast.success("Rate chart created successfully!");
      setVlcc("");
      setRateChartName("");
      setEffectiveDate(undefined);
      setIsShiftWise(false);
      setSelectedShift("Morning");
      setBaseRate(24);
      setFatRanges([{ id: "1", min: 2.0, max: 3.5, multiplier: 0.5 }, { id: "2", min: 3.6, max: 4.0, multiplier: 0.2 }]);
      setSnfRanges([{ id: "1", min: 7.0, max: 10.0, multiplier: 0.3 }]);
      setShowPreview(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create rate chart");
    } finally {
      setLoading(false);
    }
  };

  const displayName = vlcc && rateChartName ? `${animalType === "cow" ? "🐄 Cow" : "🐃 Buffalo"} ${rateChartName} ${isShiftWise ? selectedShift : "All Day"}` : "Display name will appear here";

  return (
    <>
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 text-left">Select VLCC</label>
              <Select value={vlcc} onValueChange={setVlcc}>
                <SelectTrigger className="bg-gray-50 h-10"><SelectValue placeholder="Select VLCC" /></SelectTrigger>
                <SelectContent className="bg-white">
                  {branches.map((branch) => (
                    <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                      {branch.username} - {branch.name} - {branch.branchName || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 text-left">Animal Type</label>
              <Select value={animalType} onValueChange={(value: "cow" | "buffalo") => setAnimalType(value)}>
                <SelectTrigger className="bg-gray-50 h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="cow">🐄 Cow</SelectItem>
                  <SelectItem value="buffalo">🐃 Buffalo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 text-left">Rate Chart Name</label>
              <Select value={rateChartName} onValueChange={setRateChartName}>
                <SelectTrigger className="bg-gray-50 h-10"><SelectValue placeholder="Select Rate Chart" /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Rate Chart 1">Rate Chart 1</SelectItem>
                  <SelectItem value="Rate Chart 2">Rate Chart 2</SelectItem>
                  <SelectItem value="Rate Chart 3">Rate Chart 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 text-left">Effective Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-normal bg-gray-50", !effectiveDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {effectiveDate ? format(effectiveDate, "dd MMM yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar mode="single" selected={effectiveDate} onSelect={setEffectiveDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <Checkbox id="shift-manual" checked={isShiftWise} onCheckedChange={(checked) => setIsShiftWise(checked as boolean)} className="border-gray-300" />
              <label htmlFor="shift-manual" className="text-sm font-medium text-gray-700 cursor-pointer">Enable Shift-Wise Rate Chart</label>
            </div>
            {isShiftWise && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Select Shift</label>
                <div className="flex gap-3">
                  <Button type="button" variant={selectedShift === "Morning" ? "default" : "outline"} onClick={() => setSelectedShift("Morning")} className={cn("flex-1", selectedShift === "Morning" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-300 hover:bg-gray-50")}>Morning</Button>
                  <Button type="button" variant={selectedShift === "Evening" ? "default" : "outline"} onClick={() => setSelectedShift("Evening")} className={cn("flex-1", selectedShift === "Evening" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-300 hover:bg-gray-50")}>Evening</Button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3 text-left"><span className="font-medium">Display Name:</span> {displayName}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-gray-700 text-left">Base Rate</label>
            <Input type="number" step="0.1" value={baseRate} onChange={(e) => setBaseRate(parseFloat(e.target.value) || 0)} className="bg-gray-50" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">FAT Ranges</h3>
                <Button type="button" size="sm" onClick={() => setFatRanges([...fatRanges, { id: Date.now().toString(), min: 0, max: 0, multiplier: 0 }])} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Add</Button>
              </div>
              {fatRanges.map((range) => (
                <div key={range.id} className="grid grid-cols-4 gap-3 mb-3">
                  <Input type="number" step="0.1" placeholder="Min" value={range.min || ""} onChange={(e) => setFatRanges(fatRanges.map((r) => (r.id === range.id ? { ...r, min: parseFloat(e.target.value) || 0 } : r)))} className="bg-gray-50" />
                  <Input type="number" step="0.1" placeholder="Max" value={range.max || ""} onChange={(e) => setFatRanges(fatRanges.map((r) => (r.id === range.id ? { ...r, max: parseFloat(e.target.value) || 0 } : r)))} className="bg-gray-50" />
                  <Input type="number" step="0.1" placeholder="Multiplier" value={range.multiplier || ""} onChange={(e) => setFatRanges(fatRanges.map((r) => (r.id === range.id ? { ...r, multiplier: parseFloat(e.target.value) || 0 } : r)))} className="bg-gray-50" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setFatRanges(fatRanges.filter((r) => r.id !== range.id))} disabled={fatRanges.length === 1}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">SNF Ranges</h3>
                <Button type="button" size="sm" onClick={() => setSnfRanges([...snfRanges, { id: Date.now().toString(), min: 0, max: 0, multiplier: 0 }])} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Add</Button>
              </div>
              {snfRanges.map((range) => (
                <div key={range.id} className="grid grid-cols-4 gap-3 mb-3">
                  <Input type="number" step="0.1" placeholder="Min" value={range.min || ""} onChange={(e) => setSnfRanges(snfRanges.map((r) => (r.id === range.id ? { ...r, min: parseFloat(e.target.value) || 0 } : r)))} className="bg-gray-50" />
                  <Input type="number" step="0.1" placeholder="Max" value={range.max || ""} onChange={(e) => setSnfRanges(snfRanges.map((r) => (r.id === range.id ? { ...r, max: parseFloat(e.target.value) || 0 } : r)))} className="bg-gray-50" />
                  <Input type="number" step="0.1" placeholder="Multiplier" value={range.multiplier || ""} onChange={(e) => setSnfRanges(snfRanges.map((r) => (r.id === range.id ? { ...r, multiplier: parseFloat(e.target.value) || 0 } : r)))} className="bg-gray-50" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setSnfRanges(snfRanges.filter((r) => r.id !== range.id))} disabled={snfRanges.length === 1}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowPreview(!showPreview)} className="flex-1"><Eye className="w-4 h-4 mr-2" />{showPreview ? "Hide Preview" : "Show Preview"}</Button>
            <Button onClick={handleSubmit} disabled={loading || !vlcc || !rateChartName || !effectiveDate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">{loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Creating...</> : "Create Rate Chart"}</Button>
          </div>
          {showPreview && (
            <div className="mt-4 border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b"><h4 className="font-semibold text-gray-700">Complete Rate Chart Preview</h4></div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-blue-50">
                    <tr>
                      <th className="px-2 py-1 border font-semibold">FAT/SNF</th>
                      {(() => {
                        const minSnf = Math.min(...snfRanges.map(r => r.min));
                        const maxSnf = Math.max(...snfRanges.map(r => r.max));
                        const snfCount = Math.round((maxSnf - minSnf) * 10) + 1;
                        return Array.from({ length: snfCount }, (_, i) => minSnf + i * 0.1).map((snf) => (
                          <th key={snf} className="px-2 py-1 border font-semibold">{snf.toFixed(1)}</th>
                        ));
                      })()}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const minFat = Math.min(...fatRanges.map(r => r.min));
                      const maxFat = Math.max(...fatRanges.map(r => r.max));
                      const fatCount = Math.round((maxFat - minFat) * 10) + 1;
                      const minSnf = Math.min(...snfRanges.map(r => r.min));
                      const maxSnf = Math.max(...snfRanges.map(r => r.max));
                      const snfCount = Math.round((maxSnf - minSnf) * 10) + 1;
                      return Array.from({ length: fatCount }, (_, i) => minFat + i * 0.1).map((fat) => (
                        <tr key={fat} className="hover:bg-gray-50">
                          <td className="px-2 py-1 border font-semibold bg-blue-50">{fat.toFixed(1)}</td>
                          {Array.from({ length: snfCount }, (_, i) => minSnf + i * 0.1).map((snf) => (
                            <td key={`${fat}-${snf}`} className="px-2 py-1 border text-center">
                              {calculateRate(parseFloat(fat.toFixed(1)), parseFloat(snf.toFixed(1)))}
                            </td>
                          ))}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AddRateChart;
