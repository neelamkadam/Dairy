import { api } from "./config";

export interface BlockedNumber {
  id?: number | string;
  mobile_number: string;
  reason?: string;
  blocked_by?: string;
  created_at?: string;
  blocked_at?: string;
}

export interface BlockedNumbersListParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BlockNumberPayload {
  mobile_number?: string;
  mobile_numbers?: string[];
  reason?: string;
  blocked_by?: string;
}

export const blockedNumbersApi = {
  getBlockedNumbers: (params: BlockedNumbersListParams = {}) =>
    api.get("/blocked-numbers", { params }),

  checkBlockedNumber: (mobileNumber: string) =>
    api.get(`/blocked-numbers/check/${mobileNumber}`),

  blockNumber: (payload: BlockNumberPayload) =>
    api.post("/blocked-numbers", payload),

  unblockNumber: (mobileNumber: string) =>
    api.delete(`/blocked-numbers/${mobileNumber}`),
};
