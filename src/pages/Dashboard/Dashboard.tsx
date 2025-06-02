import { Users, Droplets, TrendingUp, Activity, DollarSign } from "lucide-react";
import KPICard from "@/components/KPICard";
import MilkCollectionChart from "@/components/MilkCollectionChart";
import FarmersChart from "@/components/FarmersCharts";

const Dashboard = () => {
  const kpiData = [
    {
      title: "VLCC Center",
      value: "10",
      change: "+12%",
      icon: Users,
      gradient: "bg-gradient-to-br from-cyan-400 to-cyan-600"
    },
    {
      title: "Total Milk Collection",
      value: "2,450L",
      change: "+5%",
      icon: Droplets,
      gradient: "bg-gradient-to-br from-blue-400 to-blue-600"
    },
    {
      title: "Average Fat %",
      value: "3.5",
      change: "+8%",
      icon: TrendingUp,
      gradient: "bg-gradient-to-br from-teal-400 to-teal-600"
    },
    {
      title: "Average SNF %",
      value: "8.5",
      change: "+8%",
      icon: Activity,
      gradient: "bg-gradient-to-br from-cyan-500 to-cyan-700"
    },
    {
      title: "Total Payments",
      value: "$12,450",
      change: "+15%",
      icon: DollarSign,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">     
      <main className="p-6 space-y-6 text-left">
          {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Monday, April 21, 2025</p>
        </div>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MilkCollectionChart />
          <FarmersChart />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
