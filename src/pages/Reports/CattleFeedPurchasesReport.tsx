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
import { cattleFeedApi } from "@/services/cattleFeedApi";

interface PurchaseRow {
  id: number;
  date: string;
  feedType: string;
  qty: number;
  perchesesRate: number;
  sellingRate: number;
  remark: string;
}

interface StockRecord {
  id: number;
  dairy_id?: string;
  stock_name: string;
  amount: string | number;
  stock: number | string;
  date: string;
  purchase_rate?: string | number;
  remark?: string;
}

interface StockGetResponse {
  success: boolean;
  data: StockRecord[];
}

const normalizeDate = (d: string) =>
  d.includes("T") ? d.split("T")[0] : d;

const CattleFeedPurchasesReport = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PurchaseRow[]>([]);

  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  });

  const selectedBranch = useMemo(
    () => branches?.find((b) => String(b.branch_id) === dairyId),
    [branches, dairyId]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          qty: acc.qty + r.qty,
          sellingTotal: acc.sellingTotal + r.qty * r.sellingRate,
        }),
        { qty: 0, sellingTotal: 0 }
      ),
    [rows]
  );

  const handleShowReport = async () => {
    if (!dairyId) {
      toast.error("Please select dairy");
      return;
    }

    setLoading(true);
    try {
      const response = await cattleFeedApi.getStock(dairyId);
      const rawResponse = response as StockGetResponse;
      const stockData: StockRecord[] = Array.isArray(rawResponse?.data)
        ? rawResponse.data
        : Array.isArray(response)
        ? (response as StockRecord[])
        : [];

      const filtered = stockData
        .filter((item) => {
          const d = normalizeDate(item.date || "");
          return d >= startDate && d <= endDate;
        })
        .sort((a, b) => normalizeDate(a.date).localeCompare(normalizeDate(b.date)));

      const transformed: PurchaseRow[] = filtered.map((item) => ({
        id: item.id,
        date: normalizeDate(item.date),
        feedType: item.stock_name?.trim() || "—",
        qty: Number(item.stock || 0),
        perchesesRate: Number(item.purchase_rate || 0),
        sellingRate: Number(item.amount || 0),
        remark: item.remark?.trim() || "—",
      }));

      setRows(transformed);
      if (transformed.length === 0) {
        toast.info("No purchase records found for this period");
      } else {
        toast.success("Report loaded successfully");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to fetch report");
      setRows([]);
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
    doc.text("Cattle Feed Purchases Report", 14, 15);
    doc.setFontSize(10);
    if (dairyName) doc.text(dairyName, 14, 22);
    doc.text(
      `Period: ${format(new Date(startDate), "dd-MM-yyyy")} to ${format(new Date(endDate), "dd-MM-yyyy")}`,
      14,
      28
    );

    autoTable(doc, {
      startY: 35,
      head: [
        ["Date", "Feed Type", "Qty (Kg/Bag)", "Percheses Rate", "Selling Rate", "Remark"],
      ],
      body: [
        ...rows.map((row) => [
          format(new Date(row.date), "dd-MM-yy"),
          row.feedType,
          row.qty > 0 ? row.qty.toString() : "—",
          row.perchesesRate > 0 ? row.perchesesRate.toFixed(2) : "—",
          row.sellingRate > 0 ? row.sellingRate.toFixed(2) : "—",
          row.remark,
        ]),
        [
          "Total",
          "",
          totals.qty.toString(),
          "",
          totals.sellingTotal > 0 ? totals.sellingTotal.toFixed(2) : "—",
          "",
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === rows.length) {
          data.cell.styles.textColor = [255, 0, 0];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.save(
      `Cattle_Feed_Purchases_Report_${startDate}_to_${endDate}.pdf`
    );
    toast.success("PDF exported successfully");
  };

  return (
    <div className="p-4">
      <div className="text-left p-4">
        <h1 className="font-bold text-2xl">Cattle Feed Purchases Report</h1>
        <p className="text-sm text-gray-600">
          Purchase records from{" "}
          {format(new Date(startDate), "dd-MM-yyyy")} to{" "}
          {format(new Date(endDate), "dd-MM-yyyy")}.
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
                    <SelectItem
                      key={branch.branch_id}
                      value={String(branch.branch_id)}
                    >
                      {branch.username} - {branch.name} -{" "}
                      {branch.branchName || ""}
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
                onChange={(e) => setStartDate(e.target.value)}
                className="border-gray-200"
              />
            </div>

            <div>
              <Label className="mb-1">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-gray-200"
              />
            </div>

            <div className="flex items-end">
              <div className="flex gap-2">
                <Button
                  onClick={handleShowReport}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
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
              Cattle Feed Purchases Report (
              {format(new Date(startDate), "dd-MM-yyyy")} to{" "}
              {format(new Date(endDate), "dd-MM-yyyy")})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-center">Date</th>
                    <th className="border border-gray-300 p-2 text-center">Feed Type</th>
                    <th className="border border-gray-300 p-2 text-center">Qty (Kg/Bag)</th>
                    <th className="border border-gray-300 p-2 text-center">Percheses Rate</th>
                    <th className="border border-gray-300 p-2 text-center">Selling Rate</th>
                    <th className="border border-gray-300 p-2 text-center">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center">
                        {format(new Date(row.date), "dd-MM-yy")}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">{row.feedType}</td>
                      <td className="border border-gray-300 p-2 text-center">{row.qty || "—"}</td>
                      <td className="border border-gray-300 p-2 text-center">
                        {row.perchesesRate > 0 ? row.perchesesRate.toFixed(2) : "—"}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {row.sellingRate > 0 ? row.sellingRate.toFixed(2) : "—"}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">{row.remark}</td>
                    </tr>
                  ))}
                  <tr className="bg-red-50 font-bold text-red-600">
                    <td className="border border-gray-300 p-2 text-center" colSpan={2}>Total</td>
                    <td className="border border-gray-300 p-2 text-center">{totals.qty}</td>
                    <td className="border border-gray-300 p-2 text-center">—</td>
                    <td className="border border-gray-300 p-2 text-center">
                      {totals.sellingTotal > 0 ? totals.sellingTotal.toFixed(2) : "—"}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">—</td>
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

export default CattleFeedPurchasesReport;
