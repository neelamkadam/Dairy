import { api } from "./config";

export const getSidebarAccess = async (webUserId: number) => {
  const response = await api.get(`/web/sidebar/access?web_user_id=${webUserId}`);
  return response.data;
};

export const createOrUpdateSidebarAccess = async (data: any) => {
  const response = await api.post("/web/sidebar/access", data);
  return response.data;
};

type SidebarAccessRow = Record<string, unknown> | null | undefined;

/**
 * For flags added after sidebar_access existed (VLC steps, Group Stock, Farmer
 * Payment), which default to on: a missing value — a row saved before the flag
 * existed, or a server without the migration — counts as on. Off while access
 * has not loaded yet, so a switched-off item never flashes in.
 */
export const isOnByDefault = (access: SidebarAccessRow, key: string) =>
  !!access && Number(access[key] ?? 1) === 1;

/**
 * item_access — the per-item switches inside sections, { key: 0 | 1 }. Arrives
 * parsed, but read defensively (text on a LONGTEXT column, null when never set).
 */
export const parseItemAccess = (raw: unknown): Record<string, number> => {
  let value = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, Number(v) === 1 ? 1 : 0]));
};

/** An item inside a section: on unless switched off (sidebarItems.ts has the keys). */
export const isItemOn = (access: SidebarAccessRow, key: string) =>
  !!access && (parseItemAccess(access.item_access)[key] ?? 1) === 1;

/** Which VLC Collection Entry steps a user may open. Both need the Collection Entry section and its VLC item. */
export const getVlcStepAccess = (access: SidebarAccessRow) => {
  const entry = Number(access?.collection_entry) === 1 && isItemOn(access, "vlc_collection_entry");
  return {
    weight: entry && isOnByDefault(access, "vlc_weight"),
    analyser: entry && isOnByDefault(access, "vlc_analyser"),
  };
};
