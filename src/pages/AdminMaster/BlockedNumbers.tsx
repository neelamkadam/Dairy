import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { blockedNumbersApi, BlockedNumber } from '@/services/blockedNumbersApi';
import { useAppSelector } from '@/redux/store';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Ban,
  Trash2,
  Loader2,
  ShieldCheck,
  ShieldX,
  Plus,
  X,
} from 'lucide-react';

const MOBILE_REGEX = /^[0-9]{10}$/;

const BlockedNumbers: React.FC = () => {
  const { t } = useTranslation();
  const { userData } = useAppSelector((state) => state.authData);

  const [records, setRecords] = useState<BlockedNumber[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Block dialog
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [numbersInput, setNumbersInput] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Unblock confirmation
  const [pendingUnblock, setPendingUnblock] = useState<BlockedNumber | null>(null);
  const [unblocking, setUnblocking] = useState(false);

  // Check a single number
  const [checkInput, setCheckInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ blocked: boolean; record?: BlockedNumber } | null>(null);

  const blockedBy = userData?.name || userData?.email || 'admin';

  const fetchBlockedNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await blockedNumbersApi.getBlockedNumbers({
        search: search || undefined,
        limit,
        offset,
      });

      const list: BlockedNumber[] =
        data?.data?.blocked_numbers || data?.blocked_numbers || data?.data || [];
      const count =
        data?.total ?? data?.data?.total ?? data?.count ?? (Array.isArray(list) ? list.length : 0);

      setRecords(Array.isArray(list) ? list : []);
      setTotal(Number(count) || 0);
    } catch (error: any) {
      console.error('Error fetching blocked numbers:', error);
      setRecords([]);
      setTotal(0);
      toast.error(
        error?.response?.data?.message ||
          t('failed_to_fetch_blocked_numbers', 'Failed to fetch blocked numbers')
      );
    } finally {
      setLoading(false);
    }
  }, [search, limit, offset, t]);

  useEffect(() => {
    fetchBlockedNumbers();
  }, [fetchBlockedNumbers]);

  const handleSearch = () => {
    setOffset(0);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setOffset(0);
    setSearch('');
  };

  const parseNumbers = (value: string): string[] =>
    Array.from(
      new Set(
        value
          .split(/[\s,;]+/)
          .map((n) => n.trim())
          .filter(Boolean)
      )
    );

  const handleBlock = async () => {
    const numbers = parseNumbers(numbersInput);

    if (numbers.length === 0) {
      toast.error(t('enter_at_least_one_number', 'Enter at least one mobile number'));
      return;
    }

    const invalid = numbers.filter((n) => !MOBILE_REGEX.test(n));
    if (invalid.length > 0) {
      toast.error(
        t('invalid_mobile_numbers', 'Invalid mobile number(s): {{numbers}}', {
          numbers: invalid.join(', '),
        })
      );
      return;
    }

    setSaving(true);
    try {
      const payload =
        numbers.length === 1
          ? { mobile_number: numbers[0], reason: reason.trim() || undefined, blocked_by: blockedBy }
          : { mobile_numbers: numbers, reason: reason.trim() || undefined, blocked_by: blockedBy };

      const { data } = await blockedNumbersApi.blockNumber(payload);

      if (data?.success === false) {
        toast.error(data?.message || t('failed_to_block_number', 'Failed to block number'));
        return;
      }

      toast.success(
        data?.message ||
          t('numbers_blocked_successfully', '{{count}} number(s) blocked successfully', {
            count: numbers.length,
          })
      );
      setIsBlockOpen(false);
      setNumbersInput('');
      setReason('');
      setOffset(0);
      fetchBlockedNumbers();
    } catch (error: any) {
      console.error('Error blocking number:', error);
      toast.error(
        error?.response?.data?.message || t('failed_to_block_number', 'Failed to block number')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async () => {
    if (!pendingUnblock) return;

    setUnblocking(true);
    try {
      const { data } = await blockedNumbersApi.unblockNumber(pendingUnblock.mobile_number);

      if (data?.success === false) {
        toast.error(data?.message || t('failed_to_unblock_number', 'Failed to unblock number'));
        return;
      }

      toast.success(
        data?.message || t('number_unblocked_successfully', 'Number unblocked successfully')
      );

      // Step back a page when the last row on this page was removed.
      if (records.length === 1 && offset > 0) {
        setOffset(Math.max(0, offset - limit));
      } else {
        fetchBlockedNumbers();
      }
      setPendingUnblock(null);
    } catch (error: any) {
      console.error('Error unblocking number:', error);
      toast.error(
        error?.response?.data?.message || t('failed_to_unblock_number', 'Failed to unblock number')
      );
    } finally {
      setUnblocking(false);
    }
  };

  const handleCheck = async () => {
    const number = checkInput.trim();
    if (!MOBILE_REGEX.test(number)) {
      toast.error(t('enter_valid_mobile_number', 'Enter a valid 10 digit mobile number'));
      return;
    }

    setChecking(true);
    setCheckResult(null);
    try {
      const { data } = await blockedNumbersApi.checkBlockedNumber(number);
      const record: BlockedNumber | undefined = data?.data?.mobile_number
        ? data.data
        : data?.blocked_number || undefined;
      const isBlocked = Boolean(
        data?.is_blocked ?? data?.blocked ?? data?.data?.is_blocked ?? data?.data?.blocked ?? record
      );
      setCheckResult({ blocked: isBlocked, record });
    } catch (error: any) {
      console.error('Error checking number:', error);
      if (error?.response?.status === 404) {
        setCheckResult({ blocked: false });
      } else {
        toast.error(
          error?.response?.data?.message || t('failed_to_check_number', 'Failed to check number')
        );
      }
    } finally {
      setChecking(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showingFrom = total > 0 ? offset + 1 : 0;
  const showingTo = Math.min(offset + records.length, total || offset + records.length);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('blocked_numbers', 'Blocked Numbers')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('blocked_numbers_subtitle', 'Block mobile numbers from registering or logging in')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsBlockOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('block_number', 'Block Number')}
          </Button>
        </div>

        {/* Check a number */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Label className="text-sm font-medium text-gray-700">
            {t('check_number_status', 'Check Number Status')}
          </Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              placeholder={t('enter_mobile_number', 'Enter mobile number')}
              value={checkInput}
              maxLength={10}
              inputMode="numeric"
              onChange={(e) => {
                setCheckInput(e.target.value.replace(/\D/g, ''));
                setCheckResult(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              className="max-w-xs bg-white"
            />
            <Button onClick={handleCheck} disabled={checking} variant="outline">
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              <span className="ml-1">{t('check', 'Check')}</span>
            </Button>

            {checkResult && (
              <div
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${
                  checkResult.blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}
              >
                {checkResult.blocked ? (
                  <ShieldX className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {checkResult.blocked
                  ? t('number_is_blocked', 'This number is blocked')
                  : t('number_is_not_blocked', 'This number is not blocked')}
                {checkResult.blocked && checkResult.record?.reason && (
                  <span className="font-normal">&mdash; {checkResult.record.reason}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search + page size */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex flex-1 gap-2 min-w-[240px]">
            <div className="relative max-w-sm w-full">
              <Input
                placeholder={t('search_by_number_or_reason', 'Search by number or reason...')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pr-8"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={limit.toString()}
              onValueChange={(v) => {
                setLimit(parseInt(v));
                setOffset(0);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">{t('per_page', 'per page')}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t('mobile_number', 'Mobile Number')}</TableHead>
                <TableHead className="font-semibold">{t('reason', 'Reason')}</TableHead>
                <TableHead className="font-semibold">{t('blocked_by', 'Blocked By')}</TableHead>
                <TableHead className="font-semibold">{t('blocked_on', 'Blocked On')}</TableHead>
                <TableHead className="font-semibold text-right">{t('action', 'Action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                    {t('no_blocked_numbers_found', 'No blocked numbers found')}
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id ?? record.mobile_number} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{record.mobile_number}</TableCell>
                    <TableCell className="max-w-xs truncate" title={record.reason || ''}>
                      {record.reason || '-'}
                    </TableCell>
                    <TableCell>{record.blocked_by || '-'}</TableCell>
                    <TableCell>{formatDate(record.blocked_at || record.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setPendingUnblock(record)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t('unblock', 'Unblock')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3 mt-6">
          <div className="text-sm text-gray-600">
            {t('showing_entries', 'Showing {{start}} to {{end}} of {{total}} entries', {
              start: showingFrom,
              end: showingTo,
              total: total,
            })}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0 || loading}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm text-gray-600">
              {t('page_of', 'Page {{current}} of {{total}}', {
                current: currentPage,
                total: totalPages,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setOffset((o) => o + limit)}
              disabled={offset + limit >= total || loading}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Block number dialog */}
      <Dialog open={isBlockOpen} onOpenChange={(open) => !saving && setIsBlockOpen(open)}>
        <DialogContent className="sm:max-w-[520px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              {t('block_number', 'Block Number')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'block_number_description',
                'Enter one or more 10 digit mobile numbers separated by comma, space or new line.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="numbers">{t('mobile_numbers', 'Mobile Numbers')}</Label>
              <Textarea
                id="numbers"
                rows={4}
                placeholder="9876543210, 9876543211"
                value={numbersInput}
                onChange={(e) => setNumbersInput(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                {t('numbers_entered', '{{count}} number(s) entered', {
                  count: parseNumbers(numbersInput).length,
                })}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">{t('reason', 'Reason')}</Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder={t('reason_placeholder', 'Why is this number being blocked?')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="text-xs text-gray-500">
              {t('blocked_by', 'Blocked By')}: <span className="font-medium">{blockedBy}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockOpen(false)} disabled={saving}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button onClick={handleBlock} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t('block', 'Block')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock confirmation dialog */}
      <Dialog
        open={Boolean(pendingUnblock)}
        onOpenChange={(open) => !unblocking && !open && setPendingUnblock(null)}
      >
        <DialogContent className="sm:max-w-[420px] bg-white">
          <DialogHeader>
            <DialogTitle>{t('unblock_number', 'Unblock Number')}</DialogTitle>
            <DialogDescription>
              {t(
                'unblock_number_confirm',
                'Are you sure you want to unblock {{number}}? They will be able to register and log in again.',
                { number: pendingUnblock?.mobile_number }
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingUnblock(null)} disabled={unblocking}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleUnblock}
              disabled={unblocking}
              className="bg-red-600 hover:bg-red-700"
            >
              {unblocking && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t('unblock', 'Unblock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlockedNumbers;
