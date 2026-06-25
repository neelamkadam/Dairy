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
}

export const createDairyApi = {
  // Step 1 — send an OTP to the given mobile number.
  sendOtp: async (mobile_number: string) => {
    const { data } = await api.post('/auth/send-otp', { mobile_number });
    return data;
  },

  // Step 2 — verify the OTP. For a Dairyadmin the response carries any
  // existing dairies under `data` plus a freshly generated auth token.
  verifyOtp: async (payload: { mobile_number: string; otp: string; role: string }) => {
    const { data } = await api.post('/auth/verify-otp', payload);
    return data;
  },

  // Step 3 — create the new dairy/branch. The token returned by verifyOtp is
  // forwarded so the backend can map the owner to this session.
  createBranch: async (payload: CreateBranchPayload, token?: string) => {
    const { data } = await api.post('/branch/create', payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data;
  },
};
