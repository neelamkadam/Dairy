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
import { Bell, CircleUserRound, ChevronRight, ChevronLeft, Search, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isValid } from "date-fns";
import { paymentApi } from "@/services/paymentApi";
import { normalizeFarmerId, formatFarmerIdForDisplay } from "@/utils/farmerIdUtils";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { userApi } from "@/services/userApi";
import { cattleFeedApi, CattleFeedStock } from "@/services/cattleFeedApi";
import { deductionApi } from "@/services/deductionApi";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";

const toPaymentLogType = (paymentType: string) => {
  const normalized = paymentType.toLowerCase().replace(/\s+/g, "");

  switch (normalized) {
    case "advance":
      return "advance" as const;
    case "cattlefeed":
      return "cattlefeed" as const;
    case "other1":
      return "other1" as const;
    case "other2":
      return "other2" as const;
    default:
      return null;
  }
};

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
  const [stockRate, setStockRate] = useState("");
  const [farmerPreviousBalance, setFarmerPreviousBalance] = useState<{
    advance: number;
    cattleFeed: number;
    other1: number;
    other2: number;
    total: number;
  } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroupedRecord, setSelectedGroupedRecord] = useState<any>(null);

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
      const [paymentsRes, logsRes] = await Promise.all([
        paymentApi.getPayments(queryParams),
        paymentApi.getFarmerPaymentLogs(queryParams)
      ]);
      
      const paymentsData = (paymentsRes.data.data || [])
        .filter((p: any) => p.payment_type?.toLowerCase()?.replace(/\s+/g, "") !== "cattlefeed")
        .map((p: any) => ({ ...p, _source: 'payment' }));
      const logsData = (logsRes.data.data || [])
        .filter((l: any) => l.payment_type?.toLowerCase()?.replace(/\s+/g, "") === "cattlefeed")
        .map((l: any) => ({ ...l, _source: 'log' }));
      
      const combinedData = [...paymentsData, ...logsData];
      
      const selectedDate = format(formData.fromDate, "yyyy-MM-dd");
      const filtered = combinedData.filter((payment: any) =>
        format(new Date(payment.date), "yyyy-MM-dd") === selectedDate
      );
      
      const groupedMap = new Map<string, any>();
      filtered.forEach((record: any) => {
        const key = record.farmer_id;
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            farmer_id: record.farmer_id,
            farmer_name: record.farmer_name,
            date: record.date,
            advance: 0,
            cattleFeed: 0,
            other1: 0,
            other2: 0,
            received: 0,
            records: []
          });
        }
        const group = groupedMap.get(key);
        group.records.push(record);
        
        const type = record.payment_type?.toLowerCase();
        const amtTaken = parseFloat(record.amount_taken || '0');
        const rcvd = parseFloat(record.received || '0');
        
        if (rcvd > 0) {
          group.received += rcvd;
        } else if (amtTaken > 0) {
          if (type === 'advance') group.advance += amtTaken;
          else if (type === 'cattle feed' || type === 'cattlefeed') group.cattleFeed += amtTaken;
          else if (type === 'other1') group.other1 += amtTaken;
          else if (type === 'other2') group.other2 += amtTaken;
        }
      });
      
      const groupedArray = Array.from(groupedMap.values());
      groupedArray.sort((a, b) => b.farmer_id.localeCompare(a.farmer_id));
      
      setPaymentData(groupedArray);
    } catch (error) {
      console.error("❌ Failed to fetch payments", error);
    }
  };

  const handleDeletePayment = async (id: number, source: string) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;

    try {
      if (source === 'log') {
        await paymentApi.deleteFarmerPaymentLog(id.toString());
      } else {
        await paymentApi.delete(id.toString());
      }
      toast.success('Payment deleted successfully');
      
      setSelectedGroupedRecord((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          records: prev.records.filter((r: any) => !(r.id === id && r._source === source))
        };
      });

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
        const paymentLogType = toPaymentLogType(formData.paymentType);

        await cattleFeedApi.updateStock(selectedStock.id, {
          stock_name: selectedStock.stock_name,
          amount: parseFloat(stockRate || selectedStock.amount.toString()),
          stock: remainingStock
        });

        if (paymentLogType) {
          try {
            const logPayload = {
              date: format(formData.fromDate, "yyyy-MM-dd"),
              dairy_id: Number(formData.vlcName),
              farmer_id: normalizeFarmerId(formData.farmerCode),
              farmer_name: formData.farmerName,
              payment_type: paymentLogType,
              amount_taken: parseFloat(formData.amountTaken || "0"),
              received: parseFloat(formData.receivedAmount || "0"),
              descriptions: `${selectedStock.stock_name}:${stockToReduce}`,
              stock: stockToReduce,
              stock_name: selectedStock.stock_name,
            };
            console.log("📦 Farmer payment log payload:", logPayload);
            await paymentApi.createFarmerPaymentLog(logPayload);
          } catch (logError: unknown) {
            const errorWithResponse = logError as { response?: { data?: unknown } };
            console.error("⚠️ Farmer payment log failed (payment still saved):", errorWithResponse.response?.data || logError);
          }
        }

        setCattleFeedStocks(prev => prev.map(s =>
          s.id === selectedStock.id ? { ...s, stock: remainingStock } : s
        ));
      }

      console.log('✅ Payment created successfully');
      toast.success("Payment recorded successfully");
      setFarmerIdInput("");
      setSelectedStock(null);
      setStockQuantity("");
      setStockRate("");
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex flex-col items-start text-left gap-1.5 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Payment & Receipt
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Manage farmer payments, advances, and cattle feed deductions with ease.
          </p>
        </div>

        {/* Top Filter & Farmer Details Card */}
        <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl py-0 gap-0">
          <CardHeader className="px-4 py-3 !pb-3 border-b border-slate-100/50 bg-white/50">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <CircleUserRound className="w-5 h-5 text-indigo-500" />
              Filter & Farmer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5 group">
                <Label className="text-sm font-medium text-gray-700">VLC Name</Label>
                <VLCDropdown
                  branches={branches}
                  value={formData.vlcName}
                  onChange={(value) => {
                    setFormData({ vlcName: value, fromDate: new Date(), farmerCode: "", farmerName: "", paymentType: "", amountTaken: "", receivedAmount: "", emiChecked: false, emiAmount: "" });
                    setFarmerIdInput("");
                    setFarmerPreviousBalance(null);
                    setCurrentPage(1);
                  }}
                  valueKey="branch_id"
                  placeholder="Select VLC"
                />
              </div>

              <div className="space-y-1.5 group">
                <Label className="text-sm font-medium text-gray-700">From Date</Label>
                <Input
                  type="date"
                  value={formData.fromDate ? format(formData.fromDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (isValid(d)) setFormData({ ...formData, fromDate: d });
                  }}
                  className="w-full h-10 border-gray-200"
                />
              </div>

              <div className="space-y-1.5 group">
                <Label className="text-sm font-medium text-gray-700">Farmer Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={farmerIdInput}
                    onChange={(e) => setFarmerIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFarmerSearch()}
                    placeholder="Enter ID"
                    className="h-10 border-gray-200"
                  />
                  <Button onClick={handleFarmerSearch} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/20 transition-all active:scale-95 rounded-xl h-10 w-10 p-0 flex items-center justify-center shrink-0">
                    <Search className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Farmer Name</Label>
                <Input
                  value={formData.farmerName}
                  readOnly
                  className="bg-gray-50 h-10 cursor-not-allowed"
                  placeholder="-"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fintech-style Financial Summaries */}
        {formData.farmerCode && formData.farmerName && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in zoom-in-95 duration-500">
            
            {/* Previous Balance Card */}
            {farmerPreviousBalance && farmerPreviousBalance.total > 0 && (
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 shadow-xl shadow-slate-900/10 relative overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all duration-700"></div>
                <div className="absolute right-10 bottom-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
                
                <h3 className="text-slate-400 font-semibold text-xs tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  Previous Balance
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
                  {farmerPreviousBalance.advance > 0 && (
                    <div className="space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Advance</div>
                      <div className="text-lg font-bold text-white">₹{farmerPreviousBalance.advance.toFixed(2)}</div>
                    </div>
                  )}
                  {farmerPreviousBalance.cattleFeed > 0 && (
                    <div className="space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Cattle Feed</div>
                      <div className="text-lg font-bold text-white">₹{farmerPreviousBalance.cattleFeed.toFixed(2)}</div>
                    </div>
                  )}
                  {farmerPreviousBalance.other1 > 0 && (
                    <div className="space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Other 1</div>
                      <div className="text-lg font-bold text-white">₹{farmerPreviousBalance.other1.toFixed(2)}</div>
                    </div>
                  )}
                  {farmerPreviousBalance.other2 > 0 && (
                    <div className="space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Other 2</div>
                      <div className="text-lg font-bold text-white">₹{farmerPreviousBalance.other2.toFixed(2)}</div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-end relative z-10">
                  <div className="text-slate-300 text-sm font-medium">Total Due</div>
                  <div className="text-2xl font-extrabold text-rose-400 tracking-tight">
                    ₹{farmerPreviousBalance.total.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Summary Card */}
            {(formData.amountTaken || formData.receivedAmount) && formData.paymentType && (
              <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white p-4 shadow-xl shadow-emerald-600/20 relative overflow-hidden group">
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                <div className="absolute right-0 top-0 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl"></div>

                <h3 className="text-emerald-100 font-semibold text-xs tracking-[0.2em] uppercase mb-3 flex items-center gap-2 relative z-10">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  Transaction Summary
                </h3>
                
                <div className="flex justify-between items-center mb-3 relative z-10">
                  <div>
                    <div className="text-emerald-100 text-[10px] uppercase tracking-wider font-semibold mb-1">
                      {formData.amountTaken ? 'Taking / Debiting' : 'Receiving / Crediting'}
                    </div>
                    <div className="text-xl font-extrabold flex items-center gap-1">
                      {formData.amountTaken ? (
                        <span className="text-white">-</span>
                      ) : (
                        <span className="text-white">+</span>
                      )}
                      ₹{(parseFloat(formData.amountTaken || formData.receivedAmount || '0')).toFixed(2)}
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner border border-white/10">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                </div>
                
                <div className="pt-5 border-t border-emerald-400/30 flex justify-between items-end relative z-10">
                  <div className="text-emerald-50 text-sm font-medium">New Total Balance</div>
                  <div className="text-2xl font-extrabold text-white tracking-tight">
                    ₹{(
                      (farmerPreviousBalance?.total || 0) +
                      (formData.amountTaken ? parseFloat(formData.amountTaken || '0') : -parseFloat(formData.receivedAmount || '0'))
                    ).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Details Form */}
        <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden rounded-2xl py-0 gap-0">
          <CardHeader className="px-4 py-3 !pb-3 border-b border-slate-100/50 bg-white/50">
            <CardTitle className="text-lg font-semibold text-slate-800">Payment Entry</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 group">
                <Label className="text-sm font-medium text-gray-700">Payment Type</Label>
                <Select
                  value={formData.paymentType}
                  onValueChange={(value) => {
                    setFormData({ ...formData, paymentType: value });
                    setSelectedStock(null);
                    setStockQuantity("");
                    setStockRate("");
                  }}
                >
                  <SelectTrigger className="w-full h-10 border-gray-200">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                    <SelectItem value="Advance" className="rounded-lg cursor-pointer hover:bg-indigo-50">Advance</SelectItem>
                    <SelectItem value="Cattle Feed" className="rounded-lg cursor-pointer hover:bg-indigo-50">Cattle Feed</SelectItem>
                    <SelectItem value="Other1" className="rounded-lg cursor-pointer hover:bg-indigo-50">Other 1</SelectItem>
                    <SelectItem value="Other2" className="rounded-lg cursor-pointer hover:bg-indigo-50">Other 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.paymentType === "Cattle Feed" && (
                <>
                  <div className="space-y-1.5 group">
                    <Label className="text-sm font-medium text-gray-700">Select Stock</Label>
                    <Select
                      value={selectedStock?.id.toString() || ""}
                      onValueChange={(value) => {
                        const stock = cattleFeedStocks.find(s => s.id.toString() === value);
                        setSelectedStock(stock || null);
                        setStockQuantity("");
                        setStockRate(stock ? parseFloat(stock.amount.toString()).toFixed(2) : "");
                        setFormData({ ...formData, amountTaken: "", receivedAmount: "" });
                      }}
                    >
                      <SelectTrigger className="w-full h-10 border-gray-200">
                        <SelectValue placeholder="Select Stock" />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                        {cattleFeedStocks.map((stock) => (
                          <SelectItem key={stock.id} value={stock.id.toString()} className="rounded-lg cursor-pointer hover:bg-indigo-50">
                            {stock.stock_name} <span className="text-slate-400 ml-1">({stock.stock} units)</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 group">
                    <Label className="text-sm font-medium text-gray-700">Rate (₹/unit)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-8 h-10 border-gray-200"
                        value={stockRate}
                        onChange={(e) => {
                          const rate = e.target.value;
                          setStockRate(rate);
                          if (stockQuantity && rate) {
                            const amount = (parseFloat(stockQuantity) * parseFloat(rate)).toFixed(2);
                            setFormData({ ...formData, amountTaken: amount, receivedAmount: "" });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <Label className="text-sm font-medium text-gray-700">Quantity</Label>
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="h-10 border-gray-200"
                      value={stockQuantity}
                      onChange={(e) => {
                        const qty = e.target.value;
                        setStockQuantity(qty);
                        if (stockRate && qty) {
                          const amount = (parseFloat(qty) * parseFloat(stockRate)).toFixed(2);
                          setFormData({ ...formData, amountTaken: amount, receivedAmount: "" });
                        }
                      }}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5 group">
                <Label htmlFor="amountTaken" className="text-sm font-medium text-gray-700">Amount Taken (Debit)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                  <Input
                    id="amountTaken"
                    type="number"
                    placeholder="0.00"
                    className="pl-8 h-10 border-gray-200 "
                    value={formData.amountTaken}
                    onChange={(e) => setFormData({ ...formData, amountTaken: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <Label htmlFor="receivedAmount" className="text-sm font-medium text-gray-700">Received Amount (Credit)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                  <Input
                    id="receivedAmount"
                    type="number"
                    placeholder="0.00"
                    className="pl-8 h-10 border-gray-200 "
                    value={formData.receivedAmount}
                    onChange={(e) => setFormData({ ...formData, receivedAmount: e.target.value })}
                    disabled={formData.paymentType === "Cattle Feed"}
                  />
                </div>
              </div>
            </div>

            {/* EMI Section */}
            {formData.farmerCode && formData.farmerName && (
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-end gap-5">
                <div className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-300">
                  <Checkbox
                    id="emiCheckbox"
                    checked={formData.emiChecked}
                    className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        emiChecked: checked as boolean,
                        emiAmount: checked ? formData.emiAmount : "",
                      });
                    }}
                  />
                  <Label htmlFor="emiCheckbox" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    Enable EMI Options
                  </Label>
                </div>

                {formData.emiChecked && (
                  <div className="flex-1 max-w-xs space-y-1.5 animate-in slide-in-from-left-4 fade-in duration-300">
                    <Label htmlFor="emiAmount" className="text-sm font-medium text-gray-700">EMI Amount</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                      <Input
                        id="emiAmount"
                        type="number"
                        placeholder="0.00"
                        className="pl-8 h-10 border-gray-200"
                        value={formData.emiAmount}
                        onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-auto min-w-[200px] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-[0.98] h-10 rounded-md text-sm font-semibold tracking-wide"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  "Confirm Payment"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden rounded-2xl py-0 gap-0">
          <CardHeader className="px-4 py-3 !pb-3 border-b border-slate-100/50 bg-white/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800">Recent Transactions</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Viewing {paymentData.length} records</CardDescription>
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm h-8">
                <span className="text-[11px] font-bold text-slate-500 uppercase leading-none mt-0.5">Limit</span>
                <Select value={perPage.toString()} onValueChange={(v) => { setPerPage(parseInt(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-auto !gap-1 bg-transparent !border-none !shadow-none focus:ring-0 text-xs font-semibold text-slate-700 !p-0 !h-auto leading-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-lg shadow-xl border-slate-100">
                    <SelectItem value="25" className="rounded-md text-xs">25</SelectItem>
                    <SelectItem value="50" className="rounded-md text-xs">50</SelectItem>
                    <SelectItem value="100" className="rounded-md text-xs">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm h-8 rounded-lg px-3 text-xs font-semibold transition-all">
                Export Excel
              </Button>
              <Button size="sm" className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-sm h-8 rounded-lg px-3 text-xs font-semibold transition-all">
                Export PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Date</th>
                    <th className="py-3.5 px-4 font-semibold">Farmer ID</th>
                    <th className="py-3.5 px-4 font-semibold">Name</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Advance</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Cattle Feed</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Other 1</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Other 2</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentData.slice((currentPage - 1) * perPage, currentPage * perPage).map((group, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedGroupedRecord(group);
                        setIsModalOpen(true);
                      }}
                    >
                      <td className="py-3 px-4 text-slate-900 font-medium whitespace-nowrap">
                        {format(new Date(group.date), "dd-MM-yyyy")}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-xs">{group.farmer_id}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{group.farmer_name}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {group.advance > 0 ? group.advance.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {group.cattleFeed > 0 ? group.cattleFeed.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {group.other1 > 0 ? group.other1.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {group.other2 > 0 ? group.other2.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 bg-emerald-50/20">
                        {group.received > 0 ? group.received.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                  {paymentData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <CircleUserRound className="h-12 w-12 mb-3 opacity-20" />
                          <p className="text-base font-medium">No transactions found</p>
                          <p className="text-xs mt-1">Select a VLC and date to view records</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {paymentData.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-4 border-t border-slate-100 bg-slate-50/50 gap-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * perPage + 1}</span> - <span className="text-slate-900 font-bold">{Math.min(currentPage * perPage, paymentData.length)}</span> of <span className="text-slate-900 font-bold">{paymentData.length}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 rounded-xl bg-white border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold shadow-sm transition-all"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <div className="text-sm font-bold text-slate-700 px-2">
                    {currentPage} / {Math.ceil(paymentData.length / perPage) || 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 rounded-xl bg-white border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold shadow-sm transition-all"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(paymentData.length / perPage), p + 1))}
                    disabled={currentPage >= Math.ceil(paymentData.length / perPage)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedGroupedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Transaction Details
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  {selectedGroupedRecord.farmer_name} ({selectedGroupedRecord.farmer_id}) - {format(new Date(selectedGroupedRecord.date), "dd MMM yyyy")}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 p-0 rounded-full hover:bg-slate-200"
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </Button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Description / Stock</th>
                      <th className="py-3 px-4 text-right">Debit</th>
                      <th className="py-3 px-4 text-right">Credit</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedGroupedRecord.records.length > 0 ? selectedGroupedRecord.records.map((record: any) => (
                      <tr key={`${record._source}-${record.id}`} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-medium text-slate-700 capitalize">
                          {record.payment_type || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {record.descriptions || record.stock_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {parseFloat(record.amount_taken || '0') > 0 ? parseFloat(record.amount_taken).toFixed(2) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          {parseFloat(record.received || '0') > 0 ? parseFloat(record.received).toFixed(2) : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePayment(record.id, record._source)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default PaymentAndReceipt;
