import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/adminApi';
import { toast } from 'react-toastify';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, Lock, LockOpen, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppSelector } from '@/redux/store';

interface WebUserRow {
  id: number;
  name?: string;
  email?: string;
  mobile_number?: string;
  branches?: string[] | null;
  role?: string;
  is_admin?: number | boolean;
  created_by?: number | null;
  has_settings_lock?: boolean;
}

const SETTINGS_LOCK_MIN = 4;

// The settings lock is kept on a customer's account owner; sub-users share it and
// super admins (role "admin") have none.
const isSuperAdmin = (user: WebUserRow) => user.role === 'admin';
const isAccountOwner = (user: WebUserRow) => !isSuperAdmin(user) && (Number(user.is_admin) === 1 || !user.created_by);

const BRANCH_PREVIEW = 3;

// Branch ids as chips in a fixed-width column: the first few, and the rest on click
const BranchesCell = ({ branches }: { branches?: WebUserRow['branches'] }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const list = branches || [];
  if (list.length === 0) return <span className="text-gray-400">-</span>;

  const shown = expanded ? list : list.slice(0, BRANCH_PREVIEW);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((branch) => (
        <span key={branch} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 tabular-nums">
          {branch}
        </span>
      ))}
      {list.length > BRANCH_PREVIEW && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {expanded
            ? t('show_less', 'Show less')
            : t('branches_more', { count: list.length - BRANCH_PREVIEW, defaultValue: '+{{count}} more' })}
        </button>
      )}
    </div>
  );
};

