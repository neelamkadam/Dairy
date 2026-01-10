import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { GraphData } from "@/redux/dashboardSlice";

interface MilkCollectionChartProps {
  graph: GraphData[];
}

const MilkCollectionChart = ({ graph }: MilkCollectionChartProps) => {
  const data = graph.map(item => {
    const date = new Date(item.date);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      quantity: item.quantity
    };
  });

  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const item = data.find(d => d.date === payload.value);
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#6B7280" fontSize={12}>
          {item?.day}
        </text>
        <text x={0} y={0} dy={30} textAnchor="middle" fill="#6B7280" fontSize={10}>
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="h-full flex items-center justify-center">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={<CustomXAxisTick />}
              height={60}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              label={{ value: 'Quantity (L)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6B7280' } }}
            />
            <Tooltip formatter={(value) => `${value}L`} />
            <Area
              type="monotone"
              dataKey="quantity"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#colorQuantity)"
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-500">No data available</p>
      )}
    </div>
  );
};

export default MilkCollectionChart;
