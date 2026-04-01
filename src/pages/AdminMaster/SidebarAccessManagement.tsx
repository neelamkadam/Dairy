import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSidebarAccess, createOrUpdateSidebarAccess } from "@/services/sidebarAccessApi";
import { adminApi } from "@/services/adminApi";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { RootState, useAppSelector } from "@/redux/store";
import { KeyRound, Eye, EyeOff } from "lucide-react";

interface SidebarAccess {
  dashboard: number;
  collection_entry: number;
  collection: number;
  master: number;
  billing: number;
  reports: number;
  settings: number;
  shubham_milk_product: number;
  payment: number;
  dyn: number;
}

const SidebarAccessManagement = () => {
  const authState = useAppSelector((state: RootState) => state.authData);
  const loggedInUserId = authState?.userData?.id;
  const userRole = authState?.userRole;
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [access, setAccess] = useState<SidebarAccess>({
    dashboard: 0,
    collection_entry: 0,
    collection: 0,
    master: 0,
    billing: 0,
    reports: 0,
    settings: 0,
    shubham_milk_product: 0,
    payment: 0,
    dyn: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchSidebarAccess(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const { data } = await adminApi.getAllUsers();
      if (data.success) {
        let userData = data.data.webUsers || [];
        
        console.log('All users fetched:', userData);
        console.log('Current user role:', userRole);
        console.log('Current user ID:', loggedInUserId);
        
        // Filter users: admin sees all, user sees only their created users
        if (userRole === "user" && loggedInUserId) {
          userData = userData.filter((u: any) => {
            const match = u.created_by?.toString() === loggedInUserId.toString();
            console.log(`User ${u.id} (${u.email}) - created_by: ${u.created_by}, match: ${match}`);
            return match;
          });
        }
        
        console.log('Filtered users:', userData);
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to fetch users");
    }
  };

  const fetchSidebarAccess = async (userId: number) => {
    try {
      const response = await getSidebarAccess(userId);
      if (response.success && response.data) {
        setAccess({
          dashboard: response.data.dashboard || 0,
          collection_entry: response.data.collection_entry || 0,
          collection: response.data.collection || 0,
          master: response.data.master || 0,
          billing: response.data.billing || 0,
          reports: response.data.reports || 0,
          settings: response.data.settings || 0,
          shubham_milk_product: response.data.shubham_milk_product || 0,
          payment: response.data.payment || 0,
          dyn: response.data.dyn || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching sidebar access:", error);
    }
  };

  const handleToggle = (key: keyof SidebarAccess) => {
    setAccess((prev) => ({
      ...prev,
      [key]: prev[key] === 1 ? 0 : 1,
    }));
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    setLoading(true);
    try {
      const response = await createOrUpdateSidebarAccess({
        web_user_id: selectedUserId,
        ...access,
      });

      if (response.success) {
        toast.success(response.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save sidebar access");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword.trim()) {
      toast.error("Please enter new password");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const response = await adminApi.setPassword(selectedUserId!, newPassword);
      if (response.data.success) {
        toast.success("Password reset successfully");
        setShowPasswordModal(false);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    }
  };

  const filteredUsers = users;

  const accessItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "collection_entry", label: "Collection Entry" },
    { key: "collection", label: "Collection" },
    { key: "master", label: "Master" },
    { key: "billing", label: "Billing" },
    { key: "reports", label: "Reports" },
    { key: "settings", label: "Settings" },
    { key: "shubham_milk_product", label: "Shubham Milk Product" },
    { key: "payment", label: "Payment" },
    { key: "dyn", label: "Dynamic Milk Cycle" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Sidebar Access Management</h2>
          {selectedUserId && (
            <Button
              onClick={() => setShowPasswordModal(true)}
              variant="outline"
              size="icon"
              className="hover:bg-blue-50"
              title="Reset Password"
            >
              <KeyRound className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Select User</Label>
            <Select
              value={selectedUserId?.toString()}
              onValueChange={(value) => setSelectedUserId(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.email} (ID: {user.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUserId && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accessItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Label htmlFor={item.key} className="cursor-pointer font-medium text-gray-700">
                      {item.label}
                    </Label>
                    <Switch
                      id={item.key}
                      checked={access[item.key as keyof SidebarAccess] === 1}
                      onCheckedChange={() => handleToggle(item.key as keyof SidebarAccess)}
                    />
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleSave} 
                disabled={loading} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Saving..." : "Save Access"}
              </Button>
            </>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white bg-opacity-95 rounded-lg p-6 w-full max-w-md border-2 border-blue-200 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
            <div className="space-y-4">
              <div>
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handlePasswordReset} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Reset Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarAccessManagement;
