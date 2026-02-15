import { api } from "./config";

export interface BonusDeduction {
  id?: number;
  dairy_id: number;
  farmer_id: string;
  effective_from: string;
  bonus_deduction: number;
  fixed_deduction: number;
  remark?: string;
  created_at?: string;
}

export interface BonusDeductionLog {
  dairy_id: number;
  farmer_id: string;
  start_date: string;
  end_date: string;
  bonus_deduction: number;
  fixed_deduction: number;
}

export const bonusApi = {
  // GET /bonus-deductions?dairy_id={}&start_date={}&end_date={}&farmer_id={}
  getBonusDeductions: (params: {
    dairy_id: number;
    start_date: string;
    end_date: string;
    farmer_id?: string;
  }) => {
    return api.get("/bonus-deductions", { params });
  },

  // POST /bonus-deductions/by-farmers
  getBonusDeductionsByDairyAndFarmers: (
    dairy_id: number,
    farmer_ids: string[],
    effective_from: string
  ) => {
    return api.post("/bonus-deductions/by-farmers", {
      dairy_id,
      farmer_ids,
      effective_from,
    });
  },

  // POST /bonus-deductions
  createBonusDeduction: (data: BonusDeduction) => {
    return api.post("/bonus-deductions", data);
  },

  // PUT /bonus-deductions/{id}
  updateBonusDeduction: (id: number, data: Partial<BonusDeduction>) => {
    return api.put(`/bonus-deductions/${id}`, data);
  },

  // POST /bonus-deduction-logs
  createBonusDeductionLog: (data: BonusDeductionLog) => {
    return api.post("/bonus-deduction-logs", data);
  },
};
