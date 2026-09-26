import { format } from "date-fns";
import { api } from "@/services/config";
import { userApi } from "@/services/reportsApi";
import { farmerUserId, isBankVerified } from "@/services/farmerBankApi";
import { bonusApi } from "@/services/bonusApi";
import {
  buildFarmerCollectionSummary,
  fetchFarmerCommissions,
  normalizeFarmerCode,
} from "@/utils/farmerCollectionSummary";

// Farmer-wise bank NEFT statement:
//   Purchase Amount   = milk bill amount for the period
//   Payable Amount    = Purchase + farmer commission
//   Advance           = advance recovered in the bills
//   Deduction         = cattle feed + other1 + other2 + bonus deduction + fixed deduction
//   Net Payable       = Payable − Advance − Deduction   (only rows with Net Payable > 0)

export interface NeftRow {
  vlcId: string;
  branchId: string;
  userId: number | string | null; // farmer's users.id, for editing bank details
  farmerCode: string;
  farmerName: string;
  accountNumber: string;
  accountHolder: string;
  ifscCode: string;
  bankName: string;
  bankPassbookPhoto: string;
  bankVerified: boolean;
  purchaseAmount: number;
  commission: number;
  payableAmount: number;
  advance: number;
  deduction: number;
  netPayable: number;
  missingBank: boolean;
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const fetchNeftRowsForVlc = async (
  branchId: string,
  vlcUsername: string | undefined,
  fromDate: Date,
  toDate: Date
): Promise<NeftRow[]> => {
  const from = format(fromDate, "yyyy-MM-dd");
  const to = format(toDate, "yyyy-MM-dd");

  const [billRes, bankRes, bonusRes, collectionRes, commissions] = await Promise.all([
    api.get("/payments/getdairybillsummary", { params: { dairyid: branchId, datefrom: from, dateto: to } }),
    // Bank details come from the farmer list: the bank summary API only knows farmers with a generated bill.
    userApi.getFarmers(branchId).catch(() => ({ data: [] })),
    bonusApi.getBonusDeductions({ dairy_id: Number(branchId), start_date: from, end_date: to }).catch(() => ({ data: { data: [] } })),
    api.get("/webreports/collections", { params: { dairy_id: branchId, milk_type: "All", shift: "All", from, to } }),
    fetchFarmerCommissions(branchId, vlcUsername),
  ]);

  // Commission per farmer, from the same per-entry calculation as the collection reports.
  const collections = collectionRes.data?.success ? collectionRes.data.data || [] : [];
  const commissionByFarmer = new Map<string, number>();
  buildFarmerCollectionSummary(
    collections.map((r: any) => ({ ...r, branch_id: branchId })),
    [{ dairyId: branchId, name: "" }],
    new Map([[branchId, commissions]])
  ).groups.forEach((g) => g.farmers.forEach((f) => commissionByFarmer.set(f.farmerCode, f.commission)));

  const bankByFarmer = new Map<string, any>();
  (Array.isArray(bankRes?.data) ? bankRes.data : []).forEach((u: any) => {
    if (u.username) bankByFarmer.set(normalizeFarmerCode(u.username), u);
  });

  // Latest bonus/fixed deduction entry per farmer (highest id), applied when the
  // period ends after its effective date — same rule as the Payment Summary report.
  const bonusByFarmer = new Map<string, any>();
  (bonusRes.data?.data || []).forEach((b: any) => {
    const code = normalizeFarmerCode(b.farmer_id);
    const existing = bonusByFarmer.get(code);
    if (!existing || b.id > existing.id) bonusByFarmer.set(code, b);
  });

  // Bill summary comes per date: milk is daily (sum it), bill totals are per period (take once).
  const farmers = new Map<string, {
    name: string; milk: number; quantity: number; advance: number; otherDeduction: number; billDone: boolean;
  }>();
  (billRes.data?.data || []).forEach((day: any) => {
    (day.farmers || []).forEach((f: any) => {
      const code = normalizeFarmerCode(f.farmer_id ?? f.farmer_username);
      if (!farmers.has(code)) {
        farmers.set(code, { name: f.farmer_name || "", milk: 0, quantity: 0, advance: 0, otherDeduction: 0, billDone: false });
      }
      const agg = farmers.get(code)!;
      agg.milk += num(f.milk_total);
      agg.quantity += num(f.quantity);
      if (!agg.billDone && f.from_bills) {
        agg.advance = num(f.from_bills.advance_total);
        agg.otherDeduction =
          num(f.from_bills.cattlefeed_total) + num(f.from_bills.other1_total) + num(f.from_bills.other2_total);
        agg.billDone = true;
      }
    });
  });

  const rows: NeftRow[] = [];
  farmers.forEach((f, code) => {
    let bonusFixed = 0;
    const bonus = bonusByFarmer.get(code);
    if (bonus && new Date(to) > new Date(bonus.effective_from)) {
      bonusFixed = f.quantity * num(bonus.bonus_deduction) + num(bonus.fixed_deduction);
    }

    const purchaseAmount = round2(f.milk);
    const commission = round2(commissionByFarmer.get(code) || 0);
    const payableAmount = round2(purchaseAmount + commission);
    const advance = round2(f.advance);
    const deduction = round2(f.otherDeduction + bonusFixed);
    const netPayable = round2(payableAmount - advance - deduction);
    if (netPayable <= 0) return;

    const bank = bankByFarmer.get(code);
    const accountNumber = String(bank?.accountNumber || "").trim();
    const ifscCode = String(bank?.ifscCode || "").trim();
    rows.push({
      vlcId: vlcUsername || branchId,
      branchId,
      userId: bank ? farmerUserId(bank) ?? null : null,
      farmerCode: code,
      farmerName: bank?.fullName || f.name,
      accountNumber,
      accountHolder: bank?.bname || bank?.fullName || f.name,
      ifscCode,
      bankName: String(bank?.bankName || ""),
      bankPassbookPhoto: String(bank?.bankPassbookPhoto || ""),
      bankVerified: !!bank && isBankVerified(bank),
      purchaseAmount,
      commission,
      payableAmount,
      advance,
      deduction,
      netPayable,
      missingBank: !accountNumber || !ifscCode,
    });
  });

  return rows.sort((a, b) => (parseInt(a.farmerCode, 10) || 0) - (parseInt(b.farmerCode, 10) || 0));
};

export const NEFT_COLUMNS: Array<{ key: keyof NeftRow; label: string; amount?: boolean }> = [
  { key: "farmerCode", label: "Farmer ID" },
  { key: "accountNumber", label: "A/C Number" },
  { key: "accountHolder", label: "Account Holder" },
  { key: "payableAmount", label: "Payable Amount", amount: true },
  { key: "ifscCode", label: "IFSCode" },
  { key: "purchaseAmount", label: "Purchase Amount", amount: true },
  { key: "advance", label: "Advance", amount: true },
  { key: "deduction", label: "Deduction", amount: true },
  { key: "netPayable", label: "Net Payable Amount", amount: true },
];

export const neftTotals = (rows: NeftRow[]) =>
  rows.reduce(
    (t, r) => ({
      payableAmount: t.payableAmount + r.payableAmount,
      purchaseAmount: t.purchaseAmount + r.purchaseAmount,
      advance: t.advance + r.advance,
      deduction: t.deduction + r.deduction,
      netPayable: t.netPayable + r.netPayable,
    }),
    { payableAmount: 0, purchaseAmount: 0, advance: 0, deduction: 0, netPayable: 0 }
  );

export const formatAmount = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface NeftGroup {
  label: string; // VLC heading, as on the Farmer List
  rows: NeftRow[];
}

// Rows are fetched one VLC after another; split them back into per-VLC groups, keeping that order.
export const groupNeftRows = (rows: NeftRow[], labelOf: (branchId: string) => string): NeftGroup[] => {
  const groups: NeftGroup[] = [];
  let currentBranch: string | null = null;
  rows.forEach((r) => {
    if (r.branchId !== currentBranch) {
      currentBranch = r.branchId;
      groups.push({ label: labelOf(r.branchId), rows: [] });
    }
    groups[groups.length - 1].rows.push(r);
  });
  return groups;
};
