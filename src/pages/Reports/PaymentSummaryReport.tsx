import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, Filter, Search,ChevronLeft,
  ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PaymentSummaryReport = () => {
  const [startDate, setStartDate] = useState<Date>(new Date(2024, 0, 1));
  const [endDate, setEndDate] = useState<Date>(new Date(2024, 0, 10));
  const [searchTerm, setSearchTerm] = useState("");
  const [vlcName, setVlcName] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
    // const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sample farmer data matching the wireframe
  const farmersData = [
    {
      name: "John Smith",
      billAmount: 2500.0,
      dateRange: "2024-01-01 - 2024-01-10",
      advance: 500.0,
      advanceDeduction: -250.0,
      cattleFeedAmount: 800.0,
      cattleFeedDeduction: -400.0,
      otherAmount: 300.0,
      otherDeduction: -150.0,
      finalAmount: 1700.0,
    },
    {
      name: "Emma Wilson",
      billAmount: 3200.0,
      dateRange: "2024-01-01 - 2024-01-10",
      advance: 600.0,
      advanceDeduction: -300.0,
      cattleFeedAmount: 900.0,
      cattleFeedDeduction: -450.0,
      otherAmount: 200.0,
      otherDeduction: -100.0,
      finalAmount: 2350.0,
    },
    {
      name: "Michael Brown",
      billAmount: 2800.0,
      dateRange: "2024-01-01 - 2024-01-10",
      advance: 400.0,
      advanceDeduction: -200.0,
      cattleFeedAmount: 700.0,
      cattleFeedDeduction: -350.0,
      otherAmount: 250.0,
      otherDeduction: -125.0,
      finalAmount: 2125.0,
    },
    {
      name: "Sarah Davis",
      billAmount: 3500.0,
      dateRange: "2024-01-01 - 2024-01-10",
      advance: 700.0,
      advanceDeduction: -350.0,
      cattleFeedAmount: 1000.0,
      cattleFeedDeduction: -500.0,
      otherAmount: 400.0,
      otherDeduction: -200.0,
      finalAmount: 2450.0,
    },
    {
      name: "Robert Johnson",
      billAmount: 2900.0,
      dateRange: "2024-01-01 - 2024-01-10",
      advance: 550.0,
      advanceDeduction: -275.0,
      cattleFeedAmount: 850.0,
      cattleFeedDeduction: -425.0,
      otherAmount: 350.0,
      otherDeduction: -175.0,
      finalAmount: 2025.0,
    },
  ];

  const totalBillAmount = 14400.0;
  const totalDeductions = 3062.0;
  const totalFinalAmount = 11338.0;
  const remainingBalance = 3000.0;

  const totalPages = Math.ceil(50 / 10); 
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-foreground">
            Farmer Bill Summary
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute text-gray-400 left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search farmers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64 border-gray-100"
              />
            </div>
            <Button variant="outline" className="gap-2 border-gray-100">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>
        <hr className="text-gray-300" />
        {/* Filters Row */}
        <div className="flex items-center gap-20 p-4 mt-4">
          <label className="text-sm font-medium">VLC Name</label>
          <Select value={vlcName} onValueChange={setVlcName}>
            <SelectTrigger className="w-32 border-gray-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="VLC1">VLC 1</SelectItem>
              <SelectItem value="VLC2">VLC 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4 bg-card p-4 bg-gray-100">
          {/* Date Range Pickers */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 " />
            <div className="space-y-2 text-left ">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[150px] bg-white justify-between font-normal border-gray-200 "
                    )}
                  >
                    {format(startDate, "yyyy-MM-dd")}
                    <CalendarIcon className="mr-2 h-4 w-4 " />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto bg-white"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <span className="text-muted-foreground">-</span>

            <div className="space-y-2 text-left ">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[150px] bg-white justify-between font-normal border-gray-200 "
                    )}
                  >
                    {format(endDate, "yyyy-MM-dd")}
                    <CalendarIcon className="mr-2 h-4 w-4 " />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto bg-white"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button className="bg-blue-600 hover:bg-blue-700 text-white ml-35">
              Generate Report
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-4 p-4">
          {/* Summary Cards */}
          <div className="flex justify-start gap-2 col-span-3">
            <div className="bg-card p-4 rounded-lg shadow-sm w-60 h-25 text-left">
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Bill Amount
              </h3>
              <p className="text-2xl font-bold text-blue-900">
                ₹{totalBillAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm w-60 h-25 text-left">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Total Deductions
              </h3>
              <p className="text-2xl font-bold text-blue-900">
                ₹{totalDeductions.toFixed(2)}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm w-60 h-25 text-left">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Total Final Amount
              </h3>
              <p className="text-2xl font-bold text-blue-900">
                ₹{totalFinalAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm w-60 h-25 text-left">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Remaining Balance
              </h3>
              <p className="text-2xl font-bold text-blue-900">
                ₹{remainingBalance.toFixed(2)}
              </p>
            </div>
          </div>
          {/* Export Buttons */}
          <div className="text-right mt-6">
            <div className="flex justify-end gap-3">
                <Button
              variant="outline"
              className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
            >
              Excel Export
            </Button>
            <Button
              variant="outline"
              className="bg-red-600 text-white border-red-600 hover:bg-red-700"
            >
              PDF Export
            </Button>
            </div>
            <Button
              variant="outline"
              className="w-[200px] bg-green-400 text-white border-green-400 hover:bg-green-700 mt-1 mr-2"
            >
              Excel Bank Export
            </Button>
          </div>
          </div>
        {/* Data Table */}
        <div className="bg-card rounded-lg border border-gray-200 shadow-sm overflow-hidden m-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 border border-gray-200">
                <TableHead className="font-semibold border border-gray-50">Farmer Name</TableHead>
                <TableHead className="font-semibold">Bill Amount</TableHead>
                <TableHead className="font-semibold">Date Range</TableHead>
                <TableHead className="font-semibold">Advance</TableHead>
                <TableHead className="font-semibold">
                  Advance Deduction
                </TableHead>
                <TableHead className="font-semibold">
                  Cattle Feed Amount
                </TableHead>
                <TableHead className="font-semibold">
                  Cattle Feed Deduction
                </TableHead>
                <TableHead className="font-semibold">Other Amount</TableHead>
                <TableHead className="font-semibold">Other Deduction</TableHead>
                <TableHead className="font-semibold">Final Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farmersData.map((farmer, index) => (
                <TableRow
                  key={index}
                  className="hover:bg-gray-100 transition-colors "
                >
                  <TableCell className="font-medium border border-gray-50">{farmer.name}</TableCell>
                  <TableCell className="font-semibold border border-gray-50">
                    ${farmer.billAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground border border-gray-50">
                    {farmer.dateRange}
                  </TableCell>
                  <TableCell className="border border-gray-50">
                    ${farmer.advance.toFixed(2)}
                  </TableCell>
                  <TableCell className="border border-gray-50">
                    {farmer.advanceDeduction.toFixed(2)}
                  </TableCell>
                  <TableCell className="border border-gray-50">
                    ${farmer.cattleFeedAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="border border-gray-50">
                    {farmer.cattleFeedDeduction.toFixed(2)}
                  </TableCell>
                  <TableCell className="border border-gray-50">
                    ${farmer.otherAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="border border-gray-50">
                    {farmer.otherDeduction.toFixed(2)}
                  </TableCell>
                  <TableCell className="border border-gray-50 font-bold">
                    ${farmer.finalAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer with Pagination */}
        <div className="flex items-center justify-between bg-card p-4">
          <div className="text-sm text-muted-foreground">Total Farmers: 5</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Select defaultValue="10">
                <SelectTrigger className="w-30 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
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

            {[1, 2, 3].map((page) => (
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
            ))}

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryReport;
