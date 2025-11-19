export const normalizeFarmerId = (farmerId: string): string => {
  const clean = String(farmerId).replace(/[^0-9]/g, '').trim();
  return clean ? clean.padStart(4, '0') : '';
};

export const formatFarmerIdForDisplay = (farmerId: string): string => {
  const clean = String(farmerId).replace(/[^0-9]/g, '').trim();
  return clean ? String(parseInt(clean, 10)) : '';
};

export const areEquivalentFarmerIds = (id1: string, id2: string): boolean => {
  return normalizeFarmerId(id1) === normalizeFarmerId(id2);
};
