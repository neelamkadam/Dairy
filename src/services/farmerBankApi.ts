import { api } from "./config";

export interface FarmerBankRecord {
  id: number;
  username: string;
  fullName: string;
  dairy_id: number;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  bankPassbookPhoto: string | null;
  bank_verified: number;
  bank_verified_by: string | null;
  bank_verified_at: string | null;
}

export const farmerBankApi = {
  // PUT /users/:id/bank-verification
  setVerification: async (userId: number | string, verified: boolean, verifiedBy: string) => {
    const res = await api.put(`/users/${userId}/bank-verification`, { verified, verified_by: verifiedBy });
    return res.data as {
      success: boolean;
      message: string;
      data: Pick<FarmerBankRecord, "id" | "bank_verified" | "bank_verified_by" | "bank_verified_at">;
    };
  },
};

// GET /users?dairyid= joins the dairy row over the user's own `id`; the farmer's
// user id is `userid`.
export const farmerUserId = (farmer: { userid?: number | string; id?: number | string }) =>
  farmer.userid ?? farmer.id;

export const isBankVerified = (farmer: { bank_verified?: number | string | boolean | null }) =>
  Number(farmer.bank_verified) === 1;
