import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { CollectionData } from "@/redux/dashboardSlice";

interface MilkCollectionChartProps {
  collections: CollectionData[];
  branches: Array<{ branch_id: number; name: string }>;
}

const MilkCollectionChart = ({ collections, branches }: MilkCollectionChartProps) => {
  const data = collections.map(item => {
    const branch = branches.find(b => b.branch_id === item.dairy_id);
    return {
      name: branch?.name || `Dairy ${item.dairy_id}`,
      quantity: item.quantity
    };
  });

  return (
    <div className="h-full flex items-center justify-center">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              label={{ value: 'Quantity (L)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6B7280' } }}
            />
            <Tooltip formatter={(value) => `${value}L`} />
            <Bar 
              dataKey="quantity" 
              fill="url(#blueGradient)"
              radius={[4, 4, 0, 0]}
            />
            <defs>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-500">No data available</p>
      )}
    </div>
  );
};

export default MilkCollectionChart;