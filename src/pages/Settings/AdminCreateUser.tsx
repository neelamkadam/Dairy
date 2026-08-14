import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { api } from "@/services/config";
import { ROUTES } from "@/constatnts/routesConstants";
import { PanelLeft, UserPlus, Mail, User, ShieldCheck } from "lucide-react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileCopyIcon from "@mui/icons-material/FileCopy";

const AdminCreateUser = () => {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-2xl shadow-inner border border-blue-100/50">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 font-serif tracking-tight">
                Create Sub-User
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Set up a new user with inherited settings</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.SETTINGS.SIDEBAR_ACCESS)}
            className="text-blue-600 border-blue-200 bg-white hover:bg-blue-50 flex items-center gap-2 rounded-xl h-11 px-5 shadow-sm font-semibold transition-all"
          >
            <PanelLeft className="h-4 w-4" />
            Sidebar Access
          </Button>
        </div>

        {/* Success Alert */}
        {createdUser && (
          <div className="bg-emerald-50 rounded-3xl p-6 md:p-8 border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ShieldCheck className="w-48 h-48 text-emerald-600 transform rotate-12" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 text-emerald-800 font-bold mb-6 pb-4 border-b border-emerald-200/60">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="text-emerald-600" />
                </div>
                <span className="text-lg">Account Successfully Created!</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs font-bold text-emerald-700/70 uppercase tracking-wider">Name</Label>
                  <p className="text-base font-bold text-emerald-900 mt-1">{createdUser.user.name}</p>
                </div>
                <div>
                  <Label className="text-xs font-bold text-emerald-700/70 uppercase tracking-wider">Mobile Number</Label>
                  <p className="text-base font-bold text-emerald-900 mt-1">{createdUser.user.mobile_number || 'N/A'}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold text-emerald-700/70 uppercase tracking-wider">Email Address</Label>
                  <div className="flex items-center justify-between bg-white/60 border border-emerald-200/60 px-4 py-3 rounded-xl mt-1.5 group">
                    <p className="text-base font-bold text-emerald-900 truncate">{createdUser.user.email}</p>
                    <button 
                      onClick={() => handleCopy(createdUser.user.email)}
                      className="text-emerald-500 hover:text-emerald-700 transition-colors p-1.5 hover:bg-emerald-100 rounded-lg"
                      title="Copy email"
                    >
                      <FileCopyIcon fontSize="small" />
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2 pt-4 border-t border-emerald-200/60">
                  <Label className="text-xs font-bold text-emerald-700/70 uppercase tracking-wider">Temporary Password</Label>
                  <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl mt-2 border border-emerald-200 shadow-sm">
                    <code className="text-xl font-black text-emerald-700 tracking-widest">
                      {createdUser.temp_pw}
                    </code>
                    <button 
                      onClick={() => handleCopy(createdUser.temp_pw)}
                      className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Copy password"
                    >
                      <FileCopyIcon fontSize="small" />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-emerald-600 mt-3 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Please share this password securely with the user. They will be prompted to change it upon first login.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Creation Form */}
        <Card className="bg-white border-0 shadow-sm rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          <div className="p-8 md:p-10">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-800 font-serif">Account Details</h2>
              <p className="text-slate-500 mt-2 font-medium">Enter the information below to set up a new sub-user account.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 text-slate-400 rounded-lg group-focus-within:bg-blue-100 group-focus-within:text-blue-600 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g. John Doe"
                    className="pl-14 bg-slate-50/50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-14 rounded-2xl text-slate-700 font-medium text-base transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 text-slate-400 rounded-lg group-focus-within:bg-blue-100 group-focus-within:text-blue-600 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. john@example.com"
                    className="pl-14 bg-slate-50/50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-14 rounded-2xl text-slate-700 font-medium text-base transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-14 text-lg font-bold rounded-2xl shadow-lg shadow-blue-200/50 transition-all active:scale-[0.98] mt-8 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Create User Account
                  </>
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminCreateUser;
