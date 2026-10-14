import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { format, isValid, parseISO } from "date-fns";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDatePicker } from "@/components/ui/date-picker";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { useAppSelector } from "@/redux/store";
import { useVlcSectionLabel } from "@/utils/vlcSectionLabel";
import {
  VLC_NEFT_COLUMNS,
  VlcNeftRow,
  fetchVlcCommissionNeft,
  formatAmount,
  formatColumnAmount,
  vlcNeftTotals,
} from "@/utils/vlcCommissionNeft";
import { generateVlcCommissionNeftExcel, generateVlcCommissionNeftPDF } from "@/templates/VlcCommissionNeftTemplate";

// Current 10-day bill period: 1–10, 11–20, 21–end of month.
const getDateRange = (date: Date = new Date()) => {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const [startDay, endDay] =
    day <= 10 ? [1, 10] : day <= 20 ? [11, 20] : [21, new Date(year, month + 1, 0).getDate()];
  return { from: new Date(year, month, startDay), to: new Date(year, month, endDay) };
};

const VlcCommissionNeft = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const userData = useAppSelector((state) => state.authData.userData);
  const dairyName = userData?.name || "";
  const { showSerials, columnLabel } = useVlcSectionLabel();

  const defaultRange = getDateRange();
  const [selectedVLCs, setSelectedVLCs] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<Date>(defaultRange.from);
  const [toDate, setToDate] = useState<Date>(defaultRange.to);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<VlcNeftRow[]>([]);

  const title = t("vlc_commission_neft", "VLC Commission NEFT");
  const totals = useMemo(() => vlcNeftTotals(rows), [rows]);
  const missingBankCount = rows.filter((r) => r.missingBank).length;
  const negativeCount = rows.filter((r) => r.netPayable < 0).length;

  const handleSubmit = async () => {
    if (selectedVLCs.length === 0) {
      toast.error(t("please_select_vlc_first_report", "Please select a VLC"));
      return;
    }
    if (!userData?.id) return;
    setLoading(true);
    try {
      // Branch-list order, the order the VLC numbers run in.
      const vlcs = branches
        .filter((b) => selectedVLCs.includes(String(b.branch_id)))
        .map((b) => ({ branchId: String(b.branch_id), vlcId: String(b.username), vspName: columnLabel(b) }));
      setRows(
        await fetchVlcCommissionNeft(vlcs, format(fromDate, "yyyy-MM-dd"), format(toDate, "yyyy-MM-dd"), Number(userData.id))
      );
      toast.success("Data fetched successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (kind: "pdf" | "excel") => {
    if (!rows.length) {
      toast.error("No data to export");
      return;
    }
    const from = format(fromDate, "dd/MM/yy");
    const to = format(toDate, "dd/MM/yy");
    if (kind === "pdf") generateVlcCommissionNeftPDF(rows, dairyName, title, from, to);
    else generateVlcCommissionNeftExcel(rows, from, to);
    toast.success(kind === "pdf" ? "PDF exported successfully" : "Excel exported successfully");
  };

  const cell = "border border-gray-300 px-2 py-1";

  return (
    <div>
      <div className="flex justify-between items-center p-3 md:p-4 bg-white">
        <h1 className="text-left text-lg md:text-xl font-semibold">{title}</h1>
      </div>
      <hr className="text-gray-300" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 my-4 text-left">
        <div>
          <label className="text-sm font-medium">{t("vlc_name")}</label>
          <VLCDropdown
            branches={branches || []}
            value={selectedVLCs}
            onChange={(value) => setSelectedVLCs(value)}
            valueKey="branch_id"
            placeholder="Select VLC Centers"
            isMultiSelect={true}
            showSerialNumbers={showSerials}
          />
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
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-[120px] text-white">
            {loading ? t("loading") : t("submit")}
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-3 mx-2 mb-4">
        <div className="text-sm text-amber-700 flex flex-col gap-1">
          {missingBankCount > 0 && (
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {missingBankCount} VLC(s) missing A/C Number or IFSC — add them in Create Dairy
            </span>
          )}
          {negativeCount > 0 && (
            <span className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              {negativeCount} VLC(s) have deductions larger than the commission (negative Net Payable)
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => handleExport("excel")}
            disabled={!rows.length}
            className="bg-green-600 hover:bg-green-700 text-white h-11 flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t("excel_export")}
          </Button>
          <Button
            onClick={() => handleExport("pdf")}
            disabled={!rows.length}
            variant="outline"
            className="bg-red-500 text-white h-11 flex items-center justify-center gap-2 border-none"
          >
            <Download className="h-4 w-4" />
            {t("pdf_export")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto px-4 md:px-5 pb-6">
        <table className="table-auto border-collapse border border-gray-300 w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-200">
            <tr>
              {VLC_NEFT_COLUMNS.map((c) => (
                <th key={c.key} className={`${cell} ${c.amount ? "text-right" : "text-left"}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={VLC_NEFT_COLUMNS.length} className={`${cell} py-8 text-center text-gray-500`}>
                  {loading ? "Loading..." : "No data available. Please submit the form to fetch data."}
                </td>
              </tr>
            ) : (
              <>
                {rows.map((r) => (
                  <tr
                    key={r.branchId}
                    className={r.netPayable < 0 ? "bg-red-50" : r.missingBank ? "bg-amber-50" : "hover:bg-gray-50"}
                  >
                    {VLC_NEFT_COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className={`${cell} ${c.amount ? "text-right" : ""} ${c.amount && (r[c.key] as number) < 0 ? "text-red-700 font-medium" : ""}`}
                        title={
                          c.key === "commission"
                            ? r.commissionNote
                            : c.key === "deduction"
                              ? `Composite − Dispatch: ${formatAmount(r.compositeDispatch)}`
                              : undefined
                        }
                      >
                        {c.amount ? formatColumnAmount(c, r[c.key] as number) : String(r[c.key] || "")}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-gray-200 font-bold">
                  {VLC_NEFT_COLUMNS.map((c, i) => (
                    <td key={c.key} className={`${cell} ${c.amount ? "text-right" : ""}`}>
                      {c.amount ? formatColumnAmount(c, totals[c.key] ?? 0) : i === 0 ? "Total Amount" : ""}
                    </td>
                  ))}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VlcCommissionNeft;
