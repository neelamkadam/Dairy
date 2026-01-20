import { X } from "lucide-react";
import { FarmerInfo } from "@/redux/dashboardSlice";

interface FarmerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmers: FarmerInfo[];
  title: string;
  branches: Array<{ branch_id: number; name: string }>;
  loading: boolean;
}

const FarmerInfoModal = ({ isOpen, onClose, farmers, title, branches, loading }: FarmerInfoModalProps) => {
  if (!isOpen) return null;

  const getDairyName = (dairyId: number) => {
    const branch = branches.find(b => b.branch_id === dairyId);
    return branch?.name || `VLC-${dairyId}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md" onClick={onClose}>
      <div className="bg-white bg-opacity-95 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col border-2 border-blue-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{title} ({farmers.length})</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-auto flex-1 p-4">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading farmers...</p>
          ) : farmers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No farmers found</p>
          ) : (
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="border px-4 py-2 text-left">Code</th>
                  <th className="border px-4 py-2 text-left">Name</th>
                  <th className="border px-4 py-2 text-left">Dairy (VLC)</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((farmer) => (
                  <tr key={farmer.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{farmer.username}</td>
                    <td className="border px-4 py-2">{farmer.fullName}</td>
                    <td className="border px-4 py-2">{getDairyName(farmer.dairy_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerInfoModal;
