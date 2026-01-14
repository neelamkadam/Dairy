import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface AccountStatusMonitorProps {
  userId: string | number;
}

const AccountStatusMonitor = ({ userId }: AccountStatusMonitorProps) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const url = `https://api.neodairysales.com/web-users/user-status/${userId}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.user_exists === false || data.is_active === 0) {
          setShowModal(true);
        } else if (data.is_active === 1) {
          setShowModal(false);
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [userId]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-600">Account Deactivated</h2>
          <X className="w-5 h-5 text-gray-400 cursor-not-allowed" />
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            Your account has been deactivated. Please pay your bill to continue.
          </p>
          <p className="text-gray-700">
            If this is a mistake, please contact us at:
          </p>
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <p className="font-semibold">📞 +91 9503382417</p>
            <p className="font-semibold">📧 info@neodairysales.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountStatusMonitor;
