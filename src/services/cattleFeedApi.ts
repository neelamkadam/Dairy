import { api } from "./config";

export interface CattleFeedStockRequest {
  dairy_id: string;
  stock_name: string;
  amount: number;
  stock: number;
}

export interface CattleFeedStockUpdateRequest {
  stock_name: string;
  amount: number;
  stock: number;
}

export interface CattleFeedStock {
  id: number;
  dairy_id: string;
  stock_name: string;
  amount: string;
  stock: number;
  date: string;
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

export const cattleFeedApi = {
  createStock: async (data: CattleFeedStockRequest) => {
    console.log('📤 CREATE:', data);
    const res = await api.post("/web/cattlefeed-stock/create", data);
    console.log('✅ CREATE Response:', res.data);
    return res.data;
  },

  updateStock: async (id: number, data: CattleFeedStockUpdateRequest) => {
    console.log('📤 UPDATE:', { id, data });
    const res = await api.put(`/web/cattlefeed-stock/update/${id}`, data);
    console.log('✅ UPDATE Response:', res.data);
    return res.data;
  },

  getStock: async (dairyId: string) => {
    console.log('📤 GET:', dairyId);
    const res = await api.get(`/web/cattlefeed-stock/get?dairy_id=${dairyId}`);
    console.log('✅ GET Response:', res.data);
    return res.data;
  },

  getStockSummary: async (dairyId: string) => {
    console.log('📤 STOCK SUMMARY GET:', dairyId);
    const res = await api.get(`/web/cattlefeed-stock/get?dairy_id=${dairyId}`);
    console.log('✅ STOCK SUMMARY GET Response:', res.data);
    return res.data;
  },
};
