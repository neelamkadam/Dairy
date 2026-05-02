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
import { Search, Package, User, Landmark, Plus, ArrowRightLeft, FileText, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [stockSource, setStockSource] = useState<"vlc" | "group">("group");
  
  const [vlcStocks, setVlcStocks] = useState<CattleFeedStock[]>([]);
  const [groupStocks, setGroupStocks] = useState<CattleFeedStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<CattleFeedStock | null>(null);
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockRate, setStockRate] = useState("");
  
  const [amountTaken, setAmountTaken] = useState("");
  const [emiChecked, setEmiChecked] = useState(false);
  const [emiAmount, setEmiAmount] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [editingLog, setEditingLog] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  const [logToDelete, setLogToDelete] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
        received: 0,
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
      setFarmerIdInput(""); setFarmerName(""); setAmountTaken(""); setEmiChecked(false); setEmiAmount("");
      setSelectedStock(null); setStockQuantity(""); setStockRate(""); setFarmerPreviousBalance(null);
      fetchVlcStocks(vlcId); fetchGroupStocks();
    } catch (e) {
      toast.error("Failed to save payment");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!vlcId || !fromDate) {
      toast.error("Please select VLC and date");
      return;
    }

    setSummaryLoading(true);
    try {
      const dateStr = format(fromDate, "yyyy-MM-dd");
      // Use the provided API endpoint with dairy_id and date
      const response = await fetch(`https://api.neodairysales.com/farmer-payment-logs?dairy_id=${vlcId}&date=${dateStr}`);
      const data = await response.json();
      
      if (data.data) {
        // Filter data for the selected date just in case API returns more
        const filteredData = data.data.filter((item: any) => item.date === dateStr);
        setSummaryData(filteredData);
        setShowSummary(true);
      } else {
        toast.error("Failed to fetch summary data");
      }
    } catch (error) {
      console.error("Summary fetch error:", error);
      toast.error("Failed to fetch summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleEditClick = (log: any) => {
    setEditingLog(log);
    setEditFormData({
      stock: log.stock || "",
      stock_name: log.stock_name || "",
      amount_taken: log.amount_taken || "",
      descriptions: log.descriptions || ""
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateLog = async () => {
    if (!editingLog) return;
    try {
      setLoading(true);
      const payload = {
        ...editFormData,
        stock: editFormData.stock !== "" ? parseFloat(editFormData.stock) : undefined,
        amount_taken: editFormData.amount_taken !== "" ? parseFloat(editFormData.amount_taken) : undefined,
      };
      const res = await paymentApi.updateFarmerPaymentLog(editingLog.id, payload);
      if (res.status === 200) {
        toast.success("Payment log updated successfully");
        setIsEditModalOpen(false);
        fetchSummary();
      }
    } catch (e) {
      console.error("Update log error:", e);
      toast.error("Failed to update log");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!logToDelete) return;
    try {
      setLoading(true);
      const res = await paymentApi.deleteFarmerPaymentLog(logToDelete.id);
      if (res.status === 200 || res.status === 204) {
        toast.success("Payment log deleted successfully");
        setIsDeleteModalOpen(false);
        fetchSummary();
      }
    } catch (e) {
      console.error("Delete log error:", e);
      toast.error("Failed to delete log");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
               <Landmark className="w-10 h-10 text-blue-600" />
               Farmer Payment & Assignment
            </h1>
            <p className="text-slate-500 font-medium">Assign advances or cattle feed to farmers from Local or Group stocks.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate(ROUTES.REPORTS.CATTLE_FEED_STOCK_REPORT)}
              className="w-fit bg-white border-slate-200 hover:bg-slate-50 h-11 px-6 shadow-sm font-bold text-slate-700"
            >
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              Cattle Feed Report
            </Button>
            <Button 
              variant="outline" 
              onClick={fetchSummary}
              disabled={summaryLoading || !vlcId}
              className="w-fit bg-white border-slate-200 hover:bg-slate-50 h-11 px-6 shadow-sm font-bold text-slate-700"
            >
              <FileText className="w-4 h-4 mr-2 text-green-600" />
              {summaryLoading ? "Loading..." : "Summary"}
            </Button>
          </div>
        </header>

        <Card className="border-none shadow-xl shadow-slate-200 bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              <div className="p-8 bg-slate-50/50 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black text-slate-400 tracking-widest">Select VLC</Label>
                    <Select value={vlcId} onValueChange={setVlcId}>
                      <SelectTrigger className="bg-white border-slate-200 h-12 rounded-xl w-full overflow-hidden">
                        <div className="truncate text-left">
                          <SelectValue placeholder="VLC Branch" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-white max-w-[300px]">
                        {branches.map((b: any) => (
                           <SelectItem key={b.branch_id} value={b.branch_id.toString()}>
                             <span className="truncate block">
                               {b.username} - {b.name}
                             </span>
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black text-slate-400 tracking-widest">Date</Label>
                    <Input
                      type="date"
                      value={fromDate && !isNaN(fromDate.getTime()) ? format(fromDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        if (dateValue) {
                          const newDate = new Date(dateValue);
                          if (!isNaN(newDate.getTime())) {
                            setFromDate(newDate);
                          }
                        }
                      }}
                      className="bg-white h-12 rounded-xl"
                    />
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
                        <div className="text-lg font-black uppercase tracking-tight truncate">{farmerName}</div>
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
                        {["Advance", "Cattle Feed", "Kirana", "Other2"].map((t) => (
                           <Button 
                             key={t}
                             variant={paymentType === (t === "Kirana" ? "Other1" : t) ? "default" : "outline"}
                             onClick={() => setPaymentType((t === "Kirana" ? "Other1" : t) as any)}
                             className={cn(
                               "rounded-xl h-12 text-xs font-bold transition-all",
                               paymentType === (t === "Kirana" ? "Other1" : t) ? "bg-slate-900 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600"
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
                          <div className="text-5xl font-black tracking-tighter">₹{amountTaken || "0.00"}</div>
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
        
        {/* Summary Section - Mounted on page */}
        {showSummary && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-2xl shadow-slate-200 bg-white overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      Payment Summary
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">{format(fromDate, "dd MMMM yyyy")}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowSummary(false)}
                  className="rounded-full w-10 h-10 p-0 hover:bg-slate-200"
                >
                  ×
                </Button>
              </div>
              
              <div className="p-8">
                {summaryData.length > 0 ? (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50">
                        <div className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-1">Transactions</div>
                        <div className="text-3xl font-black text-slate-900">{summaryData.length}</div>
                      </div>
                      <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100/50">
                        <div className="text-sm font-bold text-green-600 uppercase tracking-widest mb-1">Total Deducted</div>
                        <div className="text-3xl font-black text-slate-900">
                          ₹{summaryData.reduce((sum, item) => sum + parseFloat(item.amount_taken || 0), 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100/50">
                        <div className="text-sm font-bold text-orange-600 uppercase tracking-widest mb-1">Farmers</div>
                        <div className="text-3xl font-black text-slate-900">
                          {new Set(summaryData.map(item => item.farmer_id)).size}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        Detailed Transaction Logs
                      </h3>
                      <div className="rounded-3xl border border-slate-100 overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-900 text-white">
                              <th className="p-4 text-left text-xs font-black uppercase tracking-widest">Farmer</th>
                              <th className="p-4 text-left text-xs font-black uppercase tracking-widest">Category</th>
                              <th className="p-4 text-right text-xs font-black uppercase tracking-widest">Taken</th>
                              <th className="p-4 text-left text-xs font-black uppercase tracking-widest">Description</th>
                              <th className="p-4 text-center text-xs font-black uppercase tracking-widest">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {summaryData.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-50 transition-colors bg-white">
                                <td className="p-4">
                                  <div className="font-black text-slate-900">{item.farmer_name}</div>
                                  <div className="text-[10px] font-bold text-slate-400">ID: {item.farmer_id}</div>
                                </td>
                                <td className="p-4">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                    item.payment_type?.toLowerCase().includes('advance') ? 'bg-blue-100 text-blue-700' :
                                    item.payment_type?.toLowerCase().includes('cattle') ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {item.payment_type}
                                  </span>
                                </td>
                                <td className="p-4 text-right font-black text-slate-900">₹{parseFloat(item.amount_taken || 0).toFixed(2)}</td>
                                <td className="p-4 text-sm text-slate-500 font-medium">{item.descriptions || '-'}</td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleEditClick(item)}
                                      className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full"
                                    >
                                      <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => { setLogToDelete(item); setIsDeleteModalOpen(true); }}
                                      className="h-8 w-8 p-0 hover:bg-red-50 rounded-full group/del"
                                    >
                                      <Trash2 className="w-4 h-4 text-slate-400 group-hover/del:text-red-600" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Stock Wise Summary - Grouped */}
                    <div>
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Stock-wise Summary
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(
                          summaryData.reduce((acc: any, item: any) => {
                            if (item.payment_type === 'cattlefeed' && item.stock_name) {
                              if (!acc[item.stock_name]) {
                                acc[item.stock_name] = { stock: 0, amount: 0 };
                              }
                              acc[item.stock_name].stock += parseFloat(item.stock || 0);
                              acc[item.stock_name].amount += parseFloat(item.amount_taken || 0);
                            }
                            return acc;
                          }, {})
                        ).map(([name, totals]: [string, any]) => (
                          <div key={name} className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm hover:border-blue-100 transition-all group">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-blue-500 transition-colors">Item Details</div>
                            <div className="text-lg font-black text-slate-900 leading-tight">
                              {name} : {totals.stock} : ₹{totals.amount.toFixed(2)}
                            </div>
                            <div className="flex gap-2 mt-4">
                               <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 w-2/3"></div>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {summaryData.filter(item => item.payment_type === 'cattlefeed').length === 0 && (
                        <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 font-medium">
                          No cattle feed transactions recorded for this date.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="text-6xl mb-6 grayscale opacity-50">📊</div>
                    <div className="text-2xl font-black text-slate-900 mb-2">No data recorded</div>
                    <p className="text-slate-500">There are no payment transactions for the selected date.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Edit Payment Log</DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Update details for this transaction record.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock_name" className="text-right font-bold text-slate-600">Stock Name</Label>
              <Input
                id="stock_name"
                value={editFormData.stock_name}
                onChange={(e) => setEditFormData({ ...editFormData, stock_name: e.target.value })}
                className="col-span-3 rounded-xl h-11"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right font-bold text-slate-600">Quantity</Label>
              <Input
                id="stock"
                type="number"
                value={editFormData.stock}
                onChange={(e) => setEditFormData({ ...editFormData, stock: e.target.value })}
                className="col-span-3 rounded-xl h-11"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right font-bold text-slate-600">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={editFormData.amount_taken}
                onChange={(e) => setEditFormData({ ...editFormData, amount_taken: e.target.value })}
                className="col-span-3 rounded-xl h-11"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="desc" className="text-right font-bold text-slate-600">Description</Label>
              <Input
                id="desc"
                value={editFormData.descriptions}
                onChange={(e) => setEditFormData({ ...editFormData, descriptions: e.target.value })}
                className="col-span-3 rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleUpdateLog} 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-black shadow-lg shadow-blue-100"
            >
              {loading ? "SAVING..." : "SAVE CHANGES"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-3xl p-8">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900">Are you sure?</DialogTitle>
            <DialogDescription className="font-medium text-slate-500 mt-2">
              This will permanently delete the transaction record for <span className="font-black text-slate-900">{logToDelete?.farmer_name}</span>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl h-12 font-bold border-slate-200 hover:bg-slate-50"
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleDeleteLog} 
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 h-12 rounded-xl font-black text-white shadow-lg shadow-red-100"
            >
              {loading ? "DELETING..." : "DELETE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerPayment;
