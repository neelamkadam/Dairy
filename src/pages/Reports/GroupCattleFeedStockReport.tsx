import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Download, Package, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/store";
import { cattleFeedApi, CattleFeedStock } from "@/services/cattleFeedApi";
import { ROUTES } from "@/constatnts/routesConstants";
import {
  parsePurchaseEntries,
  totalPurchasedQty,
  totalPurchasedValue,
} from "@/utils/cattleFeedPurchases";

interface PurchaseRow {
  date: string;
  qty: number;
  purchaseRate: number;
  value: number;
}

interface StockSection {
  id: number;
  stockName: string;
  currentStock: number;
  sellingRate: number;
  rows: PurchaseRow[];
  qty: number;
  value: number;
}

const formatDay = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : format(parsed, "dd-MM-yyyy");
};

const GroupCattleFeedStockReport: React.FC = () => {
  const navigate = useNavigate();
  const authState = useAppSelector((state) => state.authData);
  const webUserId = authState?.userData?.id ? Number(authState.userData.id) : null;

  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<CattleFeedStock[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!webUserId) return;

    const fetchStocks = async () => {
      try {
        setLoading(true);
        const response = await cattleFeedApi.getStock(webUserId, "group");
        setStocks(
          response.success && Array.isArray(response.data)
            ? (response.data as CattleFeedStock[])
            : []
        );
      } catch (error) {
        console.error("Failed to fetch group stock report:", error);
        toast.error("Failed to fetch group stock report");
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, [webUserId]);

  const sections = useMemo<StockSection[]>(() => {
    const term = search.trim().toLowerCase();

    return stocks
      .filter((item) => !term || item.stock_name?.toLowerCase().includes(term))
      .map((item) => {
        // The full purchase log, oldest first - no date window, the report is
        // meant to show everything currently held.
        const entries = parsePurchaseEntries(item);

        return {
          id: item.id,
          stockName: item.stock_name?.trim() || "—",
          currentStock: Number(item.stock) || 0,
          sellingRate: Number(item.amount) || 0,
          rows: entries.map((entry) => ({
            date: entry.purchase_date,
            qty: entry.qty,
            purchaseRate: entry.purchase_rate,
            value: entry.qty * entry.purchase_rate,
          })),
          qty: totalPurchasedQty(entries),
          value: totalPurchasedValue(entries),
        };
      })
      .sort((a, b) => a.stockName.localeCompare(b.stockName));
  }, [stocks, search]);

  const totals = useMemo(
    () =>
      sections.reduce(
        (acc, section) => ({
          qty: acc.qty + section.qty,
          value: acc.value + section.value,
          balance: acc.balance + section.currentStock,
        }),
        { qty: 0, value: 0, balance: 0 }
      ),
    [sections]
  );

  const exportToPDF = () => {
    if (sections.length === 0) {
      toast.error("No data available");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Group Cattle Feed Stock Report", 14, 15);
    doc.setFontSize(10);
    doc.text("Central master pool - complete purchase history", 14, 22);
    doc.text(`Generated: ${format(new Date(), "dd-MM-yyyy")}`, 14, 28);

    const body: string[][] = [];
    sections.forEach((section) => {
      if (section.rows.length === 0) {
        body.push([section.stockName, "—", "No purchase history", "—", "—"]);
        return;
      }
      section.rows.forEach((row, index) => {
        body.push([
          index === 0 ? section.stockName : "",
          formatDay(row.date),
          row.qty.toString(),
          row.purchaseRate.toFixed(2),
          row.value.toFixed(2),
        ]);
      });
      body.push([
        `${section.stockName} Total`,
        "",
        section.qty.toString(),
        "",
        section.value.toFixed(2),
      ]);
    });
    body.push(["Grand Total", "", totals.qty.toString(), "", totals.value.toFixed(2)]);

    autoTable(doc, {
      startY: 35,
      head: [["Stock Name", "Purchase Date", "Qty", "Purchase Rate", "Value"]],
      body,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] },
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

    doc.save(`Group_Cattle_Feed_Stock_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exported successfully");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Group Cattle Feed Stock Report
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Every master-pool item with the dates it was purchased and the quantity added.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.GROUP_CATTLE_FEED_STOCK)}
            className="w-fit bg-white border-slate-200 hover:bg-slate-50 h-11 px-6 shadow-sm font-bold text-slate-700"
          >
            <ChevronLeft className="w-4 h-4 mr-2 text-indigo-600" />
            Back to Master Stock
          </Button>
        </header>

        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.05)] bg-white">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-semibold text-slate-700">Search Stock</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Stock name"
                    className="bg-slate-50 border-slate-200 h-11 pl-9"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={exportToPDF}
                  disabled={sections.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 font-bold shadow-md shadow-indigo-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white border-l-4 border-l-indigo-600">
            <CardContent className="p-5">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">
                Total Qty Purchased
              </div>
              <div className="text-2xl font-black text-slate-900">{totals.qty}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white border-l-4 border-l-green-600">
            <CardContent className="p-5">
              <div className="text-[10px] text-green-600 font-black uppercase tracking-widest mb-1.5">
                Total Purchase Value
              </div>
              <div className="text-2xl font-black text-green-700">₹{totals.value.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white border-l-4 border-l-slate-900">
            <CardContent className="p-5">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">
                Current Pool Balance
              </div>
              <div className="text-2xl font-black text-slate-900">{totals.balance}</div>
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
                <h3 className="text-slate-800 font-bold text-lg">No Master Stocks Found</h3>
                <p className="text-slate-400 max-w-[280px]">
                  Add inventory to the central pool to see its purchase history here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 p-2 text-left">Stock Name</th>
                      <th className="border border-slate-200 p-2 text-center">Purchase Date</th>
                      <th className="border border-slate-200 p-2 text-center">Qty Purchased</th>
                      <th className="border border-slate-200 p-2 text-center">Purchase Rate</th>
                      <th className="border border-slate-200 p-2 text-center">Value</th>
                      <th className="border border-slate-200 p-2 text-center">Current Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => (
                      <React.Fragment key={section.id}>
                        {section.rows.length === 0 ? (
                          <tr className="hover:bg-slate-50">
                            <td className="border border-slate-200 p-2 font-bold text-slate-900 uppercase">
                              {section.stockName}
                            </td>
                            <td
                              className="border border-slate-200 p-2 text-center text-slate-400"
                              colSpan={4}
                            >
                              No purchase history recorded
                            </td>
                            <td className="border border-slate-200 p-2 text-center font-bold">
                              {section.currentStock}
                            </td>
                          </tr>
                        ) : (
                          section.rows.map((row, index) => (
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
                                {row.qty}
                              </td>
                              <td className="border border-slate-200 p-2 text-center">
                                ₹{row.purchaseRate.toFixed(2)}
                              </td>
                              <td className="border border-slate-200 p-2 text-center">
                                ₹{row.value.toFixed(2)}
                              </td>
                              {index === 0 && (
                                <td
                                  className="border border-slate-200 p-2 text-center font-bold align-top"
                                  rowSpan={section.rows.length}
                                >
                                  {section.currentStock}
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                        <tr className="bg-slate-50 font-bold">
                          <td className="border border-slate-200 p-2 text-right" colSpan={2}>
                            {section.stockName} Total
                          </td>
                          <td className="border border-slate-200 p-2 text-center">{section.qty}</td>
                          <td className="border border-slate-200 p-2" />
                          <td className="border border-slate-200 p-2 text-center">
                            ₹{section.value.toFixed(2)}
                          </td>
                          <td className="border border-slate-200 p-2" />
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
                      <td className="border border-slate-700 p-2 text-center">{totals.balance}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupCattleFeedStockReport;
