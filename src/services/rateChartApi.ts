import AxiosClient from "./interceptor";

const extractRateName = (rateName: string, type: 'cow' | 'buffalo'): string => {
  if (rateName.includes('Cow:') && rateName.includes('Buffalo:')) {
    const parts = rateName.split(', ');
    const prefix = type === 'cow' ? 'Cow:' : 'Buffalo:';
    const part = parts.find(p => p.startsWith(prefix));
    if (part) return part.replace(prefix + ' ', '');
  }
  return rateName;
};

export const rateChartApi = {
  getRate: async (fat: number, snf: number, orgId: number, rateName: string, type: 'Cow' | 'Buffalo', date?: string) => {
    const typeParam = type.toLowerCase() as 'cow' | 'buffalo';
    const specificRateName = extractRateName(rateName, typeParam);
    
    const params = new URLSearchParams({
      fat: String(fat),
      snf: String(snf),
      orgid: String(orgId),
      name: specificRateName,
      type: typeParam
    });
    
    if (date) params.set('date', date);
    
    const url = `/conf/get-rate?${params.toString()}`;
    console.log('🔵 Rate API Request:', {
      url,
      params: { fat, snf, orgId, rateName, specificRateName, type: typeParam, date }
    });
    
    const response = await AxiosClient.get(url);
    console.log('🟢 Rate API Response:', response.data);
    return response.data;
  },

  getRateNames: async (orgId: number, type: 'cow' | 'buffalo') => {
    const url = `/conf/get-rate-names?orgid=${orgId}&type=${type}`;
    console.log('🔵 Rate Names API Request:', { url, orgId, type });
    const response = await AxiosClient.get(url);
    console.log('🟢 Rate Names API Response:', response.data);
    return response.data;
  },

  getRateNamesForBoth: async (orgId: number) => {
    const [cowRates, buffaloRates] = await Promise.all([
      rateChartApi.getRateNames(orgId, 'cow'),
      rateChartApi.getRateNames(orgId, 'buffalo')
    ]);
    return { cowRates, buffaloRates };
  }
};
