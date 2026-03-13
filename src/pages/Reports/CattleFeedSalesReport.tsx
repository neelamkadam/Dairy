import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/redux/store";
import { cattleFeedApi, CattleFeedStock } from "@/services/cattleFeedApi";
import { paymentApi } from "@/services/paymentApi";

interface FarmerPaymentLog {
  id: number;
  date: string;
  dairy_id?: string | number;
  farmer_id: string | number;
  farmer_name?: string;
  payment_type: string;
  amount_taken?: string | number;
  received?: string | number;
  descriptions?: string | null;
  stock?: string | number;
  stock_name?: string;
}

interface FarmerPaymentLogsResponse {
  message: string;
  count: number;
  data: FarmerPaymentLog[];
}

interface SalesRow {
  id: number;
  date: string;
  farmerCode: string;
  farmerName: string;
  feedType: string;
  qty: number;
  rate: number;
  amount: number;
}

interface StockSummaryRow {
  feedType: string;
  qty: number;
  amount: number;
}

interface CattleFeedStockSummaryResponse {
  success: boolean;
  data: CattleFeedStock[];
}

const CattleFeedSalesReport = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [stockSummaryRows, setStockSummaryRows] = useState<StockSummaryRow[]>([]);

  const calculateDateRange = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);

    let startDay: number;
    let endDay: number;
    if (day >= 1 && day <= 10) {
      startDay = 1;
      endDay = 10;
    } else if (day >= 11 && day <= 20) {
      startDay = 11;
      endDay = 20;
    } else {
      startDay = 21;
      endDay = new Date(year, month, 0).getDate();
    }

    return {
      from: `${year}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`,
      to: `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
    };
  };

  const todayDates = calculateDateRange(new Date().toISOString().split("T")[0]);
  const [startDate, setStartDate] = useState<string>(todayDates.from);
  const [endDate, setEndDate] = useState<string>(todayDates.to);

  const handleStartDateChange = (newDate: string) => {
    const dates = calculateDateRange(newDate);
    setStartDate(dates.from);
    setEndDate(dates.to);
  };

  const selectedBranch = useMemo(
    () => branches?.find((branch) => String(branch.branch_id) === dairyId),
    [branches, dairyId]
  );

  const parseFeedDetails = (payment: FarmerPaymentLog) => {
    const amount = parseFloat(String(payment.amount_taken || payment.received || 0)) || 0;
    const qtyFromStock = Number(payment.stock || 0);
    const raw = (payment.descriptions || "").trim();

    if (payment.stock_name) {
      const derivedRate = qtyFromStock > 0 ? amount / qtyFromStock : 0;
      return {
        feedType: payment.stock_name,
        qty: qtyFromStock,
        rate: Number.isFinite(derivedRate) ? derivedRate : 0,
        amount,
      };
    }

    if (raw) {
      const parts = raw.split(":").map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const qty = Number(parts[1]);
        const rate = Number(parts[2]);
        return {
          feedType: parts[0] || "Cattle Feed",
          qty: Number.isFinite(qty) ? qty : 0,
          rate: Number.isFinite(rate) ? rate : 0,
          amount,
        };
      }

      if (parts.length >= 2) {
        const qty = Number(parts[1]);
        const derivedRate = Number.isFinite(qty) && qty > 0 ? amount / qty : 0;
        return {
          feedType: parts[0] || "Cattle Feed",
          qty: Number.isFinite(qty) ? qty : 0,
          rate: Number.isFinite(derivedRate) ? derivedRate : 0,
          amount,
        };
      }

      return {
        feedType: raw,
        qty: qtyFromStock,
        rate: qtyFromStock > 0 ? amount / qtyFromStock : 0,
        amount,
      };
    }

    return {
      feedType: "Cattle Feed",
      qty: qtyFromStock,
      rate: qtyFromStock > 0 ? amount / qtyFromStock : 0,
      amount,
    };
  };

  const totalStockSummary = useMemo(
    () => stockSummaryRows.reduce(
      (accumulator, row) => ({
        qty: accumulator.qty + row.qty,
        amount: accumulator.amount + row.amount,
      }),
      { qty: 0, amount: 0 }
    ),
    [stockSummaryRows]
  );

  const handleShowReport = async () => {
    if (!dairyId) {
      toast.error("Please select dairy");
      return;
    }

    setLoading(true);
    try {
      const [paymentResponse, stockResponse] = await Promise.all([
        paymentApi.getFarmerPaymentLogs(dairyId),
        cattleFeedApi.getStockSummary(dairyId),
      ]);

      const logs = ((paymentResponse.data as FarmerPaymentLogsResponse)?.data || []).filter((payment) => {
        const normalizedType = payment.payment_type?.toLowerCase().replace(/\s/g, "") || "";
        const normalizedDate = String(payment.date || "").includes("T")
          ? String(payment.date).split("T")[0]
          : String(payment.date || "");
        const hasFeedContext = Boolean(payment.stock_name) || Boolean(payment.stock) || Boolean(payment.descriptions);

        return normalizedDate >= startDate
          && normalizedDate <= endDate
          && (normalizedType === "cattlefeed" || hasFeedContext);
      });

      const transformedRows = logs
        .map((payment) => {
          const parsed = parseFeedDetails(payment);
          return {
            id: payment.id,
            date: payment.date,
            farmerCode: String(payment.farmer_id),
            farmerName: payment.farmer_name || "-",
            feedType: parsed.feedType,
            qty: parsed.qty,
            rate: parsed.rate,
            amount: parsed.amount,
          };
        })
        .sort((left, right) => {
          const leftDate = String(left.date).includes("T") ? String(left.date).split("T")[0] : String(left.date);
          const rightDate = String(right.date).includes("T") ? String(right.date).split("T")[0] : String(right.date);
          if (leftDate !== rightDate) {
            return leftDate.localeCompare(rightDate);
          }
          const leftCode = Number(left.farmerCode);
          const rightCode = Number(right.farmerCode);
          return leftCode - rightCode;
        });

      const stockData = (stockResponse as CattleFeedStockSummaryResponse)?.data || [];
      const stockSummaryMap = stockData.reduce<Record<string, StockSummaryRow>>((accumulator, stockItem) => {
        const feedType = stockItem.stock_name?.trim() || "Cattle Feed";
        const qty = Number(stockItem.stock || 0);
        const rate = Number(stockItem.amount || 0);
        const totalAmount = qty * rate;

        if (!accumulator[feedType]) {
          accumulator[feedType] = {
            feedType,
            qty: 0,
            amount: 0,
          };
        }

        accumulator[feedType].qty += qty;
        accumulator[feedType].amount += totalAmount;
        return accumulator;
      }, {});

      const transformedSummaryRows = Object.values(stockSummaryMap).sort((left, right) =>
        left.feedType.localeCompare(right.feedType)
      );

      setRows(transformedRows);
      setStockSummaryRows(transformedSummaryRows);
      toast.success("Report loaded successfully");
    } catch (error: unknown) {
      const errorWithResponse = error as { response?: { data?: { message?: string } } };
      toast.error(errorWithResponse.response?.data?.message || "Failed to fetch report");
      setRows([]);
      setStockSummaryRows([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (rows.length === 0) {
      toast.error("No data available");
      return;
    }

    const doc = new jsPDF();
    const dairyName = selectedBranch
      ? `${selectedBranch.username} - ${selectedBranch.name}`
      : "";

    doc.setFontSize(16);
    doc.text("Cattle Feed Sales Report", 14, 15);
    doc.setFontSize(10);
    doc.text(dairyName, 14, 22);
    doc.text(`Period: ${format(new Date(startDate), "dd-MM-yyyy")} to ${format(new Date(endDate), "dd-MM-yyyy")}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [["Date", "Farmer Code", "Farmer Name", "Feed Type", "Qty (Kg/Bag)", "Rate", "Amount"]],
      body: rows.map((row) => [
        format(new Date(row.date.includes("T") ? row.date.split("T")[0] : row.date), "dd-MM-yy"),
        row.farmerCode,
        row.farmerName,
        row.feedType,
        row.qty > 0 ? row.qty.toString() : "-",
        row.rate > 0 ? row.rate.toFixed(2) : "-",
        row.amount.toFixed(2),
      ]),
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] },
    });

    if (stockSummaryRows.length > 0) {
      autoTable(doc, {
        startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
          ? ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 35) + 10
          : 35,
        head: [["Feed Type", "Qty", "Amount"]],
        body: [
          ...stockSummaryRows.map((row) => [
            row.feedType,
            row.qty.toString(),
            row.amount.toFixed(2),
          ]),
          ["Total", totalStockSummary.qty.toString(), totalStockSummary.amount.toFixed(2)],
        ],
        theme: "grid",
        headStyles: { fillColor: [66, 139, 202] },
        didParseCell: (data) => {
          const isTotalRow = data.section === "body" && data.row.index === stockSummaryRows.length;
          if (isTotalRow) {
            data.cell.styles.textColor = [255, 0, 0];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
    }

    doc.save(`Cattle_Feed_Sales_Report_${startDate}_to_${endDate}.pdf`);
    toast.success("PDF exported successfully");
  };

  return (
    <div className="p-4">
      <div className="text-left p-4">
        <h1 className="font-bold text-2xl">Cattle Feed Sales Report</h1>
        <p className="text-sm text-gray-600">
          Cattle feed sales report from {format(new Date(startDate), "dd-MM-yyyy")} to {format(new Date(endDate), "dd-MM-yyyy")}.
        </p>
      </div>

      <Card className="border-gray-300 mb-7">
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="mb-1">Dairy</Label>
              <Select value={dairyId} onValueChange={setDairyId}>
                <SelectTrigger className="w-full border-gray-200">
                  <SelectValue placeholder="Select dairy" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {branches?.map((branch) => (
                    <SelectItem key={branch.branch_id} value={String(branch.branch_id)}>
                      {branch.username} - {branch.name} - {branch.branchName || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
                className="border-gray-200"
              />
            </div>

            <div>
              <Label className="mb-1">End Date</Label>
              <Input
                type="date"
                value={endDate}
                disabled
                className="bg-gray-100 cursor-not-allowed border-gray-200"
              />
            </div>

            <div className="flex items-end">
              <div className="flex gap-2">
                <Button onClick={handleShowReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? "Loading..." : "Show Report"}
                </Button>
                <Button
                  onClick={exportToPDF}
                  disabled={rows.length === 0}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="border-gray-300 mb-7">
          <CardContent className="p-4">
          <h2 className="font-semibold text-lg mb-4">
            Cattle Feed Sales Report ({format(new Date(startDate), "dd-MM-yyyy")} to {format(new Date(endDate), "dd-MM-yyyy")})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-center">Date</th>
                  <th className="border border-gray-300 p-2 text-center">Farmer Code</th>
                  <th className="border border-gray-300 p-2 text-center">Farmer Name</th>
                  <th className="border border-gray-300 p-2 text-center">Feed Type</th>
                  <th className="border border-gray-300 p-2 text-center">Qty (Kg/Bag)</th>
                  <th className="border border-gray-300 p-2 text-center">Rate</th>
                  <th className="border border-gray-300 p-2 text-center">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-center">
                      {format(new Date(row.date.includes("T") ? row.date.split("T")[0] : row.date), "dd-MM-yy")}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">{row.farmerCode}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.farmerName}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.feedType}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.qty || "-"}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.rate ? row.rate.toFixed(2) : "-"}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </CardContent>
        </Card>
      )}

      {stockSummaryRows.length > 0 && (
        <Card className="border-gray-300 mb-7">
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg mb-4">Feed Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full max-w-md border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-center">Feed Type</th>
                    <th className="border border-gray-300 p-2 text-center">Qty</th>
                    <th className="border border-gray-300 p-2 text-center">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {stockSummaryRows.map((row) => (
                    <tr key={row.feedType} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center">{row.feedType}</td>
                      <td className="border border-gray-300 p-2 text-center">{row.qty}</td>
                      <td className="border border-gray-300 p-2 text-center">{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold text-red-600">
                    <td className="border border-gray-300 p-2 text-center">Total</td>
                    <td className="border border-gray-300 p-2 text-center">{totalStockSummary.qty}</td>
                    <td className="border border-gray-300 p-2 text-center">{totalStockSummary.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CattleFeedSalesReport;