export const WebApplication: React.FC = () => {
  const { t } = useTranslation();
  const superAdminId = Number(useAppSelector((state) => state.authData.userData?.id));
  const [webUsers, setWebUsers] = useState<WebUserRow[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<WebUserRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lockTarget, setLockTarget] = useState<WebUserRow | null>(null);
  const [lockPassword, setLockPassword] = useState('');
  const [lockConfirm, setLockConfirm] = useState('');
  const [savingLock, setSavingLock] = useState(false);

  const markLocked = (userId: number, locked: boolean) => {
    const update = (list: WebUserRow[]) => list.map((u) => (u.id === userId ? { ...u, has_settings_lock: locked } : u));
    setWebUsers(update);
    setFilteredUsers(update);
  };

  const openLockDialog = (user: WebUserRow) => {
    setLockTarget(user);
    setLockPassword('');
    setLockConfirm('');
  };

  // password: a value sets the lock, null removes it
  const saveSettingsLock = async (user: WebUserRow, password: string | null) => {
    setSavingLock(true);
    try {
      const { data } = await adminApi.setSettingsLock(superAdminId, user.id, password);
      if (!data.success) {
        toast.error(data.message);
        return;
      }
      markLocked(user.id, password !== null);
      toast.success(password !== null
        ? t('settings_lock_saved', 'Settings password saved')
        : t('settings_lock_removed', 'Settings password removed'));
      setLockTarget(null);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || t('oops_something_went_wrong'));
    } finally {
      setSavingLock(false);
    }
  };

  const handleSaveLock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockTarget) return;
    if (lockPassword.length < SETTINGS_LOCK_MIN) {
      toast.error(t('settings_lock_min_length', { count: SETTINGS_LOCK_MIN, defaultValue: 'Password must be at least {{count}} characters' }));
      return;
    }
    if (lockPassword !== lockConfirm) {
      toast.error(t('passwords_do_not_match', 'Passwords do not match'));
      return;
    }
    saveSettingsLock(lockTarget, lockPassword);
  };

  const handleRemoveLock = (user: WebUserRow) => {
    if (!window.confirm(t('settings_lock_remove_confirm', { name: user.name, defaultValue: 'Remove the settings password for {{name}}? Their General Settings will open without a password.' }))) return;
    saveSettingsLock(user, null);
  };

  useEffect(() => {
    fetchWebUsers();
  }, []);

  const fetchWebUsers = async () => {
    try {
      const { data } = await adminApi.getAllUsers();
      console.log('WebApplication API Response:', data);
      if (data.success) {
        const userData = data.data.webUsers || [];
        console.log('Web Users Data:', userData);
        setWebUsers(userData);
        setFilteredUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching web users:', error);
      toast.error(t("failed_to_fetch_web_users", 'Failed to fetch web users'));
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(webUsers);
      setCurrentPage(1);
      return;
    }
    const term = searchTerm.trim().toLowerCase();
    const filtered = webUsers.filter((u) => {
      const branches = u.branches?.join(', ') || '';
      return (
        String(u.name || '').toLowerCase().includes(term) ||
        String(u.email || '').toLowerCase().includes(term) ||
        String(u.mobile_number || '').toLowerCase().includes(term) ||
        branches.toLowerCase().includes(term)
      );
    });
    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const paginatedData = filteredUsers.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );
  const totalPages = Math.ceil(filteredUsers.length / perPage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t("web_applications", "Web Applications")}</h2>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder={t("search", "Search...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-sm"
            />
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={perPage.toString()} onValueChange={(v) => { setPerPage(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">{t("per_page", "per page")}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t("name", "Name")}</TableHead>
                <TableHead className="font-semibold">{t("email", "Email")}</TableHead>
                <TableHead className="font-semibold">{t("mobile_number", "Mobile Number")}</TableHead>
                <TableHead className="font-semibold w-[260px] min-w-[260px] max-w-[260px]">{t("branches", "Branches")}</TableHead>
                <TableHead className="font-semibold">{t("settings_lock", "Settings Lock")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{user.name || '-'}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.mobile_number || '-'}</TableCell>
                  <TableCell className="w-[260px] min-w-[260px] max-w-[260px] whitespace-normal">
                    <BranchesCell branches={user.branches} />
                  </TableCell>
                  <TableCell>
                    {isAccountOwner(user) ? (
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {user.has_settings_lock ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                            <Lock className="h-3 w-3" />{t("settings_lock_locked", "Locked")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500 border border-gray-200">
                            <LockOpen className="h-3 w-3" />{t("settings_lock_not_set", "Not set")}
                          </span>
                        )}
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => openLockDialog(user)}>
                          {user.has_settings_lock ? t("settings_lock_change_btn", "Change") : t("settings_lock_set_btn", "Set")}
                        </Button>
                        {user.has_settings_lock && (
                          <Button
                            variant="ghost" size="sm" disabled={savingLock}
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveLock(user)}
                          >
                            {t("remove", "Remove")}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {isSuperAdmin(user) ? '-' : t("settings_lock_uses_owner", "Uses account owner's")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            {t("showing_entries", "Showing {{start}} to {{end}} of {{total}} entries", { 
              start: filteredUsers.length > 0 ? (currentPage - 1) * perPage + 1 : 0, 
              end: Math.min(currentPage * perPage, filteredUsers.length), 
              total: filteredUsers.length 
            })}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm text-gray-600">
              {t("page_of", "Page {{current}} of {{total}}", { current: currentPage, total: totalPages || 1 })}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!lockTarget} onOpenChange={(open) => { if (!open) setLockTarget(null); }}>
        <DialogContent className="sm:max-w-[420px] bg-white">
          <form onSubmit={handleSaveLock} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                {t("settings_lock_dialog_title", { name: lockTarget?.name, defaultValue: "Settings password — {{name}}" })}
              </DialogTitle>
              <DialogDescription>
                {t("settings_lock_dialog_desc", "This customer must enter this password to open General Settings. It covers all their VLCs and sub-users.")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                type="password" autoFocus autoComplete="new-password"
                value={lockPassword} onChange={(e) => setLockPassword(e.target.value)}
                placeholder={t("new_password", "New password")}
              />
              <Input
                type="password" autoComplete="new-password"
                value={lockConfirm} onChange={(e) => setLockConfirm(e.target.value)}
                placeholder={t("confirm_password", "Confirm password")}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setLockTarget(null)}>{t("cancel", "Cancel")}</Button>
              <Button type="submit" disabled={savingLock || !lockPassword} className="bg-blue-600 hover:bg-blue-700 text-white">
                {savingLock && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("save", "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
