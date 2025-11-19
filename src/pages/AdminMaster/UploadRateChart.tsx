import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file");
        return;
      }
      setCsvFile(file);
    }
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
      const fileInput = document.getElementById("csv-file") as HTMLInputElement;
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

              <div className="space-y-2">
                <Label htmlFor="csv-file" className="text-sm font-medium">
                  CSV File (UTF-8)<span className="text-red-600">*</span>
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="h-11"
                    required
                  />
                  {csvFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileSpreadsheet className="w-4 h-4" />
                      {csvFile.name}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">Upload CSV file in UTF-8 format</p>
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
