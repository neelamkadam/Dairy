import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { api } from "@/services/config";
import { ROUTES } from "@/constatnts/routesConstants";
import { PanelLeft, Mail, User, ShieldCheck, ChevronUp, ChevronDown } from "lucide-react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileCopyIcon from "@mui/icons-material/FileCopy";

const AdminCreateUser = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authState = useAppSelector((state) => state.authData);
  const adminId = authState?.userData?.id;
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(true);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(t("copied_to_clipboard", "Copied to clipboard!"));
      },
      (err) => {
        console.error("Failed to copy: ", err);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminId) {
      toast.error(t("admin_id_not_found", "Admin ID not found"));
      return;
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error(t("please_fill_all_required_fields", "Please fill all required fields"));
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
      toast.error(error?.response?.data?.message || t("failed_to_create_user", "Failed to create user"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white p-2 md:p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Success Alert */}
        {createdUser && (
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ShieldCheck className="w-48 h-48 text-emerald-600 transform rotate-12" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 text-emerald-800 font-bold mb-4 pb-3 border-b border-emerald-200/60">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="text-emerald-600 w-5 h-5" />
                </div>
                <span className="text-base">{t("account_successfully_created", "Account Successfully Created!")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">{t("name", "Name")}</Label>
                  <p className="text-sm font-bold text-emerald-900 mt-0.5">{createdUser.user.name}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">{t("mobile_number", "Mobile Number")}</Label>
                  <p className="text-sm font-bold text-emerald-900 mt-0.5">{createdUser.user.mobile_number || t("n_a", "N/A")}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">{t("email_address", "Email Address")}</Label>
                  <div className="flex items-center justify-between bg-white/60 border border-emerald-200/60 px-3 py-2 rounded-lg mt-1 group">
                    <p className="text-sm font-bold text-emerald-900 truncate">{createdUser.user.email}</p>
                    <button 
                      onClick={() => handleCopy(createdUser.user.email)}
                      className="text-emerald-500 hover:text-emerald-700 transition-colors p-1.5 hover:bg-emerald-100 rounded-md"
                      title={t("copy_email", "Copy email")}
                    >
                      <FileCopyIcon fontSize="small" />
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2 pt-3 border-t border-emerald-200/60">
                  <Label className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">{t("temporary_password", "Temporary Password")}</Label>
                  <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg mt-1 border border-emerald-200 shadow-sm">
                    <code className="text-lg font-black text-emerald-700 tracking-widest">
                      {createdUser.temp_pw}
                    </code>
                    <button 
                      onClick={() => handleCopy(createdUser.temp_pw)}
                      className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title={t("copy_password", "Copy password")}
                    >
                      <FileCopyIcon fontSize="small" />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> {t("please_share_this_password_securely", "Please share this password securely with the user. They will be prompted to change it upon first login.")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Creation Form */}
        <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl py-0 gap-0">
          <CardHeader
            className="px-4 py-3 border-b border-slate-100/50 bg-white/50 cursor-pointer select-none"
            onClick={() => setIsFormOpen((prev) => !prev)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-semibold text-slate-800">
                  {t("create_sub_user", "Create Sub-User")}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(ROUTES.SETTINGS.SIDEBAR_ACCESS);
                  }}
                  className="text-blue-600 border-blue-200 bg-white hover:bg-blue-50 flex items-center gap-1.5 h-7 px-2.5 shadow-sm font-semibold transition-all text-xs rounded-md"
                >
                  <PanelLeft className="h-3 w-3" />
                  {t("sidebar_access", "Sidebar Access")}
                </Button>
              </div>
              {isFormOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </CardHeader>
          
          {isFormOpen && (
            <CardContent className="px-4 py-6">
              <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700 ml-0.5">
                    {t("full_name", "Full Name")} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <Input
                      id="name"
                      type="text"
                      placeholder={t("eg_john_doe", "e.g. John Doe")}
                      className="pl-9 h-10 bg-white border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-blue-600/20 transition-all rounded-lg text-sm shadow-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-0.5">
                    {t("email_address", "Email Address")} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("eg_john_example_com", "e.g. john@example.com")}
                      className="pl-9 h-10 bg-white border-gray-200 focus:bg-white focus:border-blue-600 focus:ring-blue-600/20 transition-all rounded-lg text-sm shadow-sm"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 text-sm font-semibold rounded-lg transition-all disabled:opacity-70 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm mt-4 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("creating_account", "Creating Account...")}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      {t("create_user_account", "Create User Account")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminCreateUser;
