import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, UserPlus, CheckCircle, XCircle, Copy, Eye, EyeOff } from "lucide-react";
import { ENV_VARIABLES } from "@/services/config";

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
      const res = await fetch(`${ENV_VARIABLES.API_BASE}/web-users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data: CreateUserResponse = await res.json();
      setResponse(data);

      if (data.success) {
        setFormData({ name: "", email: "", mobile_number: "" });
      }
    } catch (error) {
      setResponse({
        success: false,
        message: "Network error occurred"
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <Card className="shadow-sm border">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <User className="w-5 h-5 text-gray-700" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
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
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile_number" className="text-sm font-medium text-gray-700">
                    Mobile Number
                  </Label>
                  <Input
                    id="mobile_number"
                    name="mobile_number"
                    placeholder="Enter mobile number"
                    value={formData.mobile_number}
                    onChange={handleInputChange}
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating User...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Create User
                    </div>
                  )}
                </Button>
              </div>
            </form>

            {response && (
              <div className={`mt-6 p-4 rounded-lg border ${
                response.success 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-start gap-3">
                  {response.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      response.success ? "text-green-800" : "text-red-800"
                    }`}>
                      {response.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Display */}
        {response?.success && response.temp_pw && (
          <Card className="shadow-sm border">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-lg font-medium text-green-800">Temporary Password</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-lg border">
                  <code className="flex-1 text-lg font-mono text-gray-800 select-all">
                    {showPassword ? response.temp_pw : '••••••••••••'}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-8 w-8 p-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyPassword}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600">Password copied to clipboard!</p>
                )}
                <p className="text-sm text-gray-600">
                  Please share this password with the user securely. They should change it on first login.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreateUser;