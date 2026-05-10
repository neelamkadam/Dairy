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
import { userApi as reportsUserApi } from "@/services/reportsApi";
import { ccCollectionApi } from "@/services/ccCollectionApi";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, ArrowRight, Printer } from "lucide-react";

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
  const [sampleId, setSampleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingFarmer, setFetchingFarmer] = useState(false);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [allowedTypes, setAllowedTypes] = useState<('Cow' | 'Buffalo')[]>(['Cow', 'Buffalo']);
  const [allFarmers, setAllFarmers] = useState<any[]>([]);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [lastEntry, setLastEntry] = useState<any>(null);

  const farmerIdInputRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].branch_id);
    }
  }, [branches]);

  useEffect(() => {
    if (selectedBranch) {
      fetchRecentEntries();
      fetchAllFarmers();
    }
  }, [selectedBranch, date, shift]);

  const fetchAllFarmers = async () => {
    if (!selectedBranch) return;
    try {
      const response = await reportsUserApi.getFarmers(selectedBranch.toString());
      if (response.success && Array.isArray(response.data)) {
        setAllFarmers(response.data);
      }
    } catch (error) {
      console.error("Error fetching all farmers:", error);
    }
  };

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

  useEffect(() => {
    if (recentEntries.length > 0) {
      const maxId = Math.max(...recentEntries.map(e => parseInt(e.sample_id) || 0));
      setSampleId((maxId + 1).toString());
    } else {
      setSampleId("1");
    }
  }, [recentEntries, date, shift]);

  const handleFarmerIdChange = (val: string) => {
    setFarmerIdInput(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    if (val.length >= 1) {
      debounceTimerRef.current = setTimeout(() => {
        lookupFarmer(val);
      }, 800); // 800ms debounce
    } else {
      setFarmerData(null);
      setIsDuplicate(false);
    }
  };

  const lookupFarmer = async (val: string) => {
    if (!val || !selectedBranch) return;
    setFetchingFarmer(true);
    try {
      const normalizedId = normalizeFarmerId(val);
      const duplicate = recentEntries.find(e => normalizeFarmerId(e.farmer_id) === normalizedId);
      setIsDuplicate(!!duplicate);

      const farmer = await userApi.getById(val, selectedBranch);
      if (farmer) {
        setFarmerData(farmer);
        const normalizedFarmerId = normalizeFarmerId(val);
        
        // Get collections for this farmer in current shift
        const farmerCollections = recentEntries.filter(
          e => normalizeFarmerId(e.farmer_id) === normalizedFarmerId
        );

        const hasCow = farmerCollections.some(e => e.type.toLowerCase() === 'cow');
        const hasBuffalo = farmerCollections.some(e => e.type.toLowerCase() === 'buffalo');

        if (farmer.milkType === 'Cow') {
          if (hasCow) {
            toast.info("Collection already taken for Cow", {
              style: { backgroundColor: '#2563eb', color: 'white' }
            });
            setFarmerData(null);
            setFarmerIdInput("");
            return;
          }
          setAllowedTypes(['Cow']);
          setMilkType('Cow');
        } else if (farmer.milkType === 'Buffalo') {
          if (hasBuffalo) {
            toast.info("Collection already taken for Buffalo", {
              style: { backgroundColor: '#2563eb', color: 'white' }
            });
            setFarmerData(null);
            setFarmerIdInput("");
            return;
          }
          setAllowedTypes(['Buffalo']);
          setMilkType('Buffalo');
        } else if (farmer.milkType === 'Both') {
          if (hasCow && hasBuffalo) {
            toast.info("Collection already taken for both Cow & Buffalo", {
              style: { backgroundColor: '#2563eb', color: 'white' }
            });
            setFarmerData(null);
            setFarmerIdInput("");
            return;
          } else if (hasCow) {
            setAllowedTypes(['Buffalo']);
            setMilkType('Buffalo');
          } else if (hasBuffalo) {
            setAllowedTypes(['Cow']);
            setMilkType('Cow');
          } else {
            setAllowedTypes(['Cow', 'Buffalo']);
            setMilkType('Cow');
          }
        }
      } else {
        setFarmerData(null);
        setAllowedTypes(['Cow', 'Buffalo']);
      }
    } catch (error) {
      console.error("Error fetching farmer:", error);
    } finally {
      setFetchingFarmer(false);
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
    if (!sampleId) {
      toast.error("Sample ID is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        farmer_id: farmerIdInput,
        dairy_id: selectedBranch,
        quantity: parseFloat(quantity),
        type: milkType.toLowerCase(),
        sample_id: sampleId,
        date,
        shift
      };

      const response = await ccCollectionApi.create(payload);
      if (response.success) {
        toast.success(`Weight recorded! Sample #${sampleId}`);
        setLastEntry({
          ...payload,
          farmer_name: farmerData?.name || farmerData?.fullName || 'Farmer',
          final_sample_id: response.sample_id || sampleId
        });
        setSuccessModalOpen(true);
        
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
    <>
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
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                                lookupFarmer(farmerIdInput);
                              }
                            }}
                            placeholder="Enter Farmer Code..."
                            className="pl-11 pr-12 h-12 text-lg font-semibold bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                              lookupFarmer(farmerIdInput);
                            }}
                            className="absolute inset-y-0 right-0 px-4 flex items-center text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <Search className="h-5 w-5" />
                          </button>
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
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Waiting for code...</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="opacity-50" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Milk Variety</Label>
                        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                          {allowedTypes.includes('Cow') && (
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
                          )}
                          {allowedTypes.includes('Buffalo') && (
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
                          )}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Next Sample #</Label>
                        <div className="h-10 flex items-center justify-center px-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 font-black text-xl text-blue-600">
                          {sampleId}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Net Quantity (L)</Label>
                        <div className="relative">
                          <Input
                            ref={quantityRef}
                            type="number"
                            step="0.01"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0.00"
                            className="h-10 text-2xl font-black text-center bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 focus:border-blue-500 rounded-xl text-blue-700 dark:text-blue-400"
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
                {recentEntries.map((entry, idx) => {
                  const farmer = allFarmers.find(f => normalizeFarmerId(f.username) === normalizeFarmerId(entry.farmer_id));
                  return (
                    <div key={entry.id || idx} className="p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-900 dark:text-white">ID: {entry.farmer_id}</span>
                          <span className="text-[10px] text-gray-400 truncate max-w-[140px] uppercase font-bold">
                            {farmer?.fullName || 'Farmer'}
                          </span>
                        </div>
                        <Badge className={cn(
                          "text-[8px] h-4 px-1 rounded",
                          entry.type.toLowerCase() === 'cow' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                          {entry.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] text-gray-400">Sample #{entry.sample_id}</span>
                         <span className="text-base font-black text-blue-600 group-hover:scale-110 transition-transform">
                           {parseFloat(entry.quantity).toFixed(2)}
                           <small className="text-[9px] font-normal text-gray-400 ml-0.5">L</small>
                         </span>
                      </div>
                    </div>
                  );
                })}
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
                <span className="text-blue-600">{recentEntries.reduce((acc, curr) => acc + parseFloat(curr.quantity), 0).toFixed(2)} L</span>
             </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-center text-white">
          <div className="mb-4 flex justify-center">
            <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 animate-bounce">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight">ENTRY SUCCESSFUL</h2>
          <p className="text-blue-100 text-sm mt-1 opacity-80 uppercase tracking-widest font-bold">Collection Receipt</p>
        </div>
        
        <div className="p-8 space-y-6 bg-white dark:bg-gray-900">
          <div className="flex flex-col items-center justify-center pb-4 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Generated Sample ID</span>
            <div className="text-6xl font-black text-blue-600 tracking-tighter">
              #{lastEntry?.final_sample_id}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Farmer</p>
              <p className="text-sm font-black text-gray-900 dark:text-white truncate uppercase">{lastEntry?.farmer_name}</p>
              <p className="text-[10px] font-bold text-blue-500">ID: {lastEntry?.farmer_id}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Quantity</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{lastEntry?.quantity} <span className="text-xs">L</span></p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-white dark:bg-gray-800 border-blue-200 text-blue-600 font-bold px-3">
                {lastEntry?.type?.toUpperCase()}
              </Badge>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{lastEntry?.shift} Shift</span>
            </div>
            <span className="text-[10px] font-bold text-gray-500">{lastEntry?.date}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 dark:shadow-none"
              onClick={() => setSuccessModalOpen(false)}
            >
              DONE
            </Button>
            <Button 
              variant="outline"
              className="h-12 w-12 rounded-xl border-gray-200 hover:bg-gray-50"
              onClick={() => window.print()}
            >
              <Printer className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default WeightCollection;
