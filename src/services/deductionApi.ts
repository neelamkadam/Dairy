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
    console.log('🔵 [API] Update Farmer Bill Web - Request');
    console.log('📤 Payload being sent:', JSON.stringify(payload, null, 2));
    console.log('🔍 Payload fields breakdown:');
    console.log('  farmer_id:', payload.farmer_id);
    console.log('  dairy_id:', payload.dairy_id);
    console.log('  period_start:', payload.period_start);
    console.log('  period_end:', payload.period_end);
    console.log('  milk_total:', payload.milk_total);
    console.log('  advance_total:', payload.advance_total);
    console.log('  cattlefeed_total:', payload.cattlefeed_total);
    console.log('  other1_total:', payload.other1_total);
    console.log('  other2_total:', payload.other2_total);
    console.log('  received_total:', payload.received_total);
    console.log('  net_payable:', payload.net_payable, '<-- THIS SHOULD BE 0');
    console.log('  advance_remaining:', payload.advance_remaining);
    console.log('  cattlefeed_remaining:', payload.cattlefeed_remaining);
    console.log('  other1_remaining:', payload.other1_remaining);
    console.log('  other2_remaining:', payload.other2_remaining);
    
    return api.put("/web/billing/update-farmer-bill", payload).then(response => {
      console.log('✅ [API] Update Farmer Bill Web - Response');
      console.log('Response data:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ [API] Update Farmer Bill Web - Error');
      console.error('Error details:', error?.response?.data || error);
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
