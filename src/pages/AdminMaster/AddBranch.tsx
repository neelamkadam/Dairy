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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Branch Assignment</h1>
                <p className="text-gray-600">View user's assigned branches</p>
              </div>
            </div>
            <Button
              onClick={() => (showManager ? setShowManager(false) : openManager())}
              className={
                showManager
                  ? "h-11 bg-gray-600 hover:bg-gray-700"
                  : "h-11 bg-blue-600 hover:bg-blue-700"
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
              <Card className="shadow-sm border">
                <CardContent className="p-12 flex items-center justify-center gap-3 text-gray-500">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Loading users...
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
                {/* Left: Web users */}
                <Card className="shadow-sm border">
                  <CardHeader className="border-b bg-gray-50">
                    <CardTitle className="flex items-center justify-between text-lg font-medium">
                      <span className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-blue-600" />
                        Web Users
                      </span>
                      <span className="text-sm font-normal text-gray-500">
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
                        className="pl-9 h-10"
                      />
                    </div>
                    <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
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
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {user.name || "-"}
                                  </div>
                                  <div className="text-sm text-gray-500 truncate">
                                    {user.mobile_number || "No mobile"}
                                    {user.email ? ` · ${user.email}` : ""}
                                  </div>
                                </div>
                                <span
                                  className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                                    isSelected
                                      ? "bg-blue-600 text-white"
                                      : "bg-gray-100 text-gray-600"
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
                <Card className="shadow-sm border">
                  <CardHeader className="border-b bg-gray-50">
                    <CardTitle className="flex items-center justify-between text-lg font-medium">
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-green-600" />
                        Mobile Users (Dairies)
                      </span>
                      {selectedWebUser && (
                        <span className="text-sm font-normal text-gray-500">
                          {checkedIds.size} selected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {!selectedWebUser ? (
                      <div className="p-12 text-center text-gray-500">
                        <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium text-gray-600">Select a web user</p>
                        <p className="text-sm">
                          Choose a web user on the left to see and manage their dairies.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800">
                          Managing dairies for{" "}
                          <span className="font-semibold">{selectedWebUser.name}</span>
                          {selectedWebUser.mobile_number
                            ? ` (${selectedWebUser.mobile_number})`
                            : ""}
                        </div>
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search dairy, branch, owner or village"
                            value={dairySearch}
                            onChange={(e) => setDairySearch(e.target.value)}
                            className="pl-9 h-10"
                          />
                        </div>
                        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
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
                                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    isChecked
                                      ? "border-green-300 bg-green-50"
                                      : "border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  <Checkbox
                                    id={`dairy-${dairy.id}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) =>
                                      toggleDairy(dairy.id, checked as boolean)
                                    }
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono text-blue-600">
                                        {dairy.username}
                                      </span>
                                      {wasAssigned !== isChecked && (
                                        <span
                                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                            isChecked
                                              ? "bg-green-600 text-white"
                                              : "bg-red-500 text-white"
                                          }`}
                                        >
                                          {isChecked ? "Adding" : "Removing"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-medium text-gray-900 truncate">
                                      {dairy.name || dairy.branchname || "-"}
                                    </div>
                                    <div className="text-sm text-gray-500 truncate">
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
                        <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <div className="text-sm text-gray-600">
                            {hasChanges ? (
                              <>
                                {addedCount > 0 && (
                                  <span className="text-green-700 font-medium">
                                    {addedCount} to add
                                  </span>
                                )}
                                {addedCount > 0 && removedCount > 0 && " · "}
                                {removedCount > 0 && (
                                  <span className="text-red-600 font-medium">
                                    {removedCount} to remove
                                  </span>
                                )}
                              </>
                            ) : (
                              "No changes"
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={handleReset}
                              disabled={!hasChanges || saving}
                              className="h-10"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Reset
                            </Button>
                            <Button
                              onClick={handleSaveAssignments}
                              disabled={!hasChanges || saving}
                              className="h-10 bg-green-600 hover:bg-green-700"
                            >
                              {saving ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Saving...
                                </div>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
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
          <>
        <Card className="shadow-sm border">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <Phone className="w-5 h-5 text-gray-700" />
              Search User
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile_number" className="text-sm font-medium text-gray-700">
                  Mobile Number
                </Label>
                <Input
                  id="mobile_number"
                  placeholder="Enter user's mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Search User
                  </div>
                )}
              </Button>
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

        {/* Branch Selection */}
        {response?.success && response.branches && response.branches.length > 0 && (
          <Card className="shadow-sm border">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-lg font-medium">Assign Branches for {response.mobile_number}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedBranches.length === response.branches.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid gap-2 md:gap-3">
                {response.branches.map((branch, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <Checkbox
                      id={`branch-${branch.dairy_id}`}
                      checked={selectedBranches.includes(branch.dairy_id)}
                      onCheckedChange={(checked) =>
                        handleBranchSelection(branch.dairy_id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <div className="text-xs text-blue-600 font-mono">{branch.username}</div>
                      <div className="font-medium text-gray-900">{branch.branchname}</div>
                      <div className="text-sm text-gray-500">{branch.name}</div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedBranches.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <Button
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="w-full h-11 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Updating...
                      </div>
                    ) : (
                      `Update ${selectedBranches.length} Branch${selectedBranches.length > 1 ? 'es' : ''}`
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default AddBranch;
