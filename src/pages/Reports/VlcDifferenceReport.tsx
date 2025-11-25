import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/store";
import { reportsApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { generateVLCDifferenceReportPDF } from "@/templates/VLCdifferanceReportTemplate";
import { FileDown } from "lucide-react";

const VlcDifferenceReport = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [vlcId, setVlcId] = useState("");
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 17 ? "Evening" : "Morning";
  };
  
  const [shift, setShift] = useState(getDefaultShift());
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleShow = async () => {
    if (!vlcId) {
      toast.error("Please select a VLC");
      return;
    }

    const selectedBranch = branches?.find(b => b.username === vlcId);
    if (!selectedBranch) return;

    setLoading(true);
    try {
      const data = await reportsApi.getVlcDifferenceReport({
        dairy_id: selectedBranch.branch_id.toString(),
        vlc_id: vlcId,
        from: fromDate,
        to: toDate,
        shift: shift,
      });
      
      if (data.success) {
        setReportData(data.data);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!reportData || reportData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const selectedBranch = branches?.find(b => b.username === vlcId);
    const branchName = selectedBranch ? `${selectedBranch.name}` : vlcId;
    generateVLCDifferenceReportPDF(reportData, vlcId, fromDate, toDate, shift, branchName);
    toast.success("PDF exported successfully");
  };

  return (
    <div className="p-6 bg-white w-full h-screen">
      <h1 className="text-lg font-bold mb-7">VLCC Difference Report</h1>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-3 rounded-lg">
        <div>
          <Label className="mb-1">VLC Name</Label>
          <Select value={vlcId} onValueChange={setVlcId}>
            <SelectTrigger className="w-full border-gray-200">
              <SelectValue placeholder="Select VLC" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {branches?.map((branch) => (
                <SelectItem key={branch.username} value={branch.username}>
                  {branch.username} - {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1">From Date</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border-gray-200"
          />
        </div>
        <div>
          <Label className="mb-1">To Date</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border-gray-200"
          />
        </div>
        <div>
          <Label className="mb-1">Shift Type</Label>
          <Select value={shift} onValueChange={setShift}>
            <SelectTrigger className="w-full border-gray-200">
              <SelectValue placeholder="Select shift" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="Morning">Morning</SelectItem>
              <SelectItem value="Evening">Evening</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleShow} 
          disabled={loading}
          className="text-white bg-blue-600 w-[90px] mt-4.5"
        >
          {loading ? "Loading..." : "Show"}
        </Button>
        <Button 
          onClick={handleExportPDF} 
          disabled={!reportData || reportData.length === 0}
          className="text-white bg-green-600 w-[120px] mt-4.5 flex items-center gap-2"
        >
          <FileDown size={16} />
          Export PDF
        </Button>
      </div>
      <div className="overflow-x-auto mt-4 border border-gray-200 rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
              <TableHead rowSpan={2} className="text-center border border-gray-200 font-bold text-gray-900 py-3">Period</TableHead>
              <TableHead colSpan={4} className="text-center border border-gray-200 font-bold text-blue-900 py-3">
                VLC Collection Data
              </TableHead>
              <TableHead colSpan={4} className="text-center border border-gray-200 font-bold text-green-900 py-3">
                Dairy Entry
              </TableHead>
              <TableHead colSpan={4} className="text-center border border-gray-200 font-bold text-purple-900 py-3">
                Difference (VLC - Dairy)
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="text-center font-semibold bg-blue-50 border border-gray-200 text-blue-800">Weight</TableHead>
              <TableHead className="text-center font-semibold bg-blue-50 border border-gray-200 text-blue-800">Fat</TableHead>
              <TableHead className="text-center font-semibold bg-blue-50 border border-gray-200 text-blue-800">SNF</TableHead>
              <TableHead className="text-center font-semibold bg-blue-50 border border-gray-200 text-blue-800">Amount</TableHead>
              <TableHead className="text-center font-semibold bg-green-50 border border-gray-200 text-green-800">Weight</TableHead>
              <TableHead className="text-center font-semibold bg-green-50 border border-gray-200 text-green-800">Fat</TableHead>
              <TableHead className="text-center font-semibold bg-green-50 border border-gray-200 text-green-800">SNF</TableHead>
              <TableHead className="text-center font-semibold bg-green-50 border border-gray-200 text-green-800">Amount</TableHead>
              <TableHead className="text-center font-semibold bg-purple-50 border border-gray-200 text-purple-800">Weight</TableHead>
              <TableHead className="text-center font-semibold bg-purple-50 border border-gray-200 text-purple-800">Fat</TableHead>
              <TableHead className="text-center font-semibold bg-purple-50 border border-gray-200 text-purple-800">SNF</TableHead>
              <TableHead className="text-center font-semibold bg-purple-50 border border-gray-200 text-purple-800">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData && reportData.length > 0 ? (
              reportData.map((period: any, index: number) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="border border-gray-200 text-center font-medium bg-gray-50">{period.period}</TableCell>
                  <TableCell className="border border-gray-200 text-center bg-blue-50/30">{period.vlc.total_weight}</TableCell>
                  <TableCell className="border border-gray-200 text-center bg-blue-50/30">{period.vlc.avg_fat}</TableCell>
                  <TableCell className="border border-gray-200 text-center bg-blue-50/30">{period.vlc.avg_snf}</TableCell>
                  <TableCell className="border border-gray-200 text-center bg-blue-50/30 font-semibold">{period.vlc.total_amount}</TableCell>
                  <TableCell className="border border-gray-200 text-center bg-green-50/30">{period.dairy.total_weight}</TableCell>
                  <TableCell className="border border-gray-200 text-center bg-green-50/30">{period.dairy.avg_fat}</TableCell>
                  <TableCell className="border border-gray-200 text-center bg-green-50/30">{period.dairy.avg_snf}</TableCell>
                  <TableCell className="border border-gray-200 text-center bg-green-50/30 font-semibold">{period.dairy.total_amount}</TableCell>
                  <TableCell className={`border border-gray-200 text-center font-bold bg-purple-50/30 ${parseFloat(period.difference.weight) < 0 ? 'text-red-600' : parseFloat(period.difference.weight) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {period.difference.weight}
                  </TableCell>
                  <TableCell className={`border border-gray-200 text-center font-bold bg-purple-50/30 ${parseFloat(period.difference.fat) < 0 ? 'text-red-600' : parseFloat(period.difference.fat) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {period.difference.fat}
                  </TableCell>
                  <TableCell className={`border border-gray-200 text-center font-bold bg-purple-50/30 ${parseFloat(period.difference.snf) < 0 ? 'text-red-600' : parseFloat(period.difference.snf) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {period.difference.snf}
                  </TableCell>
                  <TableCell className={`border border-gray-200 text-center font-bold bg-purple-50/30 ${parseFloat(period.difference.amount) < 0 ? 'text-red-600' : parseFloat(period.difference.amount) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {period.difference.amount}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-10 text-gray-500 bg-gray-50">
                  Select VLC and date range, then click Show to view the report
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VlcDifferenceReport;
