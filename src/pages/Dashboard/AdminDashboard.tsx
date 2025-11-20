import { MetricCard } from "@/components/MartricCard";
import { Smartphone, Sprout, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useState, useEffect } from "react";
import { adminApi } from "@/services/adminApi";
import { toast } from "react-toastify";

const AdminDashboard = () => {
  const [mobileAppsCount, setMobileAppsCount] = useState(0);
  const [farmerAppsCount, setFarmerAppsCount] = useState(0);
  const [farmerTotalCount, setFarmerTotalCount] = useState(0);
  const [webAppsCount, setWebAppsCount] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await adminApi.getAllUsers();
      if (data.success) {
        const { dairyManagers = [], farmers = [], webUsers = [] } = data.data;
        const confirmedFarmers = farmers.filter((f: any) => f.confirm === 1);
        setMobileAppsCount(dairyManagers.length || 0);
        setFarmerAppsCount(confirmedFarmers.length);
        setFarmerTotalCount(farmers.length || 0);
        setWebAppsCount(webUsers.length || 0);
      }
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };
  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Mobile Applications"
            value={mobileAppsCount.toString()}
            change="0%"
            changeType="positive"
            icon={Smartphone}
            iconColor="bg-blue-500"
          />
          <MetricCard
            title="Farmer Applications"
            value={`${farmerAppsCount} (${farmerTotalCount})`}
            change="0%"
            changeType="positive"
            icon={Sprout}
            iconColor="bg-green-500"
          />
          <MetricCard
            title="Web Applications"
            value={webAppsCount.toString()}
            change="0%"
            changeType="positive"
            icon={Globe}
            iconColor="bg-purple-500"
          />
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Application Trends
            </h3>
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
                All Versions
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Trial Version
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Paid Version
              </button>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Legend />
                <Bar dataKey="Mobile" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Farmer" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Web" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statistics Table */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Detailed Statistics
          </h3>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Month</TableHead>
                  <TableHead className="font-semibold">Mobile Apps</TableHead>
                  <TableHead className="font-semibold">Farmer Apps</TableHead>
                  <TableHead className="font-semibold">Web Apps</TableHead>
                  <TableHead className="font-semibold text-right">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[].map((row: any) => (
                  <TableRow key={row.month} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell>{row.mobileApps}</TableCell>
                    <TableCell>{row.farmerApps}</TableCell>
                    <TableCell>{row.webApps}</TableCell>
                    <TableCell className="text-right font-medium">
                      {row.total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-gray-500">Showing 12 of 12 entries</p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500">
              © 2024 Analytics Dashboard. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Last updated: 5/24/2025, 9:46:42 PM
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
