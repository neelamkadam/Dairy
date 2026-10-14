import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/redux/store";
import { webUserApi } from "@/services/webUserApi";

type LockStatus = "checking" | "locked" | "open" | "error";

// The super admin can lock a customer's General Settings with a password (one per
// customer account). It is asked on every visit: the unlock lives only in this
// component, so leaving the page, reloading or opening a new tab locks it again.
const SettingsLockGate = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const userId = Number(useAppSelector((state) => state.authData.userData?.id));
  const [status, setStatus] = useState<LockStatus>("checking");
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);

  const checkLock = useCallback(async () => {
    setStatus("checking");
    try {
      const res = await webUserApi.getSettingsLock(userId);
      setStatus(res.locked ? "locked" : "open");
    } catch (error) {
      console.error("Error checking settings lock:", error);
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    checkLock();
  }, [checkLock]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setVerifying(true);
    setWrongPassword(false);
    try {
      const res = await webUserApi.verifySettingsLock(userId, password);
      if (res.valid) {
        setPassword("");
        setStatus("open");
      } else {
        setWrongPassword(true);
        setPassword("");
      }
    } catch (error) {
      console.error("Error verifying settings password:", error);
      toast.error(t("oops_something_went_wrong"));
    } finally {
      setVerifying(false);
    }
  };

  if (status === "open") return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {status === "checking" && <Loader2 className="h-8 w-8 animate-spin text-blue-600" />}

      {status === "error" && (
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-sm text-gray-600">
            {t("settings_lock_check_failed", "Couldn't check whether settings are locked. Please try again.")}
          </p>
          <Button onClick={checkLock} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            {t("retry", "Retry")}
          </Button>
        </div>
      )}

      {status === "locked" && (
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5"
        >
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">{t("settings_locked_title", "Settings are locked")}</h1>
            <p className="text-sm text-gray-500">
              {t("settings_locked_desc", "Enter the settings password to open General Settings.")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Input
              type="password"
              autoFocus
              autoComplete="off"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setWrongPassword(false);
              }}
              placeholder={t("settings_password", "Settings password")}
              aria-invalid={wrongPassword}
              className={`h-11 bg-gray-50 ${wrongPassword ? "border-red-400 focus-visible:ring-red-300" : "border-gray-200"}`}
            />
            {wrongPassword && (
              <p className="text-xs text-red-600">{t("incorrect_password", "Incorrect password. Please try again.")}</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={!password || verifying}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : t("unlock", "Unlock")}
          </Button>
          <p className="text-xs text-center text-gray-400">
            {t("settings_lock_ask_admin", "Don't have it? Ask your service provider.")}
          </p>
        </form>
      )}
    </div>
  );
};

export default SettingsLockGate;
