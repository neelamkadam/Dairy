import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import { userApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { generateFarmerListPDF } from "@/templates/FarmerListTemplate";
import { generateFarmerListExcel } from "@/templates/FarmerListExcelTemplate";
import { Download } from "lucide-react";

const FarmerList = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [selectedVlcc, setSelectedVlcc] = useState("");
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleShow = async () => {
    if (!selectedVlcc) {
      toast.error("Please select a VLC");
      return;
    }

    setLoading(true);
    try {
      const data = await userApi.getFarmers(selectedVlcc);
      
      if (data.success && Array.isArray(data.data)) {
        setFarmers(data.data);
      } else {
        setFarmers([]);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch farmers");
      setFarmers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!farmers || farmers.length === 0) {
      toast.error("No data to export");
      return;
    }
    const selectedBranch = branches?.find(b => b.branch_id.toString() === selectedVlcc);
    const vlcName = selectedBranch ? selectedBranch.name : "";
    const dairyName = selectedBranch ? selectedBranch.username : "";
    generateFarmerListPDF(vlcName, dairyName, farmers);
    toast.success("PDF exported successfully");
  };

  const handleExportExcel = () => {
    if (!farmers || farmers.length === 0) {
      toast.error("No data to export");
      return;
    }
    const selectedBranch = branches?.find(b => b.branch_id.toString() === selectedVlcc);
    const vlcName = selectedBranch ? `${selectedBranch.username} - ${selectedBranch.name}` : "";
    generateFarmerListExcel(vlcName, farmers);
    toast.success("Excel exported successfully");
  };

  const totalPages = Math.ceil(farmers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFarmers = farmers.slice(startIndex, endIndex);

  return (
    <div className="p-6 text-left">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Farmer List</h1>
        <p className="text-gray-600">Manage and view all farmers</p>
      </div>
      <div className="flex gap-5 mb-5">
        <Select value={selectedVlcc} onValueChange={(value) => {
          setSelectedVlcc(value);
          setFarmers([]);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-48 border-gray-300">
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
        <Button onClick={handleShow} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white w-[150px]">
          {loading ? "Loading..." : "Show"}
        </Button>
      </div>
      
      <div className="flex justify-end gap-3 mb-4">
        <Button 
          onClick={handleExportExcel}
          disabled={!farmers || farmers.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Excel Export
        </Button>
        <Button 
          onClick={handleExportPDF}
          disabled={!farmers || farmers.length === 0}
          variant="default" 
          className="bg-red-500 text-white flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          PDF Export
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg">
        <Table className="">
          <TableHeader className="bg-gray-200">
            <TableRow className="">
              <TableHead>Farmer ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Milk Type</TableHead>
              <TableHead>Rate Chart</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentFarmers.length > 0 ? (
              currentFarmers.map((farmer) => (
                <TableRow key={farmer.id || farmer.username} className="hover:bg-gray-50">
                  <TableCell className="font-medium border border-gray-300">{farmer.username}</TableCell>
                  <TableCell className="border border-gray-300">{farmer.fullName}</TableCell>
                  <TableCell className="border border-gray-300">{farmer.mobile_number}</TableCell>
                  <TableCell className="border border-gray-300">{farmer.milkType}</TableCell>
                  <TableCell className="border border-gray-300">{farmer.rateChart}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                  {loading ? "Loading..." : "Select VLC and click Show to view farmers"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Showing {farmers.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, farmers.length)} of {farmers.length} items
            </span>
          </div>

          <div className="flex items-center gap-2 ">
            <Button
              variant="default"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border border-gray-400 "
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
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
            ))}
            <Button
              variant="default"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="border border-gray-400 "
            >
              <ChevronRight className="h-4 w-4 " />
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
};
export default FarmerList;
