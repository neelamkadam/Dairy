import { useState, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { format, startOfMonth } from "date-fns";
import { FileDown, FileSpreadsheet, Loader2, TrendingDown, TrendingUp, Wallet, Percent, Package } from "lucide-react";
import { tankerApi, TankerPLReport } from "@/services/tankerApi";
import {
  formatLiter,
  formatMoney,
  formatPLDate,
  generateTankerProfitLossExcel,
  generateTankerProfitLossPDF,
} from "@/templates/TankerProfitLossTemplate";
import PdfLoader from "@/components/PdfLoader";

// Tanker Profit & Loss: the tankers purchased in the range and every sale made
// from them. The server computes every figure; this page only displays them.

const show = (value?: string | null) => (value === undefined || value === null || value === "" ? "-" : value);
const plClass = (value: number) => (value > 0.005 ? "text-emerald-700" : value < -0.005 ? "text-rose-700" : "text-gray-700");
const amount = (value: number) => value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_STYLE: Record<string, string> = {
  Sold: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Partly sold": "bg-amber-50 text-amber-700 border-amber-200",
  Unsold: "bg-gray-100 text-gray-600 border-gray-200",
};

const TankerProfitLossReport = () => {
  const { t } = useTranslation();
  const { userData } = useAppSelector((state) => state.authData);
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [report, setReport] = useState<TankerPLReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleShow = async () => {
    if (!userData?.id) {
      toast.error(t("user_not_found", "User not found, please log in again"));
      return;
    }
    if (!fromDate || !toDate || fromDate > toDate) {
      toast.error(t("invalid_date_range", "Please select a valid date range"));
      return;
    }
    setLoading(true);
    try {
      const { data } = await tankerApi.profitLoss(userData.id, fromDate, toDate);
      if (data?.success) {
        if (!data.tankers?.length) toast.info(t("no_tanker_purchases", "No tanker purchases in this period"));
        setReport({ period: data.period, summary: data.summary, tankers: data.tankers || [] });
      } else {
        toast.error(data?.message || t("failed_fetch_report", "Failed to fetch report"));
        setReport(null);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_fetch_report", "Failed to fetch report"));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!report) return;
    setPdfLoading(true);
    try {
      generateTankerProfitLossPDF(report, userData?.name || "");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error(t("failed_to_generate_pdf", "Failed to generate PDF"));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!report) return;
    try {
      generateTankerProfitLossExcel(report, userData?.name || "");
    } catch (error) {
      console.error("Excel Export Error:", error);
      toast.error(t("failed_to_generate_excel", "Failed to generate Excel"));
    }
  };

  const s = report?.summary;
  const isLoss = s?.status === "Loss";

  const kpis = s ? [
    {
      label: t("total_purchase", "Total Purchase"),
      value: formatMoney(s.purchase_amount),
      sub: `${formatLiter(s.purchase_liter)} · ${s.purchase_count} ${t("tankers", "tankers")}`,
      icon: TrendingDown,
      tone: "text-rose-600 bg-rose-50",
    },
    {
      label: t("total_sale", "Total Sale"),
      value: formatMoney(s.sale_amount),
      sub: `${formatLiter(s.sold_liter)} · ${s.sale_count} ${t("sales_count_label", "sales")}`,
      icon: TrendingUp,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: isLoss ? t("gross_loss", "Gross Loss") : t("gross_profit", "Gross Profit"),
      value: formatMoney(s.gross_profit),
      sub: s.status,
      icon: Wallet,
      tone: isLoss ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50",
    },
    {
      label: t("margin", "Margin"),
      value: `${s.margin_percent.toFixed(2)}%`,
      sub: t("of_sale_amount", "of sale amount"),
      icon: Percent,
      tone: isLoss ? "text-rose-600 bg-rose-50" : "text-blue-600 bg-blue-50",
    },
    {
      label: t("unsold_milk", "Unsold Milk"),
      value: formatLiter(s.unsold_liter),
      sub: `${formatMoney(s.unsold_value)} ${t("at_purchase_cost", "at purchase cost")}`,
      icon: Package,
      tone: "text-amber-600 bg-amber-50",
    },
  ] : [];

  const summaryRow = (label: string, value: string, valueClass = "text-gray-900", bold = false) => (
    <tr className="border-b border-gray-100">
      <td className={`px-4 py-2.5 text-left ${bold ? "font-bold text-gray-800" : "text-gray-700"}`}>{label}</td>
      <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${bold ? "font-bold" : "font-semibold"} ${valueClass}`}>{value}</td>
    </tr>
  );

  const th = "px-3 py-2.5 font-semibold border-b border-gray-200";

  return (
    <div className="p-2 sm:p-4 bg-gray-50 min-h-screen">
      <PdfLoader isLoading={pdfLoading} />
      <div className="flex flex-col items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 px-2 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          {t("tanker_profit_loss_report", "Tanker Profit & Loss Report")}
        </h1>
        <p className="text-sm text-gray-600">
          {t("tanker_profit_loss_subtitle", "Profit or loss on the tankers purchased in the selected period")}
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
          <Button onClick={handleShow} disabled={loading} className="text-white bg-blue-600 w-[120px]">
            {loading ? t("loading", "Loading...") : t("show", "Show")}
          </Button>
          <Button onClick={handleExportPDF} disabled={!report} className="text-white bg-red-600 w-[130px] flex items-center gap-2">
            <FileDown size={16} />
            {t("export_pdf", "Export PDF")}
          </Button>
          <Button onClick={handleExportExcel} disabled={!report} className="text-white bg-green-600 w-[140px] flex items-center gap-2">
            <FileSpreadsheet size={16} />
            {t("export_excel", "Export Excel")}
          </Button>
        </div>
      </div>

      <div className="mx-2 space-y-4">
        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-16 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              {t("loading", "Loading...")}
            </CardContent>
          </Card>
        )}

        {!loading && !report && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                {t("select_dates_click_show", "Select the dates, then click Show to view the report")}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && report && s && (
          <>
            <p className="text-xs text-gray-500 text-left px-1">
              {t("period", "Period")}:{" "}
              <span className="font-semibold text-gray-700">
                {formatPLDate(report.period.from)} → {formatPLDate(report.period.to)}
              </span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {kpis.map((kpi) => (
                <Card key={kpi.label} className="py-0 gap-0">
                  <CardContent className="flex items-center gap-3 px-4 py-3 text-left">
                    <div className={`p-2.5 rounded-xl shrink-0 ${kpi.tone}`}>
                      <kpi.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      {/* leading-5: truncate clips overflow, and the default line box cuts off Devanagari vowel signs */}
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-5 truncate">{kpi.label}</p>
                      <p className="text-lg font-bold text-gray-900 tabular-nums truncate">{kpi.value}</p>
                      <p className="text-xs text-gray-500 truncate">{kpi.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className={`overflow-hidden py-0 gap-0 ${isLoss ? "border-rose-200" : "border-emerald-200"}`}>
                <div className="px-4 py-3 border-b bg-slate-50 border-slate-200">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">{t("profit_and_loss", "Profit & Loss")}</h2>
                </div>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      {summaryRow(t("total_sale", "Total Sale"), formatMoney(s.sale_amount))}
                      {summaryRow(t("less_cost_of_milk_sold", "Less: Cost of Milk Sold"), formatMoney(-s.cost_of_sold), "text-rose-700")}
                    </tbody>
                    <tfoot>
                      <tr className={isLoss ? "bg-rose-50/60" : "bg-emerald-50/60"}>
                        <td className="px-4 py-3 text-left">
                          <span className="font-bold text-gray-800">{isLoss ? t("gross_loss", "Gross Loss") : t("gross_profit", "Gross Profit")}</span>
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide border ${
                            isLoss ? "bg-rose-100 text-rose-800 border-rose-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums whitespace-nowrap ${plClass(s.gross_profit)}`}>
                          <span className="block text-xl font-bold">{formatMoney(s.gross_profit)}</span>
                          <span className="block text-xs font-semibold text-gray-500">{t("margin", "Margin")} {s.margin_percent.toFixed(2)}%</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>

              <Card className="overflow-hidden py-0 gap-0">
                <div className="px-4 py-3 border-b bg-slate-50 border-slate-200">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">{t("purchase_and_stock", "Purchase & Stock")}</h2>
                </div>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      {summaryRow(`${t("tankers_purchased", "Tankers Purchased")} (${s.purchase_count})`, `${formatLiter(s.purchase_liter)} · ${formatMoney(s.purchase_amount)}`)}
                      {summaryRow(`${t("milk_sold", "Milk Sold")} (${s.sale_count})`, `${formatLiter(s.sold_liter)} · ${formatMoney(s.sale_amount)}`)}
                      {summaryRow(`${t("cost_of_milk_sold", "Cost of Milk Sold")}`, formatMoney(s.cost_of_sold))}
                      {summaryRow(t("unsold_milk_at_cost", "Unsold Milk (at purchase cost)"), `${formatLiter(s.unsold_liter)} · ${formatMoney(s.unsold_value)}`, "text-amber-700", true)}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden py-0 gap-0">
              <div className="px-4 py-3 border-b bg-slate-50 border-slate-200">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">{t("tanker_wise_profit_loss", "Tanker-wise Profit & Loss")}</h2>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1100px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                        <th className={`${th} text-left`}>{t("date", "Date")}</th>
                        <th className={`${th} text-left`}>{t("voucher", "Voucher")}</th>
                        <th className={`${th} text-left`}>{t("supplier_buyer", "Supplier / Buyer")}</th>
                        <th className={`${th} text-left`}>{t("vehicle_number", "Vehicle")}</th>
                        <th className={`${th} text-left`}>{t("milk_type", "Milk Type")}</th>
                        <th className={`${th} text-right`}>{t("qty", "Qty")} (L)</th>
                        <th className={`${th} text-right`}>{t("rate", "Rate")}</th>
                        <th className={`${th} text-right`}>{t("purchase_amount", "Purchase Amount")}</th>
                        <th className={`${th} text-right`}>{t("sold_qty", "Sold Qty")} (L)</th>
                        <th className={`${th} text-right`}>{t("sale_amount", "Sale Amount")}</th>
                        <th className={`${th} text-right`}>{t("cost_of_milk_sold", "Cost of Milk Sold")}</th>
                        <th className={`${th} text-right`}>{t("profit_loss", "Profit / Loss")}</th>
                        <th className={`${th} text-center`}>{t("status", "Status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.tankers.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                            {t("no_tanker_purchases", "No tanker purchases in this period")}
                          </td>
                        </tr>
                      ) : report.tankers.map((tk) => (
                        <Fragment key={tk.purchase_id}>
                          <tr className="border-t-2 border-gray-200 bg-white">
                            <td className="px-3 py-2.5 text-left whitespace-nowrap">{formatPLDate(tk.date)}</td>
                            <td className="px-3 py-2.5 text-left font-semibold text-gray-900">{tk.voucher_no}</td>
                            <td className="px-3 py-2.5 text-left font-semibold text-gray-900">{tk.supplier_name}</td>
                            <td className="px-3 py-2.5 text-left">
                              {show(tk.vehicle_number)}
                              <span className="block text-xs text-gray-500">{show(tk.driver_name)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-left">{show(tk.milk_type)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{amount(tk.purchase_liter)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{amount(tk.purchase_rate)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{amount(tk.purchase_amount)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{amount(tk.sold_liter)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{amount(tk.sale_amount)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{amount(tk.cost_of_sold)}</td>
                            <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${plClass(tk.profit)}`}>{amount(tk.profit)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap ${STATUS_STYLE[tk.status] || STATUS_STYLE.Unsold}`}>
                                {tk.status}
                              </span>
                            </td>
                          </tr>
                          {tk.sales.map((sale) => (
                            <tr key={sale.sale_id} className="bg-gray-50/60 text-gray-600 text-xs">
                              <td className="px-3 py-1.5 text-left whitespace-nowrap">{formatPLDate(sale.date)}</td>
                              <td className="px-3 py-1.5 text-left">{sale.voucher_no}</td>
                              <td className="px-3 py-1.5 text-left pl-6"><span className="text-gray-400 mr-1">↳</span>{sale.buyer_name}</td>
                              <td className="px-3 py-1.5 text-left">{show(sale.vehicle_number)}</td>
                              <td className="px-3 py-1.5 text-left">{show(sale.milk_type)}</td>
                              <td className="px-3 py-1.5" />
                              <td className="px-3 py-1.5 text-right tabular-nums">{amount(sale.rate_per_liter)}</td>
                              <td className="px-3 py-1.5" />
                              <td className="px-3 py-1.5 text-right tabular-nums">{amount(sale.liter)}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums">{amount(sale.total_amount)}</td>
                              <td className="px-3 py-1.5" colSpan={3} />
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                    {report.tankers.length > 0 && (
                      <tfoot>
                        <tr className="bg-amber-50 border-t-2 border-amber-200 font-bold">
                          <td className="px-3 py-3 text-left" colSpan={5}>{t("total", "Total")}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{amount(s.purchase_liter)}</td>
                          <td className="px-3 py-3" />
                          <td className="px-3 py-3 text-right tabular-nums">{amount(s.purchase_amount)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{amount(s.sold_liter)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{amount(s.sale_amount)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{amount(s.cost_of_sold)}</td>
                          <td className={`px-3 py-3 text-right tabular-nums ${plClass(s.gross_profit)}`}>{amount(s.gross_profit)}</td>
                          <td className="px-3 py-3" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-gray-500 text-left px-1">
              {t(
                "tanker_profit_loss_note",
                "Tankers purchased in the period, with every sale made from them. Profit = sale amount − purchase cost of the milk sold; unsold milk is stock at purchase cost, not a loss. Amounts include commission."
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default TankerProfitLossReport;
