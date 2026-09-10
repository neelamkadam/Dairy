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
    shift?: string;
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

  // No milk_type / shift params by design: dispatch_entry has no shift column and its
  // milk_type is usually 'Both', so revenue cannot be sliced the way cost can.
  getProfitLossStatement: async (params: {
    dairy_id: string;
    from: string;
    to: string;
  }) => {
    const queryString = new URLSearchParams(params as any).toString();
    console.log('📡 Full API URL:', `${api.defaults.baseURL}/webreports/profit-loss?${queryString}`);
    const { data } = await api.get('/webreports/profit-loss', { params });
    console.log('📥 Response:', data);
    return data;
  },

  // One row per expense — the Other Expense master page posts each line separately.
  createOtherExpense: async (payload: {
    dairy_id: number;
    date: string;
    expense_name: string;
    amount: number;
    created_by: string;
  }) => {
    const { data } = await api.post('/webreports/other-expenses', payload);
    return data;
  },

  // Newest first. total / total_amount cover every matching row, not just this page;
  // with no search, total_amount is what the P&L deducts for the same range.
  getOtherExpenses: async (params: {
    dairy_id: string | number;
    from?: string;
    to?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const { data } = await api.get('/webreports/other-expenses', { params });
    return data as OtherExpenseListResponse;
  },

  // Partial update — only the fields sent change. created_by: null clears it.
  updateOtherExpense: async (id: number, payload: OtherExpenseUpdate) => {
    const { data } = await api.put(`/webreports/other-expenses/${id}`, payload);
    return data;
  },

  // Returns the removed row so the screen can say what was deleted.
  deleteOtherExpense: async (id: number) => {
    const { data } = await api.delete(`/webreports/other-expenses/${id}`);
    return data;
  },
};

export interface OtherExpense {
  id: number;
  dairy_id: number;
  date: string;
  expense_name: string;
  amount: number | string;
  created_by: string | null;
  created_at?: string;
}

export interface OtherExpenseListResponse {
  success?: boolean;
  message?: string;
  data: OtherExpense[];
  total: number;
  total_amount: number | string;
}

export type OtherExpenseUpdate = Partial<{
  date: string;
  expense_name: string;
  amount: number;
  created_by: string | null;
  dairy_id: number;
}>;
