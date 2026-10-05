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
import { FileDown, FileSpreadsheet } from "lucide-react";
import { tankerApi, TankerSaleRow, TankerVoucherRow } from "@/services/tankerApi";
import {
  buildTankerDaywiseRows,
  DaywiseRow,
  formatReportDate,
  TradeGroup,
  generateTankerDaywiseReportExcel,
  generateTankerDaywiseReportPDF,
} from "@/templates/TankerDaywiseReportTemplate";
import PdfLoader from "@/components/PdfLoader";

// Everything purchased and everything sold between two dates, each voucher on
// its own date, with a total for every day and a grand total.

const display = (value?: number | null) =>
  value === undefined || value === null ? "-" : value.toFixed(2);

const TankerDaywiseReport = () => {
  const { t } = useTranslation();
  const { userData } = useAppSelector((state) => state.authData);
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rows, setRows] = useState<DaywiseRow[] | null>(null);
  // The range the rows were loaded for, so an export never mislabels its period
  const [loadedRange, setLoadedRange] = useState({ from: "", to: "" });
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
      const { data } = await tankerApi.daywise(userData.id, fromDate, toDate);
      if (data?.success) {
        const purchases: TankerVoucherRow[] = Array.isArray(data.purchases) ? data.purchases : [];
        const sales: TankerSaleRow[] = Array.isArray(data.sales) ? data.sales : [];
        if (purchases.length === 0 && sales.length === 0) {
          toast.info(t("no_tanker_entries", "No tanker purchases or sales in this period"));
        }
        setRows(buildTankerDaywiseRows(purchases, sales));
        setLoadedRange({ from: fromDate, to: toDate });
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

  const exportMeta = () => ({ businessName: userData?.name || "", from: loadedRange.from, to: loadedRange.to });

  const handleExportPDF = () => {
    if (!rows || rows.length === 0) {
      toast.error(t("no_data_to_export", "No data to export"));
      return;
    }
    setPdfLoading(true);
    try {
      generateTankerDaywiseReportPDF(rows, exportMeta());
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error(t("failed_to_generate_pdf", "Failed to generate PDF"));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!rows || rows.length === 0) {
      toast.error(t("no_data_to_export", "No data to export"));
      return;
    }
    try {
      generateTankerDaywiseReportExcel(rows, exportMeta());
    } catch (error) {
      console.error("Excel Export Error:", error);
      toast.error(t("failed_to_generate_excel", "Failed to generate Excel"));
    }
  };

  const groupCells = (g: TradeGroup | null, cls: string, bold = false) =>
    [g?.qty, g?.fat, g?.snf, g?.rate, g?.amount].map((v, i) => (
      <TableCell key={i} className={`border border-gray-200 text-right ${cls} ${bold ? "font-bold" : ""}`}>
        {g ? display(v) : "-"}
      </TableCell>
    ));

  const countLabel = (row: DaywiseRow) =>
    `${t("purchase", "Purchase")}: ${row.purchaseCount ?? 0} · ${t("sale", "Sale")}: ${row.saleCount ?? 0}`;

  return (
    <div className="p-2 sm:p-4 bg-white w-full min-h-screen flex flex-col">
      <PdfLoader isLoading={pdfLoading} />
      <div className="flex flex-col items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 px-2 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          {t("tanker_daywise_report", "Tanker Day-wise Purchase & Sale Report")}
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
        <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
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
          <Button
            onClick={handleExportExcel}
            disabled={!rows || rows.length === 0}
            className="text-white bg-green-600 w-[140px] flex items-center gap-2"
          >
            <FileSpreadsheet size={16} />
            {t("export_excel", "Export Excel")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto mt-2 border border-gray-200 rounded-lg shadow-sm">
        <Table className="whitespace-nowrap text-sm [&_th]:h-auto [&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3 [&_th]:align-middle">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("date", "Date")}</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("type", "Type")}</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("voucher", "Voucher")}</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("supplier_buyer", "Supplier / Buyer")}</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("vehicle_driver", "Vehicle / Driver")}</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">{t("milk_type", "Milk Type")}</TableHead>
              <TableHead colSpan={5} className="text-center border border-gray-200 font-bold text-blue-900">{t("purchase", "Purchase")}</TableHead>
              <TableHead colSpan={5} className="text-center border border-gray-200 font-bold text-green-900">{t("sale", "Sale")}</TableHead>
            </TableRow>
            <TableRow>
              {["qty", "fat", "snf", "rate", "amount"].map((k) => (
                <TableHead key={`p-${k}`} className="text-right font-semibold bg-blue-50 border border-gray-200 text-blue-800">{t(k, k.toUpperCase())}</TableHead>
              ))}
              {["qty", "fat", "snf", "rate", "amount"].map((k) => (
                <TableHead key={`s-${k}`} className="text-right font-semibold bg-green-50 border border-gray-200 text-green-800">{t(k, k.toUpperCase())}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows && rows.length > 0 ? (
              rows.map((row, index) => {
                if (row.kind === "grand_total") {
                  return (
                    <TableRow key={index} className="bg-amber-50 hover:bg-amber-100">
                      <TableCell colSpan={6} className="border border-gray-200 text-left font-bold text-gray-900 bg-amber-100">
                        {t("grand_total", "Grand Total")}
                        <span className="ml-2 text-xs font-medium text-gray-600">({countLabel(row)})</span>
                      </TableCell>
                      {groupCells(row.purchase, "bg-blue-100 text-blue-900", true)}
                      {groupCells(row.sale, "bg-green-100 text-green-900", true)}
                    </TableRow>
                  );
                }
                if (row.kind === "day_total") {
                  return (
                    <TableRow key={index} className="bg-gray-100 hover:bg-gray-100 border-b-2 border-b-gray-300">
                      <TableCell colSpan={6} className="border border-gray-200 text-left font-bold text-gray-900">
                        {t("day_total", "Day Total")} · {formatReportDate(row.date)}
                        <span className="ml-2 text-xs font-medium text-gray-600">({countLabel(row)})</span>
                      </TableCell>
                      {groupCells(row.purchase, "text-blue-900", true)}
                      {groupCells(row.sale, "text-green-900", true)}
                    </TableRow>
                  );
                }
                const isSale = row.kind === "sale";
                return (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="border border-gray-200 text-left">{formatReportDate(row.date)}</TableCell>
                    <TableCell className="border border-gray-200 text-left">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${isSale ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                        {isSale ? t("sale", "Sale") : t("purchase", "Purchase")}
                      </span>
                    </TableCell>
                    <TableCell className="border border-gray-200 text-left font-semibold text-gray-900">
                      {row.voucher}
                      {row.fromPurchase && (
                        <span className="block text-xs font-normal text-gray-500">{t("from_purchase", "From Purchase")}: {row.fromPurchase}</span>
                      )}
                    </TableCell>
                    <TableCell className="border border-gray-200 text-left">{row.party}</TableCell>
                    <TableCell className="border border-gray-200 text-left">
                      {row.vehicle}
                      <span className="block text-xs font-normal text-gray-500">{row.driver}</span>
                    </TableCell>
                    <TableCell className="border border-gray-200 text-left">{row.milkType}</TableCell>
                    {groupCells(row.purchase, "bg-blue-50/30")}
                    {groupCells(row.sale, "bg-green-50/30")}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={16} className="text-center py-10 text-gray-500 bg-gray-50">
                  {t("select_dates_click_show", "Select the dates, then click Show to view the report")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {rows && rows.length > 0 && (
        <p className="text-xs text-gray-500 mt-2 mx-2">
          {t("tanker_daywise_note", "Each voucher is listed on its own date. Rate excludes commission; Amount includes it.")}
        </p>
      )}
    </div>
  );
};

export default TankerDaywiseReport;
