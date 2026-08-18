import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, Plus, Trash2, Eye, EyeOff,
  Search, Sun, Moon, CloudUpload, Pencil, Sparkles,
  TrendingUp, BarChart3, Info, X, FileText, Table2
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppDatePicker } from "@/components/ui/date-picker";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { format, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { api } from "@/services/config";

// ─── Shared Styled Components ─────────────────────────────────────────────────

const SectionTitle = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div>
      <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const FormLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 text-left">
    {children}
    {required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

// ─── Enter-to-next-field helper ───────────────────────────────────────────────

const focusNextField = (currentEl: HTMLElement) => {
  const form = currentEl.closest("[data-rate-form]");
  if (!form) return;
  const focusable = Array.from(
    form.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), button[data-focusable]:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    )
  );
  const idx = focusable.indexOf(currentEl);
  if (idx >= 0 && idx < focusable.length - 1) {
    focusable[idx + 1].focus();
  }
};

const handleEnterKey = (e: React.KeyboardEvent<HTMLElement>) => {
  if (e.key === "Enter") {
    e.preventDefault();
    focusNextField(e.currentTarget);
  }
};

// ─── Searchable VLCC Dropdown (shared between tabs) ───────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────

const AddRateChart = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [formData, setFormData] = useState({
    vlcc: [] as string[],
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const processFile = (file: File) => {
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      toast.error("Please upload a CSV or Excel file (.csv, .xls, .xlsx)");
      return;
    }

    setCsvFile(file);

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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const generateSampleCSV = () => {
    const fatValues = [];
    for (let i = 2.0; i <= 10.0; i += 0.1) {
      fatValues.push(parseFloat(i.toFixed(1)));
    }

    const snfValues = [];
    for (let i = 7.0; i <= 10.0; i += 0.1) {
      snfValues.push(parseFloat(i.toFixed(1)));
    }

    let csv = 'FAT/SNF,' + snfValues.join(',') + '\n';

    fatValues.forEach((fat, fatIndex) => {
      const row = [fat];
      snfValues.forEach((snf, snfIndex) => {
        const rate = 27 + (fatIndex * 0.30) + (snfIndex * 0.30);
        row.push(rate);
      });
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rate_chart_sample.csv';
    link.click();
  };

  const handleSubmit = async () => {
    if (formData.vlcc.length === 0 || !formData.rateChart || !formData.rateChartName || !formData.effectiveDate || !csvFile) {
      toast.error("Please fill all fields and upload a file");
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const vlccId of formData.vlcc) {
        try {
          const formDataToSend = new FormData();
          formDataToSend.append("csv", csvFile);
          formDataToSend.append("organisation_id", vlccId);
          formDataToSend.append("type", formData.rateChart);
          formDataToSend.append("name", formData.rateChartName);
          formDataToSend.append("effective_date", format(formData.effectiveDate, "yyyy-MM-dd"));

          if (isShiftWise) {
            formDataToSend.append("shift", selectedShift);
          }

          await api.post("/conf/createrate", formDataToSend, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed for VLC ID ${vlccId}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Rate chart uploaded successfully for ${successCount} VLC(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to upload for ${failCount} VLC(s)`);
      }

      setFormData({ vlcc: [], rateChart: "", rateChartName: "", effectiveDate: undefined });
      setCsvFile(null);
      setPreviewData(null);
      setIsShiftWise(false);
      setSelectedShift("Morning");
    } finally {
      setLoading(false);
    }
  };

  const completedSteps = [
    formData.rateChart,
    formData.vlcc.length > 0,
    formData.rateChartName,
    formData.effectiveDate,
    csvFile,
  ].filter(Boolean).length;

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-[1200px] mx-auto space-y-5" data-rate-form>

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5 md:p-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{t('rate_chart_management')}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{t('upload_manage_rate_charts')}</p>
              </div>
            </div>
            {creationMode === "upload" && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-full px-3 py-1.5">
                <span className="text-xs font-medium text-blue-700">{completedSteps}/5</span>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        i < completedSteps ? "bg-blue-500" : "bg-blue-200"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Mode Tabs ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setCreationMode("upload")}
              className={cn(
                "relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300",
                creationMode === "upload"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <CloudUpload className="w-4 h-4" />
              File Upload
            </button>
            <button
              type="button"
              onClick={() => setCreationMode("manual")}
              className={cn(
                "relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300",
                creationMode === "manual"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Pencil className="w-4 h-4" />
              Manual Creation
            </button>
          </div>
        </div>

        {creationMode === "upload" ? (
          <>
            {/* ── Animal Type Selection ─────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, rateChart: "cow" })}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border-2 p-4 md:p-5 transition-all duration-300 text-left",
                  formData.rateChart === "cow"
                    ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg shadow-emerald-500/10"
                    : "border-gray-200 bg-white hover:border-emerald-200 hover:shadow-md"
                )}
              >
                {formData.rateChart === "cow" && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
                <div className="relative flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300",
                    formData.rateChart === "cow" ? "bg-emerald-100" : "bg-gray-100"
                  )}>🐄</div>
                  <div>
                    <h3 className={cn(
                      "text-base font-bold transition-colors",
                      formData.rateChart === "cow" ? "text-emerald-700" : "text-gray-900"
                    )}>{t('cow_rate_chart')}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{t('manage_cow_milk_pricing')}</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, rateChart: "buffalo" })}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border-2 p-4 md:p-5 transition-all duration-300 text-left",
                  formData.rateChart === "buffalo"
                    ? "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg shadow-amber-500/10"
                    : "border-gray-200 bg-white hover:border-amber-200 hover:shadow-md"
                )}
              >
                {formData.rateChart === "buffalo" && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-500" />
                  </div>
                )}
                <div className="relative flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300",
                    formData.rateChart === "buffalo" ? "bg-amber-100" : "bg-gray-100"
                  )}>🐃</div>
                  <div>
                    <h3 className={cn(
                      "text-base font-bold transition-colors",
                      formData.rateChart === "buffalo" ? "text-amber-700" : "text-gray-900"
                    )}>{t('buffalo_rate_chart')}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{t('manage_buffalo_milk_pricing')}</p>
                  </div>
                </div>
              </button>
            </div>

            {/* ── Configuration Form ───────────────────────────────── */}
            <Card className="shadow-sm border-gray-100/80 rounded-2xl overflow-hidden">
              <CardContent className="p-5 md:p-6">
                <SectionTitle icon={BarChart3} title="Rate Chart Configuration" subtitle="Set up the details for your rate chart" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Select VLCC */}
                  <div className="space-y-1.5">
                    <FormLabel required>{t('select_vlcc')}</FormLabel>
                    <VLCDropdown
                      branches={branches || []}
                      value={formData.vlcc}
                      onChange={(ids) => setFormData({ ...formData, vlcc: ids })}
                      isMultiSelect={true}
                      placeholder={t('select_vlcc')}
                      valueKey="branch_id"
                      className="h-11 bg-gray-50/80 rounded-xl"
                    />
                  </div>

                  {/* Milk Type */}
                  <div className="space-y-1.5">
                    <FormLabel required>{t('milk_type')}</FormLabel>
                    <Select value={formData.rateChart} onValueChange={(value) => setFormData({ ...formData, rateChart: value })}>
                      <SelectTrigger className="h-11 bg-gray-50/80 border-gray-200 rounded-xl shadow-sm hover:bg-white hover:border-blue-300 transition-all w-full" onKeyDown={handleEnterKey}>
                        <SelectValue placeholder={t('select_milk_type')}>
                          {formData.rateChart === "cow" ? `🐄 ${t('cow')}` : formData.rateChart === "buffalo" ? `🐃 ${t('buffalo')}` : t('select_milk_type')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-xl shadow-xl border-gray-100">
                        <SelectItem value="cow">🐄 {t('cow')}</SelectItem>
                        <SelectItem value="buffalo">🐃 {t('buffalo')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rate Chart Name */}
                  <div className="space-y-1.5">
                    <FormLabel required>{t('rate_chart_name')}</FormLabel>
                    <Select value={formData.rateChartName} onValueChange={(value) => setFormData({ ...formData, rateChartName: value })}>
                      <SelectTrigger className="h-11 bg-gray-50/80 border-gray-200 rounded-xl shadow-sm hover:bg-white hover:border-blue-300 transition-all w-full" onKeyDown={handleEnterKey}>
                        <SelectValue placeholder={t('select_rate_chart')} />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-xl shadow-xl border-gray-100">
                        <SelectItem value="Rate Chart 1">Rate Chart 1</SelectItem>
                        <SelectItem value="Rate Chart 2">Rate Chart 2</SelectItem>
                        <SelectItem value="Rate Chart 3">Rate Chart 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Effective Date */}
                  <div className="space-y-1.5">
                    <FormLabel required>{t('effective_date')}</FormLabel>
                    <AppDatePicker
                      date={formData.effectiveDate}
                      onChange={(dateStr) => {
                        const parsed = parseISO(dateStr);
                        if (isValid(parsed)) setFormData({ ...formData, effectiveDate: parsed });
                      }}
                      className="w-full h-11 bg-gray-50/80 border-gray-200 rounded-xl shadow-sm hover:bg-white hover:border-blue-300 transition-all"
                    />
                  </div>
                </div>

                {/* Shift-Wise Toggle */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2.5">
                    <Checkbox
                      id="shift-wise"
                      checked={isShiftWise}
                      onCheckedChange={(checked) => setIsShiftWise(checked as boolean)}
                      className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <label htmlFor="shift-wise" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Enable Shift-Wise Rate Chart
                    </label>
                  </div>

                  {isShiftWise && (
                    <div className="mt-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100/80">
                      <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Select Shift</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={selectedShift === "Morning" ? "default" : "outline"}
                          onClick={() => setSelectedShift("Morning")}
                          className={cn(
                            "flex-1 rounded-xl h-9 gap-2 text-sm",
                            selectedShift === "Morning"
                              ? "bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white shadow-md shadow-amber-500/20 border-0"
                              : "border-gray-200 hover:bg-amber-50 hover:border-amber-200 bg-white"
                          )}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          Morning
                        </Button>
                        <Button
                          type="button"
                          variant={selectedShift === "Evening" ? "default" : "outline"}
                          onClick={() => setSelectedShift("Evening")}
                          className={cn(
                            "flex-1 rounded-xl h-9 gap-2 text-sm",
                            selectedShift === "Evening"
                              ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md shadow-indigo-500/20 border-0"
                              : "border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 bg-white"
                          )}
                        >
                          <Moon className="w-3.5 h-3.5" />
                          Evening
                        </Button>
                      </div>
                      {formData.rateChart && formData.rateChartName && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-100/60 rounded-lg px-3 py-1.5">
                          <Info className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-medium">
                            {formData.rateChart === "cow" ? "🐄 Cow" : "🐃 Buffalo"} {formData.rateChartName} — {selectedShift}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── File Upload Zone ─────────────────────────────────── */}
            <Card className="shadow-sm border-gray-100/80 rounded-2xl overflow-hidden">
              <CardContent className="p-5 md:p-6">
                <SectionTitle icon={Upload} title="Upload Rate Chart File" subtitle="Drag and drop or click to browse your files" />

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "relative rounded-2xl border-2 border-dashed p-8 md:p-10 text-center transition-all duration-300 cursor-pointer",
                    isDragging
                      ? "border-blue-400 bg-blue-50/50 scale-[1.005]"
                      : csvFile
                        ? "border-emerald-300 bg-emerald-50/30"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/20"
                  )}
                  onClick={() => !csvFile && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excel-upload"
                  />

                  {csvFile ? (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{t('file_selected')}</h3>
                      <div className="flex items-center gap-2 bg-emerald-100/80 px-3 py-1.5 rounded-full mb-3">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">{csvFile.name}</span>
                        <span className="text-xs text-emerald-500">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-xs"
                        onClick={(e) => { e.stopPropagation(); setCsvFile(null); setPreviewData(null); }}
                      >
                        <X className="w-3 h-3 mr-1" />
                        {t('change_file')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300",
                        isDragging ? "bg-blue-100 scale-110" : "bg-gray-100"
                      )}>
                        <CloudUpload className={cn(
                          "w-7 h-7 transition-colors",
                          isDragging ? "text-blue-500" : "text-gray-400"
                        )} />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">{t('drop_file_or_browse')}</h3>
                      <p className="text-gray-400 text-sm mb-3">{t('supported_formats')}</p>
                      <div className="flex items-center gap-2">
                        {['.csv', '.xls', '.xlsx'].map(ext => (
                          <span key={ext} className="px-2 py-0.5 bg-gray-100 rounded-md text-xs font-mono text-gray-500">
                            {ext}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Table */}
                {previewData && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 bg-white">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-blue-600" />
                      <h4 className="font-semibold text-sm text-gray-800">{t('preview_first_5_rows')}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i} className={cn(
                              i === 0 ? 'bg-blue-50/70 font-semibold text-blue-900' : 'hover:bg-gray-50/80',
                              'transition-colors'
                            )}>
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 border-r border-b border-gray-100 text-center text-xs">
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

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mt-5 pt-4 border-t border-gray-100">
                  <Button
                    onClick={generateSampleCSV}
                    variant="outline"
                    className="w-full sm:w-auto rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all gap-2 h-10"
                  >
                    <Download className="w-4 h-4" />
                    {t('download_sample_file')}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !csvFile || formData.vlcc.length === 0 || !formData.rateChart || !formData.rateChartName || !formData.effectiveDate}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:shadow-none transition-all gap-2 h-10"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t('uploading')}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {t('upload_rate_chart')}
                      </>
                    )}
                  </Button>
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

// ─── Manual Rate Chart Form ───────────────────────────────────────────────────

const ManualRateChartForm = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [vlcc, setVlcc] = useState<string[]>([]);
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

    for (const range of fatRanges) {
      if (fat >= range.min && fat <= range.max) {
        const steps = Math.round((fat - range.min) * 10);
        rate += steps * range.multiplier;
        break;
      }
    }

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
    const maxFat = Math.max(...fatRanges.map(r => r.max));
    const maxSnf = Math.max(...snfRanges.map(r => r.max));
    const minFat = Math.min(...fatRanges.map(r => r.min));
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
    if (vlcc.length === 0 || !rateChartName || !effectiveDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const rates = generateRateMatrix();
      const displayName = `${animalType === "cow" ? "🐄 Cow" : "🐃 Buffalo"} ${rateChartName} ${isShiftWise ? selectedShift : "All Day"}`;
      const payload: any = {
        created_by: "Admin",
        organisation_id: vlcc[0],
        name: rateChartName,
        displayName,
        type: animalType,
        effective_date: format(effectiveDate, "yyyy-MM-dd"),
        rates,
      };
      if (isShiftWise) payload.shift = selectedShift;
      await api.post("/conf/createrate-manual", payload);
      toast.success("Rate chart created successfully!");
      setVlcc([]);
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

  const selectedBranch = vlcc.length > 0 ? branches.find(b => b.branch_id.toString() === vlcc[0]) : null;
  const displayName = vlcc.length > 0 && rateChartName
    ? `${animalType === "cow" ? "🐄 Cow" : "🐃 Buffalo"} ${rateChartName} ${isShiftWise ? selectedShift : "All Day"}`
    : "Display name will appear here";

  return (
    <div data-rate-form>
      {/* ── Animal Type Selection Cards ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <button
          type="button"
          onClick={() => setAnimalType("cow")}
          className={cn(
            "group relative overflow-hidden rounded-2xl border-2 p-4 md:p-5 transition-all duration-300 text-left",
            animalType === "cow"
              ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg shadow-emerald-500/10"
              : "border-gray-200 bg-white hover:border-emerald-200 hover:shadow-md"
          )}
        >
          {animalType === "cow" && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          )}
          <div className="relative flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300",
              animalType === "cow" ? "bg-emerald-100" : "bg-gray-100"
            )}>🐄</div>
            <div>
              <h3 className={cn("text-base font-bold transition-colors", animalType === "cow" ? "text-emerald-700" : "text-gray-900")}>
                Cow Rate Chart
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Manage cow milk pricing</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setAnimalType("buffalo")}
          className={cn(
            "group relative overflow-hidden rounded-2xl border-2 p-4 md:p-5 transition-all duration-300 text-left",
            animalType === "buffalo"
              ? "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg shadow-amber-500/10"
              : "border-gray-200 bg-white hover:border-amber-200 hover:shadow-md"
          )}
        >
          {animalType === "buffalo" && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 className="w-5 h-5 text-amber-500" />
            </div>
          )}
          <div className="relative flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300",
              animalType === "buffalo" ? "bg-amber-100" : "bg-gray-100"
            )}>🐃</div>
            <div>
              <h3 className={cn("text-base font-bold transition-colors", animalType === "buffalo" ? "text-amber-700" : "text-gray-900")}>
                Buffalo Rate Chart
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Manage buffalo milk pricing</p>
            </div>
          </div>
        </button>
      </div>

      {/* ── Configuration Card ─────────────────────────────────── */}
      <Card className="shadow-sm border-gray-100/80 rounded-2xl overflow-hidden mb-5">
        <CardContent className="p-5 md:p-6">
          <SectionTitle icon={BarChart3} title="Chart Configuration" subtitle="Set up the details for your manual rate chart" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <FormLabel required>Select VLCC</FormLabel>
              <VLCDropdown
                branches={branches || []}
                value={vlcc[0] || ""}
                onChange={(val) => setVlcc([val])}
                isMultiSelect={false}
                placeholder="Search & select VLCC"
                valueKey="branch_id"
              />
            </div>

            <div className="space-y-1.5">
              <FormLabel required>Animal Type</FormLabel>
              <Select value={animalType} onValueChange={(value: "cow" | "buffalo") => setAnimalType(value)}>
                <SelectTrigger className="h-11 bg-gray-50/80 border-gray-200 rounded-xl shadow-sm hover:bg-white hover:border-blue-300 transition-all" onKeyDown={handleEnterKey}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-xl border-gray-100">
                  <SelectItem value="cow">🐄 Cow</SelectItem>
                  <SelectItem value="buffalo">🐃 Buffalo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <FormLabel required>Rate Chart Name</FormLabel>
              <Select value={rateChartName} onValueChange={setRateChartName}>
                <SelectTrigger className="h-11 bg-gray-50/80 border-gray-200 rounded-xl shadow-sm hover:bg-white hover:border-blue-300 transition-all" onKeyDown={handleEnterKey}>
                  <SelectValue placeholder="Select Rate Chart" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-xl border-gray-100">
                  <SelectItem value="Rate Chart 1">Rate Chart 1</SelectItem>
                  <SelectItem value="Rate Chart 2">Rate Chart 2</SelectItem>
                  <SelectItem value="Rate Chart 3">Rate Chart 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <FormLabel required>Effective Date</FormLabel>
              <AppDatePicker
                date={effectiveDate}
                onChange={(dateStr) => {
                  const parsed = parseISO(dateStr);
                  if (isValid(parsed)) setEffectiveDate(parsed);
                }}
                className="w-full h-11 bg-gray-50/80 border-gray-200 rounded-xl shadow-sm hover:bg-white hover:border-blue-300 transition-all"
              />
            </div>
          </div>

          {/* Shift-Wise Toggle */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="shift-manual"
                checked={isShiftWise}
                onCheckedChange={(checked) => setIsShiftWise(checked as boolean)}
                className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label htmlFor="shift-manual" className="text-sm font-medium text-gray-700 cursor-pointer">
                Enable Shift-Wise Rate Chart
              </label>
            </div>

            {isShiftWise && (
              <div className="mt-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100/80">
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Select Shift</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectedShift === "Morning" ? "default" : "outline"}
                    onClick={() => setSelectedShift("Morning")}
                    className={cn(
                      "flex-1 rounded-xl h-9 gap-2 text-sm",
                      selectedShift === "Morning"
                        ? "bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white shadow-md shadow-amber-500/20 border-0"
                        : "border-gray-200 hover:bg-amber-50 hover:border-amber-200 bg-white"
                    )}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Morning
                  </Button>
                  <Button
                    type="button"
                    variant={selectedShift === "Evening" ? "default" : "outline"}
                    onClick={() => setSelectedShift("Evening")}
                    className={cn(
                      "flex-1 rounded-xl h-9 gap-2 text-sm",
                      selectedShift === "Evening"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md shadow-indigo-500/20 border-0"
                        : "border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 bg-white"
                    )}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    Evening
                  </Button>
                </div>
              </div>
            )}

            {/* Display Name Preview */}
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span><span className="font-medium text-gray-600">Display Name:</span> {displayName}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Rate Configuration Card ────────────────────────────── */}
      <Card className="shadow-sm border-gray-100/80 rounded-2xl overflow-hidden">
        <CardContent className="p-5 md:p-6">
          <SectionTitle icon={TrendingUp} title="Rate Calculation Rules" subtitle="Define the base rate and range-based multipliers" />

          {/* Base Rate */}
          <div className="mb-5 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 rounded-xl border border-blue-100/60">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800">Base Rate (₹)</label>
                <p className="text-xs text-gray-500 mt-0.5">Starting price per unit</p>
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  step="0.1"
                  value={baseRate}
                  onChange={(e) => setBaseRate(parseFloat(e.target.value) || 0)}
                  onKeyDown={handleEnterKey}
                  className="bg-white border-blue-200 rounded-xl text-center font-semibold text-lg h-10 shadow-sm focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
            </div>
          </div>

          {/* FAT Ranges */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-emerald-700">F</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">FAT Ranges</h3>
                  <p className="text-xs text-gray-400">Fat content ranges and multipliers</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setFatRanges([...fatRanges, { id: Date.now().toString(), min: 0, max: 0, multiplier: 0 }])}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm gap-1 h-7 px-2.5 text-xs"
              >
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-[1fr_1fr_1fr_36px] gap-2.5 mb-1.5 px-0.5">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Min</span>
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Max</span>
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Multiplier (₹)</span>
              <span></span>
            </div>

            <div className="space-y-1.5">
              {fatRanges.map((range) => (
                <div key={range.id} className="grid grid-cols-[1fr_1fr_1fr_36px] gap-2.5 items-center group">
                  <Input
                    type="number" step="0.1" placeholder="0.0"
                    value={range.min || ""}
                    onChange={(e) => setFatRanges(fatRanges.map((r) => (r.id === range.id ? { ...r, min: parseFloat(e.target.value) || 0 } : r)))}
                    onKeyDown={handleEnterKey}
                    className="bg-gray-50/80 border-gray-200 rounded-xl h-9 text-sm hover:border-emerald-300 focus:border-emerald-400 transition-colors"
                  />
                  <Input
                    type="number" step="0.1" placeholder="0.0"
                    value={range.max || ""}
                    onChange={(e) => setFatRanges(fatRanges.map((r) => (r.id === range.id ? { ...r, max: parseFloat(e.target.value) || 0 } : r)))}
                    onKeyDown={handleEnterKey}
                    className="bg-gray-50/80 border-gray-200 rounded-xl h-9 text-sm hover:border-emerald-300 focus:border-emerald-400 transition-colors"
                  />
                  <Input
                    type="number" step="0.1" placeholder="0.0"
                    value={range.multiplier || ""}
                    onChange={(e) => setFatRanges(fatRanges.map((r) => (r.id === range.id ? { ...r, multiplier: parseFloat(e.target.value) || 0 } : r)))}
                    onKeyDown={handleEnterKey}
                    className="bg-gray-50/80 border-gray-200 rounded-xl h-9 text-sm hover:border-emerald-300 focus:border-emerald-400 transition-colors"
                  />
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => setFatRanges(fatRanges.filter((r) => r.id !== range.id))}
                    disabled={fatRanges.length === 1}
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg h-9 w-9 p-0 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 my-5" />

          {/* SNF Ranges */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-700">S</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">SNF Ranges</h3>
                  <p className="text-xs text-gray-400">Solid-not-fat ranges and multipliers</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setSnfRanges([...snfRanges, { id: Date.now().toString(), min: 0, max: 0, multiplier: 0 }])}
                className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-sm gap-1 h-7 px-2.5 text-xs"
              >
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-[1fr_1fr_1fr_36px] gap-2.5 mb-1.5 px-0.5">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Min</span>
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Max</span>
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Multiplier (₹)</span>
              <span></span>
            </div>

            <div className="space-y-1.5">
              {snfRanges.map((range) => (
                <div key={range.id} className="grid grid-cols-[1fr_1fr_1fr_36px] gap-2.5 items-center group">
                  <Input
                    type="number" step="0.1" placeholder="0.0"
                    value={range.min || ""}
                    onChange={(e) => setSnfRanges(snfRanges.map((r) => (r.id === range.id ? { ...r, min: parseFloat(e.target.value) || 0 } : r)))}
                    onKeyDown={handleEnterKey}
                    className="bg-gray-50/80 border-gray-200 rounded-xl h-9 text-sm hover:border-blue-300 focus:border-blue-400 transition-colors"
                  />
                  <Input
                    type="number" step="0.1" placeholder="0.0"
                    value={range.max || ""}
                    onChange={(e) => setSnfRanges(snfRanges.map((r) => (r.id === range.id ? { ...r, max: parseFloat(e.target.value) || 0 } : r)))}
                    onKeyDown={handleEnterKey}
                    className="bg-gray-50/80 border-gray-200 rounded-xl h-9 text-sm hover:border-blue-300 focus:border-blue-400 transition-colors"
                  />
                  <Input
                    type="number" step="0.1" placeholder="0.0"
                    value={range.multiplier || ""}
                    onChange={(e) => setSnfRanges(snfRanges.map((r) => (r.id === range.id ? { ...r, multiplier: parseFloat(e.target.value) || 0 } : r)))}
                    onKeyDown={handleEnterKey}
                    className="bg-gray-50/80 border-gray-200 rounded-xl h-9 text-sm hover:border-blue-300 focus:border-blue-400 transition-colors"
                  />
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => setSnfRanges(snfRanges.filter((r) => r.id !== range.id))}
                    disabled={snfRanges.length === 1}
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg h-9 w-9 p-0 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="flex-1 rounded-xl h-10 gap-2 border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? "Hide Preview" : "Preview Rate Chart"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || vlcc.length === 0 || !rateChartName || !effectiveDate}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl h-10 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:shadow-none transition-all gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Rate Chart
                </>
              )}
            </Button>
          </div>

          {/* Preview Table */}
          {showPreview && (
            <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 bg-white">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-sm text-gray-800">Complete Rate Chart Preview</h4>
                </div>
                <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-100">
                  Base: ₹{baseRate}
                </span>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-blue-100/80 to-indigo-100/80 backdrop-blur-sm">
                      <th className="px-2 py-1.5 border-r border-b border-blue-200/50 font-bold text-blue-800 sticky left-0 bg-blue-100 z-20 text-xs">FAT \ SNF</th>
                      {(() => {
                        const minSnf = Math.min(...snfRanges.map(r => r.min));
                        const maxSnf = Math.max(...snfRanges.map(r => r.max));
                        const snfCount = Math.round((maxSnf - minSnf) * 10) + 1;
                        return Array.from({ length: snfCount }, (_, i) => minSnf + i * 0.1).map((snf) => (
                          <th key={snf} className="px-1.5 py-1.5 border-r border-b border-blue-200/50 font-semibold text-blue-700 text-center min-w-[40px] text-xs">
                            {snf.toFixed(1)}
                          </th>
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
                        <tr key={fat} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-2 py-1 border-r border-b border-gray-100 font-bold text-blue-800 bg-blue-50/60 sticky left-0 z-10 text-xs">
                            {fat.toFixed(1)}
                          </td>
                          {Array.from({ length: snfCount }, (_, i) => minSnf + i * 0.1).map((snf) => (
                            <td key={`${fat}-${snf}`} className="px-1.5 py-1 border-r border-b border-gray-100 text-center text-gray-700 font-medium text-xs">
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
    </div>
  );
};

export default AddRateChart;
