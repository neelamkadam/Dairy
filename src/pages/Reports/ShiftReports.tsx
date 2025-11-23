import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { api } from "@/services/config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  Download,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SwapVertIcon from "@mui/icons-material/SwapVert";

const ShiftReports:React.FC = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    selectedDairy: "",
    milkType: "",
    shift: "",
    date: undefined as Date | undefined,
  });

  const fetchCollectionReport = async () => {
    if (!formData.selectedDairy || !formData.shift || !formData.date) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(
        `/report/collection-report`,
        {
          params: {
            shift: formData.shift.toUpperCase(),
            dairy_id: formData.selectedDairy,
            date: format(formData.date, "yyyy-MM-dd")
          }
        }
      );
      if (response.data.success && response.data.data.records.length > 0) {
        setReportData(response.data.data);
      } else {
        setReportData(null);
        toast.info("No data available for the selected criteria");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on milk type
  const allRecords = reportData?.records || [];
  const farmerData = formData.milkType && formData.milkType !== "mixed" 
    ? allRecords.filter((record: any) => record.type.toLowerCase() === formData.milkType.toLowerCase())
    : allRecords;

  // Calculate totals for filtered data
  const totals = {
    quantity: farmerData.reduce((sum: number, record: any) => sum + parseFloat(record.quantity || 0), 0),
    avgFat: farmerData.length > 0 ? (farmerData.reduce((sum: number, record: any) => sum + parseFloat(record.fat || 0), 0) / farmerData.length).toFixed(2) : 0,
    avgSnf: farmerData.length > 0 ? (farmerData.reduce((sum: number, record: any) => sum + parseFloat(record.snf || 0), 0) / farmerData.length).toFixed(2) : 0,
    totalAmount: farmerData.reduce((sum: number, record: any) => sum + parseFloat(record.amount || 0), 0),
  };

  const totalPages = Math.ceil(farmerData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = farmerData.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-700 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded">
              <FileText className="h-6 w-6 text-slate-700" />
            </div>
            <h1 className="text-xl md:text-2xl font-semibold">
              Daily Shift Report
            </h1>
          </div>
        </div>
      </header>
      <div className="p-4">
        <div className="w-[85%] text-left grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <div className="space-y-2 w-full">
            <label className="text-sm font-medium text-gray-700">
              VLC Name
            </label>
            <Select value={formData.selectedDairy} onValueChange={(value) => setFormData({...formData, selectedDairy: value})}>
              <SelectTrigger className=" w-full bg-white border-gray-200">
                <SelectValue placeholder="Select VLC" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {branches.map((branch) => (
                  <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                    {branch.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Milk Type
            </label>
            <Select value={formData.milkType} onValueChange={(value) => setFormData({...formData, milkType: value})}>
              <SelectTrigger className=" w-full bg-white border-gray-200">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="mixed">All</SelectItem>
                <SelectItem value="cow">Cow Milk</SelectItem>
                <SelectItem value="buffalo">Buffalo Milk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mt-5">
          <div className="space-y-2 text-left ">
            <Label>Date From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full bg-white justify-between font-normal border-gray-200 ",
                    !formData.effectiveDate && "text-muted-foreground"
                  )}
                >
                  {formData.date
                    ? format(formData.date, "yyyy/MM/dd")
                    : "yyyy / mm / dd"}
                  <CalendarIcon className="mr-2 h-4 w-4 " />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) =>
                    setFormData({ ...formData, date: date })
                  }
                  initialFocus
                  className="p-3 pointer-events-auto bg-white"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 ml-5">
            <label className="text-sm font-medium text-gray-700">
              Shift Type
            </label>
            <Select value={formData.shift} onValueChange={(value) => setFormData({...formData, shift: value})}>
              <SelectTrigger className="w-full bg-white border-gray-200">
                <SelectValue placeholder="Select Shift" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end mt-6 mr-5">
            <Button 
              onClick={fetchCollectionReport}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Loading..." : "Show"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-white">
        <Table className="border-none text-center">
          <TableHeader>
            <TableRow className="bg-gray-100 ">
              <TableHead className="font-semibold text-center border border-gray-100">
                Farmer ID
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Quantity
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Fat
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                SNF
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Milk Type
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Rate
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Total Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? paginatedData.map((record: any, index: number) => (
              <TableRow
                key={`${record.code}-${record.type}-${index}`}
                className="hover:bg-gray-50 bg-white border-gray-100 "
              >
                <TableCell className="font-medium border border-gray-100">{record.code}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.quantity}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.fat}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.snf}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.type}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.rate}</TableCell>
                <TableCell className="font-medium border border-gray-100">₹{record.amount}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No data available. Please select criteria and click Show.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Items per page</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => setItemsPerPage(parseInt(value))}
            >
              <SelectTrigger className="w-18 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ">
            <Button
              variant="default"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "outline" : "default"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    currentPage === page &&
                      "bg-blue-600 hover:bg-blue-700 border-none"
                  )}
                >
                  {page}
                </Button>
              );
            })}

            <Button
              variant="default"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4 " />
            </Button>
          </div>

          <span className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, farmerData.length)} of {farmerData.length} items
          </span>
        </div>

        {/* Summary Statistics */}
        <div className="rounded-lg bg-white">
          <Table>
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableHead className="text-center font-semibold border border-gray-100">
                  Total Quantity (L)
                </TableHead>
                <TableHead className="text-center font-semibold border border-gray-100">
                  Average Fat (%)
                </TableHead>
                <TableHead className="text-center font-semibold border border-gray-100">
                  Average SNF (%)
                </TableHead>
                <TableHead className="text-center font-semibold border border-gray-100">
                  Total Amount (₹)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-gray-200">
                <TableCell>{totals.quantity}</TableCell>
                <TableCell>{totals.avgFat}</TableCell>
                <TableCell>{totals.avgSnf}</TableCell>
                <TableCell>{totals.totalAmount}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            className="flex items-center gap-2 text-white bg-blue-500"
          >
            <Download className="h-4 w-4" />
            Excel Export
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-red-500 text-white"
          >
            <Download className="h-4 w-4" />
            PDF Export
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShiftReports;
