import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { differenceInCalendarDays, endOfMonth, format, parseISO } from "date-fns";
import { useAppSelector } from "@/redux/store";
import { transportApi, Transport, TransportInvoice } from "@/services/transportApi";
import { generateTransportInvoiceExcel, generateTransportInvoicePDF, InvoiceMeta } from "@/templates/TransportInvoiceTemplate";
import { amountInWords } from "@/templates/DispatchVoucherTemplate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import PdfLoader from "@/components/PdfLoader";

// Reports → Transport Collection → Transport Bill Invoice: one transport's bill for
// a period — the KMs run each day (Morning / Evening), Total Km × Rate per KM.
// The bill number (NN/Mon/YYYY) is issued by the server on the first export of a
// transport + period and kept, so a reprint carries the same number.

const MAX_DAYS = 31;
const n2 = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const km = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
const dayLabel = (value: string) => format(parseISO(value), "d-MMM-yy");

const currentPeriod = () => {
  const now = new Date();
  const day = now.getDate();
  const start = new Date(now.getFullYear(), now.getMonth(), day <= 10 ? 1 : day <= 20 ? 11 : 21);
  const end = day <= 10 ? new Date(now.getFullYear(), now.getMonth(), 10)
    : day <= 20 ? new Date(now.getFullYear(), now.getMonth(), 20) : endOfMonth(now);
  return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
};

