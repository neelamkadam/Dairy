import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/store";
import { vlcCommissionApi } from "@/services/vlcCommissionApi";
import { toast } from "react-toastify";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, subDays, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { reportsApi } from "@/services/reportsApi";
import { History, TrendingUp, Wallet, Calendar, CheckCircle2, Copy } from "lucide-react";

// Selected VLCs are saved a few at a time, so "Select All" does not fire one
// request per VLC all at once
const SAVE_CONCURRENCY = 4;

const VlcCCommissionEntry: React.FC = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [formData, setFormData] = useState({
    // One commission is saved for every selected VLC
    vlccs: [] as string[],
    commissionType: "per-liter",
    commissionAmount: "",
    effectiveDate: new Date() as Date | undefined,
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [commissionData, setCommissionData] = useState<any>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(inputValue).then(
      () => {
        toast.success(t("copied_to_clipboard", "Copied to clipboard!"));
      },
      (err) => {
        console.error("Failed to copy: ", err);
      }
    );
  };

  // History and auto-fill follow a single selected VLC; with several selected the
  // panel lists them instead
  const singleVlc = formData.vlccs.length === 1 ? formData.vlccs[0] : "";
  const selectedBranches = (branches || []).filter((b) => formData.vlccs.includes(String(b.branch_id)));

  const fetchCommissionData = async () => {
    if (!singleVlc) return;
    const dateToUse = formData.effectiveDate || new Date();
    try {
      const data = await reportsApi.getVlcCommissionReport({
        vlc_id: singleVlc,
        start_date: format(dateToUse, 'yyyy-MM-dd'),
        end_date: format(dateToUse, 'yyyy-MM-dd')
      });
      if (data.success && data.data?.length > 0) {
        setCommissionData(data.data[0]);
        
        // Auto-fill latest commission data
        if (data.data[0].commissions?.length > 0) {
          const latestCommission = data.data[0].commissions[0];
          setFormData(prev => ({
            ...prev,
            commissionType: latestCommission.type === 'Commission' ? 'per-liter' : 'fixed',
            commissionAmount: latestCommission.amount
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch commission data:', error);
    }
  };

  useEffect(() => {
    if (singleVlc) {
      fetchCommissionData();
    } else {
      setCommissionData(null);
    }
  }, [singleVlc]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vlccs.length || !formData.commissionAmount || !formData.effectiveDate) {
      toast.error(t("please_fill_all_required_fields", "Please fill all required fields"));
      return;
    }
    const base = {
      type: formData.commissionType === "per-liter" ? "Commission" : "Fixed",
      amount: parseFloat(formData.commissionAmount),
      effective_from: format(formData.effectiveDate, "yyyy-MM-dd")
    };
    setLoading(true);
    const saved: { vlcc: string; id: number; message: string }[] = [];
    const failed: { vlcc: string; message: string }[] = [];
    for (let i = 0; i < formData.vlccs.length; i += SAVE_CONCURRENCY) {
      const batch = formData.vlccs.slice(i, i + SAVE_CONCURRENCY);
      const results = await Promise.allSettled(batch.map((vlcc) => vlcCommissionApi.create({ vlcc, ...base })));
      results.forEach((result, j) => {
        const vlcc = batch[j];
        if (result.status === "fulfilled" && result.value.data.success) {
          saved.push({ vlcc, id: result.value.data.id, message: result.value.data.message });
        } else {
          const error: any = result.status === "rejected" ? result.reason : null;
          failed.push({
            vlcc,
            message: error?.response?.data?.message || (result.status === "fulfilled" && result.value.data.message) || t("failed_to_submit_commission", "Failed to submit commission"),
          });
        }
      });
    }
    setLoading(false);

    const vlcLabel = (vlcc: string) => {
      const branch = (branches || []).find((b) => String(b.branch_id) === vlcc);
      return branch ? `${branch.username} - ${branch.name}` : vlcc;
    };
    if (formData.vlccs.length === 1) {
      if (saved.length) toast.success(saved[0].message);
      else toast.error(failed[0].message);
    } else {
      if (saved.length) toast.success(t("commission_saved_for_vlcs", { count: saved.length, defaultValue: "Commission saved for {{count}} VLCs" }));
      if (failed.length) {
        toast.error(t("commission_failed_for_vlcs", {
          list: failed.map((f) => `${vlcLabel(f.vlcc)} (${f.message})`).join(", "),
          defaultValue: "Could not save for: {{list}}",
        }));
      }
    }
    if (saved.length) {
      const stamp = Date.now();
      setInputValue(saved.map((s) => `VLC-${s.id}-${stamp}`).join(", "));
      setIsSubmitted(true);
      fetchCommissionData();
      setTimeout(() => setIsSubmitted(false), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col items-start text-left gap-1.5 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-800 tracking-tight">
            {t("vlc_commission_configuration", "VLC Commission Configuration")}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            {t("set_and_manage_commission_rates", "Set and manage commission rates or fixed payments for Village Level Collection Centers.")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          
          {/* Main Form Area */}
          <div className="lg:col-span-2">
            <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl">
              <CardHeader className="px-6 py-5 border-b border-slate-100/50 bg-white/50 rounded-t-2xl">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  {t("commission_entry", "Commission Entry")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* VLC Selection */}
                  <div className="space-y-2 group">
                    <Label htmlFor="vlcc" className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                      {t("select_vlc", "Select VLC")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <VLCDropdown
                        branches={branches}
                        value={formData.vlccs}
                        onChange={(value: string[]) => setFormData((prev) => ({ ...prev, vlccs: value }))}
                        valueKey="branch_id"
                        isMultiSelect
                        placeholder={t("choose_a_vlc_center", "Choose a VLC center...")}
                      />
                    </div>
                  </div>

                  {/* Commission Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">
                      {t("commission_type", "Commission Type")} <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={formData.commissionType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, commissionType: value })
                      }
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <Label
                        htmlFor="per-liter"
                        className={cn(
                          "flex items-center space-x-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200",
                          formData.commissionType === "per-liter" 
                            ? "border-indigo-600 bg-indigo-50/50 shadow-[0_0_15px_rgba(79,70,229,0.15)]" 
                            : "border-transparent bg-slate-50 hover:bg-slate-100 hover:scale-[1.02]"
                        )}
                      >
                        <RadioGroupItem value="per-liter" id="per-liter" className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-900">{t("per_liter", "Per Liter")}</span>
                          <span className="text-xs text-slate-500 font-medium">{t("commission_based_on_volume", "Commission based on volume")}</span>
                        </div>
                      </Label>
                      
                      <Label
                        htmlFor="fixed"
                        className={cn(
                          "flex items-center space-x-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200",
                          formData.commissionType === "fixed" 
                            ? "border-indigo-600 bg-indigo-50/50 shadow-[0_0_15px_rgba(79,70,229,0.15)]" 
                            : "border-transparent bg-slate-50 hover:bg-slate-100 hover:scale-[1.02]"
                        )}
                      >
                        <RadioGroupItem value="fixed" id="fixed" className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-900">{t("fixed_payment", "Fixed Payment")}</span>
                          <span className="text-xs text-slate-500 font-medium">{t("flat_amount_per_cycle", "Flat amount per cycle")}</span>
                        </div>
                      </Label>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Amount */}
                    <div className="space-y-2 group">
                      <Label htmlFor="commissionAmount" className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                        {t("amount", "Amount")} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative group/input">
                        <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 font-semibold group-hover/input:text-indigo-600 transition-colors">
                          ₹
                        </span>
                        <Input
                          id="commissionAmount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-8 bg-slate-50/50 border-slate-200 rounded-xl shadow-sm h-11 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all font-medium text-slate-900 text-lg"
                          value={formData.commissionAmount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              commissionAmount: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Effective Date */}
                    <div className="space-y-2 group">
                      <Label className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                        {t("effective_date_from", "Effective Date From")} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={formData.effectiveDate ? format(formData.effectiveDate, "yyyy-MM-dd") : ""}
                          onChange={(e) => {
                            const d = new Date(e.target.value);
                            if (isValid(d)) setFormData({ ...formData, effectiveDate: d });
                          }}
                          className="bg-slate-50/50 border-slate-200 w-full h-11 rounded-xl shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all font-medium text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-base font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>{t("processing", "Processing...")}</span>
                        </>
                      ) : (
                        t("save_configuration", "Save Configuration")
                      )}
                    </Button>
                  </div>
                </form>

                {isSubmitted && (
                  <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/60 rounded-xl animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <div className="flex items-center gap-2.5 text-green-800 font-bold mb-3">
                      <CheckCircle2 className="w-6 h-6 text-green-600 animate-in zoom-in duration-300 delay-100" />
                      {t("configuration_saved_successfully", "Configuration saved successfully")}
                    </div>
                    <div className="relative group/copy">
                      <Label className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1.5 block">
                        {t("reference_id", "Reference ID")}
                      </Label>
                      <div className="flex items-center">
                        <Input
                          type="text"
                          value={inputValue}
                          readOnly
                          className="pr-12 bg-white/60 border-green-200/60 font-mono text-sm text-slate-700 rounded-l-lg rounded-r-none h-10 border-r-0 focus-visible:ring-0"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCopy}
                          className="h-10 rounded-l-none rounded-r-lg border-green-200/60 bg-white hover:bg-green-100/50 hover:text-green-700 text-green-600 border-l-0 px-3 transition-colors"
                          title={t("copy_to_clipboard", "Copy to clipboard")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History Column */}
          <div className="lg:col-span-1">
            <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl h-[550px] flex flex-col">
              <CardHeader className="px-5 py-4 border-b border-slate-100/50 bg-white/50 rounded-t-2xl shrink-0">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" />
                  {t("commission_history", "Commission History")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden relative">
                {selectedBranches.length > 1 ? (
                  <div className="absolute inset-0 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    <p className="text-xs font-medium text-slate-500 mb-3">
                      {t("multi_vlc_commission_note", {
                        count: selectedBranches.length,
                        defaultValue: "This commission will be saved for each of these {{count}} VLCs.",
                      })}
                    </p>
                    {selectedBranches.map((b) => (
                      <div key={b.branch_id} className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                        {b.username} - {b.name}
                      </div>
                    ))}
                  </div>
                ) : commissionData && commissionData.commissions?.length > 0 ? (
                  <div className="absolute inset-0 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {commissionData.commissions.map((comm: any, idx: number) => {
                      const isActive = idx === 0;
                      const effectiveFrom = new Date(comm.effective_from);
                      
                      let endDate = null;
                      if (!isActive) {
                        const newerCommEffectiveDate = new Date(commissionData.commissions[idx - 1].effective_from);
                        endDate = subDays(newerCommEffectiveDate, 1);
                      }
                      
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-md",
                            isActive 
                              ? "bg-gradient-to-br from-indigo-50/80 to-blue-50/50 border-indigo-200/60" 
                              : "bg-white border-slate-100 hover:border-indigo-100"
                          )}
                        >
                          {isActive && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                          )}
                          <div className="p-4">
                            {isActive && (
                              <div className="flex items-center gap-1.5 mb-2.5">
                                <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                                  {t("currently_active", "Currently Active")}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-start mb-3">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-5">
                                  {t("type", "Type")}
                                </p>
                                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                                  {comm.type === 'Commission' ? t("per_liter", "Per Liter") : t("fixed_payment", "Fixed Payment")}
                                </p>
                              </div>
                              <div className="space-y-1 text-right">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  {t("rate", "Rate")}
                                </p>
                                <p className="text-lg font-black text-indigo-600 tracking-tight leading-none">
                                  ₹{parseFloat(comm.amount).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-200/60 mt-1 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                  {isActive ? t("effective_since", "Effective Since") : t("active_period", "Active Period")}
                                </p>
                                <p className="text-xs font-medium text-slate-700">
                                  {isActive 
                                    ? format(effectiveFrom, 'MMM dd, yyyy')
                                    : endDate 
                                      ? `${format(effectiveFrom, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
                                      : format(effectiveFrom, 'MMM dd, yyyy')
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                      <History className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">{t("no_history_found", "No History Found")}</h3>
                    <p className="text-xs font-medium text-slate-500 max-w-[200px]">
                      {t("select_a_vlc_center_to_view_history", "Select a VLC center to view its past and current commission configurations.")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VlcCCommissionEntry;
