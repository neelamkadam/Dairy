import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Phone,
  Building2,
  CheckCircle,
  XCircle,
  Users,
  Search,
  Smartphone,
  Monitor,
  RotateCcw,
  Save,
} from "lucide-react";
import { api } from "@/services/config";
import { adminApi } from "@/services/adminApi";
import { toast } from "react-toastify";

interface BranchResponse {
  success: boolean;
  message?: string;
  mobile_number?: string;
  branches?: Array<{
    dairy_id: number;
    username: string;
    name: string;
    branchname: string;
  }>;
}

interface WebUser {
  id: number;
  name: string;
  email: string | null;
  mobile_number: string | null;
  branches: number[] | null;
  is_active: number;
}

interface Dairy {
  id: number;
  username: string;
  name: string | null;
  branchname: string | null;
  ownername: string | null;
  villagename: string | null;
}

const AddBranch = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<BranchResponse | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);

  // Web user ↔ dairy assignment manager
  const [showManager, setShowManager] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [webUsers, setWebUsers] = useState<WebUser[]>([]);
  const [dairies, setDairies] = useState<Dairy[]>([]);
  const [selectedWebUser, setSelectedWebUser] = useState<WebUser | null>(null);
  const [webSearch, setWebSearch] = useState("");
  const [dairySearch, setDairySearch] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setSelectedBranches([]);

    try {
      const { data } = await api.post<BranchResponse>("/web/branches/by-mobile", {
        mobile_number: mobileNumber
      });
      setResponse(data);

      if (data.success) {
        const branchCount = data.branches ? data.branches.length : 0;
        toast.success(`Found ${branchCount} branches`);
      } else {
        toast.error(data.message || "User not found");
      }
    } catch (error) {
      const errorResponse = {
        success: false,
        message: "Network error occurred"
      };
      setResponse(errorResponse);
      toast.error("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSelection = (dairyId: number, checked: boolean) => {
    setSelectedBranches(prev =>
      checked
        ? [...prev, dairyId]
        : prev.filter(id => id !== dairyId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && response?.branches) {
      setSelectedBranches(response.branches.map(branch => branch.dairy_id));
    } else {
      setSelectedBranches([]);
    }
  };

  const handleFinalSubmit = async () => {
    if (selectedBranches.length === 0) {
      toast.error("Please select at least one branch");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/web-users/update-branches", {
        mobile_number: mobileNumber,
        dairy_ids: selectedBranches
      });

      if (data.success) {
        toast.success("Branches updated successfully!");
        setSelectedBranches([]);
      } else {
        toast.error(data.message || "Failed to update branches");
      }
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const openManager = async () => {
    setShowManager(true);
    if (webUsers.length > 0 || usersLoading) return;
    setUsersLoading(true);
    try {
      const { data } = await adminApi.getAllUsers();
      if (data.success) {
        setWebUsers(data.data.webUsers || []);
        setDairies(data.data.dairyManagers || []);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSelectWebUser = (user: WebUser) => {
    setSelectedWebUser(user);
    setCheckedIds(new Set(user.branches || []));
    setDairySearch("");
  };

  const toggleDairy = (dairyId: number, checked: boolean) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(dairyId);
      else next.delete(dairyId);
      return next;
    });
  };

  const originalIds = useMemo(
    () => new Set(selectedWebUser?.branches || []),
    [selectedWebUser]
  );

  const addedCount = useMemo(
    () => [...checkedIds].filter(id => !originalIds.has(id)).length,
    [checkedIds, originalIds]
  );
  const removedCount = useMemo(
    () => [...originalIds].filter(id => !checkedIds.has(id)).length,
    [checkedIds, originalIds]
  );
  const hasChanges = addedCount > 0 || removedCount > 0;

  const filteredWebUsers = useMemo(() => {
    const q = webSearch.trim().toLowerCase();
    if (!q) return webUsers;
    return webUsers.filter(u =>
      (u.name || "").toLowerCase().includes(q) ||
      (u.mobile_number || "").includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  }, [webUsers, webSearch]);

  const filteredDairies = useMemo(() => {
    const q = dairySearch.trim().toLowerCase();
    let list = dairies;
    if (q) {
      list = dairies.filter(d =>
        (d.username || "").toLowerCase().includes(q) ||
        (d.name || "").toLowerCase().includes(q) ||
        (d.branchname || "").toLowerCase().includes(q) ||
        (d.ownername || "").toLowerCase().includes(q) ||
        (d.villagename || "").toLowerCase().includes(q)
      );
    }
    // Assigned dairies first so the current selection is visible at a glance
    if (selectedWebUser) {
      list = [...list].sort((a, b) => {
        const aAssigned = originalIds.has(a.id) ? 0 : 1;
        const bAssigned = originalIds.has(b.id) ? 0 : 1;
        if (aAssigned !== bAssigned) return aAssigned - bAssigned;
        return a.id - b.id;
      });
    }
    return list;
  }, [dairies, dairySearch, selectedWebUser, originalIds]);

  const handleReset = () => {
    setCheckedIds(new Set(selectedWebUser?.branches || []));
  };

  const handleSaveAssignments = async () => {
    if (!selectedWebUser) return;
    if (!selectedWebUser.mobile_number) {
      toast.error("This web user has no mobile number, cannot update branches");
      return;
    }

    // Keep ids that reference deleted dairies (not in the list) so they are
    // never dropped just because they can't be displayed
    const visibleIds = new Set(dairies.map(d => d.id));
    const staleIds = (selectedWebUser.branches || []).filter(id => !visibleIds.has(id));
    const dairy_ids = [...new Set([...checkedIds, ...staleIds])];

    setSaving(true);
    try {
      const { data } = await api.post("/web-users/update-branches", {
        mobile_number: selectedWebUser.mobile_number,
        dairy_ids,
      });
      if (data.success) {
        toast.success(`Dairies updated for ${selectedWebUser.name}`);
        const updatedUser = { ...selectedWebUser, branches: dairy_ids };
        setWebUsers(prev => prev.map(u => (u.id === selectedWebUser.id ? updatedUser : u)));
        setSelectedWebUser(updatedUser);
        setCheckedIds(new Set(dairy_ids));
      } else {
        toast.error(data.message || "Failed to update dairies");
      }
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 mt-2 md:mt-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-800">Branch Assignment</h1>
                <p className="text-sm text-gray-500">View user's assigned branches</p>
              </div>
            </div>
            <Button
              onClick={() => (showManager ? setShowManager(false) : openManager())}
              className={
                showManager
                  ? "h-9 bg-gray-600 hover:bg-gray-700 text-white text-sm px-4 rounded-md shadow-sm transition-colors"
                  : "h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 rounded-md shadow-sm transition-colors"
              }
            >
              <Users className="w-4 h-4 mr-2" />
              {showManager ? "Back to Search" : "Manage User Dairies"}
            </Button>
          </div>
        </div>

        {showManager ? (
          <>
            {usersLoading ? (
              <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
                <CardContent className="p-12 flex items-center justify-center gap-3 text-gray-500">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium">Loading users...</span>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
                {/* Left: Web users */}
                <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
                  <CardHeader className="border-b border-gray-100 bg-white pb-3 pt-4">
                    <CardTitle className="flex items-center justify-between text-base font-semibold text-gray-800">
                      <span className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-blue-600" />
                        Web Users
                      </span>
                      <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                        {filteredWebUsers.length} of {webUsers.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by name, mobile or email"
                        value={webSearch}
                        onChange={(e) => setWebSearch(e.target.value)}
                        className="pl-9 h-9 text-sm border-gray-200 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 rounded-md transition-shadow"
                      />
                    </div>
                    <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-1">
                      {filteredWebUsers.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                          No web users found.
                        </div>
                      ) : (
                        filteredWebUsers.map((user) => {
                          const isSelected = selectedWebUser?.id === user.id;
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleSelectWebUser(user)}
                              className={`w-full text-left p-2.5 rounded-md border transition-all ${
                                isSelected
                                  ? "border-blue-300 bg-blue-50/50 shadow-sm"
                                  : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className={`text-sm truncate ${isSelected ? "font-semibold text-blue-900" : "font-medium text-gray-800"}`}>
                                    {user.name || "-"}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate mt-0.5">
                                    {user.mobile_number || "No mobile"}
                                    {user.email ? ` · ${user.email}` : ""}
                                  </div>
                                </div>
                                <span
                                  className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                    isSelected
                                      ? "bg-blue-600 text-white"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {(user.branches || []).length} dairies
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Right: Mobile users / dairies */}
                <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
                  <CardHeader className="border-b border-gray-100 bg-white pb-3 pt-4">
                    <CardTitle className="flex items-center justify-between text-base font-semibold text-gray-800">
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-green-600" />
                        Mobile Users (Dairies)
                      </span>
                      {selectedWebUser && (
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          {checkedIds.size} selected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {!selectedWebUser ? (
                      <div className="p-12 flex flex-col items-center justify-center text-center text-gray-500">
                        <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium text-gray-700">Select a web user</p>
                        <p className="text-xs mt-1 text-gray-500 max-w-[200px]">
                          Choose a web user on the left to see and manage their dairies.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 px-3 py-2 rounded-md bg-blue-50/50 border border-blue-100/50 text-xs text-blue-800 flex items-center justify-between">
                          <span>
                            Managing dairies for <span className="font-semibold">{selectedWebUser.name}</span>
                          </span>
                          {selectedWebUser.mobile_number && (
                            <span className="font-mono text-blue-600">{selectedWebUser.mobile_number}</span>
                          )}
                        </div>
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search dairy, branch, owner or village"
                            value={dairySearch}
                            onChange={(e) => setDairySearch(e.target.value)}
                            className="pl-9 h-9 text-sm border-gray-200 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 rounded-md transition-shadow"
                          />
                        </div>
                        <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
                          {filteredDairies.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">
                              No dairies found.
                            </div>
                          ) : (
                            filteredDairies.map((dairy) => {
                              const isChecked = checkedIds.has(dairy.id);
                              const wasAssigned = originalIds.has(dairy.id);
                              return (
                                <label
                                  key={dairy.id}
                                  htmlFor={`dairy-${dairy.id}`}
                                  className={`flex items-center gap-3 p-2.5 rounded-md border transition-all cursor-pointer group ${
                                    isChecked
                                      ? "border-green-200 bg-green-50/30"
                                      : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  <Checkbox
                                    id={`dairy-${dairy.id}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) =>
                                      toggleDairy(dairy.id, checked as boolean)
                                    }
                                    className="border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono font-medium text-blue-600">
                                        {dairy.username}
                                      </span>
                                      {wasAssigned !== isChecked && (
                                        <span
                                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm tracking-wider ${
                                            isChecked
                                              ? "bg-green-100 text-green-700"
                                              : "bg-red-100 text-red-700"
                                          }`}
                                        >
                                          {isChecked ? "Adding" : "Removing"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm font-semibold text-gray-800 truncate leading-snug">
                                      {dairy.name || dairy.branchname || "-"}
                                    </div>
                                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                                      {[dairy.branchname, dairy.ownername, dairy.villagename]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>

                        {/* Save bar */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <div className="text-xs text-gray-600">
                            {hasChanges ? (
                              <div className="flex items-center gap-1.5">
                                {addedCount > 0 && (
                                  <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md border border-green-100">
                                    +{addedCount} new
                                  </span>
                                )}
                                {removedCount > 0 && (
                                  <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded-md border border-red-100">
                                    -{removedCount} removed
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">No pending changes</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={handleReset}
                              disabled={!hasChanges || saving}
                              className="h-9 text-xs font-medium rounded-md"
                            >
                              <RotateCcw className="w-3 h-3 mr-1.5" />
                              Reset
                            </Button>
                            <Button
                              onClick={handleSaveAssignments}
                              disabled={!hasChanges || saving}
                              className="h-9 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                            >
                              {saving ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                  <span>Saving...</span>
                                </div>
                              ) : (
                                <>
                                  <Save className="w-3.5 h-3.5 mr-1.5" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
            <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
              <CardHeader className="border-b border-gray-100 bg-white pb-3 pt-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Phone className="w-5 h-5 text-gray-500" />
                  Search User
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile_number" className="text-sm font-medium text-gray-700">
                      Mobile Number
                    </Label>
                    <Input
                      id="mobile_number"
                      placeholder="Enter user's mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="h-10 border-gray-200 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-sm transition-shadow rounded-md"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors font-medium text-sm rounded-md"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          <span>Searching...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Search className="w-4 h-4" />
                          <span>Search User</span>
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
                      {response.success
                        ? (response.message || `Found ${response.branches?.length || 0} assigned branches.`)
                        : response.message}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Branch Selection */}
            {response?.success && response.branches && response.branches.length > 0 && (
              <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3 pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <CardTitle className="text-base font-semibold text-gray-800">
                      Assign Branches for <span className="text-blue-600 font-mono font-bold tracking-tight">{response.mobile_number}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedBranches.length === response.branches.length}
                        onCheckedChange={handleSelectAll}
                        className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                        Select All
                      </Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-5">
                  <div className="grid gap-2">
                    {response.branches.map((branch, index) => (
                      <label key={index} htmlFor={`branch-${branch.dairy_id}`} className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group">
                        <Checkbox
                          id={`branch-${branch.dairy_id}`}
                          checked={selectedBranches.includes(branch.dairy_id)}
                          onCheckedChange={(checked) =>
                            handleBranchSelection(branch.dairy_id, checked as boolean)
                          }
                          className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0"
                        />
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between min-w-0 gap-2 sm:gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xs font-mono text-blue-600 font-medium bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded shrink-0">{branch.username}</span>
                            <span className="font-semibold text-sm text-gray-900 truncate">{branch.branchname}</span>
                          </div>
                          <div className="text-xs text-gray-500 truncate sm:text-right shrink-0">
                            {branch.name}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {selectedBranches.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <Button
                        onClick={handleFinalSubmit}
                        disabled={loading}
                        className="w-full h-10 bg-green-600 hover:bg-green-700 text-white shadow-sm font-medium text-sm rounded-md transition-colors"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>Updating...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Save className="w-4 h-4" />
                            <span>Update {selectedBranches.length} Branch{selectedBranches.length > 1 ? 'es' : ''}</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddBranch;
