import { api } from "./config";

export const vlcCommissionApi = {
  // POST — create a commission entry (vlcc OR farmer_id required; at least one)
  create: async (data: {
    vlcc?: string;
    farmer_id?: string;
    type: string;
    amount: number;
    effective_from: string;
  }) => {
    return await api.post("/web/billing/vlc-commission", data);
  },

  // GET — fetch existing commissions by vlcc and/or farmer_id
  getByVlcc: async (vlcc: string) => {
    return await api.get(`/web/billing/vlc-commission?vlcc=${vlcc}`);
  },

  getByFarmer: async (vlcc: string, farmer_id: string) => {
    return await api.get(
      `/web/billing/vlc-commission?vlcc=${vlcc}&farmer_id=${farmer_id}`
    );
  },

  getByFilters: async (params: { vlcc?: string; farmer_id?: string }) => {
    const query = new URLSearchParams();
    if (params.vlcc) query.append("vlcc", params.vlcc);
    if (params.farmer_id) query.append("farmer_id", params.farmer_id);
    return await api.get(`/web/billing/vlc-commission?${query.toString()}`);
  },
};
