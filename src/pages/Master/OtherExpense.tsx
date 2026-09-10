import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
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
import { reportsApi, type OtherExpense as OtherExpenseRecord, type OtherExpenseUpdate } from "@/services/reportsApi";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

interface ExpenseRow {
  id: string;
  name: string;
  // Kept as typed so the input can hold partial values like "12.".
  amount: string;
}

interface EditForm {
  date: string;
  expense_name: string;
  amount: string;
  created_by: string;
}

const PAGE_SIZE = 50;

const newRow = (): ExpenseRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  amount: "",
});

const pad = (n: number) => String(n).padStart(2, "0");

// Local calendar date — toISOString() would roll back a day before 05:30 IST.
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => localDate(new Date());

// First to last day of the month containing `dateStr`.
const monthRange = (dateStr = today()) => {
  const [y, m] = dateStr.split("-").map(Number);
  return { from: `${y}-${pad(m)}-01`, to: localDate(new Date(y, m, 0)) };
};

// The API may send a bare date or a timestamp; date inputs need YYYY-MM-DD.
const toDateOnly = (value: string | null | undefined) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? value.slice(0, 10) : localDate(d);
};

const displayDate = (value: string) => {
  const [y, m, d] = toDateOnly(value).split("-").map(Number);
  if (!y || !m || !d) return value || "—";
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

const OtherExpense = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const userData = useAppSelector((state) => state.authData.userData);

  const [selectedVlc, setSelectedVlc] = useState("");

  // ---- New expenses form ----
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<ExpenseRow[]>([newRow()]);
  const [saving, setSaving] = useState(false);

  // ---- Saved expenses list ----
  const [fromDate, setFromDate] = useState(() => monthRange().from);
  const [toDate, setToDate] = useState(() => monthRange().to);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [expenses, setExpenses] = useState<OtherExpenseRecord[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalAmount, setListTotalAmount] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  // Every endpoint answers 503 until the other_expenses migration has been run.
  const [unavailable, setUnavailable] = useState(false);
  const requestRef = useRef(0);

  // ---- Edit / delete dialogs ----
  const [editing, setEditing] = useState<OtherExpenseRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ date: "", expense_name: "", amount: "", created_by: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState<OtherExpenseRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const formTotal = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const unavailableMessage = t("other_expense_unavailable", "Other expenses are not enabled on the server yet");

  // Wait for a pause in typing before searching; a new search starts from page one.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadExpenses = useCallback(async () => {
    // Bumping the id first means a slow, older response can never overwrite a newer one.
    const requestId = ++requestRef.current;
    if (!selectedVlc) {
      setExpenses([]);
      setListTotal(0);
      setListTotalAmount(0);
      return;
    }

    setListLoading(true);
    try {
      const res = await reportsApi.getOtherExpenses({
        dairy_id: selectedVlc,
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
        ...(debouncedSearch && { search: debouncedSearch }),
        limit: PAGE_SIZE,
        offset,
      });
      if (requestId !== requestRef.current) return;
      setExpenses(Array.isArray(res?.data) ? res.data : []);
      setListTotal(Number(res?.total) || 0);
      setListTotalAmount(Number(res?.total_amount) || 0);
      setUnavailable(false);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setExpenses([]);
      setListTotal(0);
      setListTotalAmount(0);
      const { status, message } = errorInfo(error);
      if (status === 503) setUnavailable(true);
      else toast.error(message || t("failed_to_load_other_expenses", "Failed to load expenses"));
    } finally {
      if (requestId === requestRef.current) setListLoading(false);
    }
  }, [selectedVlc, fromDate, toDate, debouncedSearch, offset, t]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Totals cover every matching row, so any add / edit / delete re-reads the list.
  const refreshList = (toFirstPage = false) => {
    if (toFirstPage && offset !== 0) setOffset(0); // the offset change triggers the reload
    else loadExpenses();
  };

  const handleFromChange = (value: string) => {
    setFromDate(value);
    if (value && toDate && value > toDate) setToDate(value);
    setOffset(0);
  };

  const handleToChange = (value: string) => {
    setToDate(value);
    if (value && fromDate && value < fromDate) setFromDate(value);
    setOffset(0);
  };

  // ---- New expenses ----
  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const updateRow = (id: string, patch: Partial<ExpenseRow>) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const removeRow = (id: string) =>
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length ? next : [newRow()];
    });

  // Enter walks name → amount → next row; on a filled last row it opens a new one.
  const handleAmountEnter = (e: KeyboardEvent, idx: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const row = rows[idx];
    if (idx < rows.length - 1) {
      focusField(`expense-name-${idx + 1}`);
    } else if (row.name.trim() && row.amount) {
      addRow();
      focusField(`expense-name-${idx + 1}`);
    } else {
      focusField("other-expense-save");
    }
  };

  const handleSave = async () => {
    if (!selectedVlc || !date) {
      toast.error(t("other_expense_select_vlc_date", "Please select a VLC and date"));
      return;
    }

    // Fully blank rows are skipped; a half-filled one blocks the save.
    const filled = rows.filter((row) => row.name.trim() || row.amount);
    if (!filled.length || filled.some((row) => !row.name.trim() || !(parseFloat(row.amount) > 0))) {
      toast.error(t("other_expense_fill_rows", "Enter a name and an amount greater than zero for every expense"));
      return;
    }

    setSaving(true);
    const createdBy = userData?.name || userData?.email || "web";
    // One POST per expense. Rows that saved are dropped from the form, so retrying
    // after a partial failure never records the same expense twice.
    const results = await Promise.allSettled(
      filled.map(async (row) => {
        const res = await reportsApi.createOtherExpense({
          dairy_id: Number(selectedVlc),
          date,
          expense_name: row.name.trim(),
          amount: parseFloat(row.amount),
          created_by: createdBy,
        });
        if (res?.success === false) throw new Error(res?.message);
        return res;
      })
    );
    setSaving(false);

    const savedIds = new Set(
      filled.filter((_, i) => results[i].status === "fulfilled").map((row) => row.id)
    );
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");

    if (savedIds.size) {
      toast.success(
        t("other_expense_saved", { count: savedIds.size, defaultValue: "{{count}} expense(s) saved" })
      );
      // Bring the saved date into view: jump the list to its month if it's outside the range.
      if ((fromDate && date < fromDate) || (toDate && date > toDate)) {
        const range = monthRange(date);
        setFromDate(range.from);
        setToDate(range.to);
        setOffset(0);
      } else {
        refreshList(true);
      }
    }
    if (failure) {
      const { status, message } = errorInfo(failure.reason);
      if (status === 503) setUnavailable(true);
      toast.error(
        status === 503 ? unavailableMessage : message || t("failed_to_save_other_expense", "Failed to save other expense")
      );
    }

    const remaining = rows.filter((row) => !savedIds.has(row.id));
    setRows(remaining.length ? remaining : [newRow()]);
  };

  // ---- Edit ----
  const openEdit = (expense: OtherExpenseRecord) => {
    setEditing(expense);
    setEditForm({
      date: toDateOnly(expense.date),
      expense_name: expense.expense_name ?? "",
      amount: String(Number(expense.amount) || ""),
      created_by: expense.created_by ?? "",
    });
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    const name = editForm.expense_name.trim();
    const amount = parseFloat(editForm.amount);
    if (!editForm.date || !name || !(amount > 0)) {
      toast.error(t("other_expense_fill_rows", "Enter a name and an amount greater than zero for every expense"));
      return;
    }

    // Send only what changed — the API applies partial updates.
    const payload: OtherExpenseUpdate = {};
    if (editForm.date !== toDateOnly(editing.date)) payload.date = editForm.date;
    if (name !== editing.expense_name) payload.expense_name = name;
    if (amount !== Number(editing.amount)) payload.amount = amount;
    const createdBy = editForm.created_by.trim();
    if (createdBy !== (editing.created_by ?? "")) payload.created_by = createdBy || null;

    if (!Object.keys(payload).length) {
      toast.info(t("other_expense_no_changes", "No changes to save"));
      setEditing(null);
      return;
    }

    setEditSaving(true);
    try {
      const res = await reportsApi.updateOtherExpense(editing.id, payload);
      if (res?.success === false) throw new Error(res?.message);
      toast.success(t("other_expense_updated", "Expense updated"));
      setEditing(null);
      refreshList();
    } catch (error) {
      const { status, message } = errorInfo(error);
      if (status === 404) {
        toast.error(t("other_expense_not_found", "This expense no longer exists"));
        setEditing(null);
        refreshList();
      } else if (status === 503) {
        setUnavailable(true);
        toast.error(unavailableMessage);
      } else {
        toast.error(message || t("failed_to_update_other_expense", "Failed to update expense"));
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
      const res = await reportsApi.deleteOtherExpense(deleting.id);
      if (res?.success === false) throw new Error(res?.message);
      // The API returns the removed row; fall back to the one we asked to delete.
      const removed: OtherExpenseRecord = res?.data ?? deleting;
      toast.success(
        `${t("other_expense_deleted", {
          name: removed.expense_name,
          defaultValue: "Deleted {{name}}",
          interpolation: { escapeValue: false },
        })} · ${money(Number(removed.amount) || 0)}`
      );
      setDeleting(null);
      // Removing the last row on a later page steps back instead of showing an empty page.
      if (expenses.length === 1 && offset > 0) setOffset(Math.max(0, offset - PAGE_SIZE));
      else loadExpenses();
    } catch (error) {
      const { status, message } = errorInfo(error);
      if (status === 404) {
        toast.error(t("other_expense_not_found", "This expense no longer exists"));
        setDeleting(null);
        refreshList();
      } else if (status === 503) {
        setUnavailable(true);
        toast.error(unavailableMessage);
      } else {
        toast.error(message || t("failed_to_delete_other_expense", "Failed to delete expense"));
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  const pageEnd = Math.min(offset + expenses.length, listTotal);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header — the VLC chosen here drives both the form and the list */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
                {t("other_expense", "Other Expense")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("other_expense_subtitle", "Record VLC expenses such as diesel, electricity or repairs")}
              </p>
            </div>
          </div>
          <div className="w-full md:w-80 space-y-1.5 text-left">
            <Label className={`${labelClass} flex items-center gap-1`}>
              {t("select_vlc_center", "Select VLC Center")} <span className="text-red-500">*</span>
            </Label>
            <VLCDropdown
              branches={branches || []}
              value={selectedVlc}
              onChange={(val) => {
                setSelectedVlc(val);
                setOffset(0);
                focusField("expense-name-0");
              }}
              placeholder={t("select_vlc_center", "Select VLC Center")}
              className="h-11 bg-white shadow-sm"
              valueKey="branch_id"
            />
          </div>
        </div>

        {!selectedVlc ? (
          <Card className={cardClass}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                  <Building2 className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  {t("select_vlc_center", "Select VLC Center")}
                </h3>
                <p className="text-slate-500 max-w-sm text-sm">
                  {t("select_vlc_to_manage_expenses", "Select a VLC to add and view its expenses")}
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
                      "other_expense_unavailable_desc",
                      "The other_expenses database migration has not been run yet. Once it is, refresh this page."
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6 items-start">

              {/* ---- New expenses ---- */}
              <Card className={`${cardClass} xl:col-span-2`}>
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 border-b border-slate-100 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-800 text-left">
                    {t("new_other_expenses", "New Expenses")}
                  </h2>
                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="other_expense_date" className={labelClass}>
                      {t("expense_date", "Expense Date")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="other_expense_date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          focusField("expense-name-0");
                        }
                      }}
                      className="h-10 w-44 rounded-xl border-slate-200 bg-white shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-medium"
                    />
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <span className={`${labelClass} flex-1 text-left`}>{t("expense_name", "Expense name")}</span>
                    <span className={`${labelClass} w-32 text-right`}>{t("amount", "Amount")}</span>
                    <span className="w-9 shrink-0" />
                  </div>

                  <div className="space-y-2">
                    {rows.map((row, idx) => (
                      <div key={row.id} className="flex items-center gap-2">
                        <Input
                          id={`expense-name-${idx}`}
                          value={row.name}
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              focusField(`expense-amount-${idx}`);
                            }
                          }}
                          placeholder={t("expense_name_placeholder", "e.g. Diesel")}
                          className={`${inputClass} flex-1 min-w-0 font-medium`}
                        />
                        <div className="relative w-32 shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₹</span>
                          <Input
                            id={`expense-amount-${idx}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={row.amount}
                            onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                            onKeyDown={(e) => handleAmountEnter(e, idx)}
                            className={`${inputClass} pl-7 text-right font-bold text-blue-700`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          aria-label={t("remove", "Remove")}
                          title={t("remove", "Remove")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <Button type="button" variant="outline" onClick={addRow} className="gap-1.5 rounded-xl">
                      <Plus className="w-4 h-4" />
                      {t("add_other_expense", "Add Expense")}
                    </Button>
                    <p className="text-sm font-bold text-slate-700">
                      {t("total", "Total")}: <span className="text-blue-700 tabular-nums">{money(formTotal)}</span>
                    </p>
                  </div>

                  <Button
                    id="other-expense-save"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 rounded-xl text-base font-bold shadow-lg shadow-blue-200/50 active:scale-[0.99] transition-all"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t("saving", "Saving...")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        {t("save_other_expenses", "Save Expenses")}
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* ---- Saved expenses ---- */}
              <Card className={`${cardClass} xl:col-span-3`}>
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 border-b border-slate-100 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-slate-800 text-left">
                      {t("saved_other_expenses", "Saved Expenses")}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600 tabular-nums">
                        {listTotal} {t("entries", "Entries")}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-sm font-bold text-blue-700 tabular-nums">
                        {money(listTotalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    <div className="space-y-1.5">
                      <Label htmlFor="other_expense_from" className={labelClass}>{t("from_date", "From Date")}</Label>
                      <Input
                        id="other_expense_from"
                        type="date"
                        value={fromDate}
                        onChange={(e) => handleFromChange(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 bg-white font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="other_expense_to" className={labelClass}>{t("to_date", "To Date")}</Label>
                      <Input
                        id="other_expense_to"
                        type="date"
                        value={toDate}
                        onChange={(e) => handleToChange(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 bg-white font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="other_expense_search" className={labelClass}>{t("search", "Search")}</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="other_expense_search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder={t("search_other_expenses", "Search expense name")}
                          className="h-10 pl-9 pr-8 rounded-xl border-slate-200 bg-white"
                        />
                        {search && (
                          <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700"
                            aria-label={t("clear", "Clear")}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {!debouncedSearch && listTotal > 0 && (
                    <p className="text-xs text-slate-500 text-left">
                      {t("pl_matches_total", "Same total the P&L deducts for this range")}
                    </p>
                  )}
                </div>

                <CardContent className="p-0">
                  <div className={`overflow-x-auto transition-opacity ${listLoading && expenses.length > 0 ? "opacity-60" : ""}`}>
                    <Table className="min-w-[560px]">
                      <TableHeader className="bg-slate-50">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          <TableHead className={`${labelClass} text-left h-11 text-slate-600`}>{t("date", "Date")}</TableHead>
                          <TableHead className={`${labelClass} text-left h-11 text-slate-600`}>{t("expense_name", "Expense name")}</TableHead>
                          <TableHead className={`${labelClass} text-right h-11 text-slate-600`}>{t("amount", "Amount")}</TableHead>
                          <TableHead className={`${labelClass} text-left h-11 text-slate-600`}>{t("added_by", "Added by")}</TableHead>
                          <TableHead className="w-24 h-11">
                            <span className="sr-only">{t("actions", "Actions")}</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listLoading && expenses.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="py-14">
                              <div className="flex items-center justify-center gap-2 text-slate-500">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                {t("loading", "Loading...")}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : expenses.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="py-14 text-center">
                              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-sm text-slate-500">
                                {t("no_other_expenses_found", "No expenses found for these filters")}
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          expenses.map((expense) => (
                            <TableRow key={expense.id} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors">
                              <TableCell className="text-left whitespace-nowrap text-slate-600 font-medium">
                                {displayDate(expense.date)}
                              </TableCell>
                              <TableCell className="text-left font-semibold text-slate-800">{expense.expense_name}</TableCell>
                              <TableCell className="text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                                {money(Number(expense.amount) || 0)}
                              </TableCell>
                              <TableCell className="text-left text-slate-500">{expense.created_by || "—"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(expense)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    aria-label={t("edit_other_expense", "Edit Expense")}
                                    title={t("edit_other_expense", "Edit Expense")}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleting(expense)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    aria-label={t("delete_other_expense", "Delete Expense")}
                                    title={t("delete_other_expense", "Delete Expense")}
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

                  {listTotal > PAGE_SIZE && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 bg-slate-50">
                      <p className="text-xs font-semibold text-slate-500 tabular-nums">
                        {t("showing_range", {
                          from: offset + 1,
                          to: pageEnd,
                          total: listTotal,
                          defaultValue: "Showing {{from}}–{{to}} of {{total}}",
                        })}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 rounded-lg"
                          disabled={offset === 0 || listLoading}
                          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          {t("previous", "Previous")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 rounded-lg"
                          disabled={offset + PAGE_SIZE >= listTotal || listLoading}
                          onClick={() => setOffset(offset + PAGE_SIZE)}
                        >
                          {t("next", "Next")}
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
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
                {t("edit_other_expense", "Edit Expense")}
              </DialogTitle>
              <DialogDescription className="text-left text-slate-500">
                {editing ? `${editing.expense_name} · ${displayDate(editing.date)}` : ""}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="edit_expense_date" className={labelClass}>{t("expense_date", "Expense Date")}</Label>
                <Input
                  id="edit_expense_date"
                  type="date"
                  required
                  value={editForm.date}
                  onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_expense_name" className={labelClass}>{t("expense_name", "Expense name")}</Label>
                <Input
                  id="edit_expense_name"
                  value={editForm.expense_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, expense_name: e.target.value }))}
                  className={`${inputClass} font-medium`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_expense_amount" className={labelClass}>{t("amount", "Amount")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₹</span>
                    <Input
                      id="edit_expense_amount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                      className={`${inputClass} pl-7 text-right font-bold text-blue-700`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_expense_by" className={labelClass}>{t("added_by", "Added by")}</Label>
                  <Input
                    id="edit_expense_by"
                    value={editForm.created_by}
                    onChange={(e) => setEditForm((f) => ({ ...f, created_by: e.target.value }))}
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
                {t("delete_other_expense", "Delete Expense")}
              </DialogTitle>
              <DialogDescription className="text-left text-slate-500">
                {t(
                  "delete_other_expense_confirm",
                  "This expense will be removed permanently and will no longer be deducted in the P&L."
                )}
              </DialogDescription>
            </DialogHeader>
            {deleting && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-left">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 leading-6 truncate">{deleting.expense_name}</p>
                  <p className="text-xs text-slate-500 leading-5">
                    {displayDate(deleting.date)}
                    {deleting.created_by ? ` · ${deleting.created_by}` : ""}
                  </p>
                </div>
                <p className="font-bold text-rose-700 tabular-nums whitespace-nowrap">
                  {money(Number(deleting.amount) || 0)}
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

export default OtherExpense;
