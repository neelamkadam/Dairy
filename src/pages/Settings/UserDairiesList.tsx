import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Building2, Loader2, Pencil, RefreshCcw, Route as RouteIcon, Save, Search, Snowflake, Warehouse, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDairyApi, type UpdateDairyPayload, type UserDairy } from "@/services/createDairyApi";
import DairyBankFields, { validateDairyBank, type DairyBankValues } from "@/components/DairyBankFields";
import { fetchUserBranches } from "@/redux/branchSlice";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { useVlcNumbering } from "@/utils/vlcSectionLabel";

interface HierarchyOption {
  id: number;
  name: string;
}

// A CC / BMC / Route row as its list API returns it; the id sits under
// cc_id / bmc_id / route_id or plain id depending on the endpoint.
type HierarchyRow = { id?: number | string; name?: string; [key: string]: unknown };

interface UserDairiesListProps {
  userId: number | null;
  ccList: HierarchyRow[];
  bmcList: HierarchyRow[];
  routeList: HierarchyRow[];
  // Bumped by the parent after a dairy is created, to re-read the list.
  refreshKey: number;
}

interface EditForm {
  name: string;
  branchname: string;
  ownername: string;
  days: string;
  villagename: string;
  address: string;
  cc: string;
  bmc: string;
  route: string;
  bank: DairyBankValues;
}

const NONE = "none";
const BILLING_DAYS = ["7", "10", "15", "30"];

const toSel = (id: number | null) => (id ? String(id) : NONE);
const fromSel = (sel: string) => (sel === NONE ? null : Number(sel));

// The CC / BMC / Route pickers load the admin's own lists; a dairy can still
// point at one outside them, so keep its current link selectable.
const withCurrent = (list: HierarchyRow[], idKey: string, currentId: number | null, currentName: string | null): HierarchyOption[] => {
  const options: HierarchyOption[] = list.map((item) => ({ id: Number(item[idKey] ?? item.id), name: item.name ?? "" }));
  if (currentId && !options.some((o) => o.id === currentId)) {
    options.unshift({ id: currentId, name: currentName || "" });
  }
  return options;
};

const errorMessage = (error: unknown) => {
  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || "";
};

const inputClass =
  "h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg transition-all text-sm shadow-sm";
const labelClass = "text-sm font-semibold text-slate-700";
const headClass = "text-xs font-bold text-slate-500 uppercase tracking-wider text-left h-11";

