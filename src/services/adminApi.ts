import axios from "axios";
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
  uploadImage: (formData: FormData) => axios.post("https://api.neodairysales.com/dairy/images/upload", formData),
  getImages: (params: { dairy_id?: string; ref_id?: string; ref_type?: string }) => 
    api.get("/dairy/images", { params }),
  getSignedUrl: (key: string) => api.get(`/dairy/images/url?key=${key}`),
  
  // Activation Records
  createActivation: (data: { 
    dairy_id?: string; 
    dairy_name?: string; 
    web_user_id?: string; 
    web_name?: string; 
    activation_date: string; 
    image_url: string; 
    remark?: string;
  }) => api.post("/activations", data),
  getActivations: (params: { dairy_id?: string; web_user_id?: string }) => 
    api.get("/activations", { params }),
  updateActivation: (id: string, data: any) => api.put(`/activations/${id}`, data),
  deleteActivation: (id: string) => api.delete(`/activations/${id}`),
};
