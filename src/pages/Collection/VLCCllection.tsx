import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/store";
import { useVlcNumbering } from "@/utils/vlcSectionLabel";
import { usePostApi } from "@/services/use-api";
import { toast } from "react-toastify";

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import {
  FileSpreadsheet,
  Search,
  Users,
  TrendingUp,
  IndianRupee,
  Filter,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Milk,
  BarChart3,
  Loader2,
  DatabaseZap,
} from "lucide-react";
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const VLCCllection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { branches } = useAppSelector((state) => state.branch);
  // VLC numbers (1, 2, 3 …) for the web user who uses them; "" for everyone else.
  const vlcNo = useVlcNumbering();
  const { postData, isLoading } = usePostApi({
    path: "/web/dashboard/farmer-collections"
  });

  const [toDate, setToDate] = useState<Date>();
  const [fromDate, setFromDate] = useState<Date>();
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [farmerData, setFarmerData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchQuery, setDropdownSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);

  const toggleBranch = (branchId: number) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBranches.length === branches.length) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches(branches.map(b => b.branch_id));
    }
  };
  
  const vlcData = farmerData.reduce((acc: any[], item) => {
    const existing = acc.find(v => v.dairy_id === item.dairy_id);
    if (existing) {
      existing.totalMilkLtr += parseFloat(item.quantity) || 0;
      if (!existing.milkTypes.includes(item.type)) {
        existing.milkTypes.push(item.type);
      }
    } else {
      acc.push({
        dairy_id: item.dairy_id,
        totalMilkLtr: parseFloat(item.quantity) || 0,
        milkTypes: [item.type],
        is_active: item.is_active
      });
    }
    return acc;
  }, []);

  // Filter vlcData by search query
  const filteredVlcData = useMemo(() => {
    if (vlcNo.enabled) {
      const pos = (id: number) => vlcNo.numberOf(branches.find((b) => b.branch_id === id)?.username) ?? Infinity;
      vlcData.sort((a: any, b: any) => pos(a.dairy_id) - pos(b.dairy_id));
    }
    if (!searchQuery.trim()) return vlcData;
    const q = searchQuery.toLowerCase();
    return vlcData.filter((vlc: any) => {
      const branch = branches.find(b => b.branch_id === vlc.dairy_id);
      return (
        (branch?.username || '').toLowerCase().includes(q) ||
        (branch?.name || '').toLowerCase().includes(q) ||
        (branch?.branchName || '').toLowerCase().includes(q) ||
        String(vlc.dairy_id).includes(q)
      );
    });
  }, [vlcData, searchQuery, branches]);
  
  const totalPages = Math.ceil(filteredVlcData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredVlcData.slice(startIndex, endIndex);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getDateRangeForPeriod = (date: Date) => {
    const day = date.getDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    if (day <= 10) {
      return {
        from: new Date(year, month, 1),
        to: new Date(year, month, 10)
      };
    } else if (day <= 20) {
      return {
        from: new Date(year, month, 11),
        to: new Date(year, month, 20)
      };
    } else {
      return {
        from: new Date(year, month, 21),
        to: new Date(year, month, lastDay)
      };
    }
  };

  useEffect(() => {
    const today = new Date();
    const range = getDateRangeForPeriod(today);
    setFromDate(range.from);
    setToDate(range.to);
  }, []);

  const handleFromDateChange = (date: Date | undefined) => {
    if (date) {
      setFromDate(date);
      const range = getDateRangeForPeriod(date);
      setToDate(range.to);
    }
  };

  const handleApplyFilters = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select both from and to dates");
      return;
    }

    if (selectedBranches.length === 0) {
      toast.error("Please select at least one VLC Center");
      return;
    }

    try {
      const payload = {
        branches: selectedBranches,
        type: selectedType === "all" ? "All" : selectedType.charAt(0).toUpperCase() + selectedType.slice(1),
        shift: selectedShift === "all" ? "All" : selectedShift.charAt(0).toUpperCase() + selectedShift.slice(1),
        from_date: format(fromDate, "yyyy-MM-dd"),
        to_date: format(toDate, "yyyy-MM-dd")
      };

      console.log('📤 VLC Collection API Request:', payload);
      const response = await postData(payload);
      console.log('📥 VLC Collection API Response:', response);
      
      if (response?.data?.success) {
        setFarmerData(response.data.data || []);
        setCurrentPage(1);
        setHasApplied(true);
      }
    } catch (error: any) {
      console.error('❌ VLC Collection API Error:', error);
      toast.error(error?.response?.data?.message || "Failed to fetch data");
    }
  };

  // Calculate stats from farmer data with weighted averages
  const uniqueVLCCs = new Set(farmerData.map(f => f.dairy_id)).size;
  const totalMilk = farmerData.reduce((sum, f) => sum + (parseFloat(f.quantity) || 0), 0);
  
  const weightedFatSum = farmerData.reduce((sum, f) => sum + ((parseFloat(f.fat) || 0) * (parseFloat(f.quantity) || 0)), 0);
  const avgFat = totalMilk > 0 ? (weightedFatSum / totalMilk).toFixed(2) : "0.0";
  
  const weightedSnfSum = farmerData.reduce((sum, f) => sum + ((parseFloat(f.snf) || 0) * (parseFloat(f.quantity) || 0)), 0);
  const avgSNF = totalMilk > 0 ? (weightedSnfSum / totalMilk).toFixed(2) : "0.0";
  
  const totalPayments = farmerData.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

  const handleExportToExcel = () => {
    const exportData = vlcData.map((vlc: any) => {
      const branch = branches.find(b => b.branch_id === vlc.dairy_id);
      const vlcFarmers = farmerData.filter(f => f.dairy_id === vlc.dairy_id);
      
      const vlcTotalMilk = vlcFarmers.reduce((sum, f) => sum + (parseFloat(f.quantity) || 0), 0);
      const weightedFatSum = vlcFarmers.reduce((sum, f) => sum + ((parseFloat(f.fat) || 0) * (parseFloat(f.quantity) || 0)), 0);
      const avgFat = vlcTotalMilk > 0 ? (weightedFatSum / vlcTotalMilk).toFixed(2) : '0.00';
      
      const weightedSnfSum = vlcFarmers.reduce((sum, f) => sum + ((parseFloat(f.snf) || 0) * (parseFloat(f.quantity) || 0)), 0);
      const avgSNF = vlcTotalMilk > 0 ? (weightedSnfSum / vlcTotalMilk).toFixed(2) : '0.00';
      
      const totalAmount = vlcFarmers.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
      const avgRate = vlc.totalMilkLtr > 0 ? (totalAmount / vlc.totalMilkLtr).toFixed(2) : '0.00';
      
      return {
        'VLC ID': `${vlcNo.prefix(branch?.username)}${branch?.username || vlc.dairy_id}`,
        'VLC Name': branch?.name || 'N/A',
        'Total Milk (Ltr)': vlc.totalMilkLtr.toFixed(2),
        'Total Milk (Kg)': (vlc.totalMilkLtr * 1.03).toFixed(2),
        'Average FAT (%)': avgFat,
        'Average SNF (%)': avgSNF,
        'Average Rate (₹)': avgRate,
        'Total Amount (₹)': totalAmount,
        'Milk Type': vlc.milkTypes.join(', '),
        'Status': vlc.is_active === 1 ? 'Active' : 'Inactive'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VLC Collection');
    XLSX.writeFile(wb, `VLC_Collection_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Excel file exported successfully');
  };

  const centerStats = [
    {
      label: t('vlcc_center'),
      value: uniqueVLCCs.toString(),
      icon: Users,
      gradient: "from-blue-100 to-blue-50",
      border: "border-blue-200",
      accent: "border-l-blue-500",
      text: "text-blue-700",
      bg: "bg-blue-200",
    },
    {
      label: t('total_milk_collection'),
      value: `${totalMilk.toFixed(1)}L`,
      icon: Droplets,
      gradient: "from-emerald-100 to-emerald-50",
      border: "border-emerald-200",
      accent: "border-l-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-200",
    },
    {
      label: t('average_fat'),
      value: `${avgFat}%`,
      icon: BarChart3,
      gradient: "from-violet-100 to-violet-50",
      border: "border-violet-200",
      accent: "border-l-violet-500",
      text: "text-violet-700",
      bg: "bg-violet-200",
    },
    {
      label: t('average_snf'),
      value: `${avgSNF}%`,
      icon: TrendingUp,
      gradient: "from-amber-100 to-amber-50",
      border: "border-amber-200",
      accent: "border-l-amber-500",
      text: "text-amber-700",
      bg: "bg-amber-200",
    },
    {
      label: t('total_payments'),
      value: `₹${totalPayments.toFixed(2)}`,
      icon: IndianRupee,
      gradient: "from-teal-100 to-teal-50",
      border: "border-teal-200",
      accent: "border-l-teal-500",
      text: "text-teal-700",
      bg: "bg-teal-200",
    },
  ];

  // Pagination range helper
  const getPaginationRange = () => {
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  return (
    <div className="space-y-5 bg-slate-50/50 min-h-screen p-4 md:p-6 min-w-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Milk className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
              {t('vlc_collection_dashboard')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              {fromDate && toDate ? `${format(fromDate, 'dd MMM yyyy')} — ${format(toDate, 'dd MMM yyyy')}` : 'Select a date range to get started'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {centerStats.map((stat, index) => (
          <div
            key={index}
            className={cn(
              "relative overflow-hidden bg-gradient-to-br rounded-xl border border-l-4 p-4 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default",
              stat.gradient,
              stat.border,
              stat.accent
            )}
          >
            {/* Decorative circle */}
            <div className={cn("absolute -right-3 -top-3 w-14 h-14 rounded-full opacity-20 transition-transform group-hover:scale-150 duration-700", stat.bg)} />

            <div className="relative z-10 flex items-start justify-between mb-2 gap-2">
              <p className="text-slate-600 text-xs font-semibold tracking-wide uppercase line-clamp-2">
                {stat.label}
              </p>
              <div className={cn("p-1.5 rounded-lg bg-opacity-60 shadow-sm shrink-0", stat.bg)}>
                <stat.icon className={cn("h-3.5 w-3.5", stat.text)} />
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <Card className="border border-slate-200/80 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardHeader
          className="border-b border-slate-100 bg-slate-50/50 py-3 px-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Filter className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-700">{t('filter_options')}</CardTitle>
            </div>
            <ChevronRight className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200",
              isFiltersExpanded && "rotate-90"
            )} />
          </div>
        </CardHeader>

        <div className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isFiltersExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* VLC ID Multi-Select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  {t('vlc_id')} 
                </Label>
                <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-gray-50 border-gray-200"
                    >
                      {selectedBranches.length === 0 
                        ? "Select VLC Centers" 
                        : `${selectedBranches.length} VLC(s) selected`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-white" align="start">
                    <div className="p-2 border-b flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="flex-1 text-xs"
                      >
                        {selectedBranches.length === branches.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      {selectedBranches.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBranches([])}
                          className="flex-1 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="p-2 border-b">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                          value={dropdownSearchQuery}
                          onChange={(e) => setDropdownSearchQuery(e.target.value)}
                          placeholder="Search VLC..."
                          className="flex-1 bg-transparent outline-none text-sm text-gray-700"
                        />
                        {dropdownSearchQuery && (
                          <button onClick={() => setDropdownSearchQuery("")} className="text-gray-400 hover:text-gray-600 text-xs">
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2">
                      {branches
                        ?.filter(b => 
                          !dropdownSearchQuery || 
                          (b.username || "").toLowerCase().includes(dropdownSearchQuery.toLowerCase()) || 
                          (b.name || "").toLowerCase().includes(dropdownSearchQuery.toLowerCase()) || 
                          (b.branchName || "").toLowerCase().includes(dropdownSearchQuery.toLowerCase())
                        )
                        .map((branch) => (
                        <div
                          key={branch.branch_id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => toggleBranch(branch.branch_id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedBranches.includes(branch.branch_id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleBranch(branch.branch_id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{vlcNo.prefix(branch.username)}{branch.username} - {branch.name} - {branch.branchName}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Milk Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  {t('milk_type')}
                </Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full bg-white border-slate-200 hover:border-blue-300 transition-all rounded-lg h-10">
                    <SelectValue placeholder={t('cow')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                    <SelectItem value="all">{t('all')}</SelectItem>
                    <SelectItem value="cow">{t('cow')}</SelectItem>
                    <SelectItem value="buffalo">{t('buffalo')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Shift */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('shift')}</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="w-full bg-white border-slate-200 hover:border-blue-300 transition-all rounded-lg h-10">
                    <SelectValue placeholder={t('morning')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                    <SelectItem value="all">{t('all')}</SelectItem>
                    <SelectItem value="morning">{t('morning')}</SelectItem>
                    <SelectItem value="evening">{t('evening')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range + Apply */}
            <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {t('from_date')}
                  </Label>
                  <Input
                    type="date"
                    value={fromDate ? format(fromDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (isValid(d)) handleFromDateChange(d);
                    }}
                    className="bg-white border-slate-200 hover:border-blue-300 transition-all rounded-lg h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {t('to_date')}
                  </Label>
                  <Input
                    type="date"
                    value={toDate ? format(toDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (isValid(d)) setToDate(d);
                    }}
                    className="bg-white border-slate-200 hover:border-blue-300 transition-all rounded-lg h-10"
                  />
                </div>
              </div>
              <Button 
                onClick={handleApplyFilters}
                disabled={isLoading}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 h-10 rounded-lg shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('loading')}
                  </>
                ) : (
                  t('apply')
                )}
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* VLC List Table */}
      <Card className="border border-slate-200/80 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white py-3 px-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <DatabaseZap className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-700">{t('vlc_list')}</CardTitle>
              {filteredVlcData.length > 0 && (
                <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 text-xs font-medium px-2 py-0.5 rounded-md">
                  {filteredVlcData.length}
                </Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center w-full sm:w-auto mt-3 sm:mt-0 min-w-0">
              <div className="relative w-full sm:w-auto flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-56 bg-slate-50 border-slate-200 rounded-lg h-9 text-sm focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleExportToExcel}
                disabled={vlcData.length === 0}
                className="w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 flex items-center justify-center gap-2 rounded-lg h-9 text-sm font-medium disabled:opacity-40 transition-all"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {t('export')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-100">
                  <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3">
                    {t('vlc_id')}
                  </TableHead>
                  <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3">{t('vlc_name')}</TableHead>
                  <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3">
                    {t('total_milk_ltr')}
                  </TableHead>
                  <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3">{t('average_fat')}</TableHead>
                  <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3">{t('average_snf')}</TableHead>
                  <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3">{t('average_rate')}</TableHead>
                  <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3">{t('total_amount')}</TableHead>
                  <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3">{t('milk_type')}</TableHead>
                  <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3">{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-48">
                      <div className="flex flex-col items-center justify-center text-center py-8">
                        <div className="p-4 bg-slate-100 rounded-2xl mb-3">
                          <Droplets className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                          {!hasApplied ? 'Apply filters to view VLC collection data' : searchQuery ? 'No results match your search' : 'No data found for selected filters'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {!hasApplied ? 'Select VLC centers and date range, then click Apply' : searchQuery ? 'Try a different search term' : 'Try adjusting your filter criteria'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((vlc: any, index: number) => {
                    const branch = branches.find(b => b.branch_id === vlc.dairy_id);
                    const vlcFarmers = farmerData.filter(f => f.dairy_id === vlc.dairy_id);
                    const vlcTotalMilk = vlcFarmers.reduce((sum, f) => sum + (parseFloat(f.quantity) || 0), 0);
                    const wFatSum = vlcFarmers.reduce((sum, f) => sum + ((parseFloat(f.fat) || 0) * (parseFloat(f.quantity) || 0)), 0);
                    const rowAvgFat = vlcTotalMilk > 0
                      ? (wFatSum / vlcTotalMilk).toFixed(2)
                      : '0.00';
                    const wSnfSum = vlcFarmers.reduce((sum, f) => sum + ((parseFloat(f.snf) || 0) * (parseFloat(f.quantity) || 0)), 0);
                    const rowAvgSNF = vlcTotalMilk > 0
                      ? (wSnfSum / vlcTotalMilk).toFixed(2)
                      : '0.00';
                    const totalAmount = vlcFarmers.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
                    const avgRate = vlc.totalMilkLtr > 0 ? (totalAmount / vlc.totalMilkLtr).toFixed(2) : '0.00';
                    
                    return (
                      <TableRow
                        key={index}
                        className="hover:bg-blue-50/50 transition-colors duration-150 cursor-pointer border-b border-slate-50 group"
                        onClick={() => navigate('/dashboard/farmer-management', { state: { dairyId: vlc.dairy_id, fromDate, toDate, selectedType, selectedShift } })}
                      >
                        <TableCell className="font-semibold text-blue-600 px-4 py-3 text-sm group-hover:text-blue-700">
                          {vlcNo.prefix(branch?.username)}{branch?.username || vlc.dairy_id}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-700 font-medium">
                          {branch?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">
                          <span className="font-medium">{vlc.totalMilkLtr.toFixed(2)}</span>
                          <span className="text-slate-400 text-xs ml-1">Ltr</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md text-xs font-medium">
                            {rowAvgFat}%
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-xs font-medium">
                            {rowAvgSNF}%
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">
                          ₹{avgRate}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-semibold text-slate-800">
                          ₹{totalAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          <span className="text-slate-600">
                            {vlc.milkTypes.join(', ')}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          <Badge
                            className={cn(
                              "text-xs font-medium px-2.5 py-0.5 rounded-full border-0",
                              vlc.is_active === 1
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                            )}
                          >
                            <span className={cn(
                              "inline-block w-1.5 h-1.5 rounded-full mr-1.5",
                              vlc.is_active === 1 ? "bg-emerald-500" : "bg-slate-400"
                            )} />
                            {vlc.is_active === 1 ? t('active') : t('inactive')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination */}
        {filteredVlcData.length > 0 && (
          <div className="flex flex-wrap items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <p className="text-xs text-slate-500">
              {t('showing')} <span className="font-medium text-slate-700">{startIndex + 1}</span> {t('to')}{' '}
              <span className="font-medium text-slate-700">{Math.min(endIndex, filteredVlcData.length)}</span> {t('of')}{' '}
              <span className="font-medium text-slate-700">{filteredVlcData.length}</span> {t('entries')}
            </p>
            <div className="flex items-center gap-1.5 mt-2 md:mt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="border-slate-200 rounded-lg h-8 w-8 p-0 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPaginationRange().map((page, idx) => (
                typeof page === 'string' ? (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400 text-xs">...</span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "rounded-lg h-8 w-8 p-0 text-xs font-medium",
                      currentPage === page
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                    )}
                  >
                    {page}
                  </Button>
                )
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="border-slate-200 rounded-lg h-8 w-8 p-0 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VLCCllection;
