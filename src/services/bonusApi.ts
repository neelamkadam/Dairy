import { api } from "./config";

export interface BonusDeduction {
  id?: number;
  dairy_id: number;
  farmer_id: string;
  start_date: string;
  end_date: string;
  bonus_deduction: number;
  fixed_deduction: number;
  created_at?: string;
}

export const bonusApi = {
  getBonusDeductions: (params: {
    dairy_id: number;
    start_date: string;
    end_date: string;
    farmer_id?: string;
  }) => {
    return api.get("/bonus-deductions", { params });
  },

  createBonusDeduction: (data: BonusDeduction) => {
    return api.post("/bonus-deductions", data);
  },
};
