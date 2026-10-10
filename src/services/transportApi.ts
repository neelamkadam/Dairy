import AxiosClient from "./interceptor";

// Transports — a transporter + vehicle that runs one route at a time. The route's
// VLCs dispatch milk into its tanker (mobile dispatch entries); each date + shift
// with a dispatch is one trip, paid as KMs per trip × rate per KM of the route
// assignment in force that day — or, with shift-wise KMs, the Morning or Evening
// KMs by the trip's shift. Route changes keep history, so past periods are
// billed on the route, KMs and rate they ran on. Every call sends the web user's
// id; the server keeps the rows under that user's admin.

export interface TransportDetails {
  name: string;
  address?: string;
  mobile_number?: string;
  vendor_code?: string;
  service_tax_no?: string;
  pan_no?: string;
  work_order_no?: string;
  vehicle_number?: string;
  vehicle_capacity?: string;
  // Bank account the NEFT payment goes to — all required
  bank_name: string;
  account_holder: string;
  account_number: string;
  ifsc_code: string;
}

// One KMs figure per trip, or (shift_wise_km) separate Morning and Evening KMs
export interface RouteAssignment {
  route_id: number;
  shift_wise_km: boolean;
  km_per_trip?: number;
  morning_km?: number;
  evening_km?: number;
  rate_per_km: number;
  effective_from: string; // yyyy-MM-dd
}

// KM columns as the server returns them; km_per_trip is null on a shift-wise
// assignment, morning_km / evening_km are null otherwise
export interface AssignmentKms {
  shift_wise_km: number | null;
  km_per_trip: string | null;
  morning_km: string | null;
  evening_km: string | null;
}

export interface Transport extends TransportDetails, AssignmentKms {
  id: number;
  // Current route (null when none)
  route_id: number | null;
  route_name: string | null;
  rate_per_km: string | null;
  route_from: string | null;
}

export interface RouteHistoryRow extends AssignmentKms {
  id: number;
  route_id: number;
  route_name: string | null;
  rate_per_km: string;
  effective_from: string;
  effective_to: string | null;
}

export interface TankerEntry {
  id: number;
  dairy_id: number;
  vlc_name: string;
  milk_type: string | null;
  quantity: number;
  fat: number;
  snf: number;
  clr: number;
  rate: number;
  amount: number;
}

export interface TankerTrip {
  transport_id: number;
  date: string;
  shift: "Morning" | "Evening";
  route_id: number;
  route_name: string;
  bmc_name: string | null;
  cc_name: string | null;
  km: number;
  rate_per_km: number;
  milk: number;
  fat: number;
  snf: number;
  milk_amount: number;
  transport_amount: number;
  entries: TankerEntry[];
}

export interface TankerTransport {
  id: number;
  name: string;
  vehicle_number: string | null;
  vehicle_capacity: string | null;
  trips: TankerTrip[];
  totals: { trips: number; km: number; milk: number; transport_amount: number };
}

export interface TransportNeftRow {
  transport_id: number;
  name: string;
  account_number: string;
  account_holder: string;
  ifsc_code: string;
  bank_name: string;
  route_names: string[];
  km_per_trip: number[];
  trips: number;
  total_km: number;
  rates: number[];
  milk: number;
  avg_cost_per_liter: number;
  payment_amount: number;
  advance: number;
  // Deduction from DCA report = Composite − Dispatch amount of the route's VLCs
  // (as in VLC Difference Report 2), never below 0
  composite_amount: number;
  dispatch_amount: number;
  dca_deduction: number;
  net_payable: number;
}

export interface TransportNeftTotals {
  trips: number;
  total_km: number;
  milk: number;
  payment_amount: number;
  advance: number;
  composite_amount: number;
  dispatch_amount: number;
  dca_deduction: number;
  net_payable: number;
}

// Auto bill number NN/Mon/YYYY. issued: false = the number this bill will get on
// export (nothing is reserved by a preview); true = already issued and kept.
export interface TransportBillNo {
  bill_no: string;
  bill_date: string;
  issued: boolean;
  // set by issueBill: true when this export issued it, false when it was already issued
  created?: boolean;
}

export interface InvoiceDay {
  date: string;
  bmc_name: string | null;
  route_name: string | null;
  morning_km: number;
  evening_km: number;
  total_km: number;
  amount: number;
}

export interface TransportInvoice {
  period: { from: string; to: string };
  // null until migrations/2026-10-09-create-transport-bill.sql has run
  bill: TransportBillNo | null;
  transport: Transport;
  routes: { route_id: number; route_name: string; bmc_name: string | null; cc_name: string | null }[];
  rates: number[];
  days: InvoiceDay[];
  totals: { trips: number; morning_km: number; evening_km: number; total_km: number; amount: number };
}

type UserId = number | string;

export const transportApi = {
  list: (userId: UserId) => AxiosClient.get("/web/transport", { params: { user_id: userId } }),

  create: (p: { user_id: UserId } & TransportDetails & RouteAssignment) => AxiosClient.post("/web/transport", p),

  update: (id: number, p: { user_id: UserId } & TransportDetails) => AxiosClient.put(`/web/transport/${id}`, p),

  remove: (id: number, userId: UserId) => AxiosClient.delete(`/web/transport/${id}`, { params: { user_id: userId } }),

  routeHistory: (id: number, userId: UserId) =>
    AxiosClient.get(`/web/transport/${id}/routes`, { params: { user_id: userId } }),

  // A start date equal to the current route's start corrects it; a later one
  // closes it the day before and opens the new one. 409 if another transport runs the route.
  changeRoute: (id: number, p: { user_id: UserId } & RouteAssignment) =>
    AxiosClient.post(`/web/transport/${id}/route`, p),

  tanker: (userId: UserId, from: string, to: string, transportId?: number) =>
    AxiosClient.get("/web/transport/tanker", {
      params: { user_id: userId, from, to, ...(transportId ? { transport_id: transportId } : {}) },
    }),

  neft: (userId: UserId, from: string, to: string) =>
    AxiosClient.get("/web/transport/neft", { params: { user_id: userId, from, to } }),

  // Advance for exactly this bill period (the DCA deduction is derived, not entered)
  saveAdvance: (p: { user_id: UserId; transport_id: number; period_from: string; period_to: string; advance: number }) =>
    AxiosClient.put("/web/transport/deduction", p),

  invoice: (userId: UserId, transportId: number, from: string, to: string) =>
    AxiosClient.get("/web/transport/invoice", { params: { user_id: userId, transport_id: transportId, from, to } }),

  // Issues the bill number on export — or returns the one already issued for this
  // transport + period — and records the bill date
  issueBill: (p: { user_id: UserId; transport_id: number; from: string; to: string; bill_date: string }) =>
    AxiosClient.post("/web/transport/invoice/bill", p),
};
