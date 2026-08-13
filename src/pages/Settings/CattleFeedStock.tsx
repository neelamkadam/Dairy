import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cattleFeedApi, CattleFeedStock } from "@/services/cattleFeedApi";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { format, parseISO, isValid } from "date-fns";
import {
  Pencil,
  Trash2,
  Plus,
  FileText,
  Search,
  Package,
  IndianRupee,
  Calendar as CalendarIcon,
  ChevronDown,
  Check,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Boxes,
  X,
} from "lucide-react";
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

  // VLC searchable dropdown state
  const [vlcOpen, setVlcOpen] = useState(false);
  const [vlcSearch, setVlcSearch] = useState("");
  const vlcSearchRef = useRef<HTMLInputElement>(null);
  const vlcWrapperRef = useRef<HTMLDivElement>(null);

  // Input refs for Enter-key navigation
  const stockNameRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const purchaseRateRef = useRef<HTMLInputElement>(null);
  const sellingRateRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Helper: focus next field on Enter
  const handleEnterKey = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLInputElement | HTMLButtonElement | null>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

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

  // Inventory search
  const [inventorySearch, setInventorySearch] = useState("");

  // Click-outside handler for VLC dropdown
  useEffect(() => {
    if (!vlcOpen) return;
    const handler = (e: MouseEvent) => {
      if (vlcWrapperRef.current && !vlcWrapperRef.current.contains(e.target as Node)) {
        setVlcOpen(false);
        setVlcSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [vlcOpen]);

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
      } as any;

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
      } as any;

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
      const response = await (cattleFeedApi as any).getStockReport(dairyId, startDate, endDate);
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

  // Computed stats
  const totalItems = allStocks.length;
  const totalStockValue = allStocks.reduce((acc, item) => acc + (parseFloat(item.amount.toString()) * item.stock), 0);
  const lowStockItems = allStocks.filter(item => item.stock <= 10).length;
  const avgSellingRate = totalItems > 0 ? allStocks.reduce((acc, item) => acc + parseFloat(item.amount.toString()), 0) / totalItems : 0;

  // Filtered stocks for search
  const filteredStocks = allStocks.filter(item =>
    !inventorySearch ||
    item.stock_name.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  // Selected branch for display
  const selectedBranch = branches.find(b => b.branch_id.toString() === dairyId);

  // Filtered branches for VLC dropdown
  const filteredBranches = branches.filter(b => {
    const q = vlcSearch.toLowerCase();
    return (
      !q ||
      String(b.username || "").toLowerCase().includes(q) ||
      String(b.branch_id || "").toLowerCase().includes(q) ||
      String(b.name || "").toLowerCase().includes(q) ||
      String(b.branchName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Cattle Feed Inventory
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  Manage your livestock feed stock and purchase logs
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 shadow-sm transition-all duration-200 h-10 px-5"
            onClick={() => setIsReportOpen(true)}
          >
            <FileText className="w-4 h-4 mr-2 text-indigo-500" />
            View Report
          </Button>
        </div>

        {/* Stats Cards - only visible when branch is selected */}
        {dairyId && allStocks.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Boxes className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Items</p>
                  <p className="text-2xl font-black text-slate-900">{totalItems}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stock Value</p>
                  <p className="text-2xl font-black text-slate-900">₹{totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Low Stock</p>
                  <p className="text-2xl font-black text-slate-900">{lowStockItems}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Rate</p>
                  <p className="text-2xl font-black text-slate-900">₹{avgSellingRate.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Stock Form */}
          <div className="lg:col-span-4 xl:col-span-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-6">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
                    <Plus className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Add New Stock</h2>
                    <p className="text-xs text-slate-400">Fill in purchase details</p>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-5 space-y-5">
                {/* Searchable VLC Dropdown */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select VLC Branch</Label>
                  <div ref={vlcWrapperRef} className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setVlcOpen(prev => !prev);
                        if (!vlcOpen) setTimeout(() => vlcSearchRef.current?.focus(), 0);
                        else setVlcSearch("");
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 h-11 text-sm rounded-xl border bg-slate-50/80 transition-all duration-200",
                        vlcOpen
                          ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white"
                          : "border-slate-200 hover:border-indigo-300 hover:bg-white"
                      )}
                    >
                      <span className={selectedBranch ? "text-slate-900 font-medium truncate" : "text-slate-400"}>
                        {selectedBranch
                          ? `${selectedBranch.username} - ${selectedBranch.branchName || selectedBranch.name}`
                          : "Search and select VLC..."}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-slate-400 flex-shrink-0 ml-2 transition-transform duration-200",
                          vlcOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {vlcOpen && (
                      <div
                        className="absolute z-50 mt-1.5 w-full bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                        style={{ top: "100%", left: 0 }}
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50/50">
                          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <input
                            ref={vlcSearchRef}
                            value={vlcSearch}
                            onChange={(e) => setVlcSearch(e.target.value)}
                            placeholder="Search by name or ID..."
                            className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
                          />
                          {vlcSearch && (
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); setVlcSearch(""); vlcSearchRef.current?.focus(); }}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="max-h-52 overflow-y-auto p-1.5">
                          {filteredBranches.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-slate-400">
                              No VLC branches found
                            </div>
                          ) : (
                            filteredBranches.map((branch) => {
                              const val = branch.branch_id.toString();
                              const isSelected = val === dairyId;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setDairyId(val);
                                    setVlcOpen(false);
                                    setVlcSearch("");
                                    setTimeout(() => stockNameRef.current?.focus(), 50);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 text-sm text-left rounded-lg transition-colors duration-150",
                                    isSelected
                                      ? "bg-indigo-50 text-indigo-700 font-medium"
                                      : "text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  <span className="truncate">
                                    {branch.username} - {branch.branchName || branch.name}
                                  </span>
                                  {isSelected && <Check className="h-4 w-4 text-indigo-600 flex-shrink-0 ml-2" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Item Name */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock Item Name</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      ref={stockNameRef}
                      value={stockName}
                      onChange={(e) => setStockName(e.target.value)}
                      onBlur={handleNameBlur}
                      onKeyDown={(e) => handleEnterKey(e, quantityRef)}
                      placeholder="e.g. Wheat Bran, Churi"
                      className="pl-10 bg-slate-50/80 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-11 rounded-xl transition-all"
                    />
                  </div>
                </div>

                {/* Quantity & Purchase Rate */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantity</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        ref={quantityRef}
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        onKeyDown={(e) => handleEnterKey(e, purchaseRateRef)}
                        placeholder="0.00"
                        className="pl-10 bg-slate-50/80 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-11 rounded-xl transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Purchase Rate</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        ref={purchaseRateRef}
                        type="number"
                        value={purchaseRate}
                        onChange={(e) => setPurchaseRate(e.target.value)}
                        onKeyDown={(e) => handleEnterKey(e, sellingRateRef)}
                        placeholder="0.00"
                        className="pl-10 bg-slate-50/80 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-11 rounded-xl transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Selling Rate */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Selling Rate</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <Input
                      ref={sellingRateRef}
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, submitBtnRef)}
                      placeholder="0.00"
                      className="pl-10 bg-emerald-50/50 border-emerald-200 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 h-11 rounded-xl transition-all font-semibold text-emerald-700"
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Purchase Date</Label>
                  <AppDatePicker
                    date={purchaseDate}
                    onChange={(dateStr) => {
                      const parsed = parseISO(dateStr);
                      if (isValid(parsed)) setPurchaseDate(parsed);
                    }}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  ref={submitBtnRef}
                  onClick={handleAddStock}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200/50 h-12 rounded-xl transition-all duration-300 active:scale-[0.98] text-sm font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add to Inventory
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Stock List */}
          <div className="lg:col-span-8 xl:col-span-8">
            {/* Inventory Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800">Current Inventory</h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                  {filteredStocks.length} {filteredStocks.length === 1 ? "Item" : "Items"}
                </span>
              </div>
              {allStocks.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder="Search inventory..."
                    className="pl-9 h-9 text-sm bg-white border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                </div>
              )}
            </div>

            {loading && allStocks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center justify-center">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-3 h-3 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-3 h-3 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-sm text-slate-400 font-medium">Loading inventory...</p>
              </div>
            ) : filteredStocks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStocks.map((item, index) => {
                  const isLowStock = item.stock <= 10;
                  const profit = parseFloat(item.amount.toString()) - item.purchase_rate;
                  const profitPercent = item.purchase_rate > 0 ? (profit / item.purchase_rate) * 100 : 0;

                  return (
                    <div
                      key={item.id}
                      id={`stock-card-${item.id}`}
                      className={cn(
                        "group bg-white rounded-2xl border overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-slate-100",
                        highlightedId === item.id
                          ? "ring-2 ring-amber-400 scale-[1.02] shadow-xl z-20 border-amber-300"
                          : "border-slate-100 shadow-sm"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Card accent bar */}
                      <div className={cn(
                        "h-1 w-full",
                        isLowStock
                          ? "bg-gradient-to-r from-red-400 to-amber-400"
                          : "bg-gradient-to-r from-indigo-400 to-violet-400"
                      )} />

                      <div className="p-5">
                        {/* Header: Name, date, actions */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1 min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors truncate">
                              {item.stock_name}
                            </h4>
                            <div className="flex items-center text-xs text-slate-400">
                              <CalendarIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{formatDateLabel(item.date)}</span>
                            </div>
                          </div>
                          <div className="flex gap-0.5 ml-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openRestockModal(item)}
                              className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Restock"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(item)}
                              className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className={cn(
                            "p-3 rounded-xl border transition-colors",
                            isLowStock
                              ? "bg-red-50/60 border-red-100"
                              : "bg-slate-50/80 border-slate-100"
                          )}>
                            <p className={cn(
                              "text-[10px] font-bold uppercase tracking-wider mb-0.5",
                              isLowStock ? "text-red-500" : "text-slate-400"
                            )}>
                              Available
                            </p>
                            <p className={cn(
                              "text-xl font-black",
                              isLowStock ? "text-red-700" : "text-slate-900"
                            )}>
                              {item.stock}
                              <span className="text-[10px] font-medium text-slate-400 ml-1">Units</span>
                            </p>
                          </div>
                          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Selling Rate</p>
                            <p className="text-xl font-black text-emerald-700">
                              ₹{parseFloat(item.amount.toString()).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Footer: Purchase rate + status */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Purchase</span>
                              <span className="text-sm font-bold text-slate-600">₹{item.purchase_rate}</span>
                            </div>
                            {profitPercent > 0 && (
                              <div>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Margin</span>
                                <span className="text-sm font-bold text-emerald-600">+{profitPercent.toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "text-[10px] font-bold uppercase py-1.5 px-2.5 rounded-lg",
                            isLowStock
                              ? "bg-red-100 text-red-700"
                              : "bg-indigo-50 text-indigo-700"
                          )}>
                            {isLowStock ? (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Low Stock
                              </span>
                            ) : (
                              "In Stock"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-20 flex flex-col items-center justify-center text-center px-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mb-5">
                  <Package className="w-10 h-10 text-indigo-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  {dairyId ? (inventorySearch ? "No Matching Items" : "Inventory Empty") : "Select a Branch"}
                </h3>
                <p className="text-slate-400 max-w-[300px] text-sm">
                  {dairyId
                    ? inventorySearch
                      ? "Try a different search term to find items."
                      : "No stock items found. Add your first stock entry using the form."
                    : "Choose a VLC branch from the dropdown to view and manage its inventory."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restock Modal */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5">
            <DialogTitle className="text-lg font-bold text-white flex items-center">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mr-3">
                <Plus className="w-4 h-4 text-white" />
              </div>
              Restock — {restockItem?.stock_name}
            </DialogTitle>
            <p className="text-emerald-100 text-xs mt-1 ml-11">Add more inventory for this item</p>
          </div>
          <div className="p-5 space-y-5">
            {restockItem && (
              <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-100">
                <span className="text-xs font-medium text-slate-500">Current Stock</span>
                <span className="text-sm font-bold text-slate-900">{restockItem.stock} Units</span>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantity to Add</Label>
              <Input
                type="number"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                placeholder="0.00"
                className="bg-slate-50/80 border-slate-200 h-11 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Purchase Price (Rate)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={restockRate}
                  onChange={(e) => setRestockRate(e.target.value)}
                  className="pl-10 bg-slate-50/80 border-slate-200 h-11 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Purchase Date</Label>
              <AppDatePicker
                date={restockDate}
                onChange={(dateStr) => {
                  const parsed = parseISO(dateStr);
                  if (isValid(parsed)) setRestockDate(parsed);
                }}
              />
            </div>
          </div>
          <div className="px-5 pb-5 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsRestockOpen(false)}
              className="flex-1 hover:bg-slate-50 rounded-xl h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestock}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-100 rounded-xl h-11"
            >
              {loading ? "Adding..." : "Add Stock"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5">
            <DialogTitle className="text-lg font-bold text-white flex items-center">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mr-3">
                <Pencil className="w-4 h-4 text-white" />
              </div>
              Edit Stock Details
            </DialogTitle>
            <p className="text-indigo-100 text-xs mt-1 ml-11">Update item name and selling rate</p>
          </div>
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-50/80 border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Selling Rate</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="pl-10 bg-indigo-50/50 border-indigo-200 h-11 rounded-xl font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="flex-1 hover:bg-slate-50 rounded-xl h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-100 rounded-xl h-11"
            >
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-5">
            <DialogTitle className="text-lg font-bold text-white flex items-center">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mr-3">
                <FileText className="w-4 h-4 text-indigo-300" />
              </div>
              Inventory & Payment Report
            </DialogTitle>
          </div>

          <div className="p-5 space-y-5">
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Date Range</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AppDatePicker
                  date={startDate}
                  onChange={(dateStr) => {
                    const parsed = parseISO(dateStr);
                    if (isValid(parsed)) setStartDate(parsed as any);
                  }}
                />
                <AppDatePicker
                  date={endDate}
                  onChange={(dateStr) => {
                    const parsed = parseISO(dateStr);
                    if (isValid(parsed)) setEndDate(parsed as any);
                  }}
                />
              </div>
            </div>

            <Button
              onClick={fetchReport}
              disabled={loading || !dairyId}
              className="w-full bg-gradient-to-r from-slate-900 to-indigo-900 hover:from-slate-800 hover:to-indigo-800 text-white h-11 rounded-xl shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                "Generate Report"
              )}
            </Button>

            {reportData ? (
              <div className="space-y-6">
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="font-bold text-slate-800 uppercase tracking-tight text-xs">Feed Stock Summary</h4>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.cattlefeed_stock?.map((s: any) => (
                          <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-700">{s.stock_name}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-600">{s.stock}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{parseFloat(s.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="font-bold text-slate-800 uppercase tracking-tight text-xs">Farmer Payment Logs</h4>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  {reportData.farmer_payments?.length > 0 ? (
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Farmer</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
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
                    <div className="py-10 text-center bg-slate-50 rounded-xl text-slate-400 font-medium border border-slate-100">
                      No payment logs found for this period.
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                  <FileText className="w-8 h-8 text-slate-200" />
                </div>
                <p className="font-medium text-sm text-slate-400">Configure dates and generate your report</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CattleFeedStockSettings;
