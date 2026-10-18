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

/**
 * Per-user machine locks (Settings → Machine Entry Lock), kept in item_access
 * beside the sidebar switches but off unless set: 1 = on Doodh Setu PC that
 * user takes FAT/SNF (analyser) or the weight (scale) only from the wired
 * machine and cannot type it. The VLC's General Settings switches are for the
 * mobile app and do not lock anything on the PC.
 */
export const MACHINE_ONLY_KEYS = { analyser: "machine_only_analyser", weight: "machine_only_weight" } as const;

export const getMachineOnly = (access: SidebarAccessRow) => {
  const items = parseItemAccess(access?.item_access);
  return { analyser: items[MACHINE_ONLY_KEYS.analyser] === 1, weight: items[MACHINE_ONLY_KEYS.weight] === 1 };
};

// What POST /web/sidebar/access writes: every section flag (a missing one is
// saved as off), and the later default-on flags only when sent.
const SECTION_FLAGS = ["dashboard", "collection_entry", "collection", "master", "billing", "reports", "settings", "shubham_milk_product", "dyn"];
const DEFAULT_ON_FLAGS = ["vlc_weight", "vlc_analyser", "group_stock", "farmer_payment"];

/**
 * Sets some item_access entries of one user and keeps the rest of their
 * Sidebar Access as it is: read fresh, then written back whole, since the
 * server overwrites every section flag on save.
 */
export const updateItemAccess = async (webUserId: number, patch: Record<string, number>) => {
  const current = await getSidebarAccess(webUserId);
  if (!current?.success || !current.data) throw new Error(current?.message || "Could not read this user's access");
  const row = current.data as Record<string, unknown>;
  const body: Record<string, unknown> = {
    web_user_id: webUserId,
    item_access: { ...parseItemAccess(row.item_access), ...patch },
  };
  for (const key of SECTION_FLAGS) body[key] = Number(row[key]) === 1 ? 1 : 0;
  for (const key of DEFAULT_ON_FLAGS) {
    if (row[key] !== undefined && row[key] !== null) body[key] = Number(row[key]) === 1 ? 1 : 0;
  }
  return createOrUpdateSidebarAccess(body);
};
