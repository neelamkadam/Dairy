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
import { AlertTriangle, Download } from "lucide-react";
import Pagination from "@/components/Pagination";

// One selected dairy and its farmers.
interface DairySection {
  branchId: string;
  username: string;
  name: string;
  branchName: string;
  farmers: any[];
}

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

  const totalFarmers = sections.reduce((sum, s) => sum + s.farmers.length, 0);

  const handleExportPDF = () => {
    if (!sections.length) {
      toast.error(t("no_data_to_export", "No data to export"));
      return;
    }
    generateFarmerListPDFForDairies(
      sections.map((s) => ({ vlcName: s.name, dairyName: s.username, farmers: s.farmers }))
    );
    toast.success(t("pdf_exported_successfully", "PDF exported successfully"));
  };

  const handleExportExcel = () => {
    if (!sections.length) {
      toast.error(t("no_data_to_export", "No data to export"));
      return;
    }
    generateFarmerListExcelForDairies(
      sections.map((s) => ({ vlcName: `${s.username} - ${s.name}`, farmers: s.farmers }))
    );
    toast.success(t("excel_exported_successfully", "Excel exported successfully"));
  };

  // Every farmer in dairy order, so pagination runs straight through the dairies.
  // Only farmers are paged, so "of N" is the real farmer count.
  const rows = sections.flatMap((section) => section.farmers.map((farmer) => ({ section, farmer })));
  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * itemsPerPage;
  const currentRows = rows.slice(startIndex, startIndex + itemsPerPage);
  const isLastPage = page === totalPages;

  // Dairies with no farmers keep their place in the list: each is shown just
  // before the next dairy that has farmers, or after everything on the last page.
  const emptiesBefore = new Map<DairySection, DairySection[]>();
  let pendingEmpty: DairySection[] = [];
  sections.forEach((section) => {
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
      <TableCell colSpan={9} className="border border-gray-300 font-semibold text-blue-900">
        {section.username} - {section.name}
        {section.branchName ? ` · ${section.branchName}` : ""}
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
        <TableCell colSpan={9} className="border border-gray-300 text-center py-3 text-gray-500">
          {t("no_farmers_registered", "No farmers registered for this dairy")}
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
        <p className="mb-2 text-sm text-slate-600">
          {t("farmers_across_dairies", {
            farmers: totalFarmers,
            dairies: sections.length,
            defaultValue: "{{farmers}} farmers across {{dairies}} dairies",
          })}
        </p>
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
                  <Fragment key={`${section.branchId}-${farmer.id || farmer.username}`}>
                    {newSection && startsHere && emptiesBefore.get(section)?.map(emptySection)}
                    {newSection && sectionHeader(section, continued)}
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-medium border border-gray-300">{farmer.username}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.fullName}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.mobile_number}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.milkType}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.rateChart}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.bankName || '-'}</TableCell>
                      <TableCell className="border border-gray-300">{farmer.accountNumber || '-'}</TableCell>
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
                    </TableRow>
                  </Fragment>
                );
              })}
              {isLastPage && trailingEmpties.map(emptySection)}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-gray-500">
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
    </div>
  );
};

export default FarmerList;
