import { api } from "./config";

export interface MilkUserPayload {
  name: string;
  mobile_number: string;
  emailId: string;
  password: string;
  address: string;
  dairy_ids: number[];
}

export interface MilkUserResponse {
  message: string;
  username: string;
  success: boolean;
}

export const registerMilkUser = async (
  payload: MilkUserPayload
): Promise<MilkUserResponse> => {
  const { data } = await api.post<MilkUserResponse>(
    "/milk-user/register",
    payload
  );
  return data;
};
