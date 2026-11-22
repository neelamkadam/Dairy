import AxiosClient from "./interceptor";

// Logged-in Devices (Settings -> General Settings). The backend only ever lists and
// ends the signed-in account's own sessions (backend controllers/webSessionController.js).

export interface WebSession {
  id: string;
  user_agent: string | null;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  /** Seconds before the server answered; turned into dates on this side, so clocks never matter */
  signed_in_seconds_ago: number;
  last_seen_seconds_ago: number;
  is_current: boolean;
}

export const sessionApi = {
  list: async () => {
    const { data } = await AxiosClient.get("/web-users/sessions");
    return data as { success: boolean; data: WebSession[] };
  },

  logoutDevice: async (sessionId: string) => {
    const { data } = await AxiosClient.delete(`/web-users/sessions/${encodeURIComponent(sessionId)}`);
    return data as { success: boolean; message?: string };
  },

  logoutOthers: async () => {
    const { data } = await AxiosClient.post("/web-users/sessions/logout-others");
    return data as { success: boolean; loggedOut: number };
  },

  // Also logs out every other device
  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await AxiosClient.post("/web-users/change-password", { currentPassword, newPassword });
    return data as { success: boolean; message?: string; loggedOut: number };
  },

  // Sign out. The token is passed in because Sign out clears it straight after calling this.
  logout: async (token: string | null) => {
    if (!token) return;
    await AxiosClient.post("/web-users/logout", {}, { headers: { Authorization: `Bearer ${token}` } });
  },
};
