import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, CloudUpload, X, FileText, Table2, BarChart3 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "@/services/config";
import { cn } from "@/lib/utils";

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

const UploadRateChart = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    organisationId: "",
    type: "",
    name: "",
    effectiveDate: new Date().toISOString().split('T')[0],
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error(t("upload_csv_excel_error", "Please upload a CSV or Excel file (.csv, .xls, .xlsx)"));
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
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.organisationId || !formData.type || !formData.name || !formData.effectiveDate) {
      toast.error(t("fill_all_required_fields", "Please fill all required fields"));
      return;
    }

    if (!csvFile) {
      toast.error(t("please_select_csv_file", "Please select a CSV file"));
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("csv", csvFile);
      formDataToSend.append("organisation_id", formData.organisationId);
      formDataToSend.append("type", formData.type);
      formDataToSend.append("name", formData.name);
      formDataToSend.append("effective_date", formData.effectiveDate);

      await api.post("/conf/createrate", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(t("rate_chart_uploaded_successfully", "Rate chart uploaded successfully!"));
      setFormData({
        organisationId: "",
        type: "",
        name: "",
        effectiveDate: new Date().toISOString().split('T')[0],
      });
      setCsvFile(null);
      setPreviewData(null);
    } catch (error) {
      toast.error(t("network_error_occurred", "Network error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 md:p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-[calc(100vh-80px)] space-y-4 md:space-y-5">
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100/80 shadow-sm p-4 w-full">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">{t("upload_rate_chart", "Upload Rate Chart")}</h1>
              <p className="text-xs text-gray-500 mt-0.5">{t("upload_csv_to_create_rate_chart", "Upload CSV file to create rate chart")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-5">


        {/* ── Animal Type Selection ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: "cow" })}
            className={cn(
              "group relative overflow-hidden rounded-2xl border-2 p-4 md:p-5 transition-all duration-300 text-left",
              formData.type === "cow"
                ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg shadow-emerald-500/10"
                : "border-gray-200 bg-white hover:border-emerald-200 hover:shadow-md"
            )}
          >
            {formData.type === "cow" && (
              <div className="absolute top-3 right-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            )}
            <div className="relative flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300",
                formData.type === "cow" ? "bg-emerald-100" : "bg-gray-100"
              )}>🐄</div>
              <div>
                <h3 className={cn(
                  "text-base font-bold transition-colors",
                  formData.type === "cow" ? "text-emerald-700" : "text-gray-900"
                )}>{t("cow_rate_chart", "Cow Rate Chart")}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t("manage_cow_milk_pricing", "Manage cow milk pricing")}</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: "buffalo" })}
            className={cn(
              "group relative overflow-hidden rounded-2xl border-2 p-4 md:p-5 transition-all duration-300 text-left",
              formData.type === "buffalo"
                ? "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg shadow-amber-500/10"
                : "border-gray-200 bg-white hover:border-amber-200 hover:shadow-md"
            )}
          >
            {formData.type === "buffalo" && (
              <div className="absolute top-3 right-3">
                <CheckCircle2 className="w-5 h-5 text-amber-500" />
              </div>
            )}
            <div className="relative flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300",
                formData.type === "buffalo" ? "bg-amber-100" : "bg-gray-100"
              )}>🐃</div>
              <div>
                <h3 className={cn(
                  "text-base font-bold transition-colors",
                  formData.type === "buffalo" ? "text-amber-700" : "text-gray-900"
                )}>{t("buffalo_rate_chart", "Buffalo Rate Chart")}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t("manage_buffalo_milk_pricing", "Manage buffalo milk pricing")}</p>
              </div>
            </div>
          </button>
        </div>

        {/* ── Configuration Form ───────────────────────────────── */}
        <Card className="shadow-sm border-gray-100/80 rounded-2xl overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <SectionTitle icon={BarChart3} title={t("rate_chart_configuration", "Rate Chart Configuration")} subtitle={t("set_up_details_rate_chart", "Set up the details for your rate chart")} />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Dairy ID */}
              <div className="space-y-1.5">
                <FormLabel required>{t("dairy_id", "Dairy ID")}</FormLabel>
                <Input
                  id="organisationId"
                  placeholder={t("enter_dairy_id", "Enter Dairy ID")}
                  value={formData.organisationId}
                  onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
                  className="h-11 bg-gray-50/80 border-gray-200 rounded-xl shadow-sm hover:bg-white hover:border-blue-300 transition-all w-full"
                  required
                />
              </div>

              {/* Rate Chart Name */}
              <div className="space-y-1.5">
                <FormLabel required>{t("rate_chart_name", "Rate Chart Name")}</FormLabel>
                <Select value={formData.name} onValueChange={(value) => setFormData({ ...formData, name: value })}>
                  <SelectTrigger className="h-11 bg-gray-50/80 border-gray-200 rounded-xl shadow-sm hover:bg-white hover:border-blue-300 transition-all w-full">
                    <SelectValue placeholder={t("select_rate_chart", "Select rate chart")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-xl border-gray-100">
                    <SelectItem value="Rate chart 1">{t("rate_chart_1", "Rate chart 1")}</SelectItem>
                    <SelectItem value="Rate chart 2">{t("rate_chart_2", "Rate chart 2")}</SelectItem>
                    <SelectItem value="Rate chart 3">{t("rate_chart_3", "Rate chart 3")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Effective Date */}
              <div className="space-y-1.5">
                <FormLabel required>{t("effective_date", "Effective Date")}</FormLabel>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  className="h-11 bg-gray-50/80 border-gray-200 rounded-xl shadow-sm hover:bg-white hover:border-blue-300 transition-all w-full"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── File Upload Zone ─────────────────────────────────── */}
        <Card className="shadow-sm border-gray-100/80 rounded-2xl overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <SectionTitle icon={Upload} title={t("upload_rate_chart_file", "Upload Rate Chart File")} subtitle={t("drag_drop_click_browse", "Drag and drop or click to browse your files")} />

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
                  <h3 className="text-base font-bold text-gray-900 mb-1">{t("file_selected", "File Selected")}</h3>
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
                    {t("change_file", "Change File")}
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
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{t("drop_file_or_browse", "Drop file or browse")}</h3>
                  <p className="text-gray-400 text-sm mb-3">{t("supported_formats", "Supported formats: .csv, .xls, .xlsx")}</p>
                </div>
              )}
            </div>

            {/* Preview Table */}
            {previewData && (
              <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 bg-white">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-sm text-gray-800">{t("preview_first_5_rows", "Preview (First 5 Rows)")}</h4>
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
            <div className="flex flex-col sm:flex-row gap-3 justify-end items-center mt-5 pt-4 border-t border-gray-100">
              <Button
                onClick={() => handleSubmit()}
                disabled={loading || !csvFile || !formData.organisationId || !formData.type || !formData.name || !formData.effectiveDate}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:shadow-none transition-all gap-2 h-10"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("uploading", "Uploading...")}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {t("upload_rate_chart", "Upload Rate Chart")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadRateChart;

