import AxiosClient from "./interceptor";

// Shift timing gate for mobile collection entry.
// The backend does NOT block the collection APIs — this config only drives the
// mobile app's UI gate (GET status is what the app checks before enabling the
// entry form). All times are IST; a null start/end pair means that shift is
// allowed at all times; no config at all means everything is always allowed.

export interface ShiftTimingPayload {
  adminId: number;
  morning_start: string | null; // "HH:mm" IST
  morning_end: string | null;
  evening_start: string | null;
  evening_end: string | null;
}

export const shiftTimingApi = {
  // Returns the saved config (morning_start/end, evening_start/end).
  // data is null when nothing is configured yet.
  getTimings: (userId: number) =>
    AxiosClient.get(`/web/shift-timings/get/${userId}`),

  // Server's current IST time, each shift's window, allowed_shifts, entry_allowed.
  getStatus: (userId: number) =>
    AxiosClient.get(`/web/shift-timings/status/${userId}`),

  // start/end must come as a pair per shift.
  setTimings: (payload: ShiftTimingPayload) =>
    AxiosClient.put("/web/shift-timings/set", payload),
};
