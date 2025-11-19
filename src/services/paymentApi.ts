import { api } from "./config";

export interface CreatePaymentRequest {
  date: string;
  dairy_id: string;
  farmer_id: string;
  farmer_name: string;
  payment_type: "Advance" | "Cattle Feed" | "Other1" | "Other2";
  amount_taken: number;
  received: number;
  descriptions?: string;
}

export interface UpdatePaymentRequest {
  amount_taken?: number;
  received?: number;
  descriptions?: string;
}

export interface GetPaymentParams {
  farmer_id?: string;
  dairyid?: string;
  datefrom?: string;
}

export const paymentApi = {
  create: (payload: CreatePaymentRequest) => 
    api.post("/payments", payload),

  update: (id: string, payload: UpdatePaymentRequest) => 
    api.put(`/payments/${id}`, payload),

  inactivate: (id: string) => 
    api.put(`/payments/inactivate/${id}`),

  activate: (id: string) => 
    api.put(`/payments/activate/${id}`),

  getPayments: (params: GetPaymentParams) => 
    api.get("/payments/getpayment", { params }),

  delete: (id: string) => 
    api.delete(`/payments/delete/${id}`),

  getDairyBillSummary: (dairyId: string, dateFrom: string, dateTo: string) =>
    api.get("/payments/getdairybillsummary", {
      params: { dairyid: dairyId, datefrom: dateFrom, dateto: dateTo }
    }),
};
