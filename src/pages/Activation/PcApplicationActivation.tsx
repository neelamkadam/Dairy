import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { isAxiosError } from 'axios';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import {
  Search, ChevronLeft, ChevronRight, Loader2, KeyRound, Copy, Eye, Plus, Check,
  Info, LogIn, ShieldAlert, MessageSquareText
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ROUTES } from '@/constatnts/routesConstants';
import { clearLocalStorage } from '@/lib/common-utils';
import { resetAuthSlice } from '@/redux/AuthSlice';
import { useAppDispatch } from '@/redux/store';
import {
  pcLicenseApi,
  PcLicense,
  PcLicenseKind,
  normalizeRequestCode,
  formatRequestCode,
} from '@/services/pcLicenseApi';

// Matches RENEWAL_WARNING_DAYS in the PC app, which starts nagging the operator
// at the same point.
const RENEWAL_WARNING_DAYS = 15;

const fmtDate = (value?: string | Date | null) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : format(d, 'dd-MM-yyyy');
};

/**
 * Keeps the Request Code field in the 4E8A-4AAB-… shape while typing or
 * pasting. Codes are often dictated over the phone, so O/I/L (never valid hex)
 * are read as 0/1/1; anything else outside 0-9A-F is dropped.
 */
const formatCodeInput = (raw: string) => {
  const hex = raw
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/[^0-9A-F]/g, '')
    .slice(0, 32);
  return (hex.match(/.{1,4}/g) ?? []).join('-');
};

const errorStatus = (error: unknown) =>
  isAxiosError(error) ? error.response?.status : undefined;

const errorMessage = (error: unknown): string | undefined =>
  isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message : undefined;

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

type StatusKind = 'active' | 'expiring' | 'expired' | 'renewed';

