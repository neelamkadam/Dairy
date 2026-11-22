import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { AppRoutes } from "@/routes/AppRoutes";
import { persistor } from "@/redux/store";

// An open tab keeps running the build it loaded, so after a deploy people go on
// using old code until they reload. This compares the running build with
// /version.json (written by vite.config.ts on every build); when a newer one is
// live it reloads on the next page change -- the page is being left anyway -- and
// shows a Reload banner until then.

const CHECK_EVERY_MS = 5 * 60 * 1000;
// The version a reload was already tried for. If the reload still brings back the
// old build (something between the browser and Netlify cached the page), stop
// reloading and leave the banner up instead of looping.
const RELOADED_FOR = "app-reloaded-for-version";

const readSession = (key: string) => {
  try { return sessionStorage.getItem(key); } catch { return null; }
};

const fetchLiveVersion = async (): Promise<string | null> => {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === "string" ? data.version : null;
  } catch {
    return null;
  }
};

const reloadInto = async (version: string) => {
  try { sessionStorage.setItem(RELOADED_FOR, version); } catch { /* private mode */ }
  // Save the login and settings before the page goes
  await persistor.flush().catch(() => {});
  window.location.reload();
};

const AppUpdateWatcher = () => {
  const { t } = useTranslation();
  const [liveVersion, setLiveVersion] = useState<string | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let stopped = false;
    const check = async () => {
      const version = await fetchLiveVersion();
      if (!stopped && version && version !== __APP_VERSION__) setLiveVersion(version);
    };
    const onVisible = () => { if (document.visibilityState === "visible") check(); };

    check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const autoReload = liveVersion !== null && readSession(RELOADED_FOR) !== liveVersion;

  useEffect(() => {
    if (!autoReload || !liveVersion) return;
    let lastPath = AppRoutes.state.location.pathname;
    return AppRoutes.subscribe((state) => {
      const path = state.location.pathname;
      if (path === lastPath) return;
      lastPath = path;
      reloadInto(liveVersion);
    });
  }, [autoReload, liveVersion]);

  if (!liveVersion) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[9998] -translate-x-1/2 w-[calc(100%-2rem)] max-w-md">
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-lg">
        <RefreshCw className="h-4 w-4 shrink-0 text-blue-600" />
        <p className="flex-1 text-sm text-gray-700">
          {t("new_version_available", "A new version of the app is available.")}
        </p>
        <button
          type="button" onClick={() => reloadInto(liveVersion)}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          {t("reload", "Reload")}
        </button>
      </div>
    </div>
  );
};

export default AppUpdateWatcher;
