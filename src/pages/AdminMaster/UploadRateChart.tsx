import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "@/services/config";

const UploadRateChart = () => {
  const [formData, setFormData] = useState({
    organisationId: "",
    type: "",
    name: "",
    effectiveDate: new Date().toISOString().split('T')[0],
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csvFile) {
      toast.error("Please select a CSV file");
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

      toast.success("Rate chart uploaded successfully!");
      setFormData({
        organisationId: "",
        type: "",
        name: "",
        effectiveDate: "",
      });
      setCsvFile(null);
      setPreviewData(null);
      const fileInput = document.getElementById("excel-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 mt-2 md:mt-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Upload Rate Chart</h1>
              <p className="text-sm text-gray-500">Upload CSV file to create rate chart</p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
          <CardHeader className="border-b border-gray-100 bg-white pb-3 pt-4">
            <CardTitle className="text-lg font-semibold text-gray-800">Rate Chart Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Left Column: Form Fields */}
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="organisationId" className="text-sm font-medium text-gray-700">
                      Dairy ID<span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="organisationId"
                      placeholder="Enter Dairy ID"
                      value={formData.organisationId}
                      onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
                      className="h-10 text-sm border-gray-200 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 rounded-md transition-shadow"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Type<span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "cow" })}
                        className={`flex-1 h-10 text-sm font-medium rounded-md transition-colors ${
                          formData.type === "cow" 
                            ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Cow
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "buffalo" })}
                        className={`flex-1 h-10 text-sm font-medium rounded-md transition-colors ${
                          formData.type === "buffalo" 
                            ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Buffalo
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Rate Chart Name<span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Select value={formData.name} onValueChange={(value) => setFormData({ ...formData, name: value })}>
                        <SelectTrigger className="h-10 text-sm border-gray-200 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 rounded-md transition-shadow">
                          <SelectValue placeholder="Select rate chart" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-md border-gray-200 shadow-md">
                          <SelectItem value="Rate chart 1" className="text-sm">Rate chart 1</SelectItem>
                          <SelectItem value="Rate chart 2" className="text-sm">Rate chart 2</SelectItem>
                          <SelectItem value="Rate chart 3" className="text-sm">Rate chart 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="effectiveDate" className="text-sm font-medium text-gray-700">
                        Effective Date<span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="effectiveDate"
                        type="date"
                        value={formData.effectiveDate}
                        onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                        className="h-10 text-sm border-gray-200 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 rounded-md transition-shadow"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: File Upload */}
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-gray-700 mb-1.5">
                    Upload File<span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors min-h-[200px]">
                    <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} className="hidden" id="excel-upload" />
                    <label htmlFor="excel-upload" className="cursor-pointer block w-full h-full flex flex-col items-center justify-center">
                      {csvFile ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                          <h3 className="text-base font-semibold text-gray-900 mb-1.5">File Selected</h3>
                          <p className="text-xs font-medium text-green-800 bg-green-100/80 px-3 py-1.5 rounded-md border border-green-200">{csvFile.name}</p>
                          <Button variant="outline" className="mt-4 h-8 text-xs px-3 rounded-md border-gray-300 hover:bg-gray-100" onClick={(e) => { e.preventDefault(); setCsvFile(null); setPreviewData(null); }}>
                            Change File
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100">
                            <Upload className="w-6 h-6 text-gray-400" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">Drop file or browse</h3>
                          <p className="text-gray-500 text-xs">Supported formats: .csv, .xls, .xlsx</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {previewData && (
                <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-3 py-2.5 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700">Preview (First 5 Rows)</h4>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                      <tbody>
                        {previewData.map((row, i) => (
                          <tr key={i} className={i === 0 ? 'bg-blue-50/50 font-semibold text-gray-800' : 'hover:bg-gray-50 text-gray-600'}>
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 border-r border-b border-gray-100 last:border-r-0">
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

              <div className="mt-6 pt-5 border-t border-gray-100">
                <Button type="submit" disabled={loading} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium text-sm rounded-md transition-colors">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Upload Rate Chart</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadRateChart;