const STATUS_STYLES: Record<StatusKind, { pill: string; dot: string }> = {
  active: { pill: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  expiring: { pill: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  expired: { pill: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  renewed: { pill: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
};

const EMPTY_FORM = {
  requestCode: '',
  dairyName: '',
  customerMobile: '',
  kind: 'licensed' as PcLicenseKind,
  durationDays: '365',
  saleType: 'self' as 'self' | 'dealer',
  dealerName: '',
  commission: '',
  saleAmount: '',
  renewalAmount: '',
  remark: '',
};

export const PcApplicationActivation: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [licenses, setLicenses] = useState<PcLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<'login' | 'forbidden' | null>(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [shownLicense, setShownLicense] = useState<PcLicense | null>(null);
  const [justIssued, setJustIssued] = useState<{ extended: boolean } | null>(null);

  const handleAuthError = (error: unknown) => {
    const status = errorStatus(error);
    if (status === 401) {
      setAccessError('login');
      return true;
    }
    if (status === 403) {
      setAccessError('forbidden');
      return true;
    }
    return false;
  };

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await pcLicenseApi.getLicenses();
      setLicenses(data.data || []);
      setAccessError(null);
    } catch (error) {
      if (!handleAuthError(error)) {
        console.error('Error fetching PC licences:', error);
        toast.error(errorMessage(error) || t('failed_to_fetch_pc_licences', 'Failed to fetch PC licences'));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const relogin = () => {
    clearLocalStorage();
    dispatch(resetAuthSlice());
    navigate(ROUTES.AUTH.LOGIN);
  };

  // Latest expiry per machine, so older keys for a PC that has since been
  // renewed read as "Renewed" rather than "Expired".
  const latestByMachine = useMemo(() => {
    const map = new Map<string, number>();
    licenses.forEach(l => {
      const to = new Date(l.valid_to).getTime();
      if (to > (map.get(l.machine_id) ?? 0)) map.set(l.machine_id, to);
    });
    return map;
  }, [licenses]);

  const statusOf = (l: PcLicense): { kind: StatusKind; label: string } => {
    const to = new Date(l.valid_to);
    if (to.getTime() < (latestByMachine.get(l.machine_id) ?? 0)) {
      return { kind: 'renewed', label: t('renewed', 'Renewed') };
    }
    const daysLeft = differenceInCalendarDays(to, new Date());
    if (daysLeft < 0) return { kind: 'expired', label: t('expired', 'Expired') };
    if (daysLeft <= RENEWAL_WARNING_DAYS) {
      return { kind: 'expiring', label: t('expires_in_days', '{{count}} days left', { count: daysLeft }) };
    }
    return { kind: 'active', label: t('active', 'Active') };
  };

  const filtered = useMemo(() => {
    const term = appliedSearch.trim().toLowerCase();
    if (!term) return licenses;
    const bare = term.replace(/[\s-]/g, '');
    return licenses.filter(l =>
      l.machine_id.toLowerCase().includes(bare) ||
      [l.dairy_name, l.customer_mobile, l.dealer_name, l.remark]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [licenses, appliedSearch]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSearch = () => {
    setAppliedSearch(search);
    setCurrentPage(1);
  };

  // ---- Issue dialog -------------------------------------------------------

  const machineId = normalizeRequestCode(form.requestCode);
  const durationNum = Number.parseInt(form.durationDays, 10);
  const durationValid = Number.isFinite(durationNum) && durationNum >= 1 && durationNum <= 3660;

  // Preview of what the server will do: an early renewal continues from the
  // current expiry. The server works this out again; this is only for display.
  const previous = useMemo(() => {
    if (!machineId) return null;
    const forMachine = licenses
      .filter(l => l.machine_id === machineId)
      .sort((a, b) => new Date(b.valid_to).getTime() - new Date(a.valid_to).getTime());
    return forMachine[0] ?? null;
  }, [licenses, machineId]);

  const now = new Date();
  const latestLicensedEnd =
    form.kind === 'licensed' && machineId
      ? licenses
          .filter(l => l.machine_id === machineId && l.kind === 'licensed')
          .reduce((max, l) => Math.max(max, new Date(l.valid_to).getTime()), 0)
      : 0;
  const extendsPrevious = latestLicensedEnd > now.getTime();
  const previewStart = extendsPrevious ? new Date(latestLicensedEnd) : now;
  const previewEnd = durationValid ? addDays(previewStart, durationNum) : null;

  const openIssueDialog = (prefill?: PcLicense) => {
    setForm(
      prefill
        ? {
            ...EMPTY_FORM,
            requestCode: formatRequestCode(prefill.machine_id),
            dairyName: prefill.dairy_name || '',
            customerMobile: prefill.customer_mobile || '',
            saleType: prefill.sale_type,
            dealerName: prefill.dealer_name || '',
            renewalAmount: Number(prefill.renewal_amount) > 0 ? String(prefill.renewal_amount) : '',
          }
        : EMPTY_FORM
    );
    setIsIssueOpen(true);
  };

  // When the code belongs to a PC we already know, fill in who it belongs to.
  useEffect(() => {
    if (!previous) return;
    setForm(f => ({
      ...f,
      dairyName: f.dairyName || previous.dairy_name || '',
      customerMobile: f.customerMobile || previous.customer_mobile || '',
    }));
  }, [previous]);

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const canSubmit =
    !!machineId &&
    durationValid &&
    (form.saleType === 'self' || form.dealerName.trim().length > 0) &&
    !submitting;

  const handleIssue = async () => {
    if (!canSubmit || !machineId) return;
    setSubmitting(true);
    try {
      const { data } = await pcLicenseApi.issueLicense({
        request_code: machineId,
        duration_days: durationNum,
        kind: form.kind,
        dairy_name: form.dairyName.trim() || undefined,
        customer_mobile: form.customerMobile.trim() || undefined,
        sale_type: form.saleType,
        dealer_name: form.saleType === 'dealer' ? form.dealerName.trim() : undefined,
        dealer_commission: form.saleType === 'dealer' ? Number(form.commission) || 0 : undefined,
        sale_amount: Number(form.saleAmount) || 0,
        renewal_amount: Number(form.renewalAmount) || 0,
        remark: form.remark.trim() || undefined,
      });
      if (data.success) {
        toast.success(t('licence_key_issued', 'Licence key issued'));
        setLicenses(prev => [data.data, ...prev]);
        setIsIssueOpen(false);
        setForm(EMPTY_FORM);
        setJustIssued({ extended: data.extended_from_previous });
        setShownLicense(data.data);
      }
    } catch (error) {
      if (handleAuthError(error)) {
        setIsIssueOpen(false);
      } else {
        toast.error(errorMessage(error) || t('failed_to_issue_licence_key', 'Failed to issue licence key'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Key dialog ---------------------------------------------------------

  const dealerMessage = (l: PcLicense) =>
    [
      `Doodh Setu PC licence key${l.dairy_name ? ` for ${l.dairy_name}` : ''}`,
      `Request code: ${formatRequestCode(l.machine_id)}`,
      `Valid until: ${fmtDate(l.valid_to)}`,
      '',
      'Open Doodh Setu > Activation, paste this key and click Activate:',
      '',
      l.license_key,
    ].join('\n');

  const handleCopy = async (text: string, what: string) => {
    if (await copyText(text)) {
      toast.success(what);
    } else {
      toast.error(t('copy_failed_select_manually', 'Copy failed. Select the key and copy it manually.'));
    }
  };

  // ---- Render -------------------------------------------------------------

  const fieldLabel = 'text-[11px] font-bold text-slate-400 uppercase tracking-wider';
  const fieldInput = 'h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('pc_application_activation', 'PC Application Activation')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t(
                'pc_activation_subtitle',
                'Enter the Request Code shown on the customer\'s PC to generate their licence key.'
              )}
            </p>
          </div>
          <Button
            onClick={() => openIssueDialog()}
            disabled={!!accessError}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('issue_licence_key', 'Issue Licence Key')}
          </Button>
        </div>

        {accessError ? (
          <div className="flex flex-col items-center text-center gap-3 py-16 px-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <div className="p-3 rounded-full bg-amber-100 text-amber-600">
              {accessError === 'login' ? <LogIn size={24} /> : <ShieldAlert size={24} />}
            </div>
            <p className="font-semibold text-slate-800">
              {accessError === 'login'
                ? t('pc_licence_login_required', 'Log in again to issue PC licences')
                : t('admin_access_required', 'Admin access required')}
            </p>
            <p className="text-sm text-slate-500 max-w-md">
              {accessError === 'login'
                ? t(
                    'pc_licence_login_required_desc',
                    'Issuing licence keys needs a secure admin session. Your current session was started before this was turned on, or it has expired.'
                  )
                : t('pc_licence_forbidden_desc', 'Only super admins can issue PC licence keys.')}
            </p>
            {accessError === 'login' && (
              <Button onClick={relogin} className="bg-blue-600 hover:bg-blue-700 text-white mt-1">
                {t('log_in_again', 'Log in again')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder={t('search_pc_licences', 'Search by request code, dairy, mobile, dealer...')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="max-w-sm"
                />
                <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select value={perPage.toString()} onValueChange={v => { setPerPage(parseInt(v)); setCurrentPage(1); }}>
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
                    <TableHead className="font-semibold">{t('request_code', 'Request Code')}</TableHead>
                    <TableHead className="font-semibold">{t('dairy_name', 'Dairy Name')}</TableHead>
                    <TableHead className="font-semibold">{t('mobile', 'Mobile')}</TableHead>
                    <TableHead className="font-semibold">{t('sale', 'Sale')}</TableHead>
                    <TableHead className="font-semibold">{t('issued_on', 'Issued On')}</TableHead>
                    <TableHead className="font-semibold">{t('valid_until', 'Valid Until')}</TableHead>
                    <TableHead className="font-semibold">{t('status', 'Status')}</TableHead>
                    <TableHead className="font-semibold text-right pr-6">{t('action', 'Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                        <Loader2 className="inline animate-spin mr-2" size={16} />
                        {t('loading', 'Loading...')}
                      </TableCell>
                    </TableRow>
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                        {appliedSearch
                          ? t('no_matching_pc_licences', 'No licences match this search.')
                          : t('no_pc_licences_yet', 'No PC licences issued yet. Click "Issue Licence Key" to create the first one.')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map(l => {
                      const status = statusOf(l);
                      const style = STATUS_STYLES[status.kind];
                      return (
                        <TableRow key={l.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-xs tracking-wide whitespace-nowrap">
                            {formatRequestCode(l.machine_id)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {l.dairy_name || '-'}
                            {l.kind === 'demo' && (
                              <span className="ml-2 text-[10px] font-bold uppercase text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
                                {t('trial', 'Trial')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{l.customer_mobile || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="text-xs font-bold uppercase text-slate-500">
                              {l.sale_type === 'dealer' ? (l.dealer_name || t('dealer', 'Dealer')) : t('self', 'Self')}
                            </span>
                            {Number(l.sale_amount) > 0 && (
                              <span className="ml-2 text-sm tabular-nums">₹{Number(l.sale_amount).toLocaleString('en-IN')}</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap tabular-nums">{fmtDate(l.created_at)}</TableCell>
                          <TableCell className="whitespace-nowrap tabular-nums">{fmtDate(l.valid_to)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm whitespace-nowrap ${style.pill}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                              {status.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(l.license_key, t('licence_key_copied', 'Licence key copied'))}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                title={t('copy_licence_key', 'Copy licence key')}
                              >
                                <Copy size={15} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setJustIssued(null); setShownLicense(l); }}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                title={t('view_licence', 'View licence')}
                              >
                                <Eye size={15} />
                              </Button>
                              {status.kind !== 'renewed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openIssueDialog(l)}
                                  className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  {t('renew', 'Renew')}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-600">
                {t('showing_entries', 'Showing {{start}} to {{end}} of {{total}} entries', {
                  start: filtered.length > 0 ? (currentPage - 1) * perPage + 1 : 0,
                  end: Math.min(currentPage * perPage, filtered.length),
                  total: filtered.length,
                })}
              </div>
              <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm text-gray-600">
                  {t('page_of', 'Page {{current}} of {{total}}', { current: currentPage, total: totalPages || 1 })}
                </span>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Issue licence key */}
      <Dialog open={isIssueOpen} onOpenChange={open => !submitting && setIsIssueOpen(open)}>
        <DialogContent className="sm:max-w-[640px] bg-slate-50 p-0 overflow-hidden border-none shadow-2xl max-h-[92vh] overflow-y-auto">
          <div className="p-8">
            <div className="flex justify-between items-start mb-6 gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <KeyRound className="text-blue-500" size={20} />
                  {t('issue_licence_key', 'Issue Licence Key')}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {t('issue_licence_key_desc', 'The key works only on the PC that shows this Request Code.')}
                </p>
              </div>
              <div className="flex p-1 bg-slate-200/50 rounded-xl border border-slate-200 mr-6 shrink-0">
                {(['licensed', 'demo'] as const).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, kind: k, durationDays: k === 'demo' ? '30' : '365' }))}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      form.kind === k ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {k === 'licensed' ? t('full_licence', 'Full licence') : t('trial', 'Trial')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className={fieldLabel}>{t('request_code', 'Request Code')}</label>
                <div className="relative">
                  <Input
                    autoFocus
                    placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                    value={form.requestCode}
                    onChange={e => setField('requestCode', formatCodeInput(e.target.value))}
                    spellCheck={false}
                    autoComplete="off"
                    className={`${fieldInput} font-mono tracking-wider pr-10`}
                  />
                  {machineId && <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />}
                </div>
                <p className="text-[11px] text-slate-500">
                  {machineId
                    ? t('request_code_ok', 'Code looks right.')
                    : t('request_code_hint', '32 characters (0-9, A-F), shown on the PC\'s activation screen. {{n}} of 32 entered.', {
                        n: form.requestCode.replace(/-/g, '').length,
                      })}
                </p>
              </div>

              {previous && (
                <div className="flex gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-800">
                  <Info size={18} className="shrink-0 mt-0.5" />
                  <div>
                    {t('pc_known_licence', 'This PC already has a key ({{dairy}}) valid until {{date}}.', {
                      dairy: previous.dairy_name || t('unnamed', 'unnamed'),
                      date: fmtDate(previous.valid_to),
                    })}
                    {extendsPrevious && (
                      <> {t('renewal_continues', 'The new key continues from that date, so no days are lost.')}</>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={fieldLabel}>{t('dairy_name', 'Dairy Name')}</label>
                  <Input value={form.dairyName} onChange={e => setField('dairyName', e.target.value)} placeholder={t('eg_shree_dairy', 'e.g. Shree Dairy')} className={fieldInput} />
                </div>
                <div className="space-y-1.5">
                  <label className={fieldLabel}>{t('customer_mobile', 'Customer Mobile')}</label>
                  <Input value={form.customerMobile} onChange={e => setField('customerMobile', e.target.value)} inputMode="tel" placeholder="98765 43210" className={fieldInput} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={fieldLabel}>{t('duration_days', 'Duration (Days)')}</label>
                  <Input type="number" min={1} max={3660} value={form.durationDays} onChange={e => setField('durationDays', e.target.value)} className={fieldInput} />
                </div>
                <div className="space-y-1.5">
                  <label className={fieldLabel}>{t('valid_until', 'Valid Until')}</label>
                  <div className="h-11 px-3 flex items-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 tabular-nums">
                    {previewEnd ? fmtDate(previewEnd) : '-'}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4 mt-4">
                  <p className="text-sm font-bold text-slate-700">{t('sale_details', 'Sale Details')}</p>
                  <div className="flex p-1 bg-slate-200/50 rounded-xl border border-slate-200">
                    {(['self', 'dealer'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setField('saleType', s)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          form.saleType === s ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {s === 'self' ? t('self', 'Self') : t('dealer', 'Dealer')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {form.saleType === 'dealer' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={fieldLabel}>{t('dealer_name', 'Dealer Name')}</label>
                        <Input value={form.dealerName} onChange={e => setField('dealerName', e.target.value)} placeholder={t('select_or_enter_dealer_name', 'Select or enter dealer name')} className={fieldInput} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={fieldLabel}>{t('comm_rs', 'Comm. (₹)')}</label>
                        <Input type="number" placeholder="0.00" value={form.commission} onChange={e => setField('commission', e.target.value)} className={fieldInput} />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>{t('sale_amount_rs', 'Sale Amount (₹)')}</label>
                      <Input type="number" placeholder="0.00" value={form.saleAmount} onChange={e => setField('saleAmount', e.target.value)} className={fieldInput} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>{t('annual_renewal_rs', 'Annual Renewal (₹)')}</label>
                      <Input type="number" placeholder="0.00" value={form.renewalAmount} onChange={e => setField('renewalAmount', e.target.value)} className={fieldInput} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className={fieldLabel}>{t('internal_remarks', 'Internal Remarks')}</label>
                    <Input placeholder={t('notes', 'Notes...')} value={form.remark} onChange={e => setField('remark', e.target.value)} className={fieldInput} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="ghost" onClick={() => setIsIssueOpen(false)} disabled={submitting} className="flex-1 rounded-xl h-12 font-bold text-slate-500 hover:bg-slate-200">
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                className="flex-[2] text-white rounded-xl h-12 font-bold shadow-lg bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                disabled={!canSubmit}
                onClick={handleIssue}
              >
                {submitting ? <Loader2 className="animate-spin mr-2" size={20} /> : <KeyRound className="mr-2" size={18} />}
                {t('generate_key', 'Generate Key')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show / copy a key */}
      <Dialog open={!!shownLicense} onOpenChange={open => { if (!open) { setShownLicense(null); setJustIssued(null); } }}>
        <DialogContent className="sm:max-w-[600px] bg-white p-0 overflow-hidden border-none shadow-2xl">
          {shownLicense && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2.5 rounded-xl ${justIssued ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  {justIssued ? <Check size={22} /> : <KeyRound size={22} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {justIssued ? t('licence_key_ready', 'Licence key ready') : t('licence_key', 'Licence key')}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {shownLicense.dairy_name || formatRequestCode(shownLicense.machine_id)} · {t('valid_until', 'Valid Until')} {fmtDate(shownLicense.valid_to)}
                  </p>
                </div>
              </div>

              {justIssued?.extended && (
                <div className="flex gap-3 p-3 mb-4 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-800">
                  <Info size={18} className="shrink-0 mt-0.5" />
                  {t('renewal_extended_note', 'Renewed early: the new term starts when the current one ends.')}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">{t('request_code', 'Request Code')}</p>
                  <p className="font-mono text-xs break-all">{formatRequestCode(shownLicense.machine_id)}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">{t('reference', 'Reference')}</p>
                  <p className="font-mono text-xs">PC-{shownLicense.id} · {shownLicense.kind === 'demo' ? t('trial', 'Trial') : t('full_licence', 'Full licence')}</p>
                </div>
              </div>

              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('licence_key', 'Licence key')}</label>
              <Textarea
                readOnly
                value={shownLicense.license_key}
                onFocus={e => e.currentTarget.select()}
                className="mt-1.5 font-mono text-xs leading-relaxed bg-slate-50 border-slate-200 rounded-xl min-h-[110px] break-all"
              />
              <p className="text-[11px] text-slate-500 mt-2">
                {t('licence_key_instructions', 'On the PC: Activation screen → paste into "Step 2 — Paste the licence key" → Activate. Internet is not needed for this step.')}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleCopy(dealerMessage(shownLicense), t('message_copied', 'Message copied'))}
                  className="flex-1 rounded-xl h-11 font-bold"
                >
                  <MessageSquareText size={16} className="mr-2" />
                  {t('copy_message_for_dealer', 'Copy message for dealer')}
                </Button>
                <Button
                  onClick={() => handleCopy(shownLicense.license_key, t('licence_key_copied', 'Licence key copied'))}
                  className="flex-1 rounded-xl h-11 font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Copy size={16} className="mr-2" />
                  {t('copy_key', 'Copy key')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
