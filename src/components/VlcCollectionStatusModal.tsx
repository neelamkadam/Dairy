import { useMemo, useState } from "react";
import { X, CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CollectionData } from "@/redux/dashboardSlice";

interface VlcCollectionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: CollectionData[];
  branches: Array<{ branch_id: number; name: string; username?: string; branchName?: string }>;
  date: string;
  shift: string;
}

type Tab = "collected" | "not_collected";

const VlcCollectionStatusModal = ({ isOpen, onClose, collections, branches, date, shift }: VlcCollectionStatusModalProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("collected");
  const [search, setSearch] = useState("");

  const { collected, notCollected } = useMemo(() => {
    const byDairy = new Map(collections.map(c => [c.dairy_id, c]));
    const rows = branches.map(b => ({ branch: b, data: byDairy.get(b.branch_id) }));
    return {
      collected: rows
        .filter(r => (r.data?.quantity || 0) > 0)
        .sort((a, b) => (b.data!.quantity - a.data!.quantity)),
      notCollected: rows.filter(r => !r.data || r.data.quantity <= 0),
    };
  }, [collections, branches]);

  if (!isOpen) return null;

  const term = search.trim().toLowerCase();
  const matches = (b: { name: string; username?: string; branchName?: string }) =>
    !term || [b.name, b.username, b.branchName].some(v => String(v || "").toLowerCase().includes(term));

  const vlcLabel = (b: { name: string; username?: string; branchName?: string }) =>
    [b.username, b.name, b.branchName].filter(Boolean).join(" - ");

  const rows = (tab === "collected" ? collected : notCollected).filter(r => matches(r.branch));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-white bg-opacity-95 rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col border-2 border-cyan-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">{t("vlcc_collection_status", "VLCC Collection Status")}</h2>
            <p className="text-sm text-gray-500">{date} · {shift}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 pt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("collected")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${tab === "collected" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {t("collected", "Collected")} ({collected.length})
            </button>
            <button
              onClick={() => setTab("not_collected")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${tab === "not_collected" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-700 border-red-200 hover:bg-red-50"}`}
            >
              <XCircle className="w-4 h-4" />
              {t("not_collected", "Not collected")} ({notCollected.length})
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search", "Search...")}
            className="sm:ml-auto w-full sm:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
          />
        </div>

        <div className="overflow-auto flex-1 p-4">
          {rows.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{t("no_data_found", "No data found")}</p>
          ) : tab === "collected" ? (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="border px-3 py-2 text-left">#</th>
                  <th className="border px-3 py-2 text-left">{t("vlcc_center", "VLCC Center")}</th>
                  <th className="border px-3 py-2 text-right">{t("quantity", "Quantity")} (L)</th>
                  <th className="border px-3 py-2 text-right">{t("fat", "FAT")}</th>
                  <th className="border px-3 py-2 text-right">{t("snf", "SNF")}</th>
                  <th className="border px-3 py-2 text-right">{t("amount", "Amount")}</th>
                  <th className="border px-3 py-2 text-right">{t("farmers", "Farmers")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ branch, data }, i) => (
                  <tr key={branch.branch_id} className="hover:bg-gray-50">
                    <td className="border px-3 py-2">{i + 1}</td>
                    <td className="border px-3 py-2">{vlcLabel(branch)}</td>
                    <td className="border px-3 py-2 text-right">{data!.quantity.toFixed(2)}</td>
                    <td className="border px-3 py-2 text-right">{data!.fat.toFixed(2)}</td>
                    <td className="border px-3 py-2 text-right">{data!.snf.toFixed(2)}</td>
                    <td className="border px-3 py-2 text-right">₹{data!.amount.toFixed(2)}</td>
                    <td className="border px-3 py-2 text-right">{data!.farmers} ({data!.registered_farmers})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="border px-3 py-2 text-left">#</th>
                  <th className="border px-3 py-2 text-left">{t("vlcc_center", "VLCC Center")}</th>
                  <th className="border px-3 py-2 text-right">{t("registered_farmers", "Registered Farmers")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ branch, data }, i) => (
                  <tr key={branch.branch_id} className="hover:bg-gray-50">
                    <td className="border px-3 py-2">{i + 1}</td>
                    <td className="border px-3 py-2">{vlcLabel(branch)}</td>
                    <td className="border px-3 py-2 text-right">{data?.registered_farmers ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default VlcCollectionStatusModal;
