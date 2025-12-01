import { api } from "./config";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";

export interface DeductionSummaryParams {
  dairy_id: string;
  date_from: string;
  date_to: string;
}

export const deductionApi = {
  getAllFarmersBalance: (dairyId: number, dateFrom: string, dateTo: string) =>
    api.get("/payments/getdairybillsummary", {
      params: { dairyid: dairyId, datefrom: dateFrom, dateto: dateTo }
    }),

  getFarmerBillDetails: (farmerId: string, dairyId: number, dateFrom: string, dateTo: string) =>
    api.get("/payments/getFarmerBillDetails", {
      params: {
        farmer_id: normalizeFarmerId(farmerId),
        dairyid: dairyId,
        datefrom: dateFrom,
        dateto: dateTo
      }
    }),

  updateFarmerBill: (payload: any) =>
    api.put("/payments/getFarmerBillUpdate", payload),

  updateFarmerBillWeb: (payload: any) =>
    api.put("/web/billing/update-farmer-bill", payload),

  checkPreviousBillCycle: (dairyId: number, dateFrom: string, dateTo: string) =>
    api.get("/payments/getdairybillsummary", {
      params: { dairyid: dairyId, datefrom: dateFrom, dateto: dateTo }
    }),

  getFinalizedBills: (billIds: number[]) =>
    api.post("/bill/finalize", { billIds }),

  getBillDetailsByFarmers: async (dairyId: number, farmerIds: string[], periodStart: string, periodEnd: string) => {
    console.log('🔵 Get Bill Details by Farmers API Request:', {
      endpoint: '/web/billing/bill-details',
      params: { dairy_id: dairyId, farmer_id: farmerIds.join(','), period_start: periodStart, period_end: periodEnd }
    });
    
    const response = await api.get("/web/billing/bill-details", {
      params: { 
        dairy_id: dairyId, 
        farmer_id: farmerIds.join(','), 
        period_start: periodStart, 
        period_end: periodEnd 
      }
    });
    
    console.log('🟢 Get Bill Details by Farmers API Response:', response.data);
    return response;
  },
};
