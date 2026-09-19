import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { useAppSelector } from "@/redux/store";
import {
  dairyEquipmentApi,
  DEFAULT_EQUIPMENT,
  type DairyEquipment as DairyEquipmentRecord,
  type DairyEquipmentItem,
  type EquipmentDairy,
} from "@/services/dairyEquipmentApi";
import { exportDeliveredEquipmentPdf } from "@/utils/dairyEquipmentPdf";
import { toast } from "react-toastify";
import { AlertTriangle, Building2, Download, Loader2, Package, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";

interface EquipmentForm {
  equipment_name: string;
  quantity: string;
  serial_number: string;
}

const emptyForm = (): EquipmentForm => ({ equipment_name: "", quantity: "", serial_number: "" });

// Blank means one item, matching the API's default.
const isValidQuantity = (value: string) => !value.trim() || /^[1-9]\d*$/.test(value.trim());

const displayDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Axios puts the server's message on response.data; fall back to the thrown message.
const errorInfo = (error: unknown) => {
  const e = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
  return { status: e?.response?.status, message: e?.response?.data?.message || e?.message || "" };
};

const focusField = (id: string) => setTimeout(() => document.getElementById(id)?.focus(), 30);

const inputClass =
  "h-10 rounded-xl border-slate-200 bg-slate-50 hover:border-blue-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all";
const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider";
const cardClass = "border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-2xl py-0 gap-0";

const DairyEquipment = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const userData = useAppSelector((state) => state.authData.userData);

  // The dairy comes from the web user's branches, or from a Dairy ID lookup for
  // dairies not assigned to them yet (e.g. just created).
  const [dairy, setDairy] = useState<EquipmentDairy | null>(null);
  const [dairyCode, setDairyCode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [items, setItems] = useState<DairyEquipmentRecord[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  // Every endpoint answers 503 until the dairy_equipment migration has been run.
  const [unavailable, setUnavailable] = useState(false);
  const requestRef = useRef(0);

  const [addForm, setAddForm] = useState<EquipmentForm>(emptyForm);
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<DairyEquipmentRecord | null>(null);
  const [editForm, setEditForm] = useState<EquipmentForm>(emptyForm);
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState<DairyEquipmentRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const dairyId = dairy?.branch_id ?? null;
  const unavailableMessage = t("dairy_equipment_unavailable", "Dairy equipment is not enabled on the server yet");
  const suggestions = DEFAULT_EQUIPMENT.filter(
    (name) => !items.some((item) => item.equipment_name.toLowerCase() === name.toLowerCase())
  );

  const loadEquipment = useCallback(async () => {
    // Bumping the id first means a slow, older response can never overwrite a newer one.
    const requestId = ++requestRef.current;
    if (!dairyId) {
      setItems([]);
      setTotalQuantity(0);
      return;
    }

    setListLoading(true);
    try {
      const res = await dairyEquipmentApi.list(dairyId);
      if (requestId !== requestRef.current) return;
      setItems(Array.isArray(res?.data) ? res.data : []);
      setTotalQuantity(Number(res?.total_quantity) || 0);
      setUnavailable(false);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setItems([]);
      setTotalQuantity(0);
      const { status, message } = errorInfo(error);
      if (status === 503) setUnavailable(true);
      else toast.error(message || t("failed_to_load_equipment", "Failed to load equipment"));
    } finally {
      if (requestId === requestRef.current) setListLoading(false);
    }
  }, [dairyId, t]);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const selectDairy = (next: EquipmentDairy | null) => {
    setDairy(next);
    setAddForm(emptyForm());
    if (next) focusField("equipment-name");
  };

  const handleBranchChange = (value: string) => {
    const branch = branches?.find((b) => String(b.branch_id) === value);
    selectDairy(branch ? { branch_id: branch.branch_id, username: branch.username, name: branch.name, branchName: branch.branchName } : null);
    setDairyCode("");
  };

  const handleLookup = async (e?: FormEvent) => {
    e?.preventDefault();
    const code = dairyCode.trim();
    if (!code) return;

    setLookingUp(true);
    try {
      const res = await dairyEquipmentApi.lookupDairy(code);
      if (res?.success === false || !res?.data) throw new Error(res?.message);
      selectDairy(res.data);
    } catch (error) {
      const { status, message } = errorInfo(error);
      toast.error(
        status === 404
          ? t("dairy_id_not_found", { code, defaultValue: "No dairy found with Dairy ID {{code}}" })
          : message || t("failed_to_find_dairy", "Failed to find dairy")
      );
    } finally {
      setLookingUp(false);
    }
  };

  // Shared handling for errors every write can hit.
  const handleWriteError = (error: unknown, fallback: string) => {
    const { status, message } = errorInfo(error);
    if (status === 503) {
      setUnavailable(true);
      toast.error(unavailableMessage);
    } else if (status === 404) {
      toast.error(message || t("equipment_not_found", "This equipment no longer exists"));
      loadEquipment();
    } else {
      toast.error(message || fallback);
    }
    return status;
  };

  // ---- Add ----
  const handleAdd = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!dairyId) return;

    const name = addForm.equipment_name.trim();
    if (!name) {
      toast.error(t("enter_a_field_name", "Enter a field name"));
      focusField("equipment-name");
      return;
    }
    if (!isValidQuantity(addForm.quantity)) {
      toast.error(t("equipment_quantity_invalid", {
        name,
        defaultValue: "Quantity for {{name}} must be a whole number of at least 1",
      }));
      focusField("equipment-quantity");
      return;
    }
    if (items.some((item) => item.equipment_name.toLowerCase() === name.toLowerCase())) {
      toast.error(t("equipment_already_added", {
        name,
        defaultValue: "{{name}} is already added to this dairy — edit it instead",
      }));
      return;
    }

    setAdding(true);
    try {
      const res = await dairyEquipmentApi.create({
        dairy_id: dairyId,
        equipment_name: name,
        quantity: addForm.quantity.trim() ? Number(addForm.quantity) : 1,
        serial_number: addForm.serial_number.trim() || null,
        created_by: userData?.name || userData?.email || "web",
      });
      if (res?.success === false) throw new Error(res?.message);
      toast.success(t("equipment_added", { name, defaultValue: "{{name}} added" }));
      setAddForm(emptyForm());
      focusField("equipment-name");
      loadEquipment();
    } catch (error) {
      // 409: someone else added it meanwhile — show the current list.
      if (handleWriteError(error, t("failed_to_save_equipment", "Failed to save equipment")) === 409) loadEquipment();
    } finally {
      setAdding(false);
    }
  };

  // ---- Edit ----
  const openEdit = (item: DairyEquipmentRecord) => {
    setEditing(item);
    setEditForm({
      equipment_name: item.equipment_name,
      quantity: String(item.quantity ?? ""),
      serial_number: item.serial_number ?? "",
    });
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    const name = editForm.equipment_name.trim();
    if (!name) {
      toast.error(t("enter_a_field_name", "Enter a field name"));
      return;
    }
    if (!isValidQuantity(editForm.quantity)) {
      toast.error(t("equipment_quantity_invalid", {
        name,
        defaultValue: "Quantity for {{name}} must be a whole number of at least 1",
      }));
      return;
    }

    // Send only what changed — the API applies partial updates.
    const payload: Partial<DairyEquipmentItem> = {};
    const quantity = editForm.quantity.trim() ? Number(editForm.quantity) : 1;
    const serial = editForm.serial_number.trim() || null;
    if (name !== editing.equipment_name) payload.equipment_name = name;
    if (quantity !== Number(editing.quantity)) payload.quantity = quantity;
    if (serial !== (editing.serial_number || null)) payload.serial_number = serial;

    if (!Object.keys(payload).length) {
      toast.info(t("other_expense_no_changes", "No changes to save"));
      setEditing(null);
      return;
    }

    setEditSaving(true);
    try {
      const res = await dairyEquipmentApi.update(editing.id, payload);
      if (res?.success === false) throw new Error(res?.message);
      toast.success(t("equipment_updated", "Equipment updated"));
      setEditing(null);
      loadEquipment();
    } catch (error) {
      if (handleWriteError(error, t("failed_to_update_equipment", "Failed to update equipment")) === 404) {
        setEditing(null);
      }
    } finally {
      setEditSaving(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await dairyEquipmentApi.remove(deleting.id);
      if (res?.success === false) throw new Error(res?.message);
      const removed: DairyEquipmentRecord = res?.data ?? deleting;
      toast.success(t("equipment_deleted", {
        name: removed.equipment_name,
        defaultValue: "Removed {{name}}",
        interpolation: { escapeValue: false },
      }));
      setDeleting(null);
      loadEquipment();
    } catch (error) {
      if (handleWriteError(error, t("failed_to_delete_equipment", "Failed to delete equipment")) === 404) {
        setDeleting(null);
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  // ---- Export ----
  const handleExportPdf = async () => {
    if (!dairy || items.length === 0) {
      toast.error(t("no_data_available", "No data available"));
      return;
    }
    setExporting(true);
    try {
      await exportDeliveredEquipmentPdf(dairy, items);
      toast.success(t("pdf_exported_successfully", "PDF exported successfully"));
    } catch (error) {
      console.error("Failed to export equipment PDF:", error);
      toast.error(t("failed_to_export_pdf", "Failed to export PDF"));
    } finally {
      setExporting(false);
    }
  };

  const selectedInBranches = dairyId != null && branches?.some((b) => b.branch_id === dairyId);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header — pick a dairy from your branches, or find one by its Dairy ID */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Package className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
                {t("dairy_equipment", "Dairy Equipment")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("dairy_equipment_subtitle", "Add, update or remove the equipment delivered to a dairy")}
              </p>
            </div>
          </div>
          <div className="w-full lg:w-auto grid grid-cols-1 sm:grid-cols-2 gap-3 lg:min-w-[580px] text-left">
            <div className="space-y-1.5 min-w-0">
              <Label className={labelClass}>{t("select_dairy", "Select Dairy")}</Label>
              <VLCDropdown
                branches={branches || []}
                value={selectedInBranches ? String(dairyId) : ""}
                onChange={handleBranchChange}
                placeholder={t("select_dairy", "Select Dairy")}
                className="h-11 bg-white shadow-sm"
                valueKey="branch_id"
              />
            </div>
            <form onSubmit={handleLookup} className="space-y-1.5 min-w-0">
              <Label htmlFor="equipment-dairy-code" className={labelClass}>
                {t("or_find_by_dairy_id", "Or find by Dairy ID")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="equipment-dairy-code"
                  value={dairyCode}
                  onChange={(e) => setDairyCode(e.target.value)}
                  placeholder={t("eg_dairy_id", "e.g. 500123")}
                  className="h-11 rounded-xl border-slate-200 bg-white shadow-sm"
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={lookingUp || !dairyCode.trim()}
                  className="h-11 px-3 rounded-xl shrink-0"
                  aria-label={t("search", "Search")}
                  title={t("search", "Search")}
                >
                  {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {!dairy ? (
          <Card className={cardClass}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                  <Building2 className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{t("select_dairy", "Select Dairy")}</h3>
                <p className="text-slate-500 max-w-sm text-sm">
                  {t(
                    "select_dairy_to_manage_equipment",
                    "Pick a dairy, or enter the Dairy ID shown when it was created, to manage its equipment"
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {unavailable && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">{unavailableMessage}</p>
                  <p className="text-sm text-amber-800 mt-1">
                    {t(
                      "dairy_equipment_unavailable_desc",
                      "The dairy_equipment database migration has not been run yet. Once it is, refresh this page."
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6 items-start">

              {/* ---- Add equipment ---- */}
              <Card className={`${cardClass} xl:col-span-2`}>
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 border-b border-slate-100 text-left">
                  <h2 className="text-base font-bold text-slate-800">{t("add_equipment", "Add Equipment")}</h2>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">
                    <span className="font-semibold text-slate-700">{dairy.username}</span>
                    {" · "}{dairy.name}{dairy.branchName ? ` · ${dairy.branchName}` : ""}
                  </p>
                </div>

                <CardContent className="p-5">
                  <form onSubmit={handleAdd} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <Label htmlFor="equipment-name" className={labelClass}>
                        {t("equipment_name", "Equipment")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="equipment-name"
                        value={addForm.equipment_name}
                        onChange={(e) => setAddForm((f) => ({ ...f, equipment_name: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusField("equipment-quantity");
                          }
                        }}
                        placeholder={t("add_custom_equipment", "Add custom equipment...")}
                        className={`${inputClass} font-medium`}
                      />
                      {suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {suggestions.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                setAddForm((f) => ({ ...f, equipment_name: name }));
                                focusField("equipment-quantity");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="equipment-quantity" className={labelClass}>{t("qty", "Qty")}</Label>
                        <Input
                          id="equipment-quantity"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          placeholder="1"
                          value={addForm.quantity}
                          onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              focusField("equipment-serial");
                            }
                          }}
                          className={`${inputClass} font-bold text-blue-700`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="equipment-serial" className={labelClass}>{t("serial_no", "Serial No.")}</Label>
                        <Input
                          id="equipment-serial"
                          placeholder={t("eg_sn_001", "e.g. SN-001")}
                          value={addForm.serial_number}
                          onChange={(e) => setAddForm((f) => ({ ...f, serial_number: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={adding || unavailable}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 rounded-xl text-base font-bold shadow-lg shadow-blue-200/50 active:scale-[0.99] transition-all"
                    >
                      {adding ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {t("saving", "Saving...")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Plus className="w-5 h-5" />
                          {t("add_equipment", "Add Equipment")}
                        </span>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* ---- Equipment list ---- */}
              <Card className={`${cardClass} xl:col-span-3`}>
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-800 text-left">
                    {t("delivered_equipment", "Delivered Equipment")}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600 tabular-nums">
                      {items.length} {t("equipment_types", "Types")}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 tabular-nums">
                      {totalQuantity} {t("equipment_units", "Units")}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportPdf}
                      disabled={exporting || listLoading || items.length === 0}
                      className="h-8 gap-1.5 rounded-lg bg-white font-semibold text-slate-700"
                    >
                      {exporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-blue-600" />
                      )}
                      {t("export_pdf", "Export PDF")}
                    </Button>
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className={`overflow-x-auto transition-opacity ${listLoading && items.length > 0 ? "opacity-60" : ""}`}>
                    <Table className="min-w-[600px]">
                      <TableHeader className="bg-slate-50">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          <TableHead className={`${labelClass} text-left h-11 text-slate-600`}>{t("equipment_name", "Equipment")}</TableHead>
                          <TableHead className={`${labelClass} text-right h-11 text-slate-600`}>{t("qty", "Qty")}</TableHead>
                          <TableHead className={`${labelClass} text-left h-11 text-slate-600`}>{t("serial_no", "Serial No.")}</TableHead>
                          <TableHead className={`${labelClass} text-left h-11 text-slate-600`}>{t("added_by", "Added by")}</TableHead>
                          <TableHead className={`${labelClass} text-left h-11 text-slate-600`}>{t("last_updated", "Last Updated")}</TableHead>
                          <TableHead className="w-24 h-11">
                            <span className="sr-only">{t("actions", "Actions")}</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listLoading && items.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="py-14">
                              <div className="flex items-center justify-center gap-2 text-slate-500">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                {t("loading", "Loading...")}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : items.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="py-14 text-center">
                              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-sm text-slate-500">
                                {t("no_equipment_delivered_yet", "No equipment delivered yet")}
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          items.map((item) => (
                            <TableRow key={item.id} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors">
                              <TableCell className="text-left font-semibold text-slate-800">{item.equipment_name}</TableCell>
                              <TableCell className="text-right font-bold text-slate-900 tabular-nums">{item.quantity}</TableCell>
                              <TableCell className="text-left text-slate-600 font-mono text-xs break-all max-w-[180px]">
                                {item.serial_number || "—"}
                              </TableCell>
                              <TableCell className="text-left text-slate-500">{item.created_by || "—"}</TableCell>
                              <TableCell className="text-left whitespace-nowrap text-slate-500">
                                {displayDate(item.updated_at || item.created_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(item)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    aria-label={t("edit_equipment", "Edit Equipment")}
                                    title={t("edit_equipment", "Edit Equipment")}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleting(item)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    aria-label={t("delete_equipment", "Delete Equipment")}
                                    title={t("delete_equipment", "Delete Equipment")}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* ---- Edit dialog ---- */}
        <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !editSaving) setEditing(null); }}>
          <DialogContent className="bg-white rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-left">
                <Pencil className="w-5 h-5 text-blue-600" />
                {t("edit_equipment", "Edit Equipment")}
              </DialogTitle>
              <DialogDescription className="text-left text-slate-500">
                {dairy ? `${dairy.username} · ${dairy.name}` : ""}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="edit_equipment_name" className={labelClass}>{t("equipment_name", "Equipment")}</Label>
                <Input
                  id="edit_equipment_name"
                  value={editForm.equipment_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, equipment_name: e.target.value }))}
                  className={`${inputClass} font-medium`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_equipment_quantity" className={labelClass}>{t("qty", "Qty")}</Label>
                  <Input
                    id="edit_equipment_quantity"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    placeholder="1"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                    className={`${inputClass} font-bold text-blue-700`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_equipment_serial" className={labelClass}>{t("serial_no", "Serial No.")}</Label>
                  <Input
                    id="edit_equipment_serial"
                    placeholder={t("eg_sn_001", "e.g. SN-001")}
                    value={editForm.serial_number}
                    onChange={(e) => setEditForm((f) => ({ ...f, serial_number: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={editSaving}>
                  {t("cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={editSaving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t("save", "Save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ---- Delete confirmation ---- */}
        <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !deleteBusy) setDeleting(null); }}>
          <DialogContent className="bg-white rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-left">
                <Trash2 className="w-5 h-5 text-rose-600" />
                {t("delete_equipment", "Delete Equipment")}
              </DialogTitle>
              <DialogDescription className="text-left text-slate-500">
                {t("delete_equipment_confirm", "This equipment will be removed from the dairy's records permanently.")}
              </DialogDescription>
            </DialogHeader>
            {deleting && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-left">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 leading-6 truncate">{deleting.equipment_name}</p>
                  <p className="text-xs text-slate-500 leading-5 truncate">
                    {t("serial_no", "Serial No.")}: {deleting.serial_number || "—"}
                  </p>
                </div>
                <p className="font-bold text-rose-700 tabular-nums whitespace-nowrap">
                  {t("qty", "Qty")} {deleting.quantity}
                </p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
                {t("cancel", "Cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleteBusy}
                className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
              >
                {deleteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t("delete", "Delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DairyEquipment;
