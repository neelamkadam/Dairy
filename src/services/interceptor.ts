import axios, { AxiosInstance } from "axios";
import { toast } from "react-toastify";
import { getTokenFromLocalStorage } from "@/lib/common-utils";
import { TOASTER_CONFIG } from "@/constatnts/commonConstants";
import { ENV_VARIABLES } from "./Config";

const AxiosClient: AxiosInstance = axios.create({
  baseURL: ENV_VARIABLES.API_BASE,
  timeout: 30000, // Optional timeout for all requests
});
// Add request interceptor
AxiosClient.interceptors.request.use(
  (config: any) => {
    const token = getTokenFromLocalStorage();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Add response interceptor
AxiosClient.interceptors.response.use(
  (response) => response,
  (error: any) => {
    // Pass the error down without handling it here
    return Promise.reject(error);
  }
);
export const uploadFile = async (url: string, fileData: FormData) => {
  try {
    const response = await AxiosClient.post(url, fileData, {
      headers: {
        "Content-Type": "multipart/form-data", // Required for file uploads
      },
    });
    // toast.success("File uploaded successfully!", TOASTER_CONFIG);
    return response.data;
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "File upload failed",
      TOASTER_CONFIG
    );
    throw error;
  }
};

export default AxiosClient;
