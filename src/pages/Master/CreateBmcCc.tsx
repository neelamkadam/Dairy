import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { ccApi } from "@/services/routeBmcCcApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Eye,
  Copy,
  CheckCircle2,
  X,
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
import VlcListDialog from "./VlcListDialog";

export interface BmcCcApiAdapter {
  create: (p: {
    adminId: number;
    ccId?: number;
    name: string;
    villagename: string;
    address: string;
    ownername: string;
    password: string;
  }) => Promise<any>;
  list: (userId: number) => Promise<any>;
  update: (p: {
    id: number;
    ccId?: number;
    name: string;
    villagename: string;
    address: string;
    ownername: string;
    password?: string;
  }) => Promise<any>;
  vlcs: (id: number) => Promise<any>;
  assign: (p: { adminId: number; userId: number; id: number }) => Promise<any>;
  unassign: (p: { userId: number; id: number }) => Promise<any>;
  remove: (id: number) => Promise<any>;
}

interface CreateBmcCcProps {
  entityLabel: "BMC" | "CC";
  api: BmcCcApiAdapter;
  // A BMC is always registered under a CC — shows the mandatory CC dropdown.
  requiresCc?: boolean;
}

const CreateBmcCc = ({ entityLabel, api, requiresCc = false }: CreateBmcCcProps) => {
  const authState = useAppSelector((state) => state.authData);
  const userId = authState?.userData?.id ? Number(authState.userData.id) : null;

  const [isFormOpen, setIsFormOpen] = useState(true);
  const [name, setName] = useState("");
  const [ownername, setOwnername] = useState("");
  const [villagename, setVillagename] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [ccSel, setCcSel] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Login credentials of the entity created last (id doubles as the username).
  const [credentials, setCredentials] = useState<{ id: string; username: string } | null>(null);

  const [ccs, setCcs] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [listSearch, setListSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [assignTarget, setAssignTarget] = useState<any | null>(null);
  const [vlcTarget, setVlcTarget] = useState<any | null>(null);
  const [vlcRows, setVlcRows] = useState<any[]>([]);
  const [isLoadingVlcs, setIsLoadingVlcs] = useState(false);

  const toArray = (response: any) => {
    const raw = response?.data?.data ?? response?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  };

  const getId = (item: any): number =>
    entityLabel === "BMC"
      ? Number(item?.bmc_id ?? item?.id)
      : Number(item?.cc_id ?? item?.id);

  const loadEntities = async () => {
    if (!userId) return;
    try {
      const response = await api.list(userId);
      setEntities(toArray(response));
    } catch (error) {
      console.error(`Failed to load ${entityLabel} list:`, error);
    }
  };

  const loadCcs = async () => {
    if (!userId || !requiresCc) return;
    try {
      const response = await ccApi.list(userId);
      setCcs(toArray(response));
    } catch (error) {
      console.error("Failed to load CC list:", error);
    }
  };

  useEffect(() => {
    loadEntities();
    loadCcs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const resetForm = () => {
    setName("");
    setOwnername("");
    setVillagename("");
    setAddress("");
    setPassword("");
    setCcSel("");
    setEditingId(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard!"),
      (err) => console.error("Failed to copy: ", err)
    );
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error("User not found");
      return;
    }
    if (!name.trim()) {
      toast.error(`Please enter ${entityLabel} name`);
      return;
    }
    if (requiresCc && !ccSel) {
      toast.error("Please select a CC — a BMC is always registered under a CC");
      return;
    }
    if (!editingId && !password.trim()) {
      toast.error(`Please set a password — it is the ${entityLabel}'s login password`);
      return;
    }

    const fields = {
      name: name.trim(),
      villagename: villagename.trim(),
      address: address.trim(),
      ownername: ownername.trim(),
    };

    setIsSaving(true);
    try {
      if (editingId) {
        const response = await api.update({
          id: editingId,
          ...(requiresCc && ccSel ? { ccId: Number(ccSel) } : {}),
          ...fields,
          // Include password only to change it.
          ...(password.trim() ? { password: password.trim() } : {}),
        });
        if (response?.data?.success === false) {
          toast.error(response?.data?.message || `Failed to update ${entityLabel}`);
          return;
        }
        toast.success(response?.data?.message || `${entityLabel} updated successfully`);
        resetForm();
      } else {
        const response = await api.create({
          adminId: userId,
          ...(requiresCc ? { ccId: Number(ccSel) } : {}),
          ...fields,
          password: password.trim(),
        });
        if (response?.data?.success === false) {
          toast.error(response?.data?.message || `Failed to create ${entityLabel}`);
          return;
        }
        const d = response?.data?.data ?? response?.data ?? {};
        const newId = d?.cc_id ?? d?.bmc_id ?? d?.id;
        const username = d?.username ?? (newId != null ? String(newId) : "");
        if (newId != null || username) {
          setCredentials({ id: String(newId ?? username), username: String(username) });
        }
        toast.success(response?.data?.message || `${entityLabel} created successfully`);
        resetForm();
      }
      loadEntities();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to save ${entityLabel}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(getId(item));
    setName(item?.name || "");
    setOwnername(item?.ownername || "");
    setVillagename(item?.villagename || "");
    setAddress(item?.address || "");
    setPassword("");
    if (requiresCc) setCcSel(item?.cc_id ? String(item.cc_id) : "");
    setCredentials(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (
      !window.confirm(
        `Delete ${entityLabel} "${item?.name}"? Everything under it is kept — only the link is cleared.`
      )
    )
      return;
    try {
      const response = await api.remove(getId(item));
      if (response?.data?.success === false) {
        toast.error(response?.data?.message || `Failed to delete ${entityLabel}`);
        return;
      }
      toast.success(response?.data?.message || `${entityLabel} deleted successfully`);
      if (editingId === getId(item)) resetForm();
      loadEntities();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to delete ${entityLabel}`);
    }
  };

  const handleViewVlcs = async (item: any) => {
    setVlcTarget(item);
    setVlcRows([]);
    setIsLoadingVlcs(true);
    try {
      const response = await api.vlcs(getId(item));
      setVlcRows(toArray(response));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load VLCs");
    } finally {
      setIsLoadingVlcs(false);
    }
  };

  const handleAssign = async (subUserId: number) => {
    if (!userId || !assignTarget) return;
    try {
      const response = await api.assign({
        adminId: userId,
        userId: subUserId,
        id: getId(assignTarget),
      });
      if (response?.data?.success === false) {
        toast.error(response?.data?.message || `Failed to assign ${entityLabel}`);
        return;
      }
      toast.success(response?.data?.message || `${entityLabel} assigned successfully`);
      setAssignTarget(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to assign ${entityLabel}`);
    }
  };

  const handleUnassign = async (subUserId: number) => {
    if (!assignTarget) return;
    try {
      const response = await api.unassign({
        userId: subUserId,
        id: getId(assignTarget),
      });
      if (response?.data?.success === false) {
        toast.error(response?.data?.message || `Failed to unassign ${entityLabel}`);
        return;
      }
      toast.success(response?.data?.message || `${entityLabel} unassigned successfully`);
      setAssignTarget(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to unassign ${entityLabel}`);
    }
  };

  const filteredEntities = entities.filter((item) => {
    const query = listSearch.trim().toLowerCase();
    if (!query) return true;
    return [getId(item), item?.name, item?.ownername, item?.villagename, item?.cc_name]
      .filter((f) => f !== undefined && f !== null)
      .some((field) => String(field).toLowerCase().includes(query));
  });

  const totalPages = Math.ceil(filteredEntities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEntities = filteredEntities.slice(startIndex, endIndex);

  const handleExportToExcel = () => {
    if (filteredEntities.length === 0) {
      toast.error("No data to export");
      return;
    }
    const exportData = filteredEntities.map((item, index) => ({
      "Sr No": index + 1,
      [`${entityLabel} ID`]: getId(item) || "-",
      [`${entityLabel} Name`]: item?.name || "N/A",
      ...(requiresCc ? { "CC": item?.cc_name || "-" } : {}),
      "Owner": item?.ownername || "-",
      "Village": item?.villagename || "-",
      "Address": item?.address || "-",
      ...(!requiresCc ? { "BMCs": item?.bmc_count ?? 0 } : {}),
      "Routes": item?.route_count ?? 0,
      "VLCs": item?.vlc_count ?? 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${entityLabel} List`);
    XLSX.writeFile(wb, `${entityLabel}_List_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("Excel file exported successfully");
  };

  return (
    <div className="space-y-4 bg-gray-50 min-h-screen p-4">
      {/* Credentials of the last created entity */}
      {credentials && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-green-800 font-medium">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {entityLabel} registered successfully
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCredentials(null)}
              className="h-7 w-7 p-0 text-gray-500"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 bg-white p-3 rounded-lg border border-green-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {entityLabel} ID / Login Username
              </Label>
              <div className="text-2xl font-bold font-mono text-gray-800 mt-0.5">
                {credentials.username || credentials.id}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => handleCopy(credentials.username || credentials.id)}
              className="border-green-200 text-green-700 hover:bg-green-50 flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            The {entityLabel} logs in to the app with this ID and the password you just set —
            share both with the {entityLabel} operator.
          </p>
        </div>
      )}

      {/* Register / Edit Form */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader
          className="border-b cursor-pointer select-none"
          onClick={() => setIsFormOpen((prev) => !prev)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800">
              {editingId ? `Edit ${entityLabel} (${editingId})` : `Create ${entityLabel}`}
            </CardTitle>
            {isFormOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {isFormOpen && (
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requiresCc && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    CC (Chilling Center) <span className="text-red-500">*</span>
                  </Label>
                  <Select value={ccSel} onValueChange={setCcSel}>
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Select CC" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {ccs.length === 0 ? (
                        <div className="text-sm text-gray-500 px-3 py-2">
                          No CC found — register a CC first
                        </div>
                      ) : (
                        ccs.map((cc: any) => (
                          <SelectItem
                            key={cc.cc_id ?? cc.id}
                            value={String(cc.cc_id ?? cc.id)}
                          >
                            {cc.cc_id ?? cc.id} - {cc.name}
                            {cc.villagename ? ` (${cc.villagename})` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  {entityLabel} Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder={`Enter ${entityLabel} name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-gray-50 border-gray-200 h-10"
                />
              </div>
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
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Address</Label>
                <Input
                  placeholder="Enter full address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-gray-50 border-gray-200 h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  {editingId ? "New Password" : "Password"}{" "}
                  {!editingId && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  type="text"
                  placeholder={
                    editingId ? "Leave blank to keep current password" : "Set login password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-50 border-gray-200 h-10"
                />
                {!editingId && (
                  <p className="text-xs text-gray-500">
                    The {entityLabel} will log in with its generated ID and this password.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : editingId
                    ? `Update ${entityLabel}`
                    : `Register ${entityLabel}`}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm} className="border-gray-200">
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* List */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <CardTitle className="text-xl font-semibold text-gray-800">
              {entityLabel} List
            </CardTitle>
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
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">
                    {entityLabel} Name
                  </TableHead>
                  {requiresCc && (
                    <TableHead className="text-gray-700 font-semibold px-4 py-3">CC</TableHead>
                  )}
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">Owner</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">Village</TableHead>
                  {!requiresCc && (
                    <TableHead className="text-gray-700 font-semibold px-4 py-3">BMCs</TableHead>
                  )}
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">Routes</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">VLCs</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntities.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={requiresCc ? 9 : 9}
                      className="text-center text-gray-500 py-8"
                    >
                      No {entityLabel} registered yet
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEntities.map((item, index) => (
                    <TableRow
                      key={getId(item) || index}
                      className="hover:bg-blue-100 transition-colors"
                    >
                      <TableCell className="font-medium px-4 py-3">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-gray-700">
                        {getId(item) || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium">
                        {item?.name || "N/A"}
                      </TableCell>
                      {requiresCc && (
                        <TableCell className="px-4 py-3 text-gray-600">
                          {item?.cc_name || "-"}
                        </TableCell>
                      )}
                      <TableCell className="px-4 py-3 text-gray-600">
                        {item?.ownername || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600">
                        {item?.villagename || "-"}
                      </TableCell>
                      {!requiresCc && (
                        <TableCell className="px-4 py-3 text-gray-600">
                          {item?.bmc_count ?? 0}
                        </TableCell>
                      )}
                      <TableCell className="px-4 py-3 text-gray-600">
                        {item?.route_count ?? 0}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600">
                        {item?.vlc_count ?? 0}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewVlcs(item)}
                            className="border-gray-200"
                            title="View VLCs"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="border-gray-200"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAssignTarget(item)}
                            className="border-gray-200 text-blue-600"
                            title="Assign to sub-user"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(item)}
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

        {filteredEntities.length > 0 && (
          <div className="flex flex-wrap items-center justify-between border-t bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredEntities.length)} of {filteredEntities.length} entries
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
          entityLabel={entityLabel}
          entityName={assignTarget?.name || ""}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
        />
      )}

      {vlcTarget && (
        <VlcListDialog
          open={!!vlcTarget}
          onOpenChange={(open) => !open && setVlcTarget(null)}
          title={`VLCs under ${entityLabel}: ${vlcTarget?.name || ""}`}
          vlcs={vlcRows}
          isLoading={isLoadingVlcs}
        />
      )}
    </div>
  );
};

export default CreateBmcCc;
