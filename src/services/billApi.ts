import { api } from "./config";

export interface GenerateBillRequest {
  farmer_id: string;
  dairy_id: number;
  date?: string;
  period_start: string;
  period_end: string;
  milk_total: number;
  total_advance: number;
  total_feed: number;
  total_other: number;
  total_received: number;
  net_payable: number;
  remaining_advance: number;
  remaining_cattle_feed: number;
  remaining_other1: number;
  remaining_other2: number;
}

export const billApi = {
  generateBill: (payload: GenerateBillRequest) => 
    api.post("/bill/generate", payload),

  generateBulkBills: (billsData: any) => 
    api.post("/bill/generatebills", billsData),

  downloadBill: (farmerId: string) => 
    api.get("/bill/bill-download", { 
      params: { farmer_id: farmerId },
      responseType: "blob"
    }),
};
