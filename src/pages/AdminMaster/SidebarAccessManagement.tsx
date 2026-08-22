import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getSidebarAccess, createOrUpdateSidebarAccess } from "@/services/sidebarAccessApi";
import { adminApi } from "@/services/adminApi";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { RootState, useAppSelector } from "@/redux/store";
import { KeyRound, Eye, EyeOff, ShieldCheck, CheckSquare, Users, Search, ChevronDown } from "lucide-react";

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
  const { t } = useTranslation();
  const authState = useAppSelector((state) => state.authData);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
      toast.error(t("failed_to_fetch_users", "Failed to fetch users"));
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

  const isAllSelected = Object.keys(access).length > 0 && Object.keys(access).every(
    key => access[key as keyof SidebarAccess] === 1
  );

  const handleSelectAll = (checked: boolean) => {
    const newVal = checked ? 1 : 0;
    const newAccess = { ...access };
    Object.keys(newAccess).forEach(key => {
      newAccess[key as keyof SidebarAccess] = newVal;
    });
    setAccess(newAccess);
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      toast.error(t("please_select_a_user", "Please select a user"));
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
      toast.error(error.response?.data?.message || t("failed_to_save_sidebar_access", "Failed to save sidebar access"));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword.trim()) {
      toast.error(t("please_enter_new_password", "Please enter new password"));
      return;
    }
    if (newPassword.length < 4) {
      toast.error(t("password_min_4_chars", "Password must be at least 4 characters"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("passwords_do_not_match", "Passwords do not match"));
      return;
    }

    try {
      const response = await adminApi.setPassword(selectedUserId!, newPassword);
      if (response.data.success) {
        toast.success(t("password_reset_successfully", "Password reset successfully"));
        setShowPasswordModal(false);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("failed_to_reset_password", "Failed to reset password"));
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.toString().includes(searchQuery)
  );

  const accessItems = [
    { key: "dashboard", label: t("dashboard", "Dashboard") },
    { key: "collection_entry", label: t("collection_entry", "Collection Entry") },
    { key: "collection", label: t("collection", "Collection") },
    { key: "master", label: t("master", "Master") },
    { key: "billing", label: t("billing", "Billing") },
    { key: "reports", label: t("reports", "Reports") },
    { key: "settings", label: t("settings", "Settings") },
    { key: "shubham_milk_product", label: t("shubham_milk_product", "Shubham Milk Product") },
    { key: "payment", label: t("payment", "Payment") },
    { key: "dyn", label: t("dynamic_milk_cycle", "Dynamic Milk Cycle") },
  ];

  return (
    <div className="p-2 md:p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-[calc(100vh-80px)] space-y-4 md:space-y-5">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100/80 shadow-sm p-4 w-full">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">{t("sidebar_access_management", "Sidebar Access Management")}</h1>
              <p className="text-xs text-gray-500 mt-0.5">{t("control_which_features_user_can_access", "Control which features each user can access")}</p>
            </div>
          </div>
          {selectedUserId && (
            <Button
              onClick={() => setShowPasswordModal(true)}
              variant="outline"
              className="h-9 text-amber-600 border-amber-200 bg-white hover:bg-amber-50 flex items-center gap-2 rounded-lg px-4 shadow-sm font-medium transition-all"
              title="Reset Password"
            >
              <KeyRound className="w-4 h-4" />
              {t("reset_password", "Reset Password")}
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-4 md:space-y-5">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: User Selection */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 p-5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-indigo-500" />
                  {t("select_user", "Select User")}
                </h2>
              </div>
              <CardContent className="p-5">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-slate-600 ml-1">{t("target_account", "Target Account")}</Label>
                  <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={dropdownOpen}
                        className="w-full h-12 bg-slate-50/50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-slate-700 justify-between font-normal hover:bg-slate-100/50"
                      >
                        {selectedUserId 
                          ? users.find(u => u.id === selectedUserId)?.email || t("choose_a_user_account", "Choose a user account...")
                          : t("choose_a_user_account", "Choose a user account...")}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white rounded-xl shadow-lg border-slate-100" align="start" side="bottom" avoidCollisions={false}>
                      <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-xl">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder={t("search_user_by_email_or_id", "Search user by email or ID...")}
                            className="pl-9 h-9 bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-1">
                        {filteredUsers.length === 0 ? (
                          <div className="py-6 text-center text-sm text-slate-500">
                            {t("no_users_found", "No users found")}
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <div 
                              key={user.id} 
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setDropdownOpen(false);
                                setSearchQuery("");
                              }} 
                              className={`flex items-center px-3 py-2 cursor-pointer rounded-md transition-colors ${selectedUserId === user.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                              <span className="font-medium">{user.email}</span>
                              <span className={`text-xs ml-2 ${selectedUserId === user.id ? 'text-blue-500' : 'text-slate-400'}`}>({t("id", "ID:")} {user.id})</span>
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Access Toggles */}
          <div className="lg:col-span-8">
            <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden h-full">
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <CheckSquare className="w-4 h-4 text-indigo-500" />
                  {t("permissions", "Permissions")}
                </h2>
                
                {selectedUserId && (
                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    <Label htmlFor="select-all" className="text-xs font-bold text-slate-600 cursor-pointer uppercase tracking-wider">
                      {t("select_all", "Select All")}
                    </Label>
                    <Switch
                      id="select-all"
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                )}
              </div>
              
              <CardContent className="p-5 md:p-6">
                {!selectedUserId ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 mt-2">
                    <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                      <ShieldCheck className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-base font-bold text-slate-600 mb-1">{t("no_user_selected", "No User Selected")}</h3>
                    <p className="font-medium text-sm text-slate-500">{t("choose_a_user_manage_access", "Choose a user from the left panel to manage their access")}</p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      {accessItems.map((item) => {
                        const isChecked = access[item.key as keyof SidebarAccess] === 1;
                        return (
                          <div
                            key={item.key}
                            onClick={() => handleToggle(item.key as keyof SidebarAccess)}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                              isChecked 
                                ? "border-blue-500 bg-blue-50/30 shadow-sm" 
                                : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <Label 
                              htmlFor={item.key} 
                              className={`cursor-pointer font-bold ${isChecked ? "text-blue-900" : "text-slate-600"}`}
                              onClick={(e) => e.preventDefault()}
                            >
                              {item.label}
                            </Label>
                            <Switch
                              id={item.key}
                              checked={isChecked}
                              onCheckedChange={() => handleToggle(item.key as keyof SidebarAccess)}
                              className="data-[state=checked]:bg-blue-600 pointer-events-none"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <Button 
                      onClick={handleSave} 
                      disabled={loading} 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 text-base font-bold rounded-xl shadow-md shadow-blue-200/50 transition-all active:scale-[0.99] mt-2"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t("saving_permissions", "Saving Permissions...")}
                        </span>
                      ) : (
                        t("save_access_permissions", "Save Access Permissions")
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-slate-900/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 font-serif">{t("reset_password", "Reset Password")}</h3>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">{t("new_password", "New Password")}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 bg-slate-50/50 border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 h-11 rounded-xl"
                    placeholder={t("enter_new_password", "Enter new password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">{t("confirm_password", "Confirm Password")}</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 bg-slate-50/50 border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 h-11 rounded-xl"
                    placeholder={t("confirm_new_password", "Confirm new password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 h-11 rounded-xl"
                >
                  {t("cancel", "Cancel")}
                </Button>
                <Button 
                  onClick={handlePasswordReset} 
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-11 rounded-xl shadow-md shadow-amber-200/50"
                >
                  {t("confirm_reset", "Confirm Reset")}
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
