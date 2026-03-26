import { api } from "./config";

export const adminApi = {
  getAllUsers: () => api.get("/web/admin/users"),
  toggleUserStatus: (userId: number, isActive: boolean) => 
    api.put("/web-users/toggle-status", { userId, isActive }),
  toggleDairyStatus: (username: string, isActive: boolean) => 
    api.put("/auth/toggle-dairy-status", { username, isActive }),
  setPassword: (userId: number, newPassword: string) => 
    api.post("/web-users/set-password", { userId, newPassword }),
  createAdmin: (data: any) => api.post("/web/admin/create-admin", data),
  getTrialStartDate: (username: string) => api.get(`/auth/trial-start-date?username=${username}`),
  updateTrialDays: (username: string, days: number) => api.put("/auth/update-trial-days", { username, days }),
  getTrialDetails: (payload: { usernames?: string[], username?: string }) => api.post("/auth/get-trial-details", payload),
};
