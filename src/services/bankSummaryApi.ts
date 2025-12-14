import { api } from "./config";

export interface BankSummaryParams {
  dairy_id: string;
  start_date: string;
  end_date: string;
}

export interface BankSummaryData {
  farmer_id: string;
  milk_total: number;
  fullName: string;
  mobile_number: string;
  email: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface BankSummaryResponse {
  success: boolean;
  message: string;
  filters: BankSummaryParams;
  data: BankSummaryData[];
}

export const bankSummaryApi = {
  getBankSummary: async (params: BankSummaryParams) => {
    const res = await api.get("/web/billing/payment-bank-summary", { params });
    return res.data;
  },
};
