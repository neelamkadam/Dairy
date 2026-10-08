import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { useAppSelector } from "@/redux/store";
import { routeApi } from "@/services/routeBmcCcApi";
import { transportApi, Transport, TransportDetails, RouteHistoryRow } from "@/services/transportApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, History, Landmark, Loader2, Pencil, Route as RouteIcon, Search, Trash2, Truck } from "lucide-react";

// Master → Create → Create Transport. A transport runs one route at a time; the
// route's VLCs fill its tanker. Its bank account is captured here because the
// Transport NEFT statement pays into it.

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const EMPTY_DETAILS: TransportDetails = {
  name: "", address: "", mobile_number: "", vendor_code: "", service_tax_no: "", pan_no: "",
  work_order_no: "", vehicle_number: "", vehicle_capacity: "",
  bank_name: "", account_holder: "", account_number: "", ifsc_code: "",
};

const today = () => format(new Date(), "yyyy-MM-dd");
const emptyAssignment = () => ({ route_id: "", km_per_trip: "", rate_per_km: "", effective_from: today() });

// null when valid, else the message to show
const validateDetails = (d: TransportDetails): string | null => {
  if (!d.name.trim()) return "Transporter name is required";
  if (d.mobile_number && !/^\d{10}$/.test(d.mobile_number)) return "Mobile number must be 10 digits";
  if (d.pan_no && !PAN_PATTERN.test(d.pan_no)) return "Invalid PAN (e.g. ABCDE1234F)";
  if (!d.bank_name.trim()) return "Bank name is required";
  if (!d.account_holder.trim()) return "Account holder name is required";
  if (!/^\d{9,18}$/.test(d.account_number)) return "Account number must be 9-18 digits";
  if (!IFSC_PATTERN.test(d.ifsc_code)) return "Invalid IFSC code (e.g. SBIN0001234)";
  return null;
};

const validateAssignment = (a: ReturnType<typeof emptyAssignment>): string | null => {
  if (!a.route_id) return "Please select a route";
  if (!(Number(a.km_per_trip) > 0)) return "KMs per trip must be greater than 0";
  if (a.rate_per_km === "" || Number(a.rate_per_km) < 0) return "Rate per KM is required";
  if (!a.effective_from) return "Start date is required";
  return null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  return `${d}-${m}-${y}`;
};

const maskAccount = (acc: string) => (acc.length > 4 ? `${"•".repeat(Math.min(acc.length - 4, 8))}${acc.slice(-4)}` : acc);

