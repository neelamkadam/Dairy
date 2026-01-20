import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Smartphone } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "@/services/config";
import { useAppSelector } from "@/redux/store";

const PasswordManager = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const authState = useAppSelector((state) => state.authData);
  const loggedInUserId = authState?.userData?.id;
  const [activeTab, setActiveTab] = useState<"mobile" | "web">("mobile");
  const [vlcId, setVlcId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (activeTab === "mobile" && !vlcId.trim()) {
      toast.error("Please select VLC");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter new password");
      return;
    }
    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (activeTab === "mobile") {
        const selectedBranch = branches.find(b => b.branch_id.toString() === vlcId);
        const response = await api.post("/auth/update-password", {
          username: selectedBranch?.username,
          password: password,
          confirm_password: confirmPassword,
        });
        if (response.data.success) {
          toast.success(response.data.message || "Password updated successfully");
          setVlcId("");
          setPassword("");
          setConfirmPassword("");
        } else {
          toast.error(response.data.message || "Failed to update password");
        }
      } else {
        const response = await api.post("/web-users/set-password", {
          userId: Number(loggedInUserId),
          newPassword: password
        });
        if (response.data.success) {
          toast.success(response.data.message || "Password updated successfully");
          setPassword("");
          setConfirmPassword("");
        } else {
          toast.error(response.data.message || "Failed to update password");
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setVlcId("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleTabChange = (tab: "mobile" | "web") => {
    setActiveTab(tab);
    handleReset();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Password Manager</h1>
          <p className="text-gray-600">Reset password for VLC users</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Reset User Password</h2>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2 mb-6">
              <Button
                onClick={() => handleTabChange("mobile")}
                className={`flex-1 flex items-center justify-center gap-2 ${
                  activeTab === "mobile"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                Mobile Password
              </Button>
              <Button
                onClick={() => handleTabChange("web")}
                className={`flex-1 flex items-center justify-center gap-2 ${
                  activeTab === "web"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Lock className="h-4 w-4" />
                Web Password
              </Button>
            </div>

            <div className="space-y-4">
              {activeTab === "mobile" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Select VLC
                  </label>
                  <Select value={vlcId} onValueChange={setVlcId}>
                    <SelectTrigger className="w-full bg-gray-50">
                      <SelectValue placeholder="Select VLC" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {branches.map((branch) => (
                        <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                          {branch.username} - {branch.name} - {branch.branchName || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordManager;
