import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constatnts/routesConstants";
import { api } from "@/services/config";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { setAuthentication, clearTempUserData } from "@/redux/AuthSlice";

const SetNewPassword = () => {
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tempUserData } = useAppSelector((state) => state.authData);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      if (!tempUserData) {
        setError("Session expired. Please login again.");
        return;
      }

      const { data } = await api.post("/web-users/set-password", {
        userId: tempUserData.userId,
        newPassword: formData.newPassword
      });

      if (data.success) {
        // Clear temp data and logout user
        dispatch(clearTempUserData());
        localStorage.removeItem("token");
        
        // Show success message and redirect to login
        alert("Password set successfully! Please login with your new password.");
        navigate(ROUTES.AUTH.LOGIN);
      } else {
        setError(data.message || "Failed to set password");
      }
    } catch (error) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <p className="text-gray-600">Create a secure password for your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Setting Password..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetNewPassword;