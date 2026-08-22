import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/store";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

import {
  UserPlus,
  CreditCard,
  TrendingUp,
  FileText,
  Minus,
  Languages,
  BarChart3,
  Scale,
  Layers,
  Printer,
  Lock,
  ClipboardList,
  PieChart,
  ListOrdered,
  Users,
  Diff,
  History,
  Package,
  MessageCircle,
  Settings2,
  Save,
  ToggleLeft,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { settingsApi } from "@/services/settingsApi";
import { passwordApiService } from "@/services/passwordApiService";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";

// ─── Module-level sub-components (must be outside GeneralSettings to keep
//     stable references across re-renders — prevents input focus loss) ─────────

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const SectionHeader = ({
  icon: Icon, title, children,
}: { icon: React.ElementType; title: string; children?: React.ReactNode }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-blue-50 rounded-md">
        <Icon className="h-4 w-4 text-blue-600" />
      </div>
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
    </div>
    {children}
  </div>
);

const SelectAllBox = ({
  allOn, onToggle,
}: { allOn: boolean; someOn: boolean; onToggle: (v: boolean) => void }) => (
  <label className="flex items-center gap-2 cursor-pointer group">
    <Checkbox
      checked={allOn}
      onCheckedChange={onToggle}
      className="h-4 w-4 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
    />
    <span className="text-xs font-medium text-gray-500 group-hover:text-blue-500 transition-colors">
      {allOn ? (typeof window !== "undefined" && window.localStorage.getItem("i18nextLng") === "hi" ? "सभी अचयनित करें" : "Deselect All") : (typeof window !== "undefined" && window.localStorage.getItem("i18nextLng") === "hi" ? "सभी चुनें" : "Select All")}
    </span>
  </label>
);

const FeatureRow = ({
  id, icon: Icon, label, checked, onChange,
}: { id: string; icon: React.ElementType; label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label
    htmlFor={id}
    className={cn(
      "flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-all select-none",
      checked ? "border-blue-200 bg-blue-50/60" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/60"
    )}
  >
    <Checkbox
      id={id} checked={checked} onCheckedChange={onChange}
      className="h-4 w-4 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
    />
    <Icon className={cn("h-4 w-4 flex-shrink-0", checked ? "text-blue-500" : "text-gray-400")} />
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </label>
);

const SwitchRow = ({
  icon: Icon, label, checked, onChange,
}: { icon: React.ElementType; label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className={cn(
    "flex items-center justify-between px-3.5 py-2.5 rounded-lg border transition-all",
    checked ? "border-blue-200 bg-blue-50/40" : "border-gray-100 hover:border-gray-200"
  )}>
    <div className="flex items-center gap-2.5 min-w-0">
      <Icon className={cn("h-4 w-4 flex-shrink-0", checked ? "text-blue-500" : "text-gray-400")} />
      <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
      <Switch
        checked={checked} onCheckedChange={onChange}
        className="scale-90 origin-right data-[state=checked]:bg-blue-600"
      />
      <span className={cn("text-xs font-bold w-7 text-right", checked ? "text-blue-600" : "text-gray-400")}>
        {checked ? "ON" : "OFF"}
      </span>
    </div>
  </div>
);

const SegmentControl = ({
  options, value, onChange,
}: { options: { label: string; val: number }[]; value: number; onChange: (v: number) => void }) => (
  <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
    {options.map(({ label, val }) => (
      <button
        key={val} type="button" onClick={() => onChange(val)}
        className={cn(
          "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
          value === val ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
        )}
      >
        {label}
      </button>
    ))}
  </div>
);

const GeneralSettings = () => {
  const { t } = useTranslation();
  const branches = useAppSelector((state) => state.branch.branches);
  const [selectedVlc, setSelectedVlc] = useState("");
  const [vlcOpen, setVlcOpen] = useState(false);
  const [vlcSearch, setVlcSearch] = useState("");
  const vlcSearchRef = useRef<HTMLInputElement>(null);
  const vlcWrapperRef = useRef<HTMLDivElement>(null);

  // Tracks the last-saved / last-fetched state for change detection
  const savedSnapshot = useRef<Record<string, unknown>>({});

  // Close dropdown on outside click
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
  const [addFarmer, setAddFarmer] = useState(0);
  const [rateChart, setRateChart] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [paymentReceipt, setPaymentReceipt] = useState(0);
  const [generateBill, setGenerateBill] = useState(0);
  const [analyser, setAnalyser] = useState(0);
  const [weightTier, setWeightTier] = useState(0);
  const [weight, setWeight] = useState(0);
  const [printer, setPrinter] = useState(0);
  const [language, setLanguage] = useState("English");
  const [reportLanguage, setReportLanguage] = useState("English");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [showWater, setShowWater] = useState(0);
  const [cattleFeedLumpSum, setCattleFeedLumpSum] = useState(() => {
    const saved = localStorage.getItem("cattleFeedLumpSum");
    return saved ? parseInt(saved) : 0;
  });
  const [multipleModal, setMultipleModal] = useState(0);
  const [cc, setCc] = useState(0);

  const [showShiftReport, setShowShiftReport] = useState(0);
  const [showTotalCollection, setShowTotalCollection] = useState(0);
  const [showPaymentSummary, setShowPaymentSummary] = useState(0);
  const [showReportRateChart, setShowReportRateChart] = useState(0);
  const [showFarmerBill, setShowFarmerBill] = useState(0);
  const [showFarmerList, setShowFarmerList] = useState(0);
  const [showDifferenceReport, setShowDifferenceReport] = useState(0);
  const [showBonusDeduction, setShowBonusDeduction] = useState(0);
  const [showCollectionHistory, setShowCollectionHistory] = useState(0);
  const [showCattleFeed, setShowCattleFeed] = useState(0);
  const [ccSearchType, setCcSearchType] = useState(0);
  const [ccAnalysisType, setCcAnalysisType] = useState(0);

  // Derived select-all states
  const featureValues = [addFarmer, rateChart, deduction, paymentReceipt, generateBill];
  const allFeaturesOn = featureValues.every((v) => v === 1);
  const someFeaturesOn = featureValues.some((v) => v === 1) && !allFeaturesOn;

  const switchValues = [analyser, weightTier, cc, weight, printer];
  const allSwitchesOn = switchValues.every((v) => v === 1);
  const someSwitchesOn = switchValues.some((v) => v === 1) && !allSwitchesOn;

  const reportValues = [
    showShiftReport, showTotalCollection, showPaymentSummary,
    showReportRateChart, showFarmerBill, showFarmerList,
    showDifferenceReport, showBonusDeduction, showCollectionHistory, showCattleFeed,
  ];
  const allReportsOn = reportValues.every((v) => v === 1);
  const someReportsOn = reportValues.some((v) => v === 1) && !allReportsOn;

  const handleSelectAllFeatures = (checked: boolean) => {
    const val = checked ? 1 : 0;
    setAddFarmer(val); setRateChart(val); setDeduction(val);
    setPaymentReceipt(val); setGenerateBill(val);
  };

  const handleSelectAllSwitches = (checked: boolean) => {
    const val = checked ? 1 : 0;
    setAnalyser(val); setWeightTier(val); setCc(val);
    setWeight(val); setPrinter(val);
  };

  const handleSelectAllReports = (checked: boolean) => {
    const val = checked ? 1 : 0;
    setShowShiftReport(val); setShowTotalCollection(val);
    setShowPaymentSummary(val); setShowReportRateChart(val);
    setShowFarmerBill(val); setShowFarmerList(val);
    setShowDifferenceReport(val); setShowBonusDeduction(val);
    setShowCollectionHistory(val); setShowCattleFeed(val);
  };

  useEffect(() => {
    if (selectedVlc) {
      savedSnapshot.current = {}; // reset so new VLC always allows saving
      fetchSettings();
      fetchReportSettings();
      checkPassword();
      const savedSearch = localStorage.getItem(`cc_search_type_${selectedVlc}`);
      const savedAnalysis = localStorage.getItem(`cc_analysis_type_${selectedVlc}`);
      setCcSearchType(savedSearch ? parseInt(savedSearch) : 0);
      setCcAnalysisType(savedAnalysis ? parseInt(savedAnalysis) : 0);
    }
  }, [selectedVlc]);

  const fetchSettings = async () => {
    try {
      const { data } = await settingsApi.get(selectedVlc);
      if (data.success && data.data) {
        const s = data.data;
        setAddFarmer(s.add_farmer ?? 0);
        setRateChart(s.rate_chart ?? 0);
        setDeduction(s.deduction ?? 0);
        setPaymentReceipt(s.payment_receipt ?? 0);
        setGenerateBill(s.generate_bill ?? 0);
        setAnalyser(s.analyser ?? 0);
        setWeightTier(s.weight_tier ?? 0);
        setWeight(s.weight ?? 0);
        setPrinter(s.printer ?? 0);
        setLanguage(s.language || "English");
        setReportLanguage(s.report_language || "English");
        setShowWater(s.show_water ?? 0);
        setMultipleModal(s.multiple_modal ?? 0);
        setCc(s.cc ?? 0);
        // store fetched values as baseline
        savedSnapshot.current = {
          ...savedSnapshot.current,
          add_farmer: s.add_farmer ?? 0,
          rate_chart: s.rate_chart ?? 0,
          deduction: s.deduction ?? 0,
          payment_receipt: s.payment_receipt ?? 0,
          generate_bill: s.generate_bill ?? 0,
          analyser: s.analyser ?? 0,
          weight_tier: s.weight_tier ?? 0,
          weight: s.weight ?? 0,
          printer: s.printer ?? 0,
          language: s.language || "English",
          report_language: s.report_language || "English",
          show_water: s.show_water ?? 0,
          multiple_modal: s.multiple_modal ?? 0,
          cc: s.cc ?? 0,
        };
      }
    } catch { toast.error(t("failed_to_fetch_settings", "Failed to fetch settings")); }
  };

  const fetchReportSettings = async () => {
    try {
      const { data } = await settingsApi.getReportSettings(selectedVlc);
      if (data.success && data.data) {
        const s = data.data;
        setShowShiftReport(s.show_shift_report ?? 0);
        setShowTotalCollection(s.show_total_collection ?? 0);
        setShowPaymentSummary(s.show_payment_summary ?? 0);
        setShowReportRateChart(s.show_rate_chart ?? 0);
        setShowFarmerBill(s.show_farmer_bill ?? 0);
        setShowFarmerList(s.show_farmer_list ?? 0);
        setShowDifferenceReport(s.show_difference_report ?? 0);
        setShowBonusDeduction(s.show_bonus_deduction ?? 0);
        setShowCollectionHistory(s.show_collection_history ?? 0);
        setShowCattleFeed(s.show_cattle_feed ?? 0);
        // store fetched report values as baseline
        savedSnapshot.current = {
          ...savedSnapshot.current,
          show_shift_report: s.show_shift_report ?? 0,
          show_total_collection: s.show_total_collection ?? 0,
          show_payment_summary: s.show_payment_summary ?? 0,
          show_rate_chart: s.show_rate_chart ?? 0,
          show_farmer_bill: s.show_farmer_bill ?? 0,
          show_farmer_list: s.show_farmer_list ?? 0,
          show_difference_report: s.show_difference_report ?? 0,
          show_bonus_deduction: s.show_bonus_deduction ?? 0,
          show_collection_history: s.show_collection_history ?? 0,
          show_cattle_feed: s.show_cattle_feed ?? 0,
          cc_search_type: parseInt(localStorage.getItem(`cc_search_type_${selectedVlc}`) ?? "0"),
          cc_analysis_type: parseInt(localStorage.getItem(`cc_analysis_type_${selectedVlc}`) ?? "0"),
          cattle_feed_lump_sum: parseInt(localStorage.getItem("cattleFeedLumpSum") ?? "0"),
        };
      }
    } catch { console.error("Failed to fetch report settings"); }
  };

  const checkPassword = async () => {
    try {
      const result = await passwordApiService.checkPassword(selectedVlc);
      if (result.success) { setHasPassword(result.hasPassword); setPassword(""); }
    } catch { console.error("Failed to check password"); }
  };

  const handlePasswordSave = async () => {
    if (!selectedVlc) { toast.error(t("please_select_vlc", "Please select a VLC")); return; }
    if (!password.trim()) { toast.error(t("please_enter_a_password", "Please enter a password")); return; }
    try {
      const result = hasPassword
        ? await passwordApiService.updatePassword(selectedVlc, password)
        : await passwordApiService.createPassword(selectedVlc, password);
      if (result.success) {
        toast.success(result.message || `Password ${hasPassword ? "updated" : "created"} successfully`);
        setHasPassword(true); setPassword("");
      } else { toast.error(result.message || t("failed_to_save_password", "Failed to save password")); }
    } catch { toast.error(t("failed_to_save_password", "Failed to save password")); }
  };

  // Build a snapshot object from current state for comparison
  const buildCurrentSnapshot = () => ({
    add_farmer: addFarmer,
    rate_chart: rateChart,
    deduction,
    payment_receipt: paymentReceipt,
    generate_bill: generateBill,
    analyser,
    weight_tier: weightTier,
    weight,
    printer,
    language,
    report_language: reportLanguage,
    show_water: showWater,
    multiple_modal: multipleModal,
    cc,
    show_shift_report: showShiftReport,
    show_total_collection: showTotalCollection,
    show_payment_summary: showPaymentSummary,
    show_rate_chart: showReportRateChart,
    show_farmer_bill: showFarmerBill,
    show_farmer_list: showFarmerList,
    show_difference_report: showDifferenceReport,
    show_bonus_deduction: showBonusDeduction,
    show_collection_history: showCollectionHistory,
    show_cattle_feed: showCattleFeed,
    cc_search_type: ccSearchType,
    cc_analysis_type: ccAnalysisType,
    cattle_feed_lump_sum: cattleFeedLumpSum,
  });

  // True only when current values differ from last-saved snapshot
  const hasChanges = Object.keys(savedSnapshot.current).length > 0 &&
    Object.entries(buildCurrentSnapshot()).some(
      ([k, v]) => savedSnapshot.current[k] !== v
    );

  const handleSave = async () => {
    if (!selectedVlc) { toast.error(t("please_select_vlc", "Please select a VLC")); return; }
    if (!hasChanges) { toast.info(t("no_changes_made", "No changes made. Please modify settings before saving.")); return; }
    try {
      const { data } = await settingsApi.update({
        vlc: selectedVlc, add_farmer: addFarmer, rate_chart: rateChart,
        deduction, payment_receipt: paymentReceipt, generate_bill: generateBill,
        analyser, weight_tier: weightTier, weight, printer, language,
        report_language: reportLanguage, show_water: showWater,
      });
      if (data.success) toast.success(t("settings_updated_successfully", "Settings updated successfully"));
      await settingsApi.updateReportSettings({
        vlc: selectedVlc, show_shift_report: showShiftReport,
        show_total_collection: showTotalCollection, show_payment_summary: showPaymentSummary,
        show_rate_chart: showReportRateChart, show_farmer_bill: showFarmerBill,
        show_farmer_list: showFarmerList, show_difference_report: showDifferenceReport,
        show_bonus_deduction: showBonusDeduction, show_collection_history: showCollectionHistory,
        show_cattle_feed: showCattleFeed,
      });
      localStorage.setItem(`cc_search_type_${selectedVlc}`, ccSearchType.toString());
      localStorage.setItem(`cc_analysis_type_${selectedVlc}`, ccAnalysisType.toString());
      // Update snapshot to new saved state so button resets
      savedSnapshot.current = buildCurrentSnapshot();
    } catch { toast.error(t("failed_to_update_settings", "Failed to update settings")); }
  };

  const handleShowWaterChange = (checked: boolean) => {
    if (!selectedVlc) { toast.error(t("please_select_vlc_first", "Please select a VLC first")); return; }
    setShowWater(checked ? 1 : 0);
  };


  return (
    <div className="min-h-screen bg-slate-50 font-sans text-left">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
            <Settings2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">{t("general_settings", "General Settings")}</h1>
            <p className="text-xs text-gray-500 leading-tight">{t("language_modules_reports_security", "Language · Modules · Reports · Security")}</p>
          </div>
        </div>
        <Button
          onClick={handleSave} size="sm"
          className={cn(
            "text-white text-sm px-4 py-2 h-auto flex items-center gap-2 shadow-sm rounded-lg transition-all",
            hasChanges
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-300 hover:bg-gray-300 cursor-not-allowed opacity-60"
          )}
        >
          <Save className="h-4 w-4" />
          {hasChanges ? t("save_changes", "Save Changes") : t("no_changes", "No Changes")}
        </Button>
      </div>

      <div className="w-full p-3 space-y-3">

        {/* Row 1: Language + VLC + System Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Language */}
          <SectionCard>
            <SectionHeader icon={Languages} title={t("language_preferences", "Language Preferences")} />
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("app_language", "App Language")}</p>
                <RadioGroup
                  value={language.toLowerCase()}
                  onValueChange={(val) => setLanguage(val.charAt(0).toUpperCase() + val.slice(1))}
                  className="grid grid-cols-2 gap-2"
                >
                  {["english", "hindi", "marathi", "kannada"].map((lang) => (
                    <label
                      key={lang} htmlFor={`lang-${lang}`}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm font-medium capitalize",
                        language.toLowerCase() === lang
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-gray-100 text-gray-600 hover:border-gray-200 bg-white"
                      )}
                    >
                      <RadioGroupItem value={lang} id={`lang-${lang}`} className="w-4 h-4 border-gray-300" />
                      {lang}
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("report_language", "Report Language")}</p>
                <RadioGroup
                  value={reportLanguage.toLowerCase()}
                  onValueChange={(val) => setReportLanguage(val.charAt(0).toUpperCase() + val.slice(1))}
                  className="grid grid-cols-2 gap-2"
                >
                  {["english", "hindi", "marathi", "kannada"].map((lang) => (
                    <label
                      key={lang} htmlFor={`report-lang-${lang}`}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm font-medium capitalize",
                        reportLanguage.toLowerCase() === lang
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-gray-100 text-gray-600 hover:border-gray-200 bg-white"
                      )}
                    >
                      <RadioGroupItem value={lang} id={`report-lang-${lang}`} className="w-4 h-4 border-gray-300" />
                      {lang}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </SectionCard>

          <div className="space-y-3">
            {/* VLC Selector — searchable combobox (no-animation div-based) */}
            <SectionCard className="overflow-visible">
              <SectionHeader icon={Settings2} title={t("select_vlc", "Select VLC")} />
              <div className="p-4 overflow-visible">
                {(() => {
                  const selectedBranch = branches.find((b) => b.branch_id.toString() === selectedVlc);
                  const filtered = branches.filter((b) => {
                    const q = vlcSearch.toLowerCase();
                    return (
                      !q ||
                      b.username?.toLowerCase().includes(q) ||
                      b.name?.toLowerCase().includes(q) ||
                      b.branchName?.toLowerCase().includes(q)
                    );
                  });
                  return (
                    <div ref={vlcWrapperRef} className="relative">
                      {/* Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setVlcOpen((prev) => !prev);
                          if (!vlcOpen) setTimeout(() => vlcSearchRef.current?.focus(), 0);
                          else setVlcSearch("");
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 h-10 text-sm rounded-lg border bg-white transition-colors",
                          vlcOpen ? "border-blue-400 ring-1 ring-blue-100" : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <span className={selectedBranch ? "text-gray-800 font-medium truncate" : "text-gray-400"}>
                          {selectedBranch
                            ? `${selectedBranch.username} — ${selectedBranch.name}${selectedBranch.branchName ? ` — ${selectedBranch.branchName}` : ""}`
                            : t("choose_vlc_branch_settings", "Choose a VLC branch...")}
                        </span>
                        <ChevronDown
                          className={cn("h-4 w-4 text-gray-400 flex-shrink-0 ml-2 transition-transform duration-150", vlcOpen && "rotate-180")}
                        />
                      </button>

                      {/* Dropdown panel — plain div, no Radix animation */}
                      {vlcOpen && (
                        <div
                          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                          style={{ top: "100%", left: 0 }}
                        >
                          {/* Search */}
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <input
                              ref={vlcSearchRef}
                              value={vlcSearch}
                              onChange={(e) => setVlcSearch(e.target.value)}
                              placeholder={t("search_vlc", "Search VLC...")}
                              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
                            />
                            {vlcSearch && (
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); setVlcSearch(""); vlcSearchRef.current?.focus(); }}
                                className="text-gray-400 hover:text-gray-600 text-sm leading-none"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          {/* Options */}
                          <div className="max-h-48 overflow-y-auto">
                            {filtered.length === 0 ? (
                              <div className="px-3 py-4 text-center text-sm text-gray-400">{t("no_branches_found", "No branches found")}</div>
                            ) : (
                              filtered.map((branch) => {
                                const val = branch.branch_id.toString();
                                const isSelected = val === selectedVlc;
                                return (
                                  <button
                                    key={branch.branch_id}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setSelectedVlc(val);
                                      setVlcOpen(false);
                                      setVlcSearch("");
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between px-3 py-2.5 text-sm text-left",
                                      isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                                    )}
                                  >
                                    <span className="truncate">
                                      <span className="font-semibold">{branch.username}</span>
                                      {" — "}{branch.name}
                                      {branch.branchName ? ` — ${branch.branchName}` : ""}
                                    </span>
                                    {isSelected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {!selectedVlc && (
                  <p className="text-xs text-amber-500 mt-2 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {t("select_vlc_to_load", "Select a VLC to load and save settings")}
                  </p>
                )}
              </div>
            </SectionCard>

            {/* System Toggles */}
            <SectionCard>
              <SectionHeader icon={ToggleLeft} title={t("system_toggles", "System Toggles")}>
                <SelectAllBox allOn={allSwitchesOn} someOn={someSwitchesOn} onToggle={handleSelectAllSwitches} />
              </SectionHeader>
              <div className="p-4 grid grid-cols-1 gap-2.5">
                <SwitchRow icon={BarChart3} label={t("analyser", "Analyser")} checked={analyser === 1} onChange={(c) => setAnalyser(c ? 1 : 0)} />
                <SwitchRow icon={Layers} label={t("weight_tier", "Weight Tier")} checked={weightTier === 1} onChange={(c) => setWeightTier(c ? 1 : 0)} />
                <SwitchRow icon={MessageCircle} label={t("cc", "CC")} checked={cc === 1} onChange={(c) => setCc(c ? 1 : 0)} />
                <SwitchRow icon={Scale} label={t("weight", "Weight")} checked={weight === 1} onChange={(c) => setWeight(c ? 1 : 0)} />
                <SwitchRow icon={Printer} label={t("printer", "Printer")} checked={printer === 1} onChange={(c) => setPrinter(c ? 1 : 0)} />
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Row 2: Features + Reports */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Feature Management */}
          <SectionCard>
            <SectionHeader icon={Settings2} title={t("feature_management", "Feature Management")}>
              <SelectAllBox allOn={allFeaturesOn} someOn={someFeaturesOn} onToggle={handleSelectAllFeatures} />
            </SectionHeader>
            <div className="p-4 grid grid-cols-1 gap-2.5">
              <FeatureRow id="feat-add-farmer" icon={UserPlus} label={t("add_farmer", "Add Farmer")} checked={addFarmer === 1} onChange={(c) => setAddFarmer(c ? 1 : 0)} />
              <FeatureRow id="feat-rate-chart" icon={TrendingUp} label={t("rate_chart", "Rate Chart")} checked={rateChart === 1} onChange={(c) => setRateChart(c ? 1 : 0)} />
              <FeatureRow id="feat-deduction" icon={Minus} label={t("deduction", "Deduction")} checked={deduction === 1} onChange={(c) => setDeduction(c ? 1 : 0)} />
              <FeatureRow id="feat-payment" icon={CreditCard} label={t("payment_receipt", "Payment & Receipt")} checked={paymentReceipt === 1} onChange={(c) => setPaymentReceipt(c ? 1 : 0)} />
              <FeatureRow id="feat-bill" icon={FileText} label={t("generate_bill", "Generate Bill")} checked={generateBill === 1} onChange={(c) => setGenerateBill(c ? 1 : 0)} />
            </div>
          </SectionCard>

          {/* Report Visibility */}
          <SectionCard>
            <SectionHeader icon={FileText} title={t("report_visibility", "Report Visibility")}>
              <SelectAllBox allOn={allReportsOn} someOn={someReportsOn} onToggle={handleSelectAllReports} />
            </SectionHeader>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              <SwitchRow icon={ClipboardList} label={t("shift_report", "Shift Report")} checked={showShiftReport === 1} onChange={(c) => setShowShiftReport(c ? 1 : 0)} />
              <SwitchRow icon={BarChart3} label={t("total_collection", "Total Collection")} checked={showTotalCollection === 1} onChange={(c) => setShowTotalCollection(c ? 1 : 0)} />
              <SwitchRow icon={PieChart} label={t("payment_summary", "Payment Summary")} checked={showPaymentSummary === 1} onChange={(c) => setShowPaymentSummary(c ? 1 : 0)} />
              <SwitchRow icon={ListOrdered} label={t("rate_chart", "Rate Chart")} checked={showReportRateChart === 1} onChange={(c) => setShowReportRateChart(c ? 1 : 0)} />
              <SwitchRow icon={FileText} label={t("farmer_bill", "Farmer Bill")} checked={showFarmerBill === 1} onChange={(c) => setShowFarmerBill(c ? 1 : 0)} />
              <SwitchRow icon={Users} label={t("farmer_list", "Farmer List")} checked={showFarmerList === 1} onChange={(c) => setShowFarmerList(c ? 1 : 0)} />
              <SwitchRow icon={Diff} label={t("difference_report", "Difference Report")} checked={showDifferenceReport === 1} onChange={(c) => setShowDifferenceReport(c ? 1 : 0)} />
              <SwitchRow icon={Minus} label={t("bonus_deduction", "Bonus Deduction")} checked={showBonusDeduction === 1} onChange={(c) => setShowBonusDeduction(c ? 1 : 0)} />
              <SwitchRow icon={History} label={t("collection_history", "Collection History")} checked={showCollectionHistory === 1} onChange={(c) => setShowCollectionHistory(c ? 1 : 0)} />
              <SwitchRow icon={Package} label={t("cattle_feed", "Cattle Feed")} checked={showCattleFeed === 1} onChange={(c) => setShowCattleFeed(c ? 1 : 0)} />
            </div>
          </SectionCard>
        </div>

        {/* Row 3: Password + Other + CC */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Password */}
          <SectionCard>
            <SectionHeader icon={Lock} title={t("password_management", "Password Management")} />
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">
                {hasPassword ? t("update_existing_settings_password", "Update the existing settings password.") : t("create_password_to_protect", "Create a password to protect settings.")}
              </p>
              <div className="flex gap-2">
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("enter_password_placeholder", "Enter password")}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <Button onClick={handlePasswordSave} size="sm"
                  className="px-4 py-2 h-auto text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  {hasPassword ? t("update", "Update") : t("create", "Create")}
                </Button>
              </div>
              {hasPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                  {t("password_currently_set", "Password is currently set")}
                </p>
              )}
            </div>
          </SectionCard>

          {/* Other Settings */}
          <SectionCard>
            <SectionHeader icon={Settings2} title={t("other_settings", "Other Settings")} />
            <div className="p-4 grid grid-cols-1 gap-2.5">
              <SwitchRow icon={Scale} label={t("show_water", "Show Water")} checked={showWater === 1} onChange={handleShowWaterChange} />
              <SwitchRow
                icon={Package} label={t("cattle_feed_lump_sum", "Cattle Feed Lump Sum")}
                checked={cattleFeedLumpSum === 1}
                onChange={(c) => { const v = c ? 1 : 0; setCattleFeedLumpSum(v); localStorage.setItem("cattleFeedLumpSum", v.toString()); }}
              />
              <SwitchRow icon={Layers} label={t("multiple_modal", "Multiple Modal")} checked={multipleModal === 1} onChange={(c) => setMultipleModal(c ? 1 : 0)} />
            </div>
          </SectionCard>

          {/* CC Collection Settings */}
          <SectionCard>
            <SectionHeader icon={Layers} title={t("cc_collection", "CC Collection")} />
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("search_preference", "Search Preference")}</p>
                <SegmentControl
                  value={ccSearchType} onChange={setCcSearchType}
                  options={[{ label: t("farmer_id", "Farmer ID"), val: 0 }, { label: t("sample_id", "Sample ID"), val: 1 }]}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("analysis_mode", "Analysis Mode")}</p>
                <SegmentControl
                  value={ccAnalysisType} onChange={setCcAnalysisType}
                  options={[{ label: t("fat_snf", "FAT / SNF"), val: 0 }, { label: t("fat_clr", "FAT / CLR"), val: 1 }]}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  );
};

export default GeneralSettings;
