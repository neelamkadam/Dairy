export const normalizeFarmerId = (id: string): string => {
  const trimmed = id.trim();
  if (/^\d+$/.test(trimmed)) {
    return trimmed.padStart(4, "0");
  }
  return trimmed;
};

export const formatFarmerIdForDisplay = (id: string): string => {
  return id.replace(/^0+/, "") || "0";
};
