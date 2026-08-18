import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSelector } from "@/redux/store";
import { userApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { generateFarmerListPDF } from "@/templates/FarmerListTemplate";
import { generateFarmerListExcel } from "@/templates/FarmerListExcelTemplate";
import { Download } from "lucide-react";
import Pagination from "@/components/Pagination";

const FarmerList = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [selectedVlcc, setSelectedVlcc] = useState("");
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    <div className="p-2 sm:p-4 text-left">
      {/* Header */}
      <div className="flex flex-col items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 mb-4">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Farmer List</h1>
        <p className="text-sm font-medium text-slate-500">Manage and view all farmers</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mb-4 text-left">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Select VLC</label>
          <VLCDropdown
            branches={branches || []}
            value={selectedVlcc}
            onChange={(value) => {
              setSelectedVlcc(value);
              setFarmers([]);
              setCurrentPage(1);
            }}
            valueKey="branch_id"
            placeholder="Select VLC"
          />
        </div>
        <div className="xl:col-span-4 flex flex-wrap gap-2 justify-end">
          <Button onClick={handleShow} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white w-[120px] h-10">
            {loading ? "Loading..." : "Show"}
          </Button>
          <Button 
            onClick={handleExportExcel}
            disabled={!farmers || farmers.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 h-10"
          >
            <Download className="h-4 w-4" />
            Excel Export
          </Button>
          <Button 
            onClick={handleExportPDF}
            disabled={!farmers || farmers.length === 0}
            variant="default" 
            className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 h-10"
          >
            <Download className="h-4 w-4" />
            PDF Export
          </Button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <Table className="whitespace-nowrap text-sm [&_th]:h-auto [&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3 [&_th]:align-middle">
          <TableHeader className="bg-gray-200">
            <TableRow>
              <TableHead className="border border-gray-300">Farmer ID</TableHead>
              <TableHead className="border border-gray-300">Name</TableHead>
              <TableHead className="border border-gray-300">Contact</TableHead>
              <TableHead className="border border-gray-300">Milk Type</TableHead>
              <TableHead className="border border-gray-300">Rate Chart</TableHead>
              <TableHead className="border border-gray-300">Bank Name</TableHead>
              <TableHead className="border border-gray-300">Account Number</TableHead>
              <TableHead className="border border-gray-300">IFSC Code</TableHead>
              <TableHead className="border border-gray-300 text-center">Passbook</TableHead>
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
                  <TableCell className="border border-gray-300">{farmer.bankName || '-'}</TableCell>
                  <TableCell className="border border-gray-300">{farmer.accountNumber || '-'}</TableCell>
                  <TableCell className="border border-gray-300">{farmer.ifscCode || '-'}</TableCell>
                  <TableCell className="border border-gray-300 text-center">
                    {farmer.bankPassbookPhoto ? (
                      <a
                        href={farmer.bankPassbookPhoto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        View
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-gray-500">
                  {loading ? "Loading..." : "Select VLC and click Show to view farmers"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {farmers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalItems={farmers.length}
        />
      )}
    </div>
  );
};

export default FarmerList;
