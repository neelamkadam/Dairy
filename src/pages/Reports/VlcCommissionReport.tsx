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
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

const VlcCommissionReport = () => {
  const [currentPage, setCurrentPage] = useState(1);
  // const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(50 / 10);

  const vlccCommissionData = [
    {
      userId: "RV001",
      date: "01-04-2025",
      shift: "Morning",
      totalLiters: "33,320",
      commissionPerLiter: "1.00",
      tsDeduction: "-320.00",
      totalAmount: "33,320.00",
    },
     {
      userId: "RV002",
      date: "01-04-2025",
      shift: "Morning",
      totalLiters: "33,320",
      commissionPerLiter: "1.00",
      tsDeduction: "-320.00",
      totalAmount: "33,320.00",
    },
    {
      userId: "RV003",
      date: "01-04-2025",
      shift: "Morning",
      totalLiters: "33,320",
      commissionPerLiter: "1.00",
      tsDeduction: "-320.00",
      totalAmount: "33,320.00",
    },
  ];

  const [formData, setFormData] = useState({
    vlc: "",
    fatRate: "",
    snfRate: "",
    effectiveDate: undefined as Date | undefined,
  });
  return (
    <div className="bg-white w-full h-screen">
      <h1 className="text-lg font-bold p-5">VLCC Commission Report</h1>
      <hr className="text-gray-300"/>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-15 p-6 rounded-lg">
        <div>
          <Label className="mb-1">VLCC Name</Label>
          <Select defaultValue="select">
            <SelectTrigger className="w-full border-gray-200">
              <SelectValue placeholder="Select VLCC" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="select">All</SelectItem>
              <SelectItem value="vlcc1">Green valley</SelectItem>
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
                  !formData.effectiveDate && "text-muted-foreground"
                )}
              >
                {formData.effectiveDate
                  ? format(formData.effectiveDate, "dd-mm-yyy")
                  : "01-04-2025"}
                <CalendarIcon className="mr-1 h-4 w-4 text-gray-400" />
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
        <div className="space-y-2 text-left ">
          <Label>To Date</Label>
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
                  ? format(formData.effectiveDate, "dd-mm-yyy")
                  : "01-04-2025"}
                <CalendarIcon className="mr-1 h-4 w-4 text-gray-400" />
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
        <Button className="text-white bg-blue-600 w-[90px] mt-4.5">Show</Button>
      </div>
      <div className="overflow-x-auto p-6">
              <Table className="border border-gray-200 rounded-3xl">
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="border border-gray-50 text-gray-700">VLCC USER ID</TableHead>
                    <TableHead className="border border-gray-50 text-gray-700">DATE</TableHead>
                    <TableHead className="border border-gray-50 text-gray-700">SHIFT</TableHead>
                    <TableHead className="border border-gray-50 text-gray-700">TOTAL LITERS</TableHead>
                    <TableHead className="border border-gray-50 text-gray-700">COMMISSION PER LITERS</TableHead>
                    <TableHead className="border border-gray-50 text-gray-700">TS DEDUCTION</TableHead>
                    <TableHead className="border border-gray-50 text-gray-700">TOTAL AMOUNT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vlccCommissionData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-left border border-gray-50">
                        {row.userId}
                      </TableCell>
                      <TableCell className="font-medium text-left border border-gray-50">
                        {row.date}
                      </TableCell>
                      <TableCell className="font-medium text-left border border-gray-50">
                        {row.shift}
                      </TableCell>
                      <TableCell className="font-medium text-left border border-gray-50">
                        {row.totalLiters}
                      </TableCell>
                      <TableCell className="font-medium text-left border border-gray-50">
                        ₹{row.commissionPerLiter}
                      </TableCell>
                      <TableCell className="font-medium text-left border border-gray-50">
                        ₹{row.tsDeduction}
                      </TableCell>
                      <TableCell className="font-medium text-left border border-gray-50">
                        ₹{row.totalAmount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
      <hr className="text-gray-300 mt-10"/>
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center justify-start gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <Select defaultValue="10">
            <SelectTrigger className="w-16 border-gray-200 bg-gray-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-3 justify-end ">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Excel Export
            </Button>
            <Button className="text-white bg-red-500">PDF Export</Button>
          </div>
      </div>
    </div>
  );
};

export default VlcCommissionReport;
