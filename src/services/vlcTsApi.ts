import { api } from "./config";

export const vlcTsApi = {
  create: async (data: {
    vlc: string;
    kg_fat_rate: number;
    kg_snf_rate: number;
    effective_from: string;
  }) => {
    return await api.post("/web/billing/vlc-ts", data);
  },
};
