import AxiosClient from "./interceptor";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";

export interface CollectionPayload {
  farmer_id: string;
  dairy_id: number;
  type: 'Cow' | 'Buffalo';
  quantity: number;
  fat: number;
  snf: number;
  clr: number;
  rate: number;
  amount: number;
  shift: 'Morning' | 'Evening';
  date: string;
}

export const collectionApi = {
  create: async (payload: CollectionPayload) => {
    const normalizedPayload = {
      ...payload,
      farmer_id: normalizeFarmerId(payload.farmer_id)
    };
    const response = await AxiosClient.post('/collections', normalizedPayload);
    return response.data;
  },

  update: async (id: number, payload: CollectionPayload) => {
    const normalizedPayload = {
      ...payload,
      farmer_id: normalizeFarmerId(payload.farmer_id)
    };
    const response = await AxiosClient.put(`/collections/${id}`, normalizedPayload);
    return response.data;
  },

  getCollections: async (params: { shift?: string; dairy_id?: number; date?: string }) => {
    const queryString = new URLSearchParams(params as any).toString();
    const response = await AxiosClient.get(`/collections?${queryString}`);
    return response.data;
  },

  getTodaysCollectionByFarmer: async (dairyId: number, farmerId: string, date?: string) => {
    const normalizedFarmerId = normalizeFarmerId(farmerId);
    let url = `/collections/getTodayscollectionbyfarmer?dairyid=${dairyId}&farmer_id=${normalizedFarmerId}`;
    if (date) {
      url += `&date=${date}`;
    }
    const response = await AxiosClient.get(url);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await AxiosClient.delete(`/collections/${id}`);
    return response.data;
  }
};
