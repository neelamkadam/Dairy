import { Button } from "@/components/ui/button";
import { AppDatePicker } from "@/components/ui/date-picker";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { AlertTriangle, BadgeCheck, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import {
  NEFT_COLUMNS,
  NeftRow,
  fetchNeftRowsForVlc,
  formatAmount,
  neftTotals,
} from "@/utils/farmerNeftStatement";
import { generateFarmerNeftExcel, generateFarmerNeftPDF } from "@/templates/FarmerNeftStatementTemplate";

// Current 10-day bill period: 1–10, 11–20, 21–end of month.
const getDateRange = (date: Date = new Date()) => {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const [startDay, endDay] =
    day <= 10 ? [1, 10] : day <= 20 ? [11, 20] : [21, new Date(year, month + 1, 0).getDate()];
  return { from: new Date(year, month, startDay), to: new Date(year, month, endDay) };
};

const FarmerNeftStatement = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const dairyName = useAppSelector((state) => state.authData.userData?.name) || "";

  const defaultRange = getDateRange();
  const [selectedVLCs, setSelectedVLCs] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<Date>(defaultRange.from);
  const [toDate, setToDate] = useState<Date>(defaultRange.to);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<NeftRow[]>([]);
  const totals = useMemo(() => neftTotals(rows), [rows]);
  const missingBankCount = rows.filter((r) => r.missingBank).length;
  // Only bank-verified farmers go into the Excel / PDF (the payout files).
  const verifiedRows = useMemo(() => rows.filter((r) => r.bankVerified), [rows]);
  const unverifiedCount = rows.length - verifiedRows.length;
  const title = t("farmer_neft_statement", "Farmer Bank NEFT Statement");

  const handleSubmit = async () => {
    if (selectedVLCs.length === 0 || !fromDate || !toDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const perVlc = await Promise.all(
        selectedVLCs.map((id) => {
          const branch = branches.find((b) => String(b.branch_id) === id);
          return fetchNeftRowsForVlc(id, branch?.username ? String(branch.username) : undefined, fromDate, toDate);
        })
      );
      setRows(perVlc.flat());
      toast.success("Data fetched successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (kind: "pdf" | "excel") => {
    if (verifiedRows.length === 0) {
      toast.error(t("no_verified_farmers_to_export", "No verified farmers to export"));
      return;
    }
    const from = format(fromDate, "dd/MM/yy");
    const to = format(toDate, "dd/MM/yy");
    if (kind === "pdf") generateFarmerNeftPDF(verifiedRows, dairyName, title, from, to);
    else generateFarmerNeftExcel(verifiedRows, from, to);
    toast.success(
      `${kind === "pdf" ? "PDF" : "Excel"} exported with ${verifiedRows.length} verified farmer(s)` +
        (unverifiedCount ? `; ${unverifiedCount} unverified left out` : "")
    );
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
              {missingBankCount} farmer(s) missing A/C Number or IFSC (highlighted)
            </span>
          )}
          {unverifiedCount > 0 && (
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {unverifiedCount} unverified farmer(s) will not be exported — verify them in Farmer List
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => handleExport("excel")}
            disabled={verifiedRows.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white h-11 flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t("excel_export")}
          </Button>
          <Button
            onClick={() => handleExport("pdf")}
            disabled={verifiedRows.length === 0}
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
              {NEFT_COLUMNS.map((c) => (
                <th key={c.key} className={`${cell} ${c.amount ? "text-right" : "text-left"}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={NEFT_COLUMNS.length} className={`${cell} py-8 text-center text-gray-500`}>
                  {loading ? "Loading..." : "No data available. Please submit the form to fetch data."}
                </td>
              </tr>
            ) : (
              <>
                {rows.map((r) => (
                  <tr
                    key={`${r.vlcId}_${r.farmerCode}`}
                    className={r.missingBank ? "bg-amber-50" : "hover:bg-gray-50"}
                    title={`VLC ${r.vlcId} · Farmer ${r.farmerCode}${r.commission ? ` · Commission ₹${formatAmount(r.commission)}` : ""}`}
                  >
                    {NEFT_COLUMNS.map((c) => (
                      <td key={c.key} className={`${cell} ${c.amount ? "text-right" : ""}`}>
                        {c.key === "accountNumber" ? (
                          <div className="flex items-center gap-2">
                            <span>{r.accountNumber}</span>
                            {r.bankVerified ? (
                              <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Bank details verified" />
                            ) : (
                              <span className="text-[10px] font-medium text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                                {t("unverified", "Unverified")}
                              </span>
                            )}
                          </div>
                        ) : c.amount ? formatAmount(r[c.key] as number) : String(r[c.key] || "")}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-gray-200 font-bold">
                  {NEFT_COLUMNS.map((c, i) => (
                    <td key={c.key} className={`${cell} ${c.amount ? "text-right" : ""}`}>
                      {c.amount
                        ? formatAmount(totals[c.key as keyof typeof totals])
                        : i === 0 ? `Total (${rows.length})` : ""}
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

export default FarmerNeftStatement;
