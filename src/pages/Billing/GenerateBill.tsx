import { Fragment, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { Lock, CheckCircle, Unlock, Loader2, AlertCircle } from "lucide-react";
import { deductionApi } from "@/services/deductionApi";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import type { BranchState } from "@/redux/branchSlice";
import { useRouteFilter } from "@/hooks/useRouteFilter";
import RouteSelect from "@/components/RouteSelect";
import { type BillPeriod, billCycleOf, generateVlcBill, isPreviousCycleBilled, loadVlcBill, previousBillCycle } from "./vlcBill";

type Branch = BranchState["branches"][number];

// One VLC's fetched bill: its farmers' rows for its own bill period.
interface VlcBill {
  vlc: Branch;
  period: BillPeriod;
  farmers: any[];
  isBillFinalized: boolean;
  error?: string;
}

const ymd = (date: Date) => format(date, "yyyy-MM-dd");
const cycleDaysOf = (vlc?: Branch) => vlc?.days || 10;
const vlcLabel = (vlc: Branch) => `${vlc.username} - ${vlc.name}`;

const GenerateBill = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [selectedDairy, setSelectedDairy] = useState<number>(0);
  // All Routes bills one VLC at a time. Choosing a route bills several of its VLCs
  // together: all of them to begin with, fewer by unticking. Routes never mix.
  const { routes, routeId, setRouteId, branchesOf, routeBranches } = useRouteFilter();
  const routeName = routes.find((route) => route.id === routeId)?.name;
  const multiVlc = !!routeName;
  const [routeDairies, setRouteDairies] = useState<string[]>([]);
  const chosenVlcs = multiVlc
    ? routeBranches.filter((b) => routeDairies.includes(String(b.branch_id)))
    : branches.filter((b) => b.branch_id === selectedDairy);
  // The dates shown follow the first chosen VLC's bill cycle.
  const leadVlc = chosenVlcs[0];

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handleStartDateChange = (newDate: string) => {
    const dates = billCycleOf(newDate, cycleDaysOf(leadVlc));
    setStartDate(dates.from);
    setEndDate(dates.to);
  };

  // Each VLC is billed for its own cycle holding the start date (VLCs can run 10-day, 15-day or monthly cycles).
  const periodOf = (vlc: Branch) => billCycleOf(ymd(startDate), cycleDaysOf(vlc));
  const mixedCycles = chosenVlcs.some((vlc) => {
    const period = periodOf(vlc);
    return ymd(period.from) !== ymd(startDate) || ymd(period.to) !== ymd(endDate);
  });

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [bills, setBills] = useState<VlcBill[]>([]);
  const [resettingId, setResettingId] = useState<number | null>(null);

  // The fetched rows belong to the chosen VLCs and bill period. Drop them when either
  // changes, so Generate Bills can never save them under another VLC or period.
  const billKey = `${chosenVlcs.map((b) => b.branch_id).join(",")}|${ymd(startDate)}|${ymd(endDate)}`;
  const billKeyRef = useRef(billKey);
  useEffect(() => {
    billKeyRef.current = billKey;
    setBills([]);
  }, [billKey]);

  const loadedBills = bills.filter((b) => b.farmers.length > 0);
  const readyBills = loadedBills.filter((b) => !b.isBillFinalized);
  const finalizedCount = loadedBills.length - readyBills.length;
  const allFinalized = loadedBills.length > 0 && readyBills.length === 0;
  const skippedBills = bills.filter((b) => b.farmers.length === 0);
  const allFarmers = loadedBills.flatMap((b) => b.farmers);

  const shouldShowTravelCommission = () => allFarmers.some(f => (f.travelCommissionAmount || 0) > 0);
  const columnCount = shouldShowTravelCommission() ? 13 : 12;

  const totalsOf = (farmers: any[]) => farmers.reduce(
    (acc, farmer) => {
      return {
        totalAmount: acc.totalAmount + farmer.milk_total,
        totalDeduction: acc.totalDeduction + (farmer.advanceDeduction || 0) + (farmer.cattleFeedDeduction || 0) + (farmer.other1Deduction || 0) + (farmer.other2Deduction || 0),
        totalBonus: acc.totalBonus + (farmer.bonusAmount || 0),
        totalFixed: acc.totalFixed + (farmer.fixedAmount || 0),
        totalRemaining: acc.totalRemaining + (farmer.totalRemaining || 0),
        totalNetPayable: acc.totalNetPayable + (farmer.finalAmount || 0),
      };
    },
    { totalAmount: 0, totalDeduction: 0, totalBonus: 0, totalFixed: 0, totalRemaining: 0, totalNetPayable: 0 }
  );
  const totals = totalsOf(allFarmers);

  useEffect(() => {
    if (branches.length > 0 && selectedDairy === 0) {
      setSelectedDairy(branches[0].branch_id);
    }
  }, [branches]);

  const handleRouteChange = (id: string) => {
    setRouteId(id);
    const vlcs = branchesOf(id);
    // A route starts with all its VLCs ticked.
    setRouteDairies(vlcs.map((b) => String(b.branch_id)));
    // Keep the single VLC when it is on the new route, otherwise move to the route's first VLC.
    if (vlcs.length > 0 && !vlcs.some((b) => b.branch_id === selectedDairy)) {
      setSelectedDairy(vlcs[0].branch_id);
    }
  };

  useEffect(() => {
    if (leadVlc) {
      const dates = billCycleOf(ymd(startDate), cycleDaysOf(leadVlc));
      setStartDate(dates.from);
      setEndDate(dates.to);
    }
  }, [leadVlc?.branch_id, leadVlc?.days]);

  // In route mode messages name the VLC they are about.
  const aboutVlc = (bill: VlcBill, message: string) => (multiVlc ? `${vlcLabel(bill.vlc)}: ${message}` : message);

  const fetchBillData = async () => {
    if (chosenVlcs.length === 0) {
      toast.error(t("select_at_least_one_vlc", "Select at least one VLC"));
      return;
    }
    // A response that lands after the VLCs or period changed is discarded.
    const requestKey = billKey;
    setFetchLoading(true);
    try {
      const loaded = await Promise.all(
        chosenVlcs.map(async (vlc): Promise<VlcBill> => {
          const period = periodOf(vlc);
          try {
            const { farmers, isBillFinalized } = await loadVlcBill(vlc.branch_id, period.from, period.to);
            return { vlc, period, farmers, isBillFinalized };
          } catch (error: any) {
            const message = error?.response?.data?.message || t("failed_to_fetch_bill_data", "Failed to fetch bill data");
            return { vlc, period, farmers: [], isBillFinalized: false, error: message };
          }
        })
      );

      if (billKeyRef.current !== requestKey) return;
      setBills(loaded);
      loaded.filter((b) => b.error).forEach((b) => toast.error(aboutVlc(b, b.error!)));
      if (loaded.every((b) => !b.error && b.farmers.length === 0)) {
        toast.info(t("no_collection_data_found_for_selected_period", "No collection data found for the selected period."));
      }
    } finally {
      setFetchLoading(false);
    }
  };

  const handleResetToUnfinalized = async (bill: VlcBill) => {
    try {
      setResettingId(bill.vlc.branch_id);
      const response = await deductionApi.resetToPending(bill.vlc.branch_id, ymd(bill.period.from), ymd(bill.period.to));

      if (response.data.success) {
        toast.success(aboutVlc(bill, t("successfully_reset", "Successfully reset ") + response.data.updatedCount + t("bills_to_unfinalized_status", " bills to unfinalized status")));
        // Refresh the data to show updated status
        await fetchBillData();
      }
    } catch (error: any) {
      console.error('❌ Error resetting bills:', error);
      toast.error(aboutVlc(bill, error?.response?.data?.message || t("failed_to_reset_bills", "Failed to reset bills")));
    } finally {
      setResettingId(null);
    }
  };

  const handleGenerateBill = async () => {
    if (readyBills.length === 0) return;
    if (
      readyBills.length > 1 &&
      !window.confirm(
        `${t("generate_and_finalize_bills_for", "Generate and finalize bills for")} ${readyBills.length} VLC?\n\n` +
          readyBills.map((b) => vlcLabel(b.vlc)).join("\n")
      )
    ) {
      return;
    }

    setLoading(true);
    let generated = 0;
    try {
      // One VLC after another; a VLC that cannot be billed yet does not stop the rest.
      for (const bill of readyBills) {
        const canGenerate = await isPreviousCycleBilled(bill.vlc.branch_id, bill.period.from, cycleDaysOf(bill.vlc));
        if (!canGenerate) {
          const previousCycle = previousBillCycle(bill.period.from, cycleDaysOf(bill.vlc));
          if (previousCycle) {
            toast.error(aboutVlc(bill,
              t("please_generate_and_finalize_bills", "Please generate and finalize bills for previous cycle (") + `${format(previousCycle.from, 'dd-MM-yyyy')} to ${format(previousCycle.to, 'dd-MM-yyyy')}` + t("first_parentheses", ") first.")
            ));
          }
          continue;
        }

        try {
          await generateVlcBill(bill.vlc.branch_id, bill.period.from, bill.period.to, bill.farmers);
          generated++;
        } catch (error: any) {
          console.error('❌ Error generating bills:', error);
          toast.error(aboutVlc(bill, error?.response?.data?.message || t("failed_to_generate_bills", "Failed to generate bills")));
        }
      }

      if (generated > 0) {
        toast.success(
          multiVlc
            ? `${t("bills_generated_and_finalized_for", "Bills generated and finalized for")} ${generated} VLC`
            : t("bills_generated_and_finalized_successfully", "Bills generated and finalized successfully")
        );
        await fetchBillData();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col items-start text-left gap-1.5 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            {t("generate_bill", "Generate Bill")}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {t("select_criteria_to_generate_bills", "Select criteria to generate bills for farmers")}
          </p>
        </div>

        {/* Header & Controls Card */}
        <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl py-0 gap-0">
          <CardHeader className="px-4 py-3 !pb-2 border-b border-slate-100/50 bg-white/50">
            <CardTitle className="text-lg font-semibold text-slate-800">
              {t("select_bill_cycle", "Select Bill Cycle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 items-end ${routes.length > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
              {routes.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">{t("route", "Route")}</Label>
                  <RouteSelect routes={routes} value={routeId} onChange={handleRouteChange} />
                </div>
              )}
              {multiVlc ? (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">
                    {t("select_vlcs", "Select VLCs")}
                    <span className="ml-1 font-normal text-gray-400">({chosenVlcs.length}/{routeBranches.length})</span>
                  </Label>
                  <VLCDropdown
                    branches={routeBranches}
                    value={routeDairies}
                    onChange={(vals: string[]) => setRouteDairies(vals)}
                    valueKey="branch_id"
                    isMultiSelect
                    placeholder={t("select_vlcs", "Select VLCs")}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">{t("select_vlc", "Select VLC")}</Label>
                  <VLCDropdown
                    branches={routeBranches}
                    value={String(selectedDairy)}
                    onChange={(val) => setSelectedDairy(Number(val))}
                    valueKey="branch_id"
                    placeholder={t("select_vlc", "Select VLC")}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">{t("start_date", "Start Date")}</Label>
                <Input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full h-10 border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">{t("end_date", "End Date")}</Label>
                <Input
                  type="date"
                  value={format(endDate, "yyyy-MM-dd")}
                  disabled
                  className="w-full h-10 border-gray-200 bg-gray-50 cursor-not-allowed text-gray-500"
                />
              </div>

              <div className="space-y-1.5">
                <Button
                  onClick={fetchBillData}
                  disabled={fetchLoading || chosenVlcs.length === 0}
                  className="w-full h-10 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm transition-all active:scale-[0.98]"
                >
                  {fetchLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("fetching", "Fetching...")}</span>
                    </div>
                  ) : (
                    t("fetch_data", "Fetch Data")
                  )}
                </Button>
              </div>
            </div>
            {multiVlc && mixedCycles && (
              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {t("mixed_bill_cycles_note", "These VLCs have different bill cycles. Each is billed for its own cycle that holds the start date.")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Generate Bill Section (Only shown if data exists) */}
        {loadedBills.length > 0 && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-6">

            {/* Status & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap shadow-sm backdrop-blur-sm ${
                allFinalized
                  ? 'bg-gray-100/80 text-gray-700 border border-gray-200'
                  : finalizedCount > 0
                  ? 'bg-amber-50/80 text-amber-700 border border-amber-100'
                  : 'bg-emerald-50/80 text-emerald-700 border border-emerald-100'
              }`}>
                {allFinalized ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{t("bills_finalized", "Bills Finalized")}</span>
                  </>
                ) : finalizedCount > 0 ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{finalizedCount}/{loadedBills.length} {t("vlcs_finalized", "VLCs finalized")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t("ready_to_generate", "Ready to Generate")}</span>
                  </>
                )}
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                {/* Route mode resets each VLC from its own heading below. */}
                {!multiVlc && allFinalized && (
                  <Button
                    onClick={() => handleResetToUnfinalized(loadedBills[0])}
                    disabled={resettingId !== null}
                    variant="outline"
                    className="flex-1 sm:flex-none h-11 bg-white hover:bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-300 shadow-sm transition-all"
                  >
                    {resettingId !== null ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Unlock className="w-4 h-4 mr-2" />
                    )}
                    {t("reset_status", "Reset Status")}
                  </Button>
                )}

                <Button
                  onClick={handleGenerateBill}
                  disabled={loading || allFinalized}
                  className={`flex-1 sm:flex-none h-11 px-8 font-semibold shadow-md transition-all active:scale-[0.98] ${
                    allFinalized
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                      : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/20"
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("generating", "Generating...")}</span>
                    </div>
                  ) : multiVlc && readyBills.length > 0 ? (
                    `${t("generate_bills", "Generate Bills")} (${readyBills.length} VLC)`
                  ) : (
                    t("generate_bills", "Generate Bills")
                  )}
                </Button>
              </div>
            </div>

            {multiVlc && skippedBills.length > 0 && (
              <p className="px-2 text-xs font-medium text-slate-500">
                {t("not_billed_no_collection", "Not billed (no collection in the period or could not load)")}:{" "}
                {skippedBills.map((b) => vlcLabel(b.vlc)).join(", ")}
              </p>
            )}

            {/* Totals Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("total_amount", "Total Amount")}</p>
                <p className="text-lg font-bold text-gray-900">₹{totals.totalAmount.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("total_deduction", "Total Deduction")}</p>
                <p className="text-lg font-bold text-rose-600">₹{totals.totalDeduction.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("total_bonus", "Total Bonus")}</p>
                <p className="text-lg font-bold text-emerald-600">₹{totals.totalBonus.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("total_fixed", "Total Fixed")}</p>
                <p className="text-lg font-bold text-rose-600">₹{totals.totalFixed.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("total_remaining", "Total Remaining")}</p>
                <p className="text-lg font-bold text-yellow-600">₹{totals.totalRemaining.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-emerald-100 shadow-sm ring-1 ring-emerald-500/10">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">{t("net_payable", "Net Payable")}</p>
                <p className="text-xl font-bold text-emerald-600">₹{totals.totalNetPayable.toFixed(2)}</p>
              </div>
            </div>

            {/* Data Table */}
            <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden rounded-2xl py-0 gap-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("id", "ID")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("name", "Name")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("liter", "Liter")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("amount", "Amount")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("advance", "Advance")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("cattle_feed", "Cattle Feed")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("other1", "Other1")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("other2", "Other2")}</th>
                      {shouldShowTravelCommission() && (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-orange-600 bg-orange-50 uppercase tracking-wider">{t("travel_comm", "Travel Comm")}</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("bonus", "Bonus")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("fixed", "Fixed")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("remaining", "Remaining")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("final_amount", "Final Amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50">
                    {loadedBills.map((bill) => (
                    <Fragment key={bill.vlc.branch_id}>
                    {multiVlc && (
                      <tr className="bg-indigo-50/70">
                        <td colSpan={columnCount} className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                            <span className="font-bold text-slate-900">{vlcLabel(bill.vlc)}</span>
                            <span className="text-slate-500">
                              {format(bill.period.from, "dd-MM-yyyy")} – {format(bill.period.to, "dd-MM-yyyy")}
                            </span>
                            <span className="text-slate-500">{bill.farmers.length} {t("farmers", "Farmers")}</span>
                            <span className="font-semibold text-emerald-700">
                              {t("net_payable", "Net Payable")}: ₹{totalsOf(bill.farmers).totalNetPayable.toFixed(2)}
                            </span>
                            {bill.isBillFinalized ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">
                                <Lock className="h-3 w-3" />
                                {t("bills_finalized", "Bills Finalized")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                <CheckCircle className="h-3 w-3" />
                                {t("ready_to_generate", "Ready to Generate")}
                              </span>
                            )}
                            {bill.isBillFinalized && (
                              <Button
                                onClick={() => handleResetToUnfinalized(bill)}
                                disabled={resettingId !== null}
                                variant="outline"
                                size="sm"
                                className="ml-auto h-7 bg-white hover:bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-300 text-xs"
                              >
                                {resettingId === bill.vlc.branch_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Unlock className="w-3 h-3 mr-1" />
                                )}
                                {t("reset_status", "Reset Status")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {bill.farmers.map((farmer) => (
                      <tr key={`${bill.vlc.branch_id}-${farmer.farmer_id}`} className="hover:bg-white/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">{farmer.farmer_id}</td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">{farmer.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{farmer.quantity?.toFixed(2) || "0.00"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-medium">₹{(farmer.milk_total).toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs">
                          <div className="text-rose-600 font-medium">₹{(farmer.advanceDeduction || 0).toFixed(2)}</div>
                          {(farmer.advance_remaining_display > 0) && (
                             <div className="text-[10px] text-yellow-600/80 font-medium">
                              {t("bal_rs", "Bal: ₹")}{(farmer.advance_remaining_display || 0).toFixed(2)}
                             </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="text-rose-600 font-medium">₹{(farmer.cattleFeedDeduction || 0).toFixed(2)}</div>
                          {(farmer.cattlefeed_remaining_display > 0) && (
                            <div className="text-[10px] text-yellow-600/80 font-medium">
                             {t("bal_rs", "Bal: ₹")}{(farmer.cattlefeed_remaining_display || 0).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="text-rose-600 font-medium">₹{(farmer.other1Deduction || 0).toFixed(2)}</div>
                          {(farmer.other1_remaining_display > 0) && (
                            <div className="text-[10px] text-yellow-600/80 font-medium">
                             {t("bal_rs", "Bal: ₹")}{(farmer.other1_remaining_display || 0).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="text-rose-600 font-medium">₹{(farmer.other2Deduction || 0).toFixed(2)}</div>
                          {(farmer.other2_remaining_display > 0) && (
                            <div className="text-[10px] text-yellow-600/80 font-medium">
                             {t("bal_rs", "Bal: ₹")}{(farmer.other2_remaining_display || 0).toFixed(2)}
                            </div>
                          )}
                        </td>
                        {shouldShowTravelCommission() && (
                          <td className="px-4 py-3 text-xs text-orange-600 font-medium bg-orange-50/50">
                            {(farmer.travelCommissionAmount || 0) > 0
                              ? `₹${(farmer.travelCommissionAmount as number).toFixed(2)}`
                              : '-'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-xs">
                          <div className="text-emerald-600 font-medium">₹{(farmer.bonusAmount || 0).toFixed(2)}</div>
                          {farmer.bonusRate > 0 && (
                            <div className="text-[10px] text-slate-500">
                              @₹{farmer.bonusRate.toFixed(2)}/L
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-rose-600 font-medium">
                          ₹{(farmer.fixedAmount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs text-yellow-600 font-medium">
                          ₹{(farmer.totalRemaining || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-emerald-600 bg-emerald-50/30">
                          ₹{(farmer.finalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateBill;
