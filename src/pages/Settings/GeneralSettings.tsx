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
  Building2,
  Wallet,
} from "lucide-react";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { ALL_ROUTES, useRouteFilter } from "@/hooks/useRouteFilter";
import RouteSelect from "@/components/RouteSelect";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { settingsApi, type PageSettings, type PageSettingsForVlc } from "@/services/settingsApi";
import { webUserApi } from "@/services/webUserApi";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import SettingsLockGate from "@/components/SettingsLockGate";
import { SectionCard, SectionHeader } from "./SettingsSection";
import SessionsCard from "./SessionsCard";

// ─── Module-level sub-components (must be outside GeneralSettings to keep
//     stable references across re-renders — prevents input focus loss) ─────────
// SectionCard / SectionHeader live in ./SettingsSection, shared with SessionsCard.

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

// The page's fields, as the API names them. Settings and report settings go to
// /web/settings/apply (advance_limit_percent too, but as a number or null); the CC
// preferences live in localStorage per VLC.
const SETTINGS_FIELDS = [
  "add_farmer", "rate_chart", "deduction", "payment_receipt", "generate_bill",
  "analyser", "weight_tier", "weight", "printer", "cc", "show_water", "multiple_modal",
  "language", "report_language",
];
const REPORT_FIELDS = [
  "show_shift_report", "show_total_collection", "show_payment_summary", "show_rate_chart",
  "show_farmer_bill", "show_farmer_list", "show_difference_report", "show_bonus_deduction",
  "show_collection_history", "show_cattle_feed",
];
const CC_PREF_FIELDS = ["cc_search_type", "cc_analysis_type"];
const FEATURE_FIELDS = ["add_farmer", "rate_chart", "deduction", "payment_receipt", "generate_bill"];
const SWITCH_FIELDS = ["analyser", "weight_tier", "cc", "weight", "printer"];

// Names for the multi-VLC confirm dialog: [translation key, English fallback].
const FIELD_LABELS: Record<string, [string, string]> = {
  add_farmer: ["add_farmer", "Add Farmer"],
  rate_chart: ["rate_chart", "Rate Chart"],
  deduction: ["deduction", "Deduction"],
  payment_receipt: ["payment_receipt", "Payment & Receipt"],
  generate_bill: ["generate_bill", "Generate Bill"],
  analyser: ["analyser", "Analyser"],
  weight_tier: ["weight_tier", "Weight Tier"],
  cc: ["cc", "CC"],
  weight: ["weight", "Weight"],
  printer: ["printer", "Printer"],
  show_water: ["show_water", "Show Water"],
  multiple_modal: ["multiple_modal", "Multiple Modal"],
  language: ["app_language", "App Language"],
  report_language: ["report_language", "Report Language"],
  advance_limit_percent: ["advance_limit", "Advance Limit"],
  show_shift_report: ["shift_report", "Shift Report"],
  show_total_collection: ["total_collection", "Total Collection"],
  show_payment_summary: ["payment_summary", "Payment Summary"],
  show_rate_chart: ["rate_chart", "Rate Chart"],
  show_farmer_bill: ["farmer_bill", "Farmer Bill"],
  show_farmer_list: ["farmer_list", "Farmer List"],
  show_difference_report: ["difference_report", "Difference Report"],
  show_bonus_deduction: ["bonus_deduction", "Bonus Deduction"],
  show_collection_history: ["collection_history", "Collection History"],
  show_cattle_feed: ["cattle_feed", "Cattle Feed"],
  cc_search_type: ["search_preference", "Search Preference"],
  cc_analysis_type: ["analysis_mode", "Analysis Mode"],
};

