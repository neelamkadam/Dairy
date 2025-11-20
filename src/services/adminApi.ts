import { api } from "./config";

export const adminApi = {
  getAllUsers: () => api.get("/web/admin/users"),
};
