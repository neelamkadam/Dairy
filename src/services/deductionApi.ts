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

  updateFarmerBillWeb: (payload: any) => {
    console.log('📤 [DEDUCTION API] updateFarmerBillWeb - Payload:', payload);
    return api.put("/web/billing/update-farmer-bill", payload).then(response => {
      console.log('📤 [DEDUCTION API] updateFarmerBillWeb - Response:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ [API ERROR] updateFarmerBillWeb:', error?.response?.data || error);
      throw error;
    });
  },

  checkPreviousBillCycle: (dairyId: number, dateFrom: string, dateTo: string) =>
    api.get("/payments/getdairybillsummary", {
      params: { dairyid: dairyId, datefrom: dateFrom, dateto: dateTo }
    }),

  getFinalizedBills: (billIds: number[]) =>
    api.post("/bill/finalize", { billIds }),

  getBillDetailsByFarmers: async (dairyId: number, farmerIds: string[], periodStart: string, periodEnd: string) => {
    const response = await api.get("/web/billing/bill-details", {
      params: { 
        dairy_id: dairyId, 
        farmer_id: farmerIds.join(','), 
        period_start: periodStart, 
        period_end: periodEnd 
      }
    });
    console.log('📤 [DEDUCTION API] getBillDetailsByFarmers - Response:', response.data);
    return response;
  },

  resetToPending: async (dairyId: number, periodStart: string, periodEnd: string) => {
    const response = await api.post("/bill/reset-to-pending", {
      dairy_id: dairyId,
      period_start: periodStart,
      period_end: periodEnd
    });
    console.log('🔄 [DEDUCTION API] resetToPending - Response:', response.data);
    return response;
  },
};
