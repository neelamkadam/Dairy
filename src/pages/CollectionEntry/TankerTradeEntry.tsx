import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isValid } from "date-fns";
import { CustomDatePicker, CustomTimePicker } from "@/components/ui/datetime-inputs";
import {
  Truck, Scale, Droplets, Banknote, Save, RefreshCcw, Loader2, IndianRupee,
  User, Car, Layers, MapPin, Plus, Minus, Clock, Beaker, Thermometer, Milk,
  AlertTriangle, ClipboardList, FileDown, Trash2, PackageOpen,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { generateDispatchVoucherPDF } from "@/templates/DispatchVoucherTemplate";
import {
  tankerApi,
  TankerParty,
  TankerPartyType,
  TankerPurchaseRow,
  TankerSaleRow,
  TankerVoucherPayload,
} from "@/services/tankerApi";
import {
  calculateLiterFromWeight,
  calculateWeightFromLiter,
  calculateCLRFromFatAndSNF,
  calculateSNFFromFatAndCLR,
} from "@/utils/milkCalculations";

// Tanker Purchase and Tanker Sale share this page. A purchase buys a whole
// tanker from a supplier; a sale picks one of those purchases and sells (part
// of) it to a buyer. Neither is tied to a VLC — the server keeps every voucher
// under the logged-in web user's admin. Fields mirror the Tanker Dispatch form.

type TradeMode = "purchase" | "sale";

const ADULTERANTS = ["sugar", "salt", "urea", "maltose", "soda", "starch"] as const;
type Adulterant = typeof ADULTERANTS[number];
type AdulterantResults = Record<Adulterant, boolean>;

const allNegative = (): AdulterantResults =>
  ADULTERANTS.reduce((acc, a) => ({ ...acc, [a]: false }), {} as AdulterantResults);

const emptyForm = () => ({
  partyId: "",
  weight: "",
  liter: "",
  avgFat: "",
  avgSnf: "",
  clr: "",
  acidity: "",
  temperature: "",
  ratePerLiter: "",
  commissionPerLiter: "",
  totalAmount: "",
  driverName: "",
  vehicleNumber: "",
  compartment: "",
  milkType: "Both",
  time: format(new Date(), "HH:mm"),
  sealsInput: "",
});

const num = (value: any) => {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
};

const voucherNo = (mode: TradeMode, id?: number | string) => `${mode === "purchase" ? "P" : "S"}-${id ?? ""}`;

const formatEntryDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  return isValid(parsed) ? format(parsed, "dd-MM-yyyy") : value;
};

