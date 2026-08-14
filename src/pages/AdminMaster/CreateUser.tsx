import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, UserPlus, CheckCircle, XCircle, Copy, Eye, EyeOff } from "lucide-react";
import { api } from "@/services/config";

interface CreateUserResponse {
  success: boolean;
  message: string;
  temp_pw?: string;
}

const CreateUser = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile_number: ""
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<CreateUserResponse | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    try {
      const { data } = await api.post<CreateUserResponse>("/web-users/create", formData);
      setResponse(data);

      if (data.success) {
        setFormData({ name: "", email: "", mobile_number: "" });
      }
    } catch (error) {
      setResponse({
        success: false,
        message: "Network error occurred. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    if (response?.temp_pw) {
      navigator.clipboard.writeText(response.temp_pw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 mt-2 md:mt-4">
        
        <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
          <CardHeader className="border-b border-gray-100 bg-white pb-4 pt-5">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <User className="w-5 h-5 text-gray-500" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="h-10 border-gray-200 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-sm transition-shadow rounded-md"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-10 border-gray-200 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-sm transition-shadow rounded-md"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mobile_number" className="text-sm font-medium text-gray-700">
                    Mobile Number
                  </Label>
                  <Input
                    id="mobile_number"
                    name="mobile_number"
                    placeholder="Enter mobile number"
                    value={formData.mobile_number}
                    onChange={handleInputChange}
                    className="h-10 border-gray-200 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-sm transition-shadow rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors font-medium text-sm rounded-md"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Creating User...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      <span>Create User</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>

            {response && (
              <div className={`mt-5 p-3.5 rounded-md border text-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300 ${
                response.success 
                  ? "bg-green-50 border-green-200 text-green-800" 
                  : "bg-red-50 border-red-200 text-red-800"
              }`}>
                {response.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <div className="flex-1 mt-0.5 font-medium">
                  {response.message}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Display */}
        {response?.success && response.temp_pw && (
          <Card className="shadow-sm border border-green-100 bg-white rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <CardHeader className="border-b border-green-50 bg-green-50/30 pb-3 pt-4">
              <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
                Temporary Password
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-gray-50/80 p-2.5 rounded border border-gray-200">
                  <code className="flex-1 text-base font-mono font-medium text-gray-800 px-2 tracking-wide">
                    {showPassword ? response.temp_pw : '••••••••••••'}
                  </code>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 rounded-sm"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={copyPassword}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 rounded-sm"
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-medium">
                    Please share securely. The user will change it on first login.
                  </p>
                  {copied && (
                    <span className="text-xs text-green-600 font-medium animate-in fade-in">
                      Copied!
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreateUser;