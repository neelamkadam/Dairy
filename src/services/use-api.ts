import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { ResponseDataModel } from "../types/response.types";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constatnts/routesConstants";
import AxiosClient from "./interceptor";
import { clearLocalStorage } from "@/lib/common-utils";
import { TOASTER_CONFIG } from "@/constatnts/commonConstants";
import { handleError } from "./commonErrorHandle";
import { resetAuthSlice } from "@/redux/AuthSlice";
import { useAppDispatch } from "@/redux/store";
interface Options {
  isToaster?: boolean;
  fetch?: boolean;
  payload?: any;
}

interface HookProps {
  path: string;
  options?: Options;
}

// GET API HOOK
export const useGetApi = <T>(path: string, options: Options = {}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isToaster = true, fetch, payload } = options;
  const [data, setData] = useState<ResponseDataModel<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getData = useCallback(
    async (newPath?: string) => {
      setIsLoading(true);
      setError(null); // Clear previous errors
      try {
        const response = await AxiosClient.get(newPath || path);
        if (response?.data) {
          setData(response.data);
          if (response.data.message && isToaster) {
            // toast.success(response.data.message, TOASTER_CONFIG);
          }
          return response;
        }
      } catch (error: any) {
        handleError(error, setError, isToaster); // Handle error properly
        if (error.response?.status === 401) {
          clearLocalStorage();
          dispatch(resetAuthSlice());
          navigate(ROUTES.AUTH.LOGIN);
        }
        throw error; // Throw error to be handled by the caller
      } finally {
        setIsLoading(false);
      }
    },
    [path, isToaster, navigate, dispatch]
  );

  useEffect(() => {
    if (fetch) {
      getData(payload).catch((err) => {
        console.error("API fetch failed:", err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch, getData]);

  return { data, isLoading, error, getData };
};

// POST API HOOK
export const usePostApi = <T>({ path, options = {} }: HookProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isToaster = true, fetch, payload } = options;
  const [data, setData] = useState<ResponseDataModel<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const postData = useCallback(
    async (body?: any, newPath?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await AxiosClient.post(newPath || path, body);
        if (response?.data) {
          setData(response.data);
          // if (isToaster && response.data.message) {
          //   toast.success(response.data.message, TOASTER_CONFIG);
          // }
          return response;
        }
      } catch (error: any) {
        handleError(error, setError, isToaster);
        if (error.response?.status === 401) {
          clearLocalStorage();
          dispatch(resetAuthSlice());
          navigate(ROUTES.AUTH.LOGIN);
        }
        throw error; // Pass the error up if needed
      } finally {
        setIsLoading(false);
      }
    },
    [path, isToaster]
  );

  useEffect(() => {
    if (fetch) {
      postData(payload);
    }
  }, [fetch, postData]);

  return { data, isLoading, error, postData };
};

// Put API HOOK
export const usePutApi = <T>({ path, options = {} }: HookProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isToaster = true, fetch, payload } = options;
  const [data, setData] = useState<ResponseDataModel<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorData, setErrorData] = useState<any | null>(null);

  const putData = useCallback(
    async (body?: any, newPath?: string) => {
      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        const response = await AxiosClient.put(newPath || path, body);
        if (response && response?.data) {
          setData(response?.data);
          if (response?.data?.message && isToaster) {
            // toast.success(response?.data?.message, TOASTER_CONFIG);
          }
          return response;
        }
      } catch (error: any) {
        handleError(error, setError, isToaster);
        setErrorData(error?.response?.data);
        if (error?.response?.status === 401) {
          clearLocalStorage();
          dispatch(resetAuthSlice());
          navigate(ROUTES.AUTH.LOGIN);
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [path, isToaster]
  );

  useEffect(() => {
    fetch && putData(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch, putData]);

  return { data, isLoading, error, putData, errorData };
};

// Get File Blob from URL
export const useGetBlob = ({ path, options = {} }: HookProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isToaster = false } = options;
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getFile = useCallback(
    async (newPath: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get(newPath || path, {
          responseType: "blob",
        });
        if (response && response?.data) {
          setData(response?.data);
          return response;
        }
      } catch (error: any) {
        handleError(error, setError, isToaster);
        if (error?.response?.status === 401) {
          clearLocalStorage();
          dispatch(resetAuthSlice());
          navigate(ROUTES.AUTH.LOGIN);
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isToaster, path]
  );

  return { data, isLoading, error, getFile };
};

interface Options {
  isToaster?: boolean;
}

interface HookProps {
  path: string;
  options?: Options;
}
export const useFileUpload = ({ path, options = {} }: HookProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isToaster = true } = options;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (fileData: FormData, newPath?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await AxiosClient.post(newPath || path, fileData);
        if (response && response.data) {
          if (isToaster) {
            // toast.success(
            //   response.data?.message || "File uploaded successfully",
            //   TOASTER_CONFIG
            // );
          }
          return response;
        }
      } catch (error: any) {
        setError(
          error?.response?.data?.message ||
            "Unexpected error during file upload."
        );
        if (isToaster) {
          toast.error(
            error?.response?.data?.message || "File upload failed",
            TOASTER_CONFIG
          );
        }
        if (error?.response?.status === 401) {
          clearLocalStorage();
          dispatch(resetAuthSlice());
          navigate(ROUTES.AUTH.LOGIN);
        }
        return error;
      } finally {
        setIsLoading(false);
      }
    },
    [path, isToaster]
  );

  return { isLoading, error, uploadFile };
};

export const useDeleteApi = <T>({ path, options = {} }: HookProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isToaster = true } = options;
  const [data, setData] = useState<ResponseDataModel<T> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const deleteData = useCallback(
    async (newPath?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await AxiosClient.delete(newPath || path);
        if (response && response?.data) {
          setData(response?.data);
          if (response?.data?.message && isToaster) {
            toast.success(response?.data?.message, TOASTER_CONFIG);
          }
          return response;
        }
      } catch (error: any) {
        handleError(error, setError, isToaster);
        if (error?.response?.status === 401) {
          clearLocalStorage();
          dispatch(resetAuthSlice());
          navigate(ROUTES.AUTH.LOGIN);
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [path, isToaster, navigate, dispatch]
  );

  return { data, isLoading, error, deleteData };
};

export const deleteReport = async (newPath: string) => {
  try {
    const response = await AxiosClient.delete(newPath);
    console.log("Delete successful:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Error deleting report:", error);
    if (error?.response?.status === 401) {
      clearLocalStorage();
    }
    throw error;
  }
};
