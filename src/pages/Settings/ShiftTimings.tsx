import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { shiftTimingApi } from "@/services/shiftTimingApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, RefreshCw, Sun, Moon, Snowflake, Warehouse, Route as RouteIcon, ListChecks, Save } from "lucide-react";
import { ccApi, bmcApi, routeApi } from "@/services/routeBmcCcApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ShiftWindow {
  restricted: boolean;
  start: string; // "HH:mm"
  end: string;
}

const EMPTY_WINDOW: ShiftWindow = { restricted: false, start: "", end: "" };

// Times may arrive as "HH:mm" or "HH:mm:ss" — keep "HH:mm" for the inputs.
const toHHmm = (value: any): string =>
  value ? String(value).slice(0, 5) : "";

// The status response shape can vary — dig out a shift's window defensively.
const pickWindow = (data: any, shift: "morning" | "evening"): ShiftWindow => {
  const cap = shift.charAt(0).toUpperCase() + shift.slice(1);
  const nested =
    data?.shifts?.[cap] ?? data?.shifts?.[shift] ?? data?.windows?.[cap] ?? data?.windows?.[shift];
  const start = toHHmm(data?.[`${shift}_start`] ?? nested?.start);
  const end = toHHmm(data?.[`${shift}_end`] ?? nested?.end);
  return { restricted: !!(start && end), start, end };
};

