import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format, lastDayOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import { bankSummaryApi, BankSummaryData } from "@/services/bankSummaryApi";
import { toast } from "react-toastify";

const calculateDateRange = (date: Date) => {
  const day = date.getDate();
  let startDate: Date;
  let endDate: Date;

  if (day >= 1 && day <= 10) {
    startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    endDate = new Date(date.getFullYear(), date.getMonth(), 10);
  } else if (day >= 11 && day <= 20) {
    startDate = new Date(date.getFullYear(), date.getMonth(), 11);
    endDate = new Date(date.getFullYear(), date.getMonth(), 20);
  } else {
    startDate = new Date(date.getFullYear(), date.getMonth(), 21);
    endDate = lastDayOfMonth(date);
  }

  return { startDate, endDate };
};

const BankSummary: React.FC = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [data, setData] = useState<BankSummaryData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { startDate: start, endDate: end } = calculateDateRange(new Date());
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const { startDate: start, endDate: end } = calculateDateRange(date);
    setStartDate(start);
    setEndDate(end);
  };

  const fetchData = async () => {
    if (!dairyId) {
      toast.error("Please select VLC");
      return;
    }

    setLoading(true);
    try {
      const response = await bankSummaryApi.getBankSummary({
        dairy_id: dairyId,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      });
      setData(response.data || []);
      toast.success("Data fetched successfully");
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const exportData = data.map(row => ({
      "Farmer ID": row.farmer_id,
      "Name": row.fullName,
      "Mobile": row.mobile_number,
      "Email": row.email || "-",
      "Milk Total": parseFloat(row.milk_total || 0).toFixed(2),
      "Bank Name": row.bankName || "-",
      "Account Number": row.accountNumber || "-",
      "IFSC Code": row.ifscCode || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bank Summary");
    XLSX.writeFile(wb, `Bank_Summary_${format(startDate, "dd-MM-yyyy")}_to_${format(endDate, "dd-MM-yyyy")}.xlsx`);
    toast.success("Excel file downloaded");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-sm border-none">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-2xl font-bold text-gray-800">🏦 Payment Bank Summary</CardTitle>
            <p className="text-sm text-gray-600 mt-1">View farmer bank details and payment summary</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">VLC Name</Label>
                <Select value={dairyId} onValueChange={setDairyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select VLC" />
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

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "dd-MM-yyyy")} to {format(endDate, "dd-MM-yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white pointer-events-auto" align="start">
                    <Calendar 
                      mode="single" 
                      selected={startDate} 
                      onDayClick={(date) => {
                        if (date) {
                          const { startDate: start, endDate: end } = calculateDateRange(date);
                          setStartDate(start);
                          setEndDate(end);
                        }
                      }}
                      defaultMonth={startDate}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Button onClick={fetchData} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {loading ? "Loading..." : "Fetch Data"}
                </Button>
              </div>
            </div>

            {data.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                <p className="text-sm font-medium text-blue-900">
                  Showing {data.length} farmer{data.length !== 1 ? 's' : ''} for period: {format(startDate, "dd MMM yyyy")} to {format(endDate, "dd MMM yyyy")}
                </p>
                <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border shadow-sm">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Farmer ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Mobile</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Milk Total</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Bank Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Account Number</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">IFSC Code</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        No data available. Select filters and click Fetch Data.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 border-b">
                        <td className="py-3 px-4">{row.farmer_id}</td>
                        <td className="py-3 px-4">{row.fullName}</td>
                        <td className="py-3 px-4">{row.mobile_number}</td>
                        <td className="py-3 px-4">{row.email || "-"}</td>
                        <td className="py-3 px-4 text-right">₹{parseFloat(row.milk_total || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">{row.bankName || "-"}</td>
                        <td className="py-3 px-4">{row.accountNumber || "-"}</td>
                        <td className="py-3 px-4">{row.ifscCode || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BankSummary;
