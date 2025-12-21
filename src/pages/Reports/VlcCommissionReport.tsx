import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarIcon, FileDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useAppSelector } from "@/redux/store";
import { reportsApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { generateVlcCommissionReportPDF } from "@/templates/VlcCommissionReportTemplate";
import { generateVlcCommissionReportExcel } from "@/templates/VlcCommissionReportExcelTemplate";

const VlcCommissionReport = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [vlcId, setVlcId] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = reportData.slice(startIndex, endIndex);

  const handleShowReport = async () => {
    if (!vlcId) {
      toast.error("Please select a VLC");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Please select date range");
      return;
    }

    setLoading(true);
    try {
      const vlcIds = vlcId === 'all' ? branches.map(b => b.branch_id).join(',') : vlcId;
      const data = await reportsApi.getVlcCommissionReport({
        vlc_id: vlcIds,
        start_date: format(fromDate, 'yyyy-MM-dd'),
        end_date: format(toDate, 'yyyy-MM-dd')
      });
      
      if (data.success && Array.isArray(data.data)) {
        const flatData = data.data.flatMap((vlc: any) => {
          if (vlc.commissions.length === 0) {
            return [{
              vlc_id: vlc.vlc_id,
              total_quantity: vlc.total_quantity,
              type: 'Commission',
              rate: '0.00'
            }];
          }
          return vlc.commissions.map((comm: any) => ({
            vlc_id: vlc.vlc_id,
            total_quantity: vlc.total_quantity,
            type: comm.type,
            rate: comm.amount
          }));
        });
        setReportData(flatData);
        setCurrentPage(1);
      } else {
        setReportData([]);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch commission report");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (reportData.length === 0) {
      toast.error("No data to export");
      return;
    }
    generateVlcCommissionReportPDF(reportData, branches, format(fromDate!, 'yyyy-MM-dd'), format(toDate!, 'yyyy-MM-dd'));
    toast.success("PDF exported successfully");
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      toast.error("No data to export");
      return;
    }
    generateVlcCommissionReportExcel(reportData, branches, format(fromDate!, 'yyyy-MM-dd'), format(toDate!, 'yyyy-MM-dd'));
    toast.success("Excel exported successfully");
  };
  return (
    <div className="bg-white w-full h-screen">
      <h1 className="text-lg font-bold p-5">VLCC Commission Report</h1>
      <hr className="text-gray-300"/>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-15 p-6 rounded-lg">
        <div>
          <Label className="mb-1">VLCC Name</Label>
          <Select value={vlcId} onValueChange={(value) => {
            setVlcId(value);
            setReportData([]);
          }}>
            <SelectTrigger className="w-full border-gray-200">
              <SelectValue placeholder="Select VLCC" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All</SelectItem>
              {branches?.map((branch) => (
                <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                  {branch.username} - {branch.name} - {branch.branchName || ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 text-left ">
          <Label>From Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full bg-white justify-between font-normal border-gray-200 ",
                  !fromDate && "text-muted-foreground"
                )}
              >
                {fromDate ? format(fromDate, "dd-MM-yyyy") : "Select date"}
                <CalendarIcon className="mr-1 h-4 w-4 text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
                initialFocus
                className="p-3 pointer-events-auto bg-white"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2 text-left ">
          <Label>To Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full bg-white justify-between font-normal border-gray-200 ",
                  !toDate && "text-muted-foreground"
                )}
              >
                {toDate ? format(toDate, "dd-MM-yyyy") : "Select date"}
                <CalendarIcon className="mr-1 h-4 w-4 text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={setToDate}
                initialFocus
                className="p-3 pointer-events-auto bg-white"
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={handleShowReport} disabled={loading} className="text-white bg-blue-600 w-[90px] mt-4.5">
          {loading ? "Loading..." : "Show"}
        </Button>
      </div>
      <div className="flex gap-3 justify-end px-6">
        <Button 
          onClick={handleExportExcel}
          disabled={reportData.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <FileDown size={16} />
          Excel Export
        </Button>
        <Button 
          onClick={handleExportPDF}
          disabled={reportData.length === 0}
          className="text-white bg-red-600 hover:bg-red-700 flex items-center gap-2"
        >
          <FileDown size={16} />
          PDF Export
        </Button>
      </div>
      <div className="overflow-x-auto p-6">
              <Table className="border border-gray-200 rounded-3xl">
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="border border-gray-50 text-gray-700">VLC ID</TableHead>
                    <TableHead className="border border-gray-50 text-gray-700">TOTAL QUANTITY (L)</TableHead>
                    <TableHead className="border border-gray-50 text-gray-700">TYPE</TableHead>
                    <TableHead className="border border-gray-50 text-gray-700">RATE (₹)</TableHead>
                    <TableHead className="border border-gray-50 text-gray-700">AMOUNT (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => {
                      const branch = branches.find(b => b.branch_id.toString() === row.vlc_id);
                      const amount = parseFloat(row.total_quantity) * parseFloat(row.rate);
                      return (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-left border border-gray-50">
                          {branch?.username || row.vlc_id}
                        </TableCell>
                        <TableCell className="font-medium text-left border border-gray-50">
                          {parseFloat(row.total_quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-left border border-gray-50">
                          {row.type}
                        </TableCell>
                        <TableCell className="font-medium text-left border border-gray-50">
                          {parseFloat(row.rate).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-left border border-gray-50">
                          {amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                        {loading ? "Loading..." : "Select VLC and date range, then click Show"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
      <hr className="text-gray-300 mt-10"/>
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center justify-start gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
            setItemsPerPage(Number(value));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-16 border-gray-200 bg-gray-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">
            {reportData.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, reportData.length)} of ${reportData.length}` : '0-0 of 0'}
          </span>
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
          {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
            const page = Math.max(1, Math.min(currentPage - 1, totalPages - 2)) + i;
            return (
              <Button
                key={page}
                variant={currentPage === page ? "outline" : "default"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  currentPage === page &&
                    "bg-blue-600 hover:bg-blue-700 border-none text-white"
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
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </div>
  );
};

export default VlcCommissionReport;
