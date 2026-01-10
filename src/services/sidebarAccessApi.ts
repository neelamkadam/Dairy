import { api } from "./config";

export const getSidebarAccess = async (webUserId: number) => {
  const response = await api.get(`/web/sidebar/access?web_user_id=${webUserId}`);
  return response.data;
};

export const createOrUpdateSidebarAccess = async (data: any) => {
  const response = await api.post("/web/sidebar/access", data);
  return response.data;
};