const UserDairiesList = ({ userId, ccList, bmcList, routeList, refreshKey }: UserDairiesListProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const email = useAppSelector((state) => state.authData?.userData?.email);
  // VLC numbers (1, 2, 3 …) for the web user who uses them; "" for everyone else.
  const vlcNo = useVlcNumbering();

  const [dairies, setDairies] = useState<UserDairy[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const requestRef = useRef(0);

  const [editing, setEditing] = useState<UserDairy | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const loadDairies = useCallback(async () => {
    // A slow, older response can never overwrite a newer one.
    const requestId = ++requestRef.current;
    if (!userId) return;
    setLoading(true);
    try {
      const res = await createDairyApi.listUserDairies(userId);
      if (requestId !== requestRef.current) return;
      setDairies(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      toast.error(errorMessage(error) || t("failed_to_load_dairies", "Failed to load dairies"));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    loadDairies();
  }, [loadDairies, refreshKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dairies;
    return dairies.filter((d) =>
      [d.username, d.name, d.branchname, d.ownername, d.villagename, d.mobile_number]
        .some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [dairies, search]);

  const openEdit = (dairy: UserDairy) => {
    setEditing(dairy);
    setForm({
      name: dairy.name ?? "",
      branchname: dairy.branchname ?? "",
      ownername: dairy.ownername ?? "",
      days: dairy.days != null ? String(dairy.days) : "10",
      villagename: dairy.villagename ?? "",
      address: dairy.address ?? "",
      cc: toSel(dairy.cc_id),
      bmc: toSel(dairy.bmc_id),
      route: toSel(dairy.route_id),
      bank: {
        bank_name: dairy.bank_name ?? "",
        account_holder: dairy.account_holder ?? "",
        account_number: dairy.account_number ?? "",
        ifsc_code: dairy.ifsc_code ?? "",
      },
    });
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
    setForm(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !form) return;

    const name = form.name.trim();
    const branchname = form.branchname.trim();
    const ownername = form.ownername.trim();
    if (!name || !branchname || !ownername) {
      toast.error(t("please_fill_dairy_branch_owner_name", "Please fill Dairy Name, Branch Name and Owner Name"));
      return;
    }

    // Send only what changed. For the hierarchy that also keeps the API's
    // route inheritance working: change just the route and the untouched
    // BMC / CC follow it, exactly as on create.
    const payload: UpdateDairyPayload = {};
    if (name !== (editing.name ?? "")) payload.name = name;
    if (branchname !== (editing.branchname ?? "")) payload.branchname = branchname;
    if (ownername !== (editing.ownername ?? "")) payload.ownername = ownername;
    if (Number(form.days) !== Number(editing.days)) payload.days = Number(form.days);
    const village = form.villagename.trim();
    if (village !== (editing.villagename ?? "")) payload.villagename = village || null;
    const address = form.address.trim();
    if (address !== (editing.address ?? "")) payload.address = address || null;
    if (form.cc !== toSel(editing.cc_id)) payload.cc_id = fromSel(form.cc);
    if (form.bmc !== toSel(editing.bmc_id)) payload.bmc_id = fromSel(form.bmc);
    if (form.route !== toSel(editing.route_id)) payload.route_id = fromSel(form.route);
    const bankError = validateDairyBank(form.bank);
    if (bankError) {
      toast.error(bankError);
      return;
    }
    (Object.keys(form.bank) as (keyof DairyBankValues)[]).forEach((key) => {
      const value = form.bank[key].trim();
      if (value !== (editing[key] ?? "")) payload[key] = value || null;
    });

    if (!Object.keys(payload).length) {
      toast.info(t("other_expense_no_changes", "No changes to save"));
      closeEdit();
      return;
    }

    setSaving(true);
    try {
      const res = await createDairyApi.updateDairy(editing.dairy_id, payload);
      if (res?.success === false) throw new Error(res?.message);
      toast.success(t("dairy_updated_successfully", "Dairy updated successfully"));
      setEditing(null);
      setForm(null);
      loadDairies();
      // Names show up in every dairy dropdown in the app.
      if (email) dispatch(fetchUserBranches(email));
    } catch (error) {
      toast.error(errorMessage(error) || t("failed_to_update_dairy", "Failed to update dairy"));
    } finally {
      setSaving(false);
    }
  };

  const ccOptions = editing ? withCurrent(ccList, "cc_id", editing.cc_id, editing.cc_name) : [];
  const bmcOptions = editing ? withCurrent(bmcList, "bmc_id", editing.bmc_id, editing.bmc_name) : [];
  const routeOptions = editing ? withCurrent(routeList, "route_id", editing.route_id, editing.route_name) : [];
  const dayOptions = form && !BILLING_DAYS.includes(form.days) ? [form.days, ...BILLING_DAYS] : BILLING_DAYS;

  const hierarchyChips = (d: UserDairy) => {
    const chips = [
      d.cc_id && { key: "cc", icon: <Snowflake className="h-3 w-3 text-purple-500" />, text: d.cc_name || String(d.cc_id) },
      d.bmc_id && { key: "bmc", icon: <Warehouse className="h-3 w-3 text-blue-500" />, text: d.bmc_name || String(d.bmc_id) },
      d.route_id && { key: "route", icon: <RouteIcon className="h-3 w-3 text-green-500" />, text: d.route_name || String(d.route_id) },
    ].filter(Boolean) as { key: string; icon: ReactNode; text: string }[];
    if (!chips.length) return <span className="text-slate-400">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {chips.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
            {c.icon}
            {c.text}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl py-0 gap-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100/50 bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-800">{t("my_dairies", "My Dairies")}</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tabular-nums">
            {dairies.length}
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search_dairies", "Search dairies...")}
              className="h-9 pl-9 pr-8 bg-white border-gray-200 rounded-lg text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700"
                aria-label={t("clear", "Clear")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={loadDairies}
            disabled={loading}
            className="h-9 w-9 shrink-0 rounded-lg"
            aria-label={t("refresh", "Refresh")}
            title={t("refresh", "Refresh")}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <CardContent className="p-0">
        <div className={`overflow-x-auto transition-opacity ${loading && dairies.length > 0 ? "opacity-60" : ""}`}>
          <Table className="min-w-[860px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className={headClass}>{t("dairy_id", "Dairy ID")}</TableHead>
                <TableHead className={headClass}>{t("dairy_name", "Dairy Name")}</TableHead>
                <TableHead className={headClass}>{t("branch_name", "Branch Name")}</TableHead>
                <TableHead className={headClass}>{t("owner_name", "Owner Name")}</TableHead>
                <TableHead className={headClass}>{t("village_name", "Village Name")}</TableHead>
                <TableHead className={`${headClass} text-right`}>{t("billing_days", "Billing Days")}</TableHead>
                <TableHead className={headClass}>{t("hierarchy", "Hierarchy")}</TableHead>
                <TableHead className="w-16 h-11">
                  <span className="sr-only">{t("actions", "Actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && dairies.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      {t("loading", "Loading...")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="py-12 text-center">
                    <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      {dairies.length === 0
                        ? t("no_dairies_assigned", "No dairies are assigned to your login yet")
                        : t("no_dairies_match_search", "No dairies match your search")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow key={d.dairy_id} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors">
                    <TableCell className="text-left whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-800">{d.username ? `${vlcNo.prefix(d.username)}${d.username}` : "—"}</span>
                      {Number(d.active) === 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-bold uppercase">
                          {t("inactive", "Inactive")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-left font-semibold text-slate-800">{d.name}</TableCell>
                    <TableCell className="text-left text-slate-600">{d.branchname || "—"}</TableCell>
                    <TableCell className="text-left text-slate-600">
                      {d.ownername || "—"}
                      {d.mobile_number && <div className="text-xs text-slate-400 tabular-nums">{d.mobile_number}</div>}
                    </TableCell>
                    <TableCell className="text-left text-slate-600">{d.villagename || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-700">{d.days ?? "—"}</TableCell>
                    <TableCell className="text-left">{hierarchyChips(d)}</TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(d)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        aria-label={t("edit_dairy", "Edit Dairy")}
                        title={t("edit_dairy", "Edit Dairy")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* ---- Edit dialog ---- */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="bg-white rounded-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              <Pencil className="h-5 w-5 text-blue-600" />
              {t("edit_dairy", "Edit Dairy")}
            </DialogTitle>
            <DialogDescription className="text-left text-slate-500">
              {editing ? `${editing.username ?? ""}${editing.username ? " · " : ""}${editing.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          {form && (
            <form onSubmit={handleSave} className="space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_dairy_name" className={labelClass}>
                    {t("dairy_name", "Dairy Name")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit_dairy_name"
                    value={form.name}
                    onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_dairy_branch" className={labelClass}>
                    {t("branch_name", "Branch Name")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit_dairy_branch"
                    value={form.branchname}
                    onChange={(e) => setForm((f) => f && { ...f, branchname: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_dairy_owner" className={labelClass}>
                    {t("owner_name", "Owner Name")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit_dairy_owner"
                    value={form.ownername}
                    onChange={(e) => setForm((f) => f && { ...f, ownername: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>{t("mobile_number", "Mobile Number")}</Label>
                  <Input
                    value={editing?.mobile_number ?? ""}
                    readOnly
                    className="h-10 bg-gray-50 border-gray-200 text-gray-500 rounded-lg font-medium cursor-not-allowed text-sm shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>{t("billing_days", "Billing Days")}</Label>
                  <Select value={form.days} onValueChange={(v) => setForm((f) => f && { ...f, days: v })}>
                    <SelectTrigger className="h-10 bg-white border-gray-200 rounded-lg w-full text-sm shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-100 shadow-xl z-[100]">
                      {dayOptions.map((d) => (
                        <SelectItem key={d} value={d}>{d} Days</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_dairy_village" className={labelClass}>{t("village_name", "Village Name")}</Label>
                  <Input
                    id="edit_dairy_village"
                    value={form.villagename}
                    onChange={(e) => setForm((f) => f && { ...f, villagename: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit_dairy_address" className={labelClass}>{t("address", "Address")}</Label>
                  <Input
                    id="edit_dairy_address"
                    value={form.address}
                    onChange={(e) => setForm((f) => f && { ...f, address: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Label className="text-sm font-bold text-slate-800 mb-2 block">
                  {t("assign_to_hierarchy", "Assign to Hierarchy")} <span className="text-slate-500 font-normal">{t("optional", "(optional)")}</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    { key: "cc", label: t("cc_chilling_center", "CC (Chilling Center)"), icon: <Snowflake className="h-3.5 w-3.5 text-purple-500" />, options: ccOptions },
                    { key: "bmc", label: t("bmc", "BMC"), icon: <Warehouse className="h-3.5 w-3.5 text-blue-500" />, options: bmcOptions },
                    { key: "route", label: t("route", "Route"), icon: <RouteIcon className="h-3.5 w-3.5 text-green-500" />, options: routeOptions },
                  ] as const).map(({ key, label, icon, options }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        {icon}
                        {label}
                      </Label>
                      <Select value={form[key]} onValueChange={(v) => setForm((f) => f && { ...f, [key]: v })}>
                        <SelectTrigger className="h-10 bg-white border-gray-200 rounded-lg w-full text-sm shadow-sm">
                          <SelectValue placeholder={t("none", "None")} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-100 shadow-xl z-[100]">
                          <SelectItem value={NONE}>{t("none", "None")}</SelectItem>
                          {options.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                              {o.id}{o.name ? ` — ${o.name}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {t(
                    "edit_dairy_route_hint",
                    "Changing only the Route moves the dairy to that route's BMC and CC as well."
                  )}
                </p>
              </div>

              <DairyBankFields
                idPrefix="edit_dairy_"
                values={form.bank}
                onChange={(patch) => setForm((f) => f && { ...f, bank: { ...f.bank, ...patch } })}
              />

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeEdit} disabled={saving}>
                  {t("cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t("save", "Save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserDairiesList;
