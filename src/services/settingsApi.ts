import { api } from "./config";

export interface SettingsData {
  vlc: string;
  add_farmer: number;
  rate_chart: number;
  deduction: number;
  payment_receipt: number;
  generate_bill: number;
  analyser: number;
  weight_tier: number;
  weight: number;
  printer: number;
  language: string;
  show_water: number;
  report_language: string;
  multiple_modal?: number;
}

export interface ReportSettingsData {
  vlc: string | number;
  show_shift_report: number;
  show_total_collection: number;
  show_payment_summary: number;
  show_rate_chart: number;
  show_farmer_bill: number;
  show_farmer_list: number;
  show_difference_report: number;
  show_bonus_deduction: number;
  show_collection_history: number;
  show_cattle_feed: number;
}

export const settingsApi = {
  get: (vlc: string) => 
    api.post("/web/settings/get", { vlc }),

  update: (payload: SettingsData) => 
    api.post("/web/settings/update", payload),

  getReportSettings: (vlc: string) =>
    api.post("/report-settings/get", { vlc }),

  updateReportSettings: (payload: ReportSettingsData) =>
    api.post("/report-settings/update", payload),
};
