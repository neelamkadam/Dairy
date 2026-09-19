/* Data shaping for the Profit & Loss report.
 * Kept apart from the page so the response contract can be exercised on its own.
 */

/* ------------------------------------------------------------------ *
 * Response shape: GET /webreports/profit-loss?dairy_id&from&from_shift&to&to_shift
 *
 *   filters                      echoes the window used, incl. from_shift / to_shift
 *   income.dispatch              base_amount is the milk sale. commission_amount
 *                                is already inside base_amount, so it is NOT
 *                                added on top (the API's own totals do add it)
 *   expense.collection_purchase  what farmers were paid for their milk
 *   expense.purchase_commission  per_liter + fixed, where fixed splits into
 *                                farmer_wise_fixed + vlc_wide_fixed
 *                                (purchase commission is what the dairy PAYS)
 *   other_expenses               total, by_name[], items[] — costs entered on the
 *                                Other Expense master page, taken off gross profit
 *   profit_loss                  ignored — its gross / net profit count dispatch
 *                                commission twice; figures are derived here
 *   farmers[]                    per-farmer cost with the commission rule applied
 *   period_charges.entries[]     which VLC-wide fixed entries fired, and why
 *   daily[]                      per-day rows (EXCLUDES fixed commission); shifts[]
 *                                is ["Evening"] etc. on a partial first / last day
 *   notes.collections_without_commission
 *   notes.dispatches_without_time  dispatches with no time, counted as Morning
 *   warnings[]                   free-text caveats raised by the backend
 *
 * Identity, once dispatch commission is stripped from the day rows — fixed
 * commission is a range-level cost left out of the day rows, so the day rows read
 * HIGH by exactly that amount:
 *   sum(daily.net) === net_profit + fixed_commission_total
 * ------------------------------------------------------------------ */

export interface PLSubLine {
  label: string;
  amount: number;
}

export interface PLLine {
  key: string;
  label: string;
  amount: number;
  hint?: string;
  meta?: string;
  subLines?: PLSubLine[];
}

export interface PLDailyRow {
  date: string;
  /** Shifts of this day inside the window — one entry marks a partial end day. */
  shifts: string[];
  collectionQuantity: number;
  collectionCost: number;
  purchaseCommission: number;
  dispatchWeight: number;
  dispatchBaseAmount: number;
  income: number;
  expense: number;
  otherExpenses: number;
  net: number;
}

export interface PLFarmerRow {
  farmerId: string;
  farmerName: string;
  entries: number;
  quantity: number;
  purchaseAmount: number;
  commissionSource: string;
  commissionType: string;
  commissionRate: number;
  ratesApplied: number[];
  commissionPerLiter: number;
  commissionFixed: number;
  commissionTotal: number;
  totalCost: number;
}

export interface PLPeriodCharge {
  label: string;
  reason: string;
  amount: number;
}

export interface PLPeriod {
  from: string;
  fromShift: string;
  to: string;
  toShift: string;
}

export interface PLStatementData {
  income: PLLine[];
  expenses: PLLine[];
  totalIncome: number;
  totalExpenses: number;
  otherExpenses: PLLine[];
  otherExpensesTotal: number;
  /** Milk sale − milk purchase, before other expenses. */
  grossProfit: number;
  netProfit: number;
  status: string;
  marginPercent: number;
  netPerLiterCollected: number;
  fixedCommissionTotal: number;
  vlcWideFixedTotal: number;
  periodCharges: PLPeriodCharge[];
  farmers: PLFarmerRow[];
  daily: PLDailyRow[];
  collectionsWithoutCommission: number;
  dispatchesWithoutTime: number;
  /** The window the backend actually used, echoed from `filters`. */
  period: PLPeriod;
  dailyExcludesFixedCommission: boolean;
  incomeFormula: string;
  expenseFormula: string;
  warnings: string[];
}

const num = (value: unknown): number => {
  const n = parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
};

/** First present (non-null) value among candidate keys — the contract names leaves
 *  loosely, so read tolerantly rather than pinning one spelling. */
