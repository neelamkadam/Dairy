import AxiosClient from "./interceptor";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";

export interface CCCollectionWeightPayload {
  farmer_id: string;
  dairy_id: number;
  quantity: number;
  type: 'Cow' | 'Buffalo';
  sample_id?: number;
  date: string;
  shift: 'Morning' | 'Evening';
}

export const ccCollectionApi = {
  create: async (payload: CCCollectionWeightPayload) => {
    const normalizedPayload = {
      ...payload,
      farmer_id: normalizeFarmerId(payload.farmer_id)
    };
    const response = await AxiosClient.post('/web/cc-collection/create', normalizedPayload);
    return response.data;
  },

  get: async (payload: { sample_id?: number; farmer_id?: string; dairy_id: number; date: string; shift: string }) => {
    if (payload.farmer_id) {
      payload.farmer_id = normalizeFarmerId(payload.farmer_id);
    }
    const response = await AxiosClient.post('/web/cc-collection/get', payload);
    return response.data;
  },

  getAll: async (params: { dairy_id: number; date: string; shift: string }) => {
    const queryString = new URLSearchParams(params as any).toString();
    const response = await AxiosClient.get(`/web/cc-collection/all?${queryString}`);
    return response.data;
  }
};