const TransportBillInvoice = () => {
  const { t } = useTranslation();
  const { userData } = useAppSelector((state) => state.authData);
  const userId = userData?.id;

  const [transports, setTransports] = useState<Transport[]>([]);
  const [transportId, setTransportId] = useState("");
  const [fromDate, setFromDate] = useState(currentPeriod().from);
  const [toDate, setToDate] = useState(currentPeriod().to);
  const [billDate, setBillDate] = useState(currentPeriod().to);
  const [issuing, setIssuing] = useState(false);
  const [invoice, setInvoice] = useState<TransportInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    transportApi.list(userId)
      .then((res) => setTransports(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => toast.error(t("failed_to_load_transports", "Failed to load transports")));
  }, [userId, t]);

  const handleShow = async () => {
    if (!userId) return;
    if (!transportId) {
      toast.error(t("select_transport_first", "Please select a transport"));
      return;
    }
    if (!fromDate || !toDate || fromDate > toDate) {
      toast.error(t("invalid_date_range", "Please select a valid date range"));
      return;
    }
    if (differenceInCalendarDays(parseISO(toDate), parseISO(fromDate)) + 1 > MAX_DAYS) {
      toast.error(t("invoice_max_31_days", "An invoice covers at most 31 days"));
      return;
    }
    setLoading(true);
    try {
      const { data } = await transportApi.invoice(userId, Number(transportId), fromDate, toDate);
      if (data?.success) {
        setInvoice({ period: data.period, bill: data.bill ?? null, transport: data.transport, routes: data.routes, rates: data.rates, days: data.days, totals: data.totals });
        // An issued bill keeps its own bill date; a new one defaults to the period end
        setBillDate(data.bill?.issued ? data.bill.bill_date : toDate);
        if (!data.totals?.trips) toast.info(t("no_tanker_trips", "No tanker trips in this period"));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_fetch_report", "Failed to fetch report"));
    } finally {
      setLoading(false);
    }
  };

  // Exporting issues the bill number (or returns the one already issued for this
  // transport + period) before the file is built, so the file always carries it
  const exportFile = async (kind: "pdf" | "excel") => {
    if (!invoice || !userId) return;
    if (!billDate) {
      toast.error(t("select_bill_date", "Please select the Bill Date"));
      return;
    }
    setIssuing(true);
    let bill;
    try {
      const { data } = await transportApi.issueBill({
        user_id: userId,
        transport_id: invoice.transport.id,
        from: invoice.period.from,
        to: invoice.period.to,
        bill_date: billDate,
      });
      if (!data?.success) return;
      bill = data.bill;
      setInvoice((prev) => (prev ? { ...prev, bill } : prev));
      if (data.bill?.created) toast.success(data.message);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_issue_bill_no", "Could not issue the bill number"));
      return;
    } finally {
      setIssuing(false);
    }

    const meta: InvoiceMeta = { businessName: userData?.name || "", billNo: bill.bill_no, billDate: bill.bill_date };
    if (kind === "excel") {
      generateTransportInvoiceExcel(invoice, meta);
      return;
    }
    setPdfLoading(true);
    try {
      generateTransportInvoicePDF(invoice, meta);
    } finally {
      setPdfLoading(false);
    }
  };

  const billBadge = invoice?.bill
    ? invoice.bill.issued
      ? <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">{t("issued", "Issued")}</span>
      : <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{t("assigned_on_export", "Assigned on export")}</span>
    : null;

  const tr = invoice?.transport;
  const info = (label: string, value?: string | null) => (
    <div className="flex gap-2 text-sm py-1 border-b border-gray-100">
      <span className="w-44 shrink-0 font-semibold text-gray-600">{label}</span>
      <span className="text-gray-900">{value || "-"}</span>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 bg-gray-50 min-h-screen">
      <PdfLoader isLoading={pdfLoading} />
      <div className="flex flex-col items-start text-left gap-1 px-2 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          {t("transport_bill_invoice", "Transport Bill Invoice")}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
        <div className="lg:col-span-2">
          <Label className="mb-1">{t("transport", "Transport")}</Label>
          <Select value={transportId} onValueChange={setTransportId}>
            <SelectTrigger className="w-full h-10"><SelectValue placeholder={t("select_transport", "Select Transport")} /></SelectTrigger>
            <SelectContent className="bg-white">
              {transports.map((x) => (
                <SelectItem key={x.id} value={String(x.id)}>{x.name}{x.vehicle_number ? ` · ${x.vehicle_number}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1">{t("from_date", "From Date")}</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10" />
        </div>
        <div>
          <Label className="mb-1">{t("to_date", "To Date")}</Label>
          <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setBillDate(e.target.value); }} className="h-10" />
        </div>
        <div>
          <Label className="mb-1">{t("bill_no", "Bill No.")} <span className="text-[10px] font-normal text-gray-500">({t("auto", "Auto")})</span></Label>
          <div className="h-10 flex items-center px-3 rounded-md border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800">
            {invoice?.bill?.bill_no || <span className="font-normal text-gray-400">{t("shown_after_show", "Shown after Show")}</span>}
            {billBadge}
          </div>
        </div>
        <div>
          <Label className="mb-1">{t("bill_date", "Bill Date")}</Label>
          <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="h-10" />
        </div>
        <div className="sm:col-span-2 lg:col-span-6 flex flex-wrap justify-end gap-2">
          <Button onClick={handleShow} disabled={loading} className="text-white bg-blue-600 w-[120px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("show", "Show")}
          </Button>
          <Button onClick={() => exportFile("pdf")} disabled={!invoice || issuing} className="text-white bg-red-600 w-[130px] flex items-center gap-2">
            <FileDown size={16} />{t("export_pdf", "Export PDF")}
          </Button>
          <Button onClick={() => exportFile("excel")} disabled={!invoice || issuing} className="text-white bg-green-600 w-[140px] flex items-center gap-2">
            <FileSpreadsheet size={16} />{t("export_excel", "Export Excel")}
          </Button>
        </div>
      </div>

      {invoice && tr && (
        <Card className="mx-2 py-0 gap-0">
          <CardContent className="p-4 space-y-4">
            <div className="text-center">
              <p className="text-lg font-bold">{userData?.name}</p>
              <p className="text-sm font-semibold text-gray-600">INVOICE</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                {info(t("transporter_name", "Transporter Name"), tr.name)}
                {info(t("vendor_code", "Vendor Code"), tr.vendor_code)}
                {info(t("service_tax_reg_no", "Service Tax Reg. No."), tr.service_tax_no || "NA")}
                {info(t("route_name", "Route Name"), invoice.routes.map((r) => r.route_name).join(", "))}
                {info(t("work_order_no", "Work Order No."), tr.work_order_no)}
                {info(t("pan_no", "PAN No."), tr.pan_no)}
              </div>
              <div>
                {info(t("address", "Address"), tr.address)}
                {info(t("bill_no", "Bill No."), invoice.bill?.bill_no)}
                {info(t("bmcc_mcc_name", "BMCC/MCC Name"), [...new Set(invoice.routes.map((r) => r.cc_name).filter(Boolean))].join(", "))}
                {info(t("route_no", "Route No."), invoice.routes.map((r) => r.route_id).join(", "))}
                {info(t("vehicle_number", "Vehicle No."), tr.vehicle_number)}
                {info(t("vehicle_capacity_type", "Vehicle Capacity / Type"), tr.vehicle_capacity)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-300">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th rowSpan={2} className="border border-gray-300 px-2 py-1">S No</th>
                    <th rowSpan={2} className="border border-gray-300 px-2 py-1">{t("date", "Date")}</th>
                    <th rowSpan={2} className="border border-gray-300 px-2 py-1">{t("from_bmc_name", "FROM BMC Name")}</th>
                    <th colSpan={2} className="border border-gray-300 px-2 py-1">KMS</th>
                    <th rowSpan={2} className="border border-gray-300 px-2 py-1">{t("total_kms", "Total Kms")}</th>
                  </tr>
                  <tr>
                    <th className="border border-gray-300 px-2 py-1">{t("morning", "Morning")}</th>
                    <th className="border border-gray-300 px-2 py-1">{t("evening", "Evening")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.days.map((d, i) => (
                    <tr key={d.date} className={d.total_km ? "" : "text-gray-400"}>
                      <td className="border border-gray-200 px-2 py-1 text-right">{i + 1}</td>
                      <td className="border border-gray-200 px-2 py-1 text-center">{dayLabel(d.date)}</td>
                      <td className="border border-gray-200 px-2 py-1 text-center">{d.bmc_name || ""}</td>
                      <td className="border border-gray-200 px-2 py-1 text-center tabular-nums">{d.morning_km ? km(d.morning_km) : ""}</td>
                      <td className="border border-gray-200 px-2 py-1 text-center tabular-nums">{d.evening_km ? km(d.evening_km) : ""}</td>
                      <td className="border border-gray-200 px-2 py-1 text-center tabular-nums">{km(d.total_km)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-bold">
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="border border-gray-300 px-2 py-1 text-right">{t("total_km", "Total Km")}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center tabular-nums">{km(invoice.totals.morning_km)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center tabular-nums">{km(invoice.totals.evening_km)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center tabular-nums">{km(invoice.totals.total_km)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border border-gray-300 px-2 py-1 text-right">{t("rate_per_km_at", "Rate per KM (Rs) @")}</td>
                    <td colSpan={3} className="border border-gray-300 px-2 py-1 text-center tabular-nums">{invoice.rates.map((r) => r.toFixed(2)).join(" / ") || "0.00"}</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td colSpan={3} className="border border-gray-300 px-2 py-1 text-right">{t("amount", "Amount")}</td>
                    <td colSpan={3} className="border border-gray-300 px-2 py-1 text-center tabular-nums">₹{n2(invoice.totals.amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-sm"><b>{t("rupees_in", "Rupees In")}:</b> {amountInWords(invoice.totals.amount)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TransportBillInvoice;
