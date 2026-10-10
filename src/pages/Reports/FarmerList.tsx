import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSelector } from "@/redux/store";
import { userApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { generateFarmerListPDFForDairies } from "@/templates/FarmerListTemplate";
import { generateFarmerListExcelForDairies } from "@/templates/FarmerListExcelTemplate";
import { AlertTriangle, BadgeCheck, Download, Loader2, Pencil, ShieldOff } from "lucide-react";
import { farmerBankApi, farmerUserId, isBankVerified } from "@/services/farmerBankApi";
import FarmerEditModal from "@/components/FarmerEditModal";
import Pagination from "@/components/Pagination";
import { useVlcSectionLabel } from "@/utils/vlcSectionLabel";
import { cn } from "@/lib/utils";

// One selected dairy and its farmers.
interface DairySection {
  branchId: string;
  username: string;
  name: string;
  branchName: string;
  farmers: any[];
}

type VerificationFilter = "all" | "verified" | "unverified";

// Dairies are fetched a few at a time, so "Select All" on a long list does not
// fire one request per dairy all at once.
const FETCH_CONCURRENCY = 4;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const FarmerList = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [selectedVlcs, setSelectedVlcs] = useState<string[]>([]);
  const [sections, setSections] = useState<DairySection[]>([]);
  const [failedDairies, setFailedDairies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const userData = useAppSelector((state) => state.authData.userData);
  // Dairies are listed in branch-list order, the order the VLC numbers run in.
  const { showSerials, label: sectionLabel } = useVlcSectionLabel();
  const [editing, setEditing] = useState<{ dairyId: string; farmerCode: string; fullName?: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>("all");

  // Re-read one dairy's farmers after an edit, keeping the page where it is.
  const reloadSection = async (branchId: string) => {
    try {
      const data = await userApi.getFarmers(branchId);
      if (!data?.success) return;
      const farmers = Array.isArray(data.data) ? data.data : [];
      setSections((prev) => prev.map((s) => (s.branchId === branchId ? { ...s, farmers } : s)));
    } catch {
      toast.error(t("failed_to_fetch_farmers", "Failed to fetch farmers"));
    }
  };

  const toggleVerification = async (branchId: string, farmer: any, verified: boolean) => {
    const id = farmerUserId(farmer);
    if (id == null) return;
    setBusyId(String(id));
    try {
      const res = await farmerBankApi.setVerification(id, verified, userData?.name || userData?.email || "web");
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setSections((prev) =>
        prev.map((s) =>
          s.branchId !== branchId
            ? s
            : {
                ...s,
                farmers: s.farmers.map((f) =>
                  String(farmerUserId(f)) === String(id)
                    ? { ...f, bank_verified: res.data.bank_verified, bank_verified_by: res.data.bank_verified_by, bank_verified_at: res.data.bank_verified_at }
                    : f
                ),
              }
        )
      );
      toast.success(res.message);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update verification");
    } finally {
      setBusyId(null);
    }
  };

  const handleShow = async () => {
    if (!selectedVlcs.length) {
      toast.error(t("please_select_vlc_first_report", "Please select a VLC"));
      return;
    }

    // In the order of the dairy list, whatever order they were ticked in.
    const selected = (branches || []).filter((b) => selectedVlcs.includes(String(b.branch_id)));

    setLoading(true);
    setCurrentPage(1);
    const results = await mapWithConcurrency(selected, FETCH_CONCURRENCY, async (branch) => {
      const data = await userApi.getFarmers(String(branch.branch_id));
      if (!data?.success) throw new Error(data?.message);
      return Array.isArray(data.data) ? data.data : [];
    });

    const loaded: DairySection[] = [];
    const failed: string[] = [];
    results.forEach((result, i) => {
      const branch = selected[i];
      if (result.status === "fulfilled") {
        loaded.push({
          branchId: String(branch.branch_id),
          username: branch.username,
          name: branch.name,
          branchName: branch.branchName,
          farmers: result.value,
        });
      } else {
        failed.push(`${branch.username} - ${branch.name}`);
      }
    });

    setSections(loaded);
    setFailedDairies(failed);
    if (failed.length === selected.length) {
      toast.error(t("failed_to_fetch_farmers", "Failed to fetch farmers"));
    }
    setLoading(false);
  };


  const verifiedCount = sections.reduce((sum, s) => sum + s.farmers.filter(isBankVerified).length, 0);
  const unverifiedCount = sections.reduce((sum, s) => sum + s.farmers.length, 0) - verifiedCount;

  // The dairies as shown and exported: each one's farmers narrowed to the verification filter
  const visibleSections = verificationFilter === "all"
    ? sections
    : sections.map((s) => ({
        ...s,
        farmers: s.farmers.filter((f) => isBankVerified(f) === (verificationFilter === "verified")),
      }));

  const totalFarmers = visibleSections.reduce((sum, s) => sum + s.farmers.length, 0);

  const changeVerificationFilter = (filter: VerificationFilter) => {
    setVerificationFilter(filter);
    setCurrentPage(1);
  };

  const handleExportPDF = () => {
    if (!sections.length) {
      toast.error(t("no_data_to_export", "No data to export"));
      return;
    }
    generateFarmerListPDFForDairies(
      visibleSections.map((s) => ({ vlcName: sectionLabel(s), farmers: s.farmers }))
    );
    toast.success(t("pdf_exported_successfully", "PDF exported successfully"));
  };

  const handleExportExcel = () => {
    if (!sections.length) {
      toast.error(t("no_data_to_export", "No data to export"));
      return;
    }
    generateFarmerListExcelForDairies(
      visibleSections.map((s) => ({ vlcName: sectionLabel(s), farmers: s.farmers }))
    );
    toast.success(t("excel_exported_successfully", "Excel exported successfully"));
  };

  // Every farmer in dairy order, so pagination runs straight through the dairies.
  // Only farmers are paged, so "of N" is the real farmer count.
  const rows = visibleSections.flatMap((section) => section.farmers.map((farmer) => ({ section, farmer })));
  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * itemsPerPage;
  const currentRows = rows.slice(startIndex, startIndex + itemsPerPage);
  const isLastPage = page === totalPages;

  // Dairies with no farmers keep their place in the list: each is shown just
  // before the next dairy that has farmers, or after everything on the last page.
  const emptiesBefore = new Map<DairySection, DairySection[]>();
  let pendingEmpty: DairySection[] = [];
  visibleSections.forEach((section) => {
    if (section.farmers.length) {
      emptiesBefore.set(section, pendingEmpty);
      pendingEmpty = [];
    } else {
      pendingEmpty.push(section);
    }
  });
  const trailingEmpties = pendingEmpty;

  const sectionHeader = (section: DairySection, continued: boolean) => (
    <TableRow className="bg-blue-50 hover:bg-blue-50">
      <TableCell colSpan={10} className="border border-gray-300 font-semibold text-blue-900">
        {sectionLabel(section)}
        <span className="ml-2 font-normal text-blue-700">
          ({section.farmers.length} {t("farmers", "Farmers")})
        </span>
        {continued && <span className="ml-2 text-xs font-normal text-slate-500">({t("continued", "continued")})</span>}
      </TableCell>
    </TableRow>
  );

  const emptySection = (section: DairySection) => (
    <Fragment key={`empty-${section.branchId}`}>
      {sectionHeader(section, false)}
      <TableRow>
        <TableCell colSpan={10} className="border border-gray-300 text-center py-3 text-gray-500">
          {verificationFilter === "verified"
            ? t("no_verified_farmers_in_dairy", "No verified farmers in this dairy")
            : verificationFilter === "unverified"
              ? t("no_unverified_farmers_in_dairy", "No unverified farmers in this dairy")
              : t("no_farmers_registered", "No farmers registered for this dairy")}
        </TableCell>
      </TableRow>
    </Fragment>
  );

  return (
    <div className="p-2 sm:p-4 text-left">
      {/* Header */}
      <div className="flex flex-col items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 mb-4">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">{t("farmer_list", "Farmer List")}</h1>
        <p className="text-sm font-medium text-slate-500">{t("manage_view_farmers", "Manage and view all farmers")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mb-4 text-left">
        <div className="space-y-2 sm:col-span-2 lg:col-span-2">
          <label className="text-sm font-medium text-gray-700">{t("select_vlc_center", "Select VLC")}</label>
          <VLCDropdown
            branches={branches || []}
            value={selectedVlcs}
            onChange={(value: string[]) => {
              setSelectedVlcs(value);
              setSections([]);
              setFailedDairies([]);
              setCurrentPage(1);
            }}
            valueKey="branch_id"
            isMultiSelect
            showSerialNumbers={showSerials}
            placeholder={t("select_vlc_center", "Select VLC")}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-2 xl:col-span-3 flex flex-wrap gap-2 justify-end">
          <Button onClick={handleShow} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white w-[120px] h-10">
            {loading ? t("loading", "Loading...") : t("show", "Show")}
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={!sections.length}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 h-10"
          >
            <Download className="h-4 w-4" />
            {t("excel_export", "Excel Export")}
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={!sections.length}
            variant="default"
            className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 h-10"
          >
            <Download className="h-4 w-4" />
            {t("export_pdf", "PDF Export")}
          </Button>
        </div>
      </div>

      {failedDairies.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <span>
            {t("farmers_not_loaded_for", "Farmers could not be loaded for")}: {failedDairies.join(", ")}
          </span>
        </div>
      )}

      {sections.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            {t("farmers_across_dairies", {
              farmers: totalFarmers,
              dairies: sections.length,
              defaultValue: "{{farmers}} farmers across {{dairies}} dairies",
            })}
          </p>
          <div role="group" className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
            {[
              { value: "all" as const, label: t("all", "All"), count: verifiedCount + unverifiedCount, icon: null, active: "bg-blue-600" },
              { value: "verified" as const, label: t("verified", "Verified"), count: verifiedCount, icon: BadgeCheck, active: "bg-emerald-600" },
              { value: "unverified" as const, label: t("unverified", "Unverified"), count: unverifiedCount, icon: ShieldOff, active: "bg-amber-500" },
            ].map(({ value, label, count, icon: Icon, active }) => (
              <button
                key={value}
                type="button"
                aria-pressed={verificationFilter === value}
                onClick={() => changeVerificationFilter(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
                  verificationFilter === value ? `${active} text-white` : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
                <span className="tabular-nums opacity-80">({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <Table className="whitespace-nowrap text-sm [&_th]:h-auto [&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3 [&_th]:align-middle">
          <TableHeader className="bg-gray-200">
            <TableRow>
              <TableHead className="border border-gray-300">{t("farmer_code", "Farmer ID")}</TableHead>
              <TableHead className="border border-gray-300">{t("name", "Name")}</TableHead>
              <TableHead className="border border-gray-300">{t("contact", "Contact")}</TableHead>
              <TableHead className="border border-gray-300">{t("milk_type", "Milk Type")}</TableHead>
              <TableHead className="border border-gray-300">{t("rate_chart", "Rate Chart")}</TableHead>
              <TableHead className="border border-gray-300">{t("bank_name", "Bank Name")}</TableHead>
              <TableHead className="border border-gray-300">{t("account_number", "Account Number")}</TableHead>
              <TableHead className="border border-gray-300">{t("ifsc_code", "IFSC Code")}</TableHead>
              <TableHead className="border border-gray-300 text-center">{t("passbook", "Passbook")}</TableHead>
              <TableHead className="border border-gray-300 text-center">{t("actions", "Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRows.length > 0 || sections.length > 0 ? (
              <>
              {currentRows.map(({ section, farmer }, i) => {
                const newSection = i === 0 || currentRows[i - 1].section !== section;
                const startsHere = section.farmers[0] === farmer;
                // A dairy that started on an earlier page is marked as continued.
                const continued = newSection && !startsHere;
                return (
                  // /users joins the dairy row over `id`, so every farmer of a dairy
                  // shares it; `userid` is the farmer's own id.
                  <Fragment key={`${section.branchId}-${farmerUserId(farmer) ?? farmer.username}`}>
                    {newSection && startsHere && emptiesBefore.get(section)?.map(emptySection)}
                    {newSection && sectionHeader(section, continued)}
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-medium border border-gray-300">{farmer.username}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.fullName}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.mobile_number}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.milkType}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.rateChart}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.bankName || '-'}</TableCell>
                      <TableCell className="border border-gray-300">
                        <span className="inline-flex items-center gap-1.5">
                          {farmer.accountNumber || '-'}
                          {isBankVerified(farmer) && (
                            <BadgeCheck
                              className="w-4 h-4 text-emerald-600 shrink-0"
                              aria-label={t("verified", "Verified")}
                            >
                              <title>{[t("verified", "Verified"), farmer.bank_verified_by].filter(Boolean).join(" · ")}</title>
                            </BadgeCheck>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="border border-gray-300">{farmer.ifscCode || '-'}</TableCell>
                      <TableCell className="border border-gray-300 text-center">
                        {farmer.bankPassbookPhoto ? (
                          <a
                            href={farmer.bankPassbookPhoto}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {t("view", "View")}
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="border border-gray-300">
                        {(() => {
                          const id = String(farmerUserId(farmer));
                          const verified = isBankVerified(farmer);
                          const hasBank = !!String(farmer.accountNumber || '').trim() && !!String(farmer.ifscCode || '').trim();
                          const busy = busyId === id;
                          return (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing({ dairyId: section.branchId, farmerCode: String(farmer.username), fullName: farmer.fullName })}
                                className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                title={t("edit_farmer", "Edit Farmer")}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {verified ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => toggleVerification(section.branchId, farmer, false)}
                                  className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 gap-1"
                                >
                                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                                  {t("unverify", "Unverify")}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  disabled={busy || !hasBank}
                                  title={hasBank ? t("verify", "Verify") : t("bank_details_missing", "Bank details missing")}
                                  onClick={() => toggleVerification(section.branchId, farmer, true)}
                                  className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                >
                                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
                                  {t("verify", "Verify")}
                                </Button>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
              {isLastPage && trailingEmpties.map(emptySection)}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-gray-500">
                  {loading ? t("loading", "Loading...") : t("select_vlc_show_farmers", "Select VLC and click Show to view farmers")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > 0 && (
        <Pagination
          currentPage={page}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalItems={rows.length}
        />
      )}

      <FarmerEditModal
        farmer={editing}
        onClose={() => setEditing(null)}
        onSaved={() => editing && reloadSection(editing.dairyId)}
      />
    </div>
  );
};

export default FarmerList;
