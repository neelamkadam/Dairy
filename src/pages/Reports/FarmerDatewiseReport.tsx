import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { addDays, format, parseISO, isValid } from "date-fns";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppDatePicker } from "@/components/ui/date-picker";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import RouteSelect from "@/components/RouteSelect";
import { useRouteFilter } from "@/hooks/useRouteFilter";
import { useAppSelector } from "@/redux/store";
import { useVlcNumbering } from "@/utils/vlcSectionLabel";
import { api } from "@/services/config";
import { deductionApi } from "@/services/deductionApi";
import { billCycleOf } from "@/pages/Billing/vlcBill";
import { cn } from "@/lib/utils";
import { buildFarmerDatewise, displayDate, type FarmerDatewise, type ShiftFigures } from "@/utils/farmerDatewiseReport";
import { generateFarmerDatewiseExcel } from "@/templates/FarmerDatewiseReportExcelTemplate";

// Farmer Date-wise Report: pick a VLC (optionally through its route) and any
// date of a bill cycle — the dates snap to that VLC's own cycle (10-day, 15-day
// or monthly). With a farmer ID it shows that farmer; without, every farmer who
// poured milk or took / repaid money in the cycle, one at a time with
// Previous / Next. Excel exports every loaded farmer on one sheet.

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Loaded {
  farmers: FarmerDatewise[];
  vlcLabel: string;
  from: string;
  to: string;
  farmerFilter: string;
  paymentsLoaded: boolean;
}

