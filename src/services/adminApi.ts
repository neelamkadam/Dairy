import { api } from "./config";

export const adminApi = {
  getAllUsers: () => api.get("/web/admin/users"),
  toggleUserStatus: (userId: number, isActive: boolean) => 
    api.put("/web-users/toggle-status", { userId, isActive }),
  toggleDairyStatus: (username: string, isActive: boolean) => 
    api.put("/auth/toggle-dairy-status", { username, isActive }),
};
