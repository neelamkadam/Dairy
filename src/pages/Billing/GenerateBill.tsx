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
import { webUserApi } from "@/services/webUserApi";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";
import { adjustDeductionsForNegativeBalance } from "@/utils/priorityUtils";
import { format, getDaysInMonth } from "date-fns";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";

const GenerateBill = () => {
  const { branches } = useAppSelector((state) => state.branch);
  
  const calculateDateRange = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    
    let startDay: number, endDay: number;
    if (day >= 1 && day <= 10) {
      startDay = 1;
      endDay = 10;
    } else if (day >= 11 && day <= 20) {
      startDay = 11;
      endDay = 20;
    } else if (day >= 21) {
      startDay = 21;
      endDay = new Date(year, month, 0).getDate();
    } else return { from: dateStr, to: dateStr };
    
    return {
      from: new Date(year, month - 1, startDay),
      to: new Date(year, month - 1, endDay)
    };
  };

  const todayDates = calculateDateRange(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<Date>(todayDates.from);
  const [endDate, setEndDate] = useState<Date>(todayDates.to);

  const handleStartDateChange = (newDate: string) => {
    const dates = calculateDateRange(newDate);
    setStartDate(dates.from);
    setEndDate(dates.to);
  };
  const { userData } = useAppSelector((state) => state.authData);
  const [selectedDairy, setSelectedDairy] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [farmersData, setFarmersData] = useState<any[]>([]);
  const [priority, setPriority] = useState<string[]>(['advance', 'cattleFeed', 'other1', 'other2']);
  const [isBillFinalized, setIsBillFinalized] = useState(false);

  const totals = farmersData.reduce(
    (acc, farmer) => {
      const netPayable = farmer.hasBill 
        ? farmer.milk_total - farmer.advanceDeduction - farmer.cattleFeedDeduction - farmer.other1Deduction - farmer.other2Deduction + (farmer.received_total || 0)
        : farmer.milk_total - farmer.advance - farmer.cattleFeedAmount - farmer.other1Amount - farmer.other2Amount + (farmer.received_total || 0);
      
      return {
        totalAmount: acc.totalAmount + farmer.milk_total,
        totalDeduction: acc.totalDeduction + (farmer.advanceDeduction || 0) + (farmer.cattleFeedDeduction || 0) + (farmer.other1Deduction || 0) + (farmer.other2Deduction || 0),
        totalNetPayable: acc.totalNetPayable + netPayable,
      };
    },
    { totalAmount: 0, totalDeduction: 0, totalNetPayable: 0 }
  );

  useEffect(() => {
    if (branches.length > 0) {
      setSelectedDairy(branches[0].branch_id);
    }
  }, [branches]);

  useEffect(() => {
    if (userData?.id) {
      fetchPriority();
    }
  }, [userData?.id]);

  const fetchPriority = async () => {
    try {
      const { data } = await webUserApi.getPriority(parseInt(userData.id!));
      setPriority(data.data);
    } catch (error) {
      console.error('Error fetching priority:', error);
    }
  };

  const fetchBillData = async () => {
    try {
      const { data } = await deductionApi.getAllFarmersBalance(
        selectedDairy,
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );
      // Check if bills are finalized by checking first farmer's from_bills status
      const firstDateEntry = data.data?.[0];
      const firstFarmer = firstDateEntry?.farmers?.[0];
      const isFinalized = firstFarmer?.from_bills?.is_finalized === 1 && firstFarmer?.from_bills?.status === 'paid';
      setIsBillFinalized(isFinalized);

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
              advance: farmer.deductions?.advance || 0,
              advanceDeduction: farmer.deductions?.advance || 0,
              cattleFeedAmount: farmer.deductions?.cattle_feed || 0,
              cattleFeedDeduction: farmer.deductions?.cattle_feed || 0,
              other1Amount: farmer.deductions?.other1 || 0,
              other1Deduction: farmer.deductions?.other1 || 0,
              other2Amount: farmer.deductions?.other2 || 0,
              other2Deduction: farmer.deductions?.other2 || 0,
              received_total: farmer.total_received || 0,
              net_payable: farmer.net_payable || 0,
              hasBill: false,
            });
          }
        });
      });
      
      const processedData = Array.from(farmerMap.values());

      // Fetch bill details like FarmerDeduction page
      if (processedData.length > 0) {
        const farmerIds = processedData.map(f => f.farmer_id);
        const billDetailsResponse = await deductionApi.getBillDetailsByFarmers(
          selectedDairy,
          farmerIds,
          format(startDate, "yyyy-MM-dd"),
          format(endDate, "yyyy-MM-dd")
        );

        console.log('Bill Details Response:', billDetailsResponse.data);

        const billDetailsMap = new Map(
          (billDetailsResponse.data.data || []).map((detail: any) => [
            detail.farmer_id,
            detail
          ])
        );

        processedData.forEach(farmer => {
          const billDetail = billDetailsMap.get(farmer.farmer_id);
          if (billDetail) {
            const advTotal = parseFloat(billDetail.advance_total || 0);
            const advRemaining = parseFloat(billDetail.advance_remaining || 0);
            const cfTotal = parseFloat(billDetail.cattlefeed_total || 0);
            const cfRemaining = parseFloat(billDetail.cattlefeed_remaining || 0);
            const o1Total = parseFloat(billDetail.other1_total || 0);
            const o1Remaining = parseFloat(billDetail.other1_remaining || 0);
            const o2Total = parseFloat(billDetail.other2_total || 0);
            const o2Remaining = parseFloat(billDetail.other2_remaining || 0);

            const hasData = advTotal > 0 || advRemaining > 0 || cfTotal > 0 || cfRemaining > 0 || 
                           o1Total > 0 || o1Remaining > 0 || o2Total > 0 || o2Remaining > 0;

            if (hasData) {
              farmer.advance = advTotal + advRemaining;
              farmer.advanceDeduction = advTotal;
              farmer.cattleFeedAmount = cfTotal + cfRemaining;
              farmer.cattleFeedDeduction = cfTotal;
              farmer.other1Amount = o1Total + o1Remaining;
              farmer.other1Deduction = o1Total;
              farmer.other2Amount = o2Total + o2Remaining;
              farmer.other2Deduction = o2Total;
              farmer.hasBill = true;
            }
          }
        });
      }

      // Apply priority distribution to farmers with negative balance
      const adjustedData = processedData.map(farmer => {
        const netPayable = farmer.hasBill 
          ? farmer.milk_total - farmer.advanceDeduction - farmer.cattleFeedDeduction - farmer.other1Deduction - farmer.other2Deduction + farmer.received_total
          : farmer.milk_total - farmer.advance - farmer.cattleFeedAmount - farmer.other1Amount - farmer.other2Amount + farmer.received_total;

        if (netPayable >= 0) return farmer;

        let remaining = Math.abs(netPayable);
        const fieldMap: any = {
          advance: { deduction: 'advanceDeduction', amount: 'advance' },
          cattleFeed: { deduction: 'cattleFeedDeduction', amount: 'cattleFeedAmount' },
          other1: { deduction: 'other1Deduction', amount: 'other1Amount' },
          other2: { deduction: 'other2Deduction', amount: 'other2Amount' }
        };

        const updated = { ...farmer };

        for (const key of priority) {
          const field = fieldMap[key];
          const currentDeduction = updated[field.deduction];
          
          if (currentDeduction > 0 && remaining > 0) {
            const deduct = Math.min(currentDeduction, remaining);
            updated[field.deduction] -= deduct;
            remaining -= deduct;
          }
        }

        return updated;
      });

      setFarmersData(adjustedData);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch bill data");
    }
  };

  const calculatePreviousBillCycle = (currentStartDate: Date) => {
    const [year, month, day] = format(currentStartDate, 'yyyy-MM-dd').split('-').map(Number);
    
    let prevStartDay: number, prevEndDay: number;
    if (day === 1) {
      // If current cycle starts on 1st, previous is 21st to last day of previous month
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      prevStartDay = 21;
      prevEndDay = new Date(prevYear, prevMonth, 0).getDate();
      return {
        from: new Date(prevYear, prevMonth - 1, prevStartDay),
        to: new Date(prevYear, prevMonth - 1, prevEndDay)
      };
    } else if (day === 11) {
      // If current cycle starts on 11th, previous is 1st to 10th
      prevStartDay = 1;
      prevEndDay = 10;
    } else if (day === 21) {
      // If current cycle starts on 21st, previous is 11th to 20th
      prevStartDay = 11;
      prevEndDay = 20;
    } else {
      return null;
    }
    
    return {
      from: new Date(year, month - 1, prevStartDay),
      to: new Date(year, month - 1, prevEndDay)
    };
  };

  const checkPreviousBillCycle = async () => {
    const previousCycle = calculatePreviousBillCycle(startDate);
    if (!previousCycle) return true;

    try {
      const { data } = await deductionApi.getAllFarmersBalance(
        selectedDairy,
        format(previousCycle.from, "yyyy-MM-dd"),
        format(previousCycle.to, "yyyy-MM-dd")
      );

      // Check if any farmer has bills with status not paid
      const hasUnpaidBills = data.data?.some((dateEntry: any) => 
        dateEntry.farmers?.some((farmer: any) => 
          farmer.from_bills && 
          farmer.from_bills.status !== 'paid' && 
          farmer.from_bills.is_finalized === 0
        )
      );

      // If no data or no bills exist, allow generation (new customer)
      if (!data.data || data.data.length === 0) return true;
      
      // Check if bills exist but are not finalized
      const hasBills = data.data?.some((dateEntry: any) => 
        dateEntry.farmers?.some((farmer: any) => farmer.from_bills)
      );

      if (hasBills && hasUnpaidBills) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking previous bill cycle:', error);
      return true; // Allow generation if check fails
    }
  };

  const handleGenerateBill = async () => {
    setLoading(true);
    try {
      const canGenerate = await checkPreviousBillCycle();
      if (!canGenerate) {
        const previousCycle = calculatePreviousBillCycle(startDate);
        if (previousCycle) {
          toast.error(
            `Please generate and finalize bills for previous cycle (${format(previousCycle.from, 'dd-MM-yyyy')} to ${format(previousCycle.to, 'dd-MM-yyyy')}) first.`
          );
        }
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
                <h1 className="text-2xl text-left font-bold text-gray-900">
                  Generate Bill
                </h1>
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
                        {branch.username} - {branch.name} - {branch.branchName}
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
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="border-gray-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>End Date:</Label>
                <Input
                  type="date"
                  value={format(endDate, "yyyy-MM-dd")}
                  disabled
                  className="border-gray-300 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <Button 
                onClick={fetchBillData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Loading..." : "Show"}
              </Button>
              {farmersData.length > 0 && (
                <div className={`px-4 py-2 rounded-md font-semibold ${
                  isBillFinalized 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {isBillFinalized ? 'Bill Finalized' : 'Not Finalized'}
                </div>
              )}
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
                        ₹{(farmer.advanceDeduction || 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600">
                        ₹{(farmer.cattleFeedDeduction || 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600">
                        ₹{(farmer.other1Deduction || 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600">
                        ₹{(farmer.other2Deduction || 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-green-600">
                        ₹{(farmer.hasBill 
                          ? farmer.milk_total - farmer.advanceDeduction - farmer.cattleFeedDeduction - farmer.other1Deduction - farmer.other2Deduction + (farmer.received_total || 0)
                          : farmer.milk_total - farmer.advance - farmer.cattleFeedAmount - farmer.other1Amount - farmer.other2Amount + (farmer.received_total || 0)
                        ).toFixed(0)}
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
                disabled={loading || isBillFinalized}
                className="bg-blue-600 hover:bg-blue-700 text-white w-[17%] disabled:opacity-50 disabled:cursor-not-allowed"
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
