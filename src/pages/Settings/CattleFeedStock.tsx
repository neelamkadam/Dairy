import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cattleFeedApi, CattleFeedStock } from "@/services/cattleFeedApi";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { format, parseISO, isValid } from "date-fns";
import { Pencil, Trash2, Plus, FileText, Search, Package, IndianRupee, Calendar as CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AppDatePicker } from "@/components/ui/date-picker";

const CattleFeedStockSettings: React.FC = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [stockName, setStockName] = useState("");
  const [stock, setStock] = useState("");
  const [amount, setAmount] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(new Date());
  
  const [loading, setLoading] = useState(false);
  const [allStocks, setAllStocks] = useState<CattleFeedStock[]>([]);
  
  // Edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<CattleFeedStock | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");

  // Report state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportData, setReportData] = useState<any>(null);

  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const handleNameBlur = () => {
    if (!stockName.trim()) return;
    
    const existing = allStocks.find(s => s.stock_name.toLowerCase() === stockName.trim().toLowerCase());
    if (existing) {
      toast.warning(`"${stockName}" already exists in inventory.`);
      setHighlightedId(existing.id);
      
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedId(null), 5000);
      
      // Use requestAnimationFrame for smooth interaction
      requestAnimationFrame(() => {
        const element = document.getElementById(`stock-card-${existing.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  };

  const fetchAllStocks = async (id: string) => {
    try {
      setLoading(true);
      const response = await cattleFeedApi.getStock(id);
      if (response.success && Array.isArray(response.data)) {
        setAllStocks(response.data);
      }
    } catch (error) {
      console.error('❌ Failed to fetch stocks:', error);
      toast.error("Failed to fetch stocks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dairyId) {
      fetchAllStocks(dairyId);
    } else {
      setAllStocks([]);
    }
  }, [dairyId]);

  const handleAddStock = async () => {
    if (!dairyId) {
      toast.error("Please select VLC");
      return;
    }
    if (!stockName.trim() || !stock || !amount || !purchaseRate || !purchaseDate) {
      toast.error("Please fill all fields");
      return;
    }

    // Double check on submit
    const existing = allStocks.find(s => s.stock_name.toLowerCase() === stockName.trim().toLowerCase());
    if (existing) {
      toast.warning(`"${stockName}" already exists. Opening edit modal...`);
      openEditModal(existing);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        dairy_id: dairyId,
        stock_name: stockName.trim(),
        amount: parseFloat(amount),
        stock: parseFloat(stock),
        purchase_rate: parseFloat(purchaseRate),
        date: [format(purchaseDate, "yyyy-MM-dd")]
      };
      
      await cattleFeedApi.createStock(payload);
      toast.success("Stock added successfully");
      
      // Reset form
      setStockName("");
      setStock("");
      setAmount("");
      setPurchaseRate("");
      setPurchaseDate(new Date());
      fetchAllStocks(dairyId);
    } catch (error) {
      console.error("❌ Failed to add stock:", error);
      toast.error("Failed to add stock");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this stock entry?")) return;
    
    try {
      await cattleFeedApi.deleteStock(id);
      toast.success("Stock deleted successfully");
      fetchAllStocks(dairyId);
    } catch (error) {
      console.error("❌ Failed to delete stock:", error);
      toast.error("Failed to delete stock");
    }
  };

  // Restock state
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<CattleFeedStock | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockRate, setRestockRate] = useState("");
  const [restockDate, setRestockDate] = useState<Date | undefined>(new Date());

  const handleRestock = async () => {
    if (!restockItem || !restockQty || !restockRate || !restockDate) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      const newTotalStock = (parseFloat(restockItem.stock.toString()) || 0) + parseFloat(restockQty);
      const payload = {
        stock_name: restockItem.stock_name,
        stock: newTotalStock,
        purchase_rate: parseFloat(restockRate),
        date: [format(restockDate, "yyyy-MM-dd")]
      };
      
      await cattleFeedApi.updateStock(restockItem.id, payload);
      toast.success("Stock added successfully");
      setIsRestockOpen(false);
      setRestockQty("");
      setRestockRate("");
      fetchAllStocks(dairyId);
    } catch (error) {
      console.error("❌ Failed to restock:", error);
      toast.error("Failed to add stock");
    } finally {
      setLoading(false);
    }
  };

  const openRestockModal = (item: CattleFeedStock) => {
    setRestockItem(item);
    setRestockRate(item.purchase_rate.toString());
    setIsRestockOpen(true);
  };

  const openEditModal = (stock: CattleFeedStock) => {
    setEditingStock(stock);
    setEditName(stock.stock_name);
    setEditAmount(stock.amount.toString());
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingStock) return;
    
    try {
      setLoading(true);
      const payload = {
        stock_name: editName,
        amount: parseFloat(editAmount)
      };
      
      await cattleFeedApi.updateStock(editingStock.id, payload);
      toast.success("Stock updated successfully");
      setIsEditDialogOpen(false);
      fetchAllStocks(dairyId);
    } catch (error) {
      console.error("❌ Failed to update stock:", error);
      toast.error("Failed to update stock");
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    if (!dairyId) {
      toast.error("Please select VLC");
      return;
    }
    try {
      setLoading(true);
      const response = await cattleFeedApi.getStockReport(dairyId, startDate, endDate);
      if (response.success) {
        setReportData(response.data);
        setIsReportOpen(true);
      }
    } catch (error) {
      console.error("❌ Failed to fetch report:", error);
      toast.error("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const formatDateLabel = (dateVal: any) => {
    try {
      let parsed = dateVal;
      
      // If it's a string, try to parse it as JSON
      if (typeof dateVal === 'string' && (dateVal.startsWith('[') || dateVal.startsWith('{'))) {
        try {
          parsed = JSON.parse(dateVal);
        } catch (e) {
          // Not JSON, continue with original string
        }
      }

      const getRawDate = (d: any) => {
        if (typeof d === 'string') return d;
        if (d instanceof Date) return d;
        return d?.date || d?.purchase_date || d?.created_at;
      };

      if (Array.isArray(parsed)) {
        return parsed
          .map(d => {
            const raw = getRawDate(d);
            return raw ? format(new Date(raw), "dd/MM/yyyy") : null;
          })
          .filter(Boolean)
          .join(", ");
      }

      const singleRaw = getRawDate(parsed);
      if (singleRaw) return format(new Date(singleRaw), "dd/MM/yyyy");
      
      return String(dateVal);
    } catch (e) {
      return String(dateVal);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cattle Feed Inventory</h1>
            <p className="text-slate-500 mt-1 font-medium">Manage your livestock feed stock and purchase logs</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
              onClick={() => setIsReportOpen(true)}
            >
              <FileText className="w-4 h-4 mr-2 text-indigo-500" />
              View Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Stock Form */}
          <div className="lg:col-span-4">
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-indigo-400" />
                  Add New Stock
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Select VLC Branch</Label>
                    <Select value={dairyId} onValueChange={setDairyId}>
                      <SelectTrigger className="w-full bg-slate-50 border-slate-200 focus:ring-indigo-500 h-11">
                        <SelectValue placeholder="Select VLC" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {branches.map((branch) => (
                          <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                            {branch.username} - {branch.branchName || branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Stock Item Name</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        value={stockName}
                        onChange={(e) => setStockName(e.target.value)}
                        onBlur={handleNameBlur}
                        placeholder="e.g. Wheat Bran, Churi"
                        className="pl-10 bg-slate-50 border-slate-200 focus:ring-indigo-500 h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Quantity</Label>
                      <div className="relative">
                        <Package className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <Input
                          type="number"
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                          placeholder="0.00"
                          className="pl-10 bg-slate-50 border-slate-200 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Purchase Rate</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <Input
                          type="number"
                          value={purchaseRate}
                          onChange={(e) => setPurchaseRate(e.target.value)}
                          placeholder="0.00"
                          className="pl-10 bg-slate-50 border-slate-200 h-11"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Selling Rate</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-10 bg-slate-50 border-slate-200 h-11 font-bold text-green-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Date</Label>
                  <AppDatePicker
                    date={purchaseDate}
                    onChange={(dateStr) => {
                      const parsed = parseISO(dateStr);
                      if (isValid(parsed)) setPurchaseDate(parsed);
                    }}
                  />
                  </div>
                </div>

                <Button 
                  onClick={handleAddStock} 
                  disabled={loading} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 h-12 transition-all active:scale-[0.98]"
                >
                  {loading ? "Processing..." : "Add to Inventory"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stock List */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Current Inventory</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                {allStocks.length} Items Found
              </span>
            </div>

            {loading && allStocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
                <div className="h-4 w-48 bg-slate-200 rounded"></div>
              </div>
            ) : allStocks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allStocks.map((item) => (
                  <Card 
                    key={item.id} 
                    id={`stock-card-${item.id}`}
                    className={cn(
                      "group border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 bg-white overflow-hidden border-l-4 border-l-indigo-500",
                      highlightedId === item.id && "ring-4 ring-amber-400 scale-[1.02] shadow-2xl z-20 border-l-amber-500"
                    )}
                  >
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                            {item.stock_name}
                          </h4>
                          <div className="flex items-center text-xs text-slate-500">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            {formatDateLabel(item.date)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openRestockModal(item)}
                            className="h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50"
                            title="Restock"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditModal(item)}
                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Available Stock</p>
                          <p className="text-xl font-black text-slate-900">{item.stock} <span className="text-xs font-normal text-slate-400 ml-1">Units</span></p>
                        </div>
                        <div className="bg-green-50/50 p-3 rounded-xl border border-green-100">
                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Selling Rate</p>
                          <p className="text-xl font-black text-green-700">₹{parseFloat(item.amount.toString()).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Purchase Rate:</span>
                          <span className="text-sm font-bold text-slate-700">₹{item.purchase_rate}</span>
                        </div>
                        <div className={`text-[10px] font-bold uppercase py-1 px-2 rounded ${item.stock > 10 ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>
                          {item.stock > 10 ? 'In Stock' : 'Low Stock'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-20 flex flex-col items-center justify-center text-center px-4">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <Package className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Inventory Empty</h3>
                <p className="text-slate-500 max-w-[280px]">Select a dairy branch to view its inventory or add your first stock entry.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restock Modal */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-none shadow-2xl">
          <DialogHeader className="bg-white">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-green-500" />
              Add Stock - {restockItem?.stock_name}
            </DialogTitle>
            <p className="text-slate-500 text-sm">Add new inventory for this item.</p>
          </DialogHeader>
          <div className="grid gap-6 py-4 bg-white">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Quantity (Number of Stocks)</Label>
              <Input
                type="number"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                placeholder="0.00"
                className="bg-slate-50 border-slate-200 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Purchase Price (Rate)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={restockRate}
                  onChange={(e) => setRestockRate(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Purchase Date</Label>
              <AppDatePicker
                date={restockDate}
                onChange={(dateStr) => {
                  const parsed = parseISO(dateStr);
                  if (isValid(parsed)) setRestockDate(parsed);
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 bg-white">
            <Button 
                variant="outline" 
                onClick={() => setIsRestockOpen(false)}
                className="hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRestock} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-100"
            >
              {loading ? "Adding..." : "Add Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-none shadow-2xl">
          <DialogHeader className="bg-white">
            <DialogTitle className="text-xl font-bold text-slate-900">Edit Stock Details</DialogTitle>
            <p className="text-slate-500 text-sm">Update item name and selling rate.</p>
          </DialogHeader>
          <div className="grid gap-6 py-6 bg-white">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Stock Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-50 border-slate-200 focus:ring-indigo-500 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Selling Rate</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 h-11 font-bold text-indigo-600"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 bg-white">
            <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                className="hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
            >
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white border-none shadow-2xl">
          <DialogHeader className="bg-white">
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-indigo-500" />
                Inventory & Payment Report
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="space-y-2">
              <AppDatePicker
                date={startDate}
                onChange={(dateStr) => {
                  const parsed = parseISO(dateStr);
                  if (isValid(parsed)) setStartDate(parsed);
                }}
              />
            </div>
            <div className="space-y-2">
              <AppDatePicker
                date={endDate}
                onChange={(dateStr) => {
                  const parsed = parseISO(dateStr);
                  if (isValid(parsed)) setEndDate(parsed);
                }}
              />
            </div>
          </div>

          <Button 
            onClick={fetchReport} 
            disabled={loading || !dairyId} 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11 mb-6"
          >
            {loading ? "Generating..." : "Generate Report"}
          </Button>

          {reportData ? (
            <div className="space-y-8 bg-white">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 uppercase tracking-tight text-sm">Feed Stock Summary</h4>
                  <div className="h-[1px] flex-1 bg-slate-100 mx-4"></div>
                </div>
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Item</th>
                        <th className="px-4 py-3 text-right font-semibold">Stock</th>
                        <th className="px-4 py-3 text-right font-semibold">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.cattlefeed_stock?.map((s: any) => (
                        <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-700">{s.stock_name}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-600">{s.stock}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">₹{parseFloat(s.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 uppercase tracking-tight text-sm">Farmer Payment Logs</h4>
                  <div className="h-[1px] flex-1 bg-slate-100 mx-4"></div>
                </div>
                {reportData.farmer_payments?.length > 0 ? (
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                            <tr>
                            <th className="px-4 py-3 text-left font-semibold">Farmer</th>
                            <th className="px-4 py-3 text-right font-semibold">Date</th>
                            <th className="px-4 py-3 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reportData.farmer_payments.map((p: any, idx: number) => (
                            <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-700">{p.farmer_name || 'N/A'}</td>
                                <td className="px-4 py-3 text-right text-slate-500">{format(new Date(p.date), "dd/MM/yy")}</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-800">₹{parseFloat(p.amount).toFixed(2)}</td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                ) : (
                  <div className="py-10 text-center bg-slate-50 rounded-xl text-slate-400 font-medium">
                    No payment logs found for this period.
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <FileText className="w-16 h-16 mb-2 opacity-20" />
                <p className="font-medium text-sm">Configure dates and generate your report</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CattleFeedStockSettings;
