import { useState, useEffect, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { useAppSelector } from "@/redux/store";
import { useVlcNumbering } from "@/utils/vlcSectionLabel";
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
  Receipt,
} from "lucide-react";

import {
  normalisePLResponse,
  type PLLine,
  type PLStatementData,
} from "@/utils/plStatement";

type Shift = 'Morning' | 'Evening';


const PLStatement = () => {
  const { t } = useTranslation();
  const branches = useAppSelector((state) => (state as any).branch.branches);
  // VLC numbers (1, 2, 3 …) for the web user who uses them; "" for everyone else.
  const vlcNo = useVlcNumbering();

  const [selectedVLC, setSelectedVLC] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [fromShift, setFromShift] = useState<Shift>('Morning');
  const [toDate, setToDate] = useState<string>('');
  const [toShift, setToShift] = useState<Shift>('Evening');
  const [loading, setLoading] = useState(false);
  const [statement, setStatement] = useState<PLStatementData | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedVlcObj = branches?.find((b: any) => b.branch_id.toString() === selectedVLC);

  // The billing cycle (10 / 15 / monthly) containing `dateStr` — used only to pre-fill
  // the window; after that both ends and their shifts are free to change.
  const calculateDateRange = (dateStr: string, cycleDays = 10) => {
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

  // Keep the window the right way round: moving one end past the other drags it along.
  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    if (value && toDate && value > toDate) setToDate(value);
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    if (value && fromDate && value < fromDate) setFromDate(value);
  };

  // Pre-fill with the first VLC's current billing cycle, whole days (Morning → Evening).
  useEffect(() => {
    if (branches?.length > 0 && !selectedVLC) {
      setSelectedVLC(branches[0].branch_id.toString());
      const dates = calculateDateRange(new Date().toISOString().split('T')[0], branches[0].days || 10);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
  }, [branches]);

  const shiftLabel = (shift: string) => {
    const s = shift.toLowerCase();
    if (s === 'morning') return t('morning', 'Morning');
    if (s === 'evening') return t('evening', 'Evening');
    return shift;
  };

  const renderShiftSelect = (value: Shift, onChange: (shift: Shift) => void) => (
    <Select value={value} onValueChange={(next) => onChange(next as Shift)}>
      <SelectTrigger className="w-full h-10 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white">
        <SelectItem value="Morning">{t('morning', 'Morning')}</SelectItem>
        <SelectItem value="Evening">{t('evening', 'Evening')}</SelectItem>
      </SelectContent>
    </Select>
  );

  const handleShow = async () => {
    if (!selectedVLC || !fromDate || !toDate) {
      toast.error(t('please_select_vlc_center_and_date_range', 'Please select a VLC centre and date range'));
      return;
    }
    // Evening → Morning of the same day is an empty window.
    if (fromDate > toDate || (fromDate === toDate && fromShift === 'Evening' && toShift === 'Morning')) {
      toast.error(t('pl_invalid_shift_window', 'The From date and shift must come before the To date and shift'));
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
        from_shift: fromShift,
        to_shift: toShift,
      });
      const data = normalisePLResponse(response);
      // Fill any end the backend didn't echo back with what was asked for.
      data.period = {
        from: data.period.from || fromDate,
        fromShift: data.period.fromShift || fromShift,
        to: data.period.to || toDate,
        toShift: data.period.toShift || toShift,
      };
      setStatement(data);
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
    // Print the window the report was built for, not whatever the filters say now.
    generatePLStatementPDF({
      vlcName: selectedVlcObj?.name || selectedVlcObj?.branchName || '',
      dairyName: selectedVlcObj?.username ? `${vlcNo.prefix(selectedVlcObj.username)}${selectedVlcObj.username}` : '',
      ...statement,
      fromDate: statement.period.from,
      toDate: statement.period.to,
      fromShift: statement.period.fromShift,
      toShift: statement.period.toShift,
    });
    toast.success(t('pdf_exported_successfully', 'PDF exported successfully'));
  };

  const money = (value: number) =>
    `₹${value < 0 ? '-' : ''}${Math.abs(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const isProfit = (statement?.netProfit ?? 0) >= 0;

  // A single-shift end means the backend placed dispatches by time on that day.
  const partialWindow =
    !!statement &&
    (statement.period.fromShift.toLowerCase() === 'evening' || statement.period.toShift.toLowerCase() === 'morning');

  const dailyTotals = (statement?.daily ?? []).reduce(
    (acc, row) => ({
      collectionQuantity: acc.collectionQuantity + row.collectionQuantity,
      collectionCost: acc.collectionCost + row.collectionCost,
      purchaseCommission: acc.purchaseCommission + row.purchaseCommission,
      dispatchWeight: acc.dispatchWeight + row.dispatchWeight,
      income: acc.income + row.income,
      expense: acc.expense + row.expense,
      otherExpenses: acc.otherExpenses + row.otherExpenses,
    }),
    {
      collectionQuantity: 0,
      collectionCost: 0,
      purchaseCommission: 0,
      dispatchWeight: 0,
      income: 0,
      expense: 0,
      otherExpenses: 0,
    }
  );

  // daily[] leaves out the fixed slice of purchase commission — an expense — so
  // the day rows read HIGH by exactly that amount. Surface it rather than assume it.
  const dailyNetSum = statement?.daily.reduce((sum, row) => sum + row.net, 0) ?? 0;
  const expectedDailyNet = (statement?.netProfit ?? 0) + (statement?.fixedCommissionTotal ?? 0);
  const dailyReconciles = Math.abs(dailyNetSum - expectedDailyNet) < 0.01;

  const farmerTotals = (statement?.farmers ?? []).reduce(
    (acc, row) => ({
      entries: acc.entries + row.entries,
      quantity: acc.quantity + row.quantity,
      purchaseAmount: acc.purchaseAmount + row.purchaseAmount,
      commissionTotal: acc.commissionTotal + row.commissionTotal,
      totalCost: acc.totalCost + row.totalCost,
    }),
    { entries: 0, quantity: 0, purchaseAmount: 0, commissionTotal: 0, totalCost: 0 }
  );

  // Milk purchase leads: this report is read cost-first, so the cost tile sits
  // ahead of the sale tile.
  const kpis = statement ? [
    {
      label: t('milk_purchase', 'Total Milk Purchase'),
      value: money(statement.totalExpenses),
      icon: TrendingDown,
      tone: 'text-rose-600 bg-rose-50',
    },
    {
      label: t('milk_sale', 'Total Milk Sale'),
      value: money(statement.totalIncome),
      icon: TrendingUp,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: t('other_expenses', 'Other Expenses'),
      value: money(statement.otherExpensesTotal),
      icon: Receipt,
      tone: 'text-amber-600 bg-amber-50',
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
    tone: 'income' | 'expense',
    totalLabel?: string
  ) => (
    <Card className="overflow-hidden py-0 gap-0">
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
                {totalLabel ?? (tone === 'income' ? t('total_milk_sale', 'Total Milk Sale') : t('total_milk_purchase', 'Total Milk Purchase'))}
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

      {/* Filters — a free From/To window with a shift at each end, like the Total
          Collection report. No milk type filter: revenue cannot be sliced the way cost can. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
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
            className="h-10"
          />
        </div>

        <div>
          <Label>{t('from_shift', 'From Shift')}</Label>
          {renderShiftSelect(fromShift, setFromShift)}
        </div>

        <div>
          <Label>{t('to_date', 'To Date')}</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => handleToDateChange(e.target.value)}
            className="h-10"
          />
        </div>

        <div>
          <Label>{t('to_shift', 'To Shift')}</Label>
          {renderShiftSelect(toShift, setToShift)}
        </div>

        <div className="sm:col-span-2 md:col-span-3 xl:col-span-5 flex flex-wrap gap-2 justify-end">
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
          <Card className="border-amber-200 bg-amber-50/60 py-0 gap-0">
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
            <p className="text-xs text-gray-500 text-left px-1">
              {t('period', 'Period')}:{' '}
              <span className="font-semibold text-gray-700">
                {statement.period.from} ({shiftLabel(statement.period.fromShift)}) → {statement.period.to} ({shiftLabel(statement.period.toShift)})
              </span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpis.map((kpi) => (
                <Card key={kpi.label} className="py-0 gap-0">
                  <CardContent className="flex items-center gap-3 px-4 py-3 text-left">
                    <div className={`p-2.5 rounded-xl shrink-0 ${kpi.tone}`}>
                      <kpi.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      {/* leading-5: truncate clips overflow, and the default 1rem line box
                          cuts off Devanagari vowel signs above the letters. */}
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-5 truncate">
                        {kpi.label}
                      </p>
                      <p className="text-lg font-bold text-gray-900 tabular-nums truncate">{kpi.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {statement.warnings.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/60 py-0 gap-0">
                <CardContent className="flex items-start gap-3 py-4 text-left">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">
                      {t('warnings', 'Warnings')}
                    </p>
                    <ul className="text-xs text-amber-800 mt-1 list-disc pl-4 space-y-0.5">
                      {statement.warnings.map((warning, index) => (
                        <li key={`${warning}-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Collections that fell outside every effective_from window earn zero
                commission here — unlike the Tally endpoint, which back-dates onto
                the oldest entry. Small differences between the two are expected. */}
            {statement.collectionsWithoutCommission > 0 && (
              <Card className="border-amber-200 bg-amber-50/60 py-0 gap-0">
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

            {/* Dispatches with no time are counted as Morning — that only matters when
                an end of the window is a single shift. */}
            {partialWindow && statement.dispatchesWithoutTime > 0 && (
              <Card className="border-amber-200 bg-amber-50/60 py-0 gap-0">
                <CardContent className="flex items-start gap-3 py-4 text-left">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">
                      {t('dispatches_without_time', 'Dispatches without a time')}: {statement.dispatchesWithoutTime}
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      {t(
                        'dispatches_without_time_desc',
                        'These dispatches have no time saved, so they were counted in the Morning shift. On a partial first or last day that can move their sale into or out of this period.'
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {renderSection(
                t('milk_purchase', 'Milk Purchase'),
                statement.expenses,
                statement.totalExpenses,
                t('no_milk_purchase_recorded', 'No milk purchase recorded for this period'),
                'expense'
              )}
              {renderSection(
                t('milk_sale', 'Milk Sale'),
                statement.income,
                statement.totalIncome,
                t('no_milk_sale_recorded', 'No milk sale recorded for this period'),
                'income'
              )}
            </div>

            {/* Other expenses come from the Other Expense master page and are taken
                off gross profit to reach the final result. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {renderSection(
                t('other_expenses', 'Other Expenses'),
                statement.otherExpenses,
                statement.otherExpensesTotal,
                t('no_other_expenses_recorded', 'No other expenses recorded for this period'),
                'expense',
                t('total_other_expenses', 'Total Other Expenses')
              )}

              <Card className={`overflow-hidden py-0 gap-0 ${isProfit ? 'border-emerald-200' : 'border-rose-200'}`}>
                <div className="px-4 py-3 border-b bg-slate-50 border-slate-200">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    {t('profit_summary', 'Profit Summary')}
                  </h2>
                </div>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="px-4 py-2.5 text-left text-gray-700">{t('total_milk_sale', 'Total Milk Sale')}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                          {money(statement.totalIncome)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="px-4 py-2.5 text-left text-gray-700">{t('less_milk_purchase', 'Less: Milk Purchase')}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-rose-700 tabular-nums whitespace-nowrap">
                          {money(-statement.totalExpenses)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/60">
                        <td className="px-4 py-2.5 text-left font-bold text-gray-800">{t('gross_profit', 'Gross Profit')}</td>
                        <td className={`px-4 py-2.5 text-right font-bold tabular-nums whitespace-nowrap ${statement.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {money(statement.grossProfit)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="px-4 py-2.5 text-left text-gray-700">{t('less_other_expenses', 'Less: Other Expenses')}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-rose-700 tabular-nums whitespace-nowrap">
                          {money(-statement.otherExpensesTotal)}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className={isProfit ? 'bg-emerald-50/60' : 'bg-rose-50/60'}>
                        <td className="px-4 py-3 text-left">
                          <span className="font-bold text-gray-800">
                            {isProfit ? t('net_profit', 'Net Profit') : t('net_loss', 'Net Loss')}
                          </span>
                          {statement.status && (
                            <span
                              className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide border ${
                                isProfit
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-rose-100 text-rose-800 border-rose-200'
                              }`}
                            >
                              {statement.status}
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums whitespace-nowrap ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                          <span className="block text-xl font-bold">{money(statement.netProfit)}</span>
                          <span className="block text-xs font-semibold text-gray-500">
                            {t('margin', 'Margin')} {statement.marginPercent.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* Farmer-wise cost — purchase plus the commission rule that fired for
                that farmer, which is where the expense-side commission comes from. */}
            {statement.farmers.length > 0 && (
              <Card className="overflow-hidden py-0 gap-0">
                <div className="px-4 py-3 border-b bg-rose-50/60 border-rose-100">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700">
                    {t('farmer_wise_cost', 'Farmer-wise Cost')}
                  </h2>
                  <p className="text-xs text-rose-800/80 mt-0.5">
                    {t(
                      'farmer_wise_cost_desc',
                      'Purchase amount plus the purchase commission rule applied to each farmer.'
                    )}
                  </p>
                </div>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-sm min-w-[880px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-600">
                          <th className="px-3 py-2.5 text-left font-semibold">{t('code', 'Code')}</th>
                          <th className="px-3 py-2.5 text-left font-semibold">{t('farmer_name', 'Farmer Name')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('entries', 'Entries')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('quantity', 'Qty (L)')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('purchase_amount', 'Purchase Amt')}</th>
                          <th className="px-3 py-2.5 text-left font-semibold">{t('commission_rule', 'Commission Rule')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('commission', 'Commission')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('total_cost', 'Total Cost')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.farmers.map((row, index) => (
                          <tr key={`${row.farmerId}-${index}`} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-3 py-2.5 text-left text-gray-700 whitespace-nowrap">{row.farmerId || '—'}</td>
                            <td className="px-3 py-2.5 text-left text-gray-800">{row.farmerName || '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{row.entries}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{row.quantity.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{money(row.purchaseAmount)}</td>
                            <td className="px-3 py-2.5 text-left text-xs text-gray-500">
                              <span className="capitalize">
                                {(row.commissionSource || '—').replace(/_/g, ' ')}
                              </span>
                              {row.commissionType && (
                                <span className="capitalize"> · {row.commissionType.replace(/_/g, ' ')}</span>
                              )}
                              {row.ratesApplied.length > 0 && (
                                <span className="block text-gray-400">
                                  {t('rate', 'Rate')}: {row.ratesApplied.join(', ')}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{money(row.commissionTotal)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-700">{money(row.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="sticky bottom-0">
                        <tr className="bg-gray-50 border-t border-gray-200 font-bold text-gray-800">
                          <td className="px-3 py-3 text-left" colSpan={2}>{t('total', 'Total')}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{farmerTotals.entries}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{farmerTotals.quantity.toFixed(2)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{money(farmerTotals.purchaseAmount)}</td>
                          <td />
                          <td className="px-3 py-3 text-right tabular-nums">{money(farmerTotals.commissionTotal)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-rose-700 whitespace-nowrap">
                            {money(farmerTotals.totalCost)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Period charges — VLC-wide fixed fees billed once for the whole
                range, so they are listed apart from the per-day rows. */}
            {statement.periodCharges.length > 0 && (
              <Card className="overflow-hidden py-0 gap-0">
                <div className="px-4 py-3 border-b bg-indigo-50/60 border-indigo-100">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-700">
                    {t('period_charges', 'Period Charges (VLC-wide Fixed)')}
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
                          {money(statement.vlcWideFixedTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Daily rows deliberately exclude period charges. */}
            {statement.daily.length > 0 && (
              <Card className="overflow-hidden py-0 gap-0">
                <div className="px-4 py-3 border-b bg-slate-50 border-slate-200">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    {t('daily_breakdown', 'Daily Breakdown')}
                  </h2>
                  {statement.dailyExcludesFixedCommission && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      {t(
                        'daily_breakdown_desc',
                        'Excludes fixed purchase commission — a flat range fee belongs to no single day.'
                      )}
                    </p>
                  )}
                </div>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-sm min-w-[980px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-600">
                          <th className="px-3 py-2.5 text-left font-semibold">{t('date', 'Date')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('collection_qty', 'Coll. Qty (L)')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('collection_cost', 'Coll. Cost')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('purchase_commission', 'Purch. Comm.')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('dispatch_weight', 'Disp. Wt')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('milk_sale', 'Milk Sale')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('milk_purchase', 'Milk Purchase')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('other_expenses', 'Other Expenses')}</th>
                          <th className="px-3 py-2.5 text-right font-semibold">{t('net', 'Net')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.daily.map((row, index) => (
                          <tr key={`${row.date}-${index}`} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-3 py-2.5 text-left text-gray-800 whitespace-nowrap">
                              {row.date}
                              {/* One shift marks a partial first / last day of the window. */}
                              {row.shifts.length === 1 && (
                                <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-semibold leading-4">
                                  {shiftLabel(row.shifts[0])}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{row.collectionQuantity.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{money(row.collectionCost)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{money(row.purchaseCommission)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{row.dispatchWeight.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{money(row.income)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{money(row.expense)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">{money(row.otherExpenses)}</td>
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
                          <td className="px-3 py-3 text-right tabular-nums text-rose-700">{money(dailyTotals.purchaseCommission)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{dailyTotals.dispatchWeight.toFixed(2)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{money(dailyTotals.income)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-rose-700">{money(dailyTotals.expense)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-amber-700">{money(dailyTotals.otherExpenses)}</td>
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
                        {t('net_profit', 'Net Profit')} + {t('fixed_purchase_commission', 'Fixed Purchase Commission')} ={' '}
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
