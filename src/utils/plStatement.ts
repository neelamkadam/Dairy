/* Data shaping for the Profit & Loss report.
 * Kept apart from the page so the response contract can be exercised on its own.
 */

/* ------------------------------------------------------------------ *
 * Response shape: GET /webreports/profit-loss?dairy_id&from&to
 *
 *   income.dispatch              base_amount + commission_amount
 *   income.collection_commission per_liter + fixed        (commission is INCOME)
 *   expense.collection_purchase  what farmers were paid
 *   profit_loss                  net_profit, status, margin_percent,
 *                                net_per_liter_collected
 *   period_charges.entries[]     which fixed entries fired, and why
 *   daily[]                      per-day rows (EXCLUDES period charges)
 *   notes.collections_without_commission
 *
 * Identity the API guarantees:
 *   sum(daily.net) === net_profit − fixed_commission_total
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
  collectionQuantity: number;
  collectionCost: number;
  perLiterCommission: number;
  dispatchWeight: number;
  dispatchBaseAmount: number;
  dispatchCommission: number;
  income: number;
  expense: number;
  net: number;
}

export interface PLPeriodCharge {
  label: string;
  reason: string;
  amount: number;
}

export interface PLStatementData {
  income: PLLine[];
  expenses: PLLine[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  status: string;
  marginPercent: number;
  netPerLiterCollected: number;
  fixedCommissionTotal: number;
  periodCharges: PLPeriodCharge[];
  daily: PLDailyRow[];
  collectionsWithoutCommission: number;
  dailyExcludesPeriodCharges: boolean;
  dispatchRevenueFormula: string;
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

export const normalisePLResponse = (raw: any): PLStatementData => {
  const payload = raw?.data ?? raw ?? {};

  const incomeRaw = pick(payload, ['income']) ?? {};
  const expenseRaw = pick(payload, ['expense', 'expenses']) ?? {};
  const pl = pick(payload, ['profit_loss', 'profitLoss']) ?? {};
  const periodRaw = pick(payload, ['period_charges', 'periodCharges']) ?? {};
  const notes = pick(payload, ['notes']) ?? {};

  const dispatchFormula = String(pick(notes, ['dispatch_revenue_formula']) ?? '');

  // ---- Income: dispatch = base_amount + commission_amount ----
  const dispatchRaw = pick(incomeRaw, ['dispatch']) ?? {};
  const dispatchEntries = num(pick(dispatchRaw, ['entries']));
  const dispatchWeight = num(pick(dispatchRaw, ['total_weight']));
  const dispatchBase = num(pick(dispatchRaw, ['base_amount']));
  const dispatchCommission = num(pick(dispatchRaw, ['commission_amount']));
  const dispatchTotal = sectionTotal(dispatchRaw, [dispatchBase, dispatchCommission]);

  // ---- Income: collection commission = per_liter + fixed ----
  const commissionRaw = pick(incomeRaw, ['collection_commission']) ?? {};
  const commissionPerLiter = num(pick(commissionRaw, ['per_liter']));
  const commissionFixed = num(pick(commissionRaw, ['fixed']));
  const commissionTotal = sectionTotal(commissionRaw, [commissionPerLiter, commissionFixed]);

  // ---- Expense: what farmers were paid. Note the total is `total_amount`. ----
  const purchaseRaw = pick(expenseRaw, ['collection_purchase']) ?? {};
  const purchaseEntries = num(pick(purchaseRaw, ['entries']));
  const purchaseQuantity = num(pick(purchaseRaw, ['total_quantity']));
  const purchaseTotal = sectionTotal(purchaseRaw, []);

  const income: PLLine[] = [
    {
      key: 'dispatch',
      label: 'Dispatch',
      amount: dispatchTotal,
      hint: dispatchFormula || 'Base amount + commission on dispatched weight',
      meta: `${dispatchEntries} ${dispatchEntries === 1 ? 'entry' : 'entries'} · ${qty(dispatchWeight, 'kg')}`,
      subLines: [
        { label: 'Base amount', amount: dispatchBase },
        { label: 'Commission on weight', amount: dispatchCommission },
      ],
    },
    {
      key: 'collection_commission',
      label: 'Collection Commission',
      amount: commissionTotal,
      hint: 'Commission is income, not an expense',
      subLines: [
        { label: 'Per litre', amount: commissionPerLiter },
        { label: 'Fixed (period charges)', amount: commissionFixed },
      ],
    },
  ];

  const expenses: PLLine[] = [
    {
      key: 'collection_purchase',
      label: 'Collection Purchase',
      amount: purchaseTotal,
      hint: 'Amount payable to farmers for milk collected',
      meta: `${purchaseEntries} ${purchaseEntries === 1 ? 'entry' : 'entries'} · ${qty(purchaseQuantity, 'L')}`,
    },
  ];

  const totalIncome = sectionTotal(incomeRaw, [dispatchTotal, commissionTotal]);
  const totalExpenses = sectionTotal(expenseRaw, [purchaseTotal]);

  const apiNet = pick(pl, ['net_profit', 'netProfit']);
  const netProfit = apiNet !== undefined ? num(apiNet) : totalIncome - totalExpenses;

  const apiMargin = pick(pl, ['margin_percent', 'marginPercent']);
  const marginPercent = apiMargin !== undefined
    ? num(apiMargin)
    : (totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0);

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

  const dailyRaw = pick(payload, ['daily']) ?? [];
  const daily: PLDailyRow[] = Array.isArray(dailyRaw)
    ? dailyRaw.map((row: any) => ({
        date: String(pick(row, ['date']) ?? ''),
        collectionQuantity: num(pick(row, ['collection_quantity'])),
        collectionCost: num(pick(row, ['collection_cost'])),
        perLiterCommission: num(pick(row, ['per_liter_commission'])),
        dispatchWeight: num(pick(row, ['dispatch_weight'])),
        dispatchBaseAmount: num(pick(row, ['dispatch_base_amount'])),
        dispatchCommission: num(pick(row, ['dispatch_commission'])),
        income: num(pick(row, ['income'])),
        expense: num(pick(row, ['expense'])),
        net: num(pick(row, ['net'])),
      }))
    : [];

  // fixed_commission_total is the flat portion of commission income — the piece
  // daily[] deliberately omits, since a range fee belongs to no single day.
  const fixedCommissionTotal = num(
    pick(periodRaw, ['fixed_commission_total']) ?? commissionFixed
  );

  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netProfit,
    status: String(pick(pl, ['status']) ?? (netProfit >= 0 ? 'profit' : 'loss')),
    marginPercent,
    netPerLiterCollected: num(pick(pl, ['net_per_liter_collected', 'netPerLiterCollected'])),
    fixedCommissionTotal,
    periodCharges,
    daily,
    collectionsWithoutCommission: num(pick(notes, ['collections_without_commission'])),
    dailyExcludesPeriodCharges: pick(notes, ['daily_excludes_period_charges']) !== false,
    dispatchRevenueFormula: dispatchFormula,
  };
};
