import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export interface BmcCcApiAdapter {
  create: (p: { adminId: number; name: string; location?: string }) => Promise<any>;
  list: (userId: number) => Promise<any>;
  update: (p: { id: number; name: string; location?: string }) => Promise<any>;
  assign: (p: { adminId: number; userId: number; id: number }) => Promise<any>;
  unassign: (p: { userId: number; id: number }) => Promise<any>;
  remove: (id: number) => Promise<any>;
}

interface CreateBmcCcProps {
  entityLabel: string; // "BMC" | "CC"
  api: BmcCcApiAdapter;
}

const CreateBmcCc = ({ entityLabel, api }: CreateBmcCcProps) => {
  const authState = useAppSelector((state) => state.authData);
  const userId = authState?.userData?.id ? Number(authState.userData.id) : null;

  const [isFormOpen, setIsFormOpen] = useState(true);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [entities, setEntities] = useState<any[]>([]);
  const [listSearch, setListSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [assignTarget, setAssignTarget] = useState<any | null>(null);

  const getId = (item: any): number =>
    Number(item?.id ?? item?.bmc_id ?? item?.cc_id);

  const loadEntities = async () => {
    if (!userId) return;
    try {
      const response = await api.list(userId);
      const raw = response?.data?.data ?? response?.data ?? [];
      setEntities(Array.isArray(raw) ? raw : []);
    } catch (error) {
      console.error(`Failed to load ${entityLabel} list:`, error);
    }
  };

  useEffect(() => {
    loadEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const resetForm = () => {
    setName("");
    setLocation("");
    setEditingId(null);
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

    setIsSaving(true);
    try {
      const loc = location.trim() || undefined;
      const response = editingId
        ? await api.update({ id: editingId, name: name.trim(), location: loc })
        : await api.create({ adminId: userId, name: name.trim(), location: loc });

      if (response?.data?.success === false) {
        toast.error(response?.data?.message || `Failed to save ${entityLabel}`);
        return;
      }
      toast.success(
        response?.data?.message ||
          (editingId ? `${entityLabel} updated successfully` : `${entityLabel} created successfully`)
      );
      resetForm();
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
    setLocation(item?.location || "");
    setIsFormOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Delete ${entityLabel} "${item?.name}"?`)) return;
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
    return [item?.name, item?.location]
      .filter(Boolean)
      .some((field: string) => String(field).toLowerCase().includes(query));
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
      [`${entityLabel} Name`]: item?.name || "N/A",
      "Location": item?.location || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${entityLabel} List`);
    XLSX.writeFile(wb, `${entityLabel}_List_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("Excel file exported successfully");
  };

  return (
    <div className="space-y-4 bg-gray-50 min-h-screen p-4">
      {/* Create / Edit Form */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader
          className="border-b cursor-pointer select-none"
          onClick={() => setIsFormOpen((prev) => !prev)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800">
              {editingId ? `Edit ${entityLabel}` : `Create ${entityLabel}`}
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
                <Label className="text-sm font-medium text-gray-700">Location</Label>
                <Input
                  placeholder="Enter location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-gray-50 border-gray-200 h-10"
                />
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
                    : `Create ${entityLabel}`}
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
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">
                    {entityLabel} Name
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3">Location</TableHead>
                  <TableHead className="text-gray-700 font-semibold px-4 py-3 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No {entityLabel} created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEntities.map((item, index) => (
                    <TableRow key={getId(item) || index} className="hover:bg-blue-100 transition-colors">
                      <TableCell className="font-medium px-4 py-3">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium">{item?.name || "N/A"}</TableCell>
                      <TableCell className="px-4 py-3 text-gray-600">{item?.location || "-"}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
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
    </div>
  );
};

export default CreateBmcCc;
