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

const data = [
  { month: "Jan", Mobile: 2000, Farmer: 1400, Web: 3200 },
  { month: "Feb", Mobile: 2200, Farmer: 1500, Web: 3400 },
  { month: "Mar", Mobile: 2400, Farmer: 1600, Web: 3600 },
  { month: "Apr", Mobile: 2500, Farmer: 1550, Web: 3700 },
  { month: "May", Mobile: 2600, Farmer: 1600, Web: 3800 },
  { month: "Jun", Mobile: 2700, Farmer: 1700, Web: 3900 },
  { month: "Jul", Mobile: 2800, Farmer: 1800, Web: 4000 },
  { month: "Aug", Mobile: 2900, Farmer: 1500, Web: 4100 },
];
const statisticsData = [
  {
    month: "Jan",
    mobileApps: "1,200",
    farmerApps: "800",
    webApps: "1,500",
    total: "3,500",
  },
  {
    month: "Feb",
    mobileApps: "1,400",
    farmerApps: "900",
    webApps: "1,600",
    total: "3,900",
  },
  {
    month: "Mar",
    mobileApps: "1,600",
    farmerApps: "1,000",
    webApps: "1,800",
    total: "4,400",
  },
  {
    month: "Apr",
    mobileApps: "1,800",
    farmerApps: "1,100",
    webApps: "2,000",
    total: "4,900",
  },
  {
    month: "May",
    mobileApps: "2,000",
    farmerApps: "1,200",
    webApps: "2,200",
    total: "5,400",
  },
  {
    month: "Jun",
    mobileApps: "2,200",
    farmerApps: "1,300",
    webApps: "2,400",
    total: "5,900",
  },
  {
    month: "Jul",
    mobileApps: "2,400",
    farmerApps: "1,400",
    webApps: "2,600",
    total: "6,400",
  },
  {
    month: "Aug",
    mobileApps: "2,600",
    farmerApps: "1,500",
    webApps: "2,800",
    total: "6,900",
  },
  {
    month: "Sep",
    mobileApps: "2,800",
    farmerApps: "1,600",
    webApps: "3,000",
    total: "7,400",
  },
  {
    month: "Oct",
    mobileApps: "3,000",
    farmerApps: "1,700",
    webApps: "3,200",
    total: "7,900",
  },
  {
    month: "Nov",
    mobileApps: "3,200",
    farmerApps: "1,800",
    webApps: "3,400",
    total: "8,400",
  },
  {
    month: "Dec",
    mobileApps: "3,400",
    farmerApps: "1,900",
    webApps: "3,600",
    total: "8,900",
  },
];
const AdminDashboard = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Mobile Applications"
            value="3,400"
            change="+12.5%"
            changeType="positive"
            icon={Smartphone}
            iconColor="bg-blue-500"
          />
          <MetricCard
            title="Farmer Applications"
            value="1,900"
            change="+8.3%"
            changeType="positive"
            icon={Sprout}
            iconColor="bg-green-500"
          />
          <MetricCard
            title="Web Applications"
            value="3,600"
            change="+15.2%"
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
                data={data}
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
                {statisticsData.map((row) => (
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
