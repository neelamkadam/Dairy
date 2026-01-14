import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CollectionData, FarmersInfoData } from "@/redux/dashboardSlice";
import FarmerInfoModal from "./FarmerInfoModal";

interface FarmersChartProps {
  collections: CollectionData[];
  branches: Array<{ branch_id: number; name: string }>;
  farmersInfo: FarmersInfoData[];
  farmersInfoLoading: boolean;
  selectedDate: string;
  selectedShift: string;
  onFetchFarmersInfo: (payload: { branches: number[]; date: string; shift: string }) => void;
}

const COLORS = {
  poured: '#10B981',      // Green - Active/Poured
  notPoured: '#F59E0B',   // Orange - Not Poured
  inactive: '#EF4444',    // Red - Inactive
  registered: '#3B82F6'   // Blue - Registered
};

const FarmersChart = ({ collections, branches, farmersInfo, farmersInfoLoading, selectedDate, selectedShift, onFetchFarmersInfo }: FarmersChartProps) => {
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ farmers: any[]; title: string }>({ farmers: [], title: "" });

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

    // Calculate not poured: registered - poured - inactive
    const notPoured = totals.registered - totals.poured - totals.inactive;

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

  const handlePieClick = (data: any) => {
    onFetchFarmersInfo({
      branches: branches.map(b => b.branch_id),
      date: selectedDate,
      shift: selectedShift
    });

    let title = "";
    if (data.name === "Poured") {
      title = "Poured Farmers";
    } else if (data.name === "Not Poured") {
      title = "Not Poured Farmers";
    } else if (data.name === "Inactive") {
      title = "Inactive Farmers";
    }

    setModalData({ farmers: [], title });
    setModalOpen(true);
  };

  useEffect(() => {
    if (modalOpen && farmersInfo.length > 0) {
      let farmers: any[] = [];
      
      if (modalData.title === "Poured Farmers") {
        farmers = farmersInfo.flatMap(info => info.poured_farmers || []);
      } else if (modalData.title === "Not Poured Farmers") {
        farmers = farmersInfo.flatMap(info => info.not_poured_farmers || []);
      } else if (modalData.title === "Inactive Farmers") {
        farmers = farmersInfo.flatMap(info => info.inactive_farmers);
      }
      
      setModalData(prev => ({ ...prev, farmers }));
    }
  }, [farmersInfo, modalOpen, modalData.title]);

  return (
    <>
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
                  onClick={handlePieClick}
                  style={{ cursor: "pointer" }}
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
      <FarmerInfoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        farmers={modalData.farmers}
        title={modalData.title}
        branches={branches}
        loading={farmersInfoLoading}
      />
    </>
  );
};

export default FarmersChart;
