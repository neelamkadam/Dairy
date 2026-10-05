import AxiosClient from "./interceptor";

// Licence keys for the Doodh Setu PC (offline desktop) edition.
//
// Unlike the other admin services this goes through AxiosClient, not `api`:
// the backend signs a working licence for whoever calls POST /pc-licenses, so
// those routes require the admin's Bearer token, which AxiosClient attaches.

export type PcLicenseKind = "licensed" | "demo";

export interface PcLicense {
  id: number;
  machine_id: string;
  request_code: string;
  kind: PcLicenseKind;
  dairy_name: string | null;
  customer_mobile: string | null;
  valid_from: string;
  valid_to: string;
  duration_days: number;
  license_key: string;
  sale_type: "self" | "dealer";
  dealer_name: string | null;
  dealer_commission: string | number;
  sale_amount: string | number;
  renewal_amount: string | number;
  remark: string | null;
  issued_by: number | null;
  issued_by_name: string | null;
  created_at: string;
}

export interface IssuePcLicensePayload {
  request_code: string;
  duration_days: number;
  kind: PcLicenseKind;
  dairy_name?: string;
  customer_mobile?: string;
  sale_type: "self" | "dealer";
  dealer_name?: string;
  dealer_commission?: number;
  sale_amount?: number;
  renewal_amount?: number;
  remark?: string;
}

export const pcLicenseApi = {
  getLicenses: (params: { search?: string; request_code?: string } = {}) =>
    AxiosClient.get<{ success: boolean; data: PcLicense[] }>("/pc-licenses", { params }),

  issueLicense: (payload: IssuePcLicensePayload) =>
    AxiosClient.post<{
      success: boolean;
      message: string;
      extended_from_previous: boolean;
      data: PcLicense;
    }>("/pc-licenses", payload),
};

/** "4e8a 4aab-e468…" -> "4E8A4AABE468…", or null unless 32 hex chars remain. */
export const normalizeRequestCode = (value: string): string | null => {
  const bare = value.replace(/[\s-]/g, "").toUpperCase();
  return /^[0-9A-F]{32}$/.test(bare) ? bare : null;
};

/** The dashed form the PC app shows: 4E8A-4AAB-… */
export const formatRequestCode = (machineId: string): string =>
  (machineId.match(/.{1,4}/g) ?? []).join("-");
