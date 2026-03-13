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
import { paymentApi } from "@/services/paymentApi";

interface FarmerPayment {
  id: number;
  date: string;
  dairy_id?: string | number;
  farmer_id: string | number;
  farmer_name?: string;
  payment_type: string;
  amount_taken?: string | number;
  received?: string | number;
  descriptions?: string | null;
  status?: number;
  stock?: string | number;
  stock_name?: string;
}

interface FarmerPaymentLogsResponse {
  message: string;
  count: number;
  data: FarmerPayment[];
}

interface FarmerWiseRow {
  id: number;
  date: string;
  farmerCode: string;
  farmerName: string;
  feedType: string;
  qty: number;
  rate: number;
  amount: number;
}

const CattleFeedFarmerWiseReport = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FarmerWiseRow[]>([]);

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

  const parseFeedDetails = (payment: FarmerPayment) => {
    const raw = (payment.descriptions || "").trim();
    // amount_taken can come as string from API
    const amount = parseFloat(String(payment.amount_taken || payment.received || 0)) || 0;
    const qty = Number(payment.stock || 0);

    if (payment.stock_name) {
      const parsedRate = qty > 0 ? amount / qty : 0;
      return {
        feedType: payment.stock_name,
        qty,
        rate: Number.isFinite(parsedRate) ? parsedRate : 0,
        amount,
      };
    }

    const fallback = {
      feedType: "Cattle Feed",
      qty,
      rate: qty > 0 ? amount / qty : 0,
      amount,
    };

    if (!raw) return fallback;

    // Expect format like "stockName : qty : rate"
    const parts = raw.split(":").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const parsedQty = Number(parts[1]);
      const parsedRate = Number(parts[2]);
      const qty = Number.isFinite(parsedQty) ? parsedQty : 0;
      const rate = Number.isFinite(parsedRate) ? parsedRate : 0;
      return {
        feedType: parts[0] || "Cattle Feed",
        qty,
        rate,
        amount,
      };
    }

    return {
      feedType: raw || "Cattle Feed",
      qty: 0,
      rate: 0,
      amount,
    };
  };

  const handleShowReport = async () => {
    if (!dairyId) {
      toast.error("Please select dairy");
      return;
    }

    setLoading(true);
    try {
      const response = await paymentApi.getFarmerPaymentLogs(dairyId);

      const farmerFilter = farmerId.trim();
      const cattleFeedPayments: FarmerPayment[] = ((response.data as FarmerPaymentLogsResponse)?.data || []).filter((p: FarmerPayment) => {
        const normalizedPaymentType = p.payment_type?.toLowerCase().replace(/\s/g, "") || "";
        const normalizedDate = String(p.date || "").includes("T")
          ? String(p.date).split("T")[0]
          : String(p.date || "");
        const isWithinDateRange = normalizedDate >= startDate && normalizedDate <= endDate;
        const isCattleFeed = normalizedPaymentType === "cattlefeed" || Boolean(p.stock_name) || Boolean(p.stock) || Boolean(p.descriptions);

        if (!isWithinDateRange) return false;
        if (!isCattleFeed) return false;
        if (!farmerFilter) return true;
        return String(p.farmer_id) === farmerFilter;
      });

      const transformed: FarmerWiseRow[] = cattleFeedPayments.map((payment) => {
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
      });

      setRows(transformed);
      toast.success("Report loaded successfully");
    } catch (error: unknown) {
      const errorWithResponse = error as { response?: { data?: { message?: string } } };
      toast.error(errorWithResponse.response?.data?.message || "Failed to fetch report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedBranch = useMemo(
    () => branches?.find((b) => String(b.branch_id) === dairyId),
    [branches, dairyId]
  );

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
    doc.text("Farmer-wise Cattle Feed Report", 14, 15);
    doc.setFontSize(10);
    doc.text(dairyName, 14, 22);
    doc.text(`Period: ${format(new Date(startDate), "dd-MM-yyyy")} to ${format(new Date(endDate), "dd-MM-yyyy")}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [["Date", "Farmer Code", "Farmer Name", "Feed Type", "Qty (Bag)", "Rate", "Amount"]],
      body: rows.map((row) => [
        format(new Date(row.date.includes('T') ? row.date.split('T')[0] : row.date), "dd-MM-yy"),
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

    doc.save(`Farmer_Wise_Cattle_Feed_Report_${startDate}_to_${endDate}.pdf`);
    toast.success("PDF exported successfully");
  };

  return (
    <div className="p-4">
      <div className="text-left p-4">
        <h1 className="font-bold text-2xl">Farmer-wise Cattle Feed Report</h1>
        <p className="text-sm text-gray-600">
          Dairy-wise and farmer-wise cattle feed report in tabular format.
        </p>
      </div>

      <Card className="border-gray-300 mb-7">
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 bg-gray-50 rounded-lg">
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
              <Label className="mb-1">Farmer ID</Label>
              <Input
                type="text"
                value={farmerId}
                onChange={(e) => setFarmerId(e.target.value)}
                placeholder="Enter farmer id"
                className="border-gray-200"
              />
            </div>

            <div>
              <Label className="mb-1">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
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
            <h2 className="font-semibold text-lg mb-4">Farmer-wise Cattle Feed Report</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-center">Date</th>
                    <th className="border border-gray-300 p-2 text-center">Farmer Code</th>
                    <th className="border border-gray-300 p-2 text-center">Farmer Name</th>
                    <th className="border border-gray-300 p-2 text-center">Feed Type</th>
                    <th className="border border-gray-300 p-2 text-center">Qty (Bag)</th>
                    <th className="border border-gray-300 p-2 text-center">Rate</th>
                    <th className="border border-gray-300 p-2 text-center">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center">{format(new Date(row.date.includes('T') ? row.date.split('T')[0] : row.date), "dd-MM-yy")}</td>
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
    </div>
  );
};

export default CattleFeedFarmerWiseReport;