const pick = (obj: any, keys: string[]): any => {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

/** A section may arrive as a bare number or as an object carrying a total.
 *  collection_purchase names its total `total_amount`, not `total`. */
const sectionTotal = (raw: any, parts: number[]): number => {
  if (typeof raw === 'number' || typeof raw === 'string') return num(raw);
  const explicit = pick(raw, ['total', 'total_amount', 'amount', 'value']);
  if (explicit !== undefined) return num(explicit);
  return parts.reduce((sum, p) => sum + p, 0);
};

const qty = (value: number, unit: string) =>
  `${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;

const plural = (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`;

export const normalisePLResponse = (raw: any): PLStatementData => {
  const payload = raw?.data ?? raw ?? {};

  const incomeRaw = pick(payload, ['income']) ?? {};
  const expenseRaw = pick(payload, ['expense', 'expenses']) ?? {};
  const periodRaw = pick(payload, ['period_charges', 'periodCharges']) ?? {};
  const notes = pick(payload, ['notes']) ?? {};
  const filtersRaw = pick(payload, ['filters']) ?? {};

  const incomeFormula = String(pick(notes, ['income_formula', 'dispatch_revenue_formula']) ?? '');
  const expenseFormula = String(pick(notes, ['expense_formula']) ?? '');

  // ---- Income (milk sale): dispatch base_amount alone ----
  // commission_amount is already inside base_amount; adding it again would count
  // it twice, so the API's dispatch / income totals are not used either.
  const dispatchRaw = pick(incomeRaw, ['dispatch']) ?? {};
  const dispatchEntries = num(pick(dispatchRaw, ['entries']));
  const dispatchWeight = num(pick(dispatchRaw, ['total_weight']));
  const dispatchBase = num(pick(dispatchRaw, ['base_amount']));

  // ---- Expense: what farmers were paid. Note the total is `total_amount`. ----
  const purchaseRaw = pick(expenseRaw, ['collection_purchase']) ?? {};
  const purchaseEntries = num(pick(purchaseRaw, ['entries']));
  const purchaseQuantity = num(pick(purchaseRaw, ['total_quantity']));
  const purchaseTotal = sectionTotal(purchaseRaw, []);

  // ---- Expense: purchase commission = per_liter + fixed ----
  // `fixed` is the parent of farmer_wise_fixed + vlc_wide_fixed, so the sub-lines
  // list the two halves rather than `fixed` itself — otherwise it reads twice.
  const commissionRaw = pick(expenseRaw, ['purchase_commission', 'collection_commission']) ?? {};
  const commissionPerLiter = num(pick(commissionRaw, ['per_liter']));
  const commissionFarmerFixed = num(pick(commissionRaw, ['farmer_wise_fixed']));
  const commissionVlcFixed = num(pick(commissionRaw, ['vlc_wide_fixed']));
  const commissionFixed = num(
    pick(commissionRaw, ['fixed']) ?? commissionFarmerFixed + commissionVlcFixed
  );
  const commissionTotal = sectionTotal(commissionRaw, [commissionPerLiter, commissionFixed]);

  const income: PLLine[] = [
    {
      key: 'dispatch',
      label: 'Dispatch',
      amount: dispatchBase,
      // notes.income_formula is written in backend field names, so it stays in the
      // data for debugging rather than being shown as the line hint.
      hint: 'Base amount of milk dispatched — commission is already included',
      meta: `${plural(dispatchEntries)} · ${qty(dispatchWeight, 'kg')}`,
    },
  ];

  const expenses: PLLine[] = [
    {
      key: 'collection_purchase',
      label: 'Collection Purchase',
      amount: purchaseTotal,
      hint: 'Amount payable to farmers for milk collected',
      meta: `${plural(purchaseEntries)} · ${qty(purchaseQuantity, 'L')}`,
    },
    {
      key: 'purchase_commission',
      label: 'Purchase Commission',
      amount: commissionTotal,
      subLines: [
        { label: 'Per litre', amount: commissionPerLiter },
        { label: 'Fixed — farmer-wise', amount: commissionFarmerFixed },
        { label: 'Fixed — VLC-wide', amount: commissionVlcFixed },
      ],
    },
  ];

  const totalExpenses = sectionTotal(expenseRaw, [purchaseTotal, commissionTotal]);

  // ---- Other expenses: entered on the Other Expense page, taken off gross profit ----
  // by_name is the grouped view; items is the fallback when only raw rows arrive.
  const otherRaw = pick(payload, ['other_expenses', 'otherExpenses']) ?? {};
  const otherByName = pick(otherRaw, ['by_name']);
  const otherItems = pick(otherRaw, ['items']);
  const otherSource: unknown[] = Array.isArray(otherByName) && otherByName.length
    ? otherByName
    : (Array.isArray(otherItems) ? otherItems : []);
  const otherExpenses: PLLine[] = otherSource.map((entry, index) => {
    const entries = num(pick(entry, ['entries', 'count']));
    const date = pick(entry, ['date']);
    return {
      key: `other-${index}`,
      label: String(pick(entry, ['expense_name', 'name', 'label']) ?? 'Other expense'),
      amount: num(pick(entry, ['total', 'amount'])),
      meta: entries ? plural(entries) : (date ? String(date) : undefined),
    };
  });
  const otherExpensesTotal = num(
    pick(otherRaw, ['total']) ?? otherExpenses.reduce((sum, line) => sum + line.amount, 0)
  );

  // Profit is derived here rather than read from the API, whose gross / net profit
  // still count dispatch commission as extra income.
  const totalIncome = dispatchBase;
  const grossProfit = totalIncome - totalExpenses;
  const netProfit = grossProfit - otherExpensesTotal;

  const periodEntries = pick(periodRaw, ['entries']) ?? [];
  const periodCharges: PLPeriodCharge[] = Array.isArray(periodEntries)
    ? periodEntries.map((entry: any) => ({
        label: String(
          pick(entry, ['label', 'name', 'farmer_name', 'scope', 'commission_name']) ??
          (pick(entry, ['farmer_id']) ? `Farmer ${pick(entry, ['farmer_id'])}` : 'Fixed charge')
        ),
        reason: String(pick(entry, ['reason', 'why', 'note', 'description', 'basis']) ?? ''),
        amount: num(pick(entry, ['amount', 'fixed', 'value', 'total'])),
      }))
    : [];

  const farmersRaw = pick(payload, ['farmers']) ?? [];
  const farmers: PLFarmerRow[] = Array.isArray(farmersRaw)
    ? farmersRaw.map((row: any) => {
        const comm = pick(row, ['commission']) ?? {};
        const rates = pick(comm, ['rates_applied']);
        return {
          farmerId: String(pick(row, ['farmer_id']) ?? ''),
          farmerName: String(pick(row, ['farmer_name']) ?? '').trim(),
          entries: num(pick(row, ['entries'])),
          quantity: num(pick(row, ['quantity'])),
          purchaseAmount: num(pick(row, ['purchase_amount'])),
          commissionSource: String(pick(comm, ['source']) ?? ''),
          commissionType: String(pick(comm, ['type']) ?? ''),
          commissionRate: num(pick(comm, ['rate'])),
          ratesApplied: Array.isArray(rates) ? rates.map(num) : [],
          commissionPerLiter: num(pick(comm, ['per_liter_amount'])),
          commissionFixed: num(pick(comm, ['fixed_amount'])),
          commissionTotal: num(pick(comm, ['total'])),
          totalCost: num(pick(row, ['total_cost'])),
        };
      })
    : [];

  const dailyRaw = pick(payload, ['daily']) ?? [];
  const daily: PLDailyRow[] = Array.isArray(dailyRaw)
    ? dailyRaw.map((row: any) => {
        // The API adds dispatch commission into each day's income and net; take it
        // back out so the day rows match the milk-sale totals.
        const dispatchCommission = num(pick(row, ['dispatch_commission']));
        const dayOtherExpenses = num(pick(row, ['other_expenses']));
        const dayShifts = pick(row, ['shifts']);
        return {
          date: String(pick(row, ['date']) ?? ''),
          shifts: Array.isArray(dayShifts) ? dayShifts.map(String) : [],
          collectionQuantity: num(pick(row, ['collection_quantity'])),
          collectionCost: num(pick(row, ['collection_cost'])),
          purchaseCommission: num(pick(row, ['purchase_commission', 'per_liter_commission'])),
          dispatchWeight: num(pick(row, ['dispatch_weight'])),
          dispatchBaseAmount: num(pick(row, ['dispatch_base_amount'])),
          income: num(pick(row, ['income'])) - dispatchCommission,
          // The API's day expense already includes that day's other expenses; split
          // them out so the same amount isn't shown under Milk Purchase as well.
          expense: num(pick(row, ['expense'])) - dayOtherExpenses,
          otherExpenses: dayOtherExpenses,
          net: num(pick(row, ['net'])) - dispatchCommission,
        };
      })
    : [];

  const vlcWideFixedTotal = num(pick(periodRaw, ['vlc_wide_fixed_total']) ?? commissionVlcFixed);

  const warningsRaw = pick(payload, ['warnings']) ?? [];
  const warnings: string[] = Array.isArray(warningsRaw)
    ? warningsRaw
        .map((w: any) => (typeof w === 'string' ? w : String(pick(w, ['message', 'text', 'warning']) ?? '')))
        .filter(Boolean)
    : [];

  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    otherExpenses,
    otherExpensesTotal,
    grossProfit,
    netProfit,
    status: netProfit >= 0 ? 'profit' : 'loss',
    marginPercent: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
    netPerLiterCollected: purchaseQuantity > 0 ? netProfit / purchaseQuantity : 0,
    // The flat slice of commission that daily[] deliberately omits — a range fee
    // belongs to no single day.
    fixedCommissionTotal: commissionFixed,
    vlcWideFixedTotal,
    periodCharges,
    farmers,
    daily,
    collectionsWithoutCommission: num(pick(notes, ['collections_without_commission'])),
    dispatchesWithoutTime: num(pick(notes, ['dispatches_without_time'])),
    period: {
      from: String(pick(filtersRaw, ['from']) ?? ''),
      fromShift: String(pick(filtersRaw, ['from_shift', 'fromShift']) ?? ''),
      to: String(pick(filtersRaw, ['to']) ?? ''),
      toShift: String(pick(filtersRaw, ['to_shift', 'toShift']) ?? ''),
    },
    dailyExcludesFixedCommission:
      pick(notes, ['daily_excludes_fixed_commission', 'daily_excludes_period_charges']) !== false,
    incomeFormula,
    expenseFormula,
    warnings,
  };
};
