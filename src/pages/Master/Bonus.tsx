import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { bonusApi } from "@/services/bonusApi";
import { userApi } from "@/services/reportsApi";
import { cn } from "@/lib/utils";
import {
  Search,
  ChevronDown,
  Check,
  X,
  Users,
  DollarSign,
  AlertTriangle,
  Wallet,
  Calculator,
  Save,
  PiggyBank,
  ChevronLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";

const Bonus = () => {
  const navigate = useNavigate();
  const { branches } = useAppSelector((state) => state.branch);
  const [selectedVlc, setSelectedVlc] = useState("");
  const [farmers, setFarmers] = useState<any[]>([]);
  const [bonusAmounts, setBonusAmounts] = useState<Record<string, string>>({});
  const [bulkAmount, setBulkAmount] = useState("");
  const [cowAmount, setCowAmount] = useState("");
  const [buffaloAmount, setBuffaloAmount] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [activeTab, setActiveTab] = useState("bonus");

  // Refs for Enter-Key Navigation
  const bulkAmountRef = useRef<HTMLInputElement>(null);
  const cowAmountRef = useRef<HTMLInputElement>(null);
  const buffaloAmountRef = useRef<HTMLInputElement>(null);
  const fixedAmountRef = useRef<HTMLInputElement>(null);
  const saveBonusBtnRef = useRef<HTMLButtonElement>(null);
  const saveFixedBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedVlc) {
      fetchFarmers();
    } else {
      setFarmers([]);
    }
  }, [selectedVlc]);

  const fetchFarmers = async () => {
    try {
      const data = await userApi.getFarmers(selectedVlc);
      if (data.success && Array.isArray(data.data)) {
        setFarmers(data.data);
      } else {
        setFarmers([]);
      }
    } catch (error) {
      toast.error("Failed to fetch farmers");
      setFarmers([]);
    }
  };

  const handleBulkAmountChange = (value: string) => {
    setBulkAmount(value);
    if (value) {
      const newAmounts: Record<string, string> = {};
      farmers.forEach(farmer => {
        newAmounts[farmer.username] = value;
      });
      setBonusAmounts(newAmounts);
    }
  };

  const handleCowAmountChange = (value: string) => {
    setCowAmount(value);
    if (value) {
      const newAmounts = { ...bonusAmounts };
      farmers.filter(f => f.milkType === 'Cow').forEach(farmer => {
        newAmounts[farmer.username] = value;
      });
      setBonusAmounts(newAmounts);
    }
  };

  const handleBuffaloAmountChange = (value: string) => {
    setBuffaloAmount(value);
    if (value) {
      const newAmounts = { ...bonusAmounts };
      farmers.filter(f => f.milkType === 'Buffalo').forEach(farmer => {
        newAmounts[farmer.username] = value;
      });
      setBonusAmounts(newAmounts);
    }
  };

  const handleBonusChange = (farmerId: string, value: string) => {
    setBonusAmounts(prev => ({ ...prev, [farmerId]: value }));
  };

  const handleSubmit = async () => {
    if (!effectiveFrom) {
      toast.error("Please select effective date");
      return;
    }

    const farmersWithBonus = Object.entries(bonusAmounts).filter(([_, amount]) => amount && parseFloat(amount) > 0);
    
    if (farmersWithBonus.length === 0) {
      toast.error("Please enter bonus amount for at least one farmer");
      return;
    }

    setLoading(true);
    try {
      const promises = farmersWithBonus.map(([farmerId, amount]) => {
        const payload = {
          dairy_id: parseInt(selectedVlc),
          farmer_id: farmerId,
          effective_from: effectiveFrom,
          bonus_deduction: parseFloat(amount),
          fixed_deduction: 0,
        };
        return bonusApi.createBonusDeduction(payload);
      });

      await Promise.all(promises);
      toast.success(`Bonus created for ${farmersWithBonus.length} farmer(s)`);
      setBonusAmounts({});
      setBulkAmount("");
      setCowAmount("");
      setBuffaloAmount("");
      setEffectiveFrom("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create bonus");
    } finally {
      setLoading(false);
    }
  };

  const handleFixedSubmit = async () => {
    if (!selectedVlc || !effectiveFrom || !fixedAmount) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const data = await userApi.getFarmers(selectedVlc);
      if (data.success && Array.isArray(data.data)) {
        const promises = data.data.map((farmer: any) => {
          const payload = {
            dairy_id: parseInt(selectedVlc),
            farmer_id: farmer.username,
            effective_from: effectiveFrom,
            bonus_deduction: 0,
            fixed_deduction: parseFloat(fixedAmount),
          };
          return bonusApi.createBonusDeduction(payload);
        });
        await Promise.all(promises);
        toast.success(`Fixed deduction created for ${data.data.length} farmer(s)`);
        setFixedAmount("");
        setEffectiveFrom("");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create fixed deduction");
    } finally {
      setLoading(false);
    }
  };

  // Enter Key Navigation Handlers
  const handleEnterKey = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLElement | null>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  const handleTableEnter = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = document.getElementById(`bonus-input-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      } else {
        saveBonusBtnRef.current?.focus();
      }
    }
  };

  const handleEffectiveDateEnter = () => {
    // Focus the first available input based on active tab
    if (activeTab === "bonus") {
      bulkAmountRef.current?.focus();
    } else {
      fixedAmountRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <PiggyBank className="h-6 w-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
              Bonus & Deduction
            </h1>
          </div>
        </div>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-2xl">
          
          {/* Shared Header Controls (VLC & Date) */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Searchable VLC Dropdown */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  Select VLC Branch <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full">
                  <VLCDropdown
                    branches={branches || []}
                    value={selectedVlc}
                    onChange={(val) => {
                      setSelectedVlc(val);
                      // Automatically focus Effective Date on select
                      setTimeout(() => document.getElementById('shared_effective_date')?.focus(), 50);
                    }}
                    placeholder="Search and select VLC..."
                    className="h-11 bg-white shadow-sm"
                    valueKey="branch_id"
                  />
                </div>
              </div>

              {/* Shared Effective Date */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  Effective Date <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full md:max-w-[250px]">
                  <Input
                    id="shared_effective_date"
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleEffectiveDateEnter();
                      }
                    }}
                    className="w-full h-11 text-sm rounded-xl border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium bg-white px-4"
                  />
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-50/50 p-1 rounded-none border-b border-slate-100">
                <TabsTrigger 
                  value="bonus" 
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-base font-bold py-3 rounded-t-lg transition-all"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Apply Bonus
                </TabsTrigger>
                <TabsTrigger 
                  value="fixed" 
                  className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-base font-bold py-3 rounded-t-lg transition-all"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Fixed Deduction
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="bonus" className="p-6 space-y-6 m-0 focus-visible:outline-none">
                {selectedVlc && farmers.length > 0 ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* Quick Apply Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-6 rounded-2xl border border-blue-100/50 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Calculator className="w-5 h-5 text-blue-500" />
                        <h3 className="text-base font-bold text-slate-800">Quick Apply Amounts</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="bulk_amount" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3" /> All Farmers
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              id="bulk_amount"
                              ref={bulkAmountRef}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={bulkAmount}
                              onChange={(e) => handleBulkAmountChange(e.target.value)}
                              onKeyDown={(e) => handleEnterKey(e, cowAmountRef)}
                              className="pl-9 border-slate-200 bg-white h-11 rounded-xl shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cow_amount" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Cow Milk Only
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              id="cow_amount"
                              ref={cowAmountRef}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={cowAmount}
                              onChange={(e) => handleCowAmountChange(e.target.value)}
                              onKeyDown={(e) => handleEnterKey(e, buffaloAmountRef)}
                              className="pl-9 border-slate-200 bg-white h-11 rounded-xl shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="buffalo_amount" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Buffalo Milk Only
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              id="buffalo_amount"
                              ref={buffaloAmountRef}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={buffaloAmount}
                              onChange={(e) => handleBuffaloAmountChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const firstInput = document.getElementById('bonus-input-0');
                                  if (firstInput) firstInput.focus();
                                  else saveBonusBtnRef.current?.focus();
                                }
                              }}
                              className="pl-9 border-slate-200 bg-white h-11 rounded-xl shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Table Section */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                      <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <TableRow className="border-b border-slate-100 hover:bg-transparent">
                              <TableHead className="text-left font-bold text-slate-600 uppercase text-xs tracking-wider h-11">Farmer ID</TableHead>
                              <TableHead className="text-left font-bold text-slate-600 uppercase text-xs tracking-wider h-11">Name</TableHead>
                              <TableHead className="text-left font-bold text-slate-600 uppercase text-xs tracking-wider h-11">Mobile</TableHead>
                              <TableHead className="text-left font-bold text-slate-600 uppercase text-xs tracking-wider h-11">Milk Type</TableHead>
                              <TableHead className="text-right font-bold text-slate-600 uppercase text-xs tracking-wider h-11">Bonus Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-slate-50">
                            {farmers.map((farmer, idx) => (
                              <TableRow key={farmer.username} className="hover:bg-blue-50/50 transition-colors border-none group">
                                <TableCell className="font-bold text-slate-700">{farmer.username}</TableCell>
                                <TableCell className="font-medium text-slate-900">{farmer.fullName}</TableCell>
                                <TableCell className="text-slate-500">{farmer.mobile_number || '-'}</TableCell>
                                <TableCell>
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                                    farmer.milkType === 'Cow' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                                  )}>
                                    {farmer.milkType || 'Unknown'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end">
                                    <div className="relative w-36">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₹</span>
                                      <Input
                                        id={`bonus-input-${idx}`}
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={bonusAmounts[farmer.username] || ""}
                                        onChange={(e) => handleBonusChange(farmer.username, e.target.value)}
                                        onKeyDown={(e) => handleTableEnter(e, idx)}
                                        className="pl-8 text-right font-bold text-blue-700 border-slate-200 h-10 rounded-xl group-hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 group-hover:bg-white"
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    <Button
                      ref={saveBonusBtnRef}
                      onClick={handleSubmit}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-14 rounded-2xl text-base font-bold shadow-xl shadow-blue-200/50 active:scale-[0.99] transition-all"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving Bonus Data...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Save className="w-5 h-5" />
                          Save Bonus for {Object.entries(bonusAmounts).filter(([_, amt]) => parseFloat(amt) > 0).length} Farmers
                        </span>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                      <Users className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                      {selectedVlc ? "No Farmers Found" : "Select a VLC Branch"}
                    </h3>
                    <p className="text-slate-500 max-w-sm text-sm">
                      {selectedVlc 
                        ? "There are no active farmers registered under this branch."
                        : "Please select a VLC branch from the dropdown above to view farmers and apply bonuses."}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="fixed" className="p-6 space-y-6 m-0 focus-visible:outline-none">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl mx-auto space-y-6 pt-4">
                  
                  <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-8 rounded-3xl border border-indigo-100/50 shadow-sm text-center">
                    <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                      <Wallet className="w-8 h-8 text-indigo-500" />
                    </div>
                    <Label htmlFor="fixed_amount" className="block mb-4 font-bold text-lg text-slate-800">
                      Global Fixed Deduction Amount
                    </Label>
                    <div className="relative max-w-xs mx-auto">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
                      <Input
                        id="fixed_amount"
                        ref={fixedAmountRef}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={fixedAmount}
                        onChange={(e) => setFixedAmount(e.target.value)}
                        onKeyDown={(e) => handleEnterKey(e, saveFixedBtnRef)}
                        className="pl-10 text-center text-xl font-bold text-indigo-700 border-slate-200 bg-white h-14 rounded-xl shadow-inner focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300"
                      />
                    </div>
                    <p className="text-sm font-medium text-slate-500 mt-6">
                      This amount will be deducted from all farmers under the selected VLC.
                    </p>
                  </div>

                  <Button
                    ref={saveFixedBtnRef}
                    onClick={handleFixedSubmit}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white h-14 rounded-2xl text-base font-bold shadow-xl shadow-indigo-200/50 active:scale-[0.99] transition-all"
                    disabled={loading || !selectedVlc}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        Apply Fixed Deduction
                      </span>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Bonus;
