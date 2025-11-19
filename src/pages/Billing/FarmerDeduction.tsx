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
import { format } from "date-fns";
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
  const [vlcName, setVlcName] = useState("All");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(2024, 0, 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(2024, 0, 10)
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [farmerData, setFarmerData] = useState<any[]>([
    {
      name: "John Smith",
      billAmount: "$2500.00",
      dateRange: "2024-01-01 - 2024-01-10",
      advance: "$500.00",
      advanceDeduction: "-$250.00",
      cattleFeedAmount: "$800.00",
      cattleFeedDeduction: "-$400.00",
      otherAmount: "$300.00",
      otherDeduction: "-$150.00",
      finalAmount: "$1700.00",
    },
  ]);

  useEffect(() => {
    if (startDate && endDate && vlcName !== "All") {
      fetchDeductions();
    }
  }, [startDate, endDate, vlcName]);

  const fetchDeductions = async () => {
    try {
      const { data } = await deductionApi.getDeductionSummary({
        dairy_id: vlcName,
        date_from: format(startDate!, "yyyy-MM-dd"),
        date_to: format(endDate!, "yyyy-MM-dd"),
      });
      setFarmerData(data.deductions || []);
    } catch (error) {
      toast.error("Failed to fetch deductions");
    }
  };

  const oldFarmerData = [
    {
      name: "John Smith",
      billAmount: "$2500.00",
      dateRange: "2024-01-01 - 2024-01-10",
      advance: "$500.00",
      advanceDeduction: "-$250.00",
      cattleFeedAmount: "$800.00",
      cattleFeedDeduction: "-$400.00",
      otherAmount: "$300.00",
      otherDeduction: "-$150.00",
      finalAmount: "$1700.00",
    },
    {
      name: "Emma Wilson",
      billAmount: "$3200.00",
      dateRange: "2024-01-01 - 2024-01-10",
      advance: "$600.00",
      advanceDeduction: "-$300.00",
      cattleFeedAmount: "$900.00",
      cattleFeedDeduction: "-$450.00",
      otherAmount: "$200.00",
      otherDeduction: "-$100.00",
      finalAmount: "$2350.00",
    },
    {
      name: "Michael Brown",
      billAmount: "$2800.00",
      dateRange: "2024-01-01 - 2024-01-10",
      advance: "$400.00",
      advanceDeduction: "-$200.00",
      cattleFeedAmount: "$700.00",
      cattleFeedDeduction: "-$350.00",
      otherAmount: "$250.00",
      otherDeduction: "-$125.00",
      finalAmount: "$2125.00",
    },
    {
      name: "Sarah Davis",
      billAmount: "$3500.00",
      dateRange: "2024-01-01 - 2024-01-10",
      advance: "$700.00",
      advanceDeduction: "-$350.00",
      cattleFeedAmount: "$1000.00",
      cattleFeedDeduction: "-$500.00",
      otherAmount: "$400.00",
      otherDeduction: "-$200.00",
      finalAmount: "$2450.00",
    },
    {
      name: "Robert Johnson",
      billAmount: "$2900.00",
      dateRange: "2024-01-01 - 2024-01-10",
      advance: "$550.00",
      advanceDeduction: "-$275.00",
      cattleFeedAmount: "$850.00",
      cattleFeedDeduction: "-$425.00",
      otherAmount: "$350.00",
      otherDeduction: "-$175.00",
      finalAmount: "$2025.00",
    },
  ];

  const filteredData = farmerData.filter((farmer) =>
    farmer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              VLC Name
            </label>
            <Select value={vlcName} onValueChange={setVlcName}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
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
                    {startDate ? format(startDate, "yyyy-MM-dd") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
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
                    {endDate ? format(endDate, "yyyy-MM-dd") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
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
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards className="p-4 w-[75%]"/>

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
                    Date Range
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
                    Other Amount
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Other Deduction
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Final Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((farmer, index) => (
                  <TableRow
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <TableCell className="font-medium text-gray-900">
                      {farmer.name}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {farmer.billAmount}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {farmer.dateRange}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {farmer.advance}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {farmer.advanceDeduction}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {farmer.cattleFeedAmount}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {farmer.cattleFeedDeduction}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {farmer.otherAmount}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {farmer.otherDeduction}
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {farmer.finalAmount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          {/* </div> */}
        </Card>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalItems={5}
        />
      </div>
    </div>
  );
};

export default FarmerDeduction;
