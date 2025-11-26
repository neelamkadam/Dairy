import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/store";
import { usePostApi } from "@/services/use-api";
import { toast } from "react-toastify";
import { format as formatDate } from "date-fns";
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
  EllipsisVertical,
  IndianRupee,
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

interface VLCCData {
  id: string;
  name: string;
  totalMilkLtr: number;
  totalMilkKg: number;
  milkType: string;
  status: "Active" | "Inactive";
}

const VLCCllection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { branches } = useAppSelector((state) => state.branch);
  const { postData, isLoading } = usePostApi({
    path: "/web/dashboard/farmer-collections"
  });

  const [toDate, setToDate] = useState<Date>();
  const [fromDate, setFromDate] = useState<Date>();
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [farmerData, setFarmerData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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
  
  const totalPages = Math.ceil(vlcData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = vlcData.slice(startIndex, endIndex);

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

    try {
      const branchIds = selectedBranch === "all" 
        ? branches.map(b => b.branch_id) 
        : [parseInt(selectedBranch)];

      const payload = {
        branches: branchIds,
        type: selectedType === "all" ? "All" : selectedType.charAt(0).toUpperCase() + selectedType.slice(1),
        shift: selectedShift === "all" ? "All" : selectedShift.charAt(0).toUpperCase() + selectedShift.slice(1),
        from_date: formatDate(fromDate, "yyyy-MM-dd"),
        to_date: formatDate(toDate, "yyyy-MM-dd")
      };

      const response = await postData(payload);
      console.log('API Response:', response);
      
      if (response?.data?.success) {
        setFarmerData(response.data.data || []);
        setCurrentPage(1);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch data");
    }
  };

  // Calculate stats from farmer data
  const uniqueVLCCs = new Set(farmerData.map(f => f.dairy_id)).size;
  const totalMilk = farmerData.reduce((sum, f) => sum + (parseFloat(f.quantity) || 0), 0);
  const avgFat = farmerData.length > 0 
    ? (farmerData.reduce((sum, f) => sum + (parseFloat(f.fat) || 0), 0) / farmerData.length).toFixed(1)
    : "0.0";
  const avgSNF = farmerData.length > 0
    ? (farmerData.reduce((sum, f) => sum + (parseFloat(f.snf) || 0), 0) / farmerData.length).toFixed(1)
    : "0.0";
  const totalPayments = farmerData.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

  const handleExportToExcel = () => {
    const exportData = vlcData.map((vlc) => {
      const branch = branches.find(b => b.branch_id === vlc.dairy_id);
      const vlcFarmers = farmerData.filter(f => f.dairy_id === vlc.dairy_id);
      const avgFat = vlcFarmers.length > 0 
        ? (vlcFarmers.reduce((sum, f) => sum + (parseFloat(f.fat) || 0), 0) / vlcFarmers.length).toFixed(2)
        : '0.00';
      const avgSNF = vlcFarmers.length > 0
        ? (vlcFarmers.reduce((sum, f) => sum + (parseFloat(f.snf) || 0), 0) / vlcFarmers.length).toFixed(2)
        : '0.00';
      const totalAmount = vlcFarmers.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
      const avgRate = vlc.totalMilkLtr > 0 ? (totalAmount / vlc.totalMilkLtr).toFixed(2) : '0.00';
      
      return {
        'VLC ID': branch?.username || vlc.dairy_id,
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
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    {
      label: t('total_milk_collection'),
      value: `${totalMilk.toFixed(1)}L`,
      icon: TrendingUp,
      color: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      label: t('average_fat'),
      value: `${avgFat}%`,
      icon: TrendingUp,
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
    {
      label: t('average_snf'),
      value: `${avgSNF}%`,
      icon: TrendingUp,
      color: "bg-gradient-to-br from-orange-500 to-orange-600",
    },
    {
      label: t('total_payments'),
      value: `₹${totalPayments.toFixed(2)}`,
      icon: IndianRupee,
      color: "bg-gradient-to-br from-teal-500 to-teal-600",
    },
  ];

  return (
    <div className="space-y-4 bg-gray-50 min-h-screen p-4">
      <div className="text-xl font-bold text-gray-800">
        {t('vlc_collection_dashboard')}
      </div>

      {/* Center Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {centerStats.map((stat, index) => (
          <Card
            key={index}
            className={cn(
              "hover:shadow-xl transition-all duration-300 border-0",
              stat.color
            )}
          >
            <CardContent className="p-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="border-b">
          <CardTitle className="text-xl font-semibold text-gray-800">{t('filter_options')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t('vlc_id')}
              </Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                  <SelectValue placeholder={t('all')} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                      {branch.username} - {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t('milk_type')}
              </Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                  <SelectValue placeholder={t('cow')} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="cow">{t('cow')}</SelectItem>
                  <SelectItem value="buffalo">{t('buffalo')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t('shift')}</Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                  <SelectValue placeholder={t('morning')} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="morning">{t('morning')}</SelectItem>
                  <SelectItem value="evening">{t('evening')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t('from_date')}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-gray-50 border-gray-200"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "dd-MM-yyyy") : t('select_date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={handleFromDateChange}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t('to_date')}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-gray-50 border-gray-200"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "dd-MM-yyyy") : t('select_date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button 
            onClick={handleApplyFilters}
            disabled={isLoading}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 disabled:opacity-50"
          >
            {isLoading ? t('loading') : t('apply')}
          </Button>
        </CardContent>
      </Card>

      {/* VLCC List */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <CardTitle className="text-xl font-semibold text-gray-800">{t('vlc_list')}</CardTitle>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('search')}
                  className="pl-10 w-full sm:w-64 bg-gray-50 border-gray-200"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleExportToExcel}
                className="border-gray-200 flex bg-green-600 text-white items-center gap-2 hover:bg-green-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t('export')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">
                    {t('vlc_id')}
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('vlc_name')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">
                    {t('total_milk_ltr')}
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('average_fat')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('average_snf')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('average_rate')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('total_amount')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('milk_type')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((vlc, index) => {
                  const branch = branches.find(b => b.branch_id === vlc.dairy_id);
                  const vlcFarmers = farmerData.filter(f => f.dairy_id === vlc.dairy_id);
                  const avgFat = vlcFarmers.length > 0 
                    ? (vlcFarmers.reduce((sum, f) => sum + (parseFloat(f.fat) || 0), 0) / vlcFarmers.length).toFixed(2)
                    : '0.00';
                  const avgSNF = vlcFarmers.length > 0
                    ? (vlcFarmers.reduce((sum, f) => sum + (parseFloat(f.snf) || 0), 0) / vlcFarmers.length).toFixed(2)
                    : '0.00';
                  const totalAmount = vlcFarmers.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
                  const avgRate = vlc.totalMilkLtr > 0 ? (totalAmount / vlc.totalMilkLtr).toFixed(2) : '0.00';
                  
                  return (
                    <TableRow
                      key={index}
                      className="hover:bg-blue-100 transition-colors cursor-pointer"
                      onClick={() => navigate('/dashboard/farmer-management', { state: { dairyId: vlc.dairy_id, fromDate, toDate, selectedType, selectedShift } })}
                    >
                      <TableCell className="font-medium px-4 py-3">
                        {branch?.username || vlc.dairy_id}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {branch?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600">
                        {vlc.totalMilkLtr.toFixed(2)} Ltr
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {avgFat}%
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {avgSNF}%
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        ₹{avgRate}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        ₹{totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {vlc.milkTypes.join(', ')}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          className={
                            vlc.is_active === 1
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                          }
                        >
                          {vlc.is_active === 1 ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {farmerData.length > 0 && (
          <div className="flex flex-wrap items-center justify-between border-t bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-600">
              {t('showing')} {startIndex + 1} {t('to')} {Math.min(endIndex, vlcData.length)} {t('of')} {vlcData.length} {t('entries')}
            </div>
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="border-gray-200"
              >
                {t('previous')}
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "border-gray-200",
                    currentPage === page &&
                      "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="border-gray-200"
              >
                {t('next')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VLCCllection;
