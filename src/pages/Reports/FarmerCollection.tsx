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
import { X, ChevronRight, ChevronLeft, CalendarIcon, Download, Users, Droplets, Weight, Percent, Gauge, IndianRupee, TrendingUp, FlaskConical } from "lucide-react";
import KPICard from "@/components/KPICard";
import { collectionTotals } from "@/utils/farmerCollectionTotals";
import { useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { useTranslation } from "react-i18next";
import { generateFarmerCollectionPDF } from "@/templates/FarmerCollectionTemplate";
import { generateFarmerCollectionExcel } from "@/templates/FarmerCollectionExcelTemplate";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { api } from "@/services/config";
import { generateFarmerCollectionSummaryPDF } from "@/templates/FarmerCollectionSummaryTemplate";
import { generateFarmerCollectionSummaryExcel } from "@/templates/FarmerCollectionSummaryExcelTemplate";
import FarmerCollectionSummaryTable from "@/components/FarmerCollectionSummaryTable";
import {
  CommissionRecord,
  buildFarmerCollectionSummary,
  fetchFarmerCommissions,
} from "@/utils/farmerCollectionSummary";

const FarmerCollection = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const dairyName = useAppSelector((state) => state.authData.userData?.name) || "";
  const [selectedVLCs, setSelectedVLCs] = useState<string[]>([]);
  const [vlcSearch, setVlcSearch] = useState("");
  const [milkType, setMilkType] = useState("All");
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"detailed" | "summary">("detailed");
  // branch_id → farmer code → farmer commission records (used for Pay Amount)
  const [commissions, setCommissions] = useState<Map<string, Map<string, CommissionRecord[]>>>(new Map());

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

  const branchByDairyId = useMemo(
    () => new Map((branches || []).map((b) => [String(b.branch_id), b])),
    [branches]
  );

  // Rows come back with the numeric dairy_id; the reports name a VLC by its
  // login id (500381 ...), the same value the VLC dropdown lists.
  const resolveVlcId = (row: { dairy_id?: string | number | null }, requestedBranchId: string) => {
    const branch = branchByDairyId.get(String(row?.dairy_id ?? "")) ?? branchByDairyId.get(String(requestedBranchId));
    return branch?.username ? String(branch.username) : String(row?.dairy_id ?? requestedBranchId ?? "");
  };

  // Totals / averages for the cards at the top — every fetched row, not just the page.
  const totals = useMemo(() => collectionTotals(collectionData), [collectionData]);
  const fmt = (n: number, digits = 2) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const totalCards = [
    { title: `${t("farmers", "Farmers")} / ${t("entries", "Entries")}`, value: `${totals.farmers} / ${totals.entries}`, icon: Users, theme: "cyan" },
    { title: t("total_liter", "Total Liter"), value: `${fmt(totals.liters)} L`, icon: Droplets, theme: "blue" },
    { title: t("total_kg", "Total Kg"), value: `${fmt(totals.kg)} Kg`, icon: Weight, theme: "indigo" },
    { title: t("average_fat", "Avg FAT"), value: fmt(totals.fat), icon: Percent, theme: "violet" },
    { title: t("average_snf", "Avg SNF"), value: fmt(totals.snf), icon: TrendingUp, theme: "amber" },
    { title: t("average_clr", "Avg CLR"), value: fmt(totals.clr), icon: FlaskConical, theme: "pink" },
    { title: t("average_rate", "Avg Rate"), value: `₹${fmt(totals.rate)}`, icon: Gauge, theme: "teal" },
    { title: t("total_amount", "Total Amount"), value: `₹${fmt(totals.amount)}`, icon: IndianRupee, theme: "emerald" },
  ] as const;

  const collectionSummary = useMemo(
    () =>
      buildFarmerCollectionSummary(
        collectionData,
        selectedVLCs.map((id) => {
          const b = branchByDairyId.get(id);
          return { dairyId: id, name: [b?.username, b?.name || id, b?.branchName].filter(Boolean).join(" - ") };
        }),
        commissions
      ),
    [collectionData, selectedVLCs, branchByDairyId, commissions]
  );

  const filteredBranches = branches.filter(b =>
    (b.name || "").toLowerCase().includes(vlcSearch.toLowerCase()) ||
    (b.username || "").toLowerCase().includes(vlcSearch.toLowerCase())
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

      const [results, commissionMaps] = await Promise.all([
        Promise.all(promises),
        Promise.all(selectedVLCs.map((id) => fetchFarmerCommissions(id, branchByDairyId.get(id)?.username))),
      ]);
      // Stamp every row with its VLC, so the table and both exports read one field.
      const allCollections = results.flatMap((res, index) =>
        (res.data.success ? (res.data.data || []) : []).map((row) => ({
          ...row,
          vlc_id: resolveVlcId(row, selectedVLCs[index]),
          branch_id: selectedVLCs[index],
        }))
      );
      
      setCollectionData(allCollections);
      setCommissions(new Map(selectedVLCs.map((id, i) => [id, commissionMaps[i]])));
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
    if (viewMode === "summary") {
      generateFarmerCollectionSummaryPDF(collectionSummary, dairyName, format(fromDate, "dd/MM/yy"), format(toDate, "dd/MM/yy"));
      toast.success("PDF exported successfully");
      return;
    }
    const firstBranchId = selectedVLCs[0];
    const selectedBranch = branches?.find(b => b.branch_id.toString() === firstBranchId);
    const branchName = selectedVLCs.length > 1 ? "Multiple Centers" : (selectedBranch ? selectedBranch.name : "");
    const vlcDairyName = selectedVLCs.length > 1 ? "Combined Report" : (selectedBranch ? selectedBranch.username : "");
    const fromDateStr = format(fromDate, "dd-MM-yyyy");
    const toDateStr = format(toDate, "dd-MM-yyyy");
    generateFarmerCollectionPDF(collectionData, branchName, vlcDairyName, fromDateStr, toDateStr, shift, milkType);
    toast.success("PDF exported successfully");
  };

  const handleExportExcel = () => {
    if (!collectionData || collectionData.length === 0) {
      toast.error("No data to export");
      return;
    }
    if (viewMode === "summary") {
      generateFarmerCollectionSummaryExcel(collectionSummary, dairyName, format(fromDate, "dd/MM/yy"), format(toDate, "dd/MM/yy"));
      toast.success("Excel exported successfully");
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
        {/* Two rows of four at most, so every card keeps room for its figure. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mx-2 md:mx-4 mt-5 mb-6 text-left">
          {totalCards.map((card) => (
            <KPICard key={card.title} title={card.title} value={card.value} icon={card.icon} theme={card.theme} />
          ))}
        </div>
        <Tabs defaultValue="collection" className="w-full border-none">
          <TabsContent value="collection" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
              <div>
                <label className="text-sm font-medium">{t('vlc_name')}</label>
                <VLCDropdown
                  branches={branches || []}
                  value={selectedVLCs}
                  onChange={(value) => setSelectedVLCs(value)}
                  valueKey="branch_id"
                  placeholder="Select VLC Centers"
                  isMultiSelect={true}
                />
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
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{t('from_date')}</label>
                <AppDatePicker
                  date={fromDate}
                  onChange={(dateStr) => {
                    const parsed = parseISO(dateStr);
                    if (isValid(parsed)) setFromDate(parsed);
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{t('to_date')}</label>
                <AppDatePicker
                  date={toDate}
                  onChange={(dateStr) => {
                    const parsed = parseISO(dateStr);
                    if (isValid(parsed)) setToDate(parsed);
                  }}
                  className="w-full"
                />
              </div>
              <div className="lg:col-span-4 xl:col-span-5 flex justify-end">
                <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-[120px] text-white">
                  {loading ? t('loading') : t('submit')}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center flex-wrap gap-3 mx-2 mb-4">
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                {(["detailed", "summary"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "px-4 h-11 text-sm font-medium",
                      viewMode === mode ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {mode === "detailed" ? t("detailed", "Detailed") : t("summary", "Summary")}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
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
            </div>
            {viewMode === "summary" ? (
              <FarmerCollectionSummaryTable
                summary={collectionSummary}
                dairyName={dairyName}
                fromDate={format(fromDate, "dd/MM/yy")}
                toDate={format(toDate, "dd/MM/yy")}
                emptyText={loading ? "Loading..." : "No data available. Please submit the form to fetch data."}
              />
            ) : (
            <>
            <div className="overflow-x-auto mt-6 md:mt-10 px-4 md:px-5">
              <table className="table-auto border-collapse border border-gray-300 w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2">{t('date')}</th>
                    <th className="border border-gray-300 px-4 py-2">{t('vlc_id')}</th>
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
                          {row.vlc_id ?? ""}
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
            </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default FarmerCollection;
