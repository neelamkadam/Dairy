import { useState, useEffect, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { useAppSelector } from "@/redux/store";
import { reportsApi } from "@/services/reportsApi";
import { generatePLStatementPDF } from "@/templates/PLStatementTemplate";
import { toast } from "react-toastify";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  Droplet,
  Info,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import {
  normalisePLResponse,
  type PLLine,
  type PLStatementData,
} from "@/utils/plStatement";


const PLStatement = () => {
  const { t } = useTranslation();
  const branches = useAppSelector((state) => (state as any).branch.branches);

  const [selectedVLC, setSelectedVLC] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [statement, setStatement] = useState<PLStatementData | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedVlcObj = branches?.find((b: any) => b.branch_id.toString() === selectedVLC);

  // Same billing-cycle window the other reports use: picking any date snaps the
  // range to that VLC's cycle (10 / 15 / monthly), and To Date follows From Date.
  const calculateDateRange = (dateStr: string) => {
    if (!dateStr) return { from: '', to: '' };

    let year: number, month: number, day: number;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) {
        [year, month, day] = parts.map(Number);
      } else {
        [day, month, year] = parts.map(Number);
      }
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { from: '', to: '' };
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    }

    if (isNaN(year) || isNaN(month) || isNaN(day)) return { from: '', to: '' };

    const cycleDays = selectedVlcObj?.days || 10;
    const lastDayOfMonth = new Date(year, month, 0).getDate();

    let startDay: number, endDay: number;

    if (cycleDays === 15) {
      if (day >= 1 && day <= 15) {
        startDay = 1;
        endDay = 15;
      } else {
        startDay = 16;
        endDay = lastDayOfMonth;
      }
    } else if (cycleDays >= 28) {
      startDay = 1;
      endDay = lastDayOfMonth;
    } else {
      if (day >= 1 && day <= 10) {
        startDay = 1;
        endDay = 10;
      } else if (day >= 11 && day <= 20) {
        startDay = 11;
        endDay = 20;
      } else {
        startDay = 21;
        endDay = lastDayOfMonth;
      }
    }

    return {
      from: `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    };
  };

  const handleFromDateChange = (newDate: string) => {
    const dates = calculateDateRange(newDate);
    setFromDate(dates.from);
    setToDate(dates.to);
  };

  useEffect(() => {
    if (branches?.length > 0 && !selectedVLC) {
      setSelectedVLC(branches[0].branch_id.toString());
      const dates = calculateDateRange(new Date().toISOString().split('T')[0]);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
  }, [branches]);

  useEffect(() => {
    if (selectedVLC) {
      const dates = calculateDateRange(fromDate || new Date().toISOString().split('T')[0]);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
  }, [selectedVLC, branches]);

  const handleShow = async () => {
    if (!selectedVLC || !fromDate || !toDate) {
      toast.error(t('please_select_vlc_center_and_date_range', 'Please select a VLC centre and date range'));
      return;
    }

    setLoading(true);
    setApiUnavailable(false);
    setHasSearched(true);
    try {
      const response = await reportsApi.getProfitLossStatement({
        dairy_id: selectedVLC,
        from: fromDate,
        to: toDate,
      });
      setStatement(normalisePLResponse(response));
    } catch (error: any) {
      console.error(error);
      setStatement(null);
      const status = error?.response?.status;
      if (!status || status === 404 || status === 501) {
        setApiUnavailable(true);
      } else {
        toast.error(error?.response?.data?.message || t('failed_to_fetch_report', 'Failed to fetch report'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!statement) {
      toast.error(t('no_data_to_export', 'No data to export'));
      return;
    }
    generatePLStatementPDF({
      vlcName: selectedVlcObj?.name || selectedVlcObj?.branchName || '',
      dairyName: selectedVlcObj?.username || '',
      fromDate,
      toDate,
      ...statement,
    });
    toast.success(t('pdf_exported_successfully', 'PDF exported successfully'));
  };

  const money = (value: number) =>
    `₹${value < 0 ? '-' : ''}${Math.abs(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const isProfit = (statement?.netProfit ?? 0) >= 0;

  const dailyTotals = (statement?.daily ?? []).reduce(
    (acc, row) => ({
      collectionQuantity: acc.collectionQuantity + row.collectionQuantity,
      collectionCost: acc.collectionCost + row.collectionCost,
      perLiterCommission: acc.perLiterCommission + row.perLiterCommission,
      dispatchWeight: acc.dispatchWeight + row.dispatchWeight,
      dispatch: acc.dispatch + row.dispatchBaseAmount + row.dispatchCommission,
      income: acc.income + row.income,
      expense: acc.expense + row.expense,
    }),
    {
      collectionQuantity: 0,
      collectionCost: 0,
      perLiterCommission: 0,
      dispatchWeight: 0,
      dispatch: 0,
      income: 0,
      expense: 0,
    }
  );

  // daily[] excludes period charges, so the day rows must reconcile to
  // net_profit minus the flat fees. Surface it rather than assume it.
  const dailyNetSum = statement?.daily.reduce((sum, row) => sum + row.net, 0) ?? 0;
  const expectedDailyNet = (statement?.netProfit ?? 0) - (statement?.fixedCommissionTotal ?? 0);
  const dailyReconciles = Math.abs(dailyNetSum - expectedDailyNet) < 0.01;

  const kpis = statement ? [
    {
      label: t('total_income', 'Total Income'),
      value: money(statement.totalIncome),
      icon: TrendingUp,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: t('total_expenses', 'Total Expenses'),
      value: money(statement.totalExpenses),
      icon: TrendingDown,
      tone: 'text-rose-600 bg-rose-50',
    },
    {
      label: isProfit ? t('net_profit', 'Net Profit') : t('net_loss', 'Net Loss'),
      value: money(statement.netProfit),
      icon: Wallet,
      tone: isProfit ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50',
    },
    {
      label: t('margin', 'Margin'),
      value: `${statement.marginPercent.toFixed(2)}%`,
      icon: Percent,
      tone: isProfit ? 'text-blue-600 bg-blue-50' : 'text-rose-600 bg-rose-50',
    },
    {
      label: t('net_per_liter_collected', 'Net / Litre Collected'),
      value: money(statement.netPerLiterCollected),
      icon: Droplet,
      tone: 'text-indigo-600 bg-indigo-50',
    },
  ] : [];

  const renderSection = (
    title: string,
    lines: PLLine[],
    total: number,
    emptyLabel: string,
    tone: 'income' | 'expense'
  ) => (
    <Card className="overflow-hidden">
      <div className={`px-4 py-3 border-b ${tone === 'income' ? 'bg-emerald-50/60 border-emerald-100' : 'bg-rose-50/60 border-rose-100'}`}>
        <h2 className={`text-sm font-bold uppercase tracking-wider ${tone === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
          {title}
        </h2>
      </div>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={2}>
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <Fragment key={line.key}>
                  <tr className="border-b border-gray-100 align-top">
                    <td className="px-4 py-2.5 text-left">
                      <span className="font-medium text-gray-800">{line.label}</span>
                      {line.meta && (
                        <span className="block text-xs text-gray-500 mt-0.5">{line.meta}</span>
                      )}
                      {line.hint && (
                        <span className="block text-xs text-gray-400 mt-0.5 italic">{line.hint}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                      {money(line.amount)}
                    </td>
                  </tr>
                  {line.subLines?.map((sub) => (
                    <tr key={`${line.key}-${sub.label}`} className="border-b border-gray-100 bg-gray-50/40">
                      <td className="pl-8 pr-4 py-1.5 text-left text-xs text-gray-600">{sub.label}</td>
                      <td className="px-4 py-1.5 text-right text-xs text-gray-600 tabular-nums whitespace-nowrap">
                        {money(sub.amount)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td className="px-4 py-3 text-left font-bold text-gray-800">
                {tone === 'income' ? t('total_income', 'Total Income') : t('total_expenses', 'Total Expenses')}
              </td>
              <td className={`px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap ${tone === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {money(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-2 sm:p-4 bg-gray-50 min-h-screen">
      <div className="flex flex-col items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 px-2 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          {t('pl_statement', 'Profit & Loss Statement')}
        </h1>
        <p className="text-sm text-gray-600">
          {t('pl_statement_subtitle', 'Income, expenses and net result for the selected billing cycle')}
        </p>
      </div>

      {/* Filters — same VLC dropdown + billing-cycle date range as the other reports.
          No milk type / shift filter: revenue cannot be sliced the way cost can. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
        <div>
          <Label>{t('vlcc_center', 'VLCC Center')}</Label>
          <VLCDropdown
            branches={branches || []}
            value={selectedVLC}
            onChange={setSelectedVLC}
            valueKey="branch_id"
            placeholder={t('select_vlc_center', 'Select VLC Center')}
          />
        </div>

        <div>
          <Label>{t('from_date', 'From Date')}</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => handleFromDateChange(e.target.value)}
          />
        </div>

        <div>
          <Label>{t('to_date', 'To Date')}</Label>
          <Input type="date" value={toDate} disabled className="bg-gray-100 cursor-not-allowed" />
        </div>

        <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
          <Button className="bg-blue-600 text-white w-[120px]" onClick={handleShow} disabled={loading}>
            {loading ? t('loading', 'Loading...') : t('show', 'Show')}
          </Button>
          <Button
            className="bg-red-600 text-white flex items-center gap-2"
            onClick={handleExportPDF}
            disabled={!statement}
            variant="outline"
          >
            {t('export_pdf', 'Export PDF')}
          </Button>
        </div>
      </div>

      <div className="mx-2 space-y-4">
        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-16 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              {t('loading', 'Loading...')}
            </CardContent>
          </Card>
        )}

        {!loading && apiUnavailable && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="flex items-start gap-3 py-6 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">
                  {t('pl_api_unavailable', 'Profit & Loss API is not available yet')}
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  {t(
                    'pl_api_unavailable_desc',
                    'The report layout is ready. Figures will appear here as soon as the backend endpoint is live.'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !apiUnavailable && !statement && hasSearched && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                {t('no_data_found_for_selected_period', 'No data found for the selected period')}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !hasSearched && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                {t('select_filters_and_show', 'Select a VLC centre and date range, then press Show')}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && statement && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {kpis.map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="flex items-center gap-3 p-4 text-left">
                    <div className={`p-2.5 rounded-xl shrink-0 ${kpi.tone}`}>
                      <kpi.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
                        {kpi.label}
                      </p>
                      <p className="text-lg font-bold text-gray-900 tabular-nums truncate">{kpi.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Collections that fell outside every effective_from window earn zero
                commission here — unlike the Tally endpoint, which back-dates onto
                the oldest entry. Small differences between the two are expected. */}
            {statement.collectionsWithoutCommission > 0 && (
              <Card className="border-amber-200 bg-amber-50/60">
                <CardContent className="flex items-start gap-3 py-4 text-left">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">
                      {t('collections_without_commission', 'Collections without commission')}:{' '}
                      {statement.collectionsWithoutCommission}
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      {t(
                        'collections_without_commission_desc',
                        'These collections predate every configured effective date, so they earn zero commission. The Tally API falls back to the oldest entry instead — expect small commission differences between the two.'
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {renderSection(
                t('income', 'Income'),
                statement.income,
                statement.totalIncome,
                t('no_income_recorded', 'No income recorded for this period'),
                'income'
              )}
              {renderSection(
                t('expenses', 'Expenses'),
                statement.expenses,
                statement.totalExpenses,
                t('no_expenses_recorded', 'No expenses recorded for this period'),
                'expense'
              )}
            </div>

            <Card className={isProfit ? 'border-emerald-200' : 'border-rose-200'}>
              <CardContent
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 text-left ${
                  isProfit ? 'bg-emerald-50/60' : 'bg-rose-50/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {isProfit ? t('net_profit', 'Net Profit') : t('net_loss', 'Net Loss')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('total_income', 'Total Income')} − {t('total_expenses', 'Total Expenses')}
                    </p>
                  </div>
                  {statement.status && (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${
                        isProfit
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}
                    >
                      {statement.status}
                    </span>
                  )}
                </div>
                <p className={`text-2xl font-bold tabular-nums ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {money(statement.netProfit)}
                  <span className="text-sm font-semibold ml-2 text-gray-500">
                    ({statement.marginPercent.toFixed(2)}%)
                  </span>
                </p>
              </CardContent>
            </Card>

            {/* Period charges — fixed bills once per commission entry for the whole
                range, so it is listed apart from the per-day rows. */}
            {statement.periodCharges.length > 0 && (
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b bg-indigo-50/60 border-indigo-100">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-700">
                    {t('period_charges', 'Period Charges (Fixed)')}
                  </h2>
                  <p className="text-xs text-indigo-800/80 mt-0.5">
                    {t(
                      'period_charges_desc',
                      'Charged once per commission entry for the whole range — not once globally.'
                    )}
                  </p>
                </div>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-600">
                        <th className="px-4 py-2.5 text-left font-semibold">{t('entry', 'Entry')}</th>
                        <th className="px-4 py-2.5 text-left font-semibold">{t('reason', 'Reason')}</th>
                        <th className="px-4 py-2.5 text-right font-semibold">{t('amount', 'Amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.periodCharges.map((charge, index) => (
                        <tr key={`${charge.label}-${index}`} className="border-b border-gray-100 last:border-b-0">
                          <td className="px-4 py-2.5 text-left text-gray-800">{charge.label}</td>
                          <td className="px-4 py-2.5 text-left text-gray-500 text-xs">{charge.reason || '—'}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900 tabular-nums whitespace-nowrap">
                            {money(charge.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td className="px-4 py-3 text-left font-bold text-gray-800" colSpan={2}>
                          {t('total_fixed_charges', 'Total Fixed Charges')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                          {money(statement.fixedCommissionTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Daily rows deliberately exclude period charges. */}
            {statement.daily.length > 0 && (
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50 border-slate-200">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    {t('daily_breakdown', 'Daily Breakdown')}
                  </h2>
                  {statement.dailyExcludesPeriodCharges && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      {t(
                        'daily_breakdown_desc',
                        'Excludes fixed period charges — a flat range fee belongs to no single day.'
                      )}
                    </p>
                  )}
                </div>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-sm min-w-[920px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-600">
                          <th className="px-3 py-2.5 text-left font-semibold">{t('date', 'Date')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('collection_qty', 'Coll. Qty (L)')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('collection_cost', 'Coll. Cost')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('per_liter_commission', 'Per-Litre Comm.')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('dispatch_weight', 'Disp. Wt')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('dispatch_amount', 'Dispatch')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('income', 'Income')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('expenses', 'Expenses')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('net', 'Net')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.daily.map((row, index) => (
                          <tr key={`${row.date}-${index}`} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-3 py-2.5 text-left text-gray-800 whitespace-nowrap">{row.date}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{row.collectionQuantity.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{money(row.collectionCost)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{money(row.perLiterCommission)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{row.dispatchWeight.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                              {money(row.dispatchBaseAmount + row.dispatchCommission)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{money(row.income)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{money(row.expense)}</td>
                            <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${row.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {money(row.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="sticky bottom-0">
                        <tr className="bg-gray-50 border-t border-gray-200 font-bold text-gray-800">
                          <td className="px-3 py-3 text-left whitespace-nowrap">{t('total', 'Total')}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{dailyTotals.collectionQuantity.toFixed(2)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{money(dailyTotals.collectionCost)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{money(dailyTotals.perLiterCommission)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{dailyTotals.dispatchWeight.toFixed(2)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{money(dailyTotals.dispatch)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{money(dailyTotals.income)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-rose-700">{money(dailyTotals.expense)}</td>
                          <td className={`px-3 py-3 text-right tabular-nums whitespace-nowrap ${dailyNetSum >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {money(dailyNetSum)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className={`px-4 py-3 text-xs border-t ${dailyReconciles ? 'text-gray-500 border-gray-100' : 'text-amber-800 bg-amber-50 border-amber-200'}`}>
                    {dailyReconciles ? (
                      <>
                        {t('daily_reconciles', 'Reconciles')}: {t('sum_of_daily_net', 'Sum of daily net')} ={' '}
                        {t('net_profit', 'Net Profit')} − {t('total_fixed_charges', 'Total Fixed Charges')} ={' '}
                        <span className="font-semibold tabular-nums">{money(expectedDailyNet)}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                        {t('daily_does_not_reconcile', 'Daily rows do not reconcile')}:{' '}
                        {t('sum_of_daily_net', 'Sum of daily net')}{' '}
                        <span className="font-semibold tabular-nums">{money(dailyNetSum)}</span>{' '}
                        {t('expected', 'expected')}{' '}
                        <span className="font-semibold tabular-nums">{money(expectedDailyNet)}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PLStatement;
