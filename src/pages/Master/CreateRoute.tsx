import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { bmcApi, ccApi, routeApi } from "@/services/routeBmcCcApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Search,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AssignToSubUserDialog from "./AssignToSubUserDialog";

const NONE = "none";

const CreateRoute = () => {
  const authState = useAppSelector((state) => state.authData);
  const userId = authState?.userData?.id ? Number(authState.userData.id) : null;
  const { branches } = useAppSelector((state) => state.branch);

  const [isFormOpen, setIsFormOpen] = useState(true);
  const [name, setName] = useState("");
  const [ownername, setOwnername] = useState("");
  const [villagename, setVillagename] = useState("");
  const [address, setAddress] = useState("");
  // A route can sit under a BMC, a CC, or BOTH — two independent pickers.
  const [bmcSel, setBmcSel] = useState<string>(NONE);
  const [ccSel, setCcSel] = useState<string>(NONE);
  const [selectedVlcs, setSelectedVlcs] = useState<number[]>([]);
  const [vlcSearch, setVlcSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [bmcs, setBmcs] = useState<any[]>([]);
  const [ccs, setCcs] = useState<any[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [listSearch, setListSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [assignTarget, setAssignTarget] = useState<any | null>(null);

  const toArray = (response: any) => {
    const raw = response?.data?.data ?? response?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  };

  const getRouteId = (route: any): number => Number(route?.route_id ?? route?.id);

  const loadRoutes = async () => {
    if (!userId) return;
    try {
      const response = await routeApi.list(userId);
      setRoutes(toArray(response));
    } catch (error) {
      console.error("Failed to load routes:", error);
    }
  };

  const loadParents = async () => {
    if (!userId) return;
    setIsLoadingParents(true);
    try {
      const [bmcRes, ccRes] = await Promise.all([bmcApi.list(userId), ccApi.list(userId)]);
      setBmcs(toArray(bmcRes));
      setCcs(toArray(ccRes));
    } catch (error) {
      console.error("Failed to load BMC/CC lists:", error);
    } finally {
      setIsLoadingParents(false);
    }
  };

  useEffect(() => {
    loadRoutes();
    loadParents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const resetForm = () => {
    setName("");
    setOwnername("");
    setVillagename("");
    setAddress("");
    setBmcSel(NONE);
    setCcSel(NONE);
    setSelectedVlcs([]);
    setVlcSearch("");
    setEditingId(null);
  };

  const toggleVlc = (branchId: number) => {
    setSelectedVlcs((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  const filteredVlcs = (branches || []).filter((branch: any) => {
    const query = vlcSearch.trim().toLowerCase();
    if (!query) return true;
    return [branch.username, branch.name, branch.branchName]
      .filter(Boolean)
      .some((field: string) => String(field).toLowerCase().includes(query));
  });

  const toggleSelectAll = () => {
    if (selectedVlcs.length === filteredVlcs.length) {
      setSelectedVlcs([]);
    } else {
      setSelectedVlcs(filteredVlcs.map((b: any) => b.branch_id));
    }
  };

  // Build a mapping from dairy_id -> branch_id so that VLC IDs coming from
  // the routes API (which may use dairy_id) can be matched to the branch
  // picker (which uses branch_id). When they are the same value, the map
  // simply maps id -> id.
  const dairyToBranchId: Record<number, number> = {};
  const branchToDairyId: Record<number, number> = {};
  (branches || []).forEach((b: any) => {
    const bid = Number(b.branch_id);
    // The branch itself may carry a dairy_id that differs from branch_id.
    const did = b.dairy_id != null ? Number(b.dairy_id) : bid;
    dairyToBranchId[did] = bid;
    dairyToBranchId[bid] = bid; // identity for safety
    branchToDairyId[bid] = did;
  });

  // The API expects dairy ids in vlcIds — translate the picker's branch ids.
  const toDairyIds = (branchIds: number[]) =>
    branchIds.map((id) => branchToDairyId[id] ?? id);

  const handleSave = async () => {
    if (!userId) {
      toast.error("User not found");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter Route name");
      return;
    }

    const bmcId = bmcSel !== NONE ? Number(bmcSel) : null;
    const ccId = ccSel !== NONE ? Number(ccSel) : null;
    const fields = {
      name: name.trim(),
      villagename: villagename.trim(),
      address: address.trim(),
      ownername: ownername.trim(),
    };

    setIsSaving(true);
    try {
      if (editingId) {
        // Full replace — omitted/null parent is cleared, so send the complete
        // desired state. The backend re-stamps all dairies on the route.
        const updateRes = await routeApi.update({
          routeId: editingId,
          ...fields,
          bmcId,
          ccId,
        });
        if (updateRes?.data?.success === false) {
          toast.error(updateRes?.data?.message || "Failed to update Route");
          return;
        }
        const vlcRes = await routeApi.setVlcs({
          routeId: editingId,
          vlcIds: toDairyIds(selectedVlcs),
        });
        if (vlcRes?.data?.success === false) {
          toast.error(vlcRes?.data?.message || "Failed to update Route VLCs");
          return;
        }
        toast.success("Route updated successfully");
      } else {
        const response = await routeApi.create({
          adminId: userId,
          ...fields,
          ...(bmcId ? { bmcId } : {}),
          ...(ccId ? { ccId } : {}),
          vlcIds: toDairyIds(selectedVlcs),
        });
        if (response?.data?.success === false) {
          toast.error(response?.data?.message || "Failed to create Route");
          return;
        }
        toast.success(response?.data?.message || "Route created successfully");
      }
      resetForm();
      loadRoutes();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save Route");
    } finally {
      setIsSaving(false);
    }
  };

  // Normalize the vlcs array of a route (objects or plain ids) and return
  // the *branch_id* values used by the VLC picker checkboxes.
  const getRouteVlcIds = (route: any): number[] => {
    if (!Array.isArray(route?.vlcs)) return [];
    return route.vlcs
      .map((v: any) => {
        const raw = Number(v?.dairy_id ?? v?.vlc_id ?? v?.branch_id ?? v?.id ?? v);
        return dairyToBranchId[raw] ?? raw;
      })
      .filter((id: number) => !isNaN(id));
  };

  const getRouteVlcNames = (route: any): string => {
    if (!Array.isArray(route?.vlcs)) return "";
    return route.vlcs
      .map((v: any) => {
        if (v?.name) return v.name;
        const id = Number(v?.dairy_id ?? v?.vlc_id ?? v?.branch_id ?? v?.id ?? v);
        const branch = (branches || []).find((b: any) => b.branch_id === id);
        return branch ? branch.name : String(id);
      })
      .join(", ");
  };

  const getParentLabel = (route: any): string => {
    const parts = [];
    if (route?.bmc_name) parts.push(`BMC: ${route.bmc_name}`);
    if (route?.cc_name) parts.push(`CC: ${route.cc_name}`);
    return parts.length > 0 ? parts.join(" / ") : "Standalone";
  };

  const handleEdit = (route: any) => {
    setEditingId(getRouteId(route));
    setName(route?.name || "");
    setOwnername(route?.ownername || "");
    setVillagename(route?.villagename || "");
    setAddress(route?.address || "");
    setBmcSel(route?.bmc_id ? String(route.bmc_id) : NONE);
    setCcSel(route?.cc_id ? String(route.cc_id) : NONE);
    setSelectedVlcs(getRouteVlcIds(route));
    setVlcSearch("");
    setIsFormOpen(true);
  };

  const handleDelete = async (route: any) => {
    if (
      !window.confirm(
        `Delete Route "${route?.name}"? Its dairies are kept — only the route link is cleared.`
      )
    )
      return;
    try {
      const response = await routeApi.remove(getRouteId(route));
      if (response?.data?.success === false) {
        toast.error(response?.data?.message || "Failed to delete Route");
        return;
      }
      toast.success(response?.data?.message || "Route deleted successfully");
      if (editingId === getRouteId(route)) resetForm();
      loadRoutes();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete Route");
    }
  };

  const handleAssign = async (subUserId: number) => {
    if (!userId || !assignTarget) return;
    try {
      const response = await routeApi.assign({
        adminId: userId,
        userId: subUserId,
        routeId: getRouteId(assignTarget),
      });
      if (response?.data?.success === false) {
        toast.error(response?.data?.message || "Failed to assign Route");
        return;
      }
      toast.success(response?.data?.message || "Route assigned successfully");
      setAssignTarget(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to assign Route");
    }
  };

  const handleUnassign = async (subUserId: number) => {
    if (!assignTarget) return;
    try {
      const response = await routeApi.unassign({
        userId: subUserId,
        routeId: getRouteId(assignTarget),
      });
      if (response?.data?.success === false) {
        toast.error(response?.data?.message || "Failed to unassign Route");
        return;
      }
      toast.success(response?.data?.message || "Route unassigned successfully");
      setAssignTarget(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to unassign Route");
    }
  };

  const filteredRoutes = routes.filter((route) => {
    const query = listSearch.trim().toLowerCase();
    if (!query) return true;
    return [getRouteId(route), route?.name, route?.bmc_name, route?.cc_name, route?.villagename, route?.ownername]
      .filter((f) => f !== undefined && f !== null)
      .some((field) => String(field).toLowerCase().includes(query));
  });

  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRoutes = filteredRoutes.slice(startIndex, endIndex);

  const handleExportToExcel = () => {
    if (filteredRoutes.length === 0) {
      toast.error("No data to export");
      return;
    }
    const exportData = filteredRoutes.map((route, index) => ({
      "Sr No": index + 1,
      "Route ID": getRouteId(route) || "-",
      "Route Name": route?.name || "N/A",
      "Under": getParentLabel(route),
      "Owner": route?.ownername || "-",
      "Village": route?.villagename || "-",
      "VLC Count": getRouteVlcIds(route).length,
      "VLCs": getRouteVlcNames(route),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Route List");
    XLSX.writeFile(wb, `Route_List_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("Excel file exported successfully");
  };

  return (
    <div className="space-y-4 bg-gray-50 min-h-screen p-4">
      {/* Register / Edit Form */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader
          className="border-b cursor-pointer select-none"
          onClick={() => setIsFormOpen((prev) => !prev)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800">
              {editingId ? `Edit Route (${editingId})` : "Create Route"}
            </CardTitle>
            {isFormOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {isFormOpen && (
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Route Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Enter Route name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-gray-50 border-gray-200 h-10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Owner Name</Label>
                    <Input
                      placeholder="Enter owner name"
                      value={ownername}
                      onChange={(e) => setOwnername(e.target.value)}
                      className="bg-gray-50 border-gray-200 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Village Name</Label>
                    <Input
                      placeholder="Enter village"
                      value={villagename}
                      onChange={(e) => setVillagename(e.target.value)}
                      className="bg-gray-50 border-gray-200 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Address</Label>
                  <Input
                    placeholder="Enter full address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-gray-50 border-gray-200 h-10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Under BMC</Label>
                    <Select value={bmcSel} onValueChange={setBmcSel}>
                      <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                        <SelectValue placeholder={isLoadingParents ? "Loading..." : "None"} />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value={NONE}>None</SelectItem>
                        {bmcs.map((bmc: any) => (
                          <SelectItem
                            key={bmc.bmc_id ?? bmc.id}
                            value={String(bmc.bmc_id ?? bmc.id)}
                          >
                            {bmc.bmc_id ?? bmc.id} - {bmc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Under CC</Label>
                    <Select value={ccSel} onValueChange={setCcSel}>
                      <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                        <SelectValue placeholder={isLoadingParents ? "Loading..." : "None"} />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value={NONE}>None</SelectItem>
                        {ccs.map((cc: any) => (
                          <SelectItem
                            key={cc.cc_id ?? cc.id}
                            value={String(cc.cc_id ?? cc.id)}
                          >
                            {cc.cc_id ?? cc.id} - {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Pick a BMC, a CC, or both. Under only a BMC, the CC is derived from that BMC
                  automatically — the route's dairies inherit the full chain.
                </p>

                <div className="text-sm text-gray-600">
                  {selectedVlcs.length === 0
                    ? "No VLC selected"
                    : `${selectedVlcs.length} VLC(s) selected`}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : editingId ? "Update Route" : "Create Route"}
                  </Button>
                  {editingId && (
                    <Button variant="outline" onClick={resetForm} className="border-gray-200">
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* VLC list */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Select VLCs</Label>
                <div className="border border-gray-200 rounded-lg bg-gray-50">
                  <div className="p-2 border-b flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search VLC"
                        value={vlcSearch}
                        onChange={(e) => setVlcSearch(e.target.value)}
                        className="pl-10 h-9 bg-white border-gray-200"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="text-xs whitespace-nowrap"
                    >
                      {filteredVlcs.length > 0 && selectedVlcs.length === filteredVlcs.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                    {selectedVlcs.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedVlcs([])}
                        className="text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {filteredVlcs.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-6">
                        No VLC found
                      </div>
                    ) : (
                      filteredVlcs.map((branch: any) => (
                        <div
                          key={branch.branch_id}
                          className="flex items-center space-x-2 p-2 hover:bg-white rounded cursor-pointer"
                          onClick={() => toggleVlc(branch.branch_id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedVlcs.includes(branch.branch_id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleVlc(branch.branch_id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">
                            {branch.username} - {branch.name} - {branch.branchName}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Selected dairies are stamped with this route's BMC + CC automatically.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Route List */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <CardTitle className="text-xl font-semibold text-gray-800">Route List</CardTitle>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search"
                  value={listSearch}
                  onChange={(e) => {
                    setListSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 w-full sm:w-64 bg-gray-50 border-gray-200"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleExportToExcel}
                className="border-gray-200 flex bg-green-600 text-white items-center gap-2 hover:bg-green-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">Sr No</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">ID</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">Route Name</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">Under</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">Village</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">VLC Count</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">VLCs</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRoutes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No Route created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRoutes.map((route, index) => (
                    <TableRow
                      key={getRouteId(route) || index}
                      className="hover:bg-blue-100 transition-colors"
                    >
                      <TableCell className="font-medium px-4 py-3">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-gray-700">
                        {getRouteId(route) || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium">
                        {route?.name || "N/A"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {route?.bmc_name && (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                              BMC: {route.bmc_name}
                            </Badge>
                          )}
                          {route?.cc_name && (
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                              CC: {route.cc_name}
                            </Badge>
                          )}
                          {!route?.bmc_name && !route?.cc_name && (
                            <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                              Standalone
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600">
                        {route?.villagename || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600">
                        {getRouteVlcIds(route).length}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 max-w-md truncate">
                        {getRouteVlcNames(route) || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(route)}
                            className="border-gray-200"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAssignTarget(route)}
                            className="border-gray-200 text-blue-600"
                            title="Assign to sub-user"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(route)}
                            className="border-gray-200 text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {filteredRoutes.length > 0 && (
          <div className="flex flex-wrap items-center justify-between border-t bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredRoutes.length)} of {filteredRoutes.length} entries
            </div>
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="border-gray-200"
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "border-gray-200",
                    currentPage === page && "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="border-gray-200"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {assignTarget && (
        <AssignToSubUserDialog
          open={!!assignTarget}
          onOpenChange={(open) => !open && setAssignTarget(null)}
          entityLabel="Route"
          entityName={assignTarget?.name || ""}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
        />
      )}
    </div>
  );
};

export default CreateRoute;
