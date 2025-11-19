import { api } from "./config";

export interface DeductionSummaryParams {
  dairy_id: string;
  date_from: string;
  date_to: string;
}

export const deductionApi = {
  getDeductionSummary: (params: DeductionSummaryParams) =>
    api.get("/deductions/summary", { params }),

  getFarmerDeductions: (farmerId: string, dairyId: string, dateFrom: string, dateTo: string) =>
    api.get("/deductions/farmer", {
      params: { farmer_id: farmerId, dairy_id: dairyId, date_from: dateFrom, date_to: dateTo }
    }),
};
