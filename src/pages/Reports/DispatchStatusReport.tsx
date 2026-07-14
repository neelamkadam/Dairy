import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AppDatePicker } from "@/components/ui/date-picker";
import { format, parseISO, isValid } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Truck, CheckCircle2, XCircle, Warehouse } from "lucide-react";
import { ccApi, bmcApi, routeApi } from "@/services/routeBmcCcApi";
import { cn } from "@/lib/utils";

const ALL = "all";

interface DispatchRow {
  id: number;
  username: string;
  name: string;
  villagename: string;
  ownername: string;
  dispatched: boolean;
}

// TODO: backend will mark each dairy as dispatched / not dispatched for the
// selected date + shift. Until then, derive a stable dummy status from the id.
const getDummyDispatched = (id: number, index: number): boolean =>
  (isNaN(id) ? index : id) % 3 !== 0;

const DispatchStatusReport: React.FC = () => {
  const authState = useAppSelector((state) => state.authData);
  const userId = authState?.userData?.id ? Number(authState.userData.id) : null;

  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 16 ? "evening" : "morning";
  };

  const [ccSel, setCcSel] = useState<string>("");
  const [bmcSel, setBmcSel] = useState<string>(ALL);
  const [routeSel, setRouteSel] = useState<string>(ALL);
  const [shift, setShift] = useState<string>(getDefaultShift());
  const [date, setDate] = useState<Date | undefined>(new Date());

  const [ccList, setCcList] = useState<any[]>([]);
  const [bmcList, setBmcList] = useState<any[]>([]);
  const [routeList, setRouteList] = useState<any[]>([]);

  const [rows, setRows] = useState<DispatchRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    ccApi.list(userId).then((r) => setCcList(r.data?.data ?? r.data ?? [])).catch(() => {});
    bmcApi.list(userId).then((r) => setBmcList(r.data?.data ?? r.data ?? [])).catch(() => {});
    routeApi.list(userId).then((r) => setRouteList(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, [userId]);

  // Cascade: BMC options belong to the selected CC, route options to the
  // selected BMC (or directly to the CC when no BMC is chosen).
  const filteredBmcs = ccSel
    ? bmcList.filter((b) => String(b.cc_id ?? "") === ccSel)
    : [];
  const filteredRoutes = ccSel
    ? routeList.filter((r) =>
        bmcSel !== ALL
          ? String(r.bmc_id ?? "") === bmcSel
          : String(r.cc_id ?? "") === ccSel || filteredBmcs.some((b) => String(b.bmc_id ?? b.id) === String(r.bmc_id ?? ""))
      )
    : [];

  const handleCcChange = (value: string) => {
    setCcSel(value);
    setBmcSel(ALL);
    setRouteSel(ALL);
  };

  const handleBmcChange = (value: string) => {
    setBmcSel(value);
    setRouteSel(ALL);
  };

  const loadVlcs = async () => {
    setLoading(true);
    try {
      // Fetch the dairies of the deepest selected level.
      let response;
      if (routeSel !== ALL) {
        response = await routeApi.getVlcs(Number(routeSel));
      } else if (bmcSel !== ALL) {
        response = await bmcApi.vlcs(Number(bmcSel));
      } else {
        response = await ccApi.vlcs(Number(ccSel));
      }
      const vlcs = response.data?.data ?? response.data ?? [];
      if (!Array.isArray(vlcs) || vlcs.length === 0) {
        setRows([]);
        return;
      }
      const mapped: DispatchRow[] = vlcs.map((v: any, i: number) => {
        const id = Number(v.vlc_id ?? v.branch_id ?? v.id);
        return {
          id,
          username: String(v.username ?? id ?? "-"),
          name: v.name ?? v.branchName ?? "-",
          villagename: v.villagename ?? v.branchName ?? "-",
          ownername: v.ownername ?? "-",
          dispatched: getDummyDispatched(id, i),
        };
      });
      setRows(mapped);
    } catch (error: any) {
      console.error("Failed to fetch dispatch status:", error);
      toast.error(error?.response?.data?.message || "Failed to fetch dispatch status");
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load the VLC list whenever the CC / BMC / Route selection changes.
  useEffect(() => {
    if (!ccSel) {
      setRows(null);
      return;
    }
    loadVlcs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ccSel, bmcSel, routeSel]);

  const fetchDispatchStatus = async () => {
    if (!ccSel) {
      toast.error("Please select a CC");
      return;
    }
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    await loadVlcs();
  };

  const dispatchedCount = rows?.filter((r) => r.dispatched).length ?? 0;
  const pendingCount = rows ? rows.length - dispatchedCount : 0;

  const selectedCc = ccList.find((c) => String(c.cc_id ?? c.id) === ccSel);
  const selectedBmc = filteredBmcs.find((b) => String(b.bmc_id ?? b.id) === bmcSel);
  const selectedRoute = filteredRoutes.find((r) => String(r.route_id ?? r.id) === routeSel);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-700 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded">
              <Truck className="h-6 w-6 text-slate-700" />
            </div>
            <h1 className="text-xl md:text-2xl font-semibold">
              Dispatch Status Report
            </h1>
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="text-left grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Chilling Center (CC)
            </label>
            <Select value={ccSel} onValueChange={handleCcChange}>
              <SelectTrigger className="w-full bg-white border-gray-200">
                <SelectValue placeholder="Select CC" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {ccList.map((cc) => (
                  <SelectItem key={cc.cc_id ?? cc.id} value={String(cc.cc_id ?? cc.id)}>
                    {cc.cc_id ?? cc.id} - {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              BMC
            </label>
            <Select value={bmcSel} onValueChange={handleBmcChange} disabled={!ccSel}>
              <SelectTrigger className="w-full bg-white border-gray-200">
                <SelectValue placeholder="Select BMC" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value={ALL}>All BMCs</SelectItem>
                {filteredBmcs.map((bmc) => (
                  <SelectItem key={bmc.bmc_id ?? bmc.id} value={String(bmc.bmc_id ?? bmc.id)}>
                    {bmc.bmc_id ?? bmc.id} - {bmc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Route
            </label>
            <Select
              value={routeSel}
              onValueChange={setRouteSel}
              disabled={!ccSel}
            >
              <SelectTrigger className="w-full bg-white border-gray-200">
                <SelectValue placeholder="Select Route" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value={ALL}>All Routes</SelectItem>
                {filteredRoutes.map((route) => (
                  <SelectItem key={route.route_id ?? route.id} value={String(route.route_id ?? route.id)}>
                    {route.route_id ?? route.id} - {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mt-5">
          <div className="space-y-2 text-left">
            <Label>Date</Label>
            <AppDatePicker
              date={date}
              onChange={(dateStr) => {
                const parsed = parseISO(dateStr);
                if (isValid(parsed)) setDate(parsed);
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Shift Type
            </label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger className="w-full bg-white border-gray-200">
                <SelectValue placeholder="Select Shift" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <Button
            onClick={fetchDispatchStatus}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Loading..." : "Show"}
          </Button>
        </div>
      </div>

      {rows !== null && (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
              <Warehouse className="h-8 w-8 text-slate-600" />
              <div>
                <p className="text-sm text-gray-600">Total Dairies</p>
                <p className="text-2xl font-bold text-gray-800">{rows.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Dispatched</p>
                <p className="text-2xl font-bold text-green-700">{dispatchedCount}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Not Dispatched</p>
                <p className="text-2xl font-bold text-red-700">{pendingCount}</p>
              </div>
            </div>
          </div>

          {/* Report table */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-4">
              {selectedCc ? `CC: ${selectedCc.name}` : ""}
              {selectedBmc ? ` | BMC: ${selectedBmc.name}` : " | BMC: All"}
              {selectedRoute ? ` | Route: ${selectedRoute.name}` : " | Route: All"}
              {date ? ` | Date: ${format(date, "dd-MM-yyyy")}` : ""}
              {` | Shift: ${shift}`}
            </p>
            <Table className="border-none text-center">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold text-center border border-gray-100">
                    Dairy ID
                  </TableHead>
                  <TableHead className="font-semibold text-center border border-gray-100">
                    Dairy Name
                  </TableHead>
                  <TableHead className="font-semibold text-center border border-gray-100">
                    Village
                  </TableHead>
                  <TableHead className="font-semibold text-center border border-gray-100">
                    Owner
                  </TableHead>
                  <TableHead className="font-semibold text-center border border-gray-100">
                    Dispatch Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? rows.map((row, index) => (
                  <TableRow
                    key={`${row.id}-${index}`}
                    className="hover:bg-gray-50 bg-white border-gray-100"
                  >
                    <TableCell className="font-medium border border-gray-100">{row.username}</TableCell>
                    <TableCell className="font-medium border border-gray-100 text-left">{row.name}</TableCell>
                    <TableCell className="font-medium border border-gray-100">{row.villagename}</TableCell>
                    <TableCell className="font-medium border border-gray-100">{row.ownername}</TableCell>
                    <TableCell className="font-medium border border-gray-100">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                        row.dispatched
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}>
                        {row.dispatched
                          ? <><CheckCircle2 className="h-3.5 w-3.5" /> Dispatched</>
                          : <><XCircle className="h-3.5 w-3.5" /> Not Dispatched</>}
                      </span>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No dairies found for the selected criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {rows === null && (
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            Select a CC (and optionally BMC and Route) to see which dairies have dispatched their collection.
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchStatusReport;
