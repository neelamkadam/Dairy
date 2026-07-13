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
}

export const createDairyApi = {
  // Create the new dairy/branch.
  createBranch: async (payload: CreateBranchPayload) => {
    const { data } = await api.post('/branch/create', payload);
    return data;
  },
};
