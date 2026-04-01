import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cattleFeedApi, CattleFeedStock } from "@/services/cattleFeedApi";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { format } from "date-fns";
import { Pencil, Trash2, Plus, FileText, Search, Package, IndianRupee, Calendar as CalendarIcon, ArrowRightLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constatnts/routesConstants";

const GroupCattleFeedStock: React.FC = () => {
  const navigate = useNavigate();
  const authState = useAppSelector((state: any) => state.authData);
  const webUserId = authState?.userData?.id ? Number(authState.userData.id) : null;
  const { branches } = useAppSelector((state: any) => state.branch);
  
  const [stockName, setStockName] = useState("");
  const [stock, setStock] = useState("");
  const [amount, setAmount] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(new Date());
  
  const [loading, setLoading] = useState(false);
  const [allStocks, setAllStocks] = useState<CattleFeedStock[]>([]);
  
  // Transfer state
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferItem, setTransferItem] = useState<CattleFeedStock | null>(null);
  const [transferQty, setTransferQty] = useState("");
  const [targetVlc, setTargetVlc] = useState("");

  const fetchAllStocks = async () => {
    if (!webUserId) return;
    try {
      setLoading(true);
      // Backend: /web/cattlefeed-stock/get?owner_type=group&owner_id=webUserId
      const response = await cattleFeedApi.getStock(webUserId, "group");
      if (response.success && Array.isArray(response.data)) {
        setAllStocks(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch group stocks:', error);
      toast.error("Failed to fetch group stocks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStocks();
  }, [webUserId]);

  const handleAddStock = async () => {
    if (!webUserId) {
        toast.error("User context not found. Please log in again.");
        return;
    }
    if (!stockName.trim() || !stock || !amount || !purchaseRate || !purchaseDate) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        owner_type: "group" as const, // Specify this is for the group
        owner_id: webUserId,        // Linking to the admin's web_user_id
        stock_name: stockName.trim(),
        amount: parseFloat(amount),
        stock: parseFloat(stock),
        purchase_rate: parseFloat(purchaseRate),
        date: [format(purchaseDate, "yyyy-MM-dd")]
      };
      
      await cattleFeedApi.createStock(payload);
      toast.success("Master stock item added successfully");
      setStockName(""); setStock(""); setAmount(""); setPurchaseRate(""); setPurchaseDate(new Date());
      fetchAllStocks();
    } catch (error) {
      toast.error("Failed to add stock item");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferItem || !transferQty || !targetVlc || !webUserId) {
      toast.error("Please fill all transfer details");
      return;
    }

    try {
      setLoading(true);
      const qty = parseFloat(transferQty);
      if (qty > transferItem.stock) {
        toast.error("Insufficient stock in master pool");
        return;
      }

      const payload = {
        from_owner_id: webUserId,       // The Web User ID
        to_owner_id: Number(targetVlc), // The target VLC ID
        stock_name: transferItem.stock_name,
        quantity: qty,
        date: format(new Date(), "yyyy-MM-dd")
      };
      
      await cattleFeedApi.transferStock(payload);
      
      toast.success(`Transferred ${qty} units to branch successfully`);
      setIsTransferOpen(false);
      setTransferQty("");
      setTargetVlc("");
      fetchAllStocks();
    } catch (error) {
      toast.error("Transfer failed. Please check your network or try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Group Cattle Feed Master</h1>
            <p className="text-slate-500 font-medium">Coordinate central inventory and distribution to VLC branches.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate(ROUTES.REPORTS.CATTLE_FEED_STOCK_REPORT)}
            className="w-fit bg-white border-slate-200 hover:bg-slate-50 h-11 px-6 shadow-sm font-bold text-slate-700"
          >
            <FileText className="w-4 h-4 mr-2 text-indigo-600" />
            Cattle Feed Report
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Master Stock */}
          <div className="lg:col-span-4">
            <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.05)] h-fit bg-white">
              <CardHeader className="bg-slate-900 text-white rounded-t-xl py-6">
                <CardTitle className="text-lg flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-indigo-400" />
                  Add Master Inventory
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Stock Name</Label>
                  <Input 
                    value={stockName} 
                    onChange={(e) => setStockName(e.target.value)} 
                    placeholder="e.g. Premium Cattle Feed" 
                    className="bg-slate-50 border-slate-200 h-11"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Quantity</Label>
                    <Input 
                        type="number" 
                        value={stock} 
                        onChange={(e) => setStock(e.target.value)} 
                        placeholder="0.00" 
                        className="bg-slate-50 border-slate-200 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Purchase Rate</Label>
                    <Input 
                        type="number" 
                        value={purchaseRate} 
                        onChange={(e) => setPurchaseRate(e.target.value)} 
                        placeholder="₹0.00" 
                        className="bg-slate-50 border-slate-200 h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Selling Rate (Base)</Label>
                  <Input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="₹0.00" 
                    className="bg-slate-50 border-slate-200 h-11 text-indigo-600 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Date</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal h-11 bg-slate-50 border-slate-200",
                            !purchaseDate && "text-muted-foreground"
                          )}
                        >
                          {purchaseDate ? format(purchaseDate, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={purchaseDate}
                          onSelect={setPurchaseDate}
                          className="bg-white"
                        />
                      </PopoverContent>
                  </Popover>
                </div>
                <Button 
                    onClick={handleAddStock} 
                    disabled={loading} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 shadow-md shadow-indigo-100 transition-all font-bold"
                >
                  {loading ? "Processing..." : "Add to Central Pool"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Master Inventory List */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Available Central Stock</h3>
                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                    {allStocks.length} Master Items
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allStocks.length > 0 ? allStocks.map((item) => (
                <Card key={item.id} className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 bg-white group border-l-4 border-l-indigo-600">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-900 text-xl group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                            {item.stock_name}
                        </h4>
                        <div className="text-xs text-slate-400 font-medium">Last updated: {format(new Date(Array.isArray(item.date) ? item.date[0] : (typeof item.date === 'string' ? item.date : new Date())), "dd MMM, yyyy")}</div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { setTransferItem(item); setIsTransferOpen(true); }} 
                        className="text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-all shadow-sm rounded-lg py-5 px-4 font-bold"
                      >
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Transfer Stock
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 group-hover:bg-indigo-50/30 transition-colors">
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Central Pool Balance</div>
                        <div className="text-2xl font-black text-slate-900">{item.stock} <span className="text-sm font-normal text-slate-400">units</span></div>
                      </div>
                      <div className="bg-green-50/30 p-4 rounded-xl border border-green-100 transition-colors">
                        <div className="text-[10px] text-green-600 font-black uppercase tracking-widest mb-1.5">Master Rate</div>
                        <div className="text-2xl font-black text-green-700">₹{item.amount}</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Purchase Rate:</span>
                        <span className="text-sm font-bold text-slate-600">₹{item.purchase_rate}</span>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-2 py-32 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                    <Package className="w-16 h-16 text-slate-200 mb-4" />
                    <h3 className="text-slate-800 font-bold text-lg">No Master Stocks Found</h3>
                    <p className="text-slate-400 max-w-[280px]">Add your first inventory item to the central pool to begin distributing to branches.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="bg-white border-none shadow-2xl max-w-md rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-slate-900 text-white p-6">
            <DialogTitle className="text-xl font-bold flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-3 text-indigo-400" />
                Dispatch to Branch (VLC)
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-2">
              Move quantity from the central master pool into a specific VLC's local inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Destination VLC Branch</Label>
              <Select value={targetVlc} onValueChange={setTargetVlc}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-12 rounded-xl focus:ring-indigo-500">
                    <SelectValue placeholder="Identify Target Branch" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
                  {branches.map(b => (
                    <SelectItem key={b.branch_id} value={b.branch_id.toString()} className="font-medium p-3">
                        <span className="font-bold text-indigo-600 mr-2">[{b.username}]</span> {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Quantity to Dispatch</Label>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">Available: {transferItem?.stock}</span>
              </div>
              <Input 
                type="number" 
                value={transferQty} 
                onChange={(e) => setTransferQty(e.target.value)} 
                placeholder="0.00" 
                className="bg-slate-50 border-slate-200 h-12 rounded-xl text-lg font-black text-slate-900" 
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button 
                variant="ghost" 
                onClick={() => setIsTransferOpen(false)} 
                className="hover:bg-slate-200 rounded-xl px-6"
            >
                Cancel
            </Button>
            <Button 
                onClick={handleTransfer} 
                disabled={loading} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 shadow-lg shadow-indigo-100 h-11 font-bold"
            >
              {loading ? "Dispatching..." : "Process Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupCattleFeedStock;