const FarmerDatewiseReport = () => {
  const { t } = useTranslation();
  const allBranches = useAppSelector((state) => state.branch.branches);
  const branches = useMemo(() => allBranches || [], [allBranches]);
  const dairyName = useAppSelector((state) => state.authData.userData?.name) || "";
  const vlcNo = useVlcNumbering();

  const { routes, routeId, setRouteId, branchesOf, routeBranches } = useRouteFilter();
  const [selectedVlc, setSelectedVlc] = useState("");
  const [cycleDate, setCycleDate] = useState(ymd(new Date()));
  const [farmerInput, setFarmerInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [index, setIndex] = useState(0);

  // A dairy with a single VLC needs no picking.
  useEffect(() => {
    if (!selectedVlc && branches.length === 1) setSelectedVlc(String(branches[0].branch_id));
  }, [branches, selectedVlc]);

  const vlc = branches.find((b) => String(b.branch_id) === selectedVlc);
  const cycleDays = vlc?.days || 10;
  const period = useMemo(() => billCycleOf(cycleDate, cycleDays), [cycleDate, cycleDays]);
  const cycleName = cycleDays >= 28
    ? t("monthly_cycle", "Monthly cycle")
    : t("n_day_cycle", "{{days}}-day cycle", { days: cycleDays === 15 ? 15 : 10 });

  const vlcLabelOf = (b: typeof vlc) =>
    b ? `${vlcNo.prefix(b.username)}${b.username} - ${b.name}` : "";

  // Choosing a route lists only its VLCs; a VLC outside it is cleared, and a
  // route with one VLC picks it.
  const handleRouteChange = (id: string) => {
    setRouteId(id);
    const inRoute = branchesOf(id);
    if (inRoute.length === 1) setSelectedVlc(String(inRoute[0].branch_id));
    else if (!inRoute.some((b) => String(b.branch_id) === selectedVlc)) setSelectedVlc("");
  };

  const stepCycle = (dir: -1 | 1) => {
    const edge = dir < 0 ? addDays(period.from, -1) : addDays(period.to, 1);
    setCycleDate(ymd(billCycleOf(ymd(edge), cycleDays).from));
  };

  const handleSubmit = async () => {
    if (!vlc) {
      toast.error(t("please_select_vlc", "Please select a VLC"));
      return;
    }
    const from = ymd(period.from);
    const to = ymd(period.to);
    const farmerFilter = farmerInput.trim();

    setLoading(true);
    try {
      const [collectionsRes, billRes] = await Promise.allSettled([
        api.get("/webreports/collections", { params: { dairy_id: vlc.branch_id, from, to } }),
        deductionApi.getAllFarmersBalance(Number(vlc.branch_id), from, to),
      ]);
      if (collectionsRes.status === "rejected") throw collectionsRes.reason;

      const rows = collectionsRes.value.data?.success ? collectionsRes.value.data.data || [] : [];
      const paymentsLoaded = billRes.status === "fulfilled";
      if (!paymentsLoaded) {
        toast.warn(t("payment_summary_not_loaded", "Collection loaded, but the payment summary could not be loaded."));
      }
      const billData = paymentsLoaded ? billRes.value.data?.data || [] : [];

      const farmers = buildFarmerDatewise(rows, billData, from, to, farmerFilter);
      setLoaded({ farmers, vlcLabel: vlcLabelOf(vlc), from, to, farmerFilter, paymentsLoaded });
      setIndex(0);
      if (farmers.length === 0) {
        toast.info(
          farmerFilter
            ? t("no_data_for_farmer_in_cycle", "No collection or payments for farmer {{id}} in this cycle.", { id: farmerFilter })
            : t("no_data_in_cycle", "No collection or payments in this cycle.")
        );
      }
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || t("failed_to_fetch_data", "Failed to fetch data"));
      setLoaded(null);
    } finally {
      setLoading(false);
    }
  };

  const farmers = loaded?.farmers ?? [];
  const current = farmers[index];
  const goTo = (i: number) => setIndex(Math.max(0, Math.min(farmers.length - 1, i)));

  // ← / → move between farmers, unless the user is typing somewhere.
  useEffect(() => {
    if (farmers.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.closest("[role=listbox],[role=dialog]"))) return;
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(farmers.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [farmers.length]);

  const handleExportExcel = () => {
    if (!loaded || farmers.length === 0) {
      toast.error(t("no_data_to_export", "No data to export"));
      return;
    }
    generateFarmerDatewiseExcel(farmers, {
      dairyName,
      vlcLabel: loaded.vlcLabel,
      from: loaded.from,
      to: loaded.to,
      farmerFilter: loaded.farmerFilter,
    });
    toast.success(t("excel_exported_successfully", "Excel exported successfully"));
  };

  return (
    <div className="text-left">
      <div className="flex justify-between items-center p-3 md:p-4 bg-white">
        <h1 className="text-lg md:text-xl font-semibold">{t("farmer_datewise_report", "Farmer Date-wise Report")}</h1>
      </div>
      <hr className="text-gray-300" />

      {/* Filters */}
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mt-4 mb-4",
          routes.length > 0 ? "xl:grid-cols-6" : "xl:grid-cols-5"
        )}
      >
        {routes.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("route", "Route")}</Label>
            <RouteSelect routes={routes} value={routeId} onChange={handleRouteChange} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("select_vlc", "Select VLC")}</Label>
          <VLCDropdown
            branches={routeBranches}
            value={selectedVlc}
            onChange={(v) => setSelectedVlc(String(v))}
            valueKey="branch_id"
            placeholder={t("select_vlc", "Select VLC")}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("bill_cycle_date", "Bill Cycle (any date in it)")}</Label>
          <AppDatePicker
            date={cycleDate}
            onChange={(d) => {
              if (isValid(parseISO(d))) setCycleDate(d);
            }}
            className="w-full h-10"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <Label className="text-sm font-medium">
            {t("bill_cycle", "Bill Cycle")} <span className="font-normal text-gray-400">· {cycleName}</span>
          </Label>
          <div className="flex items-center h-10 rounded-md border border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => stepCycle(-1)}
              className="h-full px-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-l-md"
              title={t("previous_cycle", "Previous cycle")}
              aria-label={t("previous_cycle", "Previous cycle")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex-1 text-center text-sm font-medium text-gray-800 whitespace-nowrap">
              {format(period.from, "dd MMM")} – {format(period.to, "dd MMM yyyy")}
            </span>
            <button
              type="button"
              onClick={() => stepCycle(1)}
              className="h-full px-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-r-md"
              title={t("next_cycle", "Next cycle")}
              aria-label={t("next_cycle", "Next cycle")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("farmer_id_optional", "Farmer ID (optional)")}</Label>
          <Input
            value={farmerInput}
            onChange={(e) => setFarmerInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder={t("all_farmers", "All Farmers")}
            className="h-10"
          />
        </div>
        <div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading", "Loading...")}
              </span>
            ) : (
              t("submit", "Submit")
            )}
          </Button>
        </div>
      </div>

      {/* Navigation + export */}
      {loaded && farmers.length > 0 && current && (
        <div className="flex flex-wrap items-center justify-between gap-3 mx-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-10 border-gray-300" onClick={() => goTo(index - 1)} disabled={index === 0}>
              <ChevronLeft className="h-4 w-4" />
              {t("previous", "Previous")}
            </Button>
            <Select value={String(index)} onValueChange={(v) => goTo(Number(v))}>
              <SelectTrigger className="h-10 min-w-[220px] border-gray-300 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-80">
                {farmers.map((f, i) => (
                  <SelectItem key={f.farmerId} value={String(i)}>
                    {f.farmerId}
                    {f.name ? ` - ${f.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-10 border-gray-300" onClick={() => goTo(index + 1)} disabled={index === farmers.length - 1}>
              {t("next", "Next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 ml-1">
              {t("farmer_x_of_y", "Farmer {{current}} of {{total}}", { current: index + 1, total: farmers.length })}
            </span>
          </div>
          <Button onClick={handleExportExcel} className="h-10 bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
            <Download className="h-4 w-4" />
            {t("excel_export", "Excel Export")}
            {farmers.length > 1 && <span className="text-green-100 text-xs">({farmers.length})</span>}
          </Button>
        </div>
      )}

      {/* Farmer block */}
      {loaded && current ? (
        <FarmerBlock farmer={current} loaded={loaded} />
      ) : (
        <div className="mx-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-gray-500">
          {loading
            ? t("loading", "Loading...")
            : loaded
              ? loaded.farmerFilter
                ? t("no_data_for_farmer_in_cycle", "No collection or payments for farmer {{id}} in this cycle.", { id: loaded.farmerFilter })
                : t("no_data_in_cycle", "No collection or payments in this cycle.")
              : t("farmer_datewise_hint", "Select a VLC and a bill cycle, then press Submit. Leave Farmer ID blank to see every farmer.")}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const Dash = () => <span className="text-gray-300">–</span>;

const ShiftCells = ({ s, bold = false, tint }: { s: ShiftFigures | null; bold?: boolean; tint: string }) => {
  const cls = cn("border border-gray-300 px-2 py-1.5 text-right tabular-nums", tint, bold && "font-semibold");
  if (!s) {
    return (
      <>
        {[0, 1, 2, 3, 4].map((i) => (
          <td key={i} className={cls}>
            <Dash />
          </td>
        ))}
      </>
    );
  }
  return (
    <>
      <td className={cls}>{fmt(s.qty)}</td>
      <td className={cls}>{fmt(s.fat)}</td>
      <td className={cls}>{fmt(s.snf)}</td>
      <td className={cls}>{fmt(s.rate)}</td>
      <td className={cls}>{fmt(s.amount)}</td>
    </>
  );
};

const MORNING_TINT = "bg-amber-50/40";
const EVENING_TINT = "bg-indigo-50/40";

const FarmerBlock = ({ farmer, loaded }: { farmer: FarmerDatewise; loaded: Loaded }) => {
  const { t } = useTranslation();
  const daysPoured = farmer.days.filter((d) => d.all).length;
  const p = farmer.payments;
  const sub = [t("liter", "Ltr"), t("fat", "FAT"), t("snf", "SNF"), t("rate", "Rate"), t("amount", "Amount")];
  const th = "border border-gray-300 px-2 py-1.5 font-semibold text-gray-700 whitespace-nowrap";

  const paymentItems: { label: string; value: number | null; emphasis?: boolean }[] = [
    { label: t("milk_amount", "Milk Amount"), value: farmer.total.all?.amount ?? 0 },
    { label: t("advance", "Advance"), value: loaded.paymentsLoaded ? p.advance : null },
    { label: t("cattle_feed", "Cattle Feed"), value: loaded.paymentsLoaded ? p.cattleFeed : null },
    { label: t("other1", "Other1"), value: loaded.paymentsLoaded ? p.other1 : null },
    { label: t("other2", "Other2"), value: loaded.paymentsLoaded ? p.other2 : null },
    { label: t("total_deduction", "Total Deduction"), value: loaded.paymentsLoaded ? p.totalDeduction : null },
    { label: t("received", "Received"), value: loaded.paymentsLoaded ? p.received : null },
    { label: t("net_amount", "Net Amount"), value: loaded.paymentsLoaded ? p.net : null, emphasis: true },
  ];

  return (
    <div className="mx-2 mb-6 rounded-lg bg-white shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 border-b border-gray-200">
        <div>
          <div className="text-lg font-semibold text-gray-900">
            {farmer.farmerId}
            {farmer.name && <span className="font-normal text-gray-700"> · {farmer.name}</span>}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {loaded.vlcLabel} · {displayDate(loaded.from)} {t("to", "to")} {displayDate(loaded.to)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {farmer.milkTypes.map((type) => (
            <span key={type} className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 font-medium">
              {t(type.toLowerCase(), type)}
            </span>
          ))}
          <span className="rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 font-medium">
            {t("days_poured", "Days poured")}: {daysPoured} / {farmer.days.length}
          </span>
        </div>
      </div>

      {/* Date-wise table */}
      <div className="overflow-x-auto p-3 md:p-4">
        <table className="w-full border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-100">
              <th rowSpan={2} className={cn(th, "text-left")}>{t("date", "Date")}</th>
              <th colSpan={5} className={cn(th, "bg-amber-100/70")}>{t("morning", "Morning")}</th>
              <th colSpan={5} className={cn(th, "bg-indigo-100/70")}>{t("evening", "Evening")}</th>
              <th colSpan={2} className={cn(th, "bg-emerald-100/70")}>{t("day_total", "Day Total")}</th>
            </tr>
            <tr className="bg-gray-50">
              {sub.map((l) => <th key={`m-${l}`} className={cn(th, "bg-amber-50 text-right")}>{l}</th>)}
              {sub.map((l) => <th key={`e-${l}`} className={cn(th, "bg-indigo-50 text-right")}>{l}</th>)}
              <th className={cn(th, "bg-emerald-50 text-right")}>{sub[0]}</th>
              <th className={cn(th, "bg-emerald-50 text-right")}>{sub[4]}</th>
            </tr>
          </thead>
          <tbody>
            {farmer.days.map((d) => (
              <tr key={d.date} className={cn("hover:bg-gray-50", !d.all && "text-gray-400")}>
                <td className="border border-gray-300 px-2 py-1.5 text-left font-medium text-gray-800">{displayDate(d.date)}</td>
                <ShiftCells s={d.morning} tint={MORNING_TINT} />
                <ShiftCells s={d.evening} tint={EVENING_TINT} />
                <td className="border border-gray-300 px-2 py-1.5 text-right tabular-nums font-medium">{d.all ? fmt(d.all.qty) : <Dash />}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right tabular-nums font-medium">{d.all ? fmt(d.all.amount) : <Dash />}</td>
              </tr>
            ))}
            <tr className="bg-blue-50">
              <td className="border border-gray-300 px-2 py-2 text-left font-bold">{t("total", "Total")}</td>
              <ShiftCells s={farmer.total.morning} bold tint="" />
              <ShiftCells s={farmer.total.evening} bold tint="" />
              <td className="border border-gray-300 px-2 py-2 text-right tabular-nums font-bold">{farmer.total.all ? fmt(farmer.total.all.qty) : <Dash />}</td>
              <td className="border border-gray-300 px-2 py-2 text-right tabular-nums font-bold">{farmer.total.all ? fmt(farmer.total.all.amount) : <Dash />}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment summary */}
      <div className="px-3 md:px-4 pb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">{t("payments_in_cycle", "Payments in this cycle")}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2">
          {paymentItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "rounded-md border px-3 py-2",
                item.emphasis ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50"
              )}
            >
              <div className="text-xs text-gray-500">{item.label}</div>
              <div className={cn("tabular-nums font-semibold", item.emphasis ? "text-emerald-800" : "text-gray-900")}>
                {item.value === null ? <Dash /> : `₹${fmt(item.value)}`}
              </div>
            </div>
          ))}
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
            <div className="text-xs text-gray-500">{t("bill_net_payable", "Bill Net Payable")}</div>
            {!loaded.paymentsLoaded ? (
              <div className="font-semibold"><Dash /></div>
            ) : p.bill ? (
              <div className="tabular-nums font-semibold text-blue-900">
                ₹{fmt(p.bill.netPayable)}
                {!p.bill.finalized && (
                  <span className="ml-1 text-[10px] font-medium text-amber-700">({t("not_finalized", "not finalized")})</span>
                )}
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-500">{t("not_generated", "Not generated")}</div>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {t(
            "farmer_datewise_net_note",
            "Net Amount = Milk Amount − Total Deduction + Received, for money taken and repaid within these dates. Bill Net Payable is the saved bill for this cycle (after bonus, commission and carried-forward dues)."
          )}
        </p>
      </div>
    </div>
  );
};

export default FarmerDatewiseReport;
