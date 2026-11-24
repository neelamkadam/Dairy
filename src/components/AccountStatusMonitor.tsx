import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ENV_VARIABLES } from "@/services/config";
import { announceSessionEnded, sessionIdFromToken } from "@/services/sessionGuard";

// Wait before reopening a dropped status stream: doubles from 1 s up to 30 s
const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 30000;

interface AccountStatusMonitorProps {
  userId: string | number;
}

const AccountStatusMonitor = ({ userId }: AccountStatusMonitorProps) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // The stream checks this device's login every few seconds, so a device logged
    // out from Logged-in Devices goes to the login page within seconds. It has to
    // stay open for that: a dropped stream (server restart, sleep, network change)
    // is reopened, sooner each time the tab comes back into view or online.
    let eventSource: EventSource | null = null;
    let retryTimer: number | undefined;
    let retryDelay = RETRY_MIN_MS;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      window.clearTimeout(retryTimer);
      eventSource?.close();

      // With the session id the stream also says when this device was logged out
      const sid = sessionIdFromToken();
      const url = `${ENV_VARIABLES.API_BASE}/web-users/user-status/${userId}${sid ? `?sid=${encodeURIComponent(sid)}` : ""}`;
      const source = new EventSource(url);
      eventSource = source;

      source.onopen = () => { retryDelay = RETRY_MIN_MS; };

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.session_ended === true) {
            stop();
            announceSessionEnded();
            return;
          }

          if (data.user_exists === false || data.is_active === 0) {
            setShowModal(true);
          } else if (data.is_active === 1) {
            setShowModal(false);
          }
        } catch (error) {
          console.error("Error parsing SSE data:", error);
        }
      };

      // Reopened here rather than left to the browser, which gives up for good when
      // the server answers with an error (e.g. a 502 during a deploy). Spread out so
      // every open tab does not reconnect at the same moment after a restart.
      source.onerror = () => {
        if (source !== eventSource) return;
        source.close();
        eventSource = null;
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(connect, retryDelay * (0.5 + Math.random()));
        retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
      };
    };

    const stop = () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      eventSource?.close();
      eventSource = null;
      window.removeEventListener("online", reconnectNow);
      document.removeEventListener("visibilitychange", reconnectNow);
    };

    // Back online or back in view with no open stream: reconnect now, not after the wait
    const reconnectNow = () => {
      if (document.visibilityState !== "visible" || eventSource) return;
      retryDelay = RETRY_MIN_MS;
      connect();
    };

    connect();
    window.addEventListener("online", reconnectNow);
    document.addEventListener("visibilitychange", reconnectNow);
    return stop;
  }, [userId]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-600">Account Deactivated</h2>
          <X className="w-5 h-5 text-gray-400 cursor-not-allowed" />
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            Your account has been deactivated. Please pay your bill to continue.
          </p>
          <p className="text-gray-700">
            If this is a mistake, please contact us at:
          </p>
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <p className="font-semibold">📞 +91 9503382417</p>
            <p className="font-semibold">📧 info@neodairysales.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountStatusMonitor;