// Marks a setting whose value differs between the selected VLCs.
const VariesBadge = ({ show }: { show?: boolean }) =>
  show ? (
    <span
      className="ml-1.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700"
      title="Differs between the selected VLCs — each keeps its own value unless you change this setting"
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

// Company name / address printed at the top of farmer bills (Format 6). One profile
// for the whole account, so it saves on its own rather than with the VLC settings.
const CompanyProfileCard = () => {
  const { t } = useTranslation();
  const userData = useAppSelector((state) => state.authData.userData);
  const userId = Number(userData?.id);
  const isAdmin = userData?.is_admin === true || userData?.is_admin === 1;
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState({ name: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    webUserApi.getCompanyProfile(userId)
      .then(({ data }) => {
        if (!active) return;
        const next = { name: data?.company_name || "", address: data?.company_address || "" };
        setName(next.name);
        setAddress(next.address);
        setSaved(next);
      })
      .catch((error) => console.error("Error fetching company profile:", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const dirty = name.trim() !== saved.name || address.trim() !== saved.address;

  const handleSave = async () => {
    const next = { name: name.trim(), address: address.trim() };
    setSaving(true);
    try {
      const res = await webUserApi.updateCompanyProfile(userId, { company_name: next.name, company_address: next.address });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setSaved(next);
      toast.success(t("company_profile_saved", "Company profile saved"));
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || t("oops_something_went_wrong"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard>
      <SectionHeader icon={Building2} title={t("company_profile", "Company Profile")}>
        {isAdmin && (
          <Button
            size="sm" onClick={handleSave} disabled={!dirty || saving || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs gap-1.5 rounded-lg disabled:bg-gray-300 disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? t("saving", "Saving...") : t("save", "Save")}
          </Button>
        )}
      </SectionHeader>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="company-name" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("company_name", "Company Name")}
          </label>
          <Input
            id="company-name" value={name} maxLength={150} disabled={!isAdmin || loading}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("company_name_placeholder", "e.g. Bansi Dairy Foods")}
            className="bg-gray-50 border-gray-200 h-10"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="company-address" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("company_address", "Company Address")}
          </label>
          <Textarea
            id="company-address" value={address} maxLength={500} rows={2} disabled={!isAdmin || loading}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("company_address_placeholder", "Address printed under the company name")}
            className="bg-gray-50 border-gray-200 min-h-10 resize-y"
          />
        </div>
        <p className="md:col-span-2 text-xs text-gray-500">
          {t("company_profile_hint", "Printed at the top of farmer bills (Format 6) for every VLC.")}
          {!isAdmin && ` ${t("company_profile_admin_only", "Only the admin can change it.")}`}
        </p>
      </div>
    </SectionCard>
  );
};

const GeneralSettings = () => {
  const { t } = useTranslation();
  const branches = useAppSelector((state) => state.branch.branches);
  // One or more VLCs; one set of settings is shown and saved for all of them.
  const [selectedVlcs, setSelectedVlcs] = useState<string[]>([]);
  // Picking a route ticks all its VLCs (and lists only those); "All Routes" keeps the ticks.
  const { routes, routeId, setRouteId, branchesOf, routeBranches } = useRouteFilter();
  const handleRouteChange = (id: string) => {
    setRouteId(id);
    if (id !== ALL_ROUTES) setSelectedVlcs(branchesOf(id).map((b) => String(b.branch_id)));
  };
  // In dairy-list order, so "the first selected VLC" does not depend on click order.
  const orderedVlcs = branches.map((b) => String(b.branch_id)).filter((id) => selectedVlcs.includes(id));
  const selectionKey = orderedVlcs.join(",");
  const primaryVlc = orderedVlcs[0] ?? "";
  const primaryBranch = branches.find((b) => String(b.branch_id) === primaryVlc);
  const isMulti = orderedVlcs.length > 1;

  // Settings whose values differ between the selected VLCs (API field names).
  const [varies, setVaries] = useState<Set<string>>(new Set());
  // Settings the user has edited since the selection loaded. Only edited settings are
  // saved; a "Varies" setting left alone keeps each VLC's own value.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (...keys: string[]) =>
    setTouched((prev) => {
      if (keys.every((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });
  // Once edited, a setting gets the value shown in every selected VLC, so it no longer varies.
  const isVaries = (key: string) => isMulti && varies.has(key) && !touched.has(key);
  const variesLeft = [...varies].filter((k) => !touched.has(k)).length;
  // onChange for a 0/1 setting: records the edit, then sets the value.
  const flag = (key: string, set: (v: number) => void) => (checked: boolean) => {
    touch(key);
    set(checked ? 1 : 0);
  };
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
  // Advance limit % as typed; "" = no limit.
  const [advanceLimit, setAdvanceLimit] = useState("");
  const limitText = (v: unknown) => (v === null || v === undefined || String(v).trim() === "" ? "" : String(Number(v)));

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
    touch(...FEATURE_FIELDS);
    const val = checked ? 1 : 0;
    setAddFarmer(val); setRateChart(val); setDeduction(val);
    setPaymentReceipt(val); setGenerateBill(val);
  };

  const handleSelectAllSwitches = (checked: boolean) => {
    touch(...SWITCH_FIELDS);
    const val = checked ? 1 : 0;
    setAnalyser(val); setWeightTier(val); setCc(val);
    setWeight(val); setPrinter(val);
  };

  const handleSelectAllReports = (checked: boolean) => {
    touch(...REPORT_FIELDS);
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
    setAdvanceLimit(limitText(s.advance_limit_percent));
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
    setTouched(new Set());
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
        advance_limit_percent: limitText(entry.settings.advance_limit_percent),
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
  const buildCurrentSnapshot = (): Record<string, unknown> => ({
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
    advance_limit_percent: limitText(advanceLimit),
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

  // The settings a save writes: those whose value differs from what was loaded,
  // plus any "Varies" setting the user set by hand (even back to the value shown).
  // Every other setting is left as each selected VLC already has it.
  const current = buildCurrentSnapshot();
  const changedKeys = Object.keys(savedSnapshot.current).length === 0
    ? []
    : Object.keys(current).filter((k) =>
        current[k] !== savedSnapshot.current[k] || (varies.has(k) && touched.has(k)));
  const hasChanges = changedKeys.length > 0;

  // How a changed setting reads in the confirm dialog, e.g. "Multiple Modal: ON".
  const describeChange = (key: string) => {
    const [labelKey, fallback] = FIELD_LABELS[key] ?? [key, key];
    const name = REPORT_FIELDS.includes(key)
      ? `${t("report_visibility", "Report Visibility")} – ${t(labelKey, fallback)}`
      : t(labelKey, fallback);
    const v = current[key];
    const value =
      key === "advance_limit_percent" ? (v === "" ? t("no_limit", "No limit") : `${v}%`)
      : key === "cc_search_type" ? (v === 1 ? t("sample_id", "Sample ID") : t("farmer_id", "Farmer ID"))
      : key === "cc_analysis_type" ? (v === 1 ? t("fat_clr", "FAT / CLR") : t("fat_snf", "FAT / SNF"))
      : typeof v === "number" ? (v === 1 ? "ON" : "OFF")
      : String(v);
    return `• ${name}: ${value}`;
  };

  // Writes only the changed settings, the same value to every selected VLC.
  // Goes through /web/settings/apply, which writes only the fields it is sent —
  // everything else (other page settings, device, SMS, templates) stays as it is.
  const handleSave = async () => {
    if (!orderedVlcs.length) { toast.error(t("please_select_vlc", "Please select a VLC")); return; }
    if (!hasChanges) { toast.info(t("no_changes_made", "No changes made. Please modify settings before saving.")); return; }
    const changed = new Set(changedKeys);
    const limitPercent = advanceLimit.trim() === "" ? null : Number(advanceLimit);
    if (changed.has("advance_limit_percent") && limitPercent !== null &&
        (!Number.isFinite(limitPercent) || limitPercent < 1 || limitPercent > 100)) {
      toast.error(t("advance_limit_invalid", "Advance limit must be a % from 1 to 100, or empty for no limit."));
      return;
    }

    const pick = (fields: string[]) =>
      Object.fromEntries(fields.filter((f) => changed.has(f)).map((f) => [f, current[f]]));
    const settings: Record<string, unknown> = pick(SETTINGS_FIELDS);
    if (changed.has("advance_limit_percent")) settings.advance_limit_percent = limitPercent;
    const reportSettings = pick(REPORT_FIELDS);
    const ccPrefs = CC_PREF_FIELDS.filter((f) => changed.has(f));
    const apiFields = [...Object.keys(settings), ...Object.keys(reportSettings)];
    // Per-VLC changes; cattle_feed_lump_sum is browser-wide and already saved on toggle.
    const vlcChanges = [...apiFields, ...ccPrefs];

    if (isMulti && vlcChanges.length && !window.confirm(t("apply_settings_confirm", {
      count: orderedVlcs.length,
      changes: vlcChanges.map(describeChange).join("\n"),
      defaultValue: "Change these settings on all {{count}} selected VLCs?\n\n{{changes}}\n\nEvery other setting stays as each VLC has it.",
      interpolation: { escapeValue: false },
    }))) return;

    setSaving(true);
    try {
      if (apiFields.length) {
        const { data } = await settingsApi.apply({
          vlcs: orderedVlcs,
          settings: settings as Partial<PageSettings>,
          report_settings: reportSettings,
        });
        if (!data.success) throw new Error(data.message);
      }
      orderedVlcs.forEach((vlc) =>
        ccPrefs.forEach((f) => localStorage.setItem(`${f}_${vlc}`, String(current[f]))));
      // The form still shows the first VLC as it now is: changed settings took the
      // values shown, the rest kept theirs. Only the changed ones are now the same everywhere.
      savedSnapshot.current = current;
      setVaries((prev) => {
        const next = new Set(prev);
        vlcChanges.forEach((k) => next.delete(k));
        return next;
      });
      setTouched(new Set());
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
    flag("show_water", setShowWater)(checked);
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

        <CompanyProfileCard />

        <SessionsCard />

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
                  onValueChange={(val) => { touch("language"); setLanguage(val.charAt(0).toUpperCase() + val.slice(1)); }}
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
                  onValueChange={(val) => { touch("report_language"); setReportLanguage(val.charAt(0).toUpperCase() + val.slice(1)); }}
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
                {routes.length > 0 && (
                  <RouteSelect routes={routes} value={routeId} onChange={handleRouteChange} className="rounded-xl" />
                )}
                <VLCDropdown
                  branches={routeBranches}
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
                      defaultValue: "Showing the settings of {{first}}. Saving applies only the settings you change to all {{count}} selected VLCs; the rest stay as each VLC has them.",
                      interpolation: { escapeValue: false },
                    })}
                  </p>
                )}
                {isMulti && variesLeft > 0 && (
                  <p className="text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {t("settings_varies_hint", {
                      count: variesLeft,
                      defaultValue: "{{count}} settings differ between these VLCs (marked Varies). Each VLC keeps its own value unless you change it.",
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
                <SwitchRow icon={BarChart3} label={t("analyser", "Analyser")} checked={analyser === 1} varies={isVaries("analyser")} onChange={flag("analyser", setAnalyser)} />
                <SwitchRow icon={Layers} label={t("weight_tier", "Weight Tier")} checked={weightTier === 1} varies={isVaries("weight_tier")} onChange={flag("weight_tier", setWeightTier)} />
                <SwitchRow icon={MessageCircle} label={t("cc", "CC")} checked={cc === 1} varies={isVaries("cc")} onChange={flag("cc", setCc)} />
                <SwitchRow icon={Scale} label={t("weight", "Weight")} checked={weight === 1} varies={isVaries("weight")} onChange={flag("weight", setWeight)} />
                <SwitchRow icon={Printer} label={t("printer", "Printer")} checked={printer === 1} varies={isVaries("printer")} onChange={flag("printer", setPrinter)} />
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
              <FeatureRow id="feat-add-farmer" icon={UserPlus} label={t("add_farmer", "Add Farmer")} checked={addFarmer === 1} varies={isVaries("add_farmer")} onChange={flag("add_farmer", setAddFarmer)} />
              <FeatureRow id="feat-rate-chart" icon={TrendingUp} label={t("rate_chart", "Rate Chart")} checked={rateChart === 1} varies={isVaries("rate_chart")} onChange={flag("rate_chart", setRateChart)} />
              <FeatureRow id="feat-deduction" icon={Minus} label={t("deduction", "Deduction")} checked={deduction === 1} varies={isVaries("deduction")} onChange={flag("deduction", setDeduction)} />
              <FeatureRow id="feat-payment" icon={CreditCard} label={t("payment_receipt", "Payment & Receipt")} checked={paymentReceipt === 1} varies={isVaries("payment_receipt")} onChange={flag("payment_receipt", setPaymentReceipt)} />
              <FeatureRow id="feat-bill" icon={FileText} label={t("generate_bill", "Generate Bill")} checked={generateBill === 1} varies={isVaries("generate_bill")} onChange={flag("generate_bill", setGenerateBill)} />
            </div>
            {/* Advance limit: enforced by the backend on every advance / cattle feed / Other1 / Other2 entry. */}
            <div className="px-4 pb-4">
              <div className={cn(
                "rounded-lg border px-3.5 py-3 space-y-2",
                advanceLimit.trim() !== "" ? "border-blue-200 bg-blue-50/40" : "border-gray-100"
              )}>
                <label htmlFor="advance-limit" className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
                  <Wallet className={cn("h-4 w-4 flex-shrink-0", advanceLimit.trim() !== "" ? "text-blue-500" : "text-gray-400")} />
                  {t("advance_limit", "Advance Limit")}
                  <VariesBadge show={isVaries("advance_limit_percent")} />
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="advance-limit" type="number" inputMode="decimal" min={1} max={100} step="any"
                    value={advanceLimit}
                    onChange={(e) => { touch("advance_limit_percent"); setAdvanceLimit(e.target.value); }}
                    placeholder={t("no_limit", "No limit")}
                    className="w-28 h-9 bg-white border-gray-200"
                  />
                  <span className="text-sm text-gray-600">{t("percent_of_milk_amount", "% of milk amount")}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {t(
                    "advance_limit_hint",
                    "Advance, cattle feed, Other1 and Other2 together can't go above this share of the farmer's milk amount since their last bill. Dues left on that bill count too; repayments free up room. Leave empty for no limit."
                  )}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Report Visibility */}
          <SectionCard>
            <SectionHeader icon={FileText} title={t("report_visibility", "Report Visibility")}>
              <SelectAllBox allOn={allReportsOn} someOn={someReportsOn} onToggle={handleSelectAllReports} />
            </SectionHeader>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              <SwitchRow icon={ClipboardList} label={t("shift_report", "Shift Report")} checked={showShiftReport === 1} varies={isVaries("show_shift_report")} onChange={flag("show_shift_report", setShowShiftReport)} />
              <SwitchRow icon={BarChart3} label={t("total_collection", "Total Collection")} checked={showTotalCollection === 1} varies={isVaries("show_total_collection")} onChange={flag("show_total_collection", setShowTotalCollection)} />
              <SwitchRow icon={PieChart} label={t("payment_summary", "Payment Summary")} checked={showPaymentSummary === 1} varies={isVaries("show_payment_summary")} onChange={flag("show_payment_summary", setShowPaymentSummary)} />
              <SwitchRow icon={ListOrdered} label={t("rate_chart", "Rate Chart")} checked={showReportRateChart === 1} varies={isVaries("show_rate_chart")} onChange={flag("show_rate_chart", setShowReportRateChart)} />
              <SwitchRow icon={FileText} label={t("farmer_bill", "Farmer Bill")} checked={showFarmerBill === 1} varies={isVaries("show_farmer_bill")} onChange={flag("show_farmer_bill", setShowFarmerBill)} />
              <SwitchRow icon={Users} label={t("farmer_list", "Farmer List")} checked={showFarmerList === 1} varies={isVaries("show_farmer_list")} onChange={flag("show_farmer_list", setShowFarmerList)} />
              <SwitchRow icon={Diff} label={t("difference_report", "Difference Report")} checked={showDifferenceReport === 1} varies={isVaries("show_difference_report")} onChange={flag("show_difference_report", setShowDifferenceReport)} />
              <SwitchRow icon={Minus} label={t("bonus_deduction", "Bonus Deduction")} checked={showBonusDeduction === 1} varies={isVaries("show_bonus_deduction")} onChange={flag("show_bonus_deduction", setShowBonusDeduction)} />
              <SwitchRow icon={History} label={t("collection_history", "Collection History")} checked={showCollectionHistory === 1} varies={isVaries("show_collection_history")} onChange={flag("show_collection_history", setShowCollectionHistory)} />
              <SwitchRow icon={Package} label={t("cattle_feed", "Cattle Feed")} checked={showCattleFeed === 1} varies={isVaries("show_cattle_feed")} onChange={flag("show_cattle_feed", setShowCattleFeed)} />
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
              <SwitchRow icon={Layers} label={t("multiple_modal", "Multiple Modal")} checked={multipleModal === 1} varies={isVaries("multiple_modal")} onChange={flag("multiple_modal", setMultipleModal)} />
            </div>
          </SectionCard>

          {/* CC Collection Settings */}
          <SectionCard>
            <SectionHeader icon={Layers} title={t("cc_collection", "CC Collection")} />
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center">{t("search_preference", "Search Preference")}<VariesBadge show={isVaries("cc_search_type")} /></p>
                <SegmentControl
                  value={ccSearchType} onChange={(v) => { touch("cc_search_type"); setCcSearchType(v); }}
                  options={[{ label: t("farmer_id", "Farmer ID"), val: 0 }, { label: t("sample_id", "Sample ID"), val: 1 }]}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center">{t("analysis_mode", "Analysis Mode")}<VariesBadge show={isVaries("cc_analysis_type")} /></p>
                <SegmentControl
                  value={ccAnalysisType} onChange={(v) => { touch("cc_analysis_type"); setCcAnalysisType(v); }}
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

// Locked behind the super admin's settings password when one is set
const LockedGeneralSettings = () => (
  <SettingsLockGate>
    <GeneralSettings />
  </SettingsLockGate>
);

export default LockedGeneralSettings;
