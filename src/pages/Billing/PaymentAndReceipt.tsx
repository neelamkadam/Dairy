import React, { useState, useEffect } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Bell, CircleUserRound,ChevronRight, ChevronLeft, Search, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { paymentApi } from "@/services/paymentApi";
import { normalizeFarmerId, formatFarmerIdForDisplay } from "@/utils/farmerIdUtils";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { userApi } from "@/services/userApi";
import { cattleFeedApi, CattleFeedStock } from "@/services/cattleFeedApi";
import { deductionApi } from "@/services/deductionApi";

const PaymentAndReceipt: React.FC = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [formData, setFormData] = useState({
    vlcName: "",
    fromDate: new Date(),
    farmerCode: "",
    farmerName: "",
    paymentType: "",
    amountTaken: "",
    receivedAmount: "",
    emiChecked: false,
    emiAmount: "",
  });
  const [farmerIdInput, setFarmerIdInput] = useState("");
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [cattleFeedStocks, setCattleFeedStocks] = useState<CattleFeedStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<CattleFeedStock | null>(null);
  const [stockQuantity, setStockQuantity] = useState("");
  const [farmerPreviousBalance, setFarmerPreviousBalance] = useState<{
    advance: number;
    cattleFeed: number;
    other1: number;
    other2: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (formData.vlcName && formData.fromDate) {
      fetchPayments();
      fetchCattleFeedStocks();
    }
  }, [formData.vlcName, formData.fromDate]);

  const fetchCattleFeedStocks = async () => {
    if (!formData.vlcName) return;
    try {
      const { data } = await cattleFeedApi.getStock(formData.vlcName);
      setCattleFeedStocks(data || []);
    } catch (error) {
      console.error("Failed to fetch cattle feed stocks", error);
    }
  };

  const fetchPayments = async () => {
    if (!formData.vlcName) {
      console.log('⏭️ Skipping fetch - no VLC selected');
      return;
    }
    const queryParams = {
      dairyid: formData.vlcName,
      datefrom: format(formData.fromDate, "yyyy-MM-dd"),
    };
    console.log('📋 GET Query Parameters:', queryParams);
    try {
      const { data } = await paymentApi.getPayments(queryParams);
      console.log('✅ API Response:', data);
      console.log('🔍 First payment record:', data.data?.[0]);
      console.log('🔍 amount_taken type:', typeof data.data?.[0]?.amount_taken);
      console.log('🔍 amount_taken value:', data.data?.[0]?.amount_taken);
      const selectedDate = format(formData.fromDate, "yyyy-MM-dd");
      const filtered = (data.data || []).filter((payment: any) => 
        format(new Date(payment.date), "yyyy-MM-dd") === selectedDate
      );
      console.log('🔍 Filtered Data:', filtered);
      setPaymentData(filtered);
    } catch (error) {
      console.error("❌ Failed to fetch payments", error);
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    
    try {
      await paymentApi.delete(id);
      toast.success('Payment deleted successfully');
      fetchPayments();
    } catch (error) {
      toast.error('Failed to delete payment');
    }
  };

  const calculatePreviousPeriodDates = (currentDate: Date) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    
    let prevStartDay: number, prevEndDay: number, prevMonth: number, prevYear: number;
    
    if (day >= 1 && day <= 10) {
      // If current period is 1-10, previous is 21-end of last month
      prevMonth = month - 1;
      prevYear = prevMonth < 0 ? year - 1 : year;
      prevMonth = prevMonth < 0 ? 11 : prevMonth;
      prevStartDay = 21;
      prevEndDay = new Date(prevYear, prevMonth + 1, 0).getDate();
    } else if (day >= 11 && day <= 20) {
      // If current period is 11-20, previous is 1-10 of same month
      prevMonth = month;
      prevYear = year;
      prevStartDay = 1;
      prevEndDay = 10;
    } else {
      // If current period is 21-end, previous is 11-20 of same month
      prevMonth = month;
      prevYear = year;
      prevStartDay = 11;
      prevEndDay = 20;
    }
    
    return {
      from: new Date(prevYear, prevMonth, prevStartDay),
      to: new Date(prevYear, prevMonth, prevEndDay)
    };
  };

  const fetchFarmerPreviousBalance = async (farmerId: string) => {
    if (!formData.vlcName) return;
    
    try {
      const previousPeriod = calculatePreviousPeriodDates(formData.fromDate);
      const { data } = await deductionApi.getAllFarmersBalance(
        parseInt(formData.vlcName),
        format(previousPeriod.from, "yyyy-MM-dd"),
        format(previousPeriod.to, "yyyy-MM-dd")
      );
      
      // Find the specific farmer in the response
      const normalizedFarmerId = normalizeFarmerId(farmerId);
      let farmerBalance = null;
      
      for (const dateEntry of data.data || []) {
        const farmer = dateEntry.farmers?.find((f: any) => f.farmer_id === normalizedFarmerId);
        if (farmer?.previous_bill) {
          farmerBalance = {
            advance: parseFloat(farmer.previous_bill.advance_remaining || 0),
            cattleFeed: parseFloat(farmer.previous_bill.cattlefeed_remaining || 0),
            other1: parseFloat(farmer.previous_bill.other1_remaining || 0),
            other2: parseFloat(farmer.previous_bill.other2_remaining || 0),
            total: 0
          };
          farmerBalance.total = farmerBalance.advance + farmerBalance.cattleFeed + farmerBalance.other1 + farmerBalance.other2;
          break;
        }
      }
      
      setFarmerPreviousBalance(farmerBalance);
    } catch (error) {
      console.error('Error fetching farmer previous balance:', error);
      setFarmerPreviousBalance(null);
    }
  };

  const handleFarmerSearch = async () => {
    if (!formData.vlcName || !farmerIdInput.trim()) {
      toast.error('Please select VLC and enter Farmer ID');
      return;
    }

    const normalized = normalizeFarmerId(farmerIdInput);
    const displayId = formatFarmerIdForDisplay(farmerIdInput);

    try {
      const farmer = await userApi.getById(normalized, parseInt(formData.vlcName));
      
      if (!farmer) {
        toast.error('Farmer not found');
        setFormData({ ...formData, farmerCode: "", farmerName: "" });
        setFarmerPreviousBalance(null);
        return;
      }

      setFormData({
        ...formData,
        farmerCode: displayId,
        farmerName: farmer.fullName || farmer.name || 'Unknown Farmer',
      });
      
      // Fetch previous balance
      await fetchFarmerPreviousBalance(normalized);
      
      toast.success('Farmer found');
    } catch (error) {
      console.error('Error searching farmer:', error);
      toast.error('Farmer not found');
      setFormData({ ...formData, farmerCode: "", farmerName: "" });
      setFarmerPreviousBalance(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.farmerCode || !formData.farmerName) {
      toast.error("Please enter Farmer ID and Name");
      return;
    }

    if (!formData.paymentType) {
      toast.error("Please select Payment Type");
      return;
    }

    const hasAmountTaken = formData.amountTaken;
    const hasReceived = formData.receivedAmount;

    if (!hasAmountTaken && !hasReceived) {
      toast.error("Please enter either Amount Taken OR Received");
      return;
    }

    if (hasAmountTaken && hasReceived) {
      toast.error("Please enter either Amount Taken OR Received, not both");
      return;
    }

    if (formData.paymentType === "Cattle Feed" && (!selectedStock || !stockQuantity)) {
      toast.error("Please select stock and enter quantity");
      return;
    }

    if (formData.paymentType === "Cattle Feed" && selectedStock) {
      const qty = parseFloat(stockQuantity);
      if (qty > selectedStock.stock) {
        toast.error(`Only ${selectedStock.stock} units available`);
        return;
      }
    }

    setLoading(true);
    const payload = {
      date: format(formData.fromDate, "yyyy-MM-dd"),
      dairy_id: formData.vlcName,
      farmer_id: normalizeFarmerId(formData.farmerCode),
      farmer_name: formData.farmerName,
      payment_type: formData.paymentType as "Advance" | "Cattle Feed" | "Other1" | "Other2",
      amount_taken: parseFloat(formData.amountTaken || "0"),
      received: parseFloat(formData.receivedAmount || "0"),
      emi: formData.emiChecked ? 1 : 0,
      emi_amount: formData.emiChecked ? parseFloat(formData.emiAmount || "0") : 0,
    };
    console.log('💰 Creating payment:', payload);
    try {
      await paymentApi.create(payload);
      
      if (formData.paymentType === "Cattle Feed" && selectedStock && stockQuantity) {
        const stockToReduce = parseFloat(stockQuantity);
        const remainingStock = Math.max(0, selectedStock.stock - stockToReduce);
        
        await cattleFeedApi.updateStock(selectedStock.id, {
          stock_name: selectedStock.stock_name,
          amount: parseFloat(selectedStock.amount),
          stock: remainingStock
        });
        
        setCattleFeedStocks(prev => prev.map(s => 
          s.id === selectedStock.id ? { ...s, stock: remainingStock } : s
        ));
      }
      
      console.log('✅ Payment created successfully');
      toast.success("Payment recorded successfully");
      setFarmerIdInput("");
      setSelectedStock(null);
      setStockQuantity("");
      setFarmerPreviousBalance(null);
      setFormData({
        ...formData,
        farmerCode: "",
        farmerName: "",
        paymentType: "",
        amountTaken: "",
        receivedAmount: "",
        emiChecked: false,
        emiAmount: "",
      });
      fetchPayments();
      fetchCattleFeedStocks();
    } catch (error) {
      console.error('❌ Failed to create payment:', error);
      toast.error("Failed to save payment record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
      <Card className="shadow-sm border-none">
        <CardContent>
          <div className="space-y-6">
            {/* User Info Section */}
            <div className="p-6 rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">VLC Name</Label>
                  <Select
                    value={formData.vlcName}
                    onValueChange={(value) => {
                      setFormData({ vlcName: value, fromDate: new Date(), farmerCode: "", farmerName: "", paymentType: "", amountTaken: "", receivedAmount: "", emiChecked: false, emiAmount: "" });
                      setFarmerIdInput("");
                      setFarmerPreviousBalance(null);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select VLC" />
                    </SelectTrigger>
                    <SelectContent className="bg-white ">
                      {branches.map((branch) => (
                        <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                          {branch.username} - {branch.name} - {branch.branchName || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    From Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fromDate
                          ? format(formData.fromDate, "dd-MM-yyyy")
                          : "21-04-2025"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 " align="start">
                      <Calendar
                        mode="single"
                        selected={formData.fromDate}
                        onSelect={(date) =>
                          setFormData({ ...formData, fromDate: date || new Date() })
                        }
                        initialFocus
                        className="p-3 pointer-events-auto bg-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Farmer Code
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={farmerIdInput}
                      onChange={(e) => setFarmerIdInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFarmerSearch()}
                      placeholder="Enter Farmer ID"
                    />
                    <Button onClick={handleFarmerSearch} className="bg-blue-500 hover:bg-blue-600">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Farmer Name
                  </Label>
                  <Input
                    value={formData.farmerName}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Previous Remaining Balance Section - Show when farmer is selected */}
            {formData.farmerCode && formData.farmerName && farmerPreviousBalance && farmerPreviousBalance.total > 0 && (
              <div className="p-6 rounded-lg bg-blue-50 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Remaining Balance</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {farmerPreviousBalance.advance > 0 && (
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Advance</div>
                      <div className="text-lg font-semibold text-red-600">₹{farmerPreviousBalance.advance.toFixed(2)}</div>
                    </div>
                  )}
                  {farmerPreviousBalance.cattleFeed > 0 && (
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Cattle Feed</div>
                      <div className="text-lg font-semibold text-red-600">₹{farmerPreviousBalance.cattleFeed.toFixed(2)}</div>
                    </div>
                  )}
                  {farmerPreviousBalance.other1 > 0 && (
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Other 1</div>
                      <div className="text-lg font-semibold text-red-600">₹{farmerPreviousBalance.other1.toFixed(2)}</div>
                    </div>
                  )}
                  {farmerPreviousBalance.other2 > 0 && (
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Other 2</div>
                      <div className="text-lg font-semibold text-red-600">₹{farmerPreviousBalance.other2.toFixed(2)}</div>
                    </div>
                  )}
                  <div className="bg-white p-3 rounded-lg shadow-sm border-2 border-red-400">
                    <div className="text-xs text-gray-600 mb-1">Total Previous</div>
                    <div className="text-lg font-bold text-red-600">₹{farmerPreviousBalance.total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Summary - Show when entering payment amount */}
            {formData.farmerCode && formData.farmerName && (formData.amountTaken || formData.receivedAmount) && formData.paymentType && (
              <div className="p-6 rounded-lg bg-green-50 border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600 mb-2">Previous Balance</div>
                    <div className="text-xl font-semibold text-red-600">
                      ₹{farmerPreviousBalance?.total.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600 mb-2">Current {formData.amountTaken ? 'Amount Taken' : 'Received'}</div>
                    <div className="text-xl font-semibold text-blue-600">
                      {formData.amountTaken ? '+' : '-'}₹{(parseFloat(formData.amountTaken || formData.receivedAmount || '0')).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-green-400">
                    <div className="text-sm text-gray-600 mb-2">New Total Balance</div>
                    <div className="text-xl font-bold text-green-600">
                      ₹{(
                        (farmerPreviousBalance?.total || 0) + 
                        (formData.amountTaken ? parseFloat(formData.amountTaken || '0') : -parseFloat(formData.receivedAmount || '0'))
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-6 p-6 bg-white">
            <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Payment Type
                </Label>
                <Select
                  value={formData.paymentType}
                  onValueChange={(value) => {
                    setFormData({ ...formData, paymentType: value });
                    setSelectedStock(null);
                    setStockQuantity("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Advance">Advance</SelectItem>
                    <SelectItem value="Cattle Feed">Cattle Feed</SelectItem>
                    <SelectItem value="Other1">Other 1</SelectItem>
                    <SelectItem value="Other2">Other 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.paymentType === "Cattle Feed" && (
                <>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Select Stock
                    </Label>
                    <Select
                      value={selectedStock?.id.toString() || ""}
                      onValueChange={(value) => {
                        const stock = cattleFeedStocks.find(s => s.id.toString() === value);
                        setSelectedStock(stock || null);
                        setStockQuantity("");
                        setFormData({ ...formData, amountTaken: "", receivedAmount: "" });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Stock" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {cattleFeedStocks.map((stock) => (
                          <SelectItem key={stock.id} value={stock.id.toString()}>
                            {stock.stock_name} ({stock.stock} units)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Quantity
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter quantity"
                      value={stockQuantity}
                      onChange={(e) => {
                        const qty = e.target.value;
                        setStockQuantity(qty);
                        if (selectedStock && qty) {
                          const amount = (parseFloat(qty) * parseFloat(selectedStock.amount)).toFixed(2);
                          setFormData({ ...formData, amountTaken: amount, receivedAmount: "" });
                        }
                      }}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="amountTaken" className="text-sm font-medium text-gray-700 mb-2 block">
                  Amount Taken
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <Input
                    id="amountTaken"
                    type="number"
                    placeholder="0.00"
                    className="pl-8"
                    value={formData.amountTaken}
                    onChange={(e) =>
                      setFormData({ ...formData, amountTaken: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="receivedAmount" className="text-sm font-medium text-gray-700 mb-2 block">
                  Received Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <Input
                    id="receivedAmount"
                    type="number"
                    placeholder="0.00"
                    className="pl-8"
                    value={formData.receivedAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        receivedAmount: e.target.value,
                      })
                    }
                    disabled={formData.paymentType === "Cattle Feed"}
                  />
                </div>
              </div>
            </div>

            {/* EMI Section - Only show when farmer is selected */}
            {formData.farmerCode && formData.farmerName && (
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="emiCheckbox"
                      checked={formData.emiChecked}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          emiChecked: checked as boolean,
                          emiAmount: checked ? formData.emiAmount : "",
                        });
                      }}
                    />
                    <Label
                      htmlFor="emiCheckbox"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      EMI
                    </Label>
                  </div>

                  {formData.emiChecked && (
                    <div className="flex-1 max-w-xs">
                      <Label htmlFor="emiAmount" className="text-sm font-medium text-gray-700 mb-2 block">
                        EMI Amount
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          ₹
                        </span>
                        <Input
                          id="emiAmount"
                          type="number"
                          placeholder="0.00"
                          className="pl-8"
                          value={formData.emiAmount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emiAmount: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button 
                onClick={handleSubmit}
                disabled={loading}
                className="w-full max-w-md bg-blue-600 hover:bg-blue-700 text-white h-11"
              >
                {loading ? "Submitting..." : "Submit Payment"}
              </Button>
            </div>

            {/* Records Table */}
            <div className="space-y-4 mt-8 pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Payment Records</h3>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-gray-600">
                  Showing {paymentData.length} records
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <Select value={perPage.toString()} onValueChange={(v) => { setPerPage(parseInt(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    Results per page
                  </span>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Excel Export
                  </Button>
                  <Button className="bg-red-600 hover:bg-red-700">
                    PDF Export
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        DATE
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        FARMER ID
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        NAME
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        Advance
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        Cattle Feed
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        Other 1
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        Other 2
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        Received
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="w-full">
                    {paymentData.slice((currentPage - 1) * perPage, currentPage * perPage).map((payment) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">{format(new Date(payment.date), "dd-MM-yyyy")}</td>
                        <td className="py-3 px-4 font-medium">
                          {payment.farmer_id}
                        </td>
                        <td className="py-3 px-4">{payment.farmer_name}</td>
                        <td className="py-3 px-4 text-right">
                          {payment.payment_type?.toLowerCase() === 'advance' ? (payment.amount_taken !== '0.00' ? payment.amount_taken : payment.received) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {payment.payment_type?.toLowerCase() === 'cattle feed' ? (payment.amount_taken !== '0.00' ? payment.amount_taken : payment.received) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {payment.payment_type === 'Other1' ? (payment.amount_taken !== '0.00' ? payment.amount_taken : payment.received) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {payment.payment_type === 'Other2' ? (payment.amount_taken !== '0.00' ? payment.amount_taken : payment.received) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {payment.received !== '0.00' ? payment.received : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-end gap-2 items-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                </Button>
                <span className="text-sm text-gray-600">Page {currentPage} of {Math.ceil(paymentData.length / perPage) || 1}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(paymentData.length / perPage), p + 1))}
                  disabled={currentPage >= Math.ceil(paymentData.length / perPage)}
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default PaymentAndReceipt;
