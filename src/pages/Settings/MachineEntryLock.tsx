import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FlaskConical, Info, Loader2, Lock, Scale, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/services/adminApi";
import { MACHINE_ONLY_KEYS, getMachineOnly, getSidebarAccess, updateItemAccess } from "@/services/sidebarAccessApi";
import { useAppSelector } from "@/redux/store";

/**
 * Settings → Machine Entry Lock: per user, whether FAT/SNF (analyser) and the
 * weight (scale) may only come from the wired machine on Doodh Setu PC.
 *
 * The same at every VLC. The VLC's General Settings → Analyser / Weight
 * switches are for the mobile app and do not lock anything on the PC. Saved
 * with the user's Sidebar Access (item_access).
 */

interface WebUser {
  id: number;
  name?: string | null;
  email: string;
  is_admin?: number | boolean | null;
  created_by?: number | string | null;
}

type Lock = { analyser: boolean; weight: boolean };
type LockKey = keyof Lock;

const LOAD_AT_ONCE = 8;

const isAdminUser = (user?: WebUser) => user?.is_admin === true || Number(user?.is_admin) === 1;

const MachineEntryLock = () => {
  const { t } = useTranslation();
  const authState = useAppSelector((state) => state.authData);
  const loggedInUserId = authState?.userData?.id;
  const userRole = authState?.userRole;

  const [users, setUsers] = useState<WebUser[]>([]);
  const [locks, setLocks] = useState<Record<number, Lock>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // A sub-user given this page (Sidebar Access) manages the other sub-users of
  // their admin; their own lock stays with the admin.
  const [viewerIsSubUser, setViewerIsSubUser] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await adminApi.getAllUsers();
        let list: WebUser[] = data?.success ? data.data?.webUsers ?? [] : [];
        // A dairy owner sees themselves and the sub-users they created; a
        // sub-user sees themselves and the other sub-users of their admin; the
        // super admin sees everyone (as on Sidebar Access).
        let subUser = false;
        if (userRole === "user" && loggedInUserId) {
          const me = String(loggedInUserId);
          const meRow = list.find((u) => String(u.id) === me);
          subUser = !!meRow?.created_by && !isAdminUser(meRow);
          const owner = subUser ? String(meRow!.created_by) : me;
          list = list.filter((u) => String(u.id) === me || String(u.created_by ?? "") === owner);
        }
        list.sort((a, b) => (String(a.id) === String(loggedInUserId) ? -1 : String(b.id) === String(loggedInUserId) ? 1 : a.email.localeCompare(b.email)));
        if (cancelled) return;
        setViewerIsSubUser(subUser);
        setUsers(list);

        const found: Record<number, Lock> = {};
        for (let i = 0; i < list.length; i += LOAD_AT_ONCE) {
          await Promise.all(
            list.slice(i, i + LOAD_AT_ONCE).map(async (user) => {
              try {
                const response = await getSidebarAccess(user.id);
                found[user.id] = getMachineOnly(response?.data);
              } catch {
                found[user.id] = { analyser: false, weight: false };
              }
            })
          );
          if (cancelled) return;
          setLocks({ ...found });
        }
      } catch (error) {
        console.error("Machine Entry Lock - load error:", error);
        toast.error(t("failed_to_fetch_users", "Failed to fetch users"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [loggedInUserId, userRole, t]);

  const toggle = async (user: WebUser, which: LockKey, on: boolean) => {
    const id = `${user.id}:${which}`;
    const before = locks[user.id] ?? { analyser: false, weight: false };
    setSaving(id);
    setLocks((prev) => ({ ...prev, [user.id]: { ...before, [which]: on } }));
    try {
      const result = await updateItemAccess(user.id, { [MACHINE_ONLY_KEYS[which]]: on ? 1 : 0 });
      if (result && result.success === false) throw new Error(result.message);
      toast.success(t("machine_entry_lock_saved", "Saved for {{user}}", { user: user.email }));
    } catch (error) {
      const failure = error as { response?: { data?: { message?: string } }; message?: string };
      setLocks((prev) => ({ ...prev, [user.id]: before }));
      toast.error(failure?.response?.data?.message || failure?.message || t("failed_to_save_machine_entry_lock", "Could not save"));
    } finally {
      setSaving(null);
    }
  };

  const query = search.trim().toLowerCase();
  const shown = users.filter(
    (u) => !query || u.email.toLowerCase().includes(query) || (u.name ?? "").toLowerCase().includes(query) || String(u.id).includes(query)
  );

  const lockSwitch = (user: WebUser, which: LockKey, label: string, Icon: typeof Scale, readOnly: boolean) => {
    const lock = locks[user.id];
    const on = !!lock?.[which];
    const busy = saving === `${user.id}:${which}`;
    return (
      <label
        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 bg-white transition-colors ${
          !lock ? "cursor-wait opacity-60" : readOnly ? "cursor-not-allowed" : "cursor-pointer hover:border-blue-300"
        } ${on ? "border-amber-300 bg-amber-50/60" : "border-slate-200"}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${on ? "text-amber-600" : "text-slate-400"}`} />
          <span className={`text-sm font-semibold truncate ${on ? "text-amber-900" : "text-slate-600"}`}>{label}</span>
        </span>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        ) : (
          <Switch
            checked={on}
            disabled={!lock || readOnly || saving !== null}
            onCheckedChange={(checked) => toggle(user, which, checked)}
            className="data-[state=checked]:bg-amber-500"
          />
        )}
      </label>
    );
  };

  return (
    <div className="p-2 md:p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-[calc(100vh-80px)] space-y-4 md:space-y-5">
      <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100/80 shadow-sm p-4 w-full">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">{t("machine_entry_lock", "Machine Entry Lock")}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("machine_entry_lock_subtitle", "Choose, per user, which readings may only come from the machine on Doodh Setu PC")}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-blue-900">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
          <p>
            {t(
              "machine_entry_lock_hint",
              "On: that user cannot type the value on Doodh Setu PC; it fills only from the wired analyser or weighing scale. (General Settings → Analyser / Weight are for the mobile app and do not lock the PC.)"
            )}
          </p>
        </div>

        <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-4 md:p-5 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t("search_user_by_email_or_id", "Search user by email or ID...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            {loading && users.length === 0 ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : shown.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">{t("no_users_found", "No users found")}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {shown.map((user) => {
                  const isMe = String(user.id) === String(loggedInUserId);
                  const isAdmin = isAdminUser(user);
                  const readOnly = isMe && viewerIsSubUser;
                  return (
                    <div key={user.id} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_220px] gap-2 md:gap-3 py-3 md:items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {user.name || user.email}
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              isMe ? "bg-blue-100 text-blue-700" : isAdmin ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isMe ? t("you", "You") : isAdmin ? t("admin", "Admin") : t("sub_user", "Sub-user")}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        {readOnly && (
                          <p className="text-[11px] font-medium text-amber-700">
                            {t("machine_entry_lock_own_row", "Only your admin can change your own lock")}
                          </p>
                        )}
                      </div>
                      {lockSwitch(user, "analyser", t("analyser_machine_only", "Analyser: machine only"), FlaskConical, readOnly)}
                      {lockSwitch(user, "weight", t("weight_machine_only", "Weight: machine only"), Scale, readOnly)}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MachineEntryLock;
