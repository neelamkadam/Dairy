import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/store";
import { usePostApi } from "@/services/use-api";
import { toast } from "react-toastify";

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ccApi } from "@/services/routeBmcCcApi";

const ChillingCenter = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authState = useAppSelector((state) => state.authData);
  const userId = authState?.userData?.id ? Number(authState.userData.id) : null;
  
  const { postData, isLoading } = usePostApi({
    path: "/web/dashboard/farmer-collections"
  });

  const [toDate, setToDate] = useState<Date>();
  const [fromDate, setFromDate] = useState<Date>();
  
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<number[]>([]);
  
  const [selectedType, setSelectedType] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [farmerData, setFarmerData] = useState<any[]>([]);
  const [vlcToEntityMap, setVlcToEntityMap] = useState<Record<number, number>>({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleEntity = (id: number) => {
    setSelectedEntities(prev => 
      prev.includes(id) 
        ? prev.filter(eId => eId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEntities.length === entities.length) {
      setSelectedEntities([]);
    } else {
      setSelectedEntities(entities.map(e => Number(e.cc_id ?? e.id)));
    }
  };
  
  const aggregatedData = farmerData.reduce((acc: any[], item) => {
    const eId = vlcToEntityMap[item.dairy_id];
    if (!eId) return acc;
    
    const existing = acc.find((v: any) => v.entityId === eId);
    if (existing) {
      existing.totalMilkLtr += parseFloat(item.quantity) || 0;
      if (!existing.milkTypes.includes(item.type)) {
        existing.milkTypes.push(item.type);
      }
    } else {
      acc.push({
        entityId: eId,
        totalMilkLtr: parseFloat(item.quantity) || 0,
        milkTypes: [item.type],
        is_active: 1
      });
    }
    return acc;
  }, []);
  
  selectedEntities.forEach(eId => {
    if (!aggregatedData.find((v: any) => v.entityId === eId)) {
      aggregatedData.push({
        entityId: eId,
        totalMilkLtr: 0,
        milkTypes: [],
        is_active: 1
      });
    }
  });
  
  const totalPages = Math.max(1, Math.ceil(aggregatedData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = aggregatedData.slice(startIndex, endIndex);

  const getDateRangeForPeriod = (date: Date) => {
    const day = date.getDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    if (day <= 10) {
      return { from: new Date(year, month, 1), to: new Date(year, month, 10) };
    } else if (day <= 20) {
      return { from: new Date(year, month, 11), to: new Date(year, month, 20) };
    } else {
      return { from: new Date(year, month, 21), to: new Date(year, month, lastDay) };
    }
  };

  useEffect(() => {
    const today = new Date();
    const range = getDateRangeForPeriod(today);
    setFromDate(range.from);
    setToDate(range.to);
  }, []);
  
  useEffect(() => {
    if (userId) {
      ccApi.list(userId)
        .then(res => {
          const raw = res?.data?.data ?? res?.data ?? [];
          setEntities(Array.isArray(raw) ? raw : []);
        })
        .catch(err => console.error(err));
    }
  }, [userId]);

  const handleApplyFilters = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select both from and to dates");
      return;
    }

    if (selectedEntities.length === 0) {
      toast.error("Please select at least one CC");
      return;
    }

    try {
      const vlcPromises = selectedEntities.map(eId => 
        ccApi.vlcs(eId)
          .then(res => {
            const raw = res?.data?.data ?? res?.data ?? [];
            return { eId, vlcs: Array.isArray(raw) ? raw : [] };
          })
          .catch(() => ({ eId, vlcs: [] }))
      );
      
      const vlcResults = await Promise.all(vlcPromises);
      
      const newVlcToEntityMap: Record<number, number> = {};
      const allVlcIds = new Set<number>();
      
      vlcResults.forEach(({ eId, vlcs }) => {
        vlcs.forEach((vlc: any) => {
          const vlcId = vlc.branch_id ?? vlc.id;
          newVlcToEntityMap[vlcId] = eId;
          allVlcIds.add(vlcId);
        });
      });
      
      setVlcToEntityMap(newVlcToEntityMap);
      
      if (allVlcIds.size === 0) {
        toast.info("No dairies found under the selected CCs.");
        setFarmerData([]);
        setCurrentPage(1);
        return;
      }

      const payload = {
        branches: Array.from(allVlcIds),
        type: selectedType === "all" ? "All" : selectedType.charAt(0).toUpperCase() + selectedType.slice(1),
        shift: selectedShift === "all" ? "All" : selectedShift.charAt(0).toUpperCase() + selectedShift.slice(1),
        from_date: format(fromDate, "yyyy-MM-dd"),
        to_date: format(toDate, "yyyy-MM-dd")
      };

      const response = await postData(payload);
      
      if (response?.data?.success) {
        setFarmerData(response.data.data || []);
        setCurrentPage(1);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch data");
    }
  };

  const totalMilk = farmerData.reduce((sum, f) => sum + (parseFloat(f.quantity) || 0), 0);
  
  const weightedFatSum = farmerData.reduce((sum, f) => sum + ((parseFloat(f.fat) || 0) * (parseFloat(f.quantity) || 0)), 0);
  const avgFat = totalMilk > 0 ? (weightedFatSum / totalMilk).toFixed(2) : "0.0";
  
  const weightedSnfSum = farmerData.reduce((sum, f) => sum + ((parseFloat(f.snf) || 0) * (parseFloat(f.quantity) || 0)), 0);
  const avgSNF = totalMilk > 0 ? (weightedSnfSum / totalMilk).toFixed(2) : "0.0";
  
  const totalPayments = farmerData.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

  const handleExportToExcel = () => {
    const exportData = aggregatedData.map((data) => {
      const entity = entities.find(e => Number(e.cc_id ?? e.id) === data.entityId);
      const eFarmers = farmerData.filter(f => vlcToEntityMap[f.dairy_id] === data.entityId);
      
      const eTotalMilk = eFarmers.reduce((sum, f) => sum + (parseFloat(f.quantity) || 0), 0);
      const weightedFatSum = eFarmers.reduce((sum, f) => sum + ((parseFloat(f.fat) || 0) * (parseFloat(f.quantity) || 0)), 0);
      const avgFat = eTotalMilk > 0 ? (weightedFatSum / eTotalMilk).toFixed(2) : '0.00';
      
      const weightedSnfSum = eFarmers.reduce((sum, f) => sum + ((parseFloat(f.snf) || 0) * (parseFloat(f.quantity) || 0)), 0);
      const avgSNF = eTotalMilk > 0 ? (weightedSnfSum / eTotalMilk).toFixed(2) : '0.00';
      
      const totalAmount = eFarmers.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
      const avgRate = data.totalMilkLtr > 0 ? (totalAmount / data.totalMilkLtr).toFixed(2) : '0.00';
      
      return {
        'CC ID': entity?.cc_id ?? entity?.id ?? data.entityId,
        'CC Name': entity?.name || 'N/A',
        'Total Milk (Ltr)': data.totalMilkLtr.toFixed(2),
        'Total Milk (Kg)': (data.totalMilkLtr * 1.03).toFixed(2),
        'Average FAT (%)': avgFat,
        'Average SNF (%)': avgSNF,
        'Average Rate (₹)': avgRate,
        'Total Amount (₹)': totalAmount,
        'Milk Type': data.milkTypes.join(', '),
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CC Collection');
    XLSX.writeFile(wb, `CC_Collection_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Excel file exported successfully');
  };

  const centerStats = [
    {
      label: 'CC Center',
      value: selectedEntities.length.toString(),
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
        CC Collection Dashboard
      </div>

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

      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="border-b">
          <CardTitle className="text-xl font-semibold text-gray-800">{t('filter_options')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                CC ID
              </Label>
              <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-gray-50 border-gray-200"
                  >
                    {selectedEntities.length === 0 
                      ? `Select CCs` 
                      : `${selectedEntities.length} CC(s) selected`}
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
                      {selectedEntities.length === entities.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    {selectedEntities.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEntities([])}
                        className="flex-1 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2">
                    {entities?.map((e) => {
                      const eId = Number(e.cc_id ?? e.id);
                      return (
                        <div
                          key={eId}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => toggleEntity(eId)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedEntities.includes(eId)}
                            onChange={(ev) => {
                              ev.stopPropagation();
                              toggleEntity(eId);
                            }}
                            onClick={(ev) => ev.stopPropagation()}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{eId} - {e.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
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
              <Input
                type="date"
                value={fromDate ? format(fromDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  if (isValid(d)) setFromDate(d);
                }}
                className="bg-gray-50 border-gray-200 w-full h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t('to_date')}
              </Label>
              <Input
                type="date"
                value={toDate ? format(toDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  if (isValid(d)) setToDate(d);
                }}
                className="bg-gray-50 border-gray-200 w-full h-10"
              />
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

      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <CardTitle className="text-xl font-semibold text-gray-800">CC List</CardTitle>
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
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">CC ID</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">CC Name</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('total_milk_ltr')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('average_fat')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('average_snf')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('average_rate')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('total_amount')}</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">{t('milk_type')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((data, index) => {
                  const entity = entities.find(e => Number(e.cc_id ?? e.id) === data.entityId);
                  const eFarmers = farmerData.filter(f => vlcToEntityMap[f.dairy_id] === data.entityId);
                  const eTotalMilk = eFarmers.reduce((sum, f) => sum + (parseFloat(f.quantity) || 0), 0);
                  const weightedFatSum = eFarmers.reduce((sum, f) => sum + ((parseFloat(f.fat) || 0) * (parseFloat(f.quantity) || 0)), 0);
                  const avgFat = eTotalMilk > 0 ? (weightedFatSum / eTotalMilk).toFixed(2) : '0.00';
                  const weightedSnfSum = eFarmers.reduce((sum, f) => sum + ((parseFloat(f.snf) || 0) * (parseFloat(f.quantity) || 0)), 0);
                  const avgSNF = eTotalMilk > 0 ? (weightedSnfSum / eTotalMilk).toFixed(2) : '0.00';
                  const totalAmount = eFarmers.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
                  const avgRate = data.totalMilkLtr > 0 ? (totalAmount / data.totalMilkLtr).toFixed(2) : '0.00';
                  
                  return (
                    <TableRow key={index} className="hover:bg-blue-100 transition-colors">
                      <TableCell className="font-medium px-4 py-3">
                        {entity?.cc_id ?? entity?.id ?? data.entityId}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {entity?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600">
                        {data.totalMilkLtr.toFixed(2)} Ltr
                      </TableCell>
                      <TableCell className="px-4 py-3">{avgFat}%</TableCell>
                      <TableCell className="px-4 py-3">{avgSNF}%</TableCell>
                      <TableCell className="px-4 py-3">₹{avgRate}</TableCell>
                      <TableCell className="px-4 py-3">₹{totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="px-4 py-3">{data.milkTypes.join(', ')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {aggregatedData.length > 0 && (
          <div className="flex flex-wrap items-center justify-between border-t bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-600">
              {t('showing')} {startIndex + 1} {t('to')} {Math.min(endIndex, aggregatedData.length)} {t('of')} {aggregatedData.length} {t('entries')}
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
                    currentPage === page && "bg-blue-600 hover:bg-blue-700 text-white"
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

export default ChillingCenter;
