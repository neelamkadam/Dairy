import AxiosClient from "./interceptor";

export const webUserApi = {
  getPriority: async (userId: number) => {
    return AxiosClient.get(`/web-users/priority/${userId}`);
  },

  updatePriority: async (userId: number, priority: string[]) => {
    return AxiosClient.put('/web-users/priority', { userId, priority });
  },

  getAllWebUsers: async () => {
    return AxiosClient.get('/web-users');
  }
};
