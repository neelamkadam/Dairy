import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, formatDistanceStrict } from "date-fns";
import { toast } from "react-toastify";
import {
  KeyRound, LogOut, MapPin, Monitor, MonitorSmartphone, RefreshCw, Smartphone, Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sessionApi, type WebSession } from "@/services/sessionApi";
import { describeDevice } from "@/utils/deviceLabel";
import { SectionCard, SectionHeader } from "./SettingsSection";

// Logged-in Devices: everywhere this account is logged in, with a way to log any
// device out. A logged-out device is sent to the login page within seconds and the
// server refuses its requests (backend middlewares/webSession.js). Changing the
// password here also logs out every other device, so whoever knew the old one stays out.

const messageOf = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

const KIND_ICON = { phone: Smartphone, tablet: Tablet, computer: Monitor } as const;

const SessionsCard = () => {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<WebSession[]>([]);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // session id, or "others"

  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sessionApi.list();
      setSessions(res.data || []);
      setLoadedAt(Date.now());
    } catch (err) {
      // 401: this device's own session ended -- SessionEndedListener takes it to login
      if ((err as { response?: { status?: number } })?.response?.status !== 401) {
        setError(messageOf(err) || t("devices_load_failed", "Could not load the logged-in devices."));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const deviceName = (session: WebSession) => {
    const { browser, os } = describeDevice(session.user_agent);
    if (browser && os) return t("browser_on_os", { browser, os, defaultValue: "{{browser}} on {{os}}" });
    return browser || os || t("unknown_device", "Unknown device");
  };

  const countryName = (code: string | null) => {
    if (!code) return null;
    try {
      return new Intl.DisplayNames([i18n.language || "en"], { type: "region" }).of(code) || code;
    } catch {
      return code;
    }
  };

  const place = (session: WebSession) =>
    [session.city, session.region, countryName(session.country)].filter(Boolean).join(", ");

  const lastActive = (secondsAgo: number) =>
    secondsAgo < 120
      ? t("active_now", "Active now")
      : t("active_time_ago", { time: formatDistanceStrict(0, secondsAgo * 1000), defaultValue: "Active {{time}} ago" });

  const others = sessions.filter((s) => !s.is_current);

  const logoutDevice = async (session: WebSession) => {
    if (!window.confirm(t("confirm_logout_device", { device: deviceName(session), defaultValue: "Log out {{device}}? It will have to log in again." }))) return;
    setBusy(session.id);
    try {
      await sessionApi.logoutDevice(session.id);
      toast.success(t("device_logged_out", "Device logged out"));
      setSessions((list) => list.filter((s) => s.id !== session.id));
    } catch (err) {
      toast.error(messageOf(err) || t("oops_something_went_wrong"));
      load();
    } finally {
      setBusy(null);
    }
  };

  const logoutOthers = async () => {
    if (!window.confirm(t("confirm_logout_other_devices", "Log out every other device? Anyone using this account elsewhere will have to log in again."))) return;
    setBusy("others");
    try {
      const res = await sessionApi.logoutOthers();
      toast.success(t("other_devices_logged_out", { count: res.loggedOut, defaultValue: "{{count}} other device(s) logged out" }));
      setSessions((list) => list.filter((s) => s.is_current));
    } catch (err) {
      toast.error(messageOf(err) || t("oops_something_went_wrong"));
      load();
    } finally {
      setBusy(null);
    }
  };

  const changePassword = async () => {
    const { current, next, confirm } = passwords;
    if (!current || !next || !confirm) {
      toast.error(t("fill_all_password_fields", "Fill in all three password fields"));
      return;
    }
    if (next.length < 6) {
      toast.error(t("password_min_6_chars", "Password must be at least 6 characters"));
      return;
    }
    if (next !== confirm) {
      toast.error(t("new_passwords_do_not_match", "The new passwords do not match"));
      return;
    }
    if (next === current) {
      toast.error(t("new_password_same_as_current", "The new password is the same as the current one"));
      return;
    }

    setChanging(true);
    try {
      const res = await sessionApi.changePassword(current, next);
      toast.success(t("password_changed_devices_logged_out", {
        count: res.loggedOut,
        defaultValue: "Password changed. {{count}} other device(s) logged out.",
      }));
      setPasswords({ current: "", next: "", confirm: "" });
      setShowPassword(false);
      load();
    } catch (err) {
      toast.error(messageOf(err) || t("oops_something_went_wrong"));
    } finally {
      setChanging(false);
    }
  };

  return (
    <SectionCard>
      <SectionHeader icon={MonitorSmartphone} title={t("logged_in_devices", "Logged-in Devices")}>
        <div className="flex items-center gap-1.5 shrink-0">
          {others.length > 0 && (
            <Button
              size="sm" variant="outline" onClick={logoutOthers} disabled={busy !== null}
              className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("logout_all_other_devices", "Log out all other devices")}</span>
              <span className="sm:hidden">{t("logout_others_short", "Log out others")}</span>
            </Button>
          )}
          <Button
            size="sm" variant="ghost" onClick={load} disabled={loading}
            className="h-8 w-8 p-0 rounded-lg text-gray-500"
            title={t("refresh", "Refresh")} aria-label={t("refresh", "Refresh")}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </SectionHeader>

      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500">
          {t("logged_in_devices_hint", "Everywhere this account is logged in. If you see a device you don't recognise, log it out and change the password.")}
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!error && loading && sessions.length === 0 && (
          <p className="text-sm text-gray-400">{t("loading", "Loading...")}</p>
        )}

        {sessions.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {sessions.map((session) => {
              const Icon = KIND_ICON[describeDevice(session.user_agent).kind];
              const where = place(session);
              const signedIn = new Date(loadedAt - session.signed_in_seconds_ago * 1000);
              return (
                <li key={session.id} className="flex flex-wrap items-start gap-3 px-3.5 py-3">
                  <div className={cn("p-2 rounded-lg shrink-0", session.is_current ? "bg-green-50" : "bg-gray-50")}>
                    <Icon className={cn("h-4 w-4", session.is_current ? "text-green-600" : "text-gray-500")} />
                  </div>
                  <div className="flex-1 min-w-[12rem] space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{deviceName(session)}</span>
                      {session.is_current && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700">
                          {t("this_device", "This device")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 break-all">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {[where, session.ip].filter(Boolean).join(" · ") || t("location_unknown", "Location unknown")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t("signed_in_at", { time: format(signedIn, "dd MMM yyyy, hh:mm a"), defaultValue: "Logged in {{time}}" })}
                      {" · "}
                      {lastActive(session.last_seen_seconds_ago)}
                    </p>
                  </div>
                  {!session.is_current && (
                    <Button
                      size="sm" variant="outline" onClick={() => logoutDevice(session)} disabled={busy !== null}
                      className="h-8 px-3 text-xs rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      {busy === session.id ? t("logging_out", "Logging out...") : t("logout", "Log out")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="pt-1">
          {!showPassword ? (
            <button
              type="button" onClick={() => setShowPassword(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <KeyRound className="h-4 w-4" />
              {t("change_login_password", "Change login password")}
            </button>
          ) : (
            <div className="space-y-2.5 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                {t("change_login_password", "Change login password")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  type="password" autoComplete="current-password" value={passwords.current}
                  onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                  placeholder={t("current_password", "Current password")} className="bg-white h-9"
                />
                <Input
                  type="password" autoComplete="new-password" value={passwords.next}
                  onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                  placeholder={t("new_password", "New password")} className="bg-white h-9"
                />
                <Input
                  type="password" autoComplete="new-password" value={passwords.confirm}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder={t("confirm_new_password", "Confirm new password")} className="bg-white h-9"
                />
              </div>
              <p className="text-xs text-amber-700">
                {t("change_password_logs_out_others", "Changing the password logs out every other device.")}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm" onClick={changePassword} disabled={changing}
                  className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {changing ? t("saving", "Saving...") : t("change_password", "Change password")}
                </Button>
                <Button
                  size="sm" variant="ghost" disabled={changing}
                  onClick={() => { setShowPassword(false); setPasswords({ current: "", next: "", confirm: "" }); }}
                  className="h-8 px-3 text-xs rounded-lg"
                >
                  {t("cancel", "Cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
};

export default SessionsCard;
