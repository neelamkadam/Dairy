export interface Deductions {
  advance: number;
  cattlefeed: number;
  other1: number;
  other2: number;
}

const DEFAULT_PRIORITY_ORDER: (keyof Deductions)[] = ["other2", "other1", "cattlefeed", "advance"];

const getPriorityOrder = (): (keyof Deductions)[] => {
  const stored = localStorage.getItem("deductionPriorityOrder");
  return stored ? JSON.parse(stored) : DEFAULT_PRIORITY_ORDER;
};

export const adjustDeductionsForNegativeBalance = async (
  deductions: Deductions,
  totalBillAmount: number
): Promise<Deductions> => {
  const totalDeductions = deductions.advance + deductions.cattlefeed + deductions.other1 + deductions.other2;

  if (totalDeductions <= totalBillAmount) {
    return deductions;
  }

  const priorityOrder = getPriorityOrder();
  const adjusted: Deductions = { advance: 0, cattlefeed: 0, other1: 0, other2: 0 };
  let remaining = totalBillAmount;

  for (const type of priorityOrder) {
    const available = deductions[type];
    const allocated = Math.min(available, remaining);
    adjusted[type] = allocated;
    remaining -= allocated;

    if (remaining <= 0) break;
  }

  return adjusted;
};

export const calculateRemainingAmounts = (
  originalAmounts: Deductions,
  receivedAmounts: Deductions,
  previousAmounts: Deductions,
  currentDeductions: Deductions
): Deductions => {
  const remaining: Deductions = { advance: 0, cattlefeed: 0, other1: 0, other2: 0 };

  (Object.keys(originalAmounts) as (keyof Deductions)[]).forEach((type) => {
    const currentPeriodNet = originalAmounts[type] - receivedAmounts[type];
    const totalAvailable = currentPeriodNet + previousAmounts[type];
    remaining[type] = Math.max(0, totalAvailable - currentDeductions[type]);
  });

  return remaining;
};
