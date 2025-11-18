import { useState, useEffect } from "react";
import { Users, Droplets, TrendingUp, Activity, Calendar, Clock, Sun, Moon, IndianRupee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import KPICard from "@/components/KPICard";
import MilkCollectionChart from "@/components/MilkCollectionChart";
import FarmersChart from "@/components/FarmersCharts";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { fetchCollectionsSummary } from "@/redux/dashboardSlice";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('morning');
  const dispatch = useAppDispatch();
  const { branches } = useAppSelector(state => state.branch);
  const { collections, loading } = useAppSelector(state => state.dashboard);
  
  const handleDateClick = () => {
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    if (dateInput) {
      dateInput.showPicker();
    }
  };

  const fetchDashboardData = () => {
    if (branches.length > 0) {
      const shiftValue = selectedShift === 'morning' ? 'Morning' : 'Evening';
      dispatch(fetchCollectionsSummary({
        branches,
        date: selectedDate,
        shift: shiftValue
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, selectedShift, branches]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Calculate KPI data from collections
  const calculateKPIs = () => {
    if (!collections.length) return {
      totalQuantity: 0,
      avgFat: 0,
      avgSnf: 0,
      totalAmount: 0
    };

    const totalQuantity = collections.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = collections.reduce((sum, item) => sum + item.amount, 0);
    const avgFat = totalQuantity > 0 ? collections.reduce((sum, item) => sum + (item.fat * item.quantity), 0) / totalQuantity : 0;
    const avgSnf = totalQuantity > 0 ? collections.reduce((sum, item) => sum + (item.snf * item.quantity), 0) / totalQuantity : 0;

    return { totalQuantity, avgFat, avgSnf, totalAmount };
  };

  const kpis = calculateKPIs();
  const kpiData = [
    {
      title: "VLCC Center",
      value: branches.length.toString(),
      change: "0%",
      icon: Users,
      gradient: "bg-gradient-to-br from-cyan-400 to-cyan-600"
    },
    {
      title: "Total Milk Collection",
      value: `${kpis.totalQuantity.toFixed(1)}L`,
      change: "0%",
      icon: Droplets,
      gradient: "bg-gradient-to-br from-blue-400 to-blue-600"
    },
    {
      title: "Average Fat %",
      value: kpis.avgFat.toFixed(2),
      change: "0%",
      icon: TrendingUp,
      gradient: "bg-gradient-to-br from-teal-400 to-teal-600"
    },
    {
      title: "Average SNF %",
      value: kpis.avgSnf.toFixed(2),
      change: "0%",
      icon: Activity,
      gradient: "bg-gradient-to-br from-cyan-500 to-cyan-700"
    },
    {
      title: "Total Payments",
      value: `₹${kpis.totalAmount.toFixed(2)}`,
      change: "0%",
      icon: IndianRupee,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">     
      <main className="p-4 md:p-6 space-y-4 md:space-y-6 text-left">
        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          {/* Date, Time & Shift Selector */}
          <div className="flex items-center justify-center lg:justify-end">
            <Card className="shadow-sm w-full lg:w-auto">
              <CardContent className="p-3 lg:p-2">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full">
                  <div className="flex items-center gap-2 min-w-0 flex-shrink relative cursor-pointer" onClick={handleDateClick}>
                    <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="text-xs sm:text-sm font-medium border-none outline-none bg-transparent min-w-0 flex-shrink cursor-pointer pointer-events-none"
                    />
                    <div className="absolute inset-0 cursor-pointer" onClick={handleDateClick}></div>
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
                            Morning
                          </div>
                        </SelectItem>
                        <SelectItem value="evening" className="hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-blue-500" />
                            Evening
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          {kpiData.map((kpi, index) => (
            <KPICard
              key={index}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              icon={kpi.icon}
              gradient={kpi.gradient}
            />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {/* Pie Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-semibold">Farmers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 md:h-80 flex items-center justify-center text-gray-500 text-sm md:text-base">
                Pie Chart Component (API Pending)
              </div>
            </CardContent>
          </Card>
          
          {/* Weekly Milk Collection Trends */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-semibold">Weekly Milk Collection Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 md:h-80 flex items-center justify-center text-gray-500 text-sm md:text-base">
                Weekly Trends Chart (API Pending)
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;