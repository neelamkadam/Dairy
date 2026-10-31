import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { adminApi } from "@/services/adminApi";
import type { Branch } from "@/components/ui/vlc-dropdown";
import AddRateChart from "@/pages/Master/AddRateChart";

// The VLC rate chart page, choosing from every dairy on Master -> Mobile Application
// instead of the logged-in user's own branches.
const UploadRateChart = () => {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    const fetchDairies = async () => {
      try {
        const { data } = await adminApi.getAllUsers();
        if (data.success) {
          // id is the dairy id; a manager not linked to a dairy comes back without one
          setBranches(
            (data.data.dairyManagers || [])
              .filter((m: any) => m.id != null)
              .map((m: any) => ({
                branch_id: m.id,
                username: m.username,
                name: m.name,
                branchName: m.branchname,
              }))
          );
        }
      } catch (error) {
        console.error("Error fetching dairies:", error);
        toast.error(t("failed_to_fetch_managers", "Failed to fetch managers"));
      }
    };
    fetchDairies();
  }, []);

  return <AddRateChart branches={branches} />;
};

export default UploadRateChart;
