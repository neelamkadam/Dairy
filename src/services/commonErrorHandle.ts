import { TOASTER_CONFIG } from "@/constatnts/commonConstants";
import { toast } from "react-toastify";


export const handleError = (
  error: any,
  setError: (message: string | null) => void,
  isToaster?: boolean
) => {
  if (error.response?.data?.message) {
    const errorMessage = error.response.data.message;
    setError(errorMessage);
    if (isToaster) {
      toast.error(errorMessage, TOASTER_CONFIG);
    }
  } else {
    setError("Unexpected error occurred.");
    if (isToaster) {
      toast.error("Unexpected error occurred.", TOASTER_CONFIG);
    }
  }
};
