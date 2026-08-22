import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/store";
import { cattleFeedApi } from "@/services/cattleFeedApi";
import { paymentApi } from "@/services/paymentApi";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CattleFeedStock {
  id: number;
  dairy_id?: string;
  stock_name: string;
  amount?: string | number;
  stock: number;
  date?: string;
}

interface FarmerPayment {
  id: number;
  date: string;
  payment_type: string;
  amount_taken?: string | number;
  received?: string | number;
  stock?: string | number;
  stock_name?: string;
  descriptions?: string | null;
}

interface FarmerPaymentLogsResponse {
  message: string;
  count: number;
  data: FarmerPayment[];
}

interface StockMovementRow {
  periodOrDate: string;
  feedType: string;
  openingQty: number;
  sellQty: number;
  balanceQty: number;
}

interface SaleEvent {
  id: number;
  date: string;
  feedKey: string;
  feedType: string;
  sellQty: number;
}

const CattleFeedStockReport = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state: any) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StockMovementRow[]>([]);

  const selectedVlcObj = branches.find((b: any) => b.branch_id.toString() === dairyId);

  const calculateDateRange = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const cycleDays = selectedVlcObj?.days || 10;
    const lastDayOfMonth = new Date(year, month, 0).getDate();

    let startDay: number, endDay: number;
    
    if (cycleDays === 15) {
      if (day >= 1 && day <= 15) {
        startDay = 1;
        endDay = 15;
      } else {
        startDay = 16;
        endDay = lastDayOfMonth;
      }
    } else if (cycleDays >= 28) {
      startDay = 1;
      endDay = lastDayOfMonth;
    } else {
      if (day >= 1 && day <= 10) {
        startDay = 1;
        endDay = 10;
      } else if (day >= 11 && day <= 20) {
        startDay = 11;
        endDay = 20;
      } else {
        startDay = 21;
        endDay = lastDayOfMonth;
      }
    }

    return {
      from: `${year}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`,
      to: `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
    };
  };

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    if (branches.length > 0 && !dairyId) {
      setDairyId(branches[0].branch_id.toString());
      // Initialize dates for the first branch
      const dates = calculateDateRange(new Date().toISOString().split("T")[0]);
      setStartDate(dates.from);
      setEndDate(dates.to);
    }
  }, [branches]);

  useEffect(() => {
    if (dairyId) {
      const dates = calculateDateRange(startDate || new Date().toISOString().split("T")[0]);
      setStartDate(dates.from);
      setEndDate(dates.to);
    }
  }, [dairyId, branches]);

  const handleStartDateChange = (newDate: string) => {
    const dates = calculateDateRange(newDate);
    setStartDate(dates.from);
    setEndDate(dates.to);
  };

  const parseSaleFromPayment = (payment: FarmerPayment) => {
    const qtyFromStock = Number(payment.stock || 0);
    if (payment.stock_name && Number.isFinite(qtyFromStock) && qtyFromStock > 0) {
      return {
        feedType: payment.stock_name.trim(),
        qty: qtyFromStock,
      };
    }

    const raw = (payment.descriptions || "").trim();
    if (!raw) return null;

    const parts = raw.split(":").map((part) => part.trim());
    const feedType = parts[0] || payment.stock_name || "Cattle Feed";
    const qty = Number(parts[1]);

    if (!Number.isFinite(qty) || qty <= 0) return null;
    return { feedType, qty };
  };

  const normalizeFeedKey = (feedType: string) =>
    feedType.toLowerCase().trim().replace(/\s+/g, " ");

  const buildMovementRows = (
    stockItems: CattleFeedStock[],
    payments: FarmerPayment[]
  ): StockMovementRow[] => {
    const saleEvents: SaleEvent[] = payments
      .filter((payment) => {
        const normalizedType = payment.payment_type?.toLowerCase().replace(/\s/g, "") || "";
        const hasFeedContext = Boolean(payment.stock_name) || Boolean(payment.stock) || Boolean(payment.descriptions);
        return normalizedType === "cattlefeed" || hasFeedContext;
      })
      .map((payment) => {
        const parsed = parseSaleFromPayment(payment);
        if (!parsed) return null;
        const feedKey = normalizeFeedKey(parsed.feedType);
        return {
          id: payment.id,
          date: payment.date,
          feedKey,
          feedType: parsed.feedType,
          sellQty: parsed.qty,
        };
      })
      .filter((item): item is SaleEvent => item !== null)
      .sort((left, right) => {
        const leftDate = left.date.includes("T") ? left.date.split("T")[0] : left.date;
        const rightDate = right.date.includes("T") ? right.date.split("T")[0] : right.date;
        if (leftDate !== rightDate) {
          return leftDate.localeCompare(rightDate);
        }
        return left.id - right.id;
      });

    const feedDisplayByKey: Record<string, string> = {};

    const soldByFeed = saleEvents.reduce<Record<string, number>>((accumulator, event) => {
      accumulator[event.feedKey] = (accumulator[event.feedKey] || 0) + event.sellQty;
      feedDisplayByKey[event.feedKey] = feedDisplayByKey[event.feedKey] || event.feedType;
      return accumulator;
    }, {});

    const currentStockByFeed = stockItems.reduce<Record<string, number>>((accumulator, item) => {
      const displayName = (item.stock_name || "Cattle Feed").trim();
      const key = normalizeFeedKey(displayName);
      accumulator[key] = (accumulator[key] || 0) + Number(item.stock || 0);
      feedDisplayByKey[key] = feedDisplayByKey[key] || displayName;
      return accumulator;
    }, {});

    const openingByFeed = Object.keys({ ...soldByFeed, ...currentStockByFeed }).reduce<Record<string, number>>(
      (accumulator, feedKey) => {
        accumulator[feedKey] = (currentStockByFeed[feedKey] || 0) + (soldByFeed[feedKey] || 0);
        return accumulator;
      },
      {}
    );

    const billPeriodLabel = `${format(new Date(startDate), "dd-MM-yyyy")}  To  ${format(new Date(endDate), "dd-MM-yyyy")}`;

    const summaryRows: StockMovementRow[] = Object.keys(openingByFeed)
      .sort((left, right) => (feedDisplayByKey[left] || left).localeCompare(feedDisplayByKey[right] || right))
      .map((feedKey) => ({
        periodOrDate: billPeriodLabel,
        feedType: feedDisplayByKey[feedKey] || feedKey,
        openingQty: openingByFeed[feedKey],
        sellQty: soldByFeed[feedKey] || 0,
        balanceQty: currentStockByFeed[feedKey] || 0,
      }));

    return summaryRows;
  };

  const handleShowReport = async () => {
    if (!dairyId) {
      toast.error(t("please_select_dairy"));
      return;
    }

    setLoading(true);
    try {
      const [stockData, paymentResponse] = await Promise.all([
        cattleFeedApi.getStock(dairyId),
        paymentApi.getFarmerPaymentLogs({ dairyid: dairyId }),
      ]);

      const stockItems = ((stockData?.data || []) as CattleFeedStock[]);
      const periodPayments = (((paymentResponse.data as FarmerPaymentLogsResponse)?.data || []) as FarmerPayment[])
        .filter((payment) => {
          const normalizedDate = String(payment.date || "").includes("T")
            ? String(payment.date).split("T")[0]
            : String(payment.date || "");
          return normalizedDate >= startDate && normalizedDate <= endDate;
        });

      const movementRows = buildMovementRows(
        stockItems,
        periodPayments
      );
      setRows(movementRows);
      if (movementRows.length === 0) {
        toast.info(t("no_stock_movement_data"));
      } else {
        toast.success(t("report_loaded_successfully"));
      }
    } catch (error: unknown) {
      const errorWithResponse = error as { response?: { data?: { message?: string } } };
      toast.error(errorWithResponse.response?.data?.message || t("failed_to_fetch_report"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (rows.length === 0) {
      toast.error(t("no_data_available"));
      return;
    }

    const selectedBranch = branches?.find((branch) => String(branch.branch_id) === dairyId);
    const dairyName = selectedBranch ? `${selectedBranch.username} - ${selectedBranch.name}` : "";
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Cattle Feed Stock Report", 14, 15);
    doc.setFontSize(10);
    doc.text(dairyName, 14, 22);
    doc.text(`Period: ${startDate ? format(new Date(startDate), "dd-MM-yyyy") : ""} to ${endDate ? format(new Date(endDate), "dd-MM-yyyy") : ""}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [["Bill period", "Feed Type", "Opening Qty", "Sell Qty", "Balance Qty"]],
      body: rows.map((row) => [
        row.periodOrDate,
        row.feedType,
        String(row.openingQty),
        String(row.sellQty),
        String(row.balanceQty),
      ]),
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] },
    });

    doc.save(`Cattle_Feed_Stock_Report_${startDate}_to_${endDate}.pdf`);
    toast.success(t("pdf_exported_successfully"));
  };

  return (
    <div className="p-4">
      <div className="text-left p-4">
        <h1 className="font-bold text-2xl">{t("cattle_feed_stock_report", "Cattle Feed Stock Report")}</h1>
        <p className="text-sm text-gray-600">
          {t("stock_movement_desc")}
        </p>
      </div>

      <Card className="border-gray-300 mb-7">
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="mb-1">{t("dairy")}</Label>
              <VLCDropdown
                branches={branches || []}
                value={dairyId}
                onChange={setDairyId}
                valueKey="branch_id"
                placeholder={t("select_dairy_placeholder")}
              />
            </div>

            <div>
              <Label className="mb-1">{t("start_date")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
                className="border-gray-200"
              />
            </div>

            <div>
              <Label className="mb-1">{t("end_date")}</Label>
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
                  {loading ? t("loading") : t("show_report")}
                </Button>
                <Button
                  onClick={exportToPDF}
                  disabled={rows.length === 0}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t("export_pdf")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="border-gray-300">
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg mb-2">{t("cattle_feed_stock_report", "Cattle Feed Stock Report")}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {t("stock_movement_desc")} {startDate ? format(new Date(startDate), "dd-MM-yyyy") : ""} {t("to")} {endDate ? format(new Date(endDate), "dd-MM-yyyy") : ""}.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-center">{t("bill_period")}</th>
                    <th className="border border-gray-300 p-2 text-center">{t("feed_type")}</th>
                    <th className="border border-gray-300 p-2 text-center">{t("opening_qty")}</th>
                    <th className="border border-gray-300 p-2 text-center">{t("sell_qty")}</th>
                    <th className="border border-gray-300 p-2 text-center">{t("balance_qty")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.feedType}-${row.periodOrDate}-${index}`} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center whitespace-pre-line">{row.periodOrDate}</td>
                      <td className="border border-gray-300 p-2 text-center">{row.feedType}</td>
                      <td className="border border-gray-300 p-2 text-center">{row.openingQty}</td>
                      <td className="border border-gray-300 p-2 text-center">{row.sellQty}</td>
                      <td className="border border-gray-300 p-2 text-center">{row.balanceQty}</td>
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

export default CattleFeedStockReport;
