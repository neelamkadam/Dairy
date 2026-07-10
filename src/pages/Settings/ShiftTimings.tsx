import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { shiftTimingApi } from "@/services/shiftTimingApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, RefreshCw, Sun, Moon } from "lucide-react";

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
  const authState = useAppSelector((state) => state.authData);
  const userId = authState?.userData?.id ? Number(authState.userData.id) : null;

  const [morning, setMorning] = useState<ShiftWindow>(EMPTY_WINDOW);
  const [evening, setEvening] = useState<ShiftWindow>(EMPTY_WINDOW);
  const [serverTime, setServerTime] = useState<string>("");
  const [allowedShifts, setAllowedShifts] = useState<string[]>([]);
  const [entryAllowed, setEntryAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadStatus = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await shiftTimingApi.getStatus(userId);
      const data = response?.data?.data ?? response?.data ?? {};
      setMorning(pickWindow(data, "morning"));
      setEvening(pickWindow(data, "evening"));
      setServerTime(
        data?.current_time ?? data?.server_time ?? data?.ist_time ?? data?.now ?? ""
      );
      setAllowedShifts(Array.isArray(data?.allowed_shifts) ? data.allowed_shifts : []);
      setEntryAllowed(
        typeof data?.entry_allowed === "boolean" ? data.entry_allowed : null
      );
    } catch (error) {
      console.error("Failed to load shift timing status:", error);
      toast.error("Failed to load shift timings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSave = async () => {
    if (!userId) {
      toast.error("User not found");
      return;
    }
    if (morning.restricted && (!morning.start || !morning.end)) {
      toast.error("Morning shift needs both start and end time");
      return;
    }
    if (evening.restricted && (!evening.start || !evening.end)) {
      toast.error("Evening shift needs both start and end time");
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
      });
      if (response?.data?.success === false) {
        toast.error(response?.data?.message || "Failed to save shift timings");
        return;
      }
      toast.success(response?.data?.message || "Shift timings saved successfully");
      loadStatus();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save shift timings");
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
            <span className="font-semibold text-gray-800">{label} Shift</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {window.restricted ? "Restricted" : "Open all times"}
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
                Start Time (IST) <span className="text-red-500">*</span>
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
                End Time (IST) <span className="text-red-500">*</span>
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
            Mobile users can make {label.toLowerCase()} shift entries at any time.
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
                Shift Timings
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Control when mobile app users can make collection entries. All times are IST.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={loadStatus}
              disabled={isLoading}
              className="border-gray-200 flex items-center gap-2"
            >
              <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
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
                  Server time (IST): <span className="font-semibold">{serverTime}</span>
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
                  {entryAllowed ? "Entries currently allowed" : "Entries currently blocked"}
                </Badge>
              )}
              {allowedShifts.length > 0 && (
                <span className="text-sm text-gray-700">
                  Allowed now: <span className="font-semibold">{allowedShifts.join(", ")}</span>
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderShiftCard(
              "Morning",
              <Sun className="h-5 w-5 text-orange-500" />,
              morning,
              setMorning
            )}
            {renderShiftCard(
              "Evening",
              <Moon className="h-5 w-5 text-indigo-500" />,
              evening,
              setEvening
            )}
          </div>

          <p className="text-xs text-gray-500">
            Turning a shift off ("Open all times") clears its window — mobile entries for that
            shift are allowed round the clock. This gate is enforced in the mobile app UI only.
          </p>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Timings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftTimings;
