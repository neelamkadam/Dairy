import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, StopCircle, RefreshCw, Activity } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = "https://api.neodairysales.com/api/maintenance";
const HEADERS = { "x-maintenance-key": "dairy@admin#2025" };

type ServiceStatus = "running" | "stopped" | "unknown";

interface StatusState {
  attendance: ServiceStatus;
  supervision: ServiceStatus;
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; dot: string; text: string }> = {
  running: { label: "Running", dot: "bg-green-500", text: "text-green-600 dark:text-green-400" },
  stopped: { label: "Stopped", dot: "bg-red-500",   text: "text-red-600 dark:text-red-400"   },
  unknown: { label: "Unknown", dot: "bg-gray-400",  text: "text-gray-500 dark:text-gray-400" },
};

const parseStatus = (val: unknown): ServiceStatus => {
  if (val === "running") return "running";
  if (val === "stopped") return "stopped";
  return "unknown";
};

const StatusRow = ({ label, value }: { label: string; value: ServiceStatus }) => {
  const cfg = STATUS_CONFIG[value];
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${value === "running" ? "animate-pulse" : ""}`} />
        <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
      </div>
    </div>
  );
};

const Supervisor = () => {
  const [status, setStatus] = useState<StatusState>({ attendance: "unknown", supervision: "unknown" });
  const [statusLoading, setStatusLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/status`, { headers: HEADERS });
      setStatus({
        attendance: parseStatus(data?.attendance),
        supervision: parseStatus(data?.supervision),
      });
    } catch {
      toast.error("Failed to fetch status");
      setStatus({ attendance: "unknown", supervision: "unknown" });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const handleStart = async () => {
    setStartLoading(true);
    try {
      await axios.post(`${BASE_URL}/start`, {}, { headers: HEADERS });
      toast.success("Attendance started successfully");
      setStatus({ attendance: "running", supervision: "running" });
    } catch {
      toast.error("Failed to start attendance");
    } finally {
      setStartLoading(false);
    }
  };

  const handleStop = async () => {
    setStopLoading(true);
    try {
      await axios.post(`${BASE_URL}/stop`, {}, { headers: HEADERS });
      toast.success("Attendance stopped successfully");
      setStatus({ attendance: "stopped", supervision: "stopped" });
    } catch {
      toast.error("Failed to stop attendance");
    } finally {
      setStopLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const allRunning = status.attendance === "running" && status.supervision === "running";
  const allStopped = status.attendance === "stopped" && status.supervision === "stopped";

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Supervisor</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage attendance service start, stop and status.
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Activity size={18} />
              Service Status
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={statusLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw size={14} className={statusLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100 dark:divide-gray-800">
          <StatusRow label="Attendance" value={status.attendance} />
          <StatusRow label="Supervision" value={status.supervision} />
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            onClick={handleStart}
            disabled={startLoading || allRunning}
          >
            <PlayCircle size={18} />
            {startLoading ? "Starting..." : "Start"}
          </Button>

          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            onClick={handleStop}
            disabled={stopLoading || allStopped}
          >
            <StopCircle size={18} />
            {stopLoading ? "Stopping..." : "Stop"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Supervisor;
