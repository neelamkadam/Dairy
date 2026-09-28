import { api } from './config';

export interface CreateBranchPayload {
  name: string;
  branchname: string;
  ownername: string;
  mobile_number: string;
  password: string;
  days: number;
  villagename: string;
  address: string;
  role: string;
  // Optional hierarchy links — any combination or none.
  cc_id?: number | null;
  bmc_id?: number | null;
  route_id?: number | null;
  // Optional VLC bank details (commission NEFT).
  bank_name?: string;
  account_holder?: string;
  account_number?: string;
  ifsc_code?: string;
}

// A dairy assigned to the web user, with everything the edit form needs.
export interface UserDairy {
  dairy_id: number;
  username: string | null; // Dairymgr login — the Dairy ID people see
  name: string;
  branchname: string | null;
  ownername: string | null;
  days: number | null;
  villagename: string | null;
  address: string | null;
  mobile_number: string | null; // owner's; not editable here
  cc_id: number | null;
  cc_name: string | null;
  bmc_id: number | null;
  bmc_name: string | null;
  route_id: number | null;
  route_name: string | null;
  active: number | null;
  // VLC bank details; absent until the server has the dairy bank columns.
  bank_name?: string | null;
  account_holder?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
}

// Partial update. villagename / address: null clears them.
// cc_id / bmc_id / route_id: null detaches, omitted keeps; with a route set,
// an omitted BMC / CC is inherited from that route.
export interface UpdateDairyPayload {
  name?: string;
  branchname?: string;
  ownername?: string;
  days?: number;
  villagename?: string | null;
  address?: string | null;
  cc_id?: number | null;
  bmc_id?: number | null;
  route_id?: number | null;
  // Bank details: value sets, null clears, omitted keeps.
  bank_name?: string | null;
  account_holder?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
}

export const createDairyApi = {
  // Create the new dairy/branch.
  createBranch: async (payload: CreateBranchPayload) => {
    const { data } = await api.post('/branch/create', payload);
    return data;
  },

  // Dairies assigned to this web user (the same set as the app's dairy dropdowns).
  listUserDairies: async (userId: number) => {
    const { data } = await api.get(`/branch/web-user/${userId}`);
    return data as { success: boolean; total: number; data: UserDairy[] };
  },

  updateDairy: async (dairyId: number, payload: UpdateDairyPayload) => {
    const { data } = await api.put(`/branch/updateDairydetails/${dairyId}`, payload);
    return data;
  },
};
