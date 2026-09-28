import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { format, isValid } from "date-fns";
import * as XLSX from "xlsx";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  DatabaseZap,
  Droplets,
  FileSpreadsheet,
  Filter,
  IndianRupee,
  Loader2,
  Route as RouteIcon,
  Search,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useAppSelector } from "@/redux/store";
import { usePostApi } from "@/services/use-api";
import { routeApi } from "@/services/routeBmcCcApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface RouteVlc {
  dairy_id: number;
  name: string;
  branchname?: string;
}

interface RouteRecord {
  id: number;
  route_id?: number;
  name: string;
  villagename?: string;
  bmc_name?: string | null;
  cc_name?: string | null;
  vlcs: RouteVlc[];
}

interface Totals {
  milk: number;
  fat: number;
  snf: number;
  amount: number;
  rate: number;
  milkTypes: string[];
}

const num = (v: unknown) => parseFloat(String(v ?? "")) || 0;

// Quantity-weighted FAT / SNF, amount ÷ litres for the rate — same as VLC Collection.
const totalsOf = (entries: any[]): Totals => {
  const milk = entries.reduce((s, e) => s + num(e.quantity), 0);
  const fatQty = entries.reduce((s, e) => s + num(e.fat) * num(e.quantity), 0);
  const snfQty = entries.reduce((s, e) => s + num(e.snf) * num(e.quantity), 0);
  const amount = entries.reduce((s, e) => s + num(e.amount), 0);
  return {
    milk,
    fat: milk > 0 ? fatQty / milk : 0,
    snf: milk > 0 ? snfQty / milk : 0,
    amount,
    rate: milk > 0 ? amount / milk : 0,
    milkTypes: [...new Set(entries.map((e) => e.type).filter(Boolean))] as string[],
  };
};

// Current 10-day bill period: 1–10, 11–20, 21–end of month.
const getDateRangeForPeriod = (date: Date) => {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();
  if (day <= 10) return { from: new Date(year, month, 1), to: new Date(year, month, 10) };
  if (day <= 20) return { from: new Date(year, month, 11), to: new Date(year, month, 20) };
  return { from: new Date(year, month, 21), to: new Date(year, month + 1, 0) };
};

const routeIdOf = (r: RouteRecord) => Number(r.route_id ?? r.id);

