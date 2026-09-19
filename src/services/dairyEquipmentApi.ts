import { api } from './config';

// Equipment handed over to a dairy. One row per equipment type per dairy —
// a second scale is quantity 2, not a second row — so adding a type the dairy
// already has answers 409. dairy_id is the numeric dairy.id (branch_id).

// Suggested types; admins can add any other name.
export const DEFAULT_EQUIPMENT = [
  "Milk Analyzer",
  "Weighting Scale",
  "Mobile Application",
  "Stirer",
  "Milk Can",
  "Solar Panel",
];

export interface DairyEquipment {
  id: number;
  dairy_id: number;
  equipment_name: string;
  quantity: number;
  serial_number: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DairyEquipmentItem {
  equipment_name: string;
  quantity?: number;
  serial_number?: string | null;
}

export interface DairyEquipmentListResponse {
  success: boolean;
  dairy_id: number;
  total: number;
  total_quantity: number;
  data: DairyEquipment[];
}

// Same shape as an entry in the web user's branch list.
export interface EquipmentDairy {
  branch_id: number;
  username: string;
  name: string;
  branchName: string;
}

export const dairyEquipmentApi = {
  // Find a dairy by the Dairy ID shown after Create Dairy (its 500xxx login).
  // Needed for dairies not yet assigned to this web user's branches.
  lookupDairy: async (code: string) => {
    const { data } = await api.get('/web/dairy-equipment/lookup', { params: { code } });
    return data as { success: boolean; data: EquipmentDairy; message?: string };
  },

  // Alphabetical by name.
  list: async (dairyId: number | string) => {
    const { data } = await api.get('/web/dairy-equipment', { params: { dairy_id: dairyId } });
    return data as DairyEquipmentListResponse;
  },

  create: async (payload: DairyEquipmentItem & { dairy_id: number; created_by?: string }) => {
    const { data } = await api.post('/web/dairy-equipment', payload);
    return data;
  },

  // Partial update — only the fields sent change. serial_number: null clears it.
  update: async (id: number, payload: Partial<DairyEquipmentItem>) => {
    const { data } = await api.put(`/web/dairy-equipment/${id}`, payload);
    return data;
  },

  // Returns the removed row.
  remove: async (id: number) => {
    const { data } = await api.delete(`/web/dairy-equipment/${id}`);
    return data;
  },

  // Makes the dairy's equipment exactly `items` (types left out are removed).
  replaceAll: async (dairyId: number, items: DairyEquipmentItem[], createdBy?: string) => {
    const { data } = await api.put(`/web/dairy-equipment/dairy/${dairyId}`, { items, created_by: createdBy });
    return data;
  },
};
