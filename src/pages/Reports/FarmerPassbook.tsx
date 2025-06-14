import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import PrintIcon from "@mui/icons-material/Print";
import { useState } from "react";
import { cn } from "@/lib/utils";

const passBookData = [
  {
    period: "2024-01-01 to 2024-01-10",
    totalAmount: "$1,200.00",
    advance: "$300.00",
    cattleFeed: "$250.00",
    totalDeduction: "$550.00",
    remainingBalance: "$3,950.00",
  },
  {
    period: "2024-01-11 to 2024-01-20",
    totalAmount: "$1,100.00",
    advance: "$200.00",
    cattleFeed: "$300.00",
    totalDeduction: "$500.00",
    remainingBalance: "$3,700.00",
  },
  {
    period: "2024-01-21 to 2024-01-30",
    totalAmount: "$1,300.00",
    advance: "$400.00",
    cattleFeed: "$350.00",
    totalDeduction: "$750.00",
    remainingBalance: "$4,050.00",
  },
];

const FarmerPassbook = () => {
  const [currentPage, setCurrentPage] = useState(1);
  // const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(50 / 10);
  return (
    <div className="bg-white">
      <div className="mb-6 ">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-left p-6">
          Farmer PassBook
        </h1>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-left">VLCC Name</p>
              <h2 className="text-lg font-semibold text-gray-900">
                Green Valley VLCC
              </h2>
            </div>
            <Button className="bg-blue-950 hover:bg-blue-700 text-white">
              Select Farmer
            </Button>
          </div>
        </div>

        <div className="flex gap-50 justify-start p-6">
          <div>
            <p className="text-sm text-gray-600">Farmer Name</p>
            <p className="text-xl font-bold text-gray-900">John Smith</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Bill Period</p>
            <p className="text-xl font-bold text-gray-900">Jan 2024</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-xl font-bold ">$5,280.00</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Pay</p>
            <p className="text-xl font-bold">$4,750.00</p>
          </div>
        </div>
      </div>
      <hr className="text-gray-200" />
      <div className="flex flex-col sm:flex-row gap-4 items-start p-6 sm:items-center justify-between">
        <div className="flex gap-5">
          <Button variant="default" className="border border-gray-200">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="default" className="border border-gray-200">
            <PrintIcon className="text-gray-700" />
            Print
          </Button>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              className="pl-10 w-64 border-gray-200"
            />
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2 border-gray-200"
          >
            <Filter className="h-4 w-4 " />
            Filter
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto p-6">
        <Table className="border border-gray-200 rounded-3xl">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="border border-gray-200">Bill Period</TableHead>
              <TableHead className="border border-gray-200">Total Amount</TableHead>
              <TableHead className="border border-gray-200">Advance</TableHead>
              <TableHead className="border border-gray-200">Cattle Feed</TableHead>
              <TableHead className="border border-gray-200">Total Deduction</TableHead>
              <TableHead className="border border-gray-200">Remaining Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passBookData.map((row, index) => (
              <TableRow key={index} className="hover:bg-gray-50">
                <TableCell className="font-medium text-left border border-gray-200">
                  {row.period}
                </TableCell>
                <TableCell className="font-medium text-left border border-gray-200">
                  {row.totalAmount}
                </TableCell>
                <TableCell className="font-medium text-left border border-gray-200">
                  {row.advance}
                </TableCell>
                <TableCell className="font-medium text-left border border-gray-200">
                  {row.cattleFeed}
                </TableCell>
                <TableCell className="font-medium text-left border border-gray-200">
                  {row.totalDeduction}
                </TableCell>
                <TableCell className="font-medium text-left border border-gray-200">
                  {row.remainingBalance}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-6 p-6">
        <div className="flex items-center gap-2">
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
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-gray-100 rounded-lg mt-6 p-6">
        <div className="flex gap-65 justify-start">
          <div>
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-lg font-bold text-gray-900">3</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Period Total</p>
            <p className="text-lg font-bold ">$5,280.00</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Deductions</p>
            <p className="text-lg font-bold ">$530.00</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 p-6 justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          Excel Export
        </Button>
        <Button variant="destructive" className="bg-red-500 text-white">
          PDF Export
        </Button>
      </div>
    </div>
  );
};

export default FarmerPassbook;
