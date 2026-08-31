import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  HelpCircle, Truck, Scale, Droplets, Banknote, Save, RefreshCcw,
  Loader2, IndianRupee, User, Car, Layers, MapPin, Plus,
  Clock, Beaker, Thermometer, Milk, AlertTriangle, Search,
  FileText, ClipboardList, Pencil
} from "lucide-react";
import { usePostApi, useGetApi, usePutApi } from "@/services/use-api";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import AxiosClient from "@/services/interceptor";
import { generateDispatchVoucherPDF } from "@/templates/DispatchVoucherTemplate";
import { calculateLiterFromWeight, calculateWeightFromLiter } from "@/utils/milkCalculations";

const ADULTERANTS = ["sugar", "salt", "urea", "maltose", "soda", "starch"] as const;
type Adulterant = typeof ADULTERANTS[number];

interface Destination {
  id?: number;
  code: string;
  name: string;
  address?: string;
  vlc?: string;
}

const DispatchEntry = () => {
  const { t } = useTranslation();
  const { postData, isLoading } = usePostApi({
    path: "/web/collection/dispatch-entry"
  });

  const { putData, isLoading: isPutLoading } = usePutApi({
    path: "/web/collection/dispatch-entry"
  });

  const { branches } = useAppSelector((state) => state.branch);
  const { userData } = useAppSelector((state) => state.authData);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    vlcId: "",
    weight: "",
    avgFat: "",
    avgSnf: "",
    ratePerLiter: "",
    commissionPerLiter: "",
    totalAmount: "",
    // New fields
    driverName: "",
    vehicleNumber: "",
    compartment: "",
    destinationName: "",
    time: format(new Date(), "HH:mm"),
    liter: "",
    acidity: "",
    temperature: "",
    milkType: "Both",
    clr: "",
    sealsInput: "",   // comma-separated raw input
  });

  // Parsed seals array derived from sealsInput
  const parsedSeals = formData.sealsInput
    ? formData.sealsInput.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Alteration state
  const [alteration, setAlteration] = useState(false);
  const [selectedAdulterant, setSelectedAdulterant] = useState<Adulterant | null>(null);

  // Destination drawer state
  const [destDrawerOpen, setDestDrawerOpen] = useState(false);
  const [destForm, setDestForm] = useState({ code: "", name: "", address: "" });
  const [destLoading, setDestLoading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destFetchLoading, setDestFetchLoading] = useState(false);
  const [destCodeInput, setDestCodeInput] = useState("");

  // Edit entry state
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    clr: "",
    sealsInput: "",
  });

  const parsedEditSeals = editForm.sealsInput
    ? editForm.sealsInput.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const handleEditOpen = (entry: any) => {
    setEditingEntry(entry);
    setEditForm({
      clr: entry.clr != null ? String(entry.clr) : "",
      sealsInput: Array.isArray(entry.seals) ? entry.seals.join(", ") : "",
    });
    setEditSheetOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingEntry?.id) return;
    try {
      const body: Record<string, any> = {};
      if (editForm.clr) body.clr = parseFloat(editForm.clr);
      if (parsedEditSeals.length > 0) body.seals = parsedEditSeals;

      const response = await putData(
        body,
        `/web/collection/dispatch-entry/${editingEntry.id}`
      );

      if (response?.data?.success) {
        toast.success(response.data.message || t('dispatch_entry_updated', 'Dispatch entry updated successfully'));
        setEditSheetOpen(false);
        setEditingEntry(null);
        // Refresh the summary list
        handleOpenDispatchSummary();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('failed_update_dispatch', 'Failed to update dispatch entry'));
    }
  };

  // Summary modals state
  const [dispatchSummaryOpen, setDispatchSummaryOpen] = useState(false);
  const [destSummaryOpen, setDestSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dispatchEntries, setDispatchEntries] = useState<any[]>([]);
  const [destinationCount, setDestinationCount] = useState<number | null>(null);
  const [destinationsListForSummary, setDestinationsListForSummary] = useState<Destination[]>([]);

  // Backend sends the date as an ISO timestamp and the time as a plain "HH:mm:ss" clock value.
  const formatEntryDate = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    return isValid(parsed) ? format(parsed, 'dd-MM-yyyy') : value;
  };

  const formatEntryTime = (value?: string) => {
    if (!value) return '-';
    const [hourStr, minuteStr] = value.split(':');
    const hour = Number(hourStr);
    if (isNaN(hour)) return value;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(hour12).padStart(2, '0')}:${minuteStr || '00'} ${suffix}`;
  };

  const handleOpenDispatchSummary = async () => {
    if (!formData.vlcId) {
      toast.error(t('select_vlc_first', 'Please select a VLC first'));
      return;
    }
    setDispatchSummaryOpen(true);
    setSummaryLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const response = await AxiosClient.get(
        `/web/collection/dispatch-entries-by-vlc?date=${formattedDate}&vlc=${encodeURIComponent(formData.vlcId)}`
      );
      if (response?.data?.success) {
        setDispatchEntries(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        toast.error(response?.data?.message || 'Failed to fetch dispatch summary');
        setDispatchEntries([]);
      }
    } catch (error) {
      toast.error('Error fetching dispatch summary');
      setDispatchEntries([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleOpenDestSummary = async () => {
    if (!formData.vlcId) {
      toast.error(t('select_vlc_first', 'Please select a VLC first'));
      return;
    }
    setDestSummaryOpen(true);
    setSummaryLoading(true);
    try {
      // 1. Fetch total count
      const countRes = await AxiosClient.get(
        `/web/collection/dispatch-destination/count?vlc=${encodeURIComponent(formData.vlcId)}`
      );
      if (countRes?.data?.success) {
        setDestinationCount(countRes.data.total);
        setDestinationsListForSummary(
          Array.isArray(countRes.data.destinations) ? countRes.data.destinations : []
        );
      } else {
        setDestinationCount(0);
        setDestinationsListForSummary([]);
      }
    } catch (error) {
      toast.error('Error fetching destination summary');
      setDestinationCount(0);
      setDestinationsListForSummary([]);
    } finally {
      setSummaryLoading(false);
    }
  };
  const handleInputChange = (field: string, value: string) => {
    const updatedData = { ...formData, [field]: value };

    // Weight and liter are two views of the same quantity — fill the other one in.
    if (field === 'weight') {
      updatedData.liter = calculateLiterFromWeight(value);
    } else if (field === 'liter') {
      updatedData.weight = calculateWeightFromLiter(value);
    }

    // Auto-calculate total amount when quantity, rate, or commission changes.
    // Rate and commission are per liter, so the liter value drives the amount.
    if (field === 'weight' || field === 'liter' || field === 'ratePerLiter' || field === 'commissionPerLiter') {
      const liter = parseFloat(updatedData.liter) || 0;
      const rate = parseFloat(updatedData.ratePerLiter) || 0;
      const commission = parseFloat(updatedData.commissionPerLiter) || 0;

      updatedData.totalAmount = ((liter * rate) + (liter * commission)).toFixed(2);
    }

    setFormData(updatedData);
  };

  const handleVLCIdChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      vlcId: val,
      destinationName: "", // Reset destination when VLC changes
    }));
  };

  const downloadVoucher = (payload: Record<string, any>, created?: any) => {
    try {
      const branch = branches?.find((b: any) => String(b.username) === formData.vlcId);
      const adulterant = ADULTERANTS.find((a) => payload[a]) || null;

      generateDispatchVoucherPDF({
        voucherNo: created?.id ?? created?.voucher_no ?? `${payload.date.replace(/-/g, "")}-${(payload.time || "").replace(/:/g, "").slice(0, 4)}`,
        date: payload.date,
        time: payload.time,
        vlc: payload.vlc,
        vlcName: branch?.name || branch?.branchName,
        dairyName: userData?.name || "Dairy",
        driverName: payload.driver_name,
        vehicleNumber: payload.vehicle_number,
        compartment: payload.compartment,
        destinationName: payload.destination_name,
        milkType: payload.milk_type,
        weight: parseFloat(formData.weight),
        liter: payload.liter,
        avgFat: payload.avg_fat,
        avgSnf: payload.avg_snf,
        acidity: payload.acidity,
        temperature: payload.temperature,
        ratePerLiter: payload.rate_per_liter,
        commissionPerLiter: payload.commission_amount_per_liter,
        totalAmount: payload.total_amount,
        alteration: payload.alteration,
        adulterant,
        clr: payload.clr,
        seals: payload.seals,
      });
    } catch (error) {
      toast.error(t('voucher_download_failed', 'Entry saved, but the voucher PDF could not be generated'));
    }
  };

  const handleSubmit = async () => {
    if (!formData.vlcId || !formData.weight || !formData.avgFat || !formData.avgSnf ||
      !formData.ratePerLiter || !formData.totalAmount ||
      !formData.driverName?.trim() || !formData.vehicleNumber?.trim() || !formData.compartment?.trim() ||
      !formData.destinationName?.trim() || !formData.time?.trim() || !formData.liter || 
      !formData.acidity || !formData.temperature || !formData.milkType) {
      toast.error(t('all_fields_required', 'All fields are required'));
      return;
    }

    try {
      const payload: Record<string, any> = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        vlc: formData.vlcId,
        // The backend's weight column stores the liter value.
        weight: parseFloat(formData.liter),
        avg_fat: parseFloat(formData.avgFat),
        avg_snf: parseFloat(formData.avgSnf),
        rate_per_liter: parseFloat(formData.ratePerLiter),
        commission_amount_per_liter: formData.commissionPerLiter ? parseFloat(formData.commissionPerLiter) : 0,
        total_amount: parseFloat(formData.totalAmount),
        // New fields
        driver_name: formData.driverName,
        vehicle_number: formData.vehicleNumber,
        compartment: formData.compartment,
        destination_name: formData.destinationName,
        time: formData.time ? `${formData.time}:00` : undefined,
        liter: formData.liter ? parseFloat(formData.liter) : undefined,
        acidity: formData.acidity ? parseFloat(formData.acidity) : undefined,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        milk_type: formData.milkType,
        // Alteration
        alteration,
        sugar: alteration && selectedAdulterant === 'sugar',
        salt: alteration && selectedAdulterant === 'salt',
        urea: alteration && selectedAdulterant === 'urea',
        maltose: alteration && selectedAdulterant === 'maltose',
        soda: alteration && selectedAdulterant === 'soda',
        starch: alteration && selectedAdulterant === 'starch',
        // Optional new fields
        ...(formData.clr ? { clr: parseFloat(formData.clr) } : {}),
        ...(parsedSeals.length > 0 ? { seals: parsedSeals } : {}),
      };

      const response = await postData(payload);

      if (response?.data?.success) {
        toast.success(t('dispatch_entry_created', 'Dispatch entry created successfully'));
        downloadVoucher(payload, response?.data?.data);
        handleClear();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('failed_create_dispatch', 'Failed to create dispatch entry'));
    }
  };

  const handleClear = () => {
    setFormData({
      vlcId: "",
      weight: "",
      avgFat: "",
      avgSnf: "",
      ratePerLiter: "",
      commissionPerLiter: "",
      totalAmount: "",
      driverName: "",
      vehicleNumber: "",
      compartment: "",
      destinationName: "",
      time: format(new Date(), "HH:mm"),
      liter: "",
      acidity: "",
      temperature: "",
      milkType: "Both",
      clr: "",
      sealsInput: "",
    });
    setSelectedDate(new Date());
    setAlteration(false);
    setSelectedAdulterant(null);
    setDestCodeInput("");
  };

  const handleEnterAsTab = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('enter-field')) return;

      e.preventDefault();

      const container = target.closest('.enter-nav-container');
      if (!container) return;

      const fields = Array.from(
        container.querySelectorAll('.enter-field:not([disabled]):not([readonly])')
      ) as HTMLElement[];

      const index = fields.indexOf(target);
      if (index > -1 && index < fields.length - 1) {
        fields[index + 1].focus();
      } else if (index === fields.length - 1 && target.tagName === 'BUTTON') {
        fields[index].click();
      }
    }
  };

  const handleSearchDestCode = async () => {
    if (!formData.vlcId) {
      toast.error(t('select_vlc_first', 'Please select a VLC first'));
      return;
    }
    if (!destCodeInput.trim()) {
      handleInputChange("destinationName", "");
      setDestinations([]);
      return;
    }

    setDestFetchLoading(true);
    try {
      const response = await AxiosClient.get(
        `/web/collection/dispatch-destination?vlc=${encodeURIComponent(formData.vlcId)}&code=${encodeURIComponent(destCodeInput.trim())}`
      );
      
      let fetchedDestinations: Destination[] = [];
      if (response?.data?.success && Array.isArray(response.data.data)) {
        fetchedDestinations = response.data.data;
      } else if (response?.data?.success && response.data.data) {
        fetchedDestinations = [response.data.data];
      }

      setDestinations(fetchedDestinations);

      // Now match the code exactly
      const found = fetchedDestinations.find(d => d.code?.toLowerCase() === destCodeInput.trim().toLowerCase());
      
      if (found) {
        handleInputChange("destinationName", found.name);
        toast.success(t('destination_found', 'Destination found'));
      } else if (fetchedDestinations.length > 0) {
        // Fallback to first if API returned results but case mismatch
        handleInputChange("destinationName", fetchedDestinations[0].name);
        toast.success(t('destination_found', 'Destination found'));
      } else {
        handleInputChange("destinationName", "");
        toast.error(t('destination_not_found', 'Destination not found'));
      }
    } catch (error) {
       toast.error(t('failed_fetch_destinations', 'Failed to fetch destinations'));
       handleInputChange("destinationName", "");
       setDestinations([]);
    } finally {
      setDestFetchLoading(false);
    }
  };

  const handleDestinationSelect = (name: string) => {
    handleInputChange("destinationName", name);
    const found = destinations.find(d => d.name === name);
    if (found && found.code) {
      setDestCodeInput(found.code);
    } else {
      setDestCodeInput("");
    }
  };

  // Destination drawer handlers
  const handleDestSubmit = async () => {
    if (!destForm.code.trim() || !destForm.name.trim()) {
      toast.error(t('code_name_required', 'Code and Name are required'));
      return;
    }
    setDestLoading(true);
    try {
      const payload = {
        code: destForm.code.trim(),
        name: destForm.name.trim(),
        address: destForm.address.trim(),
        vlc: formData.vlcId,
      };
      const response = await AxiosClient.post('/web/collection/dispatch-destination', payload);
      if (response?.data?.success) {
        toast.success(t('destination_created', 'Destination created successfully'));
        setDestForm({ code: "", name: "", address: "" });
        setDestDrawerOpen(false);
        // Auto-select the new destination and update local list
        const newDest = { code: destForm.code.trim(), name: destForm.name.trim(), address: destForm.address.trim(), vlc: formData.vlcId };
        setDestinations([newDest]);
        setDestCodeInput(newDest.code);
        setFormData(prev => ({ ...prev, destinationName: newDest.name }));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('failed_create_destination', 'Failed to create destination'));
    } finally {
      setDestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 space-y-6" onKeyDown={handleEnterAsTab}>
      <div className="w-full max-w-7xl mx-auto space-y-6">

        {/* Header Card */}
        <div className="flex items-center justify-between bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Truck className="h-6 w-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
              {t('tanker_dispatch') || 'Tanker Dispatch'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleOpenDispatchSummary} disabled={!formData.vlcId || summaryLoading} className="h-9 px-4 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl font-medium shadow-sm">
               <ClipboardList className="h-4 w-4 mr-2 text-indigo-500" />
               <span className="hidden sm:inline">Tanker Dispatch Summary</span>
               <span className="sm:hidden">Summary</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenDestSummary} disabled={!formData.vlcId || summaryLoading} className="h-9 px-4 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl font-medium shadow-sm">
               <FileText className="h-4 w-4 mr-2 text-orange-500" />
               <span className="hidden sm:inline">Destination Summary</span>
               <span className="sm:hidden">Destinations</span>
            </Button>
            <HelpCircle className="h-6 w-6 text-gray-400 stroke-[1.5] shrink-0 ml-1" />
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-4 md:p-6 space-y-4 enter-nav-container">

            {/* Row 1: VLC Dropdown, Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="flex flex-col justify-end space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 block text-left">
                  {t('select_vlc') || 'Select VLC'}
                </Label>
                <VLCDropdown
                  branches={branches || []}
                  value={formData.vlcId}
                  onChange={handleVLCIdChange}
                  valueKey="username"
                  className="h-10"
                />
              </div>

              <div className="flex flex-col justify-end space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 block text-left">
                  {t('dispatch_date', 'Dispatch Date')}
                </Label>
                <CustomDatePicker
                  value={selectedDate || undefined}
                  onChange={(d) => setSelectedDate(d || null)}
                />
              </div>

              <div className="flex flex-col justify-end space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-blue-500 stroke-[1.5]" />
                  <span>{t('dispatch_time', 'Time')}</span>
                </Label>
                <CustomTimePicker
                  value={formData.time}
                  onChange={(t) => handleInputChange("time", t)}
                />
              </div>
            </div>

            {/* Row 2: Driver Name, Vehicle Number, Compartment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="flex flex-col justify-end space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-indigo-500 stroke-[1.5]" />
                  <span>{t('driver_name', 'Driver Name')}</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t('enter_driver_name', 'Enter driver name')}
                  value={formData.driverName}
                  onChange={(e) => handleInputChange("driverName", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium rounded-xl text-gray-800 shadow-sm enter-field"
                />
              </div>

              <div className="flex flex-col justify-end space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Car className="h-3.5 w-3.5 text-indigo-500 stroke-[1.5]" />
                  <span>{t('vehicle_number', 'Vehicle Number')}</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t('enter_vehicle_number', 'e.g. MH 12 AB 1234')}
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange("vehicleNumber", e.target.value.toUpperCase())}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold rounded-xl text-gray-800 shadow-sm enter-field uppercase"
                />
              </div>

              <div className="flex flex-col justify-end space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-indigo-500 stroke-[1.5]" />
                  <span>{t('compartment', 'Compartment')}</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t('enter_compartment', 'e.g. A1')}
                  value={formData.compartment}
                  onChange={(e) => handleInputChange("compartment", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium rounded-xl text-gray-800 shadow-sm enter-field"
                />
              </div>
            </div>

            {/* Row 3: Destination Code + Name + Milk Type */}
            <div className="grid grid-cols-1 md:grid-cols-[150px_1fr_auto_180px] gap-3 md:gap-4 items-end">
              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <span>{t('destination_code', 'Dest Code')}</span>
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={t('enter_dest_code_numeric', 'e.g. 101')}
                    value={destCodeInput}
                    onChange={(e) => setDestCodeInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchDestCode();
                      }
                    }}
                    disabled={!formData.vlcId}
                    className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-orange-500/20 text-sm font-medium rounded-xl text-gray-800 shadow-sm enter-field pr-10"
                  />
                  <button
                    type="button"
                    onClick={handleSearchDestCode}
                    disabled={!formData.vlcId || !destCodeInput.trim()}
                    className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-orange-500 stroke-[1.5]" />
                  <span>{t('destination_name', 'Destination Name')}</span>
                </Label>
                <Select
                  value={formData.destinationName}
                  onValueChange={handleDestinationSelect}
                  disabled={true}
                >
                  <SelectTrigger className="h-10 w-full bg-white border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-800">
                    <SelectValue placeholder={
                      destFetchLoading
                        ? t('loading_destinations', 'Loading...')
                        : t('select_destination', 'Select Destination')
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-lg border-gray-100">
                    {destinations.map((dest, idx) => (
                      <SelectItem key={`${dest.code}-${idx}`} value={dest.name}>
                        <div className="flex flex-col">
                          <span className="font-medium">{dest.name}</span>
                          {dest.address && (
                            <span className="text-xs text-gray-400">{dest.address}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    {destinations.length === 0 && !destFetchLoading && (
                      <div className="px-3 py-2 text-sm text-gray-400 text-center">
                        {t('no_destinations', 'No destinations found')}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!formData.vlcId) {
                    toast.error(t('select_vlc_first', 'Please select a VLC first'));
                    return;
                  }
                  setDestDrawerOpen(true);
                }}
                className="h-10 w-10 p-0 shrink-0 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 rounded-xl shadow-sm transition-all"
                title={t('add_destination', 'Add Destination')}
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </Button>
              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Milk className="h-3.5 w-3.5 text-cyan-500 stroke-[1.5]" />
                  <span>{t('milk_type', 'Milk Type')}</span>
                </Label>
                <Select
                  value={formData.milkType}
                  onValueChange={(val) => handleInputChange("milkType", val)}
                >
                  <SelectTrigger className="h-10 w-full bg-white border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-800">
                    <SelectValue placeholder={t('select_milk_type', 'Select Milk Type')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-lg border-gray-100">
                    <SelectItem value="Cow">{t('cow', 'Cow')}</SelectItem>
                    <SelectItem value="Buffalo">{t('buffalo', 'Buffalo')}</SelectItem>
                    <SelectItem value="Both">{t('both', 'Both')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: All numeric milk parameters — Weight, Liter, Fat, SNF, Acidity, Temperature, CLR */}
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3 md:gap-4">
              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-blue-500 stroke-[1.5]" />
                  <span>{t('weight')}</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:border-blue-400 text-blue-500 text-sm font-semibold rounded-xl text-center shadow-sm enter-field"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-blue-500 stroke-[1.5]" />
                  <span>{t('liter', 'Liter')}</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.liter}
                  onChange={(e) => handleInputChange("liter", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-fuchsia-500 stroke-[1.5]" />
                  <span>{t('avg_fat')}</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.avgFat}
                  onChange={(e) => handleInputChange("avgFat", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-fuchsia-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-fuchsia-500 stroke-[1.5]" />
                  <span>{t('avg_snf')}</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.avgSnf}
                  onChange={(e) => handleInputChange("avgSnf", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-fuchsia-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <Beaker className="h-3.5 w-3.5 text-amber-500 stroke-[1.5]" />
                  <span>{t('acidity', 'Acidity')}</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.acidity}
                  onChange={(e) => handleInputChange("acidity", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-red-500 stroke-[1.5]" />
                  <span>{t('temperature', 'Temp')} °C</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.temperature}
                  onChange={(e) => handleInputChange("temperature", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-red-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-sky-500 stroke-[1.5]" />
                  <span>{t('clr', 'CLR')}</span>
                  <span className="text-[10px] font-normal normal-case text-gray-400">({t('optional', 'Optional')})</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.clr}
                  onChange={(e) => handleInputChange("clr", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-sky-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>
            </div>

            {/* Row 5: Rate, Commission, Total */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-500 stroke-[1.5]" />
                  <span>{t('rate_per_liter')}</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.ratePerLiter}
                  onChange={(e) => handleInputChange("ratePerLiter", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-500 stroke-[1.5]" />
                  <span>{t('commission_per_liter') || 'Commission/Ltr'}</span>
                  <span className="text-[10px] font-normal normal-case text-gray-400">({t('optional', 'Optional')})</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.commissionPerLiter}
                  onChange={(e) => handleInputChange("commissionPerLiter", e.target.value)}
                  className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                  <span>{t('total_amount')}</span>
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-600 stroke-[2]" />
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.totalAmount}
                    readOnly
                    className="h-10 pl-8 pr-4 text-sm font-bold text-center bg-emerald-50/30 border-emerald-100 rounded-xl text-emerald-700 cursor-not-allowed shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Seals Section */}
            <div className="flex flex-col space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                <span>{t('seal_numbers', 'Seal Numbers')}</span>
                <span className="text-[10px] font-normal normal-case text-gray-400">({t('optional_comma_separated', 'Optional — comma separated, e.g. A-1042, A-1043')})</span>
              </Label>
              <Input
                type="text"
                placeholder="e.g. A-1042, A-1043"
                value={formData.sealsInput}
                onChange={(e) => handleInputChange("sealsInput", e.target.value)}
                className="h-10 bg-white border-gray-200 focus:ring-2 focus:ring-violet-500/20 text-sm font-medium rounded-xl text-gray-800 shadow-sm enter-field"
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

            {/* Adultration Section */}
            <div className="border border-gray-100 rounded-xl p-3 md:p-4 space-y-3 bg-gray-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 stroke-[1.5]" />
                  </div>
                  <Label className="text-sm font-semibold text-gray-800">
                    {t('adulteration', 'Adulteration')}
                  </Label>
                </div>
                <Switch
                  checked={alteration}
                  onCheckedChange={(checked) => {
                    setAlteration(checked);
                    if (!checked) setSelectedAdulterant(null);
                  }}
                />
              </div>

              {/* Adulterant categories - shown when alteration is ON */}
              {alteration && (
                <div className="pt-2.5 border-t border-gray-200/60 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-[11px] font-semibold text-gray-500">
                    {t('adulterant_found', 'Adulterant Found')}
                    <span className="font-normal text-gray-400 ml-1">({t('only_one_adulterant', 'Only one can be recorded per entry.')})</span>
                  </p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {ADULTERANTS.map((adulterant) => {
                      const isSelected = selectedAdulterant === adulterant;
                      return (
                        <button
                          key={adulterant}
                          type="button"
                          onClick={() => setSelectedAdulterant(isSelected ? null : adulterant)}
                          className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 text-xs font-medium cursor-pointer
                            ${isSelected
                              ? 'border-red-400 bg-red-50 text-red-700 shadow-sm shadow-red-100'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className={`
                            w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200
                            ${isSelected ? 'border-red-500' : 'border-gray-300'}
                          `}>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-in zoom-in-50 duration-200" />
                            )}
                          </div>
                          <span className="capitalize">{t(adulterant, adulterant.charAt(0).toUpperCase() + adulterant.slice(1))}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button
                onClick={handleClear}
                variant="outline"
                className="h-10 px-5 text-sm font-semibold border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
              >
                <RefreshCcw className="h-4 w-4 mr-2 stroke-[2]" />
                {t('clear_form')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all enter-field"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2 stroke-[2]" />
                )}
                {t('submit_entry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Destination Sheet/Drawer */}
      <Sheet open={destDrawerOpen} onOpenChange={setDestDrawerOpen}>
        <SheetContent side="right" className="bg-white w-full sm:max-w-md">
          <SheetHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-orange-50 rounded-xl">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold text-gray-800">
                  {t('add_destination', 'Add Destination')}
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-500 mt-0.5">
                  {t('add_destination_desc', 'Create a new dispatch destination')}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-5 p-4 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600">
                {t('destination_code', 'Destination Code')} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder={t('enter_dest_code_numeric', 'e.g. 101')}
                value={destForm.code}
                onChange={(e) => setDestForm(prev => ({ ...prev, code: e.target.value.replace(/\D/g, '') }))}
                className="h-11 bg-gray-50/50 border-gray-200 rounded-xl text-sm font-medium shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600">
                {t('name', 'Name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder={t('enter_destination_name', 'e.g. Central Processing Unit')}
                value={destForm.name}
                onChange={(e) => setDestForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-11 bg-gray-50/50 border-gray-200 rounded-xl text-sm font-medium shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600">
                {t('address', 'Address')}
              </Label>
              <Input
                type="text"
                placeholder={t('enter_address', 'Enter address (optional)')}
                value={destForm.address}
                onChange={(e) => setDestForm(prev => ({ ...prev, address: e.target.value }))}
                className="h-11 bg-gray-50/50 border-gray-200 rounded-xl text-sm font-medium shadow-sm"
              />
            </div>


          </div>

          <SheetFooter className="border-t border-gray-100 p-4">
            <div className="flex gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDestDrawerOpen(false);
                  setDestForm({ code: "", name: "", address: "" });
                }}
                className="flex-1 h-11 rounded-xl border-gray-200 text-gray-700 font-semibold"
              >
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleDestSubmit}
                disabled={destLoading}
                className="flex-1 h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-sm transition-all"
              >
                {destLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2 stroke-[2]" />
                )}
                {t('save_destination', 'Save Destination')}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {/* Tanker Dispatch Summary Dialog */}
      <Dialog open={dispatchSummaryOpen} onOpenChange={setDispatchSummaryOpen}>
        <DialogContent className="max-w-5xl bg-white rounded-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <ClipboardList className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-800 font-serif">
                Tanker Dispatch Summary
              </DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
            {summaryLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : dispatchEntries.length === 0 ? (
              <div className="text-center py-10 text-gray-500 font-medium">No dispatch entries found for this date and VLC.</div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700">Date/Time</TableHead>
                      <TableHead className="font-semibold text-gray-700">Driver/Vehicle</TableHead>
                      <TableHead className="font-semibold text-gray-700">Destination</TableHead>
                      <TableHead className="font-semibold text-gray-700">Milk Type</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Liter / Weight</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Total (₹)</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center w-16">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatchEntries.map((entry, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium text-gray-800 text-xs">
                          {formatEntryDate(entry.date)} <br />
                          <span className="text-gray-500 font-normal">{formatEntryTime(entry.time)}</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-medium text-gray-800">{entry.driver_name}</span> <br />
                          <span className="text-gray-500">{entry.vehicle_number}</span>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-700">{entry.destination_name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                            {entry.milk_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <span className="font-medium text-gray-800">{entry.liter} L</span> <br />
                          <span className="text-gray-500">{entry.weight} Kg</span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-800">
                          ₹{entry.total_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleEditOpen(entry)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            title="Edit CLR & Seals"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Destination Summary Dialog */}
      <Dialog open={destSummaryOpen} onOpenChange={setDestSummaryOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-0 gap-0 max-h-[85vh] overflow-hidden flex flex-col shadow-xl">
          <DialogHeader className="px-6 py-5 border-b border-gray-100 bg-orange-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-800 font-serif">
                Destination Summary
              </DialogTitle>
            </div>
          </DialogHeader>

          {summaryLoading ? (
            <div className="p-8 flex items-center justify-center min-h-[160px]">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="px-6 py-2 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Total Destinations</p>
                <div className="text-xl font-black text-gray-800 tracking-tight leading-none">
                  {destinationCount !== null ? destinationCount : 0}
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
                {destinationsListForSummary.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 font-medium text-sm">
                    No destinations added for this VLC yet.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="font-semibold text-gray-700 w-20">Code</TableHead>
                          <TableHead className="font-semibold text-gray-700">Name</TableHead>
                          <TableHead className="font-semibold text-gray-700">Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {destinationsListForSummary.map((destination, idx) => (
                          <TableRow key={destination.code || idx} className="hover:bg-gray-50/50">
                            <TableCell className="text-xs font-semibold text-gray-500">{destination.code}</TableCell>
                            <TableCell className="text-sm font-medium text-gray-800">{destination.name}</TableCell>
                            <TableCell className="text-sm text-gray-600">{destination.address || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Dispatch Entry Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="right" className="bg-white w-full sm:max-w-md">
          <SheetHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Pencil className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold text-gray-800">
                  {t('edit_dispatch_entry', 'Edit Dispatch Entry')}
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-500 mt-0.5">
                  {editingEntry ? `Entry #${editingEntry.id} · ${formatEntryDate(editingEntry.date)}` : ''}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-5 p-4 overflow-y-auto">
            {/* Read-only summary */}
            {editingEntry && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Driver</span>
                  <span className="font-medium text-gray-800">{editingEntry.driver_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Vehicle</span>
                  <span className="font-medium text-gray-800">{editingEntry.vehicle_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Destination</span>
                  <span className="font-medium text-gray-800">{editingEntry.destination_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Liter / Weight</span>
                  <span className="font-medium text-gray-800">{editingEntry.liter} L / {editingEntry.weight} Kg</span>
                </div>
              </div>
            )}

            {/* CLR */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                <Droplets className="h-3.5 w-3.5 text-sky-500 stroke-[1.5]" />
                {t('clr', 'CLR')}
                <span className="text-[10px] font-normal normal-case text-gray-400">({t('optional', 'Optional')})</span>
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={editForm.clr}
                onChange={(e) => setEditForm(prev => ({ ...prev, clr: e.target.value }))}
                className="h-11 bg-gray-50/50 border-gray-200 rounded-xl text-sm font-semibold text-center shadow-sm"
              />
            </div>

            {/* Seals */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600">
                {t('seal_numbers', 'Seal Numbers')}
                <span className="ml-2 text-[10px] font-normal normal-case text-gray-400">({t('optional_comma_separated', 'comma separated')})</span>
              </Label>
              <Input
                type="text"
                placeholder="e.g. A-1042, A-1043"
                value={editForm.sealsInput}
                onChange={(e) => setEditForm(prev => ({ ...prev, sealsInput: e.target.value }))}
                className="h-11 bg-gray-50/50 border-gray-200 rounded-xl text-sm font-medium shadow-sm"
              />
              {parsedEditSeals.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {parsedEditSeals.map((seal, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                      {seal}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="border-t border-gray-100 p-4">
            <div className="flex gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setEditSheetOpen(false); setEditingEntry(null); }}
                className="flex-1 h-11 rounded-xl border-gray-200 text-gray-700 font-semibold"
              >
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleEditSubmit}
                disabled={isPutLoading}
                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition-all"
              >
                {isPutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2 stroke-[2]" />
                )}
                {t('save_changes', 'Save Changes')}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DispatchEntry;
