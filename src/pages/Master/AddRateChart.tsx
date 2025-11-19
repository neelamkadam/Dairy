import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Upload } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchUserBranches } from "@/redux/branchSlice";
import { toast } from "react-toastify";
import { api } from "@/services/config";

const AddRateChart: React.FC = () => {
  const dispatch = useAppDispatch();
  const { branches } = useAppSelector((state) => state.branch);
  const userEmail = useAppSelector((state) => state.authData.userData?.email);

  const [formData, setFormData] = useState({
    vlcc: "",
    rateChart: "",
    effectiveDate: undefined as Date | undefined,
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userEmail) {
      dispatch(fetchUserBranches(userEmail));
    }
  }, [dispatch, userEmail]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Please upload an Excel file (.xlsx or .xls)");
        return;
      }
      setCsvFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.vlcc || !formData.rateChart || !formData.effectiveDate || !csvFile) {
      toast.error("Please fill all fields and upload a file");
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("csv", csvFile);
      formDataToSend.append("organisation_id", formData.vlcc);
      formDataToSend.append("type", formData.rateChart);
      formDataToSend.append("effective_date", format(formData.effectiveDate, "yyyy-MM-dd"));

      const { data } = await api.post("/conf/createrate", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Rate chart uploaded successfully!");
      setFormData({
        vlcc: "",
        rateChart: "",
        effectiveDate: undefined,
      });
      setCsvFile(null);
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <span className="text-gray-600">Company Name</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Rate Chart Management</h1>
        </div>
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          👤
        </div>
      </div>
      <hr className="text-gray-300" />
      <div className="space-y-6 w-[85%] m-auto mt-5">
        {/* Rate Chart Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-r from-green-400 to-green-500 text-white cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🐄</div>
                <div>
                  <h3 className="text-xl font-bold">Cow Rate Chart</h3>
                  <p className="text-green-100">Manage cow milk rates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-400 to-red-500 text-white cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🐃</div>
                <div>
                  <h3 className="text-xl font-bold">Buffalo Rate Chart</h3>
                  <p className="text-red-100">Manage buffalo milk rates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-[85%] text-left">
          <div >
            <label className="block text-sm font-medium mb-2 not-first:">
              Select VLCC
            </label>
            <Select
              value={formData.vlcc}
              onValueChange={(value) =>
                setFormData({ ...formData, vlcc: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select VLCC" />
              </SelectTrigger>
              <SelectContent className="bg-white ">
                {branches.map((branch) => (
                  <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                    {branch.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Select Rate Chart
            </label>
            <Select
              value={formData.rateChart}
              onValueChange={(value) =>
                setFormData({ ...formData, rateChart: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a rate chart..." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="cow">Cow</SelectItem>
                <SelectItem value="buffalo">Buffalo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Effective Date From
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.effectiveDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.effectiveDate
                    ? format(formData.effectiveDate, "yyyy/MM/dd")
                    : "yyyy / mm / dd"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white" align="start">
                <Calendar
                  mode="single"
                  selected={formData.effectiveDate}
                  onSelect={(date) =>
                    setFormData({ ...formData, effectiveDate: date })
                  }
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Import Rate Chart Section */}
        <Card className="border-none text-left">
          <CardHeader>
            <CardTitle>Import Rate Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <div className="text-6xl text-gray-400 mb-4">⬇️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Drop Excel file here or click to browse
                  </h3>
                  <p className="text-gray-500">Supported formats: .xlsx, .xls</p>
                  {csvFile && (
                    <p className="text-sm text-green-600 mt-2">Selected: {csvFile.name}</p>
                  )}
                </label>
              </div>

              <Button className="bg-red-600 hover:bg-red-700 text-white float-right">
                Download Sample File
              </Button>
              <div className="text-sm mt-20 m-auto rounded border w-30 h-9 p-1 bg-white  text-gray-600 ">
                Preview
              </div>
              <Button 
                onClick={handleSubmit}
                disabled={loading}
                className=" mt-40 w-35 h-9 text-white bg-blue-600 hover:bg-blue-700 float-right"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Update Rate Chart
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
       <hr className="text-gray-300 mt-15" />
      {/* Footer */}
      <div className="w-[85%] m-auto flex justify-between items-center p-4 text-sm text-gray-500">
        <div>© 2024 Company Name. All rights reserved.</div>
        <div className="flex gap-4">
          <span>Help</span>
          <span>Support</span>
        </div>
      </div>
    </>
  );
};
export default AddRateChart;
