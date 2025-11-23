import { Card, CardContent} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { useState } from "react";
import { useAppSelector } from "@/redux/store";
import { reportsApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { format } from "date-fns";

const TotalCollectionReport = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startShift, setStartShift] = useState("Morning");
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endShift, setEndShift] = useState("Evening");
  const [milkType, setMilkType] = useState("All");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_liters: "0",
    avg_fat: "0",
    avg_snf: "0",
    total_amount: "0"
  });

  const handleShowReport = async () => {
    if (!dairyId) {
      toast.error("Please select a dairy");
      return;
    }

    setLoading(true);
    try {
      const data = await reportsApi.getShiftCollectionReport({
        dairyid: dairyId,
        startDate,
        startShift,
        endDate,
        endShift,
        milkType
      });
      
      if (data.success && data.summary) {
        setSummary(data.summary);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="text-left p-4">
        <h1 className="font-bold text-2xl">Total Collection Report</h1>
        <p className="text-sm text-gray-600">
          View and analyze milk collection data across VLCCs
        </p>
      </div>
      <Card className="border-gray-300 mb-7">
        <CardContent className="space-y-6">
          {/* Filter Form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="mb-1">VLC Name</Label>
              <Select value={dairyId} onValueChange={setDairyId}>
                <SelectTrigger className="w-full border-gray-200">
                  <SelectValue placeholder="Select VLC" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {branches?.map((branch) => (
                    <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                      {branch.username} - {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1">From Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-gray-200"/>
            </div>
            <div>
              <Label className="mb-1">Start Shift</Label>
              <Select value={startShift} onValueChange={setStartShift}>
                <SelectTrigger className="w-full border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1">To Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border-gray-200" />
            </div>
            <div>
              <Label className="mb-1">End Shift</Label>
              <Select value={endShift} onValueChange={setEndShift}>
                <SelectTrigger className="w-full border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center p-3">
            <Select value={milkType} onValueChange={setMilkType}>
              <SelectTrigger className="w-48 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Cow">Cow</SelectItem>
                <SelectItem value="Buffalo">Buffalo</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleShowReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? "Loading..." : "Show Report"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 text-center">
        <Card className="bg-white border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Collection</p>
                <p className="text-2xl font-bold text-gray-900">{parseFloat(summary.total_liters).toFixed(2)} L</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average FAT</p>
                <p className="text-2xl font-bold text-gray-900">{parseFloat(summary.avg_fat).toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average SNF</p>
                <p className="text-2xl font-bold text-gray-900">{parseFloat(summary.avg_snf).toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{parseFloat(summary.total_amount).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Buttons */}
      <div className="flex justify-end gap-2 mt-8">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" >Excel Export</Button>
        <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
          PDF Export
        </Button>
      </div>
    </div>
  );
};

export default TotalCollectionReport;
