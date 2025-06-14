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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const VlcDifferenceReport = () => {
  const [currentPage, setCurrentPage] = useState(1);
  // const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(50 / 10);

  const vlccDifferenceData = [
    {
      userId: "RV001",
      collectionWeight: "980",
      collectionFat: "3.4",
      collectionSNF: "8.4",
      collectionAmount: "33,320",
      milkWeight: "977",
      milkFat: "3.4",
      milkSNF: "8.4",
      milkAmount: "33,218",
      diffWeight: "-3.00",
      diffFat: "0.0",
      diffSNF: "0.0",
      diffAmount: "-102",
    },
    {
      userId: "RV002",
      collectionWeight: "1180",
      collectionFat: "3.6",
      collectionSNF: "8.6",
      collectionAmount: "42,480",
      milkWeight: "1180",
      milkFat: "3.7",
      milkSNF: "8.8",
      milkAmount: "42,716",
      diffWeight: "0.00",
      diffFat: "+0.10",
      diffSNF: "+0.20",
      diffAmount: "+236",
    },
    {
      userId: "RV003",
      collectionWeight: "930",
      collectionFat: "3.3",
      collectionSNF: "8.3",
      collectionAmount: "29,760",
      milkWeight: "930",
      milkFat: "3.3",
      milkSNF: "8.3",
      milkAmount: "29,760",
      diffWeight: "0.00",
      diffFat: "0.00",
      diffSNF: "0.00",
      diffAmount: "0.00",
    },
  ];

  return (
    <div className="p-6 bg-white w-full h-screen">
      <h1 className="text-lg font-bold mb-7">VLCC Difference Report</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 rounded-lg">
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
        <div>
          <Label className="mb-1">From Date</Label>
          <Input
            type="date"
            defaultValue="2025-04-21"
            className="border-gray-200"
          />
        </div>
        <div>
          <Label className="mb-1">Shift Type</Label>
          <Select defaultValue="select">
            <SelectTrigger className="w-full border-gray-200">
              <SelectValue placeholder="Select shift" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="select">Select shift</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="text-white bg-blue-600 w-[90px] mt-4.5">Show</Button>
      </div>
      <div className="overflow-x-auto mt-4 border border-gray-200 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={6} className="text-left border border-gray-100 pl-8 font-bold">
                VLCC Collection Data
              </TableHead>
              <TableHead colSpan={5} className="text-left border border-gray-100 pl-8 font-bold">
                VLCC Milk Entry
              </TableHead>
              <TableHead colSpan={4} className="text-left border border-gray-100 pl-8 font-bold">
                Difference (Collection - Milk)
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="text-center font-bold bg-gray-100">User ID</TableHead>
              <TableHead className="text-center font-bold bg-gray-100">Weight</TableHead>
              <TableHead className="text-center font-bold bg-gray-100">Fat</TableHead>
              <TableHead className="text-center font-bold bg-gray-100">SNF</TableHead>
              <TableHead className="text-center font-bold bg-gray-100">Amount</TableHead>
              <TableHead className=""> </TableHead>
              <TableHead className="text-center font-bold bg-gray-100">Weight</TableHead>
              <TableHead className="text-center font-bold bg-gray-100">Fat</TableHead>
              <TableHead className="text-center font-bold bg-gray-100">SNF</TableHead>
              <TableHead className="text-center font-bold bg-gray-100">Amount</TableHead>
              <TableHead className=""> </TableHead>
              <TableHead className="text-center font-bold">Weight</TableHead>
              <TableHead className="text-center font-bold">Fat</TableHead>
              <TableHead className="text-center font-bold">SNF</TableHead>
              <TableHead className="text-center font-bold">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vlccDifferenceData.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium border border-gray-100">
                  {row.userId}
                </TableCell>
                <TableCell className="border border-gray-100">{row.collectionWeight}</TableCell>
                <TableCell className="border border-gray-100">{row.collectionFat}</TableCell>
                <TableCell className="border border-gray-100">{row.collectionSNF}</TableCell>
                <TableCell className="border border-gray-100">
                  {row.collectionAmount}
                </TableCell>
                <TableCell  className="border border-gray-50"></TableCell>
                <TableCell className="border border-gray-100"> {row.milkWeight}</TableCell>
                <TableCell className="border border-gray-100">{row.milkFat}</TableCell>
                <TableCell className="border border-gray-100">{row.milkSNF}</TableCell>
                <TableCell className="border border-gray-100">{row.milkAmount}</TableCell>
                <TableCell  className="border border-gray-50"></TableCell>
                <TableCell
                  className={`
                     ${row.diffFat.startsWith("-")
                      ? "text-red-600"
                      : "text-green-600"}
                      border border-gray-100
                 `}>
                  {row.diffWeight}
                </TableCell>
                <TableCell
                  className={`
                    ${row.diffFat.startsWith("-")
                      ? "text-red-600"
                      : "text-green-600"}
                      border border-gray-100
                  `}
                >
                  {row.diffFat}
                </TableCell>
                <TableCell
                  className={`
                     ${row.diffFat.startsWith("-")
                      ? "text-red-600"
                      : "text-green-600"}
                      border border-gray-100
                  `}
                >
                  {row.diffSNF}
                </TableCell>
                <TableCell
                  className={`
                     ${row.diffFat.startsWith("-")
                      ? "text-red-600"
                      : "text-green-600"}
                      border border-gray-100
                  `}
                >
                  {row.diffAmount}
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
          <div className="flex gap-3 justify-end ">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Excel Export
            </Button>
            <Button className="text-white bg-red-500">PDF Export</Button>
          </div>  
        </div>
      </div>
    </div>
  );
};

export default VlcDifferenceReport;
