import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAppSelector } from "@/redux/store";
import { vlcCommissionApi } from "@/services/vlcCommissionApi";
import { userApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { format, subDays } from "date-fns";
import { Search, History, ChevronDown, LayoutList, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommissionRecord {
  id: number;
  type: string;
  amount: string;
  effective_from: string;
}

interface FarmerRow {
  username: string;
  fullName: string;
  mobile_number?: string;
  milkType: string;
  // UI state
  commissionType: string;
  commissionAmount: string;
  effectiveDate: string;
  history: CommissionRecord[];
  historyOpen: boolean;
  historyLoading: boolean;
  saving: boolean;
  hasExisting: boolean; // true if pre-filled from API
}

interface SummaryRecord {
  id: number;
  farmer_id: string;
  farmer_name?: string;
  type: string;
  amount: string;
  effective_from: string;
}

const FarmerCommissionEntry = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [selectedVlc, setSelectedVlc] = useState("");
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [fetchingFarmers, setFetchingFarmers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Summary dialog
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<Record<string, SummaryRecord[]>>({});

  // Quick-apply state
  const [bulkType, setBulkType] = useState("per-liter");
  const [bulkAmount, setBulkAmount] = useState("");
  const [cowAmount, setCowAmount] = useState("");
  const [buffaloAmount, setBuffaloAmount] = useState("");
  const [bulkDate, setBulkDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (selectedVlc) {
      fetchFarmers();
    } else {
      setFarmers([]);
    }
  }, [selectedVlc]);

  const fetchFarmers = async () => {
    setFetchingFarmers(true);
    try {
      // Fetch farmers + existing commissions in parallel
      const [farmerData, commissionRes] = await Promise.allSettled([
        userApi.getFarmers(selectedVlc),
        vlcCommissionApi.getByVlcc(selectedVlc),
      ]);

      // Build a map: farmer_id → latest commission record
      const existingMap: Record<string, SummaryRecord> = {};
      const existingHistory: Record<string, SummaryRecord[]> = {};
      if (commissionRes.status === "fulfilled") {
        const records: SummaryRecord[] = commissionRes.value.data?.data ?? [];
        records.forEach((r) => {
          const key = r.farmer_id;
          if (!key) return;
          if (!existingHistory[key]) existingHistory[key] = [];
          existingHistory[key].push(r);
          // First occurrence = latest (API returns DESC)
          if (!existingMap[key]) existingMap[key] = r;
        });
      }

      if (
        farmerData.status === "fulfilled" &&
        farmerData.value.success &&
        Array.isArray(farmerData.value.data)
      ) {
        setFarmers(
          farmerData.value.data.map((f: any) => {
            const existing = existingMap[f.username];
            return {
              username: f.username,
              fullName: f.fullName,
              mobile_number: f.mobile_number,
              milkType: f.milkType,
              // Pre-fill from existing commission if available
              commissionType: existing
                ? existing.type === "Commission"
                  ? "per-liter"
                  : "fixed"
                : "per-liter",
              commissionAmount: existing
                ? parseFloat(existing.amount).toFixed(2)
                : "",
              effectiveDate: existing
                ? format(new Date(existing.effective_from), "yyyy-MM-dd")
                : format(new Date(), "yyyy-MM-dd"),
              history: existingHistory[f.username] ?? [],
              historyOpen: false,
              historyLoading: false,
              saving: false,
              hasExisting: !!existing,
            };
          })
        );
      } else {
        setFarmers([]);
      }
    } catch {
      toast.error("Failed to fetch farmers");
      setFarmers([]);
    } finally {
      setFetchingFarmers(false);
    }
  };

  // ─── Quick Apply ──────────────────────────────────────────────────────────
  const applyBulk = (milkTypeFilter: "All" | "Cow" | "Buffalo") => {
    const amount =
      milkTypeFilter === "All"
        ? bulkAmount
        : milkTypeFilter === "Cow"
        ? cowAmount
        : buffaloAmount;

    setFarmers((prev) =>
      prev.map((f) => {
        if (milkTypeFilter !== "All" && f.milkType !== milkTypeFilter) return f;
        return {
          ...f,
          commissionType: bulkType,
          commissionAmount: amount,
          effectiveDate: bulkDate,
        };
      })
    );
  };

  // ─── Per-row updaters ─────────────────────────────────────────────────────
  const updateFarmer = (username: string, patch: Partial<FarmerRow>) => {
    setFarmers((prev) =>
      prev.map((f) => (f.username === username ? { ...f, ...patch } : f))
    );
  };

  // ─── Fetch history for a single farmer ───────────────────────────────────
  const toggleHistory = async (farmer: FarmerRow) => {
    if (farmer.historyOpen) {
      updateFarmer(farmer.username, { historyOpen: false });
      return;
    }
    updateFarmer(farmer.username, { historyOpen: true, historyLoading: true });
    try {
      const res = await vlcCommissionApi.getByFarmer(selectedVlc, farmer.username);
      const records: CommissionRecord[] = res.data?.data ?? [];
      updateFarmer(farmer.username, { history: records, historyLoading: false });
    } catch {
      toast.error(`Failed to load history for ${farmer.username}`);
      updateFarmer(farmer.username, { historyLoading: false });
    }
  };

  // ─── Save single farmer ───────────────────────────────────────────────────
  const saveFarmer = async (farmer: FarmerRow) => {
    if (!farmer.commissionAmount || !farmer.effectiveDate) {
      toast.error("Enter amount and effective date before saving");
      return;
    }
    updateFarmer(farmer.username, { saving: true });
    try {
      const payload = {
        vlcc: selectedVlc,
        farmer_id: farmer.username,
        type: farmer.commissionType === "per-liter" ? "Commission" : "Fixed",
        amount: parseFloat(farmer.commissionAmount),
        effective_from: farmer.effectiveDate,
      };
      const res = await vlcCommissionApi.create(payload);
      if (res.data.success) {
        toast.success(`Commission saved for ${farmer.fullName}`);
        // Refresh history inline
        const histRes = await vlcCommissionApi.getByFarmer(selectedVlc, farmer.username);
        updateFarmer(farmer.username, {
          history: histRes.data?.data ?? [],
          historyOpen: true,
          commissionAmount: "",
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save commission");
    } finally {
      updateFarmer(farmer.username, { saving: false });
    }
  };

  // ─── Save ALL that have amounts filled ────────────────────────────────────
  const saveAll = async () => {
    const toSave = farmers.filter((f) => f.commissionAmount && parseFloat(f.commissionAmount) > 0);
    if (toSave.length === 0) {
      toast.error("No commission amounts filled in");
      return;
    }
    for (const f of toSave) {
      await saveFarmer(f);
    }
  };

  // ─── Filtered list ────────────────────────────────────────────────────────
  const filtered = farmers.filter(
    (f) =>
      f.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEntered = farmers.reduce(
    (s, f) => s + (parseFloat(f.commissionAmount) || 0),
    0
  );

  const fetchSummary = async () => {
    if (!selectedVlc) {
      toast.error("Please select a VLC first");
      return;
    }
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryData({});
    try {
      const res = await vlcCommissionApi.getByVlcc(selectedVlc);
      const records: SummaryRecord[] = res.data?.data ?? [];
      // Group by farmer_id
      const grouped: Record<string, SummaryRecord[]> = {};
      records.forEach((r) => {
        const key = r.farmer_id ?? "__vlc__";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
      });
      setSummaryData(grouped);
    } catch {
      toast.error("Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="w-full px-4 mx-auto space-y-4 mt-6 pb-10">
      <Card className="bg-white shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">
                Farmer Commission Entry
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Set per-farmer commission amounts for a billing period
              </p>
            </div>
            <Button
              onClick={fetchSummary}
              variant="outline"
              className="flex items-center gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <LayoutList className="w-4 h-4" />
              Summary
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6 text-left">
          {/* ── VLC selector ─────────────────────────────── */}
          <div className="max-w-sm">
            <Label className="mb-2 font-medium">
              VLC <span className="text-red-600">*</span>
            </Label>
            <Select value={selectedVlc} onValueChange={setSelectedVlc}>
              <SelectTrigger className="w-full bg-white border-gray-300 h-11">
                <SelectValue placeholder="Select VLC" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {branches?.map((branch) => (
                  <SelectItem
                    key={branch.branch_id}
                    value={branch.branch_id.toString()}
                  >
                    {branch.username} - {branch.name} - {branch.branchName || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVlc && farmers.length > 0 && (
            <>
              {/* ── Quick Apply ──────────────────────────── */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border-2 border-indigo-200 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Quick Apply to All / Cow / Buffalo</h3>

                {/* Type + date row */}
                <div className="flex flex-wrap gap-6 items-end">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Commission Type</Label>
                    <RadioGroup
                      value={bulkType}
                      onValueChange={setBulkType}
                      className="flex gap-4"
                    >
                      <Label
                        htmlFor="bulk-per-liter"
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer text-sm transition-all",
                          bulkType === "per-liter"
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        <RadioGroupItem value="per-liter" id="bulk-per-liter" />
                        Per Liter
                      </Label>
                      <Label
                        htmlFor="bulk-fixed"
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer text-sm transition-all",
                          bulkType === "fixed"
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        <RadioGroupItem value="fixed" id="bulk-fixed" />
                        Fixed
                      </Label>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Effective Date</Label>
                    <Input
                      type="date"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                      className="border-gray-300 bg-white h-10 w-44"
                    />
                  </div>
                </div>

                {/* Amount row */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[160px]">
                    <Label className="text-sm font-medium mb-2 block">All Farmers</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={bulkAmount}
                        onChange={(e) => setBulkAmount(e.target.value)}
                        className="border-gray-300 bg-white h-10"
                      />
                      <Button
                        size="sm"
                        onClick={() => applyBulk("All")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <Label className="text-sm font-medium mb-2 block">All Cow</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={cowAmount}
                        onChange={(e) => setCowAmount(e.target.value)}
                        className="border-gray-300 bg-white h-10"
                      />
                      <Button
                        size="sm"
                        onClick={() => applyBulk("Cow")}
                        className="bg-amber-500 hover:bg-amber-600 text-white whitespace-nowrap"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <Label className="text-sm font-medium mb-2 block">All Buffalo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={buffaloAmount}
                        onChange={(e) => setBuffaloAmount(e.target.value)}
                        className="border-gray-300 bg-white h-10"
                      />
                      <Button
                        size="sm"
                        onClick={() => applyBulk("Buffalo")}
                        className="bg-blue-500 hover:bg-blue-600 text-white whitespace-nowrap"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Search + summary ─────────────────────── */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search farmers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300"
                  />
                </div>
                <div className="flex items-center gap-3">
                  {totalEntered > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold px-4 py-2 rounded-lg">
                      Total: ₹{totalEntered.toFixed(2)}
                    </div>
                  )}
                  <Button
                    onClick={saveAll}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6"
                  >
                    Save All
                  </Button>
                </div>
              </div>

              {/* ── Per-farmer table ─────────────────────── */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <TableHead className="font-semibold text-gray-700">Farmer</TableHead>
                      <TableHead className="font-semibold text-gray-700">Milk</TableHead>
                      <TableHead className="font-semibold text-gray-700 w-36">Type</TableHead>
                      <TableHead className="font-semibold text-gray-700 w-36">Amount (₹)</TableHead>
                      <TableHead className="font-semibold text-gray-700 w-44">Effective Date</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          No farmers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((farmer) => (
                        <>
                          <TableRow
                            key={farmer.username}
                            className="hover:bg-gray-50 align-middle"
                          >
                            {/* Farmer name */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium text-gray-800 text-sm">{farmer.fullName}</p>
                                  <p className="text-xs text-gray-400">{farmer.username}</p>
                                </div>
                                {farmer.hasExisting && (
                                  <span className="text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                    ✓ Existing
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Milk type badge */}
                            <TableCell>
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  farmer.milkType === "Cow"
                                    ? "bg-amber-100 text-amber-700"
                                    : farmer.milkType === "Buffalo"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {farmer.milkType}
                              </span>
                            </TableCell>

                            {/* Commission type */}
                            <TableCell>
                              <Select
                                value={farmer.commissionType}
                                onValueChange={(v) =>
                                  updateFarmer(farmer.username, { commissionType: v })
                                }
                              >
                                <SelectTrigger className="h-9 border-gray-300 text-xs bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  <SelectItem value="per-liter">Per Liter</SelectItem>
                                  <SelectItem value="fixed">Fixed</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Amount */}
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={farmer.commissionAmount}
                                onChange={(e) =>
                                  updateFarmer(farmer.username, {
                                    commissionAmount: e.target.value,
                                  })
                                }
                                className="h-9 border-gray-300 text-sm text-right w-full"
                              />
                            </TableCell>

                            {/* Effective date */}
                            <TableCell>
                              <Input
                                type="date"
                                value={farmer.effectiveDate}
                                onChange={(e) =>
                                  updateFarmer(farmer.username, {
                                    effectiveDate: e.target.value,
                                  })
                                }
                                className="h-9 border-gray-300 text-sm w-full"
                              />
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => saveFarmer(farmer)}
                                  disabled={farmer.saving}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 h-8"
                                >
                                  {farmer.saving ? "..." : "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleHistory(farmer)}
                                  className="text-xs px-2 h-8 border-gray-300"
                                  title="View history"
                                >
                                  {farmer.historyOpen ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <History className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* History sub-row */}
                          {farmer.historyOpen && (
                            <TableRow key={`${farmer.username}-history`} className="bg-indigo-50/50">
                              <TableCell colSpan={6} className="py-3 px-6">
                                {farmer.historyLoading ? (
                                  <p className="text-sm text-gray-500">Loading history…</p>
                                ) : farmer.history.length === 0 ? (
                                  <p className="text-sm text-gray-400">No commission history found.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {farmer.history.map((h, idx) => {
                                      const isActive = idx === 0;
                                      const effectiveFrom = new Date(h.effective_from);
                                      const endDate =
                                        !isActive && farmer.history[idx - 1]
                                          ? subDays(
                                              new Date(farmer.history[idx - 1].effective_from),
                                              1
                                            )
                                          : null;
                                      return (
                                        <div
                                          key={h.id}
                                          className={cn(
                                            "text-xs rounded-lg border px-3 py-2 min-w-[160px]",
                                            isActive
                                              ? "border-green-300 bg-green-50"
                                              : "border-purple-200 bg-white"
                                          )}
                                        >
                                          {isActive && (
                                            <span className="block text-[10px] font-bold text-green-700 mb-1 uppercase tracking-wide">
                                              Active
                                            </span>
                                          )}
                                          <p className="font-semibold text-gray-700">
                                            {h.type === "Commission" ? "Per Liter" : "Fixed"} — ₹
                                            {parseFloat(h.amount).toFixed(2)}
                                          </p>
                                          <p className="text-gray-500 mt-0.5">
                                            {isActive
                                              ? `From ${format(effectiveFrom, "dd-MM-yyyy")}`
                                              : endDate
                                              ? `${format(effectiveFrom, "dd-MM-yyyy")} → ${format(endDate, "dd-MM-yyyy")}`
                                              : format(effectiveFrom, "dd-MM-yyyy")}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Empty states */}
          {selectedVlc && !fetchingFarmers && farmers.length === 0 && (
            <div className="text-center py-10 text-gray-500">No farmers found for this VLC</div>
          )}
          {fetchingFarmers && (
            <div className="text-center py-10 text-gray-400 animate-pulse">Loading farmers…</div>
          )}
          {!selectedVlc && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">💰</div>
              <p className="text-base font-medium">Select a VLC to load farmers</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Summary Dialog ───────────────────────────────── */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="bg-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">
              Farmer Commission Summary
            </DialogTitle>
            <p className="text-sm text-gray-500">
              All existing commissions for the selected VLC — farmer wise
            </p>
          </DialogHeader>

          {summaryLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading…
            </div>
          ) : Object.keys(summaryData).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm">No commissions found for this VLC</p>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {Object.entries(summaryData).map(([farmerId, records]) => {
                const latest = records[0];
                const isActive = (r: SummaryRecord) => r.id === latest.id;
                return (
                  <div
                    key={farmerId}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    {/* Farmer header */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2.5">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {latest.farmer_name || farmerId}
                        </p>
                        <p className="text-xs text-gray-400">{farmerId}</p>
                      </div>
                      {/* Active commission badge */}
                      <div className="text-right">
                        <span
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            latest.type === "Commission"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-purple-100 text-purple-700"
                          )}
                        >
                          {latest.type === "Commission" ? "Per Liter" : "Fixed"}
                        </span>
                        <p className="text-sm font-bold text-green-600 mt-0.5">
                          ₹{parseFloat(latest.amount).toFixed(2)}
                          <span className="text-xs font-normal text-gray-400 ml-1">
                            (active)
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* History rows */}
                    <div className="divide-y divide-gray-100">
                      {records.map((r, idx) => {
                        const effectiveFrom = new Date(r.effective_from);
                        const endDate =
                          idx > 0
                            ? subDays(new Date(records[idx - 1].effective_from), 1)
                            : null;
                        return (
                          <div
                            key={r.id}
                            className={cn(
                              "flex items-center justify-between px-4 py-2 text-xs",
                              idx === 0 ? "bg-green-50" : "bg-white"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {idx === 0 && (
                                <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  Active
                                </span>
                              )}
                              <span className="text-gray-600">
                                {r.type === "Commission" ? "Per Liter" : "Fixed"}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-800">
                              ₹{parseFloat(r.amount).toFixed(2)}
                            </span>
                            <span className="text-gray-400">
                              {idx === 0
                                ? `From ${format(effectiveFrom, "dd-MM-yyyy")}`
                                : endDate
                                ? `${format(effectiveFrom, "dd-MM-yyyy")} → ${format(endDate, "dd-MM-yyyy")}`
                                : format(effectiveFrom, "dd-MM-yyyy")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerCommissionEntry;
