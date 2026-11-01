import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, Calendar as CalendarIcon, Loader2, Download } from "lucide-react";
import { AppDatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import PdfLoader from "@/components/PdfLoader";
import { useAppSelector } from "@/redux/store";
import { bonusApi, BonusDeduction } from "@/services/bonusApi";
import { deductionApi } from "@/services/deductionApi";
import { userApi } from "@/services/reportsApi";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";
import { hasDevanagari, registerDevanagariFont, shapedTextImage, type ShapedTextImage } from "@/utils/pdfFonts";
import { useTranslation } from "react-i18next";

interface BonusReportRow {
  farmer_id: string;
  farmer_name: string;
  billed_from: string;
  billed_to: string;
  quantity: number;
  bonus_quantity: number;
  rates: number[];
  bonus_deduction: number;
  fixed_deduction: number;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const toDayKey = (date: string) => format(new Date(date), "yyyy-MM-dd");

const formatRates = (rates: number[], prefix = "") =>
  rates.length ? [...rates].sort((a, b) => a - b).map((rate) => `${prefix}${rate.toFixed(2)}`).join(", ") : "-";

// One row per farmer: litres collected in the range, the litres their bonus was
// charged on, and what their bills deducted.
const buildReportRows = (
  logs: any[],
  collectionDays: any[],
  rateEntries: any[],
  farmerNames: Map<string, string>,
  rangeEnd: string
): BonusReportRow[] => {
  const rows = new Map<string, BonusReportRow>();
  const rowFor = (id: string, fallbackName = "-") => {
    const farmerId = normalizeFarmerId(String(id));
    let row = rows.get(farmerId);
    if (!row) {
      row = {
        farmer_id: farmerId,
        farmer_name: farmerNames.get(farmerId) || fallbackName,
        billed_from: "",
        billed_to: "",
        quantity: 0,
        bonus_quantity: 0,
        rates: [],
        bonus_deduction: 0,
        fixed_deduction: 0,
      };
      rows.set(farmerId, row);
    }
    return row;
  };

  // Bill cycles each farmer had a bonus deducted for
  const bonusCycles = new Map<string, { from: string; to: string }[]>();
  logs.filter((log: any) => Number(log.bonus_deduction) > 0).forEach((log: any) => {
    const farmerId = normalizeFarmerId(String(log.farmer_id));
    bonusCycles.set(farmerId, [...(bonusCycles.get(farmerId) || []), { from: toDayKey(log.start_date), to: toDayKey(log.end_date) }]);
  });

  collectionDays.forEach((day: any) => {
    (day.farmers || []).forEach((farmer: any) => {
      const row = rowFor(farmer.farmer_id, farmer.farmer_name);
      const date = toDayKey(farmer.date || day.date);
      const quantity = Number(farmer.quantity) || 0;
      if (date <= rangeEnd) row.quantity += quantity;
      if ((bonusCycles.get(row.farmer_id) || []).some((cycle) => date >= cycle.from && date <= cycle.to)) {
        row.bonus_quantity += quantity;
      }
    });
  });

  const entriesByFarmer = new Map<string, any[]>();
  rateEntries.forEach((entry: any) => {
    const farmerId = normalizeFarmerId(String(entry.farmer_id));
    entriesByFarmer.set(farmerId, [...(entriesByFarmer.get(farmerId) || []), entry]);
  });

  // bonus_deduction on a log is the amount the bill deducted (litres x rate)
  logs.forEach((log: any) => {
    const row = rowFor(log.farmer_id);
    const bonus = Number(log.bonus_deduction) || 0;
    row.bonus_deduction += bonus;
    row.fixed_deduction += Number(log.fixed_deduction) || 0;

    const cycleStart = toDayKey(log.start_date);
    const cycleEnd = toDayKey(log.end_date);
    if (!row.billed_from || cycleStart < row.billed_from) row.billed_from = cycleStart;
    if (cycleEnd > row.billed_to) row.billed_to = cycleEnd;

    if (bonus > 0) {
      // Fixed-deduction entries carry a 0 rate, so they can't be the rate this bonus used
      const inForce = (entriesByFarmer.get(row.farmer_id) || [])
        .filter((entry) => Number(entry.bonus_deduction) > 0 && new Date(entry.effective_from) <= new Date(log.end_date))
        .reduce((latest, entry) => (!latest || entry.id > latest.id ? entry : latest), null as any);
      const rate = Number(inForce?.bonus_deduction) || 0;
      if (rate > 0 && !row.rates.includes(rate)) row.rates.push(rate);
    }
  });

  return Array.from(rows.values()).sort((a, b) =>
    a.farmer_id.localeCompare(b.farmer_id, undefined, { numeric: true })
  );
};

const BonusReport = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state: any) => state.branch);
  const [selectedVLC, setSelectedVLC] = useState<string>("");
  const selectedVlcObj = branches.find((b: any) => b.branch_id.toString() === selectedVLC);

  const calculateDateRange = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
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
      from: `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    };
  };

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [farmerId, setFarmerId] = useState<string>("");
  const [bonusData, setBonusData] = useState<BonusReportRow[]>([]);
  const [reportPeriod, setReportPeriod] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Bonus Form State
  const [newBonus, setNewBonus] = useState<Partial<BonusDeduction>>({
    farmer_id: "",
    bonus_deduction: 0,
    fixed_deduction: 0,
  });

  useEffect(() => {
    if (branches.length > 0 && !selectedVLC) {
      setSelectedVLC(branches[0].branch_id.toString());
      // Initialize dates for the first branch
      const dates = calculateDateRange(new Date().toISOString().split("T")[0]);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
  }, [branches]);

  useEffect(() => {
    if (selectedVLC) {
      const dates = calculateDateRange(fromDate || new Date().toISOString().split('T')[0]);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
  }, [selectedVLC, branches]);

  useEffect(() => {
    setBonusData([]);
    setReportPeriod(null);
  }, [selectedVLC]);

  const fetchBonusData = async () => {
    if (!selectedVLC) {
      toast.error("Please select a VLC Center");
      return;
    }

    if (fromDate > toDate) {
      toast.error("From Date cannot be after To Date");
      return;
    }

    if (new Date(toDate).getTime() - new Date(fromDate).getTime() > ONE_YEAR_MS) {
      toast.error("Date range cannot exceed 1 year");
      return;
    }

    setLoading(true);
    setBonusData([]);
    setReportPeriod(null);
    try {
      const dairyId = parseInt(selectedVLC);
      const requestPayload = { dairy_id: dairyId, start_date: fromDate, end_date: toDate };

      const logsResponse = await bonusApi.getBonusDeductionLogs(requestPayload);
      const logs: any[] = logsResponse.data.data || [];

      // A cycle starting in the range can end after it; its later days still count towards the bonus litres
      const collectionTo = logs.reduce((latest, log) => {
        const cycleEnd = toDayKey(log.end_date);
        return cycleEnd > latest ? cycleEnd : latest;
      }, toDate);

      const [summaryResponse, ratesResponse, farmersResponse] = await Promise.all([
        deductionApi.getAllFarmersBalance(dairyId, fromDate, collectionTo),
        bonusApi.getBonusDeductions(requestPayload),
        userApi.getFarmers(selectedVLC).catch(() => null),
      ]);

      if (logsResponse.data.success && summaryResponse.data.success && ratesResponse.data.success) {
        const farmerNames = new Map<string, string>();
        (Array.isArray(farmersResponse?.data) ? farmersResponse.data : []).forEach((farmer: any) => {
          farmerNames.set(normalizeFarmerId(String(farmer.username || farmer.farmer_id || "")), farmer.fullName || farmer.name || "");
        });

        const rows = buildReportRows(
          logs,
          summaryResponse.data.data || [],
          ratesResponse.data.data || [],
          farmerNames,
          toDate
        );
        const farmerFilter = farmerId.trim() ? normalizeFarmerId(farmerId) : "";
        setBonusData(farmerFilter ? rows.filter((row) => row.farmer_id === farmerFilter) : rows);
        setReportPeriod({ from: fromDate, to: toDate });
      } else {
        toast.error("Failed to fetch bonus deductions");
      }
    } catch (error: any) {
      console.error("Error fetching bonus data:", error);
      toast.error(error?.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBonus = async () => {
    if (!selectedVLC || !newBonus.farmer_id) {
      toast.error("VLC and Farmer ID are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        dairy_id: parseInt(selectedVLC),
        farmer_id: newBonus.farmer_id!,
        start_date: fromDate,
        end_date: toDate,
        bonus_deduction: Number(newBonus.bonus_deduction || 0),
        fixed_deduction: Number(newBonus.fixed_deduction || 0),
      };

      const response = await bonusApi.createBonusDeduction(payload);
      if (response.data.success) {
        toast.success("Bonus deduction created successfully");
        setIsAddModalOpen(false);
        setNewBonus({ farmer_id: "", bonus_deduction: 0, fixed_deduction: 0 });
        fetchBonusData();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create bonus deduction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = bonusData.filter((item) =>
    item.farmer_id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const deductionRows = filteredData.filter((row) => row.bonus_deduction > 0 || row.fixed_deduction > 0);

  const totalCollection = filteredData.reduce((sum, row) => sum + row.quantity, 0);
  const bonusCollection = deductionRows.reduce((sum, row) => sum + row.bonus_quantity, 0);
  const listedCollection = deductionRows.reduce((sum, row) => sum + row.quantity, 0);
  const totalBonus = deductionRows.reduce((sum, row) => sum + row.bonus_deduction, 0);
  const totalFixed = deductionRows.reduce((sum, row) => sum + row.fixed_deduction, 0);
  const totalDeducted = totalBonus + totalFixed;

  const displayDate = (date: string) => format(new Date(date), "dd-MM-yyyy");

  const exportToExcel = () => {
    if (!reportPeriod || !deductionRows.length) {
      toast.error("No data to export");
      return;
    }

    try {
      const sheetRows = [
        ["Bonus Deductions Report"],
        [`VLC: ${selectedVlcObj?.name || ""}`],
        [`Period: ${displayDate(reportPeriod.from)} to ${displayDate(reportPeriod.to)}`],
        ["Total Collection, All Farmers (L)", Number(totalCollection.toFixed(2))],
        ["Bonus Applied On (L)", Number(bonusCollection.toFixed(2))],
        [],
        ["Farmer ID", "Farmer Name", "Billed From", "Billed To", "Total Collection (L)", "Bonus Applied On (L)", "Per Litre (Rs)", "Bonus Deduction (Rs)", "Fixed Deduction (Rs)", "Total Deduction (Rs)"],
        ...deductionRows.map((row) => [
          row.farmer_id,
          row.farmer_name,
          displayDate(row.billed_from),
          displayDate(row.billed_to),
          Number(row.quantity.toFixed(2)),
          Number(row.bonus_quantity.toFixed(2)),
          row.rates.length === 1 ? row.rates[0] : formatRates(row.rates),
          Number(row.bonus_deduction.toFixed(2)),
          Number(row.fixed_deduction.toFixed(2)),
          Number((row.bonus_deduction + row.fixed_deduction).toFixed(2)),
        ]),
        ["Total", "", "", "", Number(listedCollection.toFixed(2)), Number(bonusCollection.toFixed(2)), "", Number(totalBonus.toFixed(2)), Number(totalFixed.toFixed(2)), Number(totalDeducted.toFixed(2))],
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      ws["!cols"] = [{ wch: 30 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bonus Report");
      XLSX.writeFile(wb, `Bonus_Report_${reportPeriod.from}_to_${reportPeriod.to}.xlsx`);
      toast.success("Excel file downloaded successfully");
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to export Excel");
    }
  };

  const exportToPDF = async () => {
    if (!reportPeriod || !deductionRows.length) {
      toast.error("No data to export");
      return;
    }

    setPdfLoading(true);
    try {
      const doc = new jsPDF("l", "mm", "a4");
      const font = await registerDevanagariFont(doc);
      const pageW = doc.internal.pageSize.getWidth();
      const fontSize = 8;

      // Marathi text is placed as images so it stays correctly spelled
      const nameImages = new Map<string, ShapedTextImage>();
      for (const { farmer_name } of deductionRows) {
        if (hasDevanagari(farmer_name) && !nameImages.has(farmer_name)) {
          nameImages.set(farmer_name, await shapedTextImage(farmer_name, fontSize));
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Bonus Deductions Report", pageW / 2, 12, { align: "center" });
      doc.setFont(font, "normal");
      doc.setFontSize(fontSize);

      const vlcLine = `VLC: ${selectedVlcObj?.name || ""}`;
      if (hasDevanagari(vlcLine)) {
        const image = await shapedTextImage(vlcLine, fontSize, "#000000");
        doc.addImage(image.dataUrl, "PNG", (pageW - image.width) / 2, 17 - image.height * 0.72, image.width, image.height);
      } else {
        doc.text(vlcLine, pageW / 2, 17, { align: "center" });
      }

      doc.text(`Period: ${displayDate(reportPeriod.from)} to ${displayDate(reportPeriod.to)}`, pageW / 2, 21, { align: "center" });
      doc.text(
        `Total Collection (All Farmers): ${totalCollection.toFixed(2)} L   |   Bonus Applied On: ${bonusCollection.toFixed(2)} L   |   Bonus Deducted: Rs ${totalBonus.toFixed(2)}   |   Fixed Deducted: Rs ${totalFixed.toFixed(2)}   |   Total Deducted: Rs ${totalDeducted.toFixed(2)}`,
        pageW / 2,
        25,
        { align: "center" }
      );

      autoTable(doc, {
        head: [["Farmer ID", "Farmer Name", "Billed From", "Billed To", "Total Collection (L)", "Bonus Applied On (L)", "Per Litre (Rs)", "Bonus Ded. (Rs)", "Fixed Ded. (Rs)", "Total Ded. (Rs)"]],
        body: deductionRows.map((row) => [
          row.farmer_id,
          row.farmer_name,
          displayDate(row.billed_from),
          displayDate(row.billed_to),
          row.quantity.toFixed(2),
          row.bonus_quantity.toFixed(2),
          formatRates(row.rates),
          row.bonus_deduction.toFixed(2),
          row.fixed_deduction.toFixed(2),
          (row.bonus_deduction + row.fixed_deduction).toFixed(2),
        ]),
        foot: [["Total", "", "", "", listedCollection.toFixed(2), bonusCollection.toFixed(2), "", totalBonus.toFixed(2), totalFixed.toFixed(2), totalDeducted.toFixed(2)]],
        showFoot: "lastPage",
        startY: 29,
        theme: "grid",
        styles: { font, fontSize, textColor: [31, 41, 55], cellPadding: 1.5, overflow: "linebreak" },
        headStyles: { font: "helvetica", fillColor: [55, 65, 81], textColor: 255, fontStyle: "bold", halign: "center" },
        footStyles: { font: "helvetica", fillColor: [229, 231, 235], textColor: [31, 41, 55], fontStyle: "bold", halign: "right" },
        columnStyles: {
          0: { cellWidth: 16, halign: "center" },
          1: { cellWidth: 52 },
          2: { halign: "center" },
          3: { halign: "center" },
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "right" },
          8: { halign: "right" },
          9: { halign: "right", font: "helvetica", fontStyle: "bold" },
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 1 && nameImages.has(String(data.cell.raw))) {
            data.cell.text = [""];
          }
        },
        didDrawCell: (data) => {
          if (data.section !== "body" || data.column.index !== 1) return;
          const image = nameImages.get(String(data.cell.raw));
          if (!image) return;
          const scale = Math.min(1, (data.cell.width - 3) / image.width);
          const height = image.height * scale;
          doc.addImage(image.dataUrl, "PNG", data.cell.x + 1.5, data.cell.y + (data.cell.height - height) / 2, image.width * scale, height);
        },
      });

      doc.save(`Bonus_Report_${reportPeriod.from}_to_${reportPeriod.to}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="p-2 sm:p-4 space-y-4 bg-gray-50 min-h-screen">
      <PdfLoader isLoading={pdfLoading} />
      {/* Header */}
      <div className="flex justify-between items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 mb-2 px-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Bonus Deductions Report</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle>Add Bonus Deduction</DialogTitle>
              <DialogDescription>
                Create a new bonus deduction for a farmer in the current period.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="farmer_id" className="text-right">Farmer ID</Label>
                <Input
                  id="farmer_id"
                  className="col-span-3"
                  value={newBonus.farmer_id}
                  onChange={(e) => setNewBonus({ ...newBonus, farmer_id: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bonus" className="text-right">Bonus Ded.</Label>
                <Input
                  id="bonus"
                  type="number"
                  className="col-span-3"
                  value={newBonus.bonus_deduction}
                  onChange={(e) => setNewBonus({ ...newBonus, bonus_deduction: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fixed" className="text-right">Fixed Ded.</Label>
                <Input
                  id="fixed"
                  type="number"
                  className="col-span-3"
                  value={newBonus.fixed_deduction}
                  onChange={(e) => setNewBonus({ ...newBonus, fixed_deduction: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateBonus} 
                className="bg-blue-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
        <div className="space-y-2 w-full">
          <Label>VLC Center</Label>
          <VLCDropdown
            branches={branches || []}
            value={selectedVLC}
            onChange={setSelectedVLC}
            valueKey="branch_id"
            placeholder="Select VLC Center"
          />
        </div>

        <div className="space-y-2">
          <Label>From Date</Label>
          <AppDatePicker
            date={fromDate}
            onChange={setFromDate}
          />
        </div>

        <div className="space-y-2">
          <Label>To Date</Label>
          <AppDatePicker
            date={toDate}
            onChange={setToDate}
          />
        </div>

        <div className="space-y-2">
          <Label>Farmer ID (Optional)</Label>
          <Input 
            placeholder="Enter ID" 
            value={farmerId} 
            onChange={(e) => setFarmerId(e.target.value)} 
          />
        </div>

        <div className="flex gap-2">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px] h-10" 
            onClick={fetchBonusData}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : "Show"}
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 mx-2 mb-4">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white h-10"
          onClick={exportToExcel}
          disabled={!deductionRows.length || loading}
        >
          <Download className="w-4 h-4" />
          Excel Export
        </Button>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white h-10"
          onClick={exportToPDF}
          disabled={!deductionRows.length || loading}
        >
          <Download className="w-4 h-4" />
          PDF Export
        </Button>
      </div>

      {reportPeriod && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4 mx-2 text-left">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Collection (All Farmers)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalCollection.toFixed(2)} L</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Bonus Applied On</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{bonusCollection.toFixed(2)} L</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Bonus Deducted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">₹{totalBonus.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Fixed Deducted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">₹{totalFixed.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Deducted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">₹{totalDeducted.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-100 flex flex-row items-center justify-between">
          <div className="text-left">
            <CardTitle>Deductions List</CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              {reportPeriod && `Range: ${displayDate(reportPeriod.from)} to ${displayDate(reportPeriod.to)}. `}
              Deducted amounts come from bills generated for cycles starting in this range.
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Filter by Farmer ID..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="whitespace-nowrap text-sm [&_th]:h-auto [&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3 [&_th]:align-middle [&_th]:whitespace-normal">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-bold text-left">Farmer ID</TableHead>
                  <TableHead className="font-bold text-left">Farmer Name</TableHead>
                  <TableHead className="font-bold text-left">Billed From</TableHead>
                  <TableHead className="font-bold text-left">Billed To</TableHead>
                  <TableHead className="font-bold text-right">Total Collection (L)</TableHead>
                  <TableHead className="font-bold text-right">Bonus Applied On (L)</TableHead>
                  <TableHead className="font-bold text-right">Per Litre</TableHead>
                  <TableHead className="font-bold text-right">Bonus Deduction</TableHead>
                  <TableHead className="font-bold text-right">Fixed Deduction</TableHead>
                  <TableHead className="font-bold text-right">Total Deduction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductionRows.length > 0 ? (
                  deductionRows.map((row) => (
                    <TableRow key={row.farmer_id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium text-blue-600 text-left">{row.farmer_id}</TableCell>
                      <TableCell className="text-left">{row.farmer_name}</TableCell>
                      <TableCell className="text-left">{displayDate(row.billed_from)}</TableCell>
                      <TableCell className="text-left">{displayDate(row.billed_to)}</TableCell>
                      <TableCell className="text-right font-medium">{row.quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{row.bonus_quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatRates(row.rates, "₹")}</TableCell>
                      <TableCell className="text-right text-red-500 font-medium">₹{row.bonus_deduction.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-red-500 font-medium">₹{row.fixed_deduction.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">₹{(row.bonus_deduction + row.fixed_deduction).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-gray-500">
                      {loading ? "Fetching data..." : "No bonus deductions found for this period."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {deductionRows.length > 0 && (
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell colSpan={4} className="text-left">Total</TableCell>
                    <TableCell className="text-right">{listedCollection.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{bonusCollection.toFixed(2)}</TableCell>
                    <TableCell />
                    <TableCell className="text-right text-red-500">₹{totalBonus.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-red-500">₹{totalFixed.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{totalDeducted.toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BonusReport;
