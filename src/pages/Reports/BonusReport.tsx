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
  deducted_from: string;
  deducted_to: string;
  quantity: number;
  bonus_quantity: number;
  rates: number[];
  bonus_amount: number;
  bonus_deduction: number;
  fixed_deduction: number;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const toDayKey = (date: string) => format(new Date(date), "yyyy-MM-dd");

// Rounds the way the DECIMAL(10,2) log column does, so 455.1 x 0.25 stays 113.78
const toRupees = (amount: number) => Math.round(amount * 100 + 1e-6) / 100;

const notDeducted = (row: BonusReportRow) => Math.max(0, toRupees(row.bonus_amount - row.bonus_deduction));

const formatRates = (rates: number[], prefix = "") =>
  rates.length ? [...rates].sort((a, b) => a - b).map((rate) => `${prefix}${rate.toFixed(2)}`).join(", ") : "-";

// One row per farmer: litres collected in the range, the bonus those litres come to,
// and what the generated bills recorded as deducted.
const buildReportRows = (
  logs: any[],
  collectionDays: any[],
  rateEntries: any[],
  farmerNames: Map<string, string>,
  cycleEndOf: (date: string) => string
): BonusReportRow[] => {
  const rows = new Map<string, BonusReportRow>();
  const rowFor = (id: string, fallbackName = "-") => {
    const farmerId = normalizeFarmerId(String(id));
    let row = rows.get(farmerId);
    if (!row) {
      row = {
        farmer_id: farmerId,
        farmer_name: farmerNames.get(farmerId) || fallbackName,
        deducted_from: "",
        deducted_to: "",
        quantity: 0,
        bonus_quantity: 0,
        rates: [],
        bonus_amount: 0,
        bonus_deduction: 0,
        fixed_deduction: 0,
      };
      rows.set(farmerId, row);
    }
    return row;
  };

  // A bill charges all of a cycle's litres at the rate in force when the cycle ends
  const litresByCycle = new Map<string, Map<string, number>>();
  collectionDays.forEach((day: any) => {
    (day.farmers || []).forEach((farmer: any) => {
      const row = rowFor(farmer.farmer_id, farmer.farmer_name);
      const quantity = Number(farmer.quantity) || 0;
      row.quantity += quantity;

      const cycleEnd = cycleEndOf(toDayKey(farmer.date || day.date));
      const cycles = litresByCycle.get(row.farmer_id) || new Map<string, number>();
      cycles.set(cycleEnd, (cycles.get(cycleEnd) || 0) + quantity);
      litresByCycle.set(row.farmer_id, cycles);
    });
  });

  const entriesByFarmer = new Map<string, any[]>();
  rateEntries.forEach((entry: any) => {
    const farmerId = normalizeFarmerId(String(entry.farmer_id));
    entriesByFarmer.set(farmerId, [...(entriesByFarmer.get(farmerId) || []), entry]);
  });

  // bonus_deduction on a log is the amount the bill deducted (litres x rate)
  const chargedCycles = new Set<string>();
  logs.forEach((log: any) => {
    const row = rowFor(log.farmer_id);
    const bonus = Number(log.bonus_deduction) || 0;
    row.bonus_deduction += bonus;
    row.fixed_deduction += Number(log.fixed_deduction) || 0;

    const cycleStart = toDayKey(log.start_date);
    const cycleEnd = toDayKey(log.end_date);
    if (bonus > 0) {
      chargedCycles.add(`${row.farmer_id}|${cycleEnd}`);
      if (!row.deducted_from || cycleStart < row.deducted_from) row.deducted_from = cycleStart;
      if (cycleEnd > row.deducted_to) row.deducted_to = cycleEnd;
    }
  });

  // Latest entry wins, as on the bill screens. Fixed-deduction entries carry a 0 rate, so
  // they can't be the rate of a cycle that was actually charged a bonus.
  litresByCycle.forEach((cycles, farmerId) => {
    const row = rowFor(farmerId);
    cycles.forEach((litres, cycleEnd) => {
      const charged = chargedCycles.has(`${farmerId}|${cycleEnd}`);
      const inForce = (entriesByFarmer.get(farmerId) || [])
        .filter((entry) => toDayKey(entry.effective_from) <= cycleEnd && (!charged || Number(entry.bonus_deduction) > 0))
        .reduce((latest, entry) => (!latest || entry.id > latest.id ? entry : latest), null as any);
      const rate = Number(inForce?.bonus_deduction) || 0;

      if (rate > 0 && litres > 0) {
        row.bonus_quantity += litres;
        row.bonus_amount += toRupees(litres * rate);
        if (!row.rates.includes(rate)) row.rates.push(rate);
      }
    });
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

      const [logsResponse, summaryResponse, ratesResponse, farmersResponse] = await Promise.all([
        bonusApi.getBonusDeductionLogs(requestPayload),
        deductionApi.getAllFarmersBalance(dairyId, fromDate, toDate),
        bonusApi.getBonusDeductions(requestPayload),
        userApi.getFarmers(selectedVLC).catch(() => null),
      ]);

      if (logsResponse.data.success && summaryResponse.data.success && ratesResponse.data.success) {
        const farmerNames = new Map<string, string>();
        (Array.isArray(farmersResponse?.data) ? farmersResponse.data : []).forEach((farmer: any) => {
          farmerNames.set(normalizeFarmerId(String(farmer.username || farmer.farmer_id || "")), farmer.fullName || farmer.name || "");
        });

        const rows = buildReportRows(
          logsResponse.data.data || [],
          summaryResponse.data.data || [],
          ratesResponse.data.data || [],
          farmerNames,
          (date) => calculateDateRange(date).to
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
  const deductionRows = filteredData.filter((row) => row.bonus_amount > 0 || row.bonus_deduction > 0 || row.fixed_deduction > 0);

  const totalCollection = filteredData.reduce((sum, row) => sum + row.quantity, 0);
  const bonusCollection = deductionRows.reduce((sum, row) => sum + row.bonus_quantity, 0);
  const listedCollection = deductionRows.reduce((sum, row) => sum + row.quantity, 0);
  const totalBonusAmount = deductionRows.reduce((sum, row) => sum + row.bonus_amount, 0);
  const totalBonus = deductionRows.reduce((sum, row) => sum + row.bonus_deduction, 0);
  const totalNotDeducted = deductionRows.reduce((sum, row) => sum + notDeducted(row), 0);
  const totalFixed = deductionRows.reduce((sum, row) => sum + row.fixed_deduction, 0);
  const totalDeducted = totalBonus + totalFixed;

  const displayDate = (date: string) => format(new Date(date), "dd-MM-yyyy");
  const deductedFor = (row: BonusReportRow) =>
    row.deducted_from ? `${displayDate(row.deducted_from)} to ${displayDate(row.deducted_to)}` : "-";

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
        ["Farmer ID", "Farmer Name", "Total Collection (L)", "Bonus Applied On (L)", "Per Litre (Rs)", "Bonus Amount (Rs)", "Bonus Deducted (Rs)", "Deducted For", "Not Deducted (Rs)", "Fixed Deducted (Rs)", "Total Deducted (Rs)"],
        ...deductionRows.map((row) => [
          row.farmer_id,
          row.farmer_name,
          Number(row.quantity.toFixed(2)),
          Number(row.bonus_quantity.toFixed(2)),
          row.rates.length === 1 ? row.rates[0] : formatRates(row.rates),
          Number(row.bonus_amount.toFixed(2)),
          Number(row.bonus_deduction.toFixed(2)),
          deductedFor(row),
          Number(notDeducted(row).toFixed(2)),
          Number(row.fixed_deduction.toFixed(2)),
          Number((row.bonus_deduction + row.fixed_deduction).toFixed(2)),
        ]),
        ["Total", "", Number(listedCollection.toFixed(2)), Number(bonusCollection.toFixed(2)), "", Number(totalBonusAmount.toFixed(2)), Number(totalBonus.toFixed(2)), "", Number(totalNotDeducted.toFixed(2)), Number(totalFixed.toFixed(2)), Number(totalDeducted.toFixed(2))],
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      ws["!cols"] = [{ wch: 30 }, { wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 26 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
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
        `Total Collection (All Farmers): ${totalCollection.toFixed(2)} L   |   Bonus Applied On: ${bonusCollection.toFixed(2)} L   |   Bonus Amount: Rs ${totalBonusAmount.toFixed(2)}   |   Bonus Deducted: Rs ${totalBonus.toFixed(2)}   |   Not Deducted: Rs ${totalNotDeducted.toFixed(2)}`,
        pageW / 2,
        25,
        { align: "center" }
      );

      autoTable(doc, {
        head: [["Farmer ID", "Farmer Name", "Total Collection (L)", "Bonus Applied On (L)", "Per Litre (Rs)", "Bonus Amount (Rs)", "Bonus Deducted (Rs)", "Deducted For", "Not Deducted (Rs)", "Fixed Ded. (Rs)", "Total Ded. (Rs)"]],
        body: deductionRows.map((row) => [
          row.farmer_id,
          row.farmer_name,
          row.quantity.toFixed(2),
          row.bonus_quantity.toFixed(2),
          formatRates(row.rates),
          row.bonus_amount.toFixed(2),
          row.bonus_deduction.toFixed(2),
          deductedFor(row),
          notDeducted(row).toFixed(2),
          row.fixed_deduction.toFixed(2),
          (row.bonus_deduction + row.fixed_deduction).toFixed(2),
        ]),
        foot: [["Total", "", listedCollection.toFixed(2), bonusCollection.toFixed(2), "", totalBonusAmount.toFixed(2), totalBonus.toFixed(2), "", totalNotDeducted.toFixed(2), totalFixed.toFixed(2), totalDeducted.toFixed(2)]],
        showFoot: "lastPage",
        startY: 29,
        theme: "grid",
        styles: { font, fontSize, textColor: [31, 41, 55], cellPadding: 1.5, overflow: "linebreak" },
        headStyles: { font: "helvetica", fillColor: [55, 65, 81], textColor: 255, fontStyle: "bold", halign: "center" },
        footStyles: { font: "helvetica", fillColor: [229, 231, 235], textColor: [31, 41, 55], fontStyle: "bold", halign: "right" },
        columnStyles: {
          0: { cellWidth: 16, halign: "center" },
          1: { cellWidth: 48 },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "center", cellWidth: 24 },
          8: { halign: "right" },
          9: { halign: "right" },
          10: { halign: "right", font: "helvetica", fontStyle: "bold" },
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
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3 mb-4 mx-2 text-left">
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
              <CardTitle className="text-sm font-medium text-gray-600">Bonus Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">₹{totalBonusAmount.toFixed(2)}</p>
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
              <CardTitle className="text-sm font-medium text-gray-600">Not Deducted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">₹{totalNotDeducted.toFixed(2)}</p>
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
              Bonus Amount is the litres in this range x the rate in force. Bonus Deducted is what bills generated for cycles starting in this range recorded.
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
                  <TableHead className="font-bold text-left">Period Start</TableHead>
                  <TableHead className="font-bold text-left">Period End</TableHead>
                  <TableHead className="font-bold text-right">Total Collection (L)</TableHead>
                  <TableHead className="font-bold text-right">Bonus Applied On (L)</TableHead>
                  <TableHead className="font-bold text-right">Per Litre</TableHead>
                  <TableHead className="font-bold text-right">Bonus Amount</TableHead>
                  <TableHead className="font-bold text-right">Bonus Deducted</TableHead>
                  <TableHead className="font-bold text-right">Not Deducted</TableHead>
                  <TableHead className="font-bold text-right">Fixed Deducted</TableHead>
                  <TableHead className="font-bold text-right">Total Deducted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductionRows.length > 0 && reportPeriod ? (
                  deductionRows.map((row) => (
                    <TableRow key={row.farmer_id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium text-blue-600 text-left">{row.farmer_id}</TableCell>
                      <TableCell className="text-left">{row.farmer_name}</TableCell>
                      <TableCell className="text-left">{displayDate(reportPeriod.from)}</TableCell>
                      <TableCell className="text-left">{displayDate(reportPeriod.to)}</TableCell>
                      <TableCell className="text-right font-medium">{row.quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{row.bonus_quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatRates(row.rates, "₹")}</TableCell>
                      <TableCell className="text-right font-medium">₹{row.bonus_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-red-500 font-medium">
                        ₹{row.bonus_deduction.toFixed(2)}
                        {row.deducted_from && <div className="text-[10px] font-normal text-gray-500">{deductedFor(row)}</div>}
                      </TableCell>
                      <TableCell className="text-right text-amber-600 font-medium">₹{notDeducted(row).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-red-500 font-medium">₹{row.fixed_deduction.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">₹{(row.bonus_deduction + row.fixed_deduction).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-10 text-gray-500">
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
                    <TableCell className="text-right">₹{totalBonusAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-red-500">₹{totalBonus.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-amber-600">₹{totalNotDeducted.toFixed(2)}</TableCell>
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
