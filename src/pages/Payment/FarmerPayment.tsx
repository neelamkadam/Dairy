import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppSelector } from "@/redux/store";
import { cattleFeedApi, CattleFeedStock } from "@/services/cattleFeedApi";
import { userApi } from "@/services/userApi";
import { deductionApi } from "@/services/deductionApi";
import { paymentApi } from "@/services/paymentApi";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constatnts/routesConstants";
import { Search, Calendar as CalendarIcon, Package, User, Landmark, Plus, ArrowRightLeft, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const FarmerPayment: React.FC = () => {
  const navigate = useNavigate();
  const authState = useAppSelector((state: any) => state.authData);
  const { branches } = useAppSelector((state: any) => state.branch);
  const webUserId = authState?.userData?.id;

  const [loading, setLoading] = useState(false);
  const [vlcId, setVlcId] = useState("");
  const [fromDate, setFromDate] = useState<Date>(new Date());
  
  const [farmerIdInput, setFarmerIdInput] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [farmerPreviousBalance, setFarmerPreviousBalance] = useState<any>(null);
  
  const [paymentType, setPaymentType] = useState<"Advance" | "Cattle Feed" | "Other1" | "Other2" | "">("");
  const [stockSource, setStockSource] = useState<"vlc" | "group">("vlc");
  
  const [vlcStocks, setVlcStocks] = useState<CattleFeedStock[]>([]);
  const [groupStocks, setGroupStocks] = useState<CattleFeedStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<CattleFeedStock | null>(null);
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockRate, setStockRate] = useState("");
  
  const [amountTaken, setAmountTaken] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [emiChecked, setEmiChecked] = useState(false);
  const [emiAmount, setEmiAmount] = useState("");

  const normalizeFarmerId = (id: string) => {
    if (!id) return "";
    return id.replace(/[a-zA-Z]/g, "").padStart(4, "0");
  };

  const calculatePreviousPeriodDates = (currentDate: Date) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    let prevStartDay, prevEndDay, prevMonth = month, prevYear = year;
    
    if (day <= 10) {
      prevMonth = month - 1;
      if (prevMonth < 0) { prevMonth = 11; prevYear = year - 1; }
      prevStartDay = 21; prevEndDay = new Date(prevYear, prevMonth + 1, 0).getDate();
    } else if (day <= 20) {
      prevStartDay = 1; prevEndDay = 10;
    } else {
      prevStartDay = 11; prevEndDay = 20;
    }
    return { from: new Date(prevYear, prevMonth, prevStartDay), to: new Date(prevYear, prevMonth, prevEndDay) };
  };

  const fetchVlcStocks = async (id: string) => {
    try {
      const res = await cattleFeedApi.getStock(id, "vlc");
      if (res.success) setVlcStocks(res.data);
    } catch (e) { console.error("VLC stock fetch failed", e); }
  };

  const fetchGroupStocks = async () => {
    if (!webUserId) return;
    try {
      const res = await cattleFeedApi.getStock(webUserId, "group");
      if (res.success) setGroupStocks(res.data);
    } catch (e) { console.error("Group stock fetch failed", e); }
  };

  useEffect(() => {
    if (vlcId) fetchVlcStocks(vlcId);
    if (webUserId) fetchGroupStocks();
  }, [vlcId, webUserId]);

  const handleFarmerSearch = async () => {
    if (!vlcId || !farmerIdInput) {
      toast.error("VLC and Farmer ID are required");
      return;
    }
    try {
      setLoading(true);
      const normalized = normalizeFarmerId(farmerIdInput);
      const farmer = await userApi.getById(normalized, parseInt(vlcId));
      if (farmer) {
        setFarmerName(farmer.fullName || farmer.name || 'Unknown Farmer');
        const prev = calculatePreviousPeriodDates(fromDate);
        const { data } = await deductionApi.getAllFarmersBalance(parseInt(vlcId), format(prev.from, "yyyy-MM-dd"), format(prev.to, "yyyy-MM-dd"));
        
        let farmerBalance = { advance: 0, cattleFeed: 0, other1: 0, other2: 0, total: 0 };
        for (const entry of data.data || []) {
          const f = entry.farmers?.find((f: any) => f.farmer_id === normalized);
          if (f?.previous_bill) {
            farmerBalance = {
              advance: parseFloat(f.previous_bill.advance_remaining || 0),
              cattleFeed: parseFloat(f.previous_bill.cattlefeed_remaining || 0),
              other1: parseFloat(f.previous_bill.other1_remaining || 0),
              other2: parseFloat(f.previous_bill.other2_remaining || 0),
              total: 0
            };
            farmerBalance.total = farmerBalance.advance + farmerBalance.cattleFeed + farmerBalance.other1 + farmerBalance.other2;
            break;
          }
        }
        setFarmerPreviousBalance(farmerBalance);
        toast.success("Farmer found");
      } else {
        toast.error("Farmer not found");
        setFarmerName(""); setFarmerPreviousBalance(null);
      }
    } catch (e) {
      toast.error("Error searching farmer");
    } finally {
      setLoading(false);
    }
  };

  const handleStockSelection = (stockId: string) => {
    const list = stockSource === "vlc" ? vlcStocks : groupStocks;
    const stock = list.find(s => s.id.toString() === stockId);
    if (stock) {
      setSelectedStock(stock);
      setStockRate(parseFloat(stock.amount.toString()).toFixed(2));
      setStockQuantity("");
      setAmountTaken("");
    }
  };

  const handleSubmit = async () => {
    if (!vlcId || !farmerName || !paymentType) {
      toast.error("Missing required fields");
      return;
    }

    if (paymentType === "Cattle Feed" && (!selectedStock || !stockQuantity)) {
      toast.error("Select stock and enter quantity");
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(fromDate, "yyyy-MM-dd");
      const normalized = normalizeFarmerId(farmerIdInput);
      const basePayload = {
        date: dateStr,
        dairy_id: vlcId,
        farmer_id: normalized,
        farmer_name: farmerName,
        payment_type: paymentType as any,
        amount_taken: parseFloat(amountTaken || "0"),
        received: parseFloat(receivedAmount || "0"),
        emi: emiChecked ? 1 : 0,
        emi_amount: emiChecked ? parseFloat(emiAmount || "0") : 0,
      };

      await paymentApi.create(basePayload);

      if (paymentType === "Cattle Feed" && selectedStock) {
        const qty = parseFloat(stockQuantity);
        const remaining = Math.max(0, selectedStock.stock - qty);
        await cattleFeedApi.updateStock(selectedStock.id, { 
          stock_name: selectedStock.stock_name,
          amount: parseFloat(stockRate || selectedStock.amount.toString()),
          stock: remaining 
        });

        await paymentApi.createFarmerPaymentLog({
          date: dateStr,
          dairy_id: Number(vlcId),
          farmer_id: normalized,
          farmer_name: farmerName,
          payment_type: "cattlefeed", // Use correct enum value
          amount_taken: parseFloat(amountTaken),
          received: 0,
          descriptions: `${stockSource.toUpperCase()}: ${selectedStock.stock_name} (${qty} units)`,
          stock: qty,
          stock_name: selectedStock.stock_name,
        });
      }

      toast.success("Payment recorded successfully");
      setFarmerIdInput(""); setFarmerName(""); setAmountTaken(""); setReceivedAmount(""); setEmiChecked(false); setEmiAmount("");
      setSelectedStock(null); setStockQuantity(""); setStockRate(""); setFarmerPreviousBalance(null);
      fetchVlcStocks(vlcId); fetchGroupStocks();
    } catch (e) {
      toast.error("Failed to save payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
               <Landmark className="w-10 h-10 text-blue-600" />
               Farmer Payment & Assignment
            </h1>
            <p className="text-slate-500 font-medium">Assign advances or cattle feed to farmers from Local or Group stocks.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate(ROUTES.REPORTS.CATTLE_FEED_STOCK_REPORT)}
            className="w-fit bg-white border-slate-200 hover:bg-slate-50 h-11 px-6 shadow-sm font-bold text-slate-700"
          >
            <FileText className="w-4 h-4 mr-2 text-blue-600" />
            Cattle Feed Report
          </Button>
        </header>

        <Card className="border-none shadow-xl shadow-slate-200 bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              <div className="p-8 bg-slate-50/50 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black text-slate-400 tracking-widest">Select VLC</Label>
                    <Select value={vlcId} onValueChange={setVlcId}>
                      <SelectTrigger className="bg-white border-slate-200 h-12 rounded-xl"><SelectValue placeholder="VLC Branch" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {branches.map((b: any) => (
                           <SelectItem key={b.branch_id} value={b.branch_id.toString()}>{b.username} - {b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black text-slate-400 tracking-widest">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full text-left bg-white h-12 rounded-xl justify-between">
                          {format(fromDate, "dd/MM/yyyy")}
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white" align="start">
                        <Calendar mode="single" selected={fromDate} onSelect={(d) => d && setFromDate(d)} className="bg-white" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 space-y-4">
                   <div className="space-y-2">
                     <Label className="uppercase text-[10px] font-black text-slate-400 tracking-widest">Search Farmer</Label>
                     <div className="flex gap-2">
                       <Input 
                        value={farmerIdInput} 
                        onChange={(e) => setFarmerIdInput(e.target.value)} 
                        placeholder="ID"
                        onKeyDown={(e) => e.key === 'Enter' && handleFarmerSearch()}
                        className="bg-white h-12 rounded-xl font-bold"
                       />
                       <Button onClick={handleFarmerSearch} className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700">
                         <Search className="w-5 h-5" />
                       </Button>
                     </div>
                   </div>
                   {farmerName && (
                     <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-100 italic animate-in fade-in zoom-in duration-300">
                        <User className="w-5 h-5 mb-2 opacity-60" />
                        <div className="text-sm font-medium opacity-80">Farmer Name</div>
                        <div className="text-lg font-black uppercase tracking-tight">{farmerName}</div>
                        {farmerPreviousBalance && (
                          <div className="mt-3 pt-3 border-t border-blue-500 flex justify-between items-center text-xs">
                             <span className="font-bold">Prev. Balance</span>
                             <span className="font-black text-base">₹{farmerPreviousBalance.total.toFixed(2)}</span>
                          </div>
                        )}
                     </div>
                   )}
                </div>
              </div>

              <div className="lg:col-span-3 p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700">Payment Category</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Advance", "Cattle Feed", "Other1", "Other2"].map((t) => (
                           <Button 
                             key={t}
                             variant={paymentType === t ? "default" : "outline"}
                             onClick={() => setPaymentType(t as any)}
                             className={cn(
                               "rounded-xl h-12 text-xs font-bold transition-all",
                               paymentType === t ? "bg-slate-900 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600"
                             )}
                           >
                             {t}
                           </Button>
                        ))}
                      </div>
                    </div>

                    {paymentType === "Cattle Feed" && (
                      <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between mb-2">
                           <Label className="text-xs font-black text-amber-700 uppercase tracking-widest">Stock Source</Label>
                           <div className="flex bg-white p-1 rounded-lg border border-amber-200">
                             <button 
                               onClick={() => { setStockSource("vlc"); setSelectedStock(null); }}
                               className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", stockSource === "vlc" ? "bg-amber-600 text-white" : "text-amber-600 hover:bg-amber-50")}
                             >VLC</button>
                             <button 
                               onClick={() => { setStockSource("group"); setSelectedStock(null); }}
                               className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", stockSource === "group" ? "bg-amber-700 text-white" : "text-amber-700 hover:bg-amber-50")}
                             >GROUP</button>
                           </div>
                        </div>
                        
                        <div className="space-y-3">
                          <Label className="text-sm font-bold text-amber-900">Select {stockSource.toUpperCase()} Feed Item</Label>
                          <Select value={selectedStock?.id.toString() || ""} onValueChange={handleStockSelection}>
                            <SelectTrigger className="bg-white border-amber-200 h-11"><SelectValue placeholder="Search Inventory..." /></SelectTrigger>
                            <SelectContent className="bg-white">
                              {(stockSource === "vlc" ? vlcStocks : groupStocks).map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                  {s.stock_name} ({s.stock} Unit)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedStock && (
                          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
                             <div className="space-y-2">
                               <Label className="text-xs font-bold text-amber-800">Assign Quantity</Label>
                               <div className="relative">
                                 <Plus className="absolute left-3 top-2.5 w-4 h-4 text-amber-500" />
                                 <Input 
                                  type="number" 
                                  value={stockQuantity} 
                                  onChange={(e) => {
                                    const qty = e.target.value;
                                    setStockQuantity(qty);
                                    if (stockRate && qty) setAmountTaken((parseFloat(qty) * parseFloat(stockRate)).toFixed(2));
                                  }}
                                  className="pl-9 bg-white border-amber-200 h-11"
                                 />
                               </div>
                             </div>
                             <div className="space-y-2">
                               <Label className="text-xs font-bold text-amber-800">Unit Rate</Label>
                               <Input 
                                value={stockRate} 
                                onChange={(e) => setStockRate(e.target.value)}
                                className="bg-white border-amber-200 h-11 font-bold text-amber-900" 
                               />
                             </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                     <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl shadow-indigo-100 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Total Amount to Deduct</div>
                          <div className="text-5xl font-black tracking-tighter">₹{amountTaken || receivedAmount || "0.00"}</div>
                        </div>
                        
                        <div className="mt-8 space-y-4">
                           <div className="space-y-2">
                              <Label className="text-xs font-bold text-indigo-300">Adjustment Amount (Taken)</Label>
                              <Input 
                                type="number" 
                                value={amountTaken} 
                                onChange={(e) => setAmountTaken(e.target.value)}
                                placeholder="0.00"
                                className="bg-white/10 border-white/10 h-10 text-white placeholder:text-white/20 text-lg font-bold rounded-xl"
                                disabled={paymentType === "Cattle Feed"}
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs font-bold text-indigo-300">Received from Farmer</Label>
                              <Input 
                                type="number" 
                                value={receivedAmount} 
                                onChange={(e) => setReceivedAmount(e.target.value)}
                                placeholder="0.00"
                                className="bg-white/10 border-white/10 h-10 text-white placeholder:text-white/20 rounded-xl"
                                disabled={paymentType === "Cattle Feed"}
                              />
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                           <Checkbox id="emi" checked={emiChecked} onCheckedChange={(v) => setEmiChecked(v as any)} className="w-5 h-5 rounded-md border-slate-300" />
                           <Label htmlFor="emi" className="font-bold text-slate-700">Enable EMI Schedule</Label>
                        </div>
                        {emiChecked && (
                          <Input 
                            type="number" 
                            value={emiAmount} 
                            onChange={(e) => setEmiAmount(e.target.value)} 
                            placeholder="EMI Amt"
                            className="w-32 h-10 rounded-xl"
                          />
                        )}
                     </div>

                     <Button 
                      onClick={handleSubmit} 
                      disabled={loading || !farmerName} 
                      className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-2xl text-xl font-black shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                     >
                       {loading ? "COMMITTING TRANSACTION..." : "SUBMIT PAYMENT"}
                     </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerPayment;
