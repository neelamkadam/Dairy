// Milk density used across the app: 1 litre of milk weighs ~1.03 kg.
export const MILK_DENSITY = 1.03;

export const calculateWeightFromLiter = (literStr: string): string => {
  const liter = parseFloat(literStr);
  if (isNaN(liter)) return '';
  return (liter * MILK_DENSITY).toFixed(2);
};

export const calculateLiterFromWeight = (weightStr: string): string => {
  const weight = parseFloat(weightStr);
  if (isNaN(weight)) return '';
  return (weight / MILK_DENSITY).toFixed(2);
};

export const calculateCLRFromFatAndSNF = (fatStr: string, snfStr: string): string => {
  const fat = parseFloat(fatStr);
  const snf = parseFloat(snfStr);
  if (isNaN(fat) || isNaN(snf)) return '';
  const clr = (snf - (0.21 * fat) - 0.36) * 4;
  return clr.toFixed(2);
};

export const calculateSNFFromFatAndCLR = (fatStr: string, clrStr: string): string => {
  const fat = parseFloat(fatStr);
  const clr = parseFloat(clrStr);
  if (isNaN(fat) || isNaN(clr)) return '';
  const snf = (clr / 4) + (0.21 * fat) + 0.36;
  return snf.toFixed(2);
};
