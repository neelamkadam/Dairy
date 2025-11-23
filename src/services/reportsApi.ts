import { api } from './config';

export const userApi = {
  getFarmers: async (dairyid: string) => {
    const { data } = await api.get('/users', { params: { dairyid } });
    console.log('📥 Farmers Response:', data);
    return data;
  },
};

export const reportsApi = {
  getVlcDifferenceReport: async (params: {
    dairy_id: string;
    vlc_id: string;
    from: string;
    to: string;
    shift?: string;
  }) => {
    const queryString = new URLSearchParams(params as any).toString();
    console.log('📡 Full API URL:', `${api.defaults.baseURL}/webreports/vlc-difference?${queryString}`);
    const { data } = await api.get('/webreports/vlc-difference', { params });
    console.log('📥 Response:', data);
    return data;
  },

  getVlcCommissionReport: async (params: {
    vlc_id: string;
    start_date: string;
    end_date: string;
  }) => {
    const queryString = new URLSearchParams(params as any).toString();
    console.log('📡 Full API URL:', `${api.defaults.baseURL}/webreports/vlc-commission?${queryString}`);
    const { data } = await api.get('/webreports/vlc-commission', { params });
    console.log('📥 Response:', data);
    return data;
  },

  getShiftCollectionReport: async (params: {
    dairyid: string;
    startDate: string;
    startShift: string;
    endDate: string;
    endShift: string;
    milkType: string;
  }) => {
    const queryString = new URLSearchParams(params as any).toString();
    console.log('📡 Full API URL:', `${api.defaults.baseURL}/report/shift-collection-report?${queryString}`);
    const { data } = await api.get('/report/shift-collection-report', { params });
    console.log('📥 Response:', data);
    return data;
  },

  previewRateMatrix: async (params: {
    organisation_id: string;
    type: string;
    name: string;
  }) => {
    const queryString = new URLSearchParams(params as any).toString();
    console.log('📡 Full API URL:', `${api.defaults.baseURL}/conf/previewRateMatrix?${queryString}`);
    const { data } = await api.get('/conf/previewRateMatrix', { params });
    console.log('📥 Response:', data);
    return data;
  },

  getFarmerBalances: async (params: {
    dairy_id: string;
    date: string;
  }) => {
    const queryString = new URLSearchParams(params as any).toString();
    console.log('📡 Full API URL:', `${api.defaults.baseURL}/webreports/farmer-balances?${queryString}`);
    const { data } = await api.get('/webreports/farmer-balances', { params });
    console.log('📥 Response:', data);
    return data;
  },
};
