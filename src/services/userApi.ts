import AxiosClient from "./interceptor";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";

export interface Farmer {
  id: string;
  username: string;
  farmerId: string;
  fullName?: string;
  name?: string;
  mobile_number?: string;
  mobile?: string;
  phone?: string;
  milkType: 'Cow' | 'Buffalo' | 'Both';
  rateChart?: string;
  dairy_id?: number;
  address?: string;
}

export const userApi = {
  getById: async (farmerId: string, dairyId?: number): Promise<Farmer | null> => {
    try {
      const normalized = normalizeFarmerId(farmerId);
      if (!normalized) return null;
      
      const url = dairyId 
        ? `/users/username/${normalized}?dairy_id=${dairyId}`
        : `/users/username/${normalized}`;
      
      const response = await AxiosClient.get(url);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
};
