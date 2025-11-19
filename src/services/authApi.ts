import api from './interceptor';

export interface RegisterFarmerPayload {
  username: string;
  fullName: string;
  mobile_number: string;
  email?: string;
  address: string;
  milkType: 'Cow' | 'Buffalo' | 'Both';
  rateChart: string;
  panCard?: string;
  aadhaarCard?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  role: string;
  dairy_id: number;
}

export interface UpdateUserPayload extends RegisterFarmerPayload {
  id: number;
  formatted_user_id?: string;
  password?: string;
  organization?: string;
  confirm?: boolean;
  is_mobile?: boolean;
  profile_pic?: string;
  createby?: string;
}

export const authApi = {
  registerFarmer: async (data: RegisterFarmerPayload) => {
    const response = await api.post('/auth/registerfarmer', data);
    return response.data;
  },

  updateUser: async (data: UpdateUserPayload) => {
    const response = await api.post('/auth/updateuser', data);
    return response.data;
  },

  registerFarmerId: async (branchname: string) => {
    const response = await api.post('/auth/registerfarmerid', { branchname });
    return response.data;
  },

  getNextFarmerId: async (dairyId: number, dairyName: string) => {
    const response = await api.get(`/auth/nextfarmerid?dairy_id=${dairyId}&dairy_name=${dairyName}`);
    return response.data;
  }
};
