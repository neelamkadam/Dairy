import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppSelector } from "@/redux/store";
import { reportsApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { generateRemainingBalanceReportPDF } from "@/templates/RemainingBalanceReportTemplate";
import { generateRemainingBalanceReportExcel } from "@/templates/RemainingBalanceReportExcelTemplate";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

const RemainingBalanceReport = () => {
  const { i18n } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [searchTerm, setSearchTerm] = useState("");
  const [vlcId, setVlcId] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [language, setLanguage] = useState<string>(i18n.language || 'en');

  const handleShowReport = async () => {
    if (!vlcId) {
      toast.error("Please select a VLC");
      return;
    }

    setLoading(true);
    try {
      const data = await reportsApi.getFarmerBalances({
        dairy_id: vlcId,
        date
      });
      
      if (data.success && Array.isArray(data.data)) {
        // Filter out farmer_id = 0, all zero balances, and keep only latest data per farmer
        const filtered = data.data.filter((f: any) => {
          if (f.farmer_id === '0' || f.farmer_id === 0) return false;
          const total = parseFloat(f.advance_remaining || 0) + parseFloat(f.other1_remaining || 0) + 
                        parseFloat(f.other2_remaining || 0) + parseFloat(f.cattlefeed_remaining || 0);
          return total > 0;
        });
        const latestMap = new Map();
        filtered.forEach((f: any) => {
          const existing = latestMap.get(f.farmer_id);
          if (!existing || new Date(f.date) > new Date(existing.date)) {
            latestMap.set(f.farmer_id, f);
          }
        });
        setFarmers(Array.from(latestMap.values()));
      } else {
        setFarmers([]);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch balances");
      setFarmers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFarmers = farmers.filter(
    (farmer) =>
      farmer.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.farmer_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFarmers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFarmers = filteredFarmers.slice(startIndex, endIndex);

  const totalBalance = filteredFarmers.reduce((sum, farmer) => 
    sum + parseFloat(farmer.advance_remaining || 0) + 
    parseFloat(farmer.other1_remaining || 0) + 
    parseFloat(farmer.other2_remaining || 0) + 
    parseFloat(farmer.cattlefeed_remaining || 0), 0
  );

  const handleExportPDF = () => {
    if (filteredFarmers.length === 0) {
      toast.error("No data to export");
      return;
    }
    const selectedBranch = branches?.find(b => b.branch_id.toString() === vlcId);
    const vlcName = selectedBranch ? `${selectedBranch.username} - ${selectedBranch.name}` : vlcId;
    generateRemainingBalanceReportPDF(filteredFarmers, vlcName, date, totalBalance);
    toast.success("PDF exported successfully");
  };

  const handleExportExcel = () => {
    if (filteredFarmers.length === 0) {
      toast.error("No data to export");
      return;
    }
    const selectedBranch = branches?.find(b => b.branch_id.toString() === vlcId);
    const vlcName = selectedBranch ? `${selectedBranch.username} - ${selectedBranch.name}` : vlcId;
    generateRemainingBalanceReportExcel(filteredFarmers, vlcName, date, totalBalance);
    toast.success("Excel exported successfully");
  };

  return (
    <div className="p-4 space-y-4 bg-white w-full h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold">Remaining Amount Report</h1>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div>
          <Label className="mb-1">Select VLC</Label>
          <Select value={vlcId} onValueChange={(value) => {
            setVlcId(value);
            setFarmers([]);
          }}>
            <SelectTrigger className="border-gray-300 w-48">
              <SelectValue placeholder="Select VLC" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {branches?.map((branch) => (
                <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                  {branch.username} - {branch.name} - {branch.branchName || ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-gray-300" />
        </div>
        <div>
          <Label className="mb-1">Language</Label>
          <Select value={language} onValueChange={(val) => { setLanguage(val); i18n.changeLanguage(val); }}>
            <SelectTrigger className="w-48 border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">हिंदी</SelectItem>
              <SelectItem value="mr">मराठी</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleShowReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 mt-6 text-white">
          {loading ? "Loading..." : "Show Report"}
        </Button>
      </div>

      {/* Search and Export */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search farmers..."
              className="pl-10 w-64 border-gray-200"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportPDF}
            disabled={filteredFarmers.length === 0}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <FileDown size={16} />
            PDF Export
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={filteredFarmers.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <FileDown size={16} />
            Excel Export
          </Button>
        </div>
      </div>
      {/* Data Table */}
      <Card className="border-none text-center p-0 rounded-lg ">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 ">
                <TableHead className="font-semibold text-left">Farmer ID</TableHead>
                <TableHead className="font-semibold text-left">Farmer Name</TableHead>
                <TableHead className="font-semibold text-right">Advance</TableHead>
                <TableHead className="font-semibold text-right">Other 1</TableHead>
                <TableHead className="font-semibold text-right">Other 2</TableHead>
                <TableHead className="font-semibold text-right">Cattle Feed</TableHead>
                <TableHead className="font-semibold text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFarmers.length > 0 ? (
                paginatedFarmers.map((farmer, index) => {
                  const total = parseFloat(farmer.advance_remaining || 0) + 
                    parseFloat(farmer.other1_remaining || 0) + 
                    parseFloat(farmer.other2_remaining || 0) + 
                    parseFloat(farmer.cattlefeed_remaining || 0);
                  return (
                    <TableRow key={index} className="hover:bg-gray-50 bg-white border-gray-100">
                      <TableCell className="font-medium text-left">{farmer.farmer_id}</TableCell>
                      <TableCell className="text-left">{farmer.farmer_name}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(farmer.advance_remaining).toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(farmer.other1_remaining).toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(farmer.other2_remaining).toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(farmer.cattlefeed_remaining).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">₹{total.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                    {loading ? "Loading..." : "Select VLC and date, then click Show Report"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Total */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total Remaining Balance</span>
          <span className="text-2xl font-bold">
            ₹{totalBalance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
            {filteredFarmers.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, filteredFarmers.length)} of ${filteredFarmers.length}` : '0-0 of 0'}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
            return totalPages > 0 && page <= totalPages ? (
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
            ) : null;
          })}
          <Button
            variant="default"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RemainingBalanceReport;
