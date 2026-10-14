import AxiosClient from "./interceptor";

// Company name / address printed at the top of farmer bills. Kept on the
// admin's account; a sub-user reads their admin's profile.
export interface CompanyProfile {
  company_name: string | null;
  company_address: string | null;
}

export const webUserApi = {
  getPriority: async (userId: number) => {
    return AxiosClient.get(`/web-users/priority/${userId}`);
  },

  updatePriority: async (userId: number, priority: string[]) => {
    return AxiosClient.put('/web-users/priority', { userId, priority });
  },

  getAllWebUsers: async () => {
    return AxiosClient.get('/web-users');
  },

  getCompanyProfile: async (userId: number) => {
    const { data } = await AxiosClient.get(`/web-users/company-profile/${userId}`);
    return data as { success: boolean; data: CompanyProfile };
  },

  // Admin only. A value sets, null / "" clears.
  updateCompanyProfile: async (userId: number, profile: Partial<CompanyProfile>) => {
    const { data } = await AxiosClient.put('/web-users/company-profile', { userId, ...profile });
    return data as { success: boolean; message: string };
  },

  // General Settings lock, set by the super admin on the user's account owner
  getSettingsLock: async (userId: number) => {
    const { data } = await AxiosClient.get(`/web-users/settings-lock/${userId}`);
    return data as { success: boolean; locked: boolean };
  },

  verifySettingsLock: async (userId: number, password: string) => {
    const { data } = await AxiosClient.post('/web-users/settings-lock/verify', { userId, password });
    return data as { success: boolean; valid: boolean };
  },
};
