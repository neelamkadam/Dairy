import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Upload, FileSpreadsheet, Download, CheckCircle2 } from "lucide-react";
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

      await api.post("/conf/createrate", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Rate chart uploaded successfully!");
      setFormData({ vlcc: "", rateChart: "", rateChartName: "", effectiveDate: undefined });
      setCsvFile(null);
      setPreviewData(null);
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
                        {branch.username} - {branch.name}
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
      </div>
    </div>
  );
};

export default AddRateChart;
