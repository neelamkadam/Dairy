import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/store";
import { useVlcNumbering } from "@/utils/vlcSectionLabel";
import AxiosClient from "@/services/interceptor";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  generateTankerDispatchReportHtml,
  TankerDispatchReportRow,
} from "@/templates/TankerDispatchReportTemplateHtml";
import PdfLoader from "@/components/PdfLoader";

const TankerDispatchReport = () => {
  const { branches } = useAppSelector((state) => state.branch);
  // VLC numbers (1, 2, 3 …) for the web user who uses them; "" for everyone else.
  const vlcNo = useVlcNumbering();
  const [vlcId, setVlcId] = useState<string>("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportData, setReportData] = useState<TankerDispatchReportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const selectedBranch = branches?.find((b) => b.username === vlcId);

  const toNum = (value: any) => {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
  };

  const display = (value: any, decimals = 2) => {
    if (value === null || value === undefined || value === "") return "-";
    const n = parseFloat(value);
    return isNaN(n) ? "-" : n.toFixed(decimals);
  };

  // Time arrives as a plain "HH:mm:ss" clock value.
  const formatTime = (value?: string) => {
    if (!value) return '-';
    const [hourStr, minuteStr] = value.split(':');
    const hour = Number(hourStr);
    if (isNaN(hour)) return value;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(hour12).padStart(2, '0')}:${minuteStr || '00'} ${suffix}`;
  };

  const diffClass = (value: any) => {
    const n = parseFloat(value);
    if (isNaN(n)) return "text-gray-700";
    if (n < 0) return "text-red-600";
    if (n > 0) return "text-green-600";
    return "text-gray-700";
  };

  // Build entry rows + a TOTAL row that carries the dispatch vs dairy difference.
  const buildRows = (entries: any[], summary: any): TankerDispatchReportRow[] => {
    const rows: TankerDispatchReportRow[] = entries.map((entry: any) => ({
      time: formatTime(entry.time),
      vehicleNumber: entry.vehicle_number,
      driverName: entry.driver_name,
      destinationName: entry.destination_name,
      milkType: entry.milk_type,
      dispatch: {
        // Liter is the dispatched quantity; fall back to weight when it is absent.
        qty: entry.liter ?? entry.weight,
        fat: entry.avg_fat,
        snf: entry.avg_snf,
        clr: entry.avg_clr ?? null,
        amount: entry.total_amount,
      },
      dairy: null,
      difference: null,
    }));

    // Dispatch totals — quantity/amount summed, fat & SNF weighted by quantity.
    let totalQty = 0;
    let weightedFat = 0;
    let weightedSnf = 0;
    let totalAmount = 0;

    entries.forEach((entry: any) => {
      const qty = toNum(entry.liter ?? entry.weight);
      totalQty += qty;
      weightedFat += toNum(entry.avg_fat) * qty;
      weightedSnf += toNum(entry.avg_snf) * qty;
      totalAmount += toNum(entry.total_amount);
    });

    const dispatchTotals = {
      qty: totalQty,
      fat: totalQty > 0 ? weightedFat / totalQty : 0,
      snf: totalQty > 0 ? weightedSnf / totalQty : 0,
      clr: null as any,
      amount: totalAmount,
    };

    const dairyTotals = {
      qty: toNum(summary?.total_qty),
      fat: toNum(summary?.avg_fat),
      snf: toNum(summary?.avg_snf),
      clr: summary?.avg_clr ?? null,
      amount: toNum(summary?.total_amount),
    };

    rows.push({
      isSummary: true,
      label: "TOTAL (Dispatch vs Dairy)",
      dispatch: dispatchTotals,
      dairy: dairyTotals,
      difference: {
        qty: dispatchTotals.qty - dairyTotals.qty,
        fat: dispatchTotals.fat - dairyTotals.fat,
        snf: dispatchTotals.snf - dairyTotals.snf,
        clr: null,
        amount: dispatchTotals.amount - dairyTotals.amount,
      },
    });

    return rows;
  };

  const handleShow = async () => {
    if (!vlcId) {
      toast.error("Please select a VLC");
      return;
    }
    if (!selectedBranch) {
      toast.error("Selected VLC not found");
      return;
    }

    setLoading(true);
    try {
      const { data } = await AxiosClient.get("/web/collection/daily-summary", {
        params: {
          date,
          vlc: vlcId,
          dairy_id: selectedBranch.branch_id,
        },
      });

      if (data?.success) {
        const entries = Array.isArray(data.dispatch_entries) ? data.dispatch_entries : [];
        if (entries.length === 0) {
          toast.error("No dispatch entries found for the selected VLC and date");
        }
        setReportData(buildRows(entries, data.collection_summary));
      } else {
        toast.error(data?.message || "Failed to fetch report");
        setReportData(null);
      }
    } catch (error: any) {
      console.error("Tanker Dispatch Report API Error:", error);
      toast.error(error?.response?.data?.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const generatePage = async (htmlContent: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.width = "297mm"; // A4 landscape width
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1123, // A4 landscape pixels at 96 DPI
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      return { imgData, imgWidth, imgHeight };
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData || reportData.length === 0) {
      toast.error("No data to export");
      return;
    }

    setPdfLoading(true);
    try {
      const branchLabel = selectedBranch
        ? `${selectedBranch.name}${selectedBranch.branchName ? " - " + selectedBranch.branchName : ""}`
        : vlcId;

      const htmlContent = generateTankerDispatchReportHtml(reportData, `${vlcNo.prefix(vlcId)}${vlcId}`, branchLabel, date);
      const { imgData, imgWidth, imgHeight } = await generatePage(htmlContent);
      const pdf = new jsPDF("l", "mm", "a4");
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Tanker_Dispatch_Report_${vlcId}_${date}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="p-2 sm:p-4 bg-white w-full min-h-screen flex flex-col">
      <PdfLoader isLoading={pdfLoading} />
      <div className="flex flex-col items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 px-2 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          Tanker Dispatch Report
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
        <div>
          <Label className="mb-1">VLC Name</Label>
          <VLCDropdown
            branches={branches || []}
            value={vlcId}
            onChange={(val) => setVlcId(val as string)}
            valueKey="username"
            placeholder="Select VLC"
          />
        </div>
        <div>
          <Label className="mb-1">Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-gray-200"
          />
        </div>
        <div className="lg:col-span-4 flex justify-end">
          <Button
            onClick={handleShow}
            disabled={loading}
            className="text-white bg-blue-600 w-[120px]"
          >
            {loading ? "Loading..." : "Show"}
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 mx-2 mb-4">
        <Button
          onClick={handleExportPDF}
          disabled={!reportData || reportData.length === 0}
          className="text-white bg-red-600 w-[120px] mt-4.5 flex items-center gap-2"
        >
          <FileDown size={16} />
          Export PDF
        </Button>
      </div>

      <div className="overflow-x-auto mt-2 border border-gray-200 rounded-lg shadow-sm">
        <Table className="whitespace-nowrap text-sm [&_th]:h-auto [&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3 [&_th]:align-middle">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">Time</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">Vehicle / Driver</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">Destination</TableHead>
              <TableHead rowSpan={2} className="text-left border border-gray-200 font-bold text-gray-900">Milk Type</TableHead>
              <TableHead colSpan={5} className="text-center border border-gray-200 font-bold text-green-900 py-2">
                Dispatch Entry
              </TableHead>
              <TableHead colSpan={5} className="text-center border border-gray-200 font-bold text-blue-900 py-2">
                Dairy Data
              </TableHead>
              <TableHead colSpan={5} className="text-center border border-gray-200 font-bold text-purple-900 py-2">
                Difference (Dispatch - Dairy)
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="text-right font-semibold bg-green-50 border border-gray-200 text-green-800">Qty</TableHead>
              <TableHead className="text-right font-semibold bg-green-50 border border-gray-200 text-green-800">Fat</TableHead>
              <TableHead className="text-right font-semibold bg-green-50 border border-gray-200 text-green-800">SNF</TableHead>
              <TableHead className="text-right font-semibold bg-green-50 border border-gray-200 text-green-800">CLR</TableHead>
              <TableHead className="text-right font-semibold bg-green-50 border border-gray-200 text-green-800">Amount</TableHead>
              <TableHead className="text-right font-semibold bg-blue-50 border border-gray-200 text-blue-800">Qty</TableHead>
              <TableHead className="text-right font-semibold bg-blue-50 border border-gray-200 text-blue-800">Fat</TableHead>
              <TableHead className="text-right font-semibold bg-blue-50 border border-gray-200 text-blue-800">SNF</TableHead>
              <TableHead className="text-right font-semibold bg-blue-50 border border-gray-200 text-blue-800">CLR</TableHead>
              <TableHead className="text-right font-semibold bg-blue-50 border border-gray-200 text-blue-800">Amount</TableHead>
              <TableHead className="text-right font-semibold bg-purple-50 border border-gray-200 text-purple-800">Qty</TableHead>
              <TableHead className="text-right font-semibold bg-purple-50 border border-gray-200 text-purple-800">Fat</TableHead>
              <TableHead className="text-right font-semibold bg-purple-50 border border-gray-200 text-purple-800">SNF</TableHead>
              <TableHead className="text-right font-semibold bg-purple-50 border border-gray-200 text-purple-800">CLR</TableHead>
              <TableHead className="text-right font-semibold bg-purple-50 border border-gray-200 text-purple-800">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData && reportData.length > 0 ? (
              reportData.map((row, index) => {
                const isSummaryRow = !!row.isSummary;

                if (isSummaryRow) {
                  return (
                    <TableRow key={index} className="bg-amber-50 hover:bg-amber-100">
                      <TableCell colSpan={4} className="border border-gray-200 text-left font-bold text-gray-900 bg-amber-100">
                        {row.label}
                      </TableCell>
                      <TableCell className="border border-gray-200 text-right font-bold bg-green-100 text-green-900">{display(row.dispatch.qty)}</TableCell>
                      <TableCell className="border border-gray-200 text-right font-bold bg-green-100 text-green-900">{display(row.dispatch.fat)}</TableCell>
                      <TableCell className="border border-gray-200 text-right font-bold bg-green-100 text-green-900">{display(row.dispatch.snf)}</TableCell>
                      <TableCell className="border border-gray-200 text-right font-bold bg-green-100 text-green-900">{display(row.dispatch.clr)}</TableCell>
                      <TableCell className="border border-gray-200 text-right font-bold bg-green-100 text-green-900">{display(row.dispatch.amount)}</TableCell>
                      <TableCell className="border border-gray-200 text-right font-bold bg-blue-100 text-blue-900">{display(row.dairy?.qty)}</TableCell>
                      <TableCell className="border border-gray-200 text-right font-bold bg-blue-100 text-blue-900">{display(row.dairy?.fat)}</TableCell>
                      <TableCell className="border border-gray-200 text-right font-bold bg-blue-100 text-blue-900">{display(row.dairy?.snf)}</TableCell>
                      <TableCell className="border border-gray-200 text-right font-bold bg-blue-100 text-blue-900">{display(row.dairy?.clr)}</TableCell>
                      <TableCell className="border border-gray-200 text-right font-bold bg-blue-100 text-blue-900">{display(row.dairy?.amount)}</TableCell>
                      <TableCell className={`border border-gray-200 text-right font-bold bg-purple-100 ${diffClass(row.difference?.qty)}`}>{display(row.difference?.qty)}</TableCell>
                      <TableCell className={`border border-gray-200 text-right font-bold bg-purple-100 ${diffClass(row.difference?.fat)}`}>{display(row.difference?.fat)}</TableCell>
                      <TableCell className={`border border-gray-200 text-right font-bold bg-purple-100 ${diffClass(row.difference?.snf)}`}>{display(row.difference?.snf)}</TableCell>
                      <TableCell className={`border border-gray-200 text-right font-bold bg-purple-100 ${diffClass(row.difference?.clr)}`}>{display(row.difference?.clr)}</TableCell>
                      <TableCell className={`border border-gray-200 text-right font-bold bg-purple-100 ${diffClass(row.difference?.amount)}`}>{display(row.difference?.amount)}</TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="border border-gray-200 text-left font-medium bg-gray-50">{row.time || "-"}</TableCell>
                    <TableCell className="border border-gray-200 text-left font-medium bg-gray-50">
                      {row.vehicleNumber || "-"}
                      <span className="block text-xs font-normal text-gray-500">{row.driverName || "-"}</span>
                    </TableCell>
                    <TableCell className="border border-gray-200 text-left font-medium bg-gray-50">{row.destinationName || "-"}</TableCell>
                    <TableCell className="border border-gray-200 text-left font-medium bg-gray-50">{row.milkType || "-"}</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-green-50/30">{display(row.dispatch.qty)}</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-green-50/30">{display(row.dispatch.fat)}</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-green-50/30">{display(row.dispatch.snf)}</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-green-50/30">{display(row.dispatch.clr)}</TableCell>
                    <TableCell className="border border-gray-200 text-right font-semibold bg-green-50/30">{display(row.dispatch.amount)}</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-blue-50/30">-</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-blue-50/30">-</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-blue-50/30">-</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-blue-50/30">-</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-blue-50/30">-</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-purple-50/30">-</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-purple-50/30">-</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-purple-50/30">-</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-purple-50/30">-</TableCell>
                    <TableCell className="border border-gray-200 text-right bg-purple-50/30">-</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={19} className="text-center py-10 text-gray-500 bg-gray-50">
                  Select VLC and date, then click Show to view the report
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TankerDispatchReport;
