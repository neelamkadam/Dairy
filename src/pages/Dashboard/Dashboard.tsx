import { useState, useEffect } from "react";
import { Users, Droplets, TrendingUp, Activity, Calendar, Clock, Sun, Moon, IndianRupee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import KPICard from "@/components/KPICard";
import FatSnfCard from "@/components/FatSnfCard";
import MilkCollectionChart from "@/components/MilkCollectionChart";
import FarmersChart from "@/components/FarmersCharts";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { fetchCollectionsSummary } from "@/redux/dashboardSlice";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { t } = useTranslation();
  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 16 ? 'evening' : 'morning';
  };

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedShift, setSelectedShift] = useState(getDefaultShift());
  const dispatch = useAppDispatch();
  const { branches = [] } = useAppSelector((state: any) => state.branch);
  const { collections = [], graph = [], loading } = useAppSelector((state: any) => state.dashboard);

  const fetchDashboardData = () => {
    if (branches.length > 0) {
      const shiftValue = selectedShift === 'morning' ? 'Morning' : 'Evening';
      const payload = {
        branches: branches.map(branch => branch.branch_id),
        date: selectedDate,
        shift: shiftValue
      };
      dispatch(fetchCollectionsSummary(payload));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, selectedShift, branches]);

  useEffect(() => {
    const checkDate = setInterval(() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const currentDate = `${year}-${month}-${day}`;
      
      if (currentDate !== selectedDate) {
        setSelectedDate(currentDate);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkDate);
  }, [selectedDate]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Calculate KPI data from collections
  const calculateKPIs = () => {
    if (!collections?.length) return {
      totalQuantity: 0,
      avgFat: 0,
      avgSnf: 0,
      totalAmount: 0,
      totalFarmers: 0,
      totalRegisteredFarmers: 0,
      avgRate: 0,
      avgQuantity: 0
    };

    const totalQuantity = collections.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = collections.reduce((sum, item) => sum + item.amount, 0);
    const totalFarmers = collections.reduce((sum, item) => sum + item.farmers, 0);
    const totalRegisteredFarmers = collections.reduce((sum, item) => sum + (item.registered_farmers || 0), 0);
    const avgFat = totalQuantity > 0 ? collections.reduce((sum, item) => sum + (item.fat * item.quantity), 0) / totalQuantity : 0;
    const avgSnf = totalQuantity > 0 ? collections.reduce((sum, item) => sum + (item.snf * item.quantity), 0) / totalQuantity : 0;
    const avgRate = totalQuantity > 0 ? totalAmount / totalQuantity : 0;
    const activeCollections = collections.filter(c => c.quantity > 0).length;
    const avgQuantity = activeCollections > 0 ? totalQuantity / activeCollections : 0;

    return { totalQuantity, avgFat, avgSnf, totalAmount, totalFarmers, totalRegisteredFarmers, avgRate, avgQuantity };
  };

  const kpis = calculateKPIs();
  const activeCenters = (collections || []).filter(c => c.quantity > 0).length;
  const avgPerFarmer = kpis.totalFarmers > 0 ? kpis.totalQuantity / kpis.totalFarmers : 0;
  
  const kpiData = [
    {
      title: t('vlcc_center'),
      value: `${activeCenters} (${branches.length})`,
      change: "",
      icon: Users,
      gradient: "bg-gradient-to-br from-cyan-400 to-cyan-600"
    },
    {
      title: t('total_active_farmers'),
      value: `${kpis.totalFarmers} (${kpis.totalRegisteredFarmers})`,
      change: "",
      icon: Users,
      gradient: "bg-gradient-to-br from-green-400 to-green-600"
    },
    {
      title: t('total_milk_collection'),
      value: `${kpis.totalQuantity.toFixed(1)}L`,
      change: "",
      icon: Droplets,
      gradient: "bg-gradient-to-br from-blue-400 to-blue-600"
    },
    {
      title: t('total_amount'),
      value: `₹${kpis.totalAmount.toFixed(2)}`,
      change: "",
      icon: IndianRupee,
      gradient: "bg-gradient-to-br from-purple-400 to-purple-600"
    },
    {
      title: "Average per Farmer",
      value: `${avgPerFarmer.toFixed(2)}L`,
      change: "",
      icon: Users,
      gradient: "bg-gradient-to-br from-pink-400 to-pink-600"
    },
    {
      title: t('average_quantity'),
      value: `${kpis.avgQuantity.toFixed(2)}L`,
      change: "",
      icon: Droplets,
      gradient: "bg-gradient-to-br from-indigo-400 to-indigo-600"
    },
    {
      title: t('average_rate'),
      value: `₹${kpis.avgRate.toFixed(2)}`,
      change: "",
      icon: IndianRupee,
      gradient: "bg-gradient-to-br from-orange-400 to-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">     
      <main className="p-4 md:p-6 space-y-4 md:space-y-6 text-left max-w-full">
        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('dashboard_overview')}</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          {/* Date, Time & Shift Selector */}
          <div className="flex items-center justify-center lg:justify-end w-full">
            <Card className="shadow-sm w-full lg:w-auto">
              <CardContent className="p-3 lg:p-2">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full justify-center sm:justify-start">
                  <div className="flex items-center gap-2 min-w-0 flex-shrink">
                    <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="text-xs sm:text-sm font-medium border-none outline-none bg-transparent min-w-0 flex-shrink cursor-pointer"
                    />
                  </div>
                  
                  <div className="hidden sm:block h-4 w-px bg-gray-300 flex-shrink-0"></div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">{getCurrentTime()}</span>
                  </div>
                  
                  <div className="hidden sm:block h-4 w-px bg-gray-300 flex-shrink-0"></div>
                  
                  <div className="min-w-0 flex-shrink">
                    <Select value={selectedShift} onValueChange={setSelectedShift}>
                      <SelectTrigger className="w-full sm:w-32 h-8 border-none shadow-none bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="morning" className="hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Sun className="w-4 h-4 text-orange-500" />
                            {t('morning')}
                          </div>
                        </SelectItem>
                        <SelectItem value="evening" className="hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-blue-500" />
                            {t('evening')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {kpiData.slice(0, 4).map((kpi, index) => (
            <KPICard
              key={index}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              icon={kpi.icon}
              gradient={kpi.gradient}
            />
          ))}
          <FatSnfCard fat={kpis.avgFat} snf={kpis.avgSnf} />
          {kpiData.slice(4).map((kpi, index) => (
            <KPICard
              key={index + 4}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              icon={kpi.icon}
              gradient={kpi.gradient}
            />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Pie Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-semibold">Farmer Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 md:h-80 w-full overflow-hidden">
                <FarmersChart collections={collections} branches={branches} />
              </div>
            </CardContent>
          </Card>
          
          {/* Line Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-semibold">7-Day Collection Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 md:h-80 w-full overflow-hidden">
                <MilkCollectionChart graph={graph} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;