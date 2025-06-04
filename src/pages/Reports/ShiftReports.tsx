import React, { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import SwapVertIcon from '@mui/icons-material/SwapVert';

const ShiftReports = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sample data
  const farmerData = [
    {
      id: "001",
      quantity: 1250.5,
      fat: 3.8,
      snf: 8.5,
      clr: 29.5,
      rate: 45.75,
      total: 57210.38,
    },
    {
      id: "002",
      quantity: 1120.3,
      fat: 3.9,
      snf: 8.6,
      clr: 29.6,
      rate: 46.25,
      total: 51813.88,
    },
    {
      id: "003",
      quantity: 1180.7,
      fat: 3.7,
      snf: 8.4,
      clr: 29.4,
      rate: 45.5,
      total: 53721.85,
    },
    {
      id: "004",
      quantity: 1090.2,
      fat: 3.8,
      snf: 8.5,
      clr: 29.5,
      rate: 45.75,
      total: 49876.65,
    },
    {
      id: "005",
      quantity: 1310.8,
      fat: 3.9,
      snf: 8.6,
      clr: 29.6,
      rate: 46.25,
      total: 60619.5,
    },
  ];

  const summaryStats = {
    totalQuantity: 5000,
    averageFat: 20,
    averageSNF: 25,
    averageCLR: 100,
    averageRate: 45.75,
    totalAmount: 50000.0,
  };
   const totals = {
    quantity: 5000,
    avgFat: 20,
    avgSnf: 25,
    avgClr: 100,
    avgRate: 45.75,
    totalAmount: "50,00,000"
  };

  const totalPages = Math.ceil(50 / itemsPerPage); // Assuming 50 total items
  const [formData, setFormData] = useState({
    vlc: "",
    fatRate: "",
    snfRate: "",
    effectiveDate: undefined as Date | undefined,
  });

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
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-slate-600"
          >
            <User className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Filters Section */}
        <Card className="border-none text-left">
          <CardContent className="p-6">
            <div className="w-[85%] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <div className="space-y-2 w-full">
                <label className="text-sm font-medium text-gray-700">
                  VLC Name
                </label>
                <Select>
                  <SelectTrigger className=" w-full bg-white border-gray-200">
                    <SelectValue placeholder="Select VLC" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="vlc1">VLC 001</SelectItem>
                    <SelectItem value="vlc2">VLC 002</SelectItem>
                    <SelectItem value="vlc3">VLC 003</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Milk Type
                </label>
                <Select>
                  <SelectTrigger className=" w-full bg-white border-gray-200">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="cow">Cow Milk</SelectItem>
                    <SelectItem value="buffalo">Buffalo Milk</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
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
                      {formData.effectiveDate
                        ? format(formData.effectiveDate, "yyyy/MM/dd")
                        : "yyyy / mm / dd"}
                      <CalendarIcon className="mr-2 h-4 w-4 " />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.effectiveDate}
                      onSelect={(date) =>
                        setFormData({ ...formData, effectiveDate: date })
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
                <Select>
                  <SelectTrigger className="w-full bg-white border-gray-200">
                    <SelectValue placeholder="Select Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end mt-6 mr-5">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Generate Report
                </Button>
              </div>  
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="border-none text-center"> 
          <CardContent className="p-0">
            <div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 ">
                    <TableHead className="font-semibold text-center">Farmer ID<SwapVertIcon/></TableHead>
                    <TableHead className="font-semibold text-center">Quantity<SwapVertIcon/></TableHead>
                    <TableHead className="font-semibold text-center">Fat<SwapVertIcon/></TableHead>
                    <TableHead className="font-semibold text-center">SNF<SwapVertIcon/></TableHead>
                    <TableHead className="font-semibold text-center">CLR<SwapVertIcon/></TableHead>
                    <TableHead className="font-semibold text-center">Rate<SwapVertIcon/></TableHead>
                    <TableHead className="font-semibold text-center">
                      Total Amount<SwapVertIcon/>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmerData.map((farmer) => (
                    <TableRow key={farmer.id} className="hover:bg-gray-50 bg-white border-gray-100 ">
                      <TableCell className="font-medium">{farmer.id}</TableCell>
                      <TableCell >{farmer.quantity}</TableCell>
                      <TableCell>{farmer.fat}</TableCell>
                      <TableCell>{farmer.snf}</TableCell>
                      <TableCell>{farmer.clr}</TableCell>
                      <TableCell>{farmer.rate}</TableCell>
                      <TableCell >
                        {farmer.total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

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

            {[1, 2, 3].map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "outline" : "default"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  currentPage === page && "bg-blue-600 hover:bg-blue-700 border-none"
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

          <span className="text-sm text-gray-600">
            Showing 1-10 of 50 items
          </span>
        </div>

        {/* Summary Statistics */}
        <div className="rounded-lg bg-white">
            <Table>
              <TableHeader className="bg-gray-200">
                <TableRow>
                  <TableHead className="text-center font-semibold">Total Quantity<SwapVertIcon/></TableHead>
                  <TableHead className="text-center font-semibold">Average Fat<SwapVertIcon/></TableHead>
                  <TableHead className="text-center font-semibold">Average SNF<SwapVertIcon/></TableHead>
                  <TableHead className="text-center font-semibold">Average CLR<SwapVertIcon/></TableHead>
                  <TableHead className="text-center font-semibold">Average Rate<SwapVertIcon/></TableHead>
                  <TableHead className="text-center font-semibold">Total Amount<SwapVertIcon/></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-gray-200">
                  <TableCell>{totals.quantity}</TableCell>
                  <TableCell>{totals.avgFat}</TableCell>
                  <TableCell>{totals.avgSnf}</TableCell>
                  <TableCell>{totals.avgClr}</TableCell>
                  <TableCell>{totals.avgRate}</TableCell>
                  <TableCell>{totals.totalAmount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

        {/* Export Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="outline" className="flex items-center gap-2 text-white bg-blue-500">
            <Download className="h-4 w-4" />
            Excel Export
          </Button>
          <Button variant="outline" className="flex items-center gap-2 bg-red-500 text-white">
            <Download className="h-4 w-4" />
            PDF Export
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShiftReports;
