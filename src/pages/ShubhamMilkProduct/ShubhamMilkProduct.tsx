import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppSelector } from "@/redux/store";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { api } from "@/services/config";
import { toast } from "react-toastify";

const ShubhamMilkProduct = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [vlcId, setVlcId] = useState("");
  
  useEffect(() => {
    if (branches.length > 0 && !vlcId) {
      setVlcId(branches[0].branch_id.toString());
    }
  }, [branches, vlcId]);
  
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
  const [startDate, setStartDate] = useState<Date | undefined>(todayDates.from);
  const [endDate, setEndDate] = useState<Date | undefined>(todayDates.to);
  
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dates = calculateDateRange(dateStr);
      setStartDate(dates.from);
      setEndDate(dates.to);
    }
  };
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [globalRate, setGlobalRate] = useState("");

  const handleShow = async () => {
    if (!vlcId) {
      toast.error("Please select VLC");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select date range");
      return;
    }

    setLoading(true);
    try {
      const response = await api.get("/collections/by-dairy-date-range", {
        params: {
          dairy_id: vlcId,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
        },
      });
      console.log("Collections Response:", response.data);
      const processedData = (response.data.data || []).map((item: any) => ({
        ...item,
        ids: item.collection_ids ? item.collection_ids.split(',').map((id: string) => Number(id.trim())) : []
      }));
      setData(processedData);
      setGlobalRate("");
      toast.success(response.data.message);
    } catch (error: any) {
      console.error("API Error:", error);
      toast.error(error?.response?.data?.message || "Failed to fetch collections");
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalRateChange = (value: string) => {
    setGlobalRate(value);
    if (value && !isNaN(Number(value))) {
      const rate = Number(value);
      setData(data.map(item => ({
        ...item,
        avg_rate: rate,
        avg_amount: (rate * item.total_quantity).toFixed(2)
      })));
    }
  };

  const handleRateChange = (index: number, value: string) => {
    if (!isNaN(Number(value))) {
      const rate = Number(value);
      const updatedData = [...data];
      updatedData[index] = {
        ...updatedData[index],
        avg_rate: rate,
        avg_amount: (rate * updatedData[index].total_quantity).toFixed(2)
      };
      setData(updatedData);
    }
  };

  const handleSubmit = async () => {
    const collections = data
      .filter(item => item.ids && Array.isArray(item.ids) && item.ids.length > 0)
      .map(item => ({
        ids: item.ids,
        rate: Number(item.avg_rate)
      }));

    console.log('Submitting collections:', collections);

    if (collections.length === 0) {
      toast.error('No valid collections to update');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.put("/collections/update-rates", { collections });
      console.log("Update Response:", response.data);
      toast.success(response.data.message);
    } catch (error: any) {
      console.error("Update Error:", error);
      toast.error(error?.response?.data?.message || "Failed to update rates");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-sm border-none">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-2xl font-bold text-gray-800">Shubham Milk Product</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">VLC ID</label>
                <Select value={vlcId} onValueChange={setVlcId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select VLC" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {branches.map((branch) => (
                      <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                        {branch.username} - {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd-MM-yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      initialFocus
                      className={cn("p-3 bg-white")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <Button
                  variant="outline"
                  disabled
                  className="w-full justify-start text-left font-normal bg-gray-100 cursor-not-allowed"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd-MM-yyyy") : "End date"}
                </Button>
              </div>

              <div className="flex items-end">
                <Button onClick={handleShow} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarIcon className="w-4 h-4 mr-2" />}
                  Show
                </Button>
              </div>
            </div>

            {data.length > 0 && (
              <div className="mb-4 flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Apply Rate to All</label>
                  <input
                    type="number"
                    value={globalRate}
                    onChange={(e) => handleGlobalRateChange(e.target.value)}
                    placeholder="Enter rate"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Submit
                </Button>
              </div>
            )}

            {data.length > 0 && (
              <div className="mt-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-4 py-2 text-left">Farmer ID</th>
                        <th className="border px-4 py-2 text-left">Farmer Name</th>
                        <th className="border px-4 py-2 text-left">Type</th>
                        <th className="border px-4 py-2 text-right">Total Quantity</th>
                        <th className="border px-4 py-2 text-right">Avg Fat</th>
                        <th className="border px-4 py-2 text-right">Avg SNF</th>
                        <th className="border px-4 py-2 text-right">Avg Water</th>
                        <th className="border px-4 py-2 text-right">Avg Rate</th>
                        <th className="border px-4 py-2 text-right">Avg Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border px-4 py-2">{item.farmer_id}</td>
                          <td className="border px-4 py-2">{item.farmer_name}</td>
                          <td className="border px-4 py-2">{item.type}</td>
                          <td className="border px-4 py-2 text-right">{item.total_quantity}</td>
                          <td className="border px-4 py-2 text-right">{item.avg_fat}</td>
                          <td className="border px-4 py-2 text-right">{item.avg_snf}</td>
                          <td className="border px-4 py-2 text-right">{item.avg_water}</td>
                          <td className="border px-4 py-2">
                            <input
                              type="number"
                              value={item.avg_rate}
                              onChange={(e) => handleRateChange(index, e.target.value)}
                              className="w-20 border rounded px-2 py-1 text-right"
                            />
                          </td>
                          <td className="border px-4 py-2 text-right">₹{item.avg_amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShubhamMilkProduct;
