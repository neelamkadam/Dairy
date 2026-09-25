import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppDatePicker } from "@/components/ui/date-picker";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import FarmerCollectionSummaryTable from "@/components/FarmerCollectionSummaryTable";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { api } from "@/services/config";
import { generateFarmerCollectionSummaryPDF } from "@/templates/FarmerCollectionSummaryTemplate";
import { generateFarmerCollectionSummaryExcel } from "@/templates/FarmerCollectionSummaryExcelTemplate";
import {
  COMMISSION_SUMMARY_COLUMNS,
  CommissionRecord,
  buildFarmerCollectionSummary,
  fetchFarmerCommissions,
} from "@/utils/farmerCollectionSummary";

// Current 10-day bill period: 1–10, 11–20, 21–end of month.
const getDateRange = (date: Date = new Date()) => {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const [startDay, endDay] =
    day <= 10 ? [1, 10] : day <= 20 ? [11, 20] : [21, new Date(year, month + 1, 0).getDate()];
  return { from: new Date(year, month, startDay), to: new Date(year, month, endDay) };
};

const FarmerCommissionReport = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const dairyName = useAppSelector((state) => state.authData.userData?.name) || "";

  const defaultRange = getDateRange();
  const [selectedVLCs, setSelectedVLCs] = useState<string[]>([]);
  const [milkType, setMilkType] = useState("All");
  const [shift, setShift] = useState("All");
  const [fromDate, setFromDate] = useState<Date>(defaultRange.from);
  const [toDate, setToDate] = useState<Date>(defaultRange.to);
  const [loading, setLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<any[]>([]);
  // branch_id → farmer code → farmer commission records
  const [commissions, setCommissions] = useState<Map<string, Map<string, CommissionRecord[]>>>(new Map());

  const branchByDairyId = useMemo(
    () => new Map((branches || []).map((b) => [String(b.branch_id), b])),
    [branches]
  );

  const reportSummary = useMemo(
    () =>
      buildFarmerCollectionSummary(
        collectionData,
        selectedVLCs.map((id) => {
          const b = branchByDairyId.get(id);
          return { dairyId: id, name: [b?.username, b?.name || id, b?.branchName].filter(Boolean).join(" - ") };
        }),
        commissions
      ),
    [collectionData, selectedVLCs, branchByDairyId, commissions]
  );

  const handleSubmit = async () => {
    if (selectedVLCs.length === 0 || !fromDate || !toDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const [results, commissionMaps] = await Promise.all([
        Promise.all(
          selectedVLCs.map((vlcId) =>
            api.get("/webreports/collections", {
              params: {
                dairy_id: vlcId,
                milk_type: milkType,
                shift,
                from: format(fromDate, "yyyy-MM-dd"),
                to: format(toDate, "yyyy-MM-dd"),
              },
            })
          )
        ),
        Promise.all(selectedVLCs.map((id) => fetchFarmerCommissions(id, branchByDairyId.get(id)?.username))),
      ]);

      setCollectionData(
        results.flatMap((res, index) =>
          (res.data.success ? res.data.data || [] : []).map((row: any) => ({ ...row, branch_id: selectedVLCs[index] }))
        )
      );
      setCommissions(new Map(selectedVLCs.map((id, i) => [id, commissionMaps[i]])));
      toast.success("Data fetched successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch data");
      setCollectionData([]);
    } finally {
      setLoading(false);
    }
  };

  const title = t("farmer_commission_report", "Farmer Commission Report");
  const hasData = reportSummary.groups.length > 0;

  const handleExport = (kind: "pdf" | "excel") => {
    if (!hasData) {
      toast.error("No data to export");
      return;
    }
    const from = format(fromDate, "dd/MM/yy");
    const to = format(toDate, "dd/MM/yy");
    if (kind === "pdf") {
      generateFarmerCollectionSummaryPDF(reportSummary, dairyName, from, to, COMMISSION_SUMMARY_COLUMNS, title, "Farmer_Commission_Report");
    } else {
      generateFarmerCollectionSummaryExcel(reportSummary, dairyName, from, to, COMMISSION_SUMMARY_COLUMNS, "Farmer_Commission_Report");
    }
    toast.success(kind === "pdf" ? "PDF exported successfully" : "Excel exported successfully");
  };

  return (
    <div>
      <div className="flex justify-between items-center p-3 md:p-4 bg-white">
        <h1 className="text-left text-lg md:text-xl font-semibold">{title}</h1>
      </div>
      <hr className="text-gray-300" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 my-4 text-left">
        <div>
          <label className="text-sm font-medium">{t("vlc_name")}</label>
          <VLCDropdown
            branches={branches || []}
            value={selectedVLCs}
            onChange={(value) => setSelectedVLCs(value)}
            valueKey="branch_id"
            placeholder="Select VLC Centers"
            isMultiSelect={true}
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("milk_type")}</label>
          <Select value={milkType} onValueChange={setMilkType}>
            <SelectTrigger className="w-full border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="All">{t("all")}</SelectItem>
              <SelectItem value="Cow">{t("cow")}</SelectItem>
              <SelectItem value="Buffalo">{t("buffalo")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t("shift")}</label>
          <Select value={shift} onValueChange={setShift}>
            <SelectTrigger className="w-full border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="All">{t("all")}</SelectItem>
              <SelectItem value="Morning">{t("morning")}</SelectItem>
              <SelectItem value="Evening">{t("evening")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{t("from_date")}</label>
          <AppDatePicker
            date={fromDate}
            onChange={(dateStr) => {
              const parsed = parseISO(dateStr);
              if (isValid(parsed)) setFromDate(parsed);
            }}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{t("to_date")}</label>
          <AppDatePicker
            date={toDate}
            onChange={(dateStr) => {
              const parsed = parseISO(dateStr);
              if (isValid(parsed)) setToDate(parsed);
            }}
            className="w-full"
          />
        </div>
        <div className="lg:col-span-4 xl:col-span-5 flex justify-end">
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-[120px] text-white">
            {loading ? t("loading") : t("submit")}
          </Button>
        </div>
      </div>

      <div className="flex justify-end flex-wrap gap-3 mx-2 mb-4">
        <Button
          onClick={() => handleExport("excel")}
          disabled={!hasData}
          className="bg-green-600 hover:bg-green-700 text-white h-11 flex items-center justify-center gap-2"
        >
          <Download className="h-4 w-4" />
          {t("excel_export")}
        </Button>
        <Button
          onClick={() => handleExport("pdf")}
          disabled={!hasData}
          variant="outline"
          className="bg-red-500 text-white h-11 flex items-center justify-center gap-2 border-none"
        >
          <Download className="h-4 w-4" />
          {t("pdf_export")}
        </Button>
      </div>

      <FarmerCollectionSummaryTable
        summary={reportSummary}
        dairyName={dairyName}
        fromDate={format(fromDate, "dd/MM/yy")}
        toDate={format(toDate, "dd/MM/yy")}
        columns={COMMISSION_SUMMARY_COLUMNS}
        emptyText={loading ? "Loading..." : "No data available. Please submit the form to fetch data."}
      />
    </div>
  );
};

export default FarmerCommissionReport;
