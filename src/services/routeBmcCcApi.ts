import AxiosClient from "./interceptor";

// CC -> BMC -> Route -> VLC (dairy) hierarchy.
// CC, BMC and Route are dairy-style registrations (name, villagename, address,
// ownername) created by an admin web_user. Generated id series: CC 700001+,
// BMC 800001+, Route 900001+ — the returned id IS the primary key everywhere.
// CC and BMC take a required password at creation and can log in (mobile app)
// with their generated id as the username; routes have no login.
// The dairy's own cc_id / bmc_id / route_id columns are the source of truth —
// CC/BMC/Route are just collections of VLCs.

interface RegistrationFields {
  name: string;
  villagename?: string;
  address?: string;
  ownername?: string;
}

export const ccApi = {
  // password is required; the response returns cc_id (700001+) and username —
  // these are the CC's login credentials, show them to the admin.
  create: (p: { adminId: number; password: string } & RegistrationFields) =>
    AxiosClient.post("/web/cc/create", p),

  // Rows include bmc_count, route_count, vlc_count. userId may be a sub-user.
  list: (userId: number) => AxiosClient.get(`/web/cc/list/${userId}`),

  // Include password only to change it.
  update: (p: { ccId: number; password?: string } & RegistrationFields) =>
    AxiosClient.put("/web/cc/update", p),

  // Dairies whose cc_id points to this CC.
  vlcs: (ccId: number) => AxiosClient.get(`/web/cc/${ccId}/vlcs`),

  assign: (p: { adminId: number; userId: number; ccId: number }) =>
    AxiosClient.post("/web/cc/assign", p),

  unassign: (p: { userId: number; ccId: number }) =>
    AxiosClient.post("/web/cc/unassign", p),

  assigned: (userId: number) => AxiosClient.get(`/web/cc/assigned/${userId}`),

  // Children are kept — their cc_id just becomes NULL.
  remove: (ccId: number) => AxiosClient.delete(`/web/cc/${ccId}`),
};

export const bmcApi = {
  // ccId is REQUIRED — a BMC is always created under a CC. Response returns
  // bmc_id (800001+) and username — the BMC's login credentials.
  create: (p: { adminId: number; ccId: number; password: string } & RegistrationFields) =>
    AxiosClient.post("/web/bmc/create", p),

  // Rows include cc_name, route_count, vlc_count.
  list: (userId: number) => AxiosClient.get(`/web/bmc/list/${userId}`),

  // Send ccId to move it under another CC; omit to keep. password only to change.
  update: (p: { bmcId: number; ccId?: number; password?: string } & RegistrationFields) =>
    AxiosClient.put("/web/bmc/update", p),

  vlcs: (bmcId: number) => AxiosClient.get(`/web/bmc/${bmcId}/vlcs`),

  assign: (p: { adminId: number; userId: number; bmcId: number }) =>
    AxiosClient.post("/web/bmc/assign", p),

  unassign: (p: { userId: number; bmcId: number }) =>
    AxiosClient.post("/web/bmc/unassign", p),

  assigned: (userId: number) => AxiosClient.get(`/web/bmc/assigned/${userId}`),

  remove: (bmcId: number) => AxiosClient.delete(`/web/bmc/${bmcId}`),
};

export const routeApi = {
  // A route can sit under a BMC, a CC, or BOTH. Response returns route_id
  // (900001+). vlcIds (dairy ids) is optional — those dairies get linked now.
  create: (
    p: {
      adminId: number;
      bmcId?: number;
      ccId?: number;
      vlcIds?: number[];
    } & RegistrationFields
  ) => AxiosClient.post("/web/routes/create", p),

  // Each route has bmc_name, cc_name and its vlcs[].
  list: (userId: number) => AxiosClient.get(`/web/routes/list/${userId}`),

  // FULL REPLACE: an omitted/null parent is cleared — always send the
  // complete desired state.
  update: (
    p: {
      routeId: number;
      bmcId?: number | null;
      ccId?: number | null;
    } & RegistrationFields
  ) => AxiosClient.put("/web/routes/update", p),

  // Replaces the route's VLC membership; dairies dropped from the list are
  // detached. Empty array detaches all.
  setVlcs: (p: { routeId: number; vlcIds: number[] }) =>
    AxiosClient.put("/web/routes/vlcs", p),

  getVlcs: (routeId: number) => AxiosClient.get(`/web/routes/${routeId}/vlcs`),

  assign: (p: { adminId: number; userId: number; routeId: number }) =>
    AxiosClient.post("/web/routes/assign", p),

  unassign: (p: { userId: number; routeId: number }) =>
    AxiosClient.post("/web/routes/unassign", p),

  assigned: (userId: number) => AxiosClient.get(`/web/routes/assigned/${userId}`),

  // Dairies on it are kept — their route_id just becomes NULL.
  remove: (routeId: number) => AxiosClient.delete(`/web/routes/${routeId}`),
};

// Combined bootstrap for a sub-user's working scope: assigned CCs and BMCs
// (each nested with their routes + VLCs, plus directly linked VLCs) and
// directly assigned routes (with VLCs). Their VLC set = union of every vlcs[].
export const getUserAssignments = (userId: number) =>
  AxiosClient.get(`/web-users/assignments/${userId}`);
