import { useEffect, useState } from "react";
import DairyBankFields, { EMPTY_DAIRY_BANK, validateDairyBank, type DairyBankValues } from "@/components/DairyBankFields";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-toastify";
import { createDairyApi } from "@/services/createDairyApi";
import { dairyEquipmentApi, DEFAULT_EQUIPMENT } from "@/services/dairyEquipmentApi";
import { exportDeliveredEquipmentPdf } from "@/utils/dairyEquipmentPdf";
import UserDairiesList from "./UserDairiesList";
import { ccApi, bmcApi, routeApi } from "@/services/routeBmcCcApi";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import { 
  Plus, 
  Phone, 
  Lock, 
  Building2, 
  User, 
  MapPin, 
  Map, 
  Factory, 
  Store,
  CalendarClock,
  CheckCircle2,
  Snowflake,
  Warehouse,
  Route as RouteIcon,
  ChevronUp,
  ChevronDown,
  Download,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE = "Dairyadmin";

type Step = 1 | 2 | 3;

const STEPS = [
  { id: 1, label: "Mobile Number" },
  { id: 2, label: "Dairy Details" },
];

const NONE = "none";

const CreateDairy = () => {
  const { t } = useTranslation();
  const authState = useAppSelector((state) => state.authData);
  const userId = authState?.userData?.id ? Number(authState.userData.id) : null;

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(true);

  const [mobileNumber, setMobileNumber] = useState("");

  // Hierarchy dropdown selections.
  const [ccSel, setCcSel] = useState<string>(NONE);
  const [bmcSel, setBmcSel] = useState<string>(NONE);
  const [routeSel, setRouteSel] = useState<string>(NONE);
  const [ccList, setCcList] = useState<any[]>([]);
  const [bmcList, setBmcList] = useState<any[]>([]);
  const [routeList, setRouteList] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    branchname: "",
    ownername: "",
    password: "",
    days: 10,
    villagename: "",
    address: "",
  });
  const [bank, setBank] = useState<DairyBankValues>(EMPTY_DAIRY_BANK);
  const [createdUser, setCreatedUser] = useState<any>(null);
  // Re-reads "My Dairies" once a dairy is created.
  const [dairiesRefreshKey, setDairiesRefreshKey] = useState(0);
  // dairy.id of the dairy just created — equipment is saved against it.
  const [createdDairyId, setCreatedDairyId] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savingEquipment, setSavingEquipment] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Equipment checklist, saved once the dairy exists.
  const [equipment, setEquipment] = useState<{ name: string; checked: boolean; quantity: string; serialNumber: string }[]>(
    DEFAULT_EQUIPMENT.map((name) => ({ name, checked: false, quantity: "", serialNumber: "" }))
  );
  const [newField, setNewField] = useState("");

  const toArray = (res: any) => {
    const raw = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  };

  // Load CC, BMC, Route lists for the hierarchy dropdowns.
  useEffect(() => {
    if (!userId) return;
    ccApi.list(userId).then((r) => setCcList(toArray(r))).catch(() => {});
    bmcApi.list(userId).then((r) => setBmcList(toArray(r))).catch(() => {});
    routeApi.list(userId).then((r) => setRouteList(toArray(r))).catch(() => {});
  }, [userId]);

  const toggleEquipment = (idx: number) =>
    setEquipment((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, checked: !e.checked } : e))
    );

  const updateEquipmentField = (idx: number, field: "quantity" | "serialNumber", value: string) =>
    setEquipment((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );

  const addEquipmentField = () => {
    const name = newField.trim();
    if (!name) {
      toast.error(t("enter_a_field_name", "Enter a field name"));
      return;
    }
    if (equipment.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t("this_field_already_exists", "This field already exists"));
      return;
    }
    setEquipment((prev) => [...prev, { name, checked: true, quantity: "", serialNumber: "" }]);
    setNewField("");
  };

  // Saves the checklist as the dairy's full equipment list, so going back to
  // "Edit Equipment" and submitting again updates rather than duplicates.
  const handleEquipmentSubmit = async () => {
    if (!createdDairyId) {
      toast.error(t(
        "equipment_dairy_id_missing",
        "Could not find the new dairy's ID — add its equipment from the Dairy Equipment page"
      ));
      return;
    }

    const selected = equipment.filter((e) => e.checked);
    const badQuantity = selected.find((e) => e.quantity && !/^[1-9]\d*$/.test(e.quantity.trim()));
    if (badQuantity) {
      toast.error(t("equipment_quantity_invalid", {
        name: badQuantity.name,
        defaultValue: "Quantity for {{name}} must be a whole number of at least 1",
      }));
      return;
    }

    setSavingEquipment(true);
    try {
      const res = await dairyEquipmentApi.replaceAll(
        createdDairyId,
        selected.map((e) => ({
          equipment_name: e.name,
          quantity: e.quantity.trim() ? Number(e.quantity) : 1,
          serial_number: e.serialNumber.trim() || null,
        })),
        authState?.userData?.name || authState?.userData?.email || "web"
      );
      if (res?.success === false) throw new Error(res?.message);
      toast.success(t("equipment_details_submitted", "Equipment details submitted"));
      setIsSubmitted(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || t("failed_to_save_equipment", "Failed to save equipment")
      );
    } finally {
      setSavingEquipment(false);
    }
  };

  // Delivery sheet for the equipment just submitted, to print and sign at handover.
  const handleExportPdf = async () => {
    const delivered = equipment.filter((e) => e.checked);
    if (delivered.length === 0) {
      toast.error(t("no_data_available", "No data available"));
      return;
    }
    setExportingPdf(true);
    try {
      await exportDeliveredEquipmentPdf(
        { username: createdUsername !== "-" ? createdUsername : null, name: form.name, branchName: form.branchname },
        delivered.map((e) => ({
          equipment_name: e.name,
          quantity: e.quantity.trim() || "1",
          serial_number: e.serialNumber.trim() || null,
        }))
      );
      toast.success(t("pdf_exported_successfully", "PDF exported successfully"));
    } catch (error) {
      console.error("Failed to export equipment PDF:", error);
      toast.error(t("failed_to_export_pdf", "Failed to export PDF"));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(t("copied_to_clipboard", "Copied to clipboard!")),
      (err) => console.error("Failed to copy: ", err)
    );
  };

  // Step 1 — validate mobile and proceed directly to form (no OTP).
  const handleContinue = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      toast.error(t("please_enter_valid_10_digit_mobile", "Please enter a valid 10-digit mobile number"));
      return;
    }
    setStep(2);
  };

  // Step 2 — create the dairy/branch.
  const handleCreateBranch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.branchname.trim() || !form.ownername.trim()) {
      toast.error(t("please_fill_dairy_branch_owner_name", "Please fill Dairy Name, Branch Name and Owner Name"));
      return;
    }
    if (form.password.length < 6) {
      toast.error(t("password_must_be_at_least_6_characters", "Password must be at least 6 characters"));
      return;
    }
    const bankError = validateDairyBank(bank);
    if (bankError) {
      toast.error(bankError);
      return;
    }
    const ccId = ccSel !== NONE ? Number(ccSel) : null;
    const bmcId = bmcSel !== NONE ? Number(bmcSel) : null;
    const routeId = routeSel !== NONE ? Number(routeSel) : null;

    setLoading(true);
    try {
      const data = await createDairyApi.createBranch(
        {
          name: form.name.trim(),
          branchname: form.branchname.trim(),
          ownername: form.ownername.trim(),
          mobile_number: mobileNumber.trim(),
          password: form.password,
          days: Number(form.days) || 10,
          villagename: form.villagename.trim(),
          address: form.address.trim(),
          role: ROLE,
          ...(ccId ? { cc_id: ccId } : {}),
          ...(bmcId ? { bmc_id: bmcId } : {}),
          ...(routeId ? { route_id: routeId } : {}),
          ...Object.fromEntries(
            Object.entries(bank).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)
          ),
        }
      );
      if (data.success === false) {
        toast.error(data.message || t("failed_to_create_dairy", "Failed to create dairy"));
        return;
      }
      toast.success(data.message || t("dairy_created_successfully", "Dairy created successfully"));
      setCreatedUser(data.userdata ?? data.data ?? data.user ?? data);
      setCreatedDairyId(Number(data.dairy_id) || null);
      setDairiesRefreshKey((key) => key + 1);
      setStep(3);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_to_create_dairy", "Failed to create dairy"));
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setMobileNumber("");
    setCcSel(NONE);
    setBmcSel(NONE);
    setRouteSel(NONE);
    setForm({
      name: "",
      branchname: "",
      ownername: "",
      password: "",
      days: 10,
      villagename: "",
      address: "",
    });
    setBank(EMPTY_DAIRY_BANK);
    setCreatedUser(null);
    setCreatedDairyId(null);
    setEquipment(DEFAULT_EQUIPMENT.map((name) => ({ name, checked: false, quantity: "", serialNumber: "" })));
    setNewField("");
    setIsSubmitted(false);
  };

  const createdUsername =
    createdUser?.username ?? createdUser?.user_name ?? createdUser?.userName ?? "-";

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white p-2 md:p-4">
      <div className="max-w-5xl mx-auto space-y-4 pt-4">

        <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl py-0 gap-0">
          <CardHeader 
            className="px-4 py-3 border-b border-slate-100/50 bg-white/50 cursor-pointer select-none"
            onClick={() => setIsFormOpen((prev) => !prev)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-semibold text-slate-800">
                  {t("create_dairy", "Create Dairy")}
                </CardTitle>
                <div className="hidden sm:block text-slate-300 text-sm font-medium">|</div>
                <div className="text-sm font-medium text-slate-500">
                  {step === 3 ? "Success" : STEPS.find(s => s.id === step)?.label}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Stepper */}
              <div className="flex items-center space-x-2">
                {STEPS.map((s, idx) => {
                  const active = step === s.id;
                  const done = step > s.id;
                  return (
                    <div key={s.id} className="flex items-center">
                      <div className="flex flex-col items-center gap-1 relative">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm transition-all duration-300 ${
                            done
                              ? "bg-indigo-600 text-white"
                              : active
                                ? "bg-blue-600 text-white ring-4 ring-blue-600/20"
                                : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}
                        >
                          {done ? <CheckCircle2 size={14} /> : s.id}
                        </div>
                        {active && (
                          <span className="absolute -bottom-4 text-[10px] font-bold text-blue-600 whitespace-nowrap">
                            {s.label}
                          </span>
                        )}
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div
                          className={`w-6 sm:w-10 h-[2px] mx-1 transition-all duration-500 rounded-full ${
                            step > s.id ? "bg-indigo-500" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {isFormOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </div>
        </CardHeader>

        {isFormOpen && (
          <CardContent className="px-4 py-4">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Step 1: Mobile number — proceed directly, no OTP */}
              {step === 1 && (
                <form onSubmit={handleContinue} className="max-w-md mx-auto space-y-4 py-4">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-3">
                      <Phone size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{t("enter_mobile_number", "Enter Mobile Number")}</h3>
                    <p className="text-slate-500 text-sm mt-1">
                      {t("enter_owner_10_digit_mobile_to_continue", "Enter the owner's 10-digit mobile number to continue.")}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="text-sm font-semibold text-slate-700">
                      {t("mobile_number", "Mobile Number")}
                    </Label>
                    <div className="relative group">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                      <Input
                        id="mobile"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder={t("enter_mobile_number_placeholder", "Enter mobile number")}
                        className="pl-10 h-10 bg-white border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-blue-600/20 transition-all rounded-lg text-sm shadow-sm"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={mobileNumber.length !== 10}
                    className="w-full h-10 text-sm font-semibold rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm mt-2"
                  >
                    {t("continue", "Continue")}
                  </Button>
                </form>
              )}

              {/* Step 2: Dairy details */}
              {step === 2 && (
                <div className="space-y-4 py-2">
                  <form onSubmit={handleCreateBranch} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-slate-700">
                          {t("dairy_name", "Dairy Name")} <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative group">
                          <Factory className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            className="pl-9 h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg transition-all text-sm shadow-sm"
                            placeholder={t("eg_sunrise_dairy", "e.g. Sunrise Dairy")}
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-slate-700">
                          {t("branch_name", "Branch Name")} <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative group">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            className="pl-9 h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg transition-all text-sm shadow-sm"
                            placeholder={t("eg_main_branch", "e.g. Main Branch")}
                            value={form.branchname}
                            onChange={(e) => setForm({ ...form, branchname: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-slate-700">
                          {t("owner_name", "Owner Name")} <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            className="pl-9 h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg transition-all text-sm shadow-sm"
                            placeholder={t("eg_john_doe", "e.g. John Doe")}
                            value={form.ownername}
                            onChange={(e) => setForm({ ...form, ownername: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-slate-700">{t("mobile_number", "Mobile Number")}</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                          <Input
                            className="pl-9 h-10 bg-gray-50 border-gray-200 text-gray-500 rounded-lg font-medium cursor-not-allowed text-sm shadow-sm"
                            value={mobileNumber}
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-slate-700">
                          {t("password", "Password")} <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            type="text"
                            className="pl-9 h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg transition-all text-sm shadow-sm"
                            placeholder={t("min_6_characters", "Min 6 characters")}
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-slate-700">{t("billing_days", "Billing Days")}</Label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none group-focus-within:text-blue-600 transition-colors">
                            <CalendarClock className="h-4 w-4" />
                          </div>
                          <Select
                            value={String(form.days)}
                            onValueChange={(v) => setForm({ ...form, days: Number(v) })}
                          >
                            <SelectTrigger className="pl-9 h-10 bg-white border-gray-200 focus:ring-blue-500/20 rounded-lg transition-all w-full relative z-10 text-sm shadow-sm">
                              <SelectValue placeholder={t("select_billing_cycle", "Select billing cycle")} />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-100 shadow-xl z-[100]">
                              <SelectItem value="7">7 Days</SelectItem>
                              <SelectItem value="10">10 Days</SelectItem>
                              <SelectItem value="15">15 Days</SelectItem>
                              <SelectItem value="30">30 Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-slate-700">{t("village_name", "Village Name")}</Label>
                        <div className="relative group">
                          <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            className="pl-9 h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg transition-all text-sm shadow-sm"
                            placeholder={t("enter_village", "Enter village")}
                            value={form.villagename}
                            onChange={(e) => setForm({ ...form, villagename: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 lg:col-span-2">
                        <Label className="text-sm font-semibold text-slate-700">{t("address", "Address")}</Label>
                        <div className="relative group">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            className="pl-9 h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg transition-all text-sm shadow-sm"
                            placeholder={t("full_address", "Full address")}
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <DairyBankFields values={bank} onChange={(patch) => setBank((b) => ({ ...b, ...patch }))} />

                    {/* Hierarchy assignment — optional CC / BMC / Route dropdowns */}
                    <div className="pt-3 border-t border-slate-100/50">
                      <Label className="text-sm font-bold text-slate-800 mb-2 block">
                        {t("assign_to_hierarchy", "Assign to Hierarchy")} <span className="text-slate-500 font-normal">{t("optional", "(optional)")}</span>
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <Snowflake className="h-3.5 w-3.5 text-purple-500" />
                            {t("cc_chilling_center", "CC (Chilling Center)")}
                          </Label>
                          <Select value={ccSel} onValueChange={setCcSel}>
                            <SelectTrigger className="h-10 bg-white border-gray-200 focus:ring-blue-500/20 rounded-lg transition-all w-full text-sm shadow-sm">
                              <SelectValue placeholder={t("none", "None")} />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-100 shadow-xl z-[100]">
                              <SelectItem value={NONE}>{t("none", "None")}</SelectItem>
                              {ccList.map((cc: any) => (
                                <SelectItem key={cc.cc_id ?? cc.id} value={String(cc.cc_id ?? cc.id)}>
                                  {cc.cc_id ?? cc.id} — {cc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <Warehouse className="h-3.5 w-3.5 text-blue-500" />
                            {t("bmc", "BMC")}
                          </Label>
                          <Select value={bmcSel} onValueChange={setBmcSel}>
                            <SelectTrigger className="h-10 bg-white border-gray-200 focus:ring-blue-500/20 rounded-lg transition-all w-full text-sm shadow-sm">
                              <SelectValue placeholder={t("none", "None")} />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-100 shadow-xl z-[100]">
                              <SelectItem value={NONE}>{t("none", "None")}</SelectItem>
                              {bmcList.map((bmc: any) => (
                                <SelectItem key={bmc.bmc_id ?? bmc.id} value={String(bmc.bmc_id ?? bmc.id)}>
                                  {bmc.bmc_id ?? bmc.id} — {bmc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <RouteIcon className="h-3.5 w-3.5 text-green-500" />
                            {t("route", "Route")}
                          </Label>
                          <Select value={routeSel} onValueChange={setRouteSel}>
                            <SelectTrigger className="h-10 bg-white border-gray-200 focus:ring-blue-500/20 rounded-lg transition-all w-full text-sm shadow-sm">
                              <SelectValue placeholder={t("none", "None")} />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-100 shadow-xl z-[100]">
                              <SelectItem value={NONE}>{t("none", "None")}</SelectItem>
                              {routeList.map((route: any) => (
                                <SelectItem key={route.route_id ?? route.id} value={String(route.route_id ?? route.id)}>
                                  {route.route_id ?? route.id} — {route.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {t("pick_combination_or_none", 'Pick any combination of CC, BMC and Route — or leave all as "None" for an unlinked dairy.')}
                      </p>
                    </div>

                    <div className="pt-4 mt-2 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-slate-500 hover:text-slate-800 font-medium"
                        onClick={() => setStep(1)}
                      >
                        {t("change_number", "← Change Number")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="px-6 h-10 text-sm font-semibold rounded-lg transition-all disabled:opacity-70 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                      >
                        {loading ? t("creating_dairy", "Creating Dairy...") : t("create_dairy_account", "Create Dairy Account")}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step 3: Success — generated dairy ID + equipment checklist */}
              {step === 3 && (
                <div className="space-y-8 py-2">
                  <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 text-blue-700 font-semibold mb-4">
                      <CheckCircleIcon className="text-blue-600 text-2xl" />
                      {t("dairy_successfully_created", "Dairy successfully created!")}
                    </div>
                    <div className="bg-background p-4 rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("generated_dairy_id", "Generated Dairy ID")}</Label>
                        <div className="flex items-center gap-3 mt-1.5">
                          <code className="text-2xl font-black text-foreground font-mono tracking-tight">
                            {createdUsername}
                          </code>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 h-10 px-4 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => handleCopy(String(createdUsername))}
                      >
                        <FileCopyIcon className="mr-2 h-4 w-4" />
                        {t("copy_id", "Copy ID")}
                      </Button>
                    </div>
                  </div>

                  {isSubmitted ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <CheckCircle2 className="text-blue-600" />
                            {t("delivered_equipment", "Delivered Equipment")}
                          </h3>
                          {equipment.some((e) => e.checked) && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleExportPdf}
                              disabled={exportingPdf}
                              className="h-9 gap-1.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
                            >
                              {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              {t("export_pdf", "Export PDF")}
                            </Button>
                          )}
                        </div>
                        <div className="bg-muted border border-border rounded-xl p-5">
                          {equipment.filter((e) => e.checked).length > 0 ? (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {equipment.filter((e) => e.checked).map((item, idx) => (
                                <li key={idx} className="text-sm bg-background px-3 py-2.5 rounded-lg border border-border shadow-sm">
                                  <div className="flex items-center gap-2 font-medium text-foreground">
                                    <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></div>
                                    {item.name}
                                  </div>
                                  <div className="mt-1.5 ml-4 flex gap-4 text-xs text-muted-foreground">
                                    <span>{t("qty", "Qty")}: <span className="font-semibold text-foreground">{item.quantity || "1"}</span></span>
                                    <span>{t("serial", "Serial")}: <span className="font-semibold text-foreground">{item.serialNumber || "—"}</span></span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-center py-6">
                              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground border border-border mb-3">
                                <Store size={24} />
                              </div>
                              <p className="text-sm font-medium text-muted-foreground">{t("no_equipment_delivered_yet", "No equipment delivered yet")}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsSubmitted(false)}
                          className="flex-1 h-12 text-base font-semibold rounded-xl"
                        >
                          {t("edit_equipment", "Edit Equipment")}
                        </Button>
                        <Button
                          type="button"
                          onClick={resetFlow}
                          className="flex-1 h-12 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {t("create_another_dairy", "Create Another Dairy")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-foreground">{t("assign_equipment", "Assign Equipment")}</h3>
                          <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                            {equipment.filter(e => e.checked).length} {t("selected", " selected")}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {equipment.map((item, idx) => (
                            <div
                              key={item.name}
                              className={`rounded-xl border p-3.5 transition-all ${
                                item.checked
                                  ? "bg-blue-50 border-blue-200 shadow-sm"
                                  : "bg-background border-border hover:bg-muted"
                              }`}
                            >
                              <label
                                htmlFor={`equip-${idx}`}
                                className="flex cursor-pointer items-center gap-3"
                              >
                                <Checkbox
                                  id={`equip-${idx}`}
                                  checked={item.checked}
                                  onCheckedChange={() => toggleEquipment(idx)}
                                />
                                <span className={`text-sm font-medium ${item.checked ? "text-blue-700" : "text-foreground"}`}>
                                  {item.name}
                                </span>
                              </label>
                              {item.checked && (
                                <div className="mt-2.5 grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{t("qty", "Qty")}</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      placeholder="1"
                                      className="h-8 text-xs rounded-md bg-background border-blue-200"
                                      value={item.quantity}
                                      onChange={(e) => updateEquipmentField(idx, "quantity", e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{t("serial_no", "Serial No.")}</Label>
                                    <Input
                                      type="text"
                                      placeholder={t("eg_sn_001", "e.g. SN-001")}
                                      className="h-8 text-xs rounded-md bg-background border-blue-200"
                                      value={item.serialNumber}
                                      onChange={(e) => updateEquipmentField(idx, "serialNumber", e.target.value)}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add new field */}
                        <div className="flex items-center gap-3 mt-4">
                          <Input
                            placeholder={t("add_custom_equipment", "Add custom equipment...")}
                            className="h-11 bg-background border-border rounded-lg flex-1 focus:ring-blue-600/20"
                            value={newField}
                            onChange={(e) => setNewField(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addEquipmentField();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className="shrink-0 h-11 px-4 rounded-lg font-medium"
                            onClick={addEquipmentField}
                          >
                            <Plus size={18} className="mr-1.5" />
                            {t("add", "Add")}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetFlow}
                          className="flex-1 h-12 text-base font-semibold rounded-xl order-2 sm:order-1"
                        >
                          {t("skip_and_create_another", "Skip & Create Another")}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleEquipmentSubmit}
                          disabled={savingEquipment}
                          className="flex-1 h-12 text-base font-semibold rounded-xl order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {savingEquipment ? t("saving", "Saving...") : t("confirm_and_submit", "Confirm & Submit")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        )}
        </Card>

        <UserDairiesList
          userId={userId}
          ccList={ccList}
          bmcList={bmcList}
          routeList={routeList}
          refreshKey={dairiesRefreshKey}
        />
      </div>
    </div>
  );
};

export default CreateDairy;
