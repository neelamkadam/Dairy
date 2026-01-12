export interface ResponseDataModel<T> {
    body?: T | null;
    message: string;
    status_code: number;
    success: boolean;
  }
  
  export interface User {
    id?: string;
    name?: string;
    email?: string;
    phone?: string | null;
    gender?: string | null;
    dob?: string | null;
    profilePicture?: string | null;
    timezone?: string;
    stripeId?: string | null;
    isActive?: boolean;
    isBlocked?: boolean;
    confirmConsent?: boolean;
    enableNotification?: boolean;
    isEmailVerified?: boolean;
    otpCode?: number;
    otpVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
    organizationId?: string;
    permissions?: string[];
    is_admin?: boolean | number;
  }
  
  export interface AuthResponseBodyDataModel {
    success: boolean;
    message: string;
    user: User;
    token: string;
  }
  
  export interface registerUserData {
    name: string;
    email: string;
    timezone: string;
    password: string;
    referralCode: string;
    role: string;
    privatePracticeName: string;
    registeredMedicalID: string;
    organizationName: string;
    companyRegistrationID: string;
  }
  