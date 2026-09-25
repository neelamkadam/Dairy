import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  RefreshCcw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSelector } from "@/redux/store";
import { cn } from "@/lib/utils";
import { vlcCollectionApi, type VLCWeightRecord } from "@/services/vlcCollectionApi";
import { useVlcSerialNumbers } from "@/pages/CollectionEntry/vlcSerialNumbers";
import { exportVlcCollectionReportExcel, exportVlcCollectionReportPdf } from "@/utils/vlcCollectionReportExport";
import {
  buildVlcCollectionReport,
  totalsOfRows,
  type VlcReportEntry,
  type VlcReportStatus,
} from "./vlcCollectionReportData";
import VlcEntryEditDialog, { type VlcEditTarget } from "./VlcEntryEditDialog";

type Shift = "Morning" | "Evening";
type StatusFilter = "all" | VlcReportStatus;

const pad = (n: number) => String(n).padStart(2, "0");
// Local calendar date — toISOString() would roll back a day before 05:30 IST.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
// Same cut-over as VLC Collection Entry, so the report opens on the shift being collected.
const defaultShift = (): Shift => (new Date().getHours() >= 17 ? "Evening" : "Morning");

const fixed = (n: number | null, digits = 2) => (n == null ? "—" : n.toFixed(digits));
const money = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider";
const cardClass = "border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-2xl py-0 gap-0";
const headClass = "text-xs font-bold text-slate-600 uppercase tracking-wider h-11 whitespace-nowrap";

const STATUS_STYLE: Record<VlcReportStatus, { badge: string; icon: ReactNode }> = {
  completed: { badge: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  pending: { badge: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-3.5 w-3.5" /> },
  not_collected: { badge: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle className="h-3.5 w-3.5" /> },
};

const VlcCollectionEntryReport = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const vlcs = useMemo(() => branches || [], [branches]);
  const serials = useVlcSerialNumbers(vlcs);

  const [date, setDate] = useState(today);
  const [shift, setShift] = useState<Shift>(defaultShift);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const [entries, setEntries] = useState<VlcReportEntry[]>([]);
  const [weights, setWeights] = useState<VLCWeightRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // Weighed-but-not-analysed samples come from a separate table; without it the
  // report still shows completed and not-collected VLCs.
  const [weightsFailed, setWeightsFailed] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  // The row being edited, or null when the dialog is closed.
  const [editTarget, setEditTarget] = useState<VlcEditTarget | null>(null);
  const requestRef = useRef(0);

  const statusText: Record<VlcReportStatus, string> = {
    completed: t("completed", "Completed"),
    pending: t("pending_analysis", "Pending analysis"),
    not_collected: t("not_collected", "Not collected"),
  };

  const load = useCallback(async () => {
    // A slow, older response can never overwrite a newer one.
    const requestId = ++requestRef.current;
    if (!vlcs.length) {
      setEntries([]);
      setWeights([]);
      return;
    }
    const payload = { vlc_ids: vlcs.map((b) => b.username), date, shift };
    setLoading(true);
    const [entriesResult, weightsResult] = await Promise.allSettled([
      vlcCollectionApi.getEntries(payload),
      vlcCollectionApi.getWeights(payload),
    ]);
    if (requestId !== requestRef.current) return;

    const entriesOk = entriesResult.status === "fulfilled" && entriesResult.value?.success;
    setLoadFailed(!entriesOk);
    setEntries(entriesOk ? entriesResult.value.data || [] : []);

    const weightsOk = weightsResult.status === "fulfilled" && weightsResult.value?.success;
    setWeightsFailed(!weightsOk);
    setWeights(weightsOk ? weightsResult.value.data || [] : []);
    setLoading(false);
  }, [vlcs, date, shift]);

  useEffect(() => {
    load();
  }, [load]);

  const report = useMemo(() => buildVlcCollectionReport(vlcs, entries, weights), [vlcs, entries, weights]);
  const { summary } = report;

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return report.groups.filter((g) => {
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (!q) return true;
      return (
        [g.vlcId, g.vlcName, g.branchName].some((v) => v.toLowerCase().includes(q)) ||
        String(serials.numberOf(g.vlcId) ?? "") === q
      );
    });
  }, [report.groups, statusFilter, search, serials]);

  const visibleTotals = totalsOfRows(visibleGroups.flatMap((g) => g.rows));
  const showNumbers = serials.enabled;
  const columnCount = (showNumbers ? 1 : 0) + 12;

  const handleExport = async (kind: "pdf" | "excel") => {
    if (!visibleGroups.length) {
      toast.error(t("no_data_available", "No data available"));
      return;
    }
    const input = {
      date,
      shift,
      groups: visibleGroups,
      summary,
      filterLabel: statusFilter === "all" ? null : { completed: "Completed", pending: "Pending analysis", not_collected: "Not collected" }[statusFilter],
      numberOf: serials.enabled ? serials.numberOf : undefined,
    };
    setExporting(kind);
    try {
      if (kind === "pdf") await exportVlcCollectionReportPdf(input);
      else exportVlcCollectionReportExcel(input);
      toast.success(t(kind === "pdf" ? "pdf_exported_successfully" : "excel_exported_successfully",
        kind === "pdf" ? "PDF exported successfully" : "Excel exported successfully"));
    } catch (error) {
      console.error("Failed to export VLC collection report:", error);
      toast.error(t(kind === "pdf" ? "failed_to_export_pdf" : "failed_to_export_excel",
        kind === "pdf" ? "Failed to export PDF" : "Failed to export Excel"));
    } finally {
      setExporting(null);
    }
  };

  const statusCards: { key: StatusFilter; label: string; value: number; tone: string; icon: ReactNode }[] = [
    { key: "all", label: t("total_vlcs", "Total VLCs"), value: summary.totalVlcs, tone: "text-slate-800", icon: <ClipboardList className="h-5 w-5 text-blue-500" /> },
    { key: "completed", label: statusText.completed, value: summary.completedVlcs, tone: "text-green-700", icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> },
    { key: "pending", label: statusText.pending, value: summary.pendingVlcs, tone: "text-amber-700", icon: <Clock className="h-5 w-5 text-amber-500" /> },
    { key: "not_collected", label: statusText.not_collected, value: summary.notCollectedVlcs, tone: "text-rose-700", icon: <XCircle className="h-5 w-5 text-rose-500" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
                {t("vlc_collection_entry_report", "VLC Collection Entry Report")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("vlc_collection_entry_report_subtitle", "Which VLCs are collected, waiting for analysis, or not collected yet in a shift")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => handleExport("pdf")}
              disabled={!!exporting || loading || !visibleGroups.length}
              className="flex-1 md:flex-none h-10 gap-1.5 rounded-xl font-semibold text-slate-700"
            >
              {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-blue-600" />}
              {t("export_pdf", "Export PDF")}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("excel")}
              disabled={!!exporting || loading || !visibleGroups.length}
              className="flex-1 md:flex-none h-10 gap-1.5 rounded-xl font-semibold text-slate-700"
            >
              {exporting === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
              {t("export_excel", "Export Excel")}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className={cardClass}>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[180px_180px_1fr_auto] gap-4 items-end text-left">
              <div className="space-y-1.5">
                <Label htmlFor="report_date" className={labelClass}>{t("date", "Date")}</Label>
                <Input
                  id="report_date"
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>{t("shift", "Shift")}</Label>
                <Select value={shift} onValueChange={(v) => setShift(v as Shift)}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">
                    <SelectItem value="Morning">{t("morning", "Morning")}</SelectItem>
                    <SelectItem value="Evening">{t("evening", "Evening")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report_search" className={labelClass}>{t("search", "Search")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="report_search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("search_vlc_id_or_name", "VLC ID or name")}
                    className="h-10 pl-9 pr-8 rounded-xl border-slate-200 bg-white"
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
              </div>
              <Button
                variant="outline"
                onClick={load}
                disabled={loading}
                className="h-10 gap-1.5 rounded-xl"
              >
                <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                {t("refresh", "Refresh")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {weightsFailed && !loadFailed && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              {t("vlc_report_weights_unavailable", "Weighed samples could not be loaded, so samples waiting for analysis are not shown. Completed and not-collected VLCs are still correct.")}
            </p>
          </div>
        )}

        {/* Status summary — each card also filters the table */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statusCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(card.key)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all",
                statusFilter === card.key ? "border-blue-500 ring-4 ring-blue-500/10" : "border-transparent hover:border-slate-200"
              )}
            >
              <div>
                <p className={labelClass}>{card.label}</p>
                <p className={cn("text-2xl font-black tabular-nums mt-1", card.tone)}>{card.value}</p>
              </div>
              {card.icon}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 px-1 text-sm text-slate-600">
          <span>
            {t("weight_collected", "Weight collected")}:{" "}
            <b className="text-slate-900 tabular-nums">{(summary.completedWeight + summary.pendingWeight).toFixed(2)} kg</b>
            {summary.pendingWeight > 0 && (
              <span className="text-amber-700"> ({summary.pendingWeight.toFixed(2)} kg {t("awaiting_analysis", "awaiting analysis")})</span>
            )}
          </span>
          <span>{t("total_amount", "Total Amount")}: <b className="text-slate-900 tabular-nums">{money(summary.totalAmount)}</b></span>
          <span>{t("avg_fat", "Avg FAT")}: <b className="text-slate-900 tabular-nums">{fixed(summary.avgFat)}</b></span>
          <span>{t("avg_snf", "Avg SNF")}: <b className="text-slate-900 tabular-nums">{fixed(summary.avgSnf)}</b></span>
        </div>

        {/* Detail */}
        <Card className={cardClass}>
          <CardContent className="p-0">
            <div className={cn("overflow-x-auto transition-opacity", loading && visibleGroups.length > 0 && "opacity-60")}>
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    {showNumbers && <TableHead className={`${headClass} text-center`}>{t("no", "No.")}</TableHead>}
                    <TableHead className={`${headClass} text-left`}>{t("vlc_id", "VLC ID")}</TableHead>
                    <TableHead className={`${headClass} text-left`}>{t("vlc_name", "VLC Name")}</TableHead>
                    <TableHead className={`${headClass} text-left`}>{t("status", "Status")}</TableHead>
                    <TableHead className={`${headClass} text-center`}>{t("sample_id", "Sample ID")}</TableHead>
                    <TableHead className={`${headClass} text-left`}>{t("type", "Type")}</TableHead>
                    <TableHead className={`${headClass} text-right`}>{t("weight", "Weight")} (kg)</TableHead>
                    <TableHead className={`${headClass} text-right`}>{t("fat", "FAT")}</TableHead>
                    <TableHead className={`${headClass} text-right`}>{t("snf", "SNF")}</TableHead>
                    <TableHead className={`${headClass} text-right`}>{t("clr", "CLR")}</TableHead>
                    <TableHead className={`${headClass} text-right`}>{t("rate", "Rate")}</TableHead>
                    <TableHead className={`${headClass} text-right`}>{t("amount", "Amount")}</TableHead>
                    <TableHead className={`${headClass} text-center`}>{t("actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!vlcs.length ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={columnCount} className="py-14 text-center text-sm text-slate-500">
                        {t("no_vlcs_assigned", "No VLCs are assigned to your login")}
                      </TableCell>
                    </TableRow>
                  ) : loadFailed ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={columnCount} className="py-14 text-center">
                        <p className="text-sm text-slate-600 mb-3">{t("failed_to_load_report", "Could not load the report")}</p>
                        <Button variant="outline" size="sm" onClick={load} className="rounded-lg">{t("retry", "Retry")}</Button>
                      </TableCell>
                    </TableRow>
                  ) : loading && entries.length === 0 && weights.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={columnCount} className="py-14">
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                          {t("loading", "Loading...")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : visibleGroups.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={columnCount} className="py-14 text-center text-sm text-slate-500">
                        {t("no_vlcs_match", "No VLCs match these filters")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleGroups.map((group) =>
                      group.rows.map((row, index) => (
                        <TableRow
                          key={row.key}
                          className={cn(
                            "hover:bg-blue-50/40 transition-colors",
                            index === group.rows.length - 1 ? "border-b border-slate-100" : "border-b-0"
                          )}
                        >
                          {index === 0 && (
                            <>
                              {showNumbers && (
                                <TableCell rowSpan={group.rows.length} className="text-center align-top font-bold text-blue-600 tabular-nums">
                                  {serials.numberOf(group.vlcId) ?? ""}
                                </TableCell>
                              )}
                              <TableCell rowSpan={group.rows.length} className="text-left align-top font-mono font-bold text-slate-800">
                                {group.vlcId}
                              </TableCell>
                              <TableCell rowSpan={group.rows.length} className="text-left align-top text-slate-700">
                                <div className="font-semibold">{group.vlcName}</div>
                                {group.branchName && <div className="text-xs text-slate-400">{group.branchName}</div>}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-left">
                            <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", STATUS_STYLE[row.status].badge)}>
                              {STATUS_STYLE[row.status].icon}
                              {statusText[row.status]}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-semibold tabular-nums">{row.sampleId != null ? `#${row.sampleId}` : "—"}</TableCell>
                          <TableCell className="text-left text-slate-600">{row.type ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{fixed(row.weight)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fixed(row.fat)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fixed(row.snf)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fixed(row.clr)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fixed(row.rate)}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{row.amount == null ? "—" : money(row.amount)}</TableCell>
                          <TableCell className="text-center">
                            {/* Nothing to edit on a VLC that has not been collected at all. */}
                            {row.entryId || row.weightId ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditTarget({ row, vlcId: group.vlcId, vlcName: group.vlcName })}
                                aria-label={t("edit_entry", "Edit Entry")}
                                title={t("edit_entry", "Edit Entry")}
                                className="h-8 w-8 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )
                  )}
                  {visibleGroups.length > 0 && !loadFailed && (
                    <TableRow className="bg-slate-100 font-bold hover:bg-slate-100">
                      <TableCell colSpan={(showNumbers ? 1 : 0) + 5} className="text-left">{t("total", "Total")}</TableCell>
                      <TableCell className="text-right tabular-nums">{visibleTotals.weight.toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fixed(visibleTotals.fat)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fixed(visibleTotals.snf)}</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right tabular-nums">{money(visibleTotals.amount)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <VlcEntryEditDialog
          target={editTarget}
          date={date}
          shift={shift}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      </div>
    </div>
  );
};

export default VlcCollectionEntryReport;
