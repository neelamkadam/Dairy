import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddFarmer } from "@/pages/Master/AddFarmer";

interface FarmerEditModalProps {
  farmer: { dairyId: string; farmerCode: string; fullName?: string } | null;
  onClose: () => void;
  onSaved: () => void;
}

// The Add Farmer form, in edit mode for one farmer, inside a modal.
const FarmerEditModal = ({ farmer, onClose, onSaved }: FarmerEditModalProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={!!farmer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-y-auto bg-gray-50 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800 font-serif text-left">
            {t("edit_farmer")}
            {farmer && (
              <span className="ml-2 text-sm font-normal text-gray-500 font-sans">
                {farmer.farmerCode}{farmer.fullName ? ` - ${farmer.fullName}` : ""}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {farmer && (
          <AddFarmer
            key={`${farmer.dairyId}-${farmer.farmerCode}`}
            embedded={{
              dairyId: farmer.dairyId,
              farmerCode: farmer.farmerCode,
              onSaved: () => {
                onSaved();
                onClose();
              },
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FarmerEditModal;
