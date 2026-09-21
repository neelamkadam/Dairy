import React, { useState, useEffect, useRef } from "react";
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
  AlertTriangle,
} from "lucide-react";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { settingsApi, type PageSettingsForVlc } from "@/services/settingsApi";
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

// Marks a setting whose value differs between the selected VLCs.
const VariesBadge = ({ show }: { show?: boolean }) =>
  show ? (
    <span
      className="ml-1.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700"
      title="Differs between the selected VLCs — saving applies the value shown to all"
    >
      Varies
    </span>
  ) : null;

const FeatureRow = ({
  id, icon: Icon, label, checked, onChange, varies,
}: { id: string; icon: React.ElementType; label: string; checked: boolean; onChange: (v: boolean) => void; varies?: boolean }) => (
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
    <VariesBadge show={varies} />
  </label>
);

const SwitchRow = ({
  icon: Icon, label, checked, onChange, varies,
}: { icon: React.ElementType; label: string; checked: boolean; onChange: (v: boolean) => void; varies?: boolean }) => (
  <div className={cn(
    "flex items-center justify-between px-3.5 py-2.5 rounded-lg border transition-all",
    checked ? "border-blue-200 bg-blue-50/40" : "border-gray-100 hover:border-gray-200"
  )}>
    <div className="flex items-center gap-2.5 min-w-0">
      <Icon className={cn("h-4 w-4 flex-shrink-0", checked ? "text-blue-500" : "text-gray-400")} />
      <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
      <VariesBadge show={varies} />
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
  // One or more VLCs; one set of settings is shown and saved for all of them.
  const [selectedVlcs, setSelectedVlcs] = useState<string[]>([]);
  // In dairy-list order, so "the first selected VLC" does not depend on click order.
  const orderedVlcs = branches.map((b) => String(b.branch_id)).filter((id) => selectedVlcs.includes(id));
  const selectionKey = orderedVlcs.join(",");
  const primaryVlc = orderedVlcs[0] ?? "";
  const primaryBranch = branches.find((b) => String(b.branch_id) === primaryVlc);
  const isMulti = orderedVlcs.length > 1;

  // Settings whose values differ between the selected VLCs (API field names).
  const [varies, setVaries] = useState<Set<string>>(new Set());
  const isVaries = (key: string) => isMulti && varies.has(key);
  // How many of the selected VLCs already have a settings password.
  const [passwordStatus, setPasswordStatus] = useState({ withPassword: 0, total: 0 });
  const [saving, setSaving] = useState(false);
  const loadRef = useRef(0);

  // Tracks the last-saved / last-fetched state for change detection
  const savedSnapshot = useRef<Record<string, unknown>>({});
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
  const hasPassword = passwordStatus.total > 0 && passwordStatus.withPassword === passwordStatus.total;
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

  // Values as the API names them, so settings from different VLCs can be compared.
  const readCcPrefs = (vlc: string) => ({
    cc_search_type: parseInt(localStorage.getItem(`cc_search_type_${vlc}`) ?? "0"),
    cc_analysis_type: parseInt(localStorage.getItem(`cc_analysis_type_${vlc}`) ?? "0"),
  });

  const fillForm = (entry: PageSettingsForVlc) => {
    const s = entry.settings;
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
    const r = entry.report_settings;
    setShowShiftReport(r.show_shift_report ?? 0);
    setShowTotalCollection(r.show_total_collection ?? 0);
    setShowPaymentSummary(r.show_payment_summary ?? 0);
    setShowReportRateChart(r.show_rate_chart ?? 0);
    setShowFarmerBill(r.show_farmer_bill ?? 0);
    setShowFarmerList(r.show_farmer_list ?? 0);
    setShowDifferenceReport(r.show_difference_report ?? 0);
    setShowBonusDeduction(r.show_bonus_deduction ?? 0);
    setShowCollectionHistory(r.show_collection_history ?? 0);
    setShowCattleFeed(r.show_cattle_feed ?? 0);
    const cc = readCcPrefs(entry.vlc);
    setCcSearchType(cc.cc_search_type);
    setCcAnalysisType(cc.cc_analysis_type);
  };

  // Load the selection: the form shows the first VLC's settings; anything that
  // differs across the selected VLCs is marked "Varies".
  const loadSelection = async (vlcs: string[]) => {
    // A slow, older response can never overwrite a newer selection.
    const requestId = ++loadRef.current;
    savedSnapshot.current = {}; // reset so a new selection always allows saving
    setVaries(new Set());
    setPassword("");
    try {
      const { data } = await settingsApi.getMany(vlcs);
      if (requestId !== loadRef.current) return;
      if (!data.success || !data.data?.length) throw new Error("no settings");

      const list = data.data;
      const flatten = (entry: PageSettingsForVlc): Record<string, unknown> => ({
        ...entry.settings,
        language: entry.settings.language || "English",
        report_language: entry.settings.report_language || "English",
        ...entry.report_settings,
        ...readCcPrefs(entry.vlc),
      });
      const base = flatten(list[0]);
      const others = list.slice(1).map(flatten);
      setVaries(new Set(Object.keys(base).filter((key) => others.some((o) => o[key] !== base[key]))));
      setPasswordStatus({ withPassword: list.filter((e) => e.has_password).length, total: list.length });

      fillForm(list[0]);
      savedSnapshot.current = { ...base, cattle_feed_lump_sum: parseInt(localStorage.getItem("cattleFeedLumpSum") ?? "0") };
    } catch {
      if (requestId === loadRef.current) toast.error(t("failed_to_fetch_settings", "Failed to fetch settings"));
    }
  };

  useEffect(() => {
    if (orderedVlcs.length) loadSelection(orderedVlcs);
    else setPasswordStatus({ withPassword: 0, total: 0 });
  }, [selectionKey]);

  // One password for every selected VLC (the same as before for a single VLC).
  const handlePasswordSave = async () => {
    if (!orderedVlcs.length) { toast.error(t("please_select_vlc", "Please select a VLC")); return; }
    if (!password.trim()) { toast.error(t("please_enter_a_password", "Please enter a password")); return; }
    if (isMulti && !window.confirm(t("apply_password_confirm", {
      count: orderedVlcs.length,
      defaultValue: "Set this password on all {{count}} selected VLCs?",
    }))) return;
    try {
      const { data } = await settingsApi.apply({ vlcs: orderedVlcs, password });
      if (!data.success) throw new Error(data.message);
      toast.success(isMulti
        ? t("password_set_for_vlcs", { count: orderedVlcs.length, defaultValue: "Password set for {{count}} VLCs" })
        : hasPassword
          ? t("password_updated_successfully", "Password updated successfully")
          : t("password_created_successfully", "Password created successfully"));
      setPasswordStatus({ withPassword: orderedVlcs.length, total: orderedVlcs.length });
      setPassword("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_to_save_password", "Failed to save password"));
    }
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

  // True when current values differ from the last-saved snapshot — or, with
  // several VLCs, when they do not all have the same settings yet.
  const hasChanges = Object.keys(savedSnapshot.current).length > 0 && (
    (isMulti && varies.size > 0) ||
    Object.entries(buildCurrentSnapshot()).some(([k, v]) => savedSnapshot.current[k] !== v)
  );

  // Applies the whole set shown on the page to every selected VLC, replacing
  // their current values. Goes through /web/settings/apply, which writes only
  // these fields — device, SMS and template settings of each VLC stay as they are.
  const handleSave = async () => {
    if (!orderedVlcs.length) { toast.error(t("please_select_vlc", "Please select a VLC")); return; }
    if (!hasChanges) { toast.info(t("no_changes_made", "No changes made. Please modify settings before saving.")); return; }
    if (isMulti && !window.confirm(t("apply_settings_confirm", {
      count: orderedVlcs.length,
      defaultValue: "Apply these settings to all {{count}} selected VLCs? Their current settings will be replaced.",
    }))) return;

    setSaving(true);
    try {
      const { data } = await settingsApi.apply({
        vlcs: orderedVlcs,
        settings: {
          add_farmer: addFarmer, rate_chart: rateChart, deduction,
          payment_receipt: paymentReceipt, generate_bill: generateBill,
          analyser, weight_tier: weightTier, weight, printer, cc,
          show_water: showWater, multiple_modal: multipleModal,
          language, report_language: reportLanguage,
        },
        report_settings: {
          show_shift_report: showShiftReport, show_total_collection: showTotalCollection,
          show_payment_summary: showPaymentSummary, show_rate_chart: showReportRateChart,
          show_farmer_bill: showFarmerBill, show_farmer_list: showFarmerList,
          show_difference_report: showDifferenceReport, show_bonus_deduction: showBonusDeduction,
          show_collection_history: showCollectionHistory, show_cattle_feed: showCattleFeed,
        },
      });
      if (!data.success) throw new Error(data.message);
      orderedVlcs.forEach((vlc) => {
        localStorage.setItem(`cc_search_type_${vlc}`, ccSearchType.toString());
        localStorage.setItem(`cc_analysis_type_${vlc}`, ccAnalysisType.toString());
      });
      // Every selected VLC now has exactly these values.
      savedSnapshot.current = buildCurrentSnapshot();
      setVaries(new Set());
      toast.success(isMulti
        ? t("settings_applied_to_vlcs", { count: orderedVlcs.length, defaultValue: "Settings applied to {{count}} VLCs" })
        : t("settings_updated_successfully", "Settings updated successfully"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_to_update_settings", "Failed to update settings"));
    } finally {
      setSaving(false);
    }
  };

  const handleShowWaterChange = (checked: boolean) => {
    if (!orderedVlcs.length) { toast.error(t("please_select_vlc_first", "Please select a VLC first")); return; }
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
          onClick={handleSave} size="sm" disabled={saving}
          className={cn(
            "text-white text-sm px-4 py-2 h-auto flex items-center gap-2 shadow-sm rounded-lg transition-all",
            hasChanges
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-300 hover:bg-gray-300 cursor-not-allowed opacity-60"
          )}
        >
          <Save className="h-4 w-4" />
          {!hasChanges
            ? t("no_changes", "No Changes")
            : isMulti
              ? t("apply_to_vlcs", { count: orderedVlcs.length, defaultValue: "Apply to {{count}} VLCs" })
              : t("save_changes", "Save Changes")}
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
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center">{t("app_language", "App Language")}<VariesBadge show={isVaries("language")} /></p>
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
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center">{t("report_language", "Report Language")}<VariesBadge show={isVaries("report_language")} /></p>
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
              <div className="p-4 overflow-visible space-y-2">
                <VLCDropdown
                  branches={branches || []}
                  value={selectedVlcs}
                  onChange={(value: string[]) => setSelectedVlcs(value)}
                  valueKey="branch_id"
                  isMultiSelect
                  placeholder={t("choose_vlc_branch_settings", "Choose a VLC branch...")}
                />
                {!orderedVlcs.length && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {t("select_vlc_to_load", "Select a VLC to load and save settings")}
                  </p>
                )}
                {isMulti && (
                  <p className="text-xs text-blue-700">
                    {t("settings_multi_hint", {
                      count: orderedVlcs.length,
                      first: primaryBranch ? `${primaryBranch.username} — ${primaryBranch.name}` : primaryVlc,
                      defaultValue: "Showing the settings of {{first}}. Saving applies them to all {{count}} selected VLCs.",
                      interpolation: { escapeValue: false },
                    })}
                  </p>
                )}
                {isMulti && varies.size > 0 && (
                  <p className="text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {t("settings_varies_hint", {
                      count: varies.size,
                      defaultValue: "{{count}} settings differ between these VLCs (marked Varies). Saving makes them the same.",
                    })}
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
                <SwitchRow icon={BarChart3} label={t("analyser", "Analyser")} checked={analyser === 1} varies={isVaries("analyser")} onChange={(c) => setAnalyser(c ? 1 : 0)} />
                <SwitchRow icon={Layers} label={t("weight_tier", "Weight Tier")} checked={weightTier === 1} varies={isVaries("weight_tier")} onChange={(c) => setWeightTier(c ? 1 : 0)} />
                <SwitchRow icon={MessageCircle} label={t("cc", "CC")} checked={cc === 1} varies={isVaries("cc")} onChange={(c) => setCc(c ? 1 : 0)} />
                <SwitchRow icon={Scale} label={t("weight", "Weight")} checked={weight === 1} varies={isVaries("weight")} onChange={(c) => setWeight(c ? 1 : 0)} />
                <SwitchRow icon={Printer} label={t("printer", "Printer")} checked={printer === 1} varies={isVaries("printer")} onChange={(c) => setPrinter(c ? 1 : 0)} />
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
              <FeatureRow id="feat-add-farmer" icon={UserPlus} label={t("add_farmer", "Add Farmer")} checked={addFarmer === 1} varies={isVaries("add_farmer")} onChange={(c) => setAddFarmer(c ? 1 : 0)} />
              <FeatureRow id="feat-rate-chart" icon={TrendingUp} label={t("rate_chart", "Rate Chart")} checked={rateChart === 1} varies={isVaries("rate_chart")} onChange={(c) => setRateChart(c ? 1 : 0)} />
              <FeatureRow id="feat-deduction" icon={Minus} label={t("deduction", "Deduction")} checked={deduction === 1} varies={isVaries("deduction")} onChange={(c) => setDeduction(c ? 1 : 0)} />
              <FeatureRow id="feat-payment" icon={CreditCard} label={t("payment_receipt", "Payment & Receipt")} checked={paymentReceipt === 1} varies={isVaries("payment_receipt")} onChange={(c) => setPaymentReceipt(c ? 1 : 0)} />
              <FeatureRow id="feat-bill" icon={FileText} label={t("generate_bill", "Generate Bill")} checked={generateBill === 1} varies={isVaries("generate_bill")} onChange={(c) => setGenerateBill(c ? 1 : 0)} />
            </div>
          </SectionCard>

          {/* Report Visibility */}
          <SectionCard>
            <SectionHeader icon={FileText} title={t("report_visibility", "Report Visibility")}>
              <SelectAllBox allOn={allReportsOn} someOn={someReportsOn} onToggle={handleSelectAllReports} />
            </SectionHeader>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              <SwitchRow icon={ClipboardList} label={t("shift_report", "Shift Report")} checked={showShiftReport === 1} varies={isVaries("show_shift_report")} onChange={(c) => setShowShiftReport(c ? 1 : 0)} />
              <SwitchRow icon={BarChart3} label={t("total_collection", "Total Collection")} checked={showTotalCollection === 1} varies={isVaries("show_total_collection")} onChange={(c) => setShowTotalCollection(c ? 1 : 0)} />
              <SwitchRow icon={PieChart} label={t("payment_summary", "Payment Summary")} checked={showPaymentSummary === 1} varies={isVaries("show_payment_summary")} onChange={(c) => setShowPaymentSummary(c ? 1 : 0)} />
              <SwitchRow icon={ListOrdered} label={t("rate_chart", "Rate Chart")} checked={showReportRateChart === 1} varies={isVaries("show_rate_chart")} onChange={(c) => setShowReportRateChart(c ? 1 : 0)} />
              <SwitchRow icon={FileText} label={t("farmer_bill", "Farmer Bill")} checked={showFarmerBill === 1} varies={isVaries("show_farmer_bill")} onChange={(c) => setShowFarmerBill(c ? 1 : 0)} />
              <SwitchRow icon={Users} label={t("farmer_list", "Farmer List")} checked={showFarmerList === 1} varies={isVaries("show_farmer_list")} onChange={(c) => setShowFarmerList(c ? 1 : 0)} />
              <SwitchRow icon={Diff} label={t("difference_report", "Difference Report")} checked={showDifferenceReport === 1} varies={isVaries("show_difference_report")} onChange={(c) => setShowDifferenceReport(c ? 1 : 0)} />
              <SwitchRow icon={Minus} label={t("bonus_deduction", "Bonus Deduction")} checked={showBonusDeduction === 1} varies={isVaries("show_bonus_deduction")} onChange={(c) => setShowBonusDeduction(c ? 1 : 0)} />
              <SwitchRow icon={History} label={t("collection_history", "Collection History")} checked={showCollectionHistory === 1} varies={isVaries("show_collection_history")} onChange={(c) => setShowCollectionHistory(c ? 1 : 0)} />
              <SwitchRow icon={Package} label={t("cattle_feed", "Cattle Feed")} checked={showCattleFeed === 1} varies={isVaries("show_cattle_feed")} onChange={(c) => setShowCattleFeed(c ? 1 : 0)} />
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
                {isMulti
                  ? t("password_multi_hint", {
                      count: passwordStatus.total,
                      withPassword: passwordStatus.withPassword,
                      defaultValue: "Sets the same password on all {{count}} selected VLCs ({{withPassword}} already have one).",
                    })
                  : hasPassword
                    ? t("update_existing_settings_password", "Update the existing settings password.")
                    : t("create_password_to_protect", "Create a password to protect settings.")}
              </p>
              <div className="flex gap-2">
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("enter_password_placeholder", "Enter password")}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <Button onClick={handlePasswordSave} size="sm"
                  className="px-4 py-2 h-auto text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  {isMulti
                    ? t("set_for_vlcs", { count: orderedVlcs.length, defaultValue: "Set for {{count}}" })
                    : hasPassword ? t("update", "Update") : t("create", "Create")}
                </Button>
              </div>
              {hasPassword && !isMulti && (
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
              <SwitchRow icon={Scale} label={t("show_water", "Show Water")} checked={showWater === 1} varies={isVaries("show_water")} onChange={handleShowWaterChange} />
              <SwitchRow
                icon={Package} label={t("cattle_feed_lump_sum", "Cattle Feed Lump Sum")}
                checked={cattleFeedLumpSum === 1}
                onChange={(c) => { const v = c ? 1 : 0; setCattleFeedLumpSum(v); localStorage.setItem("cattleFeedLumpSum", v.toString()); }}
              />
              <SwitchRow icon={Layers} label={t("multiple_modal", "Multiple Modal")} checked={multipleModal === 1} varies={isVaries("multiple_modal")} onChange={(c) => setMultipleModal(c ? 1 : 0)} />
            </div>
          </SectionCard>

          {/* CC Collection Settings */}
          <SectionCard>
            <SectionHeader icon={Layers} title={t("cc_collection", "CC Collection")} />
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center">{t("search_preference", "Search Preference")}<VariesBadge show={isVaries("cc_search_type")} /></p>
                <SegmentControl
                  value={ccSearchType} onChange={setCcSearchType}
                  options={[{ label: t("farmer_id", "Farmer ID"), val: 0 }, { label: t("sample_id", "Sample ID"), val: 1 }]}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center">{t("analysis_mode", "Analysis Mode")}<VariesBadge show={isVaries("cc_analysis_type")} /></p>
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
