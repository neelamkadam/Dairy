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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Upload Rate Chart</h1>
              <p className="text-gray-600">Upload CSV file to create rate chart</p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-lg font-medium">Rate Chart Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="organisationId" className="text-sm font-medium">
                  Dairy ID<span className="text-red-600">*</span>
                </Label>
                <Input
                  id="organisationId"
                  placeholder="Enter Dairy ID"
                  value={formData.organisationId}
                  onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Type<span className="text-red-600">*</span>
                </Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "cow" })}
                    className={`flex-1 h-11 ${formData.type === "cow" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    Cow
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "buffalo" })}
                    className={`flex-1 h-11 ${formData.type === "buffalo" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    Buffalo
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Rate Chart Name<span className="text-red-600">*</span>
                </Label>
                <Select value={formData.name} onValueChange={(value) => setFormData({ ...formData, name: value })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select rate chart" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Rate chart 1">Rate chart 1</SelectItem>
                    <SelectItem value="Rate chart 2">Rate chart 2</SelectItem>
                    <SelectItem value="Rate chart 3">Rate chart 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveDate" className="text-sm font-medium">
                  Effective Date<span className="text-red-600">*</span>
                </Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 md:p-12 text-center hover:border-blue-400 transition-colors">
                  <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} className="hidden" id="excel-upload" />
                  <label htmlFor="excel-upload" className="cursor-pointer block">
                    {csvFile ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">File Selected</h3>
                        <p className="text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-full">{csvFile.name}</p>
                        <Button variant="outline" className="mt-4" onClick={(e) => { e.preventDefault(); setCsvFile(null); setPreviewData(null); }}>Change File</Button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop file or browse</h3>
                        <p className="text-gray-500 text-sm">Supported formats: .csv, .xls, .xlsx</p>
                      </div>
                    )}
                  </label>
                </div>

                {previewData && (
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b">
                      <h4 className="font-semibold text-gray-700">Preview (First 5 Rows)</h4>
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
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 bg-blue-600 hover:bg-blue-700">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Rate Chart
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadRateChart;
