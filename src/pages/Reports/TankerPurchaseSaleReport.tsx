import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { format, startOfMonth } from "date-fns";
import { FileDown } from "lucide-react";
import { tankerApi, TankerReportPurchase } from "@/services/tankerApi";
import {
  buildTankerTradeRows,
  formatReportDate,
  generateTankerTradeReportPDF,
  TankerTradeRow,
  TradeDiff,
  TradeGroup,
} from "@/templates/TankerPurchaseSaleReportTemplate";
import PdfLoader from "@/components/PdfLoader";

// Purchases dated in the range, each followed by the sales made out of it, with
// the difference (sale - purchase) per tanker and a grand total.

const display = (value?: number | null) =>
  value === undefined || value === null ? "-" : value.toFixed(2);

const diffClass = (value?: number | null) => {
  if (value === undefined || value === null || Math.abs(value) < 0.005) return "text-gray-700";
  return value < 0 ? "text-red-600" : "text-green-600";
};

const TankerPurchaseSaleReport = () => {
  const { t } = useTranslation();
  const { userData } = useAppSelector((state) => state.authData);
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rows, setRows] = useState<TankerTradeRow[] | null>(null);
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
      const { data } = await tankerApi.report(userData.id, fromDate, toDate);
      if (data?.success) {
        const purchases: TankerReportPurchase[] = Array.isArray(data.data) ? data.data : [];
        if (purchases.length === 0) toast.info(t("no_tanker_purchases", "No tanker purchases in this period"));
        setRows(buildTankerTradeRows(purchases));
      } else {
        toast.error(data?.message || t("failed_fetch_report", "Failed to fetch report"));
        setRows(null);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_fetch_report", "Failed to fetch report"));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!rows || rows.length === 0) {
      toast.error(t("no_data_to_export", "No data to export"));
      return;
    }
    setPdfLoading(true);
    try {
      generateTankerTradeReportPDF(rows, { businessName: userData?.name || "", from: fromDate, to: toDate });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error(t("failed_to_generate_pdf", "Failed to generate PDF"));
    } finally {
      setPdfLoading(false);
    }
  };

  const groupCells = (g: TradeGroup | null, cls: string, bold = false) =>
    [g?.qty, g?.fat, g?.snf, g?.rate, g?.amount].map((v, i) => (
      <TableCell key={i} className={`border border-gray-200 text-right ${cls} ${bold ? "font-bold" : ""}`}>
        {g ? display(v) : "-"}
      </TableCell>
    ));

  const diffCells = (d: TradeDiff | null, cls: string, bold = false) =>
    [d?.qty, d?.fat, d?.snf, d?.amount].map((v, i) => (
      <TableCell key={i} className={`border border-gray-200 text-right ${cls} ${bold ? "font-bold" : ""} ${diffClass(v)}`}>
        {d ? display(v) : "-"}
      </TableCell>
    ));

  return (
    <div className="p-2 sm:p-4 bg-white w-full min-h-screen flex flex-col">
      <PdfLoader isLoading={pdfLoading} />
      <div className="flex flex-col items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 px-2 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          {t("tanker_purchase_sale_report", "Tanker Purchase & Sale Report")}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
        <div>
          <Label className="mb-1">{t("from_date", "From Date")}</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border-gray-200" />
        </div>
        <div>
          <Label className="mb-1">{t("to_date", "To Date")}</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border-gray-200" />
        </div>
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button onClick={handleShow} disabled={loading} className="text-white bg-blue-600 w-[120px]">
            {loading ? t("loading", "Loading...") : t("show", "Show")}
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={!rows || rows.length === 0}
            className="text-white bg-red-600 w-[130px] flex items-center gap-2"
          >
            <FileDown size={16} />
            {t("export_pdf", "Export PDF")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto mt-2 border border-gray-200 rounded-lg shadow-sm">
        <Table className="whitespace-nowrap text-sm [&_th]:h-auto [&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3 [&_th]:align-middle">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("date", "Date")}</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("voucher", "Voucher")}</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("vehicle_driver", "Vehicle / Driver")}</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("supplier_buyer", "Supplier / Buyer")}</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("milk_type", "Milk Type")}</TableHead>
              <TableHead colSpan={5} className="text-center border border-gray-200 font-bold text-blue-900">{t("purchase", "Purchase")}</TableHead>
              <TableHead colSpan={5} className="text-center border border-gray-200 font-bold text-green-900">{t("sale", "Sale")}</TableHead>
              <TableHead colSpan={4} className="text-center border border-gray-200 font-bold text-purple-900">
                {t("difference_sale_minus_purchase", "Difference (Sale - Purchase)")}
              </TableHead>
            </TableRow>
            <TableRow>
              {["qty", "fat", "snf", "rate", "amount"].map((k) => (
                <TableHead key={`p-${k}`} className="text-right font-semibold bg-blue-50 border border-gray-200 text-blue-800">{t(k, k.toUpperCase())}</TableHead>
              ))}
              {["qty", "fat", "snf", "rate", "amount"].map((k) => (
                <TableHead key={`s-${k}`} className="text-right font-semibold bg-green-50 border border-gray-200 text-green-800">{t(k, k.toUpperCase())}</TableHead>
              ))}
              {["qty", "fat", "snf", "amount"].map((k) => (
                <TableHead key={`d-${k}`} className="text-right font-semibold bg-purple-50 border border-gray-200 text-purple-800">{t(k, k.toUpperCase())}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows && rows.length > 0 ? (
              rows.map((row, index) => {
                if (row.kind === "total") {
                  return (
                    <TableRow key={index} className="bg-amber-50 hover:bg-amber-100">
                      <TableCell colSpan={5} className="border border-gray-200 text-left font-bold text-gray-900 bg-amber-100">
                        {t("total", "TOTAL")}
                      </TableCell>
                      {groupCells(row.purchase, "bg-blue-100 text-blue-900", true)}
                      {groupCells(row.sale, "bg-green-100 text-green-900", true)}
                      {diffCells(row.diff, "bg-purple-100", true)}
                    </TableRow>
                  );
                }
                const isSale = row.kind === "sale";
                return (
                  <TableRow key={index} className={isSale ? "hover:bg-gray-50 text-gray-600" : "hover:bg-gray-50 border-t-2 border-t-gray-300"}>
                    <TableCell className="border border-gray-200 text-left">{formatReportDate(row.date)}</TableCell>
                    <TableCell className={`border border-gray-200 text-left ${isSale ? "" : "font-semibold text-gray-900"}`}>{row.voucher}</TableCell>
                    <TableCell className="border border-gray-200 text-left">
                      {row.vehicle}
                      <span className="block text-xs font-normal text-gray-500">{row.driver}</span>
                    </TableCell>
                    <TableCell className={`border border-gray-200 text-left ${isSale ? "pl-6" : "font-semibold text-gray-900"}`}>
                      {isSale && <span className="text-gray-400 mr-1">↳</span>}
                      {row.party}
                    </TableCell>
                    <TableCell className="border border-gray-200 text-left">{row.milkType}</TableCell>
                    {groupCells(row.purchase, "bg-blue-50/30")}
                    {groupCells(row.sale, "bg-green-50/30")}
                    {diffCells(row.diff, "bg-purple-50/30", !isSale)}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={19} className="text-center py-10 text-gray-500 bg-gray-50">
                  {t("select_dates_click_show", "Select the dates, then click Show to view the report")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {rows && rows.length > 0 && (
        <p className="text-xs text-gray-500 mt-2 mx-2">
          {t(
            "tanker_report_note",
            "Purchase rows show the tanker's sales rolled up; indented rows are the individual sales. The total difference counts only tankers with at least one sale. Rate excludes commission; Amount includes it."
          )}
        </p>
      )}
    </div>
  );
};

export default TankerPurchaseSaleReport;
