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

  checkPreviousBillCycle: (dairyId: number, dateFrom: string, dateTo: string) =>
    api.get("/payments/getdairybillsummary", {
      params: { dairyid: dairyId, datefrom: dateFrom, dateto: dateTo }
    }),

  getFinalizedBills: (billIds: number[]) =>
    api.post("/bill/finalize", { billIds }),
};
