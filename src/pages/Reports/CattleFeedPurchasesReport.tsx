import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Download, Package } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { useAppSelector } from "@/redux/store";
import { cattleFeedApi } from "@/services/cattleFeedApi";
import { parsePurchaseEntries } from "@/utils/cattleFeedPurchases";
import { registerDevanagariFont } from "@/utils/pdfFonts";

interface PurchaseRow {
  date: string;
  qty: number;
  purchaseRate: number;
  value: number;
  remark: string;
}

interface StockSection {
  id: number;
  stockName: string;
  sellingRate: number;
  rows: PurchaseRow[];
  qty: number;
  value: number;
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

const formatDay = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : format(parsed, "dd-MM-yyyy");
};

const CattleFeedPurchasesReport = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sections, setSections] = useState<StockSection[]>([]);

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
      sections.reduce(
        (acc, section) => ({
          qty: acc.qty + section.qty,
          value: acc.value + section.value,
          sellingTotal: acc.sellingTotal + section.qty * section.sellingRate,
        }),
        { qty: 0, value: 0, sellingTotal: 0 }
      ),
    [sections]
  );

  const handleShowReport = async () => {
    if (!dairyId) {
      toast.error(t("please_select_dairy"));
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

      // One section per feed item, holding the purchases it logged in the period.
      const grouped: StockSection[] = [];
      stockData.forEach((item) => {
        const rows: PurchaseRow[] = parsePurchaseEntries(item)
          .filter(
            (entry) =>
              entry.purchase_date >= startDate && entry.purchase_date <= endDate
          )
          .map((entry) => ({
            date: entry.purchase_date,
            qty: entry.qty,
            purchaseRate: entry.purchase_rate,
            value: entry.qty * entry.purchase_rate,
            remark: entry.remark?.trim() || item.remark?.trim() || "—",
          }));

        // A purchases report only speaks to what was bought in the window.
        if (rows.length === 0) return;

        grouped.push({
          id: item.id,
          stockName: item.stock_name?.trim() || "—",
          sellingRate: Number(item.amount) || 0,
          rows,
          qty: rows.reduce((sum, row) => sum + row.qty, 0),
          value: rows.reduce((sum, row) => sum + row.value, 0),
        });
      });

      grouped.sort((a, b) => a.stockName.localeCompare(b.stockName));

      setSections(grouped);
      setHasSearched(true);
      if (grouped.length === 0) {
        toast.info(t("no_purchase_records"));
      } else {
        toast.success(t("report_loaded_successfully"));
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t("failed_to_fetch_report"));
      setSections([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (sections.length === 0) {
      toast.error(t("no_data_available"));
      return;
    }

    const doc = new jsPDF();
    // Feed names and branch names are often Marathi, which the default font
    // cannot render.
    const font = await registerDevanagariFont(doc);
    const dairyName = selectedBranch
      ? `${selectedBranch.username} - ${selectedBranch.name}`
      : "";

    doc.setFont(font, "normal");
    doc.setFontSize(16);
    doc.text("Cattle Feed Purchases Report", 14, 15);
    doc.setFontSize(10);
    if (dairyName) doc.text(dairyName, 14, 22);
    doc.text(`Period: ${formatDay(startDate)} to ${formatDay(endDate)}`, 14, 28);

    const body: string[][] = [];
    sections.forEach((section) => {
      section.rows.forEach((row, index) => {
        body.push([
          index === 0 ? section.stockName : "",
          formatDay(row.date),
          row.qty.toString(),
          row.purchaseRate > 0 ? row.purchaseRate.toFixed(2) : "—",
          row.value > 0 ? row.value.toFixed(2) : "—",
          section.sellingRate > 0 ? section.sellingRate.toFixed(2) : "—",
          row.remark,
        ]);
      });
      body.push([
        `${section.stockName} Total`,
        "",
        section.qty.toString(),
        "",
        section.value.toFixed(2),
        "",
        "",
      ]);
    });
    body.push([
      "Grand Total",
      "",
      totals.qty.toString(),
      "",
      totals.value.toFixed(2),
      "",
      "",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          "Feed Type",
          "Purchase Date",
          "Qty (Kg/Bag)",
          "Percheses Rate",
          "Purchase Value",
          "Selling Rate",
          "Remark",
        ],
      ],
      body,
      theme: "grid",
      styles: { font },
      headStyles: { font, fillColor: [66, 139, 202] },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        if (data.row.index === body.length - 1) {
          data.cell.styles.textColor = [255, 0, 0];
          data.cell.styles.fontStyle = "bold";
        } else if (String(body[data.row.index]?.[0] ?? "").endsWith(" Total")) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.save(`Cattle_Feed_Purchases_Report_${startDate}_to_${endDate}.pdf`);
    toast.success(t("pdf_exported_successfully"));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Cattle Feed Purchases Report
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Every feed item a branch bought in the period, with the dates and quantity purchased.
          </p>
        </header>

        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.05)] bg-white">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">{t("dairy")}</Label>
                <VLCDropdown
                  branches={branches || []}
                  value={dairyId}
                  onChange={setDairyId}
                  valueKey="branch_id"
                  placeholder={t("select_dairy_placeholder")}
                  className="w-full h-11 bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">{t("start_date")}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">{t("end_date")}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border-slate-200 h-11"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleShowReport}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-11 font-bold shadow-md shadow-indigo-100"
                >
                  {loading ? t("loading") : t("show_report")}
                </Button>
                <Button
                  onClick={exportToPDF}
                  disabled={sections.length === 0}
                  variant="outline"
                  className="h-11 border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700"
                >
                  <Download className="h-4 w-4 mr-2 text-indigo-600" />
                  PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white border-l-4 border-l-indigo-600">
            <CardContent className="p-5">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">
                Qty Purchased
              </div>
              <div className="text-2xl font-black text-slate-900">{totals.qty}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white border-l-4 border-l-green-600">
            <CardContent className="p-5">
              <div className="text-[10px] text-green-600 font-black uppercase tracking-widest mb-1.5">
                Purchase Value
              </div>
              <div className="text-2xl font-black text-green-700">₹{totals.value.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white border-l-4 border-l-slate-900">
            <CardContent className="p-5">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">
                Value At Selling Rate
              </div>
              <div className="text-2xl font-black text-slate-900">
                ₹{totals.sellingTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.05)] bg-white">
          <CardContent className="p-6">
            {loading ? (
              <div className="py-24 text-center text-slate-400 font-medium">Loading report...</div>
            ) : sections.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <Package className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-slate-800 font-bold text-lg">
                  {hasSearched ? "No Purchase Records Found" : "No Report Loaded"}
                </h3>
                <p className="text-slate-400 max-w-[300px]">
                  {hasSearched
                    ? "No feed was purchased by this branch in the selected period."
                    : "Select a dairy and a period, then click Show Report."}
                </p>
              </div>
            ) : (
              <>
                <h2 className="font-bold text-lg text-slate-800 mb-4">
                  Purchases ({formatDay(startDate)} to {formatDay(endDate)})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-200 p-2 text-left">Feed Type</th>
                        <th className="border border-slate-200 p-2 text-center">Purchase Date</th>
                        <th className="border border-slate-200 p-2 text-center">Qty (Kg/Bag)</th>
                        <th className="border border-slate-200 p-2 text-center">Percheses Rate</th>
                        <th className="border border-slate-200 p-2 text-center">Purchase Value</th>
                        <th className="border border-slate-200 p-2 text-center">Selling Rate</th>
                        <th className="border border-slate-200 p-2 text-center">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map((section) => (
                        <React.Fragment key={section.id}>
                          {section.rows.map((row, index) => (
                            <tr key={`${section.id}-${index}`} className="hover:bg-slate-50">
                              {index === 0 && (
                                <td
                                  className="border border-slate-200 p-2 font-bold text-slate-900 uppercase align-top"
                                  rowSpan={section.rows.length}
                                >
                                  {section.stockName}
                                </td>
                              )}
                              <td className="border border-slate-200 p-2 text-center">
                                {formatDay(row.date)}
                              </td>
                              <td className="border border-slate-200 p-2 text-center font-bold">
                                {row.qty || "—"}
                              </td>
                              <td className="border border-slate-200 p-2 text-center">
                                {row.purchaseRate > 0 ? `₹${row.purchaseRate.toFixed(2)}` : "—"}
                              </td>
                              <td className="border border-slate-200 p-2 text-center">
                                {row.value > 0 ? `₹${row.value.toFixed(2)}` : "—"}
                              </td>
                              {index === 0 && (
                                <td
                                  className="border border-slate-200 p-2 text-center align-top"
                                  rowSpan={section.rows.length}
                                >
                                  {section.sellingRate > 0
                                    ? `₹${section.sellingRate.toFixed(2)}`
                                    : "—"}
                                </td>
                              )}
                              <td className="border border-slate-200 p-2 text-center text-slate-500">
                                {row.remark}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold">
                            <td className="border border-slate-200 p-2 text-right" colSpan={2}>
                              {section.stockName} Total
                            </td>
                            <td className="border border-slate-200 p-2 text-center">
                              {section.qty}
                            </td>
                            <td className="border border-slate-200 p-2" />
                            <td className="border border-slate-200 p-2 text-center">
                              ₹{section.value.toFixed(2)}
                            </td>
                            <td className="border border-slate-200 p-2" colSpan={2} />
                          </tr>
                        </React.Fragment>
                      ))}
                      <tr className="bg-slate-900 text-white font-bold">
                        <td className="border border-slate-700 p-2 text-right" colSpan={2}>
                          Grand Total
                        </td>
                        <td className="border border-slate-700 p-2 text-center">{totals.qty}</td>
                        <td className="border border-slate-700 p-2" />
                        <td className="border border-slate-700 p-2 text-center">
                          ₹{totals.value.toFixed(2)}
                        </td>
                        <td className="border border-slate-700 p-2" colSpan={2} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CattleFeedPurchasesReport;
