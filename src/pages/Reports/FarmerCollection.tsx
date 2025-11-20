import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X, ChevronRight, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const FarmerCollection = () => {
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();

  const collectionReportData = [
    {
      date: "2025-04-22",
      farmerId: "001",
      name: "John",
      liter: "20.5",
      kg: "19.5",
      fat: "3.5",
      snf: "6.5",
      clr: "29",
      milkType: "COW",
      userId: "RV0001",
      shift: "Morning",
      rate: "32",
      amount: "640 /-",
    },
  ];

  return (
    <>
      <div className="">
        <div className="flex justify-between items-center p-3 md:p-4 bg-white">
          <h1 className="text-left text-lg md:text-xl font-semibold">Farmer Collection Report</h1>
          <X size={20} strokeWidth={1.5} className="cursor-pointer" />
        </div>
        <hr className="text-gray-300" />
        <Tabs defaultValue="collection" className="w-full border-none">
          <TabsContent value="collection" className="space-y-6">
            <Card className="border-none w-full px-4 md:w-[90%] lg:w-[85%] m-auto mt-5 bg-white text-left">
              <CardHeader className="text-black text-[20px] font-bold">
                User Info
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium">VLC Name</label>
                    <Select>
                      <SelectTrigger className="w-full border border-gray-200">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="green-valley">
                          Green Valley
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Milk Type</label>
                    <Select>
                      <SelectTrigger className="w-full border-gray-200">
                        <SelectValue placeholder="Cow" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="cow">Cow</SelectItem>
                        <SelectItem value="buffalo">Buffalo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Shift</label>
                    <Select>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal border-gray-200",
                            !fromDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate
                            ? format(fromDate, "dd-MM-yyyy")
                            : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fromDate}
                          onSelect={setFromDate}
                          initialFocus
                          className="pointer-events-auto bg-white"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal border-gray-200",
                            !toDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate
                            ? format(toDate, "dd-MM-yyyy")
                            : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={toDate}
                          onSelect={setToDate}
                          initialFocus
                          className="pointer-events-auto bg-white"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 w-full h-11 text-white">
                  Submit
                </Button>
              </CardContent>
            </Card>
            <div className="overflow-x-auto mt-6 md:mt-10 px-4 md:px-5">
              <table className="table-auto border-collapse border border-gray-300 w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2">Date</th>
                    <th className="border border-gray-300 px-4 py-2">
                      Farmer Id
                    </th>
                    <th className="border border-gray-300 px-4 py-2">Name</th>
                    <th className="border border-gray-300 px-4 py-2">Liter</th>
                    <th className="border border-gray-300 px-4 py-2">Kg</th>
                    <th className="border border-gray-300 px-4 py-2">Fat</th>
                    <th className="border border-gray-300 px-4 py-2">Snf</th>
                    <th className="border border-gray-300 px-4 py-2">Clr</th>
                    <th className="border border-gray-300 px-4 py-2">
                      Milk Type
                    </th>
                    <th className="border border-gray-300 px-4 py-2">
                      User Id
                    </th>
                    <th className="border border-gray-300 px-4 py-2">Shift</th>
                    <th className="border border-gray-300 px-4 py-2">Rate</th>
                    <th className="border border-gray-300 px-4 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionReportData.map((row, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.date}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.farmerId}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.name}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.liter}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.kg}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.fat}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.snf}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.clr}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.milkType}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.userId}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.shift}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.rate}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {row.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex justify-center gap-2">
              <ChevronLeft
                size={20}
                strokeWidth={1.5}
                className="border border-gray-300"
              />
              <ChevronRight
                size={20}
                strokeWidth={1.5}
                className="border border-gray-300"
              />
            </div>
            <div className="flex flex-col lg:flex-row justify-between gap-4 mt-6 px-4 md:px-5">
              <div className="flex flex-wrap gap-3 md:gap-4 items-center">
                <div className="text-sm text-gray-600 mt-2">
                  Record Count: 1 - 0 of 0
                </div>
                <span className="text-sm text-gray-600 mt-2">Result per page:</span>
                <Select defaultValue="100">
                  <SelectTrigger className="w-20 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                  Excel Export
                </Button>
                <Button variant="outline" className="bg-red-500 text-white w-full sm:w-auto">
                  PDF Export
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default FarmerCollection;
