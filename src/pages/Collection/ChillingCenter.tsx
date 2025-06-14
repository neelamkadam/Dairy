import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  CalendarIcon,
  FileSpreadsheet,
  Search,
  Users,
  TrendingUp,
  DollarSign,
  EllipsisVertical,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VLCCData {
  id: string;
  name: string;
  totalMilkLtr: number;
  totalMilkKg: number;
  milkType: string;
  status: "Active" | "Inactive";
}

const ChillingCenter = () => {
  const [toDate, setToDate] = useState<Date>();
  const [fromDate, setFromDate] = useState<Date>();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(50 / itemsPerPage);

  const vlccData: VLCCData[] = [
    {
      id: "F001",
      name: "John Smith",
      totalMilkLtr: 51,
      totalMilkKg: 50,
      milkType: "Cow",
      status: "Active",
    },
    {
      id: "F002",
      name: "Mary Johnson",
      totalMilkLtr: 21,
      totalMilkKg: 20,
      milkType: "Cow",
      status: "Inactive",
    },
    {
      id: "F003",
      name: "Robert Wilson",
      totalMilkLtr: 30,
      totalMilkKg: 30,
      milkType: "Cow",
      status: "Active",
    },
  ];

  const stats = [
    { label: "Total Farmers", value: "42", icon: Users, color: "bg-blue-500" },
    {
      label: "Active Farmers",
      value: "38",
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      label: "New This Month",
      value: "5",
      icon: Users,
      color: "bg-orange-500",
    },
  ];

  const centerStats = [
    {
      label: "VLCC Center",
      value: "10",
      change: "+12%",
      icon: Users,
      color: "bg-orange-400",
    },
    {
      label: "Total Milk Collection",
      value: "2,450L",
      change: "+5%",
      icon: TrendingUp,
      color: "bg-orange-400",
    },
    {
      label: "Average Fat %",
      value: "3.5",
      change: "+8%",
      icon: TrendingUp,
      color: "bg-orange-400",
    },
    {
      label: "Average SNF %",
      value: "8.5",
      change: "+8%",
      icon: TrendingUp,
      color: "bg-orange-400",
    },
    {
      label: "Total Payments",
      value: "$12,450",
      change: "+15%",
      icon: DollarSign,
      color: "bg-orange-400",
    },
  ];
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-lg p-3 font-semibold text-gray-800 text-center bg-white">
        Center Selection
      </div>
      <div className="text-lg font-semibold text-left text-gray-700 m-5">
        Chilling Center
      </div>

      {/* Center Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 m-5">
        {centerStats.map((stat, index) => (
          <Card
            key={index}
            className={cn(
              "hover:shadow-lg transition-all duration-300 border-0",
              stat.color
            )}
          >
            <CardContent className="p-4">
              <div className="grid grid-cols-2 items-center text-left gap-2">
                {/* Label */}
                <p className="text-sm font-medium text-gray-800 opacity-90">
                  {stat.label}
                </p>
                {/* Icon */}
                <stat.icon className="h-6 w-6 text-blue-600 opacity-80 justify-self-end" />
                {/* Value */}
                <p className="text-2xl font-bold  mt-4">
                  {stat.value}
                </p>
                {/* Change */}
                <p className="text-sm text-green-700 opacity-75 mt-2">
                  {stat.change}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm text-left w-[85%] m-auto">
        <CardHeader>
          <CardTitle className="text-lg">User Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:w-[85%]">
            <div className="space-y-2 ">
              <label className="text-sm font-medium text-gray-700">
                VLC Name
              </label>
              <Select defaultValue="all">
                <SelectTrigger className="w-full border-gray-200">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="vlcc1">VLCC 1</SelectItem>
                  <SelectItem value="vlcc2">VLCC 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Milk Type
              </label>
              <Select defaultValue="cow">
                <SelectTrigger className="w-full border-gray-200">
                  <SelectValue placeholder="Cow" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="cow">Cow</SelectItem>
                  <SelectItem value="buffalo">Buffalo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Shift</label>
              <Select defaultValue="morning">
                <SelectTrigger className="w-full border-gray-200">
                  <SelectValue placeholder="Morning" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                From Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left font-normal border-gray-200"
                  >
                    {fromDate ? format(fromDate, "dd-MM-yyyy") : "21-04-2025"}
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                To Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left font-normal border-gray-200"
                  >
                    {toDate ? format(toDate, "dd-MM-yyyy") : "21-04-2025"}
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            Submit
          </Button>
        </CardContent>
      </Card>

      {/* CC List */}
      <div className="border-0 shadow-lg bg-white/90 backdrop-blur-sm w-[85%] m-auto mt-2 mb-5">
        <div className="flex flex-wrap justify-between items-center gap-4 p-4">
          {/* Heading */}
          <h1 className="text-lg sm:text-xl">CC List</h1>

          {/* Search and Button */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search Input */}
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search farmers..."
                className="pl-10 w-full sm:w-64 border-gray-200"
              />
            </div>

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 flex items-center gap-2 w-full sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Excel</span>
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-100 border border-gray-200">
                <TableHead className="text-gray-600 border border-gray-50 px-4">
                  VLCC ID
                </TableHead>
                <TableHead className="text-gray-600 px-4">VLCC Name</TableHead>
                <TableHead className="text-gray-600 px-4">
                  Total Milk (Ltr)
                </TableHead>
                <TableHead className="text-gray-600 px-4">
                  Total Milk (Kg)
                </TableHead>
                <TableHead className="text-gray-600 px-4">Milk Type</TableHead>
                <TableHead className="text-gray-600 px-4">Status</TableHead>
                <TableHead className="text-gray-600 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vlccData.map((vlcc, index) => (
                <TableRow
                  key={index}
                  className="hover:bg-gray-100 transition-colors text-left"
                >
                  <TableCell className="font-medium border border-gray-50 px-4">
                    {vlcc.id}
                  </TableCell>
                  <TableCell className="border border-gray-50 px-4">
                    {vlcc.name}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground border border-gray-50">
                    {vlcc.totalMilkLtr} Ltr
                  </TableCell>
                  <TableCell className="border border-gray-50 px-4">
                    {vlcc.totalMilkKg} Kg
                  </TableCell>
                  <TableCell className="border border-gray-50 px-4">
                    {vlcc.milkType}
                  </TableCell>
                  <TableCell className="border border-gray-50 px-4">
                    <Badge
                      variant={
                        vlcc.status === "Active" ? "default" : "secondary"
                      }
                      className={
                        vlcc.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {vlcc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="border border-gray-50 px-4">
                    <EllipsisVertical
                      className="text-gray-500 cursor-pointer"
                      size={15}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer with Pagination */}
        <div className="flex flex-wrap items-center justify-between bg-card p-4">
          <div className="text-sm text-muted-foreground">
            Showing 1 to 3 of 42 entries
          </div>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
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
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChillingCenter;
