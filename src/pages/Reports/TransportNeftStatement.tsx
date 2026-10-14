import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { endOfMonth, format } from "date-fns";
import { useAppSelector } from "@/redux/store";
import { transportApi, TransportNeftRow, TransportNeftTotals } from "@/services/transportApi";
import { formatRupees, generateTransportNeftExcel, generateTransportNeftPDF, roundedNetPayableTotal } from "@/templates/TransportNeftTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, FileSpreadsheet, Loader2, Save } from "lucide-react";
import PdfLoader from "@/components/PdfLoader";

// Reports → Transport Collection → Transport NEFT Statement. The advance is
// entered here for the selected bill period; the server works out every other
// figure — the DCA deduction is Composite − Dispatch of the route's VLCs (as in
// VLC Difference Report 2), never below 0 — and Net Payable.

const n2 = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const currentPeriod = () => {
  const now = new Date();
  const day = now.getDate();
  const start = new Date(now.getFullYear(), now.getMonth(), day <= 10 ? 1 : day <= 20 ? 11 : 21);
  const end = day <= 10 ? new Date(now.getFullYear(), now.getMonth(), 10)
    : day <= 20 ? new Date(now.getFullYear(), now.getMonth(), 20) : endOfMonth(now);
  return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
};



const TransportNeftStatement = () => {
  const { t } = useTranslation();
  const { userData } = useAppSelector((state) => state.authData);
  const userId = userData?.id;
  const [fromDate, setFromDate] = useState(currentPeriod().from);
  const [toDate, setToDate] = useState(currentPeriod().to);
  const [rows, setRows] = useState<TransportNeftRow[] | null>(null);
  const [totals, setTotals] = useState<TransportNeftTotals | null>(null);
  const [period, setPeriod] = useState({ from: "", to: "" });
  // Advance typed but not saved yet, per transport
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = async (from = fromDate, to = toDate) => {
    if (!userId) return;
    if (!from || !to || from > to) {
      toast.error(t("invalid_date_range", "Please select a valid date range"));
      return;
    }
    setLoading(true);
    try {
      const { data } = await transportApi.neft(userId, from, to);
      if (data?.success) {
        setRows(data.data || []);
        setTotals(data.totals);
        setPeriod({ from, to });
        setEdits({});
        if (!data.data?.length) toast.info(t("no_transport_payments", "No transport trips in this period"));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_fetch_report", "Failed to fetch report"));
    } finally {
      setLoading(false);
    }
  };

  const advanceOf = (r: TransportNeftRow) => edits[r.transport_id] ?? String(r.advance);
  const isDirty = (r: TransportNeftRow) =>
    edits[r.transport_id] !== undefined && Number(edits[r.transport_id] || 0) !== r.advance;
  const anyDirty = (rows || []).some(isDirty);

  const saveRow = async (r: TransportNeftRow) => {
    if (!userId) return;
    const advance = Number(advanceOf(r) || 0);
    if (!(advance >= 0)) {
      toast.error(t("advance_non_negative", "Advance must be 0 or more"));
      return;
    }
    setSavingId(r.transport_id);
    try {
      const { data } = await transportApi.saveAdvance({
        user_id: userId,
        transport_id: r.transport_id,
        period_from: period.from,
        period_to: period.to,
        advance,
      });
      if (data?.success) {
        toast.success(t("saved", "Saved"));
        await load(period.from, period.to);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_save_entry", "Failed to save the entry"));
    } finally {
      setSavingId(null);
    }
  };

  const exportFile = (kind: "pdf" | "excel") => {
    if (!rows || !totals || rows.length === 0) {
      toast.error(t("no_data_to_export", "No data to export"));
      return;
    }
    if (anyDirty) {
      toast.error(t("save_advance_first", "Save the advance changes first"));
      return;
    }
    if (kind === "excel") {
      generateTransportNeftExcel(rows, totals, period.from, period.to);
      return;
    }
    setPdfLoading(true);
    try {
      generateTransportNeftPDF(rows, totals, userData?.name || "", period.from, period.to);
    } finally {
      setPdfLoading(false);
    }
  };

  const th = "px-2 py-2 font-semibold border border-gray-200";
  const td = "px-2 py-2 border border-gray-200 tabular-nums";

  return (
    <div className="p-2 sm:p-4 bg-white w-full min-h-screen flex flex-col">
      <PdfLoader isLoading={pdfLoading} />
      <div className="flex flex-col items-start text-left gap-1 px-2 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          {t("transport_neft_statement", "Transport NEFT Statement")}
        </h1>
        <p className="text-sm text-gray-600">
          {t("transport_neft_subtitle", "Enter the advance for this bill period, save, then export")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
        <div>
          <Label className="mb-1">{t("from_date", "From Date")}</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10" />
        </div>
        <div>
          <Label className="mb-1">{t("to_date", "To Date")}</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10" />
        </div>
        <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
          <Button onClick={() => load()} disabled={loading} className="text-white bg-blue-600 w-[120px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("show", "Show")}
          </Button>
          <Button onClick={() => exportFile("pdf")} disabled={!rows?.length} className="text-white bg-red-600 w-[130px] flex items-center gap-2">
            <FileDown size={16} />{t("export_pdf", "Export PDF")}
          </Button>
          <Button onClick={() => exportFile("excel")} disabled={!rows?.length} className="text-white bg-green-600 w-[140px] flex items-center gap-2">
            <FileSpreadsheet size={16} />{t("export_excel", "Export Excel")}
          </Button>
        </div>
      </div>

      {rows && (
        <div className="overflow-x-auto mx-2 border border-gray-200 rounded-lg shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-xs text-gray-700">
              <tr>
                <th className={`${th} text-left`}>{t("ac_number", "A/C Number")}</th>
                <th className={`${th} text-left`}>{t("account_holder", "Account Holder")}</th>
                <th className={`${th} text-right`}>{t("payable_amount", "Payable Amount")}</th>
                <th className={`${th} text-left`}>IFSCode</th>
                <th className={`${th} text-left`}>{t("route_name", "Route Name")}</th>
                <th className={`${th} text-right`}>KMS</th>
                <th className={`${th} text-right`}>{t("shift", "Shift")}</th>
                <th className={`${th} text-right`}>{t("total_kms", "Total Kms")}</th>
                <th className={`${th} text-right`}>{t("rate", "Rate")}</th>
                <th className={`${th} text-right`}>{t("avg_cost_per_lit", "Avg Cost/lit")}</th>
                <th className={`${th} text-right`}>{t("milk_collection_on_route", "Milk Collection on Route")}</th>
                <th className={`${th} text-right`}>{t("payment_amount", "Payment Amount")}</th>
                <th className={`${th} text-right bg-amber-50`}>{t("advance", "Advance")}</th>
                <th className={`${th} text-right`}>
                  {t("deduction_from_dca", "Deduction from DCA Report")}
                  <span className="block text-[10px] font-normal text-gray-500">{t("composite_minus_dispatch", "Composite − Dispatch")}</span>
                </th>
                <th className={`${th} text-right`}>{t("net_payable_amount", "Net Payable Amount")}</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={16} className="px-4 py-8 text-center text-gray-500">{t("no_transport_payments", "No transport trips in this period")}</td></tr>
              )}
              {rows.map((r) => {
                return (
                  <tr key={r.transport_id} className="hover:bg-gray-50">
                    <td className={`${td} font-medium`}>{r.account_number}</td>
                    <td className={td}>
                      {r.account_holder}
                      {r.account_holder !== r.name && <span className="block text-xs text-gray-500">{r.name}</span>}
                    </td>
                    <td className={`${td} text-right font-semibold`}>{formatRupees(r.net_payable)}</td>
                    <td className={td}>{r.ifsc_code}</td>
                    <td className={td}>{r.route_names.join(", ") || "-"}</td>
                    <td className={`${td} text-right`}>{r.km_per_trip.map((v) => v.toFixed(2)).join(" / ") || "-"}</td>
                    <td className={`${td} text-right`}>{r.trips}</td>
                    <td className={`${td} text-right`}>{n2(r.total_km)}</td>
                    <td className={`${td} text-right`}>{r.rates.map((v) => v.toFixed(2)).join(" / ") || "-"}</td>
                    <td className={`${td} text-right`}>{n2(r.avg_cost_per_liter)}</td>
                    <td className={`${td} text-right`}>{n2(r.milk)}</td>
                    <td className={`${td} text-right`}>{n2(r.payment_amount)}</td>
                    <td className={`${td} bg-amber-50/40`}>
                      <Input type="number" step="0.01" min="0" value={advanceOf(r)}
                        onChange={(ev) => setEdits((prev) => ({ ...prev, [r.transport_id]: ev.target.value }))}
                        className="h-7 w-24 text-right ml-auto text-xs" />
                    </td>
                    <td
                      className={`${td} text-right`}
                      title={`${t("composite", "Composite")} ₹${n2(r.composite_amount)} − ${t("dispatch", "Dispatch")} ₹${n2(r.dispatch_amount)}`}
                    >
                      <span className="font-semibold">{n2(r.dca_deduction)}</span>
                      <span className="block text-[10px] text-gray-500 whitespace-nowrap">
                        {n2(r.composite_amount)} − {n2(r.dispatch_amount)}
                      </span>
                    </td>
                    <td className={`${td} text-right font-bold`}>{formatRupees(r.net_payable)}</td>
                    <td className={td}>
                      <Button size="sm" onClick={() => saveRow(r)} disabled={!isDirty(r) || savingId === r.transport_id}
                        className="h-8 bg-blue-600 hover:bg-blue-700 text-white">
                        {savingId === r.transport_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totals && rows.length > 0 && (
              <tfoot>
                <tr className="bg-amber-50 font-bold">
                  <td className={td} colSpan={2}>{t("total_amount", "Total Amount")}</td>
                  <td className={`${td} text-right`}>{formatRupees(roundedNetPayableTotal(rows))}</td>
                  <td className={td} colSpan={3} />
                  <td className={`${td} text-right`}>{totals.trips}</td>
                  <td className={`${td} text-right`}>{n2(totals.total_km)}</td>
                  <td className={td} colSpan={2} />
                  <td className={`${td} text-right`}>{n2(totals.milk)}</td>
                  <td className={`${td} text-right`}>{n2(totals.payment_amount)}</td>
                  <td className={`${td} text-right`}>{n2(totals.advance)}</td>
                  <td className={`${td} text-right`}>{n2(totals.dca_deduction)}</td>
                  <td className={`${td} text-right`}>{formatRupees(roundedNetPayableTotal(rows))}</td>
                  <td className={td} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
      {rows && rows.length > 0 && (
        <p className="text-xs text-gray-500 mt-2 mx-2">
          {t("transport_neft_note", "Shift = trips run. KMS and Rate are per trip / per KM; several values mean the route changed in the period. Payment = Total Kms × Rate. Deduction from DCA Report = Composite − Dispatch amount of the route's VLCs over the days the transport ran it (as in VLC Difference Report 2), never below 0. Net Payable = Payment − Advance − DCA deduction. The advance is saved for exactly this From–To period.")}
        </p>
      )}
    </div>
  );
};

export default TransportNeftStatement;
