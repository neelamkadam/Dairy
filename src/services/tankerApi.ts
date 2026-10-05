import AxiosClient from "./interceptor";

// Tanker purchase & sale — the web admin buys a whole tanker from an outside
// supplier and sells it on, possibly split across several buyers. Nothing here
// is tied to a VLC: every call sends the logged-in web user's id and the server
// stores the rows under that user's admin, so sub-users share their admin's data.
// DECIMAL columns come back as strings — parse before doing maths.

export type TankerPartyType = "supplier" | "buyer";

export interface TankerParty {
  id: number;
  party_type: TankerPartyType;
  code: string;
  name: string;
  address?: string | null;
}

// Fields shared by the purchase and sale vouchers (mirrors the dispatch voucher)
export interface TankerVoucherPayload {
  user_id: number | string;
  party_id: number;
  date: string;                 // yyyy-MM-dd
  time?: string;                // HH:mm:ss
  driver_name: string;
  vehicle_number: string;
  compartment: string;
  milk_type: string;
  weight: number;
  liter: number;
  avg_fat: number;
  avg_snf: number;
  clr?: number;
  acidity: number;
  temperature: number;
  rate_per_liter: number;
  commission_amount_per_liter: number;
  alteration: boolean;
  sugar: boolean;
  salt: boolean;
  urea: boolean;
  maltose: boolean;
  soda: boolean;
  starch: boolean;
  seals: string[];
}

export interface TankerVoucherRow {
  id: number;
  date: string;
  time?: string | null;
  party_id?: number | null;
  party_name: string;
  driver_name?: string | null;
  vehicle_number?: string | null;
  compartment?: string | null;
  milk_type: string;
  weight?: string | null;
  liter: string;
  avg_fat: string;
  avg_snf: string;
  clr?: string | null;
  acidity?: string | null;
  temperature?: string | null;
  rate_per_liter: string;
  commission_amount_per_liter: string;
  total_amount: string;
  alteration: number;
  sugar: number;
  salt: number;
  urea: number;
  maltose: number;
  soda: number;
  starch: number;
  seals: string[];
}

export interface TankerPurchaseRow extends TankerVoucherRow {
  sold_liter?: string;
  sale_count?: number;
}

export interface TankerSaleRow extends TankerVoucherRow {
  purchase_id: number;
  purchase_date?: string;
  supplier_name?: string;
  purchase_vehicle_number?: string | null;
  purchase_liter?: string;
}

// Profit & loss — every figure is computed by the server; the page only shows it.
export interface TankerPLSale {
  sale_id: number;
  voucher_no: string;
  date: string;
  time?: string | null;
  buyer_name: string;
  vehicle_number?: string | null;
  driver_name?: string | null;
  milk_type?: string | null;
  liter: number;
  rate_per_liter: number;
  commission_per_liter: number;
  total_amount: number;
}

export interface TankerPLTanker {
  purchase_id: number;
  voucher_no: string;
  date: string;
  time?: string | null;
  supplier_name: string;
  vehicle_number?: string | null;
  driver_name?: string | null;
  milk_type?: string | null;
  purchase_liter: number;
  purchase_rate: number;
  commission_per_liter: number;
  purchase_amount: number;
  sale_count: number;
  sold_liter: number;
  sale_amount: number;
  cost_of_sold: number;   // purchase cost of the litres sold
  profit: number;         // sale_amount - cost_of_sold
  unsold_liter: number;
  unsold_value: number;   // unsold milk at purchase cost
  status: "Sold" | "Partly sold" | "Unsold";
  result: "Profit" | "Loss" | "Break-even";
  sales: TankerPLSale[];
}

export interface TankerPLSummary {
  purchase_count: number;
  purchase_liter: number;
  purchase_amount: number;
  sale_count: number;
  sold_liter: number;
  sale_amount: number;
  cost_of_sold: number;
  gross_profit: number;
  margin_percent: number;
  unsold_liter: number;
  unsold_value: number;
  status: "Profit" | "Loss" | "Break-even";
}

export interface TankerPLReport {
  period: { from: string; to: string };
  summary: TankerPLSummary;
  tankers: TankerPLTanker[];
}

export const tankerApi = {
  parties: (userId: number | string, type: TankerPartyType) =>
    AxiosClient.get("/web/tanker/parties", { params: { user_id: userId, type } }),

  // 409 when the code is already used by another party of the same type
  createParty: (p: { user_id: number | string; type: TankerPartyType; code: string; name: string; address?: string }) =>
    AxiosClient.post("/web/tanker/parties", p),

  // The server recomputes total_amount = liter × (rate + commission)
  createPurchase: (p: TankerVoucherPayload) => AxiosClient.post("/web/tanker/purchase", p),

  // Rows carry sold_liter and sale_count
  purchases: (userId: number | string, date: string) =>
    AxiosClient.get("/web/tanker/purchases", { params: { user_id: userId, date } }),

  // Purchases with milk still left to sell (newest first)
  openPurchases: (userId: number | string) =>
    AxiosClient.get("/web/tanker/purchases/open", { params: { user_id: userId } }),

  // 409 while the purchase has sales
  deletePurchase: (id: number, userId: number | string) =>
    AxiosClient.delete(`/web/tanker/purchase/${id}`, { params: { user_id: userId } }),

  createSale: (p: TankerVoucherPayload & { purchase_id: number }) => AxiosClient.post("/web/tanker/sale", p),

  // Rows carry purchase_date, supplier_name, purchase_vehicle_number, purchase_liter
  sales: (userId: number | string, date: string) =>
    AxiosClient.get("/web/tanker/sales", { params: { user_id: userId, date } }),

  deleteSale: (id: number, userId: number | string) =>
    AxiosClient.delete(`/web/tanker/sale/${id}`, { params: { user_id: userId } }),

  // { period, summary, tankers[] } for the tankers purchased in the range
  profitLoss: (userId: number | string, from: string, to: string) =>
    AxiosClient.get("/web/tanker/profit-loss", { params: { user_id: userId, from, to } }),

  // { purchases, sales } — every voucher dated in the range, by its own date.
  // Sale rows carry purchase_date and supplier_name.
  daywise: (userId: number | string, from: string, to: string) =>
    AxiosClient.get("/web/tanker/daywise", { params: { user_id: userId, from, to } }),
};
