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

// The settings the web General Settings page owns.
export interface PageSettings {
  add_farmer: number;
  rate_chart: number;
  deduction: number;
  payment_receipt: number;
  generate_bill: number;
  analyser: number;
  weight_tier: number;
  weight: number;
  printer: number;
  show_water: number;
  multiple_modal: number;
  cc: number;
  language: string;
  report_language: string;
}

export interface PageSettingsForVlc {
  vlc: string;
  settings: PageSettings;
  report_settings: Omit<ReportSettingsData, "vlc">;
  has_password: boolean;
}

export const settingsApi = {
  get: (vlc: string) => 
    api.post("/web/settings/get", { vlc }),

  update: (payload: SettingsData) => 
    api.post("/web/settings/update", payload),

  getReportSettings: (vlc: string) =>
    api.post("/report-settings/get", { vlc }),

  // The General Settings page's fields for several VLCs, in the order given
  // (has_password only — the password itself is never returned).
  getMany: (vlcs: string[]) =>
    api.post<{ success: boolean; data: PageSettingsForVlc[] }>("/web/settings/get-many", { vlcs }),

  // One set of page settings (and optionally a password) applied to every VLC,
  // all or nothing. Only the page's own fields are written.
  apply: (payload: {
    vlcs: string[];
    settings?: Partial<PageSettings>;
    report_settings?: Partial<Omit<ReportSettingsData, "vlc">>;
    password?: string;
  }) => api.post<{ success: boolean; message: string }>("/web/settings/apply", payload),

  updateReportSettings: (payload: ReportSettingsData) =>
    api.post("/report-settings/update", payload),
};
