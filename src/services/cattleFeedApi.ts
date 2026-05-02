import { api } from "./config";

export interface CattleFeedStockRequest {
  owner_type: "group" | "vlc";
  owner_id: string | number;
  stock_name: string;
  amount: number;
  stock: number;
  purchase_rate: number;
  date?: string[];
}

export interface CattleFeedStockUpdateRequest {
  stock_name?: string;
  amount?: number;
  stock?: number;
  purchase_rate?: number;
  date?: string[];
}

export interface CattleFeedStock {
  id: number;
  owner_type: "group" | "vlc";
  owner_id: string | number;
  dairy_id?: string | number; // Backward compatibility
  stock_name: string;
  amount: string | number;
  stock: number;
  purchase_rate: number;
  date: string | string[];
  created_at?: string;
}

export interface CattleFeedStockResponse {
  success: boolean;
  message: string;
  id?: number;
}

export interface CattleFeedStockGetResponse {
  success: boolean;
  data: CattleFeedStock[];
}

export interface CattleFeedStockReportResponse {
  success: boolean;
  data: {
    cattlefeed_stock: CattleFeedStock[];
    farmer_payments: any[];
  };
}

export const cattleFeedApi = {
  createStock: async (data: CattleFeedStockRequest) => {
    const res = await api.post("/web/cattlefeed-stock/create", data);
    return res.data;
  },

  updateStock: async (id: number, data: CattleFeedStockUpdateRequest) => {
    const res = await api.put(`/web/cattlefeed-stock/update/${id}`, data);
    return res.data;
  },

  getStock: async (ownerId: string | number, ownerType: "group" | "vlc" = "vlc") => {
    const res = await api.get(`/web/cattlefeed-stock/get?owner_type=${ownerType}&owner_id=${ownerId}`);
    return res.data;
  },

  getStockSummary: async (ownerId: string | number) => {
    const res = await api.get(`/web/cattlefeed-stock/get?owner_type=vlc&owner_id=${ownerId}`);
    return res.data;
  },

  deleteStock: async (id: number) => {
    const res = await api.delete(`/web/cattlefeed-stock/delete/${id}`);
    return res.data;
  },

  transferStock: async (data: {
    from_owner_id: number;
    to_owner_id: number;
    stock_name: string;
    quantity: number;
    date?: string;
  }) => {
    const res = await api.post("/web/cattlefeed-stock/transfer", data);
    return res.data;
  },

  getStockReport: async (dairyId: string | number, webUserId: string | number, startDate: string, endDate: string) => {
    // If web_user_id is passed, the array will include both branch and main inventory
    const res = await api.get(`/web/cattlefeed-stock/report?dairy_id=${dairyId}&web_user_id=${webUserId}&start_date=${startDate}&end_date=${endDate}`);
    return res.data;
  },
};
