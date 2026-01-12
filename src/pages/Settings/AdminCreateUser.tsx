import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { api } from "@/services/config";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileCopyIcon from "@mui/icons-material/FileCopy";

const AdminCreateUser = () => {
  const authState = useAppSelector((state) => state.authData);
  const adminId = authState?.userData?.id;
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success("Copied to clipboard!");
      },
      (err) => {
        console.error("Failed to copy: ", err);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminId) {
      toast.error("Admin ID not found");
      return;
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/web-users/admin/create-user", {
        adminId: Number(adminId),
        name: formData.name.trim(),
        email: formData.email.trim(),
      });

      if (data.success) {
        toast.success(data.message);
        setCreatedUser(data);
        setFormData({ name: "", email: "" });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-2xl font-bold text-gray-800">
              Create Sub-User
            </CardTitle>
            <p className="text-gray-600 text-sm mt-1">
              Create a new user with inherited settings
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter full name"
                  className="bg-gray-50 border-gray-200"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  className="bg-gray-50 border-gray-200"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
              >
                {loading ? "Creating..." : "Create User"}
              </Button>
            </form>

            {createdUser && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 font-medium mb-3">
                  <CheckCircleIcon className="text-green-600" />
                  User created successfully
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600">Name</Label>
                    <p className="text-sm font-medium text-gray-800">{createdUser.user.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Email</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">{createdUser.user.email}</p>
                      <FileCopyIcon 
                        className="text-gray-500 cursor-pointer hover:text-blue-600 transition-colors" 
                        fontSize="small"
                        onClick={() => handleCopy(createdUser.user.email)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Mobile Number</Label>
                    <p className="text-sm font-medium text-gray-800">{createdUser.user.mobile_number}</p>
                  </div>
                  <div className="pt-2 border-t border-green-200">
                    <Label className="text-xs text-gray-600">Temporary Password</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-lg font-bold text-green-700 bg-green-100 px-3 py-1 rounded">
                        {createdUser.temp_pw}
                      </code>
                      <FileCopyIcon 
                        className="text-gray-500 cursor-pointer hover:text-blue-600 transition-colors" 
                        fontSize="small"
                        onClick={() => handleCopy(createdUser.temp_pw)}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Share this password with the user</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCreateUser;
