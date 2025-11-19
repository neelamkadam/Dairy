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
