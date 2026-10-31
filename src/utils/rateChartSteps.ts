// One row of the FAT or SNF step table: from this value on, each 0.1 adds `rate` rupees.
// Text, so a half-typed "0." stays in the input. The last row only marks where the chart ends.
export interface RateStep {
  id: string;
  from: string;
  rate: string;
}

interface ParsedStep {
  from: number; // in tenths, so 8.4 is 84 and the maths stays exact
  rate: number;
}

const MAX_STEP_VALUE = 20;

const orderOf = (step: RateStep) => {
  const value = parseFloat(step.from);
  return isNaN(value) ? Infinity : value;
};

// Lowest value first, rows still without a value last.
export const sortSteps = (steps: RateStep[]) =>
  [...steps].sort((a, b) => orderOf(a) - orderOf(b));

// Null while a value is missing, out of range or repeated.
const parseSteps = (steps: RateStep[]): ParsedStep[] | null => {
  const parsed = steps
    .map((s) => ({ from: Math.round(parseFloat(s.from) * 10), rate: parseFloat(s.rate) || 0 }))
    .sort((a, b) => a.from - b.from);
  const isValid = parsed.every((s, i) =>
    s.from >= 0 && s.from <= MAX_STEP_VALUE * 10 && (i === 0 || s.from > parsed[i - 1].from)
  );
  return isValid ? parsed : null;
};

// What the steps add by `tenths`: every 0.1 above the first row adds the rate of the
// step it falls in, on top of what the earlier steps added.
const stepTotal = (tenths: number, steps: ParsedStep[]) =>
  steps.slice(0, -1).reduce(
    (total, step, i) => total + Math.max(0, Math.min(tenths, steps[i + 1].from) - step.from) * step.rate,
    0
  );

const chartValues = (steps: ParsedStep[]) => {
  const first = steps[0].from;
  return Array.from({ length: steps[steps.length - 1].from - first + 1 }, (_, i) => first + i);
};

// The chart the inputs describe, or null while any of them is incomplete.
export const buildRateTable = (startingAmount: string, fatSteps: RateStep[], snfSteps: RateStep[]) => {
  const start = parseFloat(startingAmount);
  const fat = parseSteps(fatSteps);
  const snf = parseSteps(snfSteps);
  if (isNaN(start) || !fat || !snf) return null;

  const snfTenths = chartValues(snf);
  return {
    snfs: snfTenths.map((s) => s / 10),
    rows: chartValues(fat).map((f) => ({
      fat: f / 10,
      rates: snfTenths.map((s) => parseFloat((start + stepTotal(f, fat) + stepTotal(s, snf)).toFixed(2))),
    })),
  };
};
