import { api } from "./config";

export const vlcCommissionApi = {
  create: async (data: {
    vlcc: string;
    type: string;
    amount: number;
    effective_from: string;
  }) => {
    return await api.post("/web/billing/vlc-commission", data);
  },
};