const CreateTransport = () => {
  const { t } = useTranslation();
  const { userData } = useAppSelector((state) => state.authData);
  const userId = userData?.id;

  const [isFormOpen, setIsFormOpen] = useState(true);
  const [details, setDetails] = useState<TransportDetails>(EMPTY_DETAILS);
  const [assignment, setAssignment] = useState(emptyAssignment);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [transports, setTransports] = useState<Transport[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [routeDialog, setRouteDialog] = useState<Transport | null>(null);
  const [routeForm, setRouteForm] = useState(emptyAssignment);
  const [routeSaving, setRouteSaving] = useState(false);
  const [historyFor, setHistoryFor] = useState<Transport | null>(null);
  const [history, setHistory] = useState<RouteHistoryRow[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([transportApi.list(userId), routeApi.list(Number(userId))]);
      setTransports(Array.isArray(tRes.data?.data) ? tRes.data.data : []);
      setRoutes(Array.isArray(rRes.data?.data) ? rRes.data.data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_to_load_transports", "Failed to load transports"));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => { load(); }, [load]);

  // Which transport currently runs each route — a route has one at a time
  const runnerOfRoute = useMemo(() => {
    const map = new Map<number, Transport>();
    transports.forEach((tr) => { if (tr.route_id) map.set(Number(tr.route_id), tr); });
    return map;
  }, [transports]);

  const setDetail = (key: keyof TransportDetails, value: string) => setDetails((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setDetails(EMPTY_DETAILS);
    setAssignment(emptyAssignment());
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!userId) return;
    const detailError = validateDetails(details);
    if (detailError) { toast.error(detailError); return; }
    if (!editingId) {
      const assignError = validateAssignment(assignment);
      if (assignError) { toast.error(assignError); return; }
    }
    setSaving(true);
    try {
      const { data } = editingId
        ? await transportApi.update(editingId, { user_id: userId, ...details })
        : await transportApi.create({
            user_id: userId,
            ...details,
            route_id: Number(assignment.route_id),
            km_per_trip: Number(assignment.km_per_trip),
            rate_per_km: Number(assignment.rate_per_km),
            effective_from: assignment.effective_from,
          });
      if (data?.success) {
        toast.success(data.message);
        resetForm();
        load();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_save_entry", "Failed to save the entry"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tr: Transport) => {
    setEditingId(tr.id);
    setDetails({
      name: tr.name || "", address: tr.address || "", mobile_number: tr.mobile_number || "",
      vendor_code: tr.vendor_code || "", service_tax_no: tr.service_tax_no || "", pan_no: tr.pan_no || "",
      work_order_no: tr.work_order_no || "", vehicle_number: tr.vehicle_number || "", vehicle_capacity: tr.vehicle_capacity || "",
      bank_name: tr.bank_name || "", account_holder: tr.account_holder || "", account_number: tr.account_number || "",
      ifsc_code: tr.ifsc_code || "",
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (tr: Transport) => {
    if (!userId) return;
    if (!window.confirm(t("confirm_delete_transport", "Delete transport {{name}}? Its route history and deductions are deleted too.", { name: tr.name }))) return;
    try {
      const { data } = await transportApi.remove(tr.id, userId);
      if (data?.success) { toast.success(data.message); load(); }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_delete_entry", "Failed to delete the entry"));
    }
  };

  const openRouteDialog = (tr: Transport) => {
    setRouteDialog(tr);
    setRouteForm({
      route_id: tr.route_id ? String(tr.route_id) : "",
      km_per_trip: tr.km_per_trip ? String(Number(tr.km_per_trip)) : "",
      rate_per_km: tr.rate_per_km ? String(Number(tr.rate_per_km)) : "",
      effective_from: today(),
    });
  };

  const handleRouteSave = async () => {
    if (!userId || !routeDialog) return;
    const error = validateAssignment(routeForm);
    if (error) { toast.error(error); return; }
    setRouteSaving(true);
    try {
      const { data } = await transportApi.changeRoute(routeDialog.id, {
        user_id: userId,
        route_id: Number(routeForm.route_id),
        km_per_trip: Number(routeForm.km_per_trip),
        rate_per_km: Number(routeForm.rate_per_km),
        effective_from: routeForm.effective_from,
      });
      if (data?.success) {
        toast.success(data.message);
        setRouteDialog(null);
        load();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_save_entry", "Failed to save the entry"));
    } finally {
      setRouteSaving(false);
    }
  };

  const openHistory = async (tr: Transport) => {
    if (!userId) return;
    setHistoryFor(tr);
    setHistory([]);
    try {
      const { data } = await transportApi.routeHistory(tr.id, userId);
      setHistory(Array.isArray(data?.data) ? data.data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_to_load_transports", "Failed to load transports"));
    }
  };

  const filtered = transports.filter((tr) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [tr.name, tr.vehicle_number, tr.route_name, tr.account_holder].some((v) => String(v || "").toLowerCase().includes(q));
  });

  const field = (key: keyof TransportDetails, label: string, placeholder: string, opts: { required?: boolean; transform?: (v: string) => string } = {}) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        {label} {opts.required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        placeholder={placeholder}
        value={details[key] || ""}
        onChange={(e) => setDetail(key, opts.transform ? opts.transform(e.target.value) : e.target.value)}
        className="bg-gray-50 border-gray-200 h-10"
      />
    </div>
  );

  const routeSelect = (
    value: string,
    onChange: (v: string) => void,
    forTransportId: number | null
  ) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-10">
        <SelectValue placeholder={t("select_route", "Select Route")} />
      </SelectTrigger>
      <SelectContent className="bg-white max-h-72">
        {routes.map((r: any) => {
          const id = Number(r.route_id ?? r.id);
          const runner = runnerOfRoute.get(id);
          const takenByOther = !!runner && runner.id !== forTransportId;
          return (
            <SelectItem key={id} value={String(id)} disabled={takenByOther}>
              {id} - {r.name}
              {r.bmc_name ? ` · BMC ${r.bmc_name}` : ""}
              {` · ${(r.vlcs || []).length} VLC`}
              {takenByOther ? ` (${runner!.name})` : ""}
            </SelectItem>
          );
        })}
        {routes.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400">{t("no_routes_create_first", "No routes yet — create one in Master → Create → Create Route")}</div>
        )}
      </SelectContent>
    </Select>
  );

  const assignmentFields = (
    form: ReturnType<typeof emptyAssignment>,
    setForm: (updater: (prev: ReturnType<typeof emptyAssignment>) => ReturnType<typeof emptyAssignment>) => void,
    forTransportId: number | null
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2 sm:col-span-2">
        <Label className="text-sm font-medium text-gray-700">{t("route", "Route")} <span className="text-red-500">*</span></Label>
        {routeSelect(form.route_id, (v) => setForm((p) => ({ ...p, route_id: v })), forTransportId)}
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">{t("km_per_trip", "KMs per Trip")} <span className="text-red-500">*</span></Label>
        <Input type="number" step="0.01" placeholder="e.g. 85" value={form.km_per_trip}
          onChange={(e) => setForm((p) => ({ ...p, km_per_trip: e.target.value }))} className="bg-gray-50 border-gray-200 h-10" />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">{t("rate_per_km", "Rate per KM (₹)")} <span className="text-red-500">*</span></Label>
        <Input type="number" step="0.01" placeholder="e.g. 13.00" value={form.rate_per_km}
          onChange={(e) => setForm((p) => ({ ...p, rate_per_km: e.target.value }))} className="bg-gray-50 border-gray-200 h-10" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label className="text-sm font-medium text-gray-700">{t("applies_from", "Applies From")} <span className="text-red-500">*</span></Label>
        <Input type="date" value={form.effective_from}
          onChange={(e) => setForm((p) => ({ ...p, effective_from: e.target.value }))} className="bg-gray-50 border-gray-200 h-10" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 bg-gray-50 min-h-screen p-4">
      {/* Create / Edit form */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="border-b cursor-pointer select-none" onClick={() => setIsFormOpen((prev) => !prev)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              {editingId ? `${t("edit_transport", "Edit Transport")} (${editingId})` : t("create_transport", "Create Transport")}
            </CardTitle>
            {isFormOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
          </div>
        </CardHeader>
        {isFormOpen && (
          <CardContent className="p-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transporter + vehicle */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-800 text-left">{t("transporter_details", "Transporter Details")}</h3>
                {field("name", t("transporter_name", "Transporter Name"), "e.g. Shree Transport", { required: true })}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {field("mobile_number", t("mobile_number", "Mobile Number"), "10 digits", { transform: (v) => v.replace(/\D/g, "").slice(0, 10) })}
                  {field("pan_no", t("pan_no", "PAN No."), "ABCDE1234F", { transform: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) })}
                </div>
                {field("address", t("address", "Address"), "At / Ta / Dist")}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {field("vendor_code", t("vendor_code", "Vendor Code"), "")}
                  {field("work_order_no", t("work_order_no", "Work Order No."), "")}
                  {field("service_tax_no", t("service_tax_reg_no", "Service Tax Reg. No."), "NA")}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {field("vehicle_number", t("vehicle_number", "Vehicle Number"), "MH 40 AB 1234", { transform: (v) => v.toUpperCase() })}
                  {field("vehicle_capacity", t("vehicle_capacity_type", "Vehicle Capacity / Type"), "e.g. 10 KL Tanker")}
                </div>
              </div>

              <div className="space-y-6">
                {/* Bank account — required, the NEFT statement pays into it */}
                <div className="space-y-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <Landmark className="h-4 w-4 text-emerald-600" />
                    {t("transport_bank_details", "Bank Account Details")}
                    <span className="text-xs font-normal text-gray-500">({t("used_for_neft", "used for the NEFT payment")})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {field("account_holder", t("account_holder_name", "Account Holder Name"), "As in the bank", { required: true })}
                    {field("bank_name", t("bank_name", "Bank Name"), "e.g. SBI", { required: true })}
                    {field("account_number", t("account_number", "Account Number"), "9-18 digits", { required: true, transform: (v) => v.replace(/\D/g, "").slice(0, 18) })}
                    {field("ifsc_code", t("ifsc_code", "IFSC Code"), "SBIN0001234", { required: true, transform: (v) => v.toUpperCase().replace(/\s/g, "").slice(0, 11) })}
                  </div>
                </div>

                {/* Route — on create; later changes go through Change Route so history is kept */}
                {!editingId ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <RouteIcon className="h-4 w-4 text-blue-600" />
                      {t("route_and_rate", "Route & Rate")}
                    </h3>
                    {assignmentFields(assignment, setAssignment, null)}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                    {t("change_route_hint", "To change the route, KMs or rate, use Change Route in the list — the old route stays on past bills.")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              {editingId && (
                <Button variant="outline" onClick={resetForm}>{t("cancel", "Cancel")}</Button>
              )}
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? t("update", "Update") : t("save", "Save")}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* List */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg font-semibold text-gray-800">
              {t("transports", "Transports")} <span className="text-sm font-normal text-gray-500">({transports.length})</span>
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder={t("search", "Search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>{t("transporter_name", "Transporter Name")}</TableHead>
                  <TableHead>{t("vehicle", "Vehicle")}</TableHead>
                  <TableHead>{t("route", "Route")}</TableHead>
                  <TableHead className="text-right">{t("km_per_trip", "KMs per Trip")}</TableHead>
                  <TableHead className="text-right">{t("rate_per_km", "Rate per KM (₹)")}</TableHead>
                  <TableHead>{t("bank_account", "Bank Account")}</TableHead>
                  <TableHead className="text-center">{t("actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline text-gray-400" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">{t("no_transports", "No transports yet")}</TableCell></TableRow>
                ) : filtered.map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell>
                      <span className="font-semibold text-gray-900">{tr.name}</span>
                      {tr.mobile_number && <span className="block text-xs text-gray-500">{tr.mobile_number}</span>}
                    </TableCell>
                    <TableCell>
                      {tr.vehicle_number || "-"}
                      {tr.vehicle_capacity && <span className="block text-xs text-gray-500">{tr.vehicle_capacity}</span>}
                    </TableCell>
                    <TableCell>
                      {tr.route_id ? (
                        <>
                          <span className="font-medium">{tr.route_id} - {tr.route_name}</span>
                          <span className="block text-xs text-gray-500">{t("since", "since")} {formatDate(tr.route_from)}</span>
                        </>
                      ) : <Badge variant="outline">{t("no_route", "No route")}</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{tr.km_per_trip ? Number(tr.km_per_trip).toFixed(2) : "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{tr.rate_per_km ? Number(tr.rate_per_km).toFixed(2) : "-"}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium text-gray-800">{tr.account_holder}</span>
                      <span className="block text-gray-500">{maskAccount(tr.account_number || "")} · {tr.ifsc_code}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 px-2" title={t("edit", "Edit")} onClick={() => handleEdit(tr)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-2 text-blue-700 border-blue-200" onClick={() => openRouteDialog(tr)}>
                          <RouteIcon className="h-3.5 w-3.5 mr-1" />{t("change_route", "Change Route")}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-2" title={t("route_history", "Route History")} onClick={() => openHistory(tr)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-2 text-red-600 border-red-200" title={t("delete", "Delete")} onClick={() => handleDelete(tr)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Change route */}
      <Dialog open={!!routeDialog} onOpenChange={(open) => !open && setRouteDialog(null)}>
        <DialogContent className="bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("change_route", "Change Route")} — {routeDialog?.name}</DialogTitle>
            <DialogDescription>
              {routeDialog?.route_id
                ? t("change_route_desc", "Currently {{route}} since {{date}}. The new route applies from the date you pick; earlier bills keep the old one.", {
                    route: `${routeDialog.route_id} - ${routeDialog.route_name}`,
                    date: formatDate(routeDialog.route_from),
                  })
                : t("assign_route_desc", "Pick the route this transport runs from the date you choose.")}
            </DialogDescription>
          </DialogHeader>
          {routeDialog && assignmentFields(routeForm, setRouteForm, routeDialog.id)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteDialog(null)}>{t("cancel", "Cancel")}</Button>
            <Button onClick={handleRouteSave} disabled={routeSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {routeSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{t("save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route history */}
      <Dialog open={!!historyFor} onOpenChange={(open) => !open && setHistoryFor(null)}>
        <DialogContent className="bg-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("route_history", "Route History")} — {historyFor?.name}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>{t("route", "Route")}</TableHead>
                <TableHead className="text-right">{t("km_per_trip", "KMs per Trip")}</TableHead>
                <TableHead className="text-right">{t("rate_per_km", "Rate per KM (₹)")}</TableHead>
                <TableHead>{t("from", "From")}</TableHead>
                <TableHead>{t("to", "To")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{h.route_id} - {h.route_name || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(h.km_per_trip).toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(h.rate_per_km).toFixed(2)}</TableCell>
                  <TableCell>{formatDate(h.effective_from)}</TableCell>
                  <TableCell>{h.effective_to ? formatDate(h.effective_to) : <Badge className="bg-emerald-100 text-emerald-800">{t("current", "Current")}</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateTransport;
