import { useCallback, useRef, useState } from "react";
import { paymentApi, type AdvanceLimit } from "@/services/paymentApi";

// What one farmer can still take under the VLC's advance limit, for
// <AdvanceLimitNote>. The backend enforces the limit; this only shows it, so a
// failed lookup (or an older backend without the route) just shows nothing.
export const useAdvanceLimit = () => {
  const [limit, setLimit] = useState<AdvanceLimit | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (dairyId: string | number, farmerId: string) => {
    const request = ++requestRef.current;
    if (!dairyId || !farmerId) {
      setLimit(null);
      return;
    }
    try {
      const { data } = await paymentApi.getAdvanceLimit(dairyId, farmerId);
      if (request === requestRef.current) setLimit(data?.data ?? null);
    } catch {
      if (request === requestRef.current) setLimit(null);
    }
  }, []);

  const clear = useCallback(() => {
    requestRef.current++;
    setLimit(null);
  }, []);

  return { limit, load, clear };
};
