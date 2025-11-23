import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ChevronLeft } from "lucide-react";
import { billApi } from "@/services/billApi";
import { deductionApi } from "@/services/deductionApi";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";
import { adjustDeductionsForNegativeBalance } from "@/utils/priorityUtils";
import { format, getDaysInMonth } from "date-fns";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";

const GenerateBill = () => {
  const { branches } = useAppSelector((state) => state.branch);
  
  const getCurrentPeriod = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    let startDay, endDay;
    
    if (day <= 10) {
      startDay = 1;
      endDay = 10;
    } else if (day <= 20) {
      startDay = 11;
      endDay = 20;
    } else {
      startDay = 21;
      endDay = getDaysInMonth(today);
    }
    
    return {
      start: new Date(year, month, startDay),
      end: new Date(year, month, endDay)
    };
  };
  
  const currentPeriod = getCurrentPeriod();
  const [startDate, setStartDate] = useState<Date>(currentPeriod.start);
  const [endDate, setEndDate] = useState<Date>(currentPeriod.end);
  const [selectedDairy, setSelectedDairy] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [farmersData, setFarmersData] = useState<any[]>([]);

  const totals = farmersData.reduce(
    (acc, farmer) => ({
      totalAmount: acc.totalAmount + (farmer.milk_total * 36.52),
      totalDeduction: acc.totalDeduction + farmer.advance_total + farmer.cattlefeed_total + farmer.other1_total + farmer.other2_total,
      totalNetPayable: acc.totalNetPayable + farmer.net_payable,
    }),
    { totalAmount: 0, totalDeduction: 0, totalNetPayable: 0 }
  );

  useEffect(() => {
    if (branches.length > 0) {
      setSelectedDairy(branches[0].branch_id);
    }
  }, [branches]);

  const fetchBillData = async () => {
    try {
      const { data } = await deductionApi.getAllFarmersBalance(
        selectedDairy,
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );
      console.log(data);

      // Process the nested data structure
      const farmerMap = new Map();
      
      (data.data || []).forEach((dateEntry: any) => {
        dateEntry.farmers.forEach((farmer: any) => {
          const farmerId = farmer.farmer_id;
          
          if (farmerMap.has(farmerId)) {
            const existing = farmerMap.get(farmerId);
            existing.milk_total += farmer.milk_total || 0;
            existing.advance_total += farmer.deductions?.advance || 0;
            existing.cattlefeed_total += farmer.deductions?.cattle_feed || 0;
            existing.other1_total += farmer.deductions?.other1 || 0;
            existing.other2_total += farmer.deductions?.other2 || 0;
            existing.received_total += farmer.total_received || 0;
          } else {
            farmerMap.set(farmerId, {
              farmer_id: farmerId,
              name: farmer.farmer_name || `Farmer ${farmerId}`,
              milk_total: farmer.milk_total || 0,
              advance_total: farmer.deductions?.advance || 0,
              cattlefeed_total: farmer.deductions?.cattle_feed || 0,
              other1_total: farmer.deductions?.other1 || 0,
              other2_total: farmer.deductions?.other2 || 0,
              received_total: farmer.total_received || 0,
              net_payable: farmer.net_payable || 0,
              advance_remaining: 0,
              cattlefeed_remaining: 0,
              other1_remaining: 0,
              other2_remaining: 0,
            });
          }
        });
      });
      
      setFarmersData(Array.from(farmerMap.values()));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch bill data");
    }
  };

  const checkPreviousBillCycle = async () => {
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    try {
      const { data } = await deductionApi.checkPreviousBillCycle(
        selectedDairy,
        format(prevStartDate, "yyyy-MM-dd"),
        format(prevEndDate, "yyyy-MM-dd")
      );

      const hasUnfinalized = (data.farmers || []).some((f: any) => !f.is_finalized);
      return !hasUnfinalized;
    } catch {
      return true;
    }
  };

  const handleGenerateBill = async () => {
    setLoading(true);
    try {
      const canGenerate = await checkPreviousBillCycle();
      if (!canGenerate) {
        toast.error("Previous bill cycle has unfinalized bills. Please finalize them first.");
        setLoading(false);
        return;
      }

      const records = farmersData.map((farmer) => {
        const deductions = {
          advance: farmer.advance_total,
          cattlefeed: farmer.cattlefeed_total,
          other1: farmer.other1_total,
          other2: farmer.other2_total,
        };

        const adjusted = adjustDeductionsForNegativeBalance(deductions, farmer.milk_total);

        return {
          farmer_id: normalizeFarmerId(farmer.farmer_id),
          dairy_id: selectedDairy,
          period_start: format(startDate, "yyyy-MM-dd"),
          period_end: format(endDate, "yyyy-MM-dd"),
          milk_total: farmer.milk_total,
          advance_total: adjusted.advance,
          cattlefeed_total: adjusted.cattlefeed,
          other1_total: adjusted.other1,
          other2_total: adjusted.other2,
          received_total: farmer.received_total,
          net_payable: farmer.milk_total - (adjusted.advance + adjusted.cattlefeed + adjusted.other1 + adjusted.other2),
          advance_remaining: farmer.advance_remaining,
          cattlefeed_remaining: farmer.cattlefeed_remaining,
          other1_remaining: farmer.other1_remaining,
          other2_remaining: farmer.other2_remaining,
          status: "GENERATED",
          is_finalized: 1,
        };
      });

      const billsData = {
        success: true,
        dairy_id: selectedDairy,
        records,
      };

      const response = await billApi.generateBills(billsData);
      const billIds = response.data?.billIds || response.data?.data?.billIds || [];

      if (billIds.length > 0) {
        await deductionApi.getFinalizedBills(billIds);
      }

      toast.success("Bills generated and finalized successfully");
      await fetchBillData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to generate bills");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-4">
              <div>
                <ChevronLeft size={20} strokeWidth={1.25} />
              </div>
              <div>
                <h1 className="text-2xl text-left font-bold text-gray-900">
                  Generate Bill
                </h1>
                <p className="text-gray-600">Dashboard / Generate Bill</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className=" max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left bg-white">
        <Card className="mb-5 border-none">
          <CardHeader>
            <CardTitle>Select Bill Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Label>Select VLC:</Label>
                <Select value={selectedDairy.toString()} onValueChange={(value) => setSelectedDairy(parseInt(value))}>
                  <SelectTrigger className="w-48 bg-white border-gray-300">
                    <SelectValue placeholder="Select VLC" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300 shadow-lg">
                    {branches.map((branch) => (
                      <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                        {branch.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>Start Date:</Label>
                <Input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="border-gray-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>End Date:</Label>
                <Input
                  type="date"
                  value={format(endDate, "yyyy-MM-dd")}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  className="border-gray-300"
                />
              </div>
              <Button 
                onClick={fetchBillData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Loading..." : "Show"}
              </Button>
            </div>
          </CardContent>
          <CardContent className="p-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Liter
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Advance
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Feed
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Other1
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Other2
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Net Pay
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {farmersData.map((farmer) => (
                    <tr key={farmer.farmer_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">
                        {farmer.farmer_id}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900">
                        {farmer.name}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900">
                        {farmer.milk_total.toFixed(1)}L
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900">
                        ₹{(farmer.milk_total).toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600">
                        ₹{farmer.advance_total.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600">
                        ₹{farmer.cattlefeed_total.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600">
                        ₹{farmer.other1_total.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600">
                        ₹{farmer.other2_total.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-green-600">
                        ₹{farmer.net_payable.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-300">
              <div className="flex justify-between items-center text-sm">
                <div className="flex gap-8">
                  <div>
                    <span className="text-xs font-medium text-gray-600">Total Amount</span>
                    <p className="text-sm font-bold text-gray-900">₹{totals.totalAmount.toFixed(0)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">Total Deduction</span>
                    <p className="text-sm font-bold text-red-600">₹{totals.totalDeduction.toFixed(0)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-600">Total Net Payable</span>
                    <p className="text-sm font-bold text-green-600">₹{totals.totalNetPayable.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full text-center">
              <Button
                onClick={handleGenerateBill}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white w-[17%]"
              >
                {loading ? "Generating..." : "Generate Bill"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default GenerateBill;
