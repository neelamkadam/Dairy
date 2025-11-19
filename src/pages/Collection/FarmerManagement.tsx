import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Users, TrendingUp } from "lucide-react";
import { usePostApi } from "@/services/use-api";
import { format as formatDate } from "date-fns";
import { toast } from "react-toastify";


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
  const location = useLocation();
  const { dairyId, fromDate, toDate, selectedType, selectedShift } = location.state || {};
  const { postData, isLoading } = usePostApi({ path: "/web/dashboard/farmer-collections" });
  const [farmerData, setFarmerData] = useState<any[]>([]);

  useEffect(() => {
    if (dairyId && fromDate && toDate) {
      fetchData();
    }
  }, [dairyId]);

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

  const uniqueFarmers = new Set(farmerData.map(f => f.farmer_id)).size;
  const activeFarmers = new Set(farmerData.filter(f => f.is_active === 1).map(f => f.farmer_id)).size;
  const totalMilk = farmerData.reduce((sum, f) => sum + (parseFloat(f.quantity) || 0), 0);

  const stats = [
    { label: "Total Farmers", value: uniqueFarmers.toString(), icon: Users, color: "bg-blue-500" },
    { label: "Active Farmers", value: activeFarmers.toString(), icon: TrendingUp, color: "bg-green-500" },
    { label: "Total Milk", value: `${totalMilk.toFixed(1)}L`, icon: Users, color: "bg-orange-500" }
  ];
  return (
    <>
    <div className="space-y-6 animate-in slide-in-from-bottom-4 text-left duration-500 m-5">
            <div className="text-2xl font-semibold text-gray-800">Farmers Management</div>
            
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
                    <span className="text-sm text-gray-600">Record Count: {farmerData.length} records</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Result per page:</span>
                      <Select defaultValue="100">
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel Export
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                      <FileText className="h-4 w-4 mr-2" />
                      PDF Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-700">Date</th>
                        <th className="text-left p-4 font-medium text-gray-700">Farmer Id</th>
                        <th className="text-left p-4 font-medium text-gray-700">Name</th>
                        <th className="text-left p-4 font-medium text-gray-700">Liter</th>
                        <th className="text-left p-4 font-medium text-gray-700">Kg</th>
                        <th className="text-left p-4 font-medium text-gray-700">Fat</th>
                        <th className="text-left p-4 font-medium text-gray-700">Snf</th>
                        <th className="text-left p-4 font-medium text-gray-700">Clr</th>
                        <th className="text-left p-4 font-medium text-gray-700">Milk Type</th>
                        <th className="text-left p-4 font-medium text-gray-700">Shift</th>
                        <th className="text-left p-4 font-medium text-gray-700">Rate</th>
                        <th className="text-left p-4 font-medium text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmerData.map((farmer, idx) => (
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
                  <Button variant="outline" size="sm">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
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
