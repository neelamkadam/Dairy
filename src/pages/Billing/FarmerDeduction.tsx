import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, Search, CalendarIcon } from "lucide-react";
import { format, getDaysInMonth } from "date-fns";
import { cn } from "@/lib/utils";
import SummaryCards from "@/components/SummaryCards";
import Pagination from "@/components/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { deductionApi } from "@/services/deductionApi";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";

const FarmerDeduction = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [searchTerm, setSearchTerm] = useState("");
  const [vlcName, setVlcName] = useState("");
  
  const getCurrentPeriod = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    let startDay, endDay;
    
    if (day <= 10) {
      startDay = 1;
      endDay = 10;
    } else if (day <= 20) {
      startDay = 11;
      endDay = 20;
    } else {
      startDay = 21;
      endDay = getDaysInMonth(today);
    }
    
    return {
      start: new Date(year, month, startDay),
      end: new Date(year, month, endDay)
    };
  };
  
  const currentPeriod = getCurrentPeriod();
  const [startDate, setStartDate] = useState<Date | undefined>(currentPeriod.start);
  const [endDate, setEndDate] = useState<Date | undefined>(currentPeriod.end);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [farmerData, setFarmerData] = useState<any[]>([]);
  const [editingFarmerId, setEditingFarmerId] = useState<string | null>(null);
  const [originalValues, setOriginalValues] = useState<any>(null);

  useEffect(() => {
    if (startDate && endDate && vlcName) {
      fetchDeductions();
    }
  }, []);

  const fetchDeductions = async () => {
    if (!startDate || !endDate || !vlcName) {
      toast.error("Please select VLC and date range");
      return;
    }

    try {
      const { data } = await deductionApi.getAllFarmersBalance(
        parseInt(vlcName),
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );

      console.log('API Response:', data);

      // Flatten farmers from all dates and aggregate by farmer_id
      const farmerMap = new Map();
      
      (data.data || []).forEach((dateEntry: any) => {
        dateEntry.farmers.forEach((farmer: any) => {
          const farmerId = farmer.farmer_id;
          
          if (farmerMap.has(farmerId)) {
            const existing = farmerMap.get(farmerId);
            existing.billAmount += farmer.milk_total || 0;
            existing.advance += farmer.deductions?.advance || 0;
            existing.cattleFeedAmount += farmer.deductions?.cattle_feed || 0;
            existing.other1Amount += farmer.deductions?.other1 || 0;
            existing.other2Amount += farmer.deductions?.other2 || 0;
            existing.receivedAmount += farmer.total_received || 0;
            existing.finalAmount += farmer.net_payable || 0;
          } else {
            farmerMap.set(farmerId, {
              farmer_id: farmerId,
              name: `${farmerId} - ${farmer.farmer_name || `Farmer ${farmerId}`}`,
              billAmount: farmer.milk_total || 0,
              dateRange: `${format(startDate, "dd-MM-yyyy")} - ${format(endDate, "dd-MM-yyyy")}`,
              advance: farmer.deductions?.advance || 0,
              advanceDeduction: farmer.deductions?.advance || 0,
              cattleFeedAmount: farmer.deductions?.cattle_feed || 0,
              cattleFeedDeduction: farmer.deductions?.cattle_feed || 0,
              other1Amount: farmer.deductions?.other1 || 0,
              other1Deduction: farmer.deductions?.other1 || 0,
              other2Amount: farmer.deductions?.other2 || 0,
              other2Deduction: farmer.deductions?.other2 || 0,
              receivedAmount: farmer.total_received || 0,
              finalAmount: farmer.net_payable || 0,
              previousRemaining: 0,
            });
          }
        });
      });
      
      const processedData = Array.from(farmerMap.values());

      setFarmerData(processedData);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch deductions");
    }
  };



  const handleDeductionChange = (farmerId: string, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    // Start editing mode if not already editing this farmer
    if (editingFarmerId !== farmerId) {
      const farmer = farmerData.find(f => f.farmer_id === farmerId);
      setOriginalValues(farmer);
      setEditingFarmerId(farmerId);
    }
    
    setFarmerData(prev => prev.map(farmer => 
      farmer.farmer_id === farmerId 
        ? { ...farmer, [field]: numValue }
        : farmer
    ));
  };

  const handleSaveFarmer = async (farmerId: string) => {
    try {
      const farmer = farmerData.find(f => f.farmer_id === farmerId);
      if (!farmer || !startDate || !endDate) return;

      const billData = {
        farmer_id: farmerId,
        dairy_id: parseInt(vlcName),
        date: format(new Date(), "yyyy-MM-dd"),
        period_start: format(startDate, "yyyy-MM-dd"),
        period_end: format(endDate, "yyyy-MM-dd"),
        milk_total: farmer.billAmount,
        advance_total: farmer.advanceDeduction,
        cattlefeed_total: farmer.cattleFeedDeduction,
        other1_total: farmer.other1Deduction,
        other2_total: farmer.other2Deduction,
        received_total: farmer.receivedAmount,
        net_payable: farmer.billAmount - (farmer.advanceDeduction + farmer.cattleFeedDeduction + farmer.other1Deduction + farmer.other2Deduction),
        advance_remaining: 0,
        cattlefeed_remaining: 0,
        other1_remaining: 0,
        other2_remaining: 0
      };

      // Generate bill for single farmer
      await deductionApi.updateFarmerBill(billData);
      toast.success(`Bill generated for ${farmer.name}`);
      
      setEditingFarmerId(null);
      setOriginalValues(null);
      
      // Refresh data
      fetchDeductions();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to generate bill");
    }
  };

  const handleCancelEdit = (farmerId: string) => {
    if (originalValues) {
      setFarmerData(prev => prev.map(farmer => 
        farmer.farmer_id === farmerId ? originalValues : farmer
      ));
    }
    setEditingFarmerId(null);
    setOriginalValues(null);
  };

  const handleSave = async () => {
    try {
      const updatePayload = farmerData.map(farmer => ({
        farmer_id: farmer.farmer_id,
        advance_deduction: farmer.advanceDeduction,
        cattle_feed_deduction: farmer.cattleFeedDeduction,
        other1_deduction: farmer.other1Deduction,
        other2_deduction: farmer.other2Deduction,
      }));
      
      await deductionApi.updateFarmerBill(updatePayload);
      toast.success("Deductions updated successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update deductions");
    }
  };

  const filteredData = farmerData.filter((farmer) =>
    farmer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between bg-white p-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Farmer Deduction
            </h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search farmers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
          {/* Filters */}
          <hr className="text-gray-300 "/>
          <div className="flex items-center gap-2 mb-4 p-4 bg-white mt-0">
            <label className="text-sm font-medium text-gray-700">
              Select VLC
            </label>
            <Select value={vlcName} onValueChange={setVlcName}>
              <SelectTrigger className="w-32 bg-white border-gray-300">
                <SelectValue placeholder="Select VLC" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-300 shadow-lg">
                {branches.map((branch) => (
                  <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                    {branch.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-start gap-125 mb-5 pl-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-36 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd-MM-yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto bg-white")}
                  />
                </PopoverContent>
              </Popover>

              <span className="text-gray-500 ">-</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-36 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd-MM-yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto bg-white")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              onClick={fetchDeductions}
              className="bg-red-600 hover:bg-red-700 text-white px-15 "
            >
              Fetch Data
            </Button>
            
            {farmerData.length > 0 && (
              <Button 
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white px-15 ml-4"
              >
                Save Changes
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards 
          className="p-4 w-[75%]"
          data={{
            totalBillAmount: farmerData.reduce((sum, farmer) => sum + farmer.billAmount, 0),
            totalDeductions: farmerData.reduce((sum, farmer) => sum + farmer.advance + farmer.cattleFeedAmount + farmer.other1Amount + farmer.other2Amount, 0),
            totalFinalAmount: farmerData.reduce((sum, farmer) => sum + farmer.finalAmount, 0),
            remainingBalance: farmerData.reduce((sum, farmer) => sum + farmer.previousRemaining, 0)
          }}
        />

        {/* Farmer Table */}
        <Card className="bg-white shadow-sm border border-gray-200 mb-6 mt-0 pl-4 pr-4">
          {/* <div className="overflow-x-auto"> */}
            <Table className="">
              <TableHeader className="bg-gray-200">
                <TableRow className="border-b border-gray-200">
                  <TableHead className="font-semibold text-gray-700">
                    Farmer Name
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Bill Amount
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Advance
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Advance Deduction
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Cattle Feed Amount
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Cattle Feed Deduction
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Other1 Amount
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Other1 Deduction
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Other2 Amount
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Other2 Deduction
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Received
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Final Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((farmer, index) => (
                  <TableRow
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <TableCell className="font-medium text-gray-900">
                      {farmer.name}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      ₹{farmer.billAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      ₹{farmer.advance.toFixed(2)}
                    </TableCell>
                    <TableCell className="relative">
                      <Input
                        type="number"
                        value={farmer.advanceDeduction}
                        onChange={(e) => handleDeductionChange(farmer.farmer_id, 'advanceDeduction', e.target.value)}
                        className="w-20 h-8 text-red-600"
                      />
                      {editingFarmerId === farmer.farmer_id && (
                        <div className="absolute top-0 right-0 flex gap-1 bg-white shadow-lg rounded p-1 z-10">
                          <Button
                            size="sm"
                            onClick={() => handleSaveFarmer(farmer.farmer_id)}
                            className="bg-green-600 hover:bg-green-700 text-white h-6 px-2 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelEdit(farmer.farmer_id)}
                            className="h-6 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      ₹{farmer.cattleFeedAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={farmer.cattleFeedDeduction}
                        onChange={(e) => handleDeductionChange(farmer.farmer_id, 'cattleFeedDeduction', e.target.value)}
                        className="w-20 h-8 text-red-600"
                      />
                    </TableCell>
                    <TableCell className="text-gray-700">
                      ₹{farmer.other1Amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={farmer.other1Deduction}
                        onChange={(e) => handleDeductionChange(farmer.farmer_id, 'other1Deduction', e.target.value)}
                        className="w-20 h-8 text-red-600"
                      />
                    </TableCell>
                    <TableCell className="text-gray-700">
                      ₹{farmer.other2Amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={farmer.other2Deduction}
                        onChange={(e) => handleDeductionChange(farmer.farmer_id, 'other2Deduction', e.target.value)}
                        className="w-20 h-8 text-red-600"
                      />
                    </TableCell>
                    <TableCell className="text-green-600">
                      ₹{farmer.receivedAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      ₹{farmer.finalAmount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          {/* </div> */}
        </Card>

        {/* Pagination */}
        {filteredData.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            totalItems={filteredData.length}
          />
        )}
      </div>
    </div>
  );
};

export default FarmerDeduction;
