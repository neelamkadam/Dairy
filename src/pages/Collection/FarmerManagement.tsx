import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Users, TrendingUp } from "lucide-react";
import { usePostApi } from "@/services/use-api";
import { format as formatDate } from "date-fns";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";


interface FarmerData {
  id: string;
  date: string;
  farmerId: string;
  name: string;
  liter: number;
  kg: number;
  fat: number;
  snf: number;
  clr: number;
  milkType: string;
  userId: string;
  shift: string;
  rate: number;
  amount: number;
}

const FarmerManagement = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { dairyId, fromDate, toDate, selectedType, selectedShift } = location.state || {};
  const { postData, isLoading } = usePostApi({ path: "/web/dashboard/farmer-collections" });
  const [farmerData, setFarmerData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [groupedByDate, setGroupedByDate] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (dairyId && fromDate && toDate) {
      fetchData();
    }
  }, [dairyId]);

  useEffect(() => {
    const grouped = farmerData.reduce((acc, item) => {
      const date = formatDate(new Date(item.created_at), "yyyy-MM-dd");
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.farmer_id.localeCompare(b.farmer_id));
    });
    
    setGroupedByDate(grouped);
  }, [farmerData]);

  const fetchData = async () => {
    try {
      const payload = {
        branches: [dairyId],
        type: selectedType === "all" ? "All" : selectedType.charAt(0).toUpperCase() + selectedType.slice(1),
        shift: selectedShift === "all" ? "All" : selectedShift.charAt(0).toUpperCase() + selectedShift.slice(1),
        from_date: formatDate(fromDate, "yyyy-MM-dd"),
        to_date: formatDate(toDate, "yyyy-MM-dd")
      };
      const response = await postData(payload);
      if (response?.data?.success) {
        setFarmerData(response.data.data || []);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch data");
    }
  };

  const handleExcelExport = () => {
    const sortedData = [...farmerData].sort((a, b) => a.farmer_id.localeCompare(b.farmer_id));
    const exportData = sortedData.map(f => ({
      Date: formatDate(new Date(f.created_at), "dd-MM-yyyy"),
      "Farmer ID": f.farmer_id,
      Name: f.fullName,
      Liter: f.quantity.toFixed(1),
      Kg: (f.quantity * 1.03).toFixed(2),
      Fat: f.fat.toFixed(1),
      SNF: f.snf.toFixed(1),
      CLR: f.clr.toFixed(1),
      "Milk Type": f.type,
      Shift: f.shift,
      Rate: f.rate.toFixed(2),
      Amount: f.amount.toFixed(2)
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Farmers");
    XLSX.writeFile(wb, `Farmers_${formatDate(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("Excel exported successfully");
  };

  const handlePdfExport = () => {
    const sortedData = [...farmerData].sort((a, b) => a.farmer_id.localeCompare(b.farmer_id));
    const doc = new jsPDF();
    doc.text("Farmer Collections Report", 14, 15);
    (doc as any).autoTable({
      head: [["Date", "Farmer ID", "Name", "Liter", "Fat", "SNF", "Type", "Shift", "Rate", "Amount"]],
      body: sortedData.map(f => [
        formatDate(new Date(f.created_at), "dd-MM-yyyy"),
        f.farmer_id,
        f.fullName,
        f.quantity.toFixed(1),
        f.fat.toFixed(1),
        f.snf.toFixed(1),
        f.type,
        f.shift,
        f.rate.toFixed(2),
        f.amount.toFixed(2)
      ]),
      startY: 20
    });
    doc.save(`Farmers_${formatDate(new Date(), "dd-MM-yyyy")}.pdf`);
    toast.success("PDF exported successfully");
  };

  const dates = Object.keys(groupedByDate).sort().reverse();
  const totalPages = dates.length;
  const currentDate = dates[currentPage - 1];
  const currentData = currentDate ? groupedByDate[currentDate] : [];

  const uniqueFarmers = new Set(farmerData.map(f => f.farmer_id)).size;
  const activeFarmers = new Set(farmerData.filter(f => f.is_active === 1).map(f => f.farmer_id)).size;
  const totalMilk = farmerData.reduce((sum, f) => sum + (parseFloat(f.quantity) || 0), 0);

  const stats = [
    { label: t('total_farmers'), value: uniqueFarmers.toString(), icon: Users, color: "bg-blue-500" },
    { label: t('active_farmers'), value: activeFarmers.toString(), icon: TrendingUp, color: "bg-green-500" },
    { label: t('total_milk'), value: `${totalMilk.toFixed(1)}L`, icon: Users, color: "bg-orange-500" }
  ];
  return (
    <>
    <div className="space-y-6 animate-in slide-in-from-bottom-4 text-left duration-500 m-5">
            <div className="text-2xl font-semibold text-gray-800">{t('farmers_management')}</div>
            
            {/* Stats Cards */}
            <div className="grid w-[85%] grid-cols-1 md:grid-cols-3 gap-6">
              {stats.map((stat, index) => (
                <Card key={index} className="hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      </div>
                      <div className={cn("p-3 rounded-lg", stat.color)}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Data Table */}
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
              <CardHeader className="border-b bg-gray-50/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{t('record_count')}: {currentData.length} {t('records')}</span>
                    <span className="text-sm text-gray-600">Date: {currentDate ? formatDate(new Date(currentDate), "dd-MM-yyyy") : ""}</span>
                    <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleExcelExport} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      {t('excel_export')}
                    </Button>
                    <Button size="sm" onClick={handlePdfExport} className="bg-red-600 hover:bg-red-700 text-white">
                      <FileText className="h-4 w-4 mr-2" />
                      {t('pdf_export')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-700">{t('date')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('farmer_id')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('name')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('liter')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('kg')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('fat')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('snf')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('clr')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('milk_type')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('shift')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('rate')}</th>
                        <th className="text-left p-4 font-medium text-gray-700">{t('amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.map((farmer, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-gray-700">{formatDate(new Date(farmer.created_at), "dd-MM-yyyy")}</td>
                          <td className="p-4 text-gray-700">{farmer.farmer_id}</td>
                          <td className="p-4 text-gray-700">{farmer.fullName}</td>
                          <td className="p-4 text-gray-700">{farmer.quantity.toFixed(1)}</td>
                          <td className="p-4 text-gray-700">{(farmer.quantity * 1.03).toFixed(2)}</td>
                          <td className="p-4 text-gray-700">{farmer.fat.toFixed(1)}</td>
                          <td className="p-4 text-gray-700">{farmer.snf.toFixed(1)}</td>
                          <td className="p-4 text-gray-700">{farmer.clr.toFixed(1)}</td>
                          <td className="p-4">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {farmer.type}
                            </Badge>
                          </td>
                          <td className="p-4 text-gray-700">{farmer.shift}</td>
                          <td className="p-4 text-gray-700">{farmer.rate.toFixed(2)}</td>
                          <td className="p-4 text-gray-700">{farmer.amount.toFixed(2)} /-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-1 justify-center p-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 text-sm">{currentPage} / {totalPages}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
      
    </>
  )
}

export default FarmerManagement
