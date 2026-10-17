import { NeftRow } from "@/utils/farmerNeftStatement";

// Bank Summary: the Farmer Bank NEFT Statement's farmers (Net Payable > 0, selected VLCs
// merged), one table per bank, each with its own total, then a grand total.

export interface BankGroup {
  bankName: string; // "" when the farmer has no bank name
  rows: NeftRow[];
  total: number;
}

// Bank names are typed by hand ("Bank Of India", "BANK OF INDIA ", "D.C.C Bank"), so they
// are matched without case, dots or extra spaces.
const bankKey = (name: string) => name.toUpperCase().replace(/\./g, "").replace(/\s+/g, " ").trim();

export const groupRowsByBank = (rows: NeftRow[]): BankGroup[] => {
  const byKey = new Map<string, { spellings: Map<string, number>; rows: NeftRow[] }>();
  rows.forEach((r) => {
    const key = bankKey(r.bankName);
    if (!byKey.has(key)) byKey.set(key, { spellings: new Map(), rows: [] });
    const g = byKey.get(key)!;
    const spelling = r.bankName.replace(/\s+/g, " ").trim();
    if (spelling) g.spellings.set(spelling, (g.spellings.get(spelling) || 0) + 1);
    g.rows.push(r);
  });

  return [...byKey.entries()]
    .map(([key, g]) => ({
      key,
      // The heading uses the spelling most farmers of that bank have.
      bankName: [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "",
      // By IFSC, as in the bank's sheet; the sort is stable, so VLC / farmer order stays within an IFSC.
      rows: [...g.rows].sort((a, b) => a.ifscCode.localeCompare(b.ifscCode)),
      total: g.rows.reduce((sum, r) => sum + r.netPayable, 0),
    }))
    // Alphabetical, with farmers who have no bank name last.
    .sort((a, b) => (a.key ? 0 : 1) - (b.key ? 0 : 1) || a.bankName.localeCompare(b.bankName))
    .map(({ bankName, rows, total }) => ({ bankName, rows, total }));
};

export const bankGroupLabel = (g: BankGroup, notSetLabel: string) => g.bankName || notSetLabel;

export const BANK_SUMMARY_COLUMNS: Array<{ key: "name" | "accountNumber" | "ifscCode" | "bankName" | "amount"; label: string; excelLabel: string }> = [
  { key: "name", label: "Name", excelLabel: "Name" },
  { key: "accountNumber", label: "Bank Account", excelLabel: "Bank_Account" },
  { key: "ifscCode", label: "IFSC Code", excelLabel: "BankIFSCcode" },
  { key: "bankName", label: "Bank Name", excelLabel: "Bank_Name" },
  { key: "amount", label: "Amount", excelLabel: "Amount" },
];

// A row's cell text; the Bank Name column shows the bank's heading, so every row in a table matches.
export const bankSummaryCell = (key: (typeof BANK_SUMMARY_COLUMNS)[number]["key"], r: NeftRow, g: BankGroup) => {
  switch (key) {
    case "name": return r.accountHolder;
    case "accountNumber": return r.accountNumber;
    case "ifscCode": return r.ifscCode;
    case "bankName": return g.bankName;
    case "amount": return r.netPayable;
  }
};
