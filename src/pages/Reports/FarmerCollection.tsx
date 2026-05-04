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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { AppDatePicker } from "@/components/ui/date-picker";
import { X, ChevronRight, ChevronLeft, CalendarIcon, Download } from "lucide-react";
import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { useTranslation } from "react-i18next";
import { generateFarmerCollectionPDF } from "@/templates/FarmerCollectionTemplate";
import { generateFarmerCollectionExcel } from "@/templates/FarmerCollectionExcelTemplate";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { api } from "@/services/config";

const FarmerCollection = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [selectedVLCs, setSelectedVLCs] = useState<string[]>([]);
  const [vlcSearch, setVlcSearch] = useState("");
  const [milkType, setMilkType] = useState("All");
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 16 ? "Evening" : "Morning";
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

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(vlcSearch.toLowerCase()) || 
    b.username.toLowerCase().includes(vlcSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (selectedVLCs.length === 0 || !fromDate || !toDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const promises = selectedVLCs.map(vlcId => 
        api.get("/webreports/collections", {
          params: {
            dairy_id: vlcId,
            milk_type: milkType,
            shift: shift,
            from: format(fromDate, "yyyy-MM-dd"),
            to: format(toDate, "yyyy-MM-dd"),
          },
        })
      );

      const results = await Promise.all(promises);
      const allCollections = results.flatMap(res => res.data.success ? (res.data.data || []) : []);
      
      setCollectionData(allCollections);
      setSummary(results[0]?.data.summary || null);
      setCurrentPage(1);
      toast.success("Data fetched successfully");
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
    const firstBranchId = selectedVLCs[0];
    const selectedBranch = branches?.find(b => b.branch_id.toString() === firstBranchId);
    const branchName = selectedVLCs.length > 1 ? "Multiple Centers" : (selectedBranch ? selectedBranch.name : "");
    const dairyName = selectedVLCs.length > 1 ? "Combined Report" : (selectedBranch ? selectedBranch.username : "");
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
    const firstBranchId = selectedVLCs[0];
    const selectedBranch = branches?.find(b => b.branch_id.toString() === firstBranchId);
    const branchName = selectedVLCs.length > 1 ? "Multiple Centers" : (selectedBranch ? selectedBranch.name : "");
    const fromDateStr = format(fromDate, "dd-MM-yyyy");
    const toDateStr = format(toDate, "dd-MM-yyyy");
    generateFarmerCollectionExcel(collectionData, branchName, fromDateStr, toDateStr, shift, milkType);
    toast.success("Excel exported successfully");
  };

  const exportToText = () => {
    if (!collectionData || collectionData.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Sort data: Date, then Shift, then Farmer ID
    const sortedData = [...collectionData].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      if (dateA !== dateB) return dateA - dateB;

      const shiftOrder: { [key: string]: number } = { 'Morning': 1, 'Evening': 2 };
      const orderA = shiftOrder[a.shift] || 0;
      const orderB = shiftOrder[b.shift] || 0;
      if (orderA !== orderB) return orderA - orderB;

      return parseInt(a.farmer_code) - parseInt(b.farmer_code);
    });

    const lines = sortedData.map(item => {
      const dateObj = new Date(item.created_at);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      
      const shift = item.shift === 'Morning' ? 'M' : 'E';
      const farmerId = parseInt(item.farmer_code).toString();
      const milkTypeChar = item.type === 'Buffalo' ? 'B' : (item.type === 'Cow' ? 'C' : item.type?.charAt(0) || '');
      
      const qty = parseFloat(item.quantity || '0');
      const formattedQty = (qty >= 0 ? '+' : '-') + Math.abs(qty).toFixed(2).padStart(6, '0');
      
      const fat = parseFloat(item.fat || '0').toFixed(1).padStart(4, '0');
      const clr = parseFloat(item.clr || '0').toFixed(1).padStart(4, '0');
      const snfValue = parseFloat(item.snf || '0').toFixed(2);

      return `${day}/${month}, ${shift}, ${farmerId}, ${milkTypeChar}, ${formattedQty}, ${fat}, ${clr}, ${snfValue}`;
    });

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Collection_Data_${format(fromDate, "dd-MM-yyyy")}_to_${format(toDate, "dd-MM-yyyy")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Text file exported successfully");
  };



  return (
    <>
      <div className="">
        <div className="flex justify-between items-center p-3 md:p-4 bg-white">
          <h1 className="text-left text-lg md:text-xl font-semibold">{t('farmer_collection')}</h1>
        </div>
        <hr className="text-gray-300" />
        <Tabs defaultValue="collection" className="w-full border-none">
          <TabsContent value="collection" className="space-y-6">
            <Card className="border-none w-full px-4 md:w-[90%] lg:w-[85%] m-auto mt-5 bg-white text-left">
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium">{t('vlc_name')}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between text-left font-normal border-gray-200 bg-white h-10 shadow-none">
                          <span className="truncate">
                            {selectedVLCs.length > 0 
                              ? `${selectedVLCs.length} VLC(s) selected` 
                              : "Select VLC Centers"}
                          </span>
                          <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0 bg-white shadow-lg border" align="start">
                        <div className="p-2 border-b">
                          <Input 
                            placeholder="Search VLC..." 
                            value={vlcSearch}
                            onChange={(e) => setVlcSearch(e.target.value)}
                            className="h-9 shadow-none text-sm"
                          />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-2">
                          <div className="flex items-center space-x-2 pb-2 mb-2 border-b px-2">
                            <Checkbox 
                              id="select-all-vlc"
                              checked={selectedVLCs.length === branches.length && branches.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedVLCs(branches.map(b => b.branch_id.toString()));
                                else setSelectedVLCs([]);
                              }}
                            />
                            <label htmlFor="select-all-vlc" className="text-sm font-semibold cursor-pointer">Select All VLCs</label>
                          </div>
                          {filteredBranches.length > 0 ? (
                            filteredBranches.map((branch) => (
                              <div key={branch.branch_id} className="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-50 rounded-sm">
                                <Checkbox 
                                  id={`vlc-${branch.branch_id}`}
                                  checked={selectedVLCs.includes(branch.branch_id.toString())}
                                  onCheckedChange={(checked) => {
                                    if (checked) setSelectedVLCs([...selectedVLCs, branch.branch_id.toString()]);
                                    else setSelectedVLCs(selectedVLCs.filter(id => id !== branch.branch_id.toString()));
                                  }}
                                />
                                <label htmlFor={`vlc-${branch.branch_id}`} className="text-sm cursor-pointer truncate">
                                  {branch.username} - {branch.name}
                                </label>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">No VLC centers found.</div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('milk_type')}</label>
                    <Select value={milkType} onValueChange={setMilkType}>
                      <SelectTrigger className="w-full border-gray-200">
                        <SelectValue placeholder="Cow" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="All">{t('all')}</SelectItem>
                        <SelectItem value="Cow">{t('cow')}</SelectItem>
                        <SelectItem value="Buffalo">{t('buffalo')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('shift')}</label>
                    <Select value={shift} onValueChange={setShift}>
                      <SelectTrigger className="w-full border-gray-200">
                        <SelectValue placeholder="Morning" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="All">{t('all')}</SelectItem>
                        <SelectItem value="Morning">{t('morning')}</SelectItem>
                        <SelectItem value="Evening">{t('evening')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('from_date')}</label>
                    <AppDatePicker
                      date={fromDate}
                      onChange={(dateStr) => {
                        const parsed = parseISO(dateStr);
                        if (isValid(parsed)) setFromDate(parsed);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('to_date')}</label>
                    <AppDatePicker
                      date={toDate}
                      onChange={(dateStr) => {
                        const parsed = parseISO(dateStr);
                        if (isValid(parsed)) setToDate(parsed);
                      }}
                    />
                  </div>
                </div>
                <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full h-11 text-white">
                  {loading ? t('loading') : t('submit')}
                </Button>
              </CardContent>
            </Card>
            <div className="flex justify-end flex-wrap gap-3 px-4 md:px-0 md:w-[90%] lg:w-[85%] m-auto mt-4">
              <Button 
                onClick={exportToText}
                disabled={!collectionData || collectionData.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white h-11 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Text
              </Button>
              <Button 
                onClick={handleExportExcel}
                disabled={!collectionData || collectionData.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white h-11 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('excel_export')}
              </Button>
              <Button 
                onClick={handleExportPDF}
                disabled={!collectionData || collectionData.length === 0}
                variant="outline" 
                className="bg-red-500 text-white h-11 flex items-center justify-center gap-2 border-none"
              >
                <Download className="h-4 w-4" />
                {t('pdf_export')}
              </Button>
            </div>
            <div className="overflow-x-auto mt-6 md:mt-10 px-4 md:px-5">
              <table className="table-auto border-collapse border border-gray-300 w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2">{t('date')}</th>
                    <th className="border border-gray-300 px-4 py-2">
                      {t('farmer_id')}
                    </th>
                    <th className="border border-gray-300 px-4 py-2">{t('name')}</th>
                    <th className="border border-gray-300 px-4 py-2">{t('liter')}</th>
                    <th className="border border-gray-300 px-4 py-2">{t('kg')}</th>
                    <th className="border border-gray-300 px-4 py-2">{t('fat')}</th>
                    <th className="border border-gray-300 px-4 py-2">{t('snf')}</th>
                    <th className="border border-gray-300 px-4 py-2">{t('clr')}</th>
                    <th className="border border-gray-300 px-4 py-2">
                      {t('milk_type')}
                    </th>
                    <th className="border border-gray-300 px-4 py-2">{t('shift')}</th>
                    <th className="border border-gray-300 px-4 py-2">{t('rate')}</th>
                    <th className="border border-gray-300 px-4 py-2">{t('amount')}</th>
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
