import { api } from "./config";

export interface CattleFeedStockRequest {
  dairy_id: string | number;
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
  dairy_id: string | number;
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

  getStock: async (dairyId: string | number) => {
    const res = await api.get(`/web/cattlefeed-stock/get?dairy_id=${dairyId}`);
    return res.data;
  },

  deleteStock: async (id: number) => {
    const res = await api.delete(`/web/cattlefeed-stock/delete/${id}`);
    return res.data;
  },

  getStockReport: async (dairyId: string | number, startDate: string, endDate: string) => {
    const res = await api.get(`/web/cattlefeed-stock/report?dairy_id=${dairyId}&start_date=${startDate}&end_date=${endDate}`);
    return res.data;
  },
};
