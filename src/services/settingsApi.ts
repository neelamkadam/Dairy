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
}

export const settingsApi = {
  get: (vlc: string) => 
    api.post("/web/settings/get", { vlc }),

  update: (payload: SettingsData) => 
    api.post("/web/settings/update", payload),
};