const ShiftTimings = () => {
  const { t } = useTranslation();
  const authState = useAppSelector((state) => state.authData);
  const userId = authState?.userData?.id ? Number(authState.userData.id) : null;

  const [morning, setMorning] = useState<ShiftWindow>(EMPTY_WINDOW);
  const [evening, setEvening] = useState<ShiftWindow>(EMPTY_WINDOW);
  const [serverTime, setServerTime] = useState<string>("");
  const [allowedShifts, setAllowedShifts] = useState<string[]>([]);
  const [entryAllowed, setEntryAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { branches } = useAppSelector((state) => state.branch);

  const [ccSel, setCcSel] = useState<string>("none");
  const [bmcSel, setBmcSel] = useState<string>("none");
  const [routeSel, setRouteSel] = useState<string>("none");
  const [ccList, setCcList] = useState<any[]>([]);
  const [bmcList, setBmcList] = useState<any[]>([]);
  const [routeList, setRouteList] = useState<any[]>([]);

  const [availableVlcs, setAvailableVlcs] = useState<any[]>([]);
  const [selectedVlcs, setSelectedVlcs] = useState<number[]>([]);
  const [isVlcDropdownOpen, setIsVlcDropdownOpen] = useState(false);

  // Load saved config (form population) from GET /web/shift-timings/get/:userId
  const loadConfig = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await shiftTimingApi.getTimings(userId);
      const config = response?.data?.data;
      if (config) {
        const ms = toHHmm(config.morning_start);
        const me = toHHmm(config.morning_end);
        setMorning({ restricted: !!(ms && me), start: ms, end: me });
        const es = toHHmm(config.evening_start);
        const ee = toHHmm(config.evening_end);
        setEvening({ restricted: !!(es && ee), start: es, end: ee });
      }
      // null data = no config = everything works always
    } catch (error) {
      console.error("Failed to load shift timing config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load live status banner from GET /web/shift-timings/status/:userId
  const loadStatus = async () => {
    if (!userId) return;
    try {
      const response = await shiftTimingApi.getStatus(userId);
      const data = response?.data?.data ?? response?.data ?? {};
      setServerTime(
        data?.current_time ?? data?.server_time ?? data?.ist_time ?? data?.now ?? ""
      );
      setAllowedShifts(Array.isArray(data?.allowed_shifts) ? data.allowed_shifts : []);
      setEntryAllowed(
        typeof data?.entry_allowed === "boolean" ? data.entry_allowed : null
      );
    } catch (error) {
      console.error("Failed to load shift timing status:", error);
    }
  };

  useEffect(() => {
    loadConfig();
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    ccApi.list(userId).then((r) => setCcList(r.data?.data ?? r.data ?? [])).catch(() => {});
    bmcApi.list(userId).then((r) => setBmcList(r.data?.data ?? r.data ?? [])).catch(() => {});
    routeApi.list(userId).then((r) => setRouteList(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, [userId]);

  useEffect(() => {
    const loadVlcs = async () => {
      let vlcs: any[] = [];
      try {
        if (routeSel !== "none") {
          const r = await routeApi.getVlcs(Number(routeSel));
          vlcs = r.data?.data ?? r.data ?? [];
        } else if (bmcSel !== "none") {
          const r = await bmcApi.vlcs(Number(bmcSel));
          vlcs = r.data?.data ?? r.data ?? [];
        } else if (ccSel !== "none") {
          const r = await ccApi.vlcs(Number(ccSel));
          vlcs = r.data?.data ?? r.data ?? [];
        } else {
          vlcs = branches || [];
        }
      } catch (err) {
        console.error("Failed to load VLCs for selection", err);
      }
      setAvailableVlcs(vlcs);
      setSelectedVlcs([]);
    }
    loadVlcs();
  }, [ccSel, bmcSel, routeSel, branches]);

  const toggleVlc = (id: number) => {
    setSelectedVlcs(prev => prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]);
  };

  const toggleSelectAllVlcs = () => {
    if (selectedVlcs.length === availableVlcs.length) {
      setSelectedVlcs([]);
    } else {
      setSelectedVlcs(availableVlcs.map(v => Number(v.vlc_id ?? v.branch_id ?? v.id)).filter(id => !isNaN(id)));
    }
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error(t("user_not_found", "User not found"));
      return;
    }
    if (morning.restricted && (!morning.start || !morning.end)) {
      toast.error(t("morning_shift_needs_both_start_and_end_time", "Morning shift needs both start and end time"));
      return;
    }
    if (evening.restricted && (!evening.start || !evening.end)) {
      toast.error(t("evening_shift_needs_both_start_and_end_time", "Evening shift needs both start and end time"));
      return;
    }
    if (selectedVlcs.length === 0) {
      toast.error(t("please_select_at_least_one_target_vlc_to_apply_shift_timings", "Please select at least one Target VLC to apply shift timings"));
      return;
    }

    setIsSaving(true);
    try {
      const response = await shiftTimingApi.setTimings({
        adminId: userId,
        morning_start: morning.restricted ? morning.start : null,
        morning_end: morning.restricted ? morning.end : null,
        evening_start: evening.restricted ? evening.start : null,
        evening_end: evening.restricted ? evening.end : null,
        vlcIds: selectedVlcs,
      });
      if (response?.data?.success === false) {
        toast.error(response?.data?.message || t("failed_to_save_shift_timings", "Failed to save shift timings"));
        return;
      }
      toast.success(response?.data?.message || t("shift_timings_saved_successfully", "Shift timings saved successfully"));
      loadStatus();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_to_save_shift_timings", "Failed to save shift timings"));
    } finally {
      setIsSaving(false);
    }
  };

  const renderShiftCard = (
    label: string,
    icon: React.ReactNode,
    window: ShiftWindow,
    setWindow: (w: ShiftWindow) => void
  ) => (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-semibold text-gray-800">{label} {t("shift", "Shift")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {window.restricted ? t("restricted", "Restricted") : t("open_all_times", "Open all times")}
            </span>
            <Switch
              checked={window.restricted}
              onCheckedChange={(checked) =>
                setWindow({ ...window, restricted: checked })
              }
            />
          </div>
        </div>

        {window.restricted ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t("start_time_ist", "Start Time (IST)")} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="time"
                value={window.start}
                onChange={(e) => setWindow({ ...window, start: e.target.value })}
                className="bg-gray-50 border-gray-200 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t("end_time_ist", "End Time (IST)")} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="time"
                value={window.end}
                onChange={(e) => setWindow({ ...window, end: e.target.value })}
                className="bg-gray-50 border-gray-200 h-10"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {t("mobile_users_can_make_entries_at_any_time", "Mobile users can make {{shift}} shift entries at any time.", { shift: label.toLowerCase() })}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 bg-gray-50 min-h-screen p-4">
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-800">
                {t("shift_timings", "Shift Timings")}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {t("control_mobile_app_users_entries_all_times_ist", "Control when mobile app users can make collection entries. All times are IST.")}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={loadStatus}
              disabled={isLoading}
              className="border-gray-200 flex items-center gap-2"
            >
              <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {t("refresh", "Refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Current server status */}
          {(serverTime || entryAllowed !== null) && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <Clock className="h-4 w-4 text-blue-600" />
              {serverTime && (
                <span className="text-sm text-gray-700">
                  {t("server_time_ist", "Server time (IST):")} <span className="font-semibold">{serverTime}</span>
                </span>
              )}
              {entryAllowed !== null && (
                <Badge
                  className={
                    entryAllowed
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-red-100 text-red-800 hover:bg-red-100"
                  }
                >
                  {entryAllowed ? t("entries_currently_allowed", "Entries currently allowed") : t("entries_currently_blocked", "Entries currently blocked")}
                </Badge>
              )}
              {allowedShifts.length > 0 && (
                <span className="text-sm text-gray-700">
                  {t("allowed_now", "Allowed now:")} <span className="font-semibold">{allowedShifts.join(", ")}</span>
                </span>
              )}
            </div>
          )}

          {/* Filter Target Dairies */}
          <Card className="border border-indigo-100 shadow-sm bg-white overflow-hidden mb-6">
            <div className="bg-indigo-50/50 px-4 py-3 border-b border-indigo-100 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-indigo-600" />
              <Label className="text-sm font-bold text-indigo-900 m-0">
                {t("filter_and_select_target_dairies", "Filter & Select Target Dairies (VLCs)")}
              </Label>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Snowflake className="h-3.5 w-3.5 text-purple-500" /> CC
                  </Label>
                  <Select value={ccSel} onValueChange={setCcSel}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 h-10"><SelectValue placeholder={t("all", "All")} /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">{t("all", "All")}</SelectItem>
                      {ccList.map((cc) => (
                        <SelectItem key={cc.cc_id ?? cc.id} value={String(cc.cc_id ?? cc.id)}>
                          {cc.cc_id ?? cc.id} - {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5 text-blue-500" /> BMC
                  </Label>
                  <Select value={bmcSel} onValueChange={setBmcSel}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 h-10"><SelectValue placeholder={t("all", "All")} /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">{t("all", "All")}</SelectItem>
                      {bmcList.map((bmc) => (
                        <SelectItem key={bmc.bmc_id ?? bmc.id} value={String(bmc.bmc_id ?? bmc.id)}>
                          {bmc.bmc_id ?? bmc.id} - {bmc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <RouteIcon className="h-3.5 w-3.5 text-green-500" /> Route
                  </Label>
                  <Select value={routeSel} onValueChange={setRouteSel}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 h-10"><SelectValue placeholder={t("all", "All")} /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">{t("all", "All")}</SelectItem>
                      {routeList.map((route) => (
                        <SelectItem key={route.route_id ?? route.id} value={String(route.route_id ?? route.id)}>
                          {route.route_id ?? route.id} - {route.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    {t("target_vlcs", "Target VLCs")} <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={isVlcDropdownOpen} onOpenChange={setIsVlcDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-gray-50 border-gray-200 h-10">
                        {selectedVlcs.length === 0 ? t("select_vlcs", "Select VLCs") : t("vlcs_selected", "{{count}} VLC(s) selected", { count: selectedVlcs.length })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 bg-white" align="start">
                      <div className="p-2 border-b flex gap-2">
                        <Button variant="outline" size="sm" onClick={toggleSelectAllVlcs} className="flex-1 text-xs">
                          {selectedVlcs.length > 0 && selectedVlcs.length === availableVlcs.length ? t("deselect_all", "Deselect All") : t("select_all", "Select All")}
                        </Button>
                        {selectedVlcs.length > 0 && (
                          <Button variant="outline" size="sm" onClick={() => setSelectedVlcs([])} className="flex-1 text-xs">{t("clear", "Clear")}</Button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto p-2">
                        {availableVlcs.length === 0 && <p className="text-sm text-gray-500 p-2 text-center">{t("no_vlcs_found", "No VLCs found")}</p>}
                        {availableVlcs.map((v, i) => {
                          const rawId = v.vlc_id ?? v.branch_id ?? v.id;
                          const vId = Number(rawId);
                          const isValidId = !isNaN(vId);
                          const displayName = v.name ?? v.branchName ?? v.username ?? `Dairy ${i + 1}`;
                          return (
                            <div key={isValidId ? vId : `idx-${i}`} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={() => isValidId && toggleVlc(vId)}>
                              <input type="checkbox" checked={isValidId && selectedVlcs.includes(vId)} onChange={() => {}} className="h-4 w-4 pointer-events-none" />
                              <span className="text-sm">
                                {isValidId ? `${v.username ?? vId} - ` : ""}
                                {displayName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderShiftCard(
              t("morning", "Morning"),
              <Sun className="h-5 w-5 text-orange-500" />,
              morning,
              setMorning
            )}
            {renderShiftCard(
              t("evening", "Evening"),
              <Moon className="h-5 w-5 text-indigo-500" />,
              evening,
              setEvening
            )}
          </div>

          <p className="text-xs text-gray-500">
            {t("turning_shift_off_clears_window", "Turning a shift off (\"Open all times\") clears its window — mobile entries for that shift are allowed round the clock.")}
          </p>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 disabled:opacity-50 mt-4 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? t("saving", "Saving...") : t("save_timings", "Save Timings")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftTimings;