const RouteCollection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { branches } = useAppSelector((state) => state.branch);
  const userId = useAppSelector((state) => state.authData.userData?.id);
  const { postData, isLoading } = usePostApi({ path: "/web/dashboard/farmer-collections" });

  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedRoutes, setSelectedRoutes] = useState<number[]>([]);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const initialRange = getDateRangeForPeriod(new Date());
  const [fromDate, setFromDate] = useState<Date>(initialRange.from);
  const [toDate, setToDate] = useState<Date>(initialRange.to);
  const [entries, setEntries] = useState<any[]>([]);
  const [appliedRouteIds, setAppliedRouteIds] = useState<number[]>([]);
  const [hasApplied, setHasApplied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const branchById = useMemo(() => new Map((branches || []).map((b) => [Number(b.branch_id), b])), [branches]);

  // Routes with their VLCs, limited to the VLCs this user can see.
  useEffect(() => {
    if (!userId) return;
    setRoutesLoading(true);
    routeApi
      .list(Number(userId))
      .then((res: any) => {
        const list: RouteRecord[] = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        setRoutes(
          list
            .map((r) => ({ ...r, vlcs: (r.vlcs || []).filter((v) => branchById.has(Number(v.dairy_id))) }))
            .filter((r) => r.vlcs.length > 0)
        );
      })
      .catch(() => toast.error(t("failed_to_load_routes", "Failed to load routes")))
      .finally(() => setRoutesLoading(false));
  }, [userId, branchById, t]);

  const routeById = useMemo(() => new Map(routes.map((r) => [routeIdOf(r), r])), [routes]);

  const toggleRoute = (id: number) =>
    setSelectedRoutes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleApply = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select both from and to dates");
      return;
    }
    if (selectedRoutes.length === 0) {
      toast.error(t("please_select_route", "Please select at least one Route"));
      return;
    }
    const dairyIds = [
      ...new Set(selectedRoutes.flatMap((id) => (routeById.get(id)?.vlcs || []).map((v) => Number(v.dairy_id)))),
    ];
    try {
      const response = await postData({
        branches: dairyIds,
        type: selectedType === "all" ? "All" : selectedType.charAt(0).toUpperCase() + selectedType.slice(1),
        shift: selectedShift === "all" ? "All" : selectedShift.charAt(0).toUpperCase() + selectedShift.slice(1),
        from_date: format(fromDate, "yyyy-MM-dd"),
        to_date: format(toDate, "yyyy-MM-dd"),
      });
      if (response?.data?.success) {
        setEntries(response.data.data || []);
        setAppliedRouteIds([...selectedRoutes]);
        setExpanded(new Set());
        setHasApplied(true);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch data");
    }
  };

  // One row per applied route, with its VLCs' totals underneath.
  const routeRows = useMemo(() => {
    const byDairy = new Map<number, any[]>();
    entries.forEach((e) => {
      const id = Number(e.dairy_id);
      if (!byDairy.has(id)) byDairy.set(id, []);
      byDairy.get(id)!.push(e);
    });
    return appliedRouteIds
      .map((id) => routeById.get(id))
      .filter((r): r is RouteRecord => !!r)
      .map((route) => {
        const vlcRows = route.vlcs.map((v) => {
          const vlcEntries = byDairy.get(Number(v.dairy_id)) || [];
          const branch = branchById.get(Number(v.dairy_id));
          return {
            dairyId: Number(v.dairy_id),
            vlcId: branch?.username || String(v.dairy_id),
            name: branch?.name || v.name,
            branchName: branch?.branchName || v.branchname || "",
            totals: totalsOf(vlcEntries),
            collected: vlcEntries.length > 0,
          };
        });
        const routeEntries = route.vlcs.flatMap((v) => byDairy.get(Number(v.dairy_id)) || []);
        return {
          route,
          vlcRows,
          totals: totalsOf(routeEntries),
          collectedCount: vlcRows.filter((v) => v.collected).length,
        };
      });
  }, [entries, appliedRouteIds, routeById, branchById]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return routeRows;
    return routeRows.filter(({ route, vlcRows }) =>
      [String(routeIdOf(route)), route.name, route.villagename, route.bmc_name, route.cc_name]
        .some((v) => String(v || "").toLowerCase().includes(q)) ||
      vlcRows.some((v) => [v.vlcId, v.name, v.branchName].some((x) => String(x || "").toLowerCase().includes(q)))
    );
  }, [routeRows, searchQuery]);

  const overall = totalsOf(entries);
  const vlcCount = routeRows.reduce((s, r) => s + r.vlcRows.length, 0);

  const toggleExpanded = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleExportToExcel = () => {
    const rows: Record<string, string | number>[] = [];
    filteredRows.forEach(({ route, vlcRows, totals, collectedCount }) => {
      const base = (label: Record<string, string | number>, x: Totals) => ({
        ...label,
        "Total Milk (Ltr)": Number(x.milk.toFixed(2)),
        "Total Milk (Kg)": Number((x.milk * 1.03).toFixed(2)),
        "Average FAT (%)": Number(x.fat.toFixed(2)),
        "Average SNF (%)": Number(x.snf.toFixed(2)),
        "Average Rate (₹)": Number(x.rate.toFixed(2)),
        "Total Amount (₹)": Number(x.amount.toFixed(2)),
        "Milk Type": x.milkTypes.join(", "),
      });
      rows.push(
        base(
          {
            "Route ID": routeIdOf(route),
            "Route Name": route.name,
            "BMC / CC": [route.bmc_name, route.cc_name].filter(Boolean).join(" / "),
            "VLC ID": `${collectedCount} / ${vlcRows.length} VLCs`,
            "VLC Name": "",
          },
          totals
        )
      );
      vlcRows.forEach((v) =>
        rows.push(
          base(
            {
              "Route ID": routeIdOf(route),
              "Route Name": route.name,
              "BMC / CC": "",
              "VLC ID": v.vlcId,
              "VLC Name": [v.name, v.branchName].filter(Boolean).join(" - "),
            },
            v.totals
          )
        )
      );
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Route Collection");
    XLSX.writeFile(wb, `Route_Collection_${format(fromDate, "dd-MM-yyyy")}_to_${format(toDate, "dd-MM-yyyy")}.xlsx`);
    toast.success("Excel file exported successfully");
  };

  const stats = [
    { label: t("routes", "Routes"), value: String(routeRows.length), icon: Truck, gradient: "from-blue-100 to-blue-50", border: "border-blue-200", accent: "border-l-blue-500", text: "text-blue-700", bg: "bg-blue-200" },
    { label: t("vlcc_center"), value: String(vlcCount), icon: RouteIcon, gradient: "from-cyan-100 to-cyan-50", border: "border-cyan-200", accent: "border-l-cyan-500", text: "text-cyan-700", bg: "bg-cyan-200" },
    { label: t("total_milk_collection"), value: `${overall.milk.toFixed(1)}L`, icon: Droplets, gradient: "from-emerald-100 to-emerald-50", border: "border-emerald-200", accent: "border-l-emerald-500", text: "text-emerald-700", bg: "bg-emerald-200" },
    { label: t("average_fat"), value: `${overall.fat.toFixed(2)}%`, icon: BarChart3, gradient: "from-violet-100 to-violet-50", border: "border-violet-200", accent: "border-l-violet-500", text: "text-violet-700", bg: "bg-violet-200" },
    { label: t("average_snf"), value: `${overall.snf.toFixed(2)}%`, icon: TrendingUp, gradient: "from-amber-100 to-amber-50", border: "border-amber-200", accent: "border-l-amber-500", text: "text-amber-700", bg: "bg-amber-200" },
    { label: t("total_payments"), value: `₹${overall.amount.toFixed(2)}`, icon: IndianRupee, gradient: "from-teal-100 to-teal-50", border: "border-teal-200", accent: "border-l-teal-500", text: "text-teal-700", bg: "bg-teal-200" },
  ];

  const metricCells = (x: Totals, strong = false) => (
    <>
      <TableCell className="px-4 py-3 text-sm text-slate-600">
        <span className={strong ? "font-semibold" : "font-medium"}>{x.milk.toFixed(2)}</span>
        <span className="text-slate-400 text-xs ml-1">Ltr</span>
      </TableCell>
      <TableCell className="px-4 py-3 text-sm">
        <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md text-xs font-medium">{x.fat.toFixed(2)}%</span>
      </TableCell>
      <TableCell className="px-4 py-3 text-sm">
        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-xs font-medium">{x.snf.toFixed(2)}%</span>
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-slate-600">₹{x.rate.toFixed(2)}</TableCell>
      <TableCell className={cn("px-4 py-3 text-sm text-slate-800", strong ? "font-bold" : "font-semibold")}>₹{x.amount.toFixed(2)}</TableCell>
      <TableCell className="px-4 py-3 text-sm text-slate-600">{x.milkTypes.join(", ") || "-"}</TableCell>
    </>
  );

  const dropdownRoutes = routes.filter((r) => {
    const q = dropdownSearch.trim().toLowerCase();
    return !q || [String(routeIdOf(r)), r.name, r.villagename, r.bmc_name, r.cc_name].some((v) => String(v || "").toLowerCase().includes(q));
  });

  return (
    <div className="space-y-5 bg-slate-50/50 min-h-screen p-4 md:p-6 min-w-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
              {t("route_collection", "Route Collection")}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              {`${format(fromDate, "dd MMM yyyy")} — ${format(toDate, "dd MMM yyyy")}`}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "relative overflow-hidden bg-gradient-to-br rounded-xl border border-l-4 p-4 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default",
              stat.gradient,
              stat.border,
              stat.accent
            )}
          >
            <div className={cn("absolute -right-3 -top-3 w-14 h-14 rounded-full opacity-20 transition-transform group-hover:scale-150 duration-700", stat.bg)} />
            <div className="relative z-10 flex items-start justify-between mb-2 gap-2">
              <p className="text-slate-600 text-xs font-semibold tracking-wide uppercase line-clamp-2">{stat.label}</p>
              <div className={cn("p-1.5 rounded-lg bg-opacity-60 shadow-sm shrink-0", stat.bg)}>
                <stat.icon className={cn("h-3.5 w-3.5", stat.text)} />
              </div>
            </div>
            <p className="relative z-10 text-xl md:text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border border-slate-200/80 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardHeader
          className="border-b border-slate-100 bg-slate-50/50 py-3 px-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Filter className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-700">{t("filter_options")}</CardTitle>
            </div>
            <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isFiltersExpanded && "rotate-90")} />
          </div>
        </CardHeader>

        <div className={cn("transition-all duration-300 ease-in-out overflow-hidden", isFiltersExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0")}>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Route multi-select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t("route", "Route")}</Label>
                <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-gray-50 border-gray-200">
                      {routesLoading
                        ? t("loading")
                        : selectedRoutes.length === 0
                          ? t("select_routes", "Select Routes")
                          : `${selectedRoutes.length} Route(s) selected`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0 bg-white" align="start">
                    <div className="p-2 border-b flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() =>
                          setSelectedRoutes(selectedRoutes.length === routes.length ? [] : routes.map(routeIdOf))
                        }
                      >
                        {selectedRoutes.length === routes.length && routes.length > 0 ? "Deselect All" : "Select All"}
                      </Button>
                      {selectedRoutes.length > 0 && (
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setSelectedRoutes([])}>
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="p-2 border-b">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                          value={dropdownSearch}
                          onChange={(e) => setDropdownSearch(e.target.value)}
                          placeholder="Search Route..."
                          className="flex-1 bg-transparent outline-none text-sm text-gray-700"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {dropdownRoutes.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          {routesLoading ? t("loading") : t("no_routes_found", "No routes found")}
                        </p>
                      ) : (
                        dropdownRoutes.map((r) => {
                          const id = routeIdOf(r);
                          return (
                            <div
                              key={id}
                              className="flex items-start space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                              onClick={() => toggleRoute(id)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedRoutes.includes(id)}
                                onChange={() => toggleRoute(id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 mt-0.5"
                              />
                              <div className="min-w-0">
                                <p className="text-sm text-gray-800">{id} - {r.name}</p>
                                <p className="text-xs text-gray-500">
                                  {[r.bmc_name, r.cc_name].filter(Boolean).join(" / ") || "-"} · {r.vlcs.length} VLCs
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Milk Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t("milk_type")}</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full bg-white border-slate-200 hover:border-blue-300 transition-all rounded-lg h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                    <SelectItem value="all">{t("all")}</SelectItem>
                    <SelectItem value="cow">{t("cow")}</SelectItem>
                    <SelectItem value="buffalo">{t("buffalo")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Shift */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t("shift")}</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="w-full bg-white border-slate-200 hover:border-blue-300 transition-all rounded-lg h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                    <SelectItem value="all">{t("all")}</SelectItem>
                    <SelectItem value="morning">{t("morning")}</SelectItem>
                    <SelectItem value="evening">{t("evening")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date range + Apply */}
            <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t("from_date")}</Label>
                  <Input
                    type="date"
                    value={format(fromDate, "yyyy-MM-dd")}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (!isValid(d)) return;
                      setFromDate(d);
                      setToDate(getDateRangeForPeriod(d).to);
                    }}
                    className="bg-white border-slate-200 hover:border-blue-300 transition-all rounded-lg h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t("to_date")}</Label>
                  <Input
                    type="date"
                    value={format(toDate, "yyyy-MM-dd")}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (isValid(d)) setToDate(d);
                    }}
                    className="bg-white border-slate-200 hover:border-blue-300 transition-all rounded-lg h-10"
                  />
                </div>
              </div>
              <Button
                onClick={handleApply}
                disabled={isLoading}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 h-10 rounded-lg shadow-md shadow-blue-500/20 font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("loading")}
                  </>
                ) : (
                  t("apply")
                )}
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Route table */}
      <Card className="border border-slate-200/80 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white py-3 px-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <DatabaseZap className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-700">{t("route_list", "Route List")}</CardTitle>
              {filteredRows.length > 0 && (
                <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 text-xs font-medium px-2 py-0.5 rounded-md">
                  {filteredRows.length}
                </Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center w-full sm:w-auto min-w-0">
              <div className="relative w-full sm:w-auto flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder={t("search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-56 bg-slate-50 border-slate-200 rounded-lg h-9 text-sm focus:bg-white"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleExportToExcel}
                disabled={filteredRows.length === 0}
                className="w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-2 rounded-lg h-9 text-sm font-medium disabled:opacity-40"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {t("export")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-100">
                  {[
                    t("route_id", "Route ID"),
                    t("route_name", "Route Name"),
                    "BMC / CC",
                    t("vlcs", "VLCs"),
                    t("total_milk_ltr"),
                    t("average_fat"),
                    t("average_snf"),
                    t("average_rate"),
                    t("total_amount"),
                    t("milk_type"),
                  ].map((h) => (
                    <TableHead key={h} className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-48">
                      <div className="flex flex-col items-center justify-center text-center py-8">
                        <div className="p-4 bg-slate-100 rounded-2xl mb-3">
                          <Droplets className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                          {!hasApplied ? "Apply filters to view route collection data" : searchQuery ? "No results match your search" : "No data found for selected filters"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {!hasApplied ? "Select routes and date range, then click Apply" : "Try adjusting your filter criteria"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map(({ route, vlcRows, totals, collectedCount }) => {
                    const id = routeIdOf(route);
                    const open = expanded.has(id);
                    return (
                      <Fragment key={id}>
                        <TableRow
                          className="hover:bg-blue-50/50 transition-colors cursor-pointer border-b border-slate-100"
                          onClick={() => toggleExpanded(id)}
                        >
                          <TableCell className="font-semibold text-blue-600 px-4 py-3 text-sm whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              {id}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-slate-800 font-semibold">
                            {route.name}
                            {route.villagename && <span className="block text-xs font-normal text-slate-500">{route.villagename}</span>}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-slate-600">
                            {[route.bmc_name, route.cc_name].filter(Boolean).join(" / ") || "-"}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            <span className="font-medium text-emerald-700">{collectedCount}</span> / {vlcRows.length}
                          </TableCell>
                          {metricCells(totals, true)}
                        </TableRow>
                        {open &&
                          vlcRows.map((v) => (
                            <TableRow
                              key={`${id}-${v.dairyId}`}
                              className="bg-slate-50/60 hover:bg-blue-50/40 cursor-pointer border-b border-slate-50"
                              onClick={() =>
                                navigate("/dashboard/farmer-management", {
                                  state: { dairyId: v.dairyId, fromDate, toDate, selectedType, selectedShift },
                                })
                              }
                            >
                              <TableCell className="px-4 py-2 pl-10 text-sm text-blue-600 font-medium">{v.vlcId}</TableCell>
                              <TableCell className="px-4 py-2 text-sm text-slate-700" colSpan={2}>
                                {[v.name, v.branchName].filter(Boolean).join(" - ")}
                              </TableCell>
                              <TableCell className="px-4 py-2 text-sm">
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", v.collected ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                  {v.collected ? t("collected", "Collected") : t("not_collected", "Not collected")}
                                </span>
                              </TableCell>
                              {metricCells(v.totals)}
                            </TableRow>
                          ))}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteCollection;
