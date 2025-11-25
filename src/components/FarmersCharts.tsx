import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CollectionData } from "@/redux/dashboardSlice";

interface FarmersChartProps {
  collections: CollectionData[];
  branches: Array<{ branch_id: number; name: string }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const FarmersChart = ({ collections, branches }: FarmersChartProps) => {
  const data = collections
    .filter(item => item.quantity > 0)
    .map((item, index) => {
      const branch = branches.find(b => b.branch_id === item.dairy_id);
      return {
        name: branch?.name || `Dairy ${item.dairy_id}`,
        value: item.quantity,
        color: COLORS[index % COLORS.length]
      };
    });

  const totalQuantity = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center min-h-0">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="30%"
                outerRadius="60%"
                dataKey="value"
                label={({ value }) => `${value}L`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}L`} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">No data available</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 md:gap-4 mt-4 justify-center">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FarmersChart;
