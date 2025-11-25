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
import { generateFarmerCollectionPDF } from "@/templates/FarmerCollectionTemplate";
import { generateFarmerCollectionExcel } from "@/templates/FarmerCollectionExcelTemplate";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { api } from "@/services/config";

const FarmerCollection = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [vlcName, setVlcName] = useState("");
  const [milkType, setMilkType] = useState("All");
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 17 ? "Evening" : "Morning";
  };

  const getDateRange = (date: Date = new Date()) => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    let startDay, endDay;
    
    if (day <= 10) {
      startDay = 1;
      endDay = 10;
    } else if (day <= 20) {
      startDay = 11;
      endDay = 20;
    } else {
      startDay = 21;
      endDay = new Date(year, month + 1, 0).getDate(); // Last day of month
    }
    
    return {
      from: new Date(year, month, startDay),
      to: new Date(year, month, endDay)
    };
  };

  const defaultRange = getDateRange();
  const [shift, setShift] = useState(getDefaultShift());
  const [fromDate, setFromDate] = useState<Date>(defaultRange.from);
  const [toDate, setToDate] = useState<Date>(defaultRange.to);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  const handleSubmit = async () => {
    if (!vlcName || !fromDate || !toDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("/webreports/collections", {
        params: {
          dairy_id: vlcName,
          milk_type: milkType,
          shift: shift,
          from: format(fromDate, "yyyy-MM-dd"),
          to: format(toDate, "yyyy-MM-dd"),
        },
      });

      if (data.success) {
        setCollectionData(data.data || []);
        setSummary(data.summary || null);
        setCurrentPage(1);
        toast.success(data.message || "Data fetched successfully");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch data");
      setCollectionData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!collectionData || collectionData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const selectedBranch = branches?.find(b => b.branch_id.toString() === vlcName);
    const branchName = selectedBranch ? selectedBranch.name : "";
    const dairyName = selectedBranch ? selectedBranch.username : "";
    const fromDateStr = format(fromDate, "dd-MM-yyyy");
    const toDateStr = format(toDate, "dd-MM-yyyy");
    generateFarmerCollectionPDF(collectionData, branchName, dairyName, fromDateStr, toDateStr, shift, milkType);
    toast.success("PDF exported successfully");
  };

  const handleExportExcel = () => {
    if (!collectionData || collectionData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const selectedBranch = branches?.find(b => b.branch_id.toString() === vlcName);
    const branchName = selectedBranch ? selectedBranch.name : "";
    const fromDateStr = format(fromDate, "dd-MM-yyyy");
    const toDateStr = format(toDate, "dd-MM-yyyy");
    generateFarmerCollectionExcel(collectionData, branchName, fromDateStr, toDateStr, shift, milkType);
    toast.success("Excel exported successfully");
  };



  return (
    <>
      <div className="">
        <div className="flex justify-between items-center p-3 md:p-4 bg-white">
          <h1 className="text-left text-lg md:text-xl font-semibold">Farmer Collection Report</h1>
        </div>
        <hr className="text-gray-300" />
        <Tabs defaultValue="collection" className="w-full border-none">
          <TabsContent value="collection" className="space-y-6">
            <Card className="border-none w-full px-4 md:w-[90%] lg:w-[85%] m-auto mt-5 bg-white text-left">
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium">VLC Name</label>
                    <Select value={vlcName} onValueChange={setVlcName}>
                      <SelectTrigger className="w-full border border-gray-200">
                        <SelectValue placeholder="Select VLC" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {branches.map((branch) => (
                          <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                            {branch.username} - {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Milk Type</label>
                    <Select value={milkType} onValueChange={setMilkType}>
                      <SelectTrigger className="w-full border-gray-200">
                        <SelectValue placeholder="Cow" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Cow">Cow</SelectItem>
                        <SelectItem value="Buffalo">Buffalo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Shift</label>
                    <Select value={shift} onValueChange={setShift}>
                      <SelectTrigger className="w-full border-gray-200">
                        <SelectValue placeholder="Morning" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Morning">Morning</SelectItem>
                        <SelectItem value="Evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Date</label>
                    <Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100",
                            !fromDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate ? format(fromDate, "dd-MM-yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white z-50" align="start" sideOffset={5}>
                        <Calendar
                          mode="single"
                          selected={fromDate}
                          onSelect={(date) => {
                            if (date) {
                              setFromDate(date);
                              setIsFromCalendarOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Date</label>
                    <Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100",
                            !toDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? format(toDate, "dd-MM-yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white z-50" align="start" sideOffset={5}>
                        <Calendar
                          mode="single"
                          selected={toDate}
                          onSelect={(date) => {
                            if (date) {
                              setToDate(date);
                              setIsToCalendarOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full h-11 text-white">
                  {loading ? "Loading..." : "Submit"}
                </Button>
              </CardContent>
            </Card>
            <div className="flex justify-end gap-3 px-4 md:px-0 md:w-[90%] lg:w-[85%] m-auto mt-4">
              <Button 
                onClick={handleExportExcel}
                disabled={!collectionData || collectionData.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white h-11 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Excel Export
              </Button>
              <Button 
                onClick={handleExportPDF}
                disabled={!collectionData || collectionData.length === 0}
                variant="outline" 
                className="bg-red-500 text-white h-11 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                PDF Export
              </Button>
            </div>
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
                    <th className="border border-gray-300 px-4 py-2">Shift</th>
                    <th className="border border-gray-300 px-4 py-2">Rate</th>
                    <th className="border border-gray-300 px-4 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionData.length > 0 ? (
                    collectionData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, index) => (
                      <tr key={row.id || index}>
                        <td className="border border-gray-300 px-4 py-2">
                          {format(new Date(row.created_at), "dd-MM-yyyy")}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {row.farmer_code}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {row.farmer_name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {row.quantity}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {(parseFloat(row.quantity) * 1.03).toFixed(2)}
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
                          {row.type}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {row.shift}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {row.rate}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          ₹{row.amount}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                        {loading ? "Loading..." : "No data available. Please submit the form to fetch data."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {collectionData.length > 0 && (
              <div className="flex justify-center gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="border-gray-300"
                >
                  <ChevronLeft size={20} strokeWidth={1.5} />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {Math.ceil(collectionData.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(collectionData.length / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(collectionData.length / itemsPerPage)}
                  className="border-gray-300"
                >
                  <ChevronRight size={20} strokeWidth={1.5} />
                </Button>
              </div>
            )}
            <div className="flex flex-col lg:flex-row justify-between gap-4 mt-6 px-4 md:px-5">
              <div className="flex flex-wrap gap-3 md:gap-4 items-center">
                <div className="text-sm text-gray-600 mt-2">
                  Record Count: {collectionData.length > 0 ? `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, collectionData.length)} of ${collectionData.length}` : "0 - 0 of 0"}
                </div>
                <span className="text-sm text-gray-600 mt-2">Result per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default FarmerCollection;