// Time arrives as a plain "HH:mm:ss" clock value.
const formatEntryTime = (value?: string | null) => {
  if (!value) return "-";
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  if (isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}:${minuteStr || "00"} ${suffix}`;
};

const labelClass = "text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1.5";
const inputClass = "h-10 bg-white border-gray-200 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field";

const TankerTradeEntry = ({ mode }: { mode: TradeMode }) => {
  const { t } = useTranslation();
  const { userData } = useAppSelector((state) => state.authData);
  const userId = userData?.id;

  const isSale = mode === "sale";
  const partyType: TankerPartyType = isSale ? "buyer" : "supplier";
  const pageTitle = isSale ? t("tanker_sale", "Tanker Sale") : t("tanker_purchase", "Tanker Purchase");
  const partyLabel = isSale ? t("buyer", "Buyer") : t("supplier", "Supplier");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState(emptyForm);
  const [adulterantResults, setAdulterantResults] = useState<AdulterantResults>(allNegative);
  const alteration = ADULTERANTS.some((a) => adulterantResults[a]);
  const [saving, setSaving] = useState(false);

  const parsedSeals = formData.sealsInput
    ? formData.sealsInput.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Suppliers (purchase page) or buyers (sale page)
  const [parties, setParties] = useState<TankerParty[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [partyDrawerOpen, setPartyDrawerOpen] = useState(false);
  const [partyForm, setPartyForm] = useState({ code: "", name: "", address: "" });
  const [partySaving, setPartySaving] = useState(false);

  // Sale page: the purchases that still have milk left to sell
  const [openPurchases, setOpenPurchases] = useState<TankerPurchaseRow[]>([]);
  const [openPurchasesLoading, setOpenPurchasesLoading] = useState(false);
  const [purchaseId, setPurchaseId] = useState("");
  const selectedPurchase = openPurchases.find((p) => String(p.id) === purchaseId);
  const remainingLiter = selectedPurchase ? num(selectedPurchase.liter) - num(selectedPurchase.sold_liter) : 0;
  const exceedsRemaining = !!selectedPurchase && num(formData.liter) > remainingLiter + 0.009;

  // Day summary
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryRows, setSummaryRows] = useState<(TankerPurchaseRow | TankerSaleRow)[]>([]);

  const loadParties = useCallback(async () => {
    if (!userId) return;
    setPartiesLoading(true);
    try {
      const { data } = await tankerApi.parties(userId, partyType);
      setParties(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_fetch_parties", "Failed to load the list"));
    } finally {
      setPartiesLoading(false);
    }
  }, [userId, partyType, t]);

  const loadOpenPurchases = useCallback(async () => {
    if (!userId || !isSale) return;
    setOpenPurchasesLoading(true);
    try {
      const { data } = await tankerApi.openPurchases(userId);
      setOpenPurchases(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_fetch_purchases", "Failed to load purchases"));
    } finally {
      setOpenPurchasesLoading(false);
    }
  }, [userId, isSale, t]);

  useEffect(() => {
    loadParties();
    loadOpenPurchases();
  }, [loadParties, loadOpenPurchases]);

  const handleInputChange = (field: string, value: string) => {
    const updatedData = { ...formData, [field]: value };

    // Weight and liter are two views of the same quantity — fill the other one in.
    if (field === "weight") {
      updatedData.liter = calculateLiterFromWeight(value);
    } else if (field === "liter") {
      updatedData.weight = calculateWeightFromLiter(value);
    }

    // FAT + SNF derives CLR, and typing a CLR back-solves SNF.
    if (field === "avgFat" || field === "avgSnf") {
      const derivedClr = calculateCLRFromFatAndSNF(updatedData.avgFat, updatedData.avgSnf);
      if (derivedClr) updatedData.clr = derivedClr;
    } else if (field === "clr") {
      const derivedSnf = calculateSNFFromFatAndCLR(updatedData.avgFat, value);
      if (derivedSnf) updatedData.avgSnf = derivedSnf;
    }

    // Rate and commission are per liter, so the liter value drives the amount.
    if (field === "weight" || field === "liter" || field === "ratePerLiter" || field === "commissionPerLiter") {
      const liter = num(updatedData.liter);
      updatedData.totalAmount = (liter * (num(updatedData.ratePerLiter) + num(updatedData.commissionPerLiter))).toFixed(2);
    }

    setFormData(updatedData);
  };

  // Picking a purchase carries the tanker's details over; the sale is usually
  // the same tanker going on to the buyer. Rate, buyer and seals stay to fill in.
  const handlePurchaseSelect = (id: string) => {
    setPurchaseId(id);
    const purchase = openPurchases.find((p) => String(p.id) === id);
    if (!purchase) return;
    const left = Math.max(num(purchase.liter) - num(purchase.sold_liter), 0);
    const liter = left ? left.toFixed(2) : "";
    setFormData((prev) => ({
      ...prev,
      driverName: purchase.driver_name || "",
      vehicleNumber: purchase.vehicle_number || "",
      compartment: purchase.compartment || "",
      milkType: purchase.milk_type || "Both",
      liter,
      weight: calculateWeightFromLiter(liter),
      avgFat: purchase.avg_fat != null ? String(num(purchase.avg_fat)) : "",
      avgSnf: purchase.avg_snf != null ? String(num(purchase.avg_snf)) : "",
      clr: purchase.clr != null ? String(num(purchase.clr)) : "",
      acidity: purchase.acidity != null ? String(num(purchase.acidity)) : "",
      temperature: purchase.temperature != null ? String(num(purchase.temperature)) : "",
      totalAmount: (num(liter) * (num(prev.ratePerLiter) + num(prev.commissionPerLiter))).toFixed(2),
    }));
  };

  const printVoucher = (row: TankerPurchaseRow | TankerSaleRow) => {
    try {
      const party = parties.find((p) => p.id === row.party_id);
      const purchaseRef = (row as TankerSaleRow).purchase_id;
      generateDispatchVoucherPDF({
        voucherNo: voucherNo(mode, row.id),
        date: row.date,
        time: row.time || undefined,
        vlc: "",
        dairyName: userData?.name || "Dairy",
        subtitle: isSale ? `Sold to ${row.party_name}` : `Purchased from ${row.party_name}`,
        title: isSale ? "TANKER SALE VOUCHER" : "TANKER PURCHASE VOUCHER",
        partyLabel: isSale ? "Buyer" : "Supplier",
        refLabel: isSale ? "Purchase No" : "Supplier Code",
        refValue: isSale ? voucherNo("purchase", purchaseRef) : party?.code || "-",
        fileName: `Tanker_${isSale ? "Sale" : "Purchase"}_Voucher_${voucherNo(mode, row.id)}_${row.date}.pdf`,
        driverName: row.driver_name || "",
        vehicleNumber: row.vehicle_number || "",
        compartment: row.compartment || "",
        destinationName: row.party_name,
        milkType: row.milk_type,
        weight: num(row.weight),
        liter: num(row.liter),
        avgFat: num(row.avg_fat),
        avgSnf: num(row.avg_snf),
        acidity: num(row.acidity),
        temperature: num(row.temperature),
        ratePerLiter: num(row.rate_per_liter),
        commissionPerLiter: num(row.commission_amount_per_liter),
        totalAmount: num(row.total_amount),
        alteration: !!Number(row.alteration),
        adulterants: ADULTERANTS.reduce((acc, a) => ({ ...acc, [a]: !!Number(row[a]) }), {} as Record<string, boolean>),
        clr: row.clr != null ? num(row.clr) : undefined,
        seals: row.seals,
      });
    } catch {
      toast.error(t("voucher_download_failed", "Entry saved, but the voucher PDF could not be generated"));
    }
  };

  const handleClear = () => {
    setFormData(emptyForm());
    setSelectedDate(new Date());
    setAdulterantResults(allNegative());
    setPurchaseId("");
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error(t("user_not_found", "User not found, please log in again"));
      return;
    }
    if (isSale && !selectedPurchase) {
      toast.error(t("select_purchase_first", "Please select the purchase this sale is from"));
      return;
    }
    if (!formData.partyId || !formData.weight || !formData.liter || !formData.avgFat || !formData.avgSnf ||
      !formData.ratePerLiter || !formData.driverName.trim() || !formData.vehicleNumber.trim() ||
      !formData.compartment.trim() || !formData.time.trim() || !formData.acidity || !formData.temperature ||
      !formData.milkType) {
      toast.error(t("all_fields_required", "All fields are required"));
      return;
    }
    if (parsedSeals.length === 0) {
      toast.error(t("seal_numbers_required", "At least one seal number is required"));
      return;
    }

    const payload: TankerVoucherPayload = {
      user_id: userId,
      party_id: Number(formData.partyId),
      date: format(selectedDate, "yyyy-MM-dd"),
      time: `${formData.time}:00`,
      driver_name: formData.driverName.trim(),
      vehicle_number: formData.vehicleNumber.trim(),
      compartment: formData.compartment.trim(),
      milk_type: formData.milkType,
      weight: num(formData.weight),
      liter: num(formData.liter),
      avg_fat: num(formData.avgFat),
      avg_snf: num(formData.avgSnf),
      ...(formData.clr ? { clr: num(formData.clr) } : {}),
      acidity: num(formData.acidity),
      temperature: num(formData.temperature),
      rate_per_liter: num(formData.ratePerLiter),
      commission_amount_per_liter: num(formData.commissionPerLiter),
      // Adulteration: true = positive (found), false = negative (absent).
      alteration,
      ...adulterantResults,
      seals: parsedSeals,
    };

    setSaving(true);
    try {
      const { data } = isSale
        ? await tankerApi.createSale({ ...payload, purchase_id: selectedPurchase!.id })
        : await tankerApi.createPurchase(payload);

      if (data?.success) {
        toast.success(data.message || (isSale ? t("tanker_sale_saved", "Tanker sale saved") : t("tanker_purchase_saved", "Tanker purchase saved")));
        const party = parties.find((p) => p.id === payload.party_id);
        printVoucher({
          id: data.id,
          purchase_id: selectedPurchase?.id,
          party_id: payload.party_id,
          party_name: party?.name || "",
          date: payload.date,
          time: payload.time,
          driver_name: payload.driver_name,
          vehicle_number: payload.vehicle_number,
          compartment: payload.compartment,
          milk_type: payload.milk_type,
          weight: String(payload.weight),
          liter: String(payload.liter),
          avg_fat: String(payload.avg_fat),
          avg_snf: String(payload.avg_snf),
          clr: payload.clr != null ? String(payload.clr) : null,
          acidity: String(payload.acidity),
          temperature: String(payload.temperature),
          rate_per_liter: String(payload.rate_per_liter),
          commission_amount_per_liter: String(payload.commission_amount_per_liter),
          total_amount: String(data.total_amount ?? formData.totalAmount),
          alteration: alteration ? 1 : 0,
          ...ADULTERANTS.reduce((acc, a) => ({ ...acc, [a]: adulterantResults[a] ? 1 : 0 }), {} as Record<Adulterant, number>),
          seals: parsedSeals,
        } as TankerSaleRow);
        handleClear();
        loadOpenPurchases();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_save_entry", "Failed to save the entry"));
    } finally {
      setSaving(false);
    }
  };

  const handlePartySubmit = async () => {
    if (!userId) return;
    if (!partyForm.code.trim() || !partyForm.name.trim()) {
      toast.error(t("code_name_required", "Code and Name are required"));
      return;
    }
    setPartySaving(true);
    try {
      const { data } = await tankerApi.createParty({
        user_id: userId,
        type: partyType,
        code: partyForm.code.trim(),
        name: partyForm.name.trim(),
        address: partyForm.address.trim(),
      });
      if (data?.success) {
        toast.success(data.message);
        setPartyDrawerOpen(false);
        setPartyForm({ code: "", name: "", address: "" });
        await loadParties();
        if (data.data?.id) setFormData((prev) => ({ ...prev, partyId: String(data.data.id) }));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_save_entry", "Failed to save the entry"));
    } finally {
      setPartySaving(false);
    }
  };

  const loadSummary = async () => {
    if (!userId) return;
    setSummaryLoading(true);
    try {
      const date = format(selectedDate, "yyyy-MM-dd");
      const { data } = isSale ? await tankerApi.sales(userId, date) : await tankerApi.purchases(userId, date);
      setSummaryRows(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_fetch_summary", "Failed to load the summary"));
      setSummaryRows([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleOpenSummary = () => {
    setSummaryOpen(true);
    loadSummary();
  };

  const handleDelete = async (row: TankerPurchaseRow | TankerSaleRow) => {
    if (!userId) return;
    if (!window.confirm(t("confirm_delete_voucher", "Delete voucher {{no}}? This cannot be undone.", { no: voucherNo(mode, row.id) }))) return;
    try {
      const { data } = isSale ? await tankerApi.deleteSale(row.id, userId) : await tankerApi.deletePurchase(row.id, userId);
      if (data?.success) {
        toast.success(data.message);
        loadSummary();
        loadOpenPurchases();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_delete_entry", "Failed to delete the entry"));
    }
  };

  const handleEnterAsTab = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (!target.classList.contains("enter-field")) return;
    e.preventDefault();
    const container = target.closest(".enter-nav-container");
    if (!container) return;
    const fields = Array.from(
      container.querySelectorAll(".enter-field:not([disabled]):not([readonly])")
    ) as HTMLElement[];
    const index = fields.indexOf(target);
    if (index > -1 && index < fields.length - 1) {
      fields[index + 1].focus();
    } else if (index === fields.length - 1 && target.tagName === "BUTTON") {
      fields[index].click();
    }
  };

  const purchaseOptionLabel = (p: TankerPurchaseRow) => {
    const left = num(p.liter) - num(p.sold_liter);
    return `${voucherNo("purchase", p.id)} · ${formatEntryDate(p.date)} · ${p.party_name} · ${p.vehicle_number || "-"} · ${left.toFixed(2)} L ${t("left", "left")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 space-y-6" onKeyDown={handleEnterAsTab}>
      <div className="w-full max-w-7xl mx-auto space-y-6">

        {/* Header Card */}
        <div className="flex items-center justify-between bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${isSale ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
              <Truck className="h-6 w-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">{pageTitle}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenSummary} disabled={summaryLoading} className="h-9 px-4 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl font-medium shadow-sm">
            <ClipboardList className="h-4 w-4 mr-2 text-indigo-500" />
            <span className="hidden sm:inline">
              {isSale ? t("tanker_sale_summary", "Sale Summary") : t("tanker_purchase_summary", "Purchase Summary")}
            </span>
            <span className="sm:hidden">{t("summary", "Summary")}</span>
          </Button>
        </div>

        {/* Form Card */}
        <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-4 md:p-6 space-y-4 enter-nav-container">

            {/* Sale only: the purchase (tanker) this sale comes out of */}
            {isSale && (
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <PackageOpen className="h-3.5 w-3.5 text-blue-500 stroke-[1.5]" />
                  <span>{t("from_purchase", "From Purchase")}</span>
                </Label>
                <Select value={purchaseId} onValueChange={handlePurchaseSelect}>
                  <SelectTrigger className="h-10 w-full bg-white border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-800">
                    <SelectValue placeholder={
                      openPurchasesLoading
                        ? t("loading", "Loading...")
                        : t("select_purchase", "Select a purchased tanker")
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-lg border-gray-100">
                    {openPurchases.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{purchaseOptionLabel(p)}</SelectItem>
                    ))}
                    {openPurchases.length === 0 && !openPurchasesLoading && (
                      <div className="px-3 py-2 text-sm text-gray-400 text-center">
                        {t("no_open_purchases", "No purchases with milk left to sell")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedPurchase && (
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2">
                    <span><b>{t("supplier", "Supplier")}:</b> {selectedPurchase.party_name}</span>
                    <span><b>{t("purchased", "Purchased")}:</b> {num(selectedPurchase.liter).toFixed(2)} L</span>
                    <span><b>{t("sold", "Sold")}:</b> {num(selectedPurchase.sold_liter).toFixed(2)} L</span>
                    <span><b>{t("left", "Left")}:</b> {remainingLiter.toFixed(2)} L</span>
                    <span><b>{t("purchase_rate", "Purchase Rate")}:</b> ₹{num(selectedPurchase.rate_per_liter).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Row 1: Party, Date, Time */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_200px_200px] gap-3 md:gap-4 items-end">
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <MapPin className="h-3.5 w-3.5 text-orange-500 stroke-[1.5]" />
                  <span>{partyLabel}</span>
                </Label>
                <Select value={formData.partyId} onValueChange={(val) => setFormData((prev) => ({ ...prev, partyId: val }))}>
                  <SelectTrigger className="h-10 w-full bg-white border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-800">
                    <SelectValue placeholder={
                      partiesLoading
                        ? t("loading", "Loading...")
                        : isSale ? t("select_buyer", "Select Buyer") : t("select_supplier", "Select Supplier")
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-lg border-gray-100">
                    {parties.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        <div className="flex flex-col">
                          <span className="font-medium">{p.code} - {p.name}</span>
                          {p.address && <span className="text-xs text-gray-400">{p.address}</span>}
                        </div>
                      </SelectItem>
                    ))}
                    {parties.length === 0 && !partiesLoading && (
                      <div className="px-3 py-2 text-sm text-gray-400 text-center">
                        {isSale ? t("no_buyers", "No buyers yet — add one with +") : t("no_suppliers", "No suppliers yet — add one with +")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPartyDrawerOpen(true)}
                className="h-10 w-10 p-0 shrink-0 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 rounded-xl shadow-sm transition-all"
                title={isSale ? t("add_buyer", "Add Buyer") : t("add_supplier", "Add Supplier")}
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </Button>
              <div className="flex flex-col justify-end space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 block text-left">
                  {isSale ? t("sale_date", "Sale Date") : t("purchase_date", "Purchase Date")}
                </Label>
                <CustomDatePicker value={selectedDate} onChange={(d) => setSelectedDate(d || new Date())} />
              </div>
              <div className="flex flex-col justify-end space-y-1">
                <Label className={labelClass}>
                  <Clock className="h-3.5 w-3.5 text-blue-500 stroke-[1.5]" />
                  <span>{t("dispatch_time", "Time")}</span>
                </Label>
                <CustomTimePicker value={formData.time} onChange={(val) => setFormData((prev) => ({ ...prev, time: val }))} />
              </div>
            </div>

            {/* Row 2: Driver Name, Vehicle Number, Compartment, Milk Type */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
              <div className="flex flex-col justify-end space-y-1">
                <Label className={labelClass}>
                  <User className="h-3.5 w-3.5 text-indigo-500 stroke-[1.5]" />
                  <span>{t("driver_name", "Driver Name")}</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t("enter_driver_name", "Enter driver name")}
                  value={formData.driverName}
                  onChange={(e) => handleInputChange("driverName", e.target.value)}
                  className="h-10 bg-white border-gray-200 text-sm font-medium rounded-xl text-gray-800 shadow-sm enter-field"
                />
              </div>
              <div className="flex flex-col justify-end space-y-1">
                <Label className={labelClass}>
                  <Car className="h-3.5 w-3.5 text-indigo-500 stroke-[1.5]" />
                  <span>{t("vehicle_number", "Vehicle Number")}</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t("enter_vehicle_number", "e.g. MH 12 AB 1234")}
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange("vehicleNumber", e.target.value.toUpperCase())}
                  className="h-10 bg-white border-gray-200 text-sm font-semibold rounded-xl text-gray-800 shadow-sm enter-field uppercase"
                />
              </div>
              <div className="flex flex-col justify-end space-y-1">
                <Label className={labelClass}>
                  <Layers className="h-3.5 w-3.5 text-indigo-500 stroke-[1.5]" />
                  <span>{t("compartment", "Compartment")}</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t("enter_compartment", "e.g. A1")}
                  value={formData.compartment}
                  onChange={(e) => handleInputChange("compartment", e.target.value)}
                  className="h-10 bg-white border-gray-200 text-sm font-medium rounded-xl text-gray-800 shadow-sm enter-field"
                />
              </div>
              <div className="flex flex-col justify-end space-y-1">
                <Label className={labelClass}>
                  <Milk className="h-3.5 w-3.5 text-cyan-500 stroke-[1.5]" />
                  <span>{t("milk_type", "Milk Type")}</span>
                </Label>
                <Select value={formData.milkType} onValueChange={(val) => handleInputChange("milkType", val)}>
                  <SelectTrigger className="h-10 w-full bg-white border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-800">
                    <SelectValue placeholder={t("select_milk_type", "Select Milk Type")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-lg border-gray-100">
                    <SelectItem value="Cow">{t("cow", "Cow")}</SelectItem>
                    <SelectItem value="Buffalo">{t("buffalo", "Buffalo")}</SelectItem>
                    <SelectItem value="Both">{t("both", "Both")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Weight, Liter, Fat, SNF, CLR, Acidity, Temperature */}
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3 md:gap-4">
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <Scale className="h-3.5 w-3.5 text-blue-500 stroke-[1.5]" />
                  <span>{t("weight")}</span>
                </Label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <Droplets className="h-3.5 w-3.5 text-blue-500 stroke-[1.5]" />
                  <span>{t("liter", "Liter")}</span>
                </Label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.liter}
                  onChange={(e) => handleInputChange("liter", e.target.value)}
                  className={`${inputClass} ${exceedsRemaining ? "border-amber-400" : ""}`} />
                {exceedsRemaining && (
                  <span className="text-[10px] leading-tight text-amber-600">
                    {t("more_than_left", "More than the {{left}} L left", { left: remainingLiter.toFixed(2) })}
                  </span>
                )}
              </div>
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <Droplets className="h-3.5 w-3.5 text-fuchsia-500 stroke-[1.5]" />
                  <span>{t("avg_fat")}</span>
                </Label>
                <Input type="number" step="0.1" placeholder="0.0" value={formData.avgFat}
                  onChange={(e) => handleInputChange("avgFat", e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <Droplets className="h-3.5 w-3.5 text-fuchsia-500 stroke-[1.5]" />
                  <span>{t("avg_snf")}</span>
                </Label>
                <Input type="number" step="0.1" placeholder="0.0" value={formData.avgSnf}
                  onChange={(e) => handleInputChange("avgSnf", e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <Droplets className="h-3.5 w-3.5 text-sky-500 stroke-[1.5]" />
                  <span>{t("clr", "CLR")}</span>
                  <span className="text-[10px] font-normal normal-case text-gray-400">({t("auto_calculated", "Auto")})</span>
                </Label>
                <Input type="number" step="0.1" placeholder="0.0" value={formData.clr}
                  onChange={(e) => handleInputChange("clr", e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <Beaker className="h-3.5 w-3.5 text-amber-500 stroke-[1.5]" />
                  <span>{t("acidity", "Acidity")}</span>
                </Label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.acidity}
                  onChange={(e) => handleInputChange("acidity", e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <Thermometer className="h-3.5 w-3.5 text-red-500 stroke-[1.5]" />
                  <span>{t("temperature", "Temp")} °C</span>
                </Label>
                <Input type="number" step="0.1" placeholder="0.0" value={formData.temperature}
                  onChange={(e) => handleInputChange("temperature", e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Row 4: Rate, Commission, Total */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <Banknote className="h-3.5 w-3.5 text-emerald-500 stroke-[1.5]" />
                  <span>{t("rate_per_liter")}</span>
                </Label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.ratePerLiter}
                  onChange={(e) => handleInputChange("ratePerLiter", e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col space-y-1">
                <Label className={labelClass}>
                  <Banknote className="h-3.5 w-3.5 text-emerald-500 stroke-[1.5]" />
                  <span>{t("commission_per_liter") || "Commission/Ltr"}</span>
                  <span className="text-[10px] font-normal normal-case text-gray-400">({t("optional", "Optional")})</span>
                </Label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.commissionPerLiter}
                  onChange={(e) => handleInputChange("commissionPerLiter", e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                  <span>{t("total_amount")}</span>
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-600 stroke-[2]" />
                  </div>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.totalAmount}
                    readOnly
                    className="h-10 pl-8 pr-4 text-sm font-bold text-center bg-emerald-50/30 border-emerald-100 rounded-xl text-emerald-700 cursor-not-allowed shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Seals */}
            <div className="flex flex-col space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                <span>{t("seal_numbers", "Seal Numbers")}</span>
                <span className="text-red-500">*</span>
                <span className="text-[10px] font-normal normal-case text-gray-400">({t("comma_separated_seals", "comma separated, e.g. A-1042, A-1043")})</span>
              </Label>
              <Input
                type="text"
                placeholder="e.g. A-1042, A-1043"
                value={formData.sealsInput}
                onChange={(e) => handleInputChange("sealsInput", e.target.value)}
                className="h-10 bg-white border-gray-200 text-sm font-medium rounded-xl text-gray-800 shadow-sm enter-field"
              />
              {parsedSeals.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {parsedSeals.map((seal, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                      {seal}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Adulteration — every adulterant is reported, positive or negative */}
            <div className="border border-gray-100 rounded-xl p-3 md:p-4 space-y-3 bg-gray-50/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg ${alteration ? "bg-red-50" : "bg-emerald-50"}`}>
                    <AlertTriangle className={`h-3.5 w-3.5 stroke-[1.5] ${alteration ? "text-red-500" : "text-emerald-500"}`} />
                  </div>
                  <Label className="text-sm font-semibold text-gray-800">{t("adulteration", "Adulteration")}</Label>
                  <span className="text-[11px] font-normal text-gray-400">
                    {t("adulteration_all_reported", "All tests are recorded on the voucher.")}
                  </span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border shrink-0 ${
                  alteration ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {alteration ? t("positive", "Positive") : t("negative", "Negative")}
                </span>
              </div>

              <div className="pt-2.5 border-t border-gray-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {ADULTERANTS.map((adulterant) => {
                  const isPositive = adulterantResults[adulterant];
                  const setResult = (positive: boolean) =>
                    setAdulterantResults((prev) => ({ ...prev, [adulterant]: positive }));
                  return (
                    <div key={adulterant} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-white transition-colors ${isPositive ? "border-red-200" : "border-gray-200"}`}>
                      <span className={`text-xs font-medium capitalize ${isPositive ? "text-red-700" : "text-gray-700"}`}>
                        {t(adulterant, adulterant.charAt(0).toUpperCase() + adulterant.slice(1))}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setResult(true)}
                          aria-pressed={isPositive}
                          title={t("positive", "Positive")}
                          className={`h-7 w-7 rounded-md border flex items-center justify-center transition-all ${
                            isPositive ? "border-red-400 bg-red-500 text-white shadow-sm" : "border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:text-red-500"
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setResult(false)}
                          aria-pressed={!isPositive}
                          title={t("negative", "Negative")}
                          className={`h-7 w-7 rounded-md border flex items-center justify-center transition-all ${
                            !isPositive ? "border-emerald-400 bg-emerald-500 text-white shadow-sm" : "border-gray-200 bg-white text-gray-400 hover:border-emerald-200 hover:text-emerald-500"
                          }`}
                        >
                          <Minus className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button
                onClick={handleClear}
                variant="outline"
                className="h-10 px-5 text-sm font-semibold border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
              >
                <RefreshCcw className="h-4 w-4 mr-2 stroke-[2]" />
                {t("clear_form")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all enter-field"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2 stroke-[2]" />}
                {t("submit_entry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Supplier / Buyer drawer */}
      <Sheet open={partyDrawerOpen} onOpenChange={setPartyDrawerOpen}>
        <SheetContent side="right" className="bg-white w-full sm:max-w-md">
          <SheetHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-orange-50 rounded-xl">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold text-gray-800">
                  {isSale ? t("add_buyer", "Add Buyer") : t("add_supplier", "Add Supplier")}
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-500 mt-0.5">
                  {isSale
                    ? t("add_buyer_desc", "A party you sell tankers to")
                    : t("add_supplier_desc", "A party you buy tankers from")}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-5 p-4 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600">
                {t("code", "Code")} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder={t("enter_dest_code_numeric", "e.g. 101")}
                value={partyForm.code}
                onChange={(e) => setPartyForm((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, "") }))}
                className="h-11 bg-gray-50/50 border-gray-200 rounded-xl text-sm font-medium shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600">
                {t("name", "Name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder={isSale ? t("enter_buyer_name", "e.g. Shree Milk Products") : t("enter_supplier_name", "e.g. Krishna Dairy")}
                value={partyForm.name}
                onChange={(e) => setPartyForm((prev) => ({ ...prev, name: e.target.value }))}
                className="h-11 bg-gray-50/50 border-gray-200 rounded-xl text-sm font-medium shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600">{t("address", "Address")}</Label>
              <Input
                type="text"
                placeholder={t("enter_address", "Enter address (optional)")}
                value={partyForm.address}
                onChange={(e) => setPartyForm((prev) => ({ ...prev, address: e.target.value }))}
                className="h-11 bg-gray-50/50 border-gray-200 rounded-xl text-sm font-medium shadow-sm"
              />
            </div>
            {parties.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  {isSale ? t("existing_buyers", "Existing Buyers") : t("existing_suppliers", "Existing Suppliers")} ({parties.length})
                </Label>
                <div className="max-h-56 overflow-auto border border-gray-100 rounded-xl divide-y divide-gray-100">
                  {parties.map((p) => (
                    <div key={p.id} className="px-3 py-2 text-sm flex gap-3">
                      <span className="w-12 shrink-0 font-semibold text-gray-500">{p.code}</span>
                      <span className="font-medium text-gray-800">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-gray-100 p-4">
            <div className="flex gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPartyDrawerOpen(false);
                  setPartyForm({ code: "", name: "", address: "" });
                }}
                className="flex-1 h-11 rounded-xl border-gray-200 text-gray-700 font-semibold"
              >
                {t("cancel", "Cancel")}
              </Button>
              <Button
                type="button"
                onClick={handlePartySubmit}
                disabled={partySaving}
                className="flex-1 h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-sm transition-all"
              >
                {partySaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2 stroke-[2]" />}
                {t("save", "Save")}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Day summary */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-6xl bg-white rounded-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <ClipboardList className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-800 font-serif">
                {isSale ? t("tanker_sale_summary", "Sale Summary") : t("tanker_purchase_summary", "Purchase Summary")}
                <span className="ml-2 text-sm font-normal text-gray-500">{format(selectedDate, "dd-MM-yyyy")}</span>
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
            {summaryLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : summaryRows.length === 0 ? (
              <div className="text-center py-10 text-gray-500 font-medium">
                {t("no_vouchers_for_date", "No vouchers for this date.")}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700">{t("voucher", "Voucher")}</TableHead>
                      <TableHead className="font-semibold text-gray-700">{partyLabel}</TableHead>
                      {isSale && <TableHead className="font-semibold text-gray-700">{t("from_purchase", "From Purchase")}</TableHead>}
                      <TableHead className="font-semibold text-gray-700">{t("driver_vehicle", "Driver/Vehicle")}</TableHead>
                      <TableHead className="font-semibold text-gray-700">{t("milk_type", "Milk Type")}</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">{t("liter", "Liter")}</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">{t("fat", "Fat")} / {t("snf", "SNF")}</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">{t("total", "Total")} (₹)</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center w-24">{t("actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryRows.map((row) => {
                      const sale = row as TankerSaleRow;
                      const purchase = row as TankerPurchaseRow;
                      return (
                        <TableRow key={row.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-xs">
                            <span className="font-semibold text-gray-800">{voucherNo(mode, row.id)}</span><br />
                            <span className="text-gray-500">{formatEntryTime(row.time)}</span>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-gray-700">{row.party_name}</TableCell>
                          {isSale && (
                            <TableCell className="text-xs">
                              <span className="font-medium text-gray-800">{voucherNo("purchase", sale.purchase_id)}</span><br />
                              <span className="text-gray-500">{sale.supplier_name} · {formatEntryDate(sale.purchase_date)}</span>
                            </TableCell>
                          )}
                          <TableCell className="text-xs">
                            <span className="font-medium text-gray-800">{row.driver_name || "-"}</span><br />
                            <span className="text-gray-500">{row.vehicle_number || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">{row.milk_type}</span>
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <span className="font-medium text-gray-800">{num(row.liter).toFixed(2)} L</span>
                            {!isSale && (
                              <>
                                <br />
                                <span className="text-gray-500">
                                  {t("sold", "Sold")} {num(purchase.sold_liter).toFixed(2)} · {t("left", "Left")} {(num(row.liter) - num(purchase.sold_liter)).toFixed(2)}
                                </span>
                              </>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs text-gray-700">
                            {num(row.avg_fat).toFixed(1)} / {num(row.avg_snf).toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-gray-800">
                            ₹{num(row.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => printVoucher(row)}
                                className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                title={t("download_voucher", "Download Voucher")}
                              >
                                <FileDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(row)}
                                className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title={t("delete", "Delete")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TankerTradeEntry;
