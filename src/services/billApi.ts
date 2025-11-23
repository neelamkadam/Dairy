import { api } from "./config";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";

export interface GenerateBillRequest {
  farmer_id: string;
  dairy_id: number;
  date?: string;
  period_start: string;
  period_end: string;
  milk_total: number;
  advance_total: number;
  cattlefeed_total: number;
  other1_total: number;
  other2_total: number;
  received_total: number;
  net_payable: number;
  advance_remaining: number;
  cattlefeed_remaining: number;
  other1_remaining: number;
  other2_remaining: number;
}

export interface BulkBillRequest {
  success: boolean;
  dairy_id: number;
  records: Array<GenerateBillRequest & { status: string; is_finalized: number }>;
}

export const billApi = {
  generateBill: (payload: GenerateBillRequest) => {
    const normalized = {
      ...payload,
      farmer_id: normalizeFarmerId(payload.farmer_id)
    };
    return api.post("/bill/generate", normalized);
  },

  generateBills: (billsData: BulkBillRequest) => 
    api.post("/bill/generatebills", billsData),

  downloadBill: (farmerId: string) => 
    api.get("/bill/bill-download", { 
      params: { farmer_id: normalizeFarmerId(farmerId) },
      responseType: "blob"
    }),
};
