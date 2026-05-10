import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { FlaskConical, Search, Save, Loader2, Calculator, CheckCircle2, AlertCircle, TrendingUp, Droplets, Gauge, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { useAppSelector } from "@/redux/store";
import { ccCollectionApi } from "@/services/ccCollectionApi";
import { userApi as reportsUserApi } from "@/services/reportsApi";
import { collectionApi } from "@/services/collectionApi";
import { rateChartApi } from "@/services/rateChartApi";
import { settingsApi } from "@/services/settingsApi";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { calculateSNFFromFatAndCLR, calculateCLRFromFatAndSNF } from "@/utils/milkCalculations";

const AnalyserCollection = () => {
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

  const [lookupValue, setLookupValue] = useState("");
  const [weightRecord, setWeightRecord] = useState<any>(null);
  const [fat, setFat] = useState("");
  const [snf, setSnf] = useState("");
  const [clr, setClr] = useState("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchingRecord, setFetchingRecord] = useState(false);
  const [calculatingRate, setCalculatingRate] = useState(false);
  const [showCLR, setShowCLR] = useState(true);
  const [searchMethod, setSearchMethod] = useState<'farmer_id' | 'sample_id'>('sample_id');
  const [allFarmers, setAllFarmers] = useState<any[]>([]);
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [recentFullCollections, setRecentFullCollections] = useState<any[]>([]);

  const lookupRef = useRef<HTMLInputElement>(null);
  const fatRef = useRef<HTMLInputElement>(null);
  const clrRef = useRef<HTMLInputElement>(null);
  const snfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      const defaultBranch = branches[0];
      setSelectedBranch(defaultBranch.branch_id);
      fetchSettings(defaultBranch.branch_id);
    }
  }, [branches]);

  const fetchSettings = async (branchId: number) => {
    try {
      // Load CC settings from localStorage
      const savedSearch = localStorage.getItem(`cc_search_type_${branchId}`);
      const savedAnalysis = localStorage.getItem(`cc_analysis_type_${branchId}`);
      
      setSearchMethod(savedSearch === '0' ? 'farmer_id' : 'sample_id');
      setShowCLR(savedAnalysis === '1');

      // Also try to fetch backend settings for other configurations
      const response = await settingsApi.get(branchId.toString());
      if (response.data?.success && response.data?.data) {
        // If backend has a say in CLR vs SNF, it would be here, 
        // but we prioritize the CC toggle as requested.
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  useEffect(() => {
    if (selectedBranch) {
      fetchRecentFullCollections();
      fetchSettings(selectedBranch);
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

  const fetchRecentFullCollections = async () => {
    if (!selectedBranch) return;
    try {
      const response = await collectionApi.getCollections({
        dairy_id: selectedBranch,
        date,
        shift
      });
      if (response.success) {
        setRecentFullCollections(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching recent full collections:", error);
    }
  };

  const handleLookup = async () => {
    if (!lookupValue || !selectedBranch) return;
    setFetchingRecord(true);
    setWeightRecord(null);
    try {
      const isSampleId = !isNaN(parseInt(lookupValue)) && lookupValue.length < 5;
      const payload: any = {
        dairy_id: selectedBranch,
        date,
        shift
      };
      if (searchMethod === 'sample_id') {
        payload.sample_id = lookupValue;
      } else {
        payload.farmer_id = lookupValue;
        payload.sample_id = "all";
      }

      const response = await ccCollectionApi.get(payload);
      if (response.success && response.data) {
        const records = Array.isArray(response.data) ? response.data : [response.data];
        const nonCompleted = records.filter(r => !r.is_completed);
        
        if (nonCompleted.length === 0) {
          if (records.some(r => r.is_completed)) {
            toast.info("All entries for this farmer are already completed");
          } else {
            toast.error("No pending records found");
          }
          return;
        }

        setPendingRecords(nonCompleted);
        setWeightRecord(nonCompleted[0]);
        setTimeout(() => fatRef.current?.focus(), 100);
      } else {
        toast.error("No record found");
      }
    } catch (error) {
      toast.error("Lookup failed");
    } finally {
      setFetchingRecord(false);
    }
  };

  const handleFatChange = (val: string) => {
    setFat(val);
    if (showCLR) {
      if (val && clr) {
        const calculatedSNF = calculateSNFFromFatAndCLR(val, clr);
        setSnf(calculatedSNF);
        calculateRate(val, calculatedSNF, clr);
      }
    } else {
      if (val && snf) {
        const calculatedCLR = calculateCLRFromFatAndSNF(val, snf);
        setClr(calculatedCLR);
        calculateRate(val, snf, calculatedCLR);
      }
    }
  };

  const handleCLRChange = (val: string) => {
    setClr(val);
    if (fat && val) {
      const calculatedSNF = calculateSNFFromFatAndCLR(fat, val);
      setSnf(calculatedSNF);
      calculateRate(fat, calculatedSNF, val);
    }
  };

  const handleSNFChange = (val: string) => {
    setSnf(val);
    if (fat && val) {
      const calculatedCLR = calculateCLRFromFatAndSNF(fat, val);
      setClr(calculatedCLR);
      calculateRate(fat, val, calculatedCLR);
    }
  };

  const calculateRate = async (f: string, s: string, c: string) => {
    if (!weightRecord || !selectedBranch || !f || (!s && !c)) return;
    
    // Find the farmer to get their assigned Rate Chart name
    const farmer = allFarmers.find(far => far.username === weightRecord.farmer_id);
    const rateChartName = farmer?.rateChart || weightRecord.rate_chart || "default";

    setCalculatingRate(true);
    try {
      const response = await rateChartApi.getRate(
        parseFloat(f),
        parseFloat(s),
        selectedBranch,
        rateChartName,
        weightRecord.type,
        date,
        shift
      );
      // Check for price or rate directly as the API might not return a success wrapper
      const fetchedRate = response.price || response.rate || response.data?.price || response.data?.rate;
      
      if (fetchedRate !== undefined && fetchedRate !== null) {
        setRate(fetchedRate.toString());
        const calculatedAmount = Number(fetchedRate) * weightRecord.quantity;
        setAmount(calculatedAmount);
      } else {
        toast.error("Rate not found for this quality");
        setRate("0");
        setAmount(0);
      }
    } catch (error) {
      console.error("Rate error:", error);
    } finally {
      setCalculatingRate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightRecord) return;
    if (!fat || !snf || !rate) {
      toast.error("Missing analysis data");
      return;
    }

    setLoading(true);
    try {
      const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
      const payload = {
        farmer_id: weightRecord.farmer_id,
        dairy_id: selectedBranch!,
        type: (weightRecord.type.charAt(0).toUpperCase() + weightRecord.type.slice(1)) as 'Cow' | 'Buffalo',
        quantity: weightRecord.quantity,
        fat: parseFloat(fat),
        snf: parseFloat(snf),
        clr: parseFloat(clr) || 0,
        rate: parseFloat(rate),
        amount: Number(amount.toFixed(2)),
        shift,
        date: `${date} ${time}`,
        cc_collection_id: weightRecord.id
      };

      const response = await collectionApi.create(payload);
      if (response.success) {
        toast.success("Analysis recorded successfully!");
        
        // Reset form
        setFat("");
        setSnf("");
        setClr("");
        setRate("");
        setAmount(0);
        
        // Check if there are more pending records for the same farmer/sample lookup
        const remaining = pendingRecords.filter(r => r.id !== weightRecord.id);
        if (remaining.length > 0) {
          setPendingRecords(remaining);
          setWeightRecord(remaining[0]);
          toast.info(`Moving to next variety: ${remaining[0].type.toUpperCase()}`);
          setTimeout(() => fatRef.current?.focus(), 100);
        } else {
          setWeightRecord(null);
          setPendingRecords([]);
          setLookupValue("");
          lookupRef.current?.focus();
        }
        
        fetchRecentFullCollections();
      } else {
        toast.error(response.message || "Failed to save");
      }
    } catch (error: any) {
      toast.error("Error saving analysis");
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
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FlaskConical className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('analyser_collection')}
            </h1>
            <p className="text-xs text-gray-500">Quality Analysis • Step 2</p>
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
                shift === 'Morning' ? "bg-white dark:bg-gray-600 text-purple-600 shadow-sm" : "text-gray-500"
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
                shift === 'Evening' ? "bg-white dark:bg-gray-600 text-purple-600 shadow-sm" : "text-gray-500"
              )}
            >
              🌙 Evening
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {!selectedBranch ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <MapPin className="h-12 w-12 text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium text-sm">Please select a VLC from the header to begin.</p>
              </div>
            ) : (
              <>
                {/* Search Card */}
                <Card className="border-none shadow-lg bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Search Record</Label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <Input
                              ref={lookupRef}
                              value={lookupValue}
                              onChange={(e) => setLookupValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                              placeholder={searchMethod === 'sample_id' ? "Enter Sample ID..." : "Enter Farmer Code..."}
                              className="pl-11 h-11 text-base bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl"
                            />
                          </div>
                      </div>
                      <Button 
                        onClick={handleLookup} 
                        disabled={fetchingRecord || !lookupValue}
                        className="h-11 px-8 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all"
                      >
                        {fetchingRecord ? <Loader2 className="h-4 w-4 animate-spin" /> : "SEARCH"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {weightRecord && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    {/* Selection Tabs if multiple pending */}
                    {pendingRecords.length > 1 && (
                      <div className="flex p-1 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/20">
                        {pendingRecords.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setWeightRecord(r)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-[10px] font-black transition-all duration-200",
                              weightRecord.id === r.id
                                ? "bg-white dark:bg-gray-800 text-purple-600 shadow-sm"
                                : "text-purple-400 hover:text-purple-600"
                            )}
                          >
                            {r.type === 'cow' ? '🐄' : '🐃'} {r.type.toUpperCase()} (SAMPLE #{r.sample_id})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Farmer Info Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Farmer</span>
                        <p className="text-sm font-bold text-gray-900 dark:text-white uppercase truncate">
                          {allFarmers.find(f => f.username === weightRecord.farmer_id)?.fullName || 'Farmer'}
                        </p>
                        <p className="text-[9px] font-bold text-purple-500">ID: {weightRecord.farmer_id}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quantity</span>
                        <p className="text-sm font-black text-purple-600 dark:text-purple-400">{weightRecord.quantity} <small className="text-[10px] font-normal">L</small></p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Variety</span>
                        <div><Badge className="bg-purple-100 text-purple-700 text-[8px] h-4 uppercase">{weightRecord.type}</Badge></div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sample ID</span>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">#{weightRecord.sample_id}</p>
                      </div>
                    </div>

                    {/* Analysis Form */}
                    <Card className="border-none shadow-xl bg-white dark:bg-gray-900 rounded-2xl">
                      <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2.5">
                              <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Droplets className="h-3 w-3 text-purple-500" /> FAT (%)
                              </Label>
                              <Input
                                ref={fatRef}
                                type="number"
                                step="0.1"
                                value={fat}
                                onChange={(e) => handleFatChange(e.target.value)}
                                placeholder="0.0"
                                className="h-12 text-xl font-black bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500/20 transition-all rounded-xl"
                              />
                            </div>

                            {showCLR ? (
                              <div className="space-y-2.5">
                                <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                  <Gauge className="h-3 w-3 text-purple-500" /> CLR
                                </Label>
                                <Input
                                  ref={clrRef}
                                  type="number"
                                  step="0.5"
                                  value={clr}
                                  onChange={(e) => handleCLRChange(e.target.value)}
                                  placeholder="0.0"
                                  className="h-12 text-xl font-black bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500/20 transition-all rounded-xl"
                                />
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                  <Gauge className="h-3 w-3 text-purple-500" /> SNF (%)
                                </Label>
                                <Input
                                  ref={snfRef}
                                  type="number"
                                  step="0.01"
                                  value={snf}
                                  onChange={(e) => handleSNFChange(e.target.value)}
                                  placeholder="0.00"
                                  className="h-12 text-xl font-black bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500/20 transition-all rounded-xl"
                                />
                              </div>
                            )}

                            {showCLR ? (
                              <div className="space-y-2.5">
                                <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                  <Droplets className="h-3 w-3 text-purple-500" /> CALC SNF
                                </Label>
                                <div className="h-12 flex items-center px-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 font-black text-xl text-gray-400">
                                  {snf || '0.00'}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                  <Gauge className="h-3 w-3 text-purple-500" /> CALC CLR
                                </Label>
                                <div className="h-12 flex items-center px-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 font-black text-xl text-gray-400">
                                  {clr || '0.00'}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100/50 dark:border-purple-800/20">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase text-purple-400 tracking-tighter">Applied Rate (₹/KG)</Label>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <span className="text-2xl font-black text-gray-900 dark:text-white">
                                  {calculatingRate ? <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> : `₹${parseFloat(rate || "0").toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1 md:text-right">
                              <Label className="text-[10px] font-black uppercase text-purple-400 tracking-tighter">Net Payable</Label>
                              <div className="flex items-center justify-end gap-2">
                                <Calculator className="h-4 w-4 text-blue-500" />
                                <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                                  ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Button 
                            type="submit" 
                            disabled={loading || !rate}
                            className="w-full h-12 text-base font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 dark:shadow-none transition-all active:scale-[0.98]"
                          >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="flex items-center gap-2"><Save className="h-5 w-5" /> FINALIZE & SYNC</div>}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar - Recent Finalized */}
        <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-xl">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
              FINALIZED LOGS
              <Badge variant="secondary" className="bg-purple-50 text-purple-600 text-[10px] h-5">{recentFullCollections.length}</Badge>
            </h2>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Completed Analyses</p>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {recentFullCollections.length > 0 ? (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {recentFullCollections.map((entry, idx) => (
                  <div key={entry.id || idx} className="p-4 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors group">
                    <div className="flex items-center justify-between mb-1.5">
                       <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 dark:text-white">{entry.farmer_id}</span>
                        <span className="text-[10px] text-gray-400 truncate max-w-[120px] font-bold uppercase">{entry.farmer_name || 'Farmer'}</span>
                      </div>
                      <div className="flex gap-1">
                         <Badge variant="outline" className="text-[8px] h-4 px-1 border-purple-100 dark:border-purple-800 font-bold">F: {entry.fat}</Badge>
                         <Badge variant="outline" className="text-[8px] h-4 px-1 border-purple-100 dark:border-purple-800 font-bold">S: {entry.snf}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] text-gray-400 uppercase font-medium">{format(new Date(entry.date), 'dd MMM')} • {entry.shift}</span>
                       <span className="text-sm font-black text-purple-600 group-hover:scale-110 transition-transform">₹{parseFloat(entry.amount || "0").toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                 <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-3">
                  <CheckCircle2 className="h-8 w-8 text-gray-200" />
                </div>
                <p className="text-xs text-gray-400 font-medium">No finalized entries<br/>for this shift.</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
             <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                <span>TOTAL REVENUE</span>
                <span className="text-purple-600 font-black">₹{recentFullCollections.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0).toFixed(2)}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyserCollection;
