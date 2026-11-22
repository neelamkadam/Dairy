import type { AxiosInstance } from "axios";
import { getTokenFromLocalStorage } from "@/lib/common-utils";

// Web panel login sessions (backend utils/webSessions.js). Every login is a session
// on the server; once it is logged out -- Sign out, "Log out" in General Settings ->
// Logged-in Devices on another device, or a password change -- the API answers this
// browser with 401 { code: "SESSION_ENDED" } and SessionEndedListener sends it to
// the login page.

export const SESSION_ENDED_EVENT = "web-session-ended";

/** The Authorization header, for API calls made with fetch or plain axios. */
export const authHeader = (): Record<string, string> => {
  const token = getTokenFromLocalStorage();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** This browser's session id: the `sid` inside the login token, or null. */
export const sessionIdFromToken = (token: string | null = getTokenFromLocalStorage()): string | null => {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const sid = JSON.parse(json)?.sid;
    return typeof sid === "string" && sid ? sid : null;
  } catch {
    return null;
  }
};

export const announceSessionEnded = () => {
  window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
};

/** For fetch: true when the response says this browser's session has ended. */
export const isSessionEndedResponse = (status: number, body: unknown) =>
  status === 401 && (body as { code?: string } | null)?.code === "SESSION_ENDED";

/** fetch with the login token; an ended session sends the browser to login. */
export const authFetch = async (input: string, init: RequestInit = {}) => {
  const response = await fetch(input, {
    ...init,
    headers: { ...((init.headers as Record<string, string>) || {}), ...authHeader() },
  });
  if (response.status === 401) {
    response.clone().json()
      .then((body) => { if (isSessionEndedResponse(401, body)) announceSessionEnded(); })
      .catch(() => {});
  }
  return response;
};

/**
 * Sends the login token with every request of an axios client, and announces an
 * ended session when the API reports one. A request that already sets its own
 * Authorization header keeps it.
 */
export const guardSession = (client: AxiosInstance) => {
  client.interceptors.request.use((config: any) => {
    const token = getTokenFromLocalStorage();
    if (token && !config.headers?.Authorization) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: any) => {
      if (isSessionEndedResponse(error?.response?.status, error?.response?.data)) {
        announceSessionEnded();
      }
      return Promise.reject(error);
    }
  );
};
