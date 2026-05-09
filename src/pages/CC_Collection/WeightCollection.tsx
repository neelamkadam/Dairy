import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Scale, User, Save, Search, AlertCircle, Loader2, CheckCircle2, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { useAppSelector } from "@/redux/store";
import { userApi, Farmer } from "@/services/userApi";
import { ccCollectionApi } from "@/services/ccCollectionApi";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const WeightCollection = () => {
  const { t } = useTranslation();
  const branches = useAppSelector((state) => state.branch.branches);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(() => {
    const saved = localStorage.getItem('cc_selected_vlc');
    return saved ? Number(saved) : null;
  });
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [shift, setShift] = useState<'Morning' | 'Evening'>(
    new Date().getHours() < 14 ? 'Morning' : 'Evening'
  );
  
  const [farmerIdInput, setFarmerIdInput] = useState("");
  const [farmerData, setFarmerData] = useState<Farmer | null>(null);
  const [milkType, setMilkType] = useState<'Cow' | 'Buffalo'>('Cow');
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingFarmer, setFetchingFarmer] = useState(false);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const farmerIdInputRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].branch_id);
    }
  }, [branches]);

  useEffect(() => {
    if (selectedBranch) {
      fetchRecentEntries();
    }
  }, [selectedBranch, date, shift]);

  const fetchRecentEntries = async () => {
    if (!selectedBranch) return;
    try {
      const response = await ccCollectionApi.getAll({
        dairy_id: selectedBranch,
        date,
        shift
      });
      if (response.success) {
        setRecentEntries(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching recent entries:", error);
    }
  };

  const handleFarmerIdChange = async (val: string) => {
    setFarmerIdInput(val);
    if (val.length >= 1 && selectedBranch) {
      setFetchingFarmer(true);
      try {
        const normalizedId = normalizeFarmerId(val);
        const duplicate = recentEntries.find(e => normalizeFarmerId(e.farmer_id) === normalizedId);
        setIsDuplicate(!!duplicate);

        const farmer = await userApi.getById(val, selectedBranch);
        if (farmer) {
          setFarmerData(farmer);
          if (farmer.milkType === 'Cow' || farmer.milkType === 'Buffalo') {
            setMilkType(farmer.milkType);
          }
        } else {
          setFarmerData(null);
        }
      } catch (error) {
        console.error("Error fetching farmer:", error);
      } finally {
        setFetchingFarmer(false);
      }
    } else {
      setFarmerData(null);
      setIsDuplicate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) {
      toast.error("Please select a VLC");
      return;
    }
    if (!farmerData) {
      toast.error("Invalid farmer");
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        farmer_id: farmerIdInput,
        dairy_id: selectedBranch,
        quantity: parseFloat(quantity),
        type: milkType,
        date,
        shift
      };

      const response = await ccCollectionApi.create(payload);
      if (response.success) {
        toast.success("Weight recorded successfully!");
        setFarmerIdInput("");
        setFarmerData(null);
        setQuantity("");
        setIsDuplicate(false);
        fetchRecentEntries();
        farmerIdInputRef.current?.focus();
      } else {
        toast.error(response.message || "Failed to record weight");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Error recording weight");
    } finally {
      setLoading(false);
    }
  };

  const handleVLCChange = (val: string) => {
    const id = val ? Number(val) : null;
    setSelectedBranch(id);
    if (id) {
      localStorage.setItem('cc_selected_vlc', id.toString());
    } else {
      localStorage.removeItem('cc_selected_vlc');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Scale className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('weight_collection')}
            </h1>
            <p className="text-xs text-gray-500">CC Management System • Step 1</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl">
          {/* VLC Selector */}
          <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-700 rounded-lg shadow-sm min-w-[200px]">
            <MapPin className="h-4 w-4 text-gray-400" />
            <select
              value={selectedBranch?.toString() || ""}
              onChange={(e) => handleVLCChange(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold focus:ring-0 outline-none text-gray-700 dark:text-gray-200 w-full"
            >
              <option value="">{t('select_vlc')}</option>
              {branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id.toString()}>
                   {branch.username} - {branch.name} - {branch.branchName || ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold focus:ring-0 outline-none text-gray-700 dark:text-gray-200"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant={shift === 'Morning' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShift('Morning')}
              className={cn(
                "h-8 px-3 rounded-lg text-xs transition-all duration-200", 
                shift === 'Morning' ? "bg-white dark:bg-gray-600 text-blue-600 shadow-sm" : "text-gray-500"
              )}
            >
              ☀️ Morning
            </Button>
            <Button
              variant={shift === 'Evening' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShift('Evening')}
              className={cn(
                "h-8 px-3 rounded-lg text-xs transition-all duration-200", 
                shift === 'Evening' ? "bg-white dark:bg-gray-600 text-blue-600 shadow-sm" : "text-gray-500"
              )}
            >
              🌙 Evening
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Form Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-3xl mx-auto">
            {!selectedBranch ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <MapPin className="h-12 w-12 text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium text-sm">Please select a VLC from the header to begin.</p>
              </div>
            ) : (
              <Card className="border-none shadow-lg shadow-gray-200/50 dark:shadow-none bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                <CardHeader className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-6">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                    <User className="h-5 w-5 text-blue-500" />
                    Collection Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Farmer Identification</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                          </div>
                          <Input
                            ref={farmerIdInputRef}
                            value={farmerIdInput}
                            onChange={(e) => handleFarmerIdChange(e.target.value)}
                            placeholder="Enter Farmer Code..."
                            className="pl-11 h-12 text-lg font-semibold bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                            autoFocus
                          />
                          {fetchingFarmer && (
                            <div className="absolute inset-y-0 right-4 flex items-center">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            </div>
                          )}
                        </div>
                        {isDuplicate && (
                          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/20">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-bold">ALREADY SUBMITTED TODAY</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Registered Name</Label>
                        <div className="h-12 flex items-center px-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                          {farmerData ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900 dark:text-white uppercase truncate">
                                {farmerData.name || farmerData.fullName}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">{farmerData.mobile || 'No Contact'}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Waiting for code...</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="opacity-50" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Milk Variety</Label>
                        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setMilkType('Cow')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-xs font-bold transition-all duration-200",
                              milkType === 'Cow' 
                                ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm border border-gray-100 dark:border-gray-600" 
                                : "text-gray-500 hover:text-gray-700"
                            )}
                          >
                            🐄 COW
                          </button>
                          <button
                            type="button"
                            onClick={() => setMilkType('Buffalo')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-xs font-bold transition-all duration-200",
                              milkType === 'Buffalo' 
                                ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm border border-gray-100 dark:border-gray-600" 
                                : "text-gray-500 hover:text-gray-700"
                            )}
                          >
                            🐃 BUFFALO
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Net Quantity (KG)</Label>
                        <div className="relative">
                          <Input
                            ref={quantityRef}
                            type="number"
                            step="0.01"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0.00"
                            className="h-12 text-2xl font-black text-center bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 focus:border-blue-500 rounded-xl text-blue-700 dark:text-blue-400"
                          />
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={loading || !farmerData}
                      className="w-full h-12 text-base font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98]"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-5 w-5" />
                          RECORD ENTRY
                        </div>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Sidebar - Recent Entries */}
        <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-xl">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
              RECENT ENTRIES
              <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] h-5">{recentEntries.length}</Badge>
            </h2>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Current Shift Logs</p>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {recentEntries.length > 0 ? (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {recentEntries.map((entry, idx) => (
                  <div key={entry.id || idx} className="p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 dark:text-white">ID: {entry.farmer_id}</span>
                        <span className="text-[10px] text-gray-400 truncate max-w-[140px] uppercase font-bold">{entry.farmer_name || 'Farmer'}</span>
                      </div>
                      <Badge className={cn(
                        "text-[8px] h-4 px-1 rounded",
                        entry.type === 'Cow' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      )}>
                        {entry.type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] text-gray-400">Sample #{entry.sample_id}</span>
                       <span className="text-base font-black text-blue-600 group-hover:scale-110 transition-transform">
                         {parseFloat(entry.quantity).toFixed(2)}
                         <small className="text-[9px] font-normal text-gray-400 ml-0.5">KG</small>
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-3">
                  <CheckCircle2 className="h-8 w-8 text-gray-200" />
                </div>
                <p className="text-xs text-gray-400 font-medium">No records found for<br/>this shift.</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
             <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                <span>TOTAL LOGGED</span>
                <span className="text-blue-600">{recentEntries.reduce((acc, curr) => acc + parseFloat(curr.quantity), 0).toFixed(2)} KG</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightCollection;
