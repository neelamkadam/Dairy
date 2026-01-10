import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CollectionData } from "@/redux/dashboardSlice";

interface FarmersChartProps {
  collections: CollectionData[];
  branches: Array<{ branch_id: number; name: string }>;
}

const COLORS = {
  poured: '#10B981',      // Green - Active/Poured
  notPoured: '#F59E0B',   // Orange - Not Poured
  inactive: '#EF4444',    // Red - Inactive
  registered: '#3B82F6'   // Blue - Registered
};

const FarmersChart = ({ collections }: FarmersChartProps) => {
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());

  // Calculate farmer statistics from collections
  const calculateFarmerStats = () => {
    if (!collections || collections.length === 0) {
      return {
        poured: 0,
        notPoured: 0,
        inactive: 0,
        registered: 0
      };
    }

    // Sum up all values across all collections
    const totals = collections.reduce((acc, item) => ({
      poured: acc.poured + (item.farmers || 0),
      registered: acc.registered + (item.registered_farmers || 0),
      inactive: acc.inactive + (item.inactive_farmers || 0)
    }), { poured: 0, registered: 0, inactive: 0 });

    // Calculate not poured: registered - poured
    const notPoured = totals.registered - totals.poured;

    return {
      poured: totals.poured,
      notPoured: Math.max(0, notPoured), // Ensure non-negative
      inactive: totals.inactive,
      registered: totals.registered
    };
  };

  const stats = calculateFarmerStats();

  const allData = [
    {
      name: 'Poured',
      value: stats.poured,
      color: COLORS.poured,
      description: 'Active farmers who poured milk'
    },
    {
      name: 'Not Poured',
      value: stats.notPoured,
      color: COLORS.notPoured,
      description: 'Registered farmers who did not pour'
    },
    {
      name: 'Inactive',
      value: stats.inactive,
      color: COLORS.inactive,
      description: 'Inactive farmers'
    },
    {
      name: 'Registered',
      value: stats.registered,
      color: COLORS.registered,
      description: 'Total registered farmers'
    }
  ];

  const data = allData.filter(item => !hiddenItems.has(item.name) && item.value > 0);

  const toggleItem = (name: string) => {
    setHiddenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

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
                label={({ value }) => `${value}`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [
                  `${value} farmers`,
                  props.payload.description
                ]} 
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">No data available</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 md:gap-4 mt-4 justify-center">
        {allData.map((entry, index) => (
          <div 
            key={index} 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => toggleItem(entry.name)}
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ 
                backgroundColor: entry.color,
                opacity: hiddenItems.has(entry.name) ? 0.3 : 1
              }}
            />
            <span 
              className="text-sm text-gray-600"
              style={{ opacity: hiddenItems.has(entry.name) ? 0.3 : 1 }}
            >
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FarmersChart;
