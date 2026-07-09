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
  cc_collection_id?: number;
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
  },

  bulkCreate: async (collections: BulkCollectionItem[]) => {
    const response = await AxiosClient.post('/collections/bulk', { collections });
    return response.data;
  },

  // Antibiotic: rate -1 on normal rows of the date/shift, flags them antibiotic
  // (skips finalized/paid, already-antibiotic and rate-below-1 rows)
  decreaseRatesByDate: async (payload: AntibioticRatePayload) => {
    const response = await AxiosClient.put('/collections/decrease-rates-by-date', payload);
    return response.data;
  },

  // Antibiotic revert: rate +1 on antibiotic rows of the date/shift, flags them back to normal
  // (skips finalized/paid & normal rows)
  revertRatesByDate: async (payload: AntibioticRatePayload) => {
    const response = await AxiosClient.put('/collections/revert-rates-by-date', payload);
    return response.data;
  },

  getAntibioticStatus: async (params: AntibioticRatePayload): Promise<AntibioticStatusResponse> => {
    const response = await AxiosClient.get('/collections/antibiotic-status', { params });
    return response.data;
  }
};

export interface AntibioticRatePayload {
  dairy_id: number;
  date: string;
  shift: 'Morning' | 'Evening';
}

export interface AntibioticStatusResponse {
  success: boolean;
  total: number;
  antibiotic_count: number;
  normal_count: number;
  status: 'empty' | 'normal' | 'antibiotic' | 'partial';
}

export interface BulkCollectionItem {
  farmer_id: string;
  dairy_id: string | number;
  type: string;
  quantity: number;
  fat: number;
  snf: number;
  clr: number;
  rate: number;
  shift: string;
  date?: string;
  water?: number;
}
