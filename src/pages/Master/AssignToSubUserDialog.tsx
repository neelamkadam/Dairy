import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { webUserApi } from "@/services/webUserApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssignToSubUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string; // e.g. "Route"
  entityName: string; // name of the row being assigned
  onAssign: (userId: number) => Promise<void>;
  onUnassign: (userId: number) => Promise<void>;
}

const AssignToSubUserDialog = ({
  open,
  onOpenChange,
  entityLabel,
  entityName,
  onAssign,
  onUnassign,
}: AssignToSubUserDialogProps) => {
  const [subUsers, setSubUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedUserId("");
    setIsLoadingUsers(true);
    webUserApi
      .getAllWebUsers()
      .then((response) => {
        const raw = response?.data?.data ?? response?.data ?? [];
        const users = Array.isArray(raw) ? raw : [];
        // Assignments target sub-users only — filter out admins.
        setSubUsers(
          users.filter((u: any) => !(u?.is_admin === 1 || u?.is_admin === true))
        );
      })
      .catch((error) => {
        console.error("Failed to load sub-users:", error);
        toast.error("Failed to load sub-users");
      })
      .finally(() => setIsLoadingUsers(false));
  }, [open]);

  const run = async (action: (userId: number) => Promise<void>) => {
    if (!selectedUserId) {
      toast.error("Please select a sub-user");
      return;
    }
    setIsWorking(true);
    try {
      await action(Number(selectedUserId));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>
            Assign {entityLabel}: {entityName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Sub-user</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                <SelectValue
                  placeholder={isLoadingUsers ? "Loading..." : "Select sub-user"}
                />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {subUsers.length === 0 ? (
                  <div className="text-sm text-gray-500 px-3 py-2">
                    {isLoadingUsers ? "Loading..." : "No sub-users found"}
                  </div>
                ) : (
                  subUsers.map((user: any) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name || user.username || `User ${user.id}`}
                      {user.email ? ` (${user.email})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              disabled={isWorking || !selectedUserId}
              onClick={() => run(onUnassign)}
              className="border-gray-200"
            >
              Unassign
            </Button>
            <Button
              disabled={isWorking || !selectedUserId}
              onClick={() => run(onAssign)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isWorking ? "Working..." : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignToSubUserDialog;
