import AxiosClient from "./interceptor";

// BMC -> Route -> VLC hierarchy APIs.
// BMCs, CCs and Routes are created by an admin web_user; VLCs (dairies) live
// inside routes; BMCs, CCs and Routes can be assigned to sub-users.

export const bmcApi = {
  create: (payload: { adminId: number; name: string; location?: string }) =>
    AxiosClient.post("/web/bmc/create", payload),

  // userId can be an admin or a sub-user id.
  list: (userId: number) => AxiosClient.get(`/web/bmc/list/${userId}`),

  update: (payload: { bmcId: number; name: string; location?: string }) =>
    AxiosClient.put("/web/bmc/update", payload),

  assign: (payload: { adminId: number; userId: number; bmcId: number }) =>
    AxiosClient.post("/web/bmc/assign", payload),

  unassign: (payload: { userId: number; bmcId: number }) =>
    AxiosClient.post("/web/bmc/unassign", payload),

  assigned: (userId: number) => AxiosClient.get(`/web/bmc/assigned/${userId}`),

  remove: (bmcId: number) => AxiosClient.delete(`/web/bmc/${bmcId}`),
};

export const ccApi = {
  create: (payload: { adminId: number; name: string; location?: string }) =>
    AxiosClient.post("/web/cc/create", payload),

  list: (userId: number) => AxiosClient.get(`/web/cc/list/${userId}`),

  update: (payload: { ccId: number; name: string; location?: string }) =>
    AxiosClient.put("/web/cc/update", payload),

  assign: (payload: { adminId: number; userId: number; ccId: number }) =>
    AxiosClient.post("/web/cc/assign", payload),

  unassign: (payload: { userId: number; ccId: number }) =>
    AxiosClient.post("/web/cc/unassign", payload),

  assigned: (userId: number) => AxiosClient.get(`/web/cc/assigned/${userId}`),

  remove: (ccId: number) => AxiosClient.delete(`/web/cc/${ccId}`),
};

export const routeApi = {
  // Pass bmcId OR ccId (never both); both optional for a standalone route.
  create: (payload: {
    adminId: number;
    name: string;
    bmcId?: number | null;
    ccId?: number | null;
    vlcIds?: number[];
  }) => AxiosClient.post("/web/routes/create", payload),

  // Returns routes with bmc_name / cc_name and the vlcs array of each route.
  list: (userId: number) => AxiosClient.get(`/web/routes/list/${userId}`),

  // bmcId / ccId omitted or null clears that parent. Never send both.
  update: (payload: {
    routeId: number;
    name: string;
    bmcId?: number | null;
    ccId?: number | null;
  }) => AxiosClient.put("/web/routes/update", payload),

  // Replaces the full VLC (dairy) list of the route; empty array clears it.
  setVlcs: (payload: { routeId: number; vlcIds: number[] }) =>
    AxiosClient.put("/web/routes/vlcs", payload),

  getVlcs: (routeId: number) => AxiosClient.get(`/web/routes/${routeId}/vlcs`),

  assign: (payload: { adminId: number; userId: number; routeId: number }) =>
    AxiosClient.post("/web/routes/assign", payload),

  unassign: (payload: { userId: number; routeId: number }) =>
    AxiosClient.post("/web/routes/unassign", payload),

  assigned: (userId: number) => AxiosClient.get(`/web/routes/assigned/${userId}`),

  remove: (routeId: number) => AxiosClient.delete(`/web/routes/${routeId}`),
};

// Combined bootstrap: assigned BMCs and CCs (nested with routes + VLCs) plus
// directly assigned routes (with VLCs).
export const getUserAssignments = (userId: number) =>
  AxiosClient.get(`/web-users/assignments/${userId}`);
