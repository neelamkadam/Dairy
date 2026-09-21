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

/** Which VLC Collection Entry steps a user may open. Both sit under the Collection Entry section. */
export const getVlcStepAccess = (access: SidebarAccessRow) => {
  const section = Number(access?.collection_entry) === 1;
  return {
    weight: section && isOnByDefault(access, "vlc_weight"),
    analyser: section && isOnByDefault(access, "vlc_analyser"),
  };
};
