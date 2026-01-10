import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSidebarAccess, createOrUpdateSidebarAccess } from "@/services/sidebarAccessApi";
import { adminApi } from "@/services/adminApi";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";

interface SidebarAccess {
  dashboard: number;
  collection_entry: number;
  collection: number;
  master: number;
  billing: number;
  reports: number;
  settings: number;
  shubham_milk_product: number;
}

const SidebarAccessManagement = () => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [access, setAccess] = useState<SidebarAccess>({
    dashboard: 0,
    collection_entry: 0,
    collection: 0,
    master: 0,
    billing: 0,
    reports: 0,
    settings: 0,
    shubham_milk_product: 0,
  });
  const [loading, setLoading] = useState(false);

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
      console.log('Web Users API Response:', data);
      if (data.success) {
        const userData = data.data.webUsers || [];
        console.log('Web Users Data:', userData);
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to fetch users");
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

  const handleSave = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
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
      toast.error(error.response?.data?.message || "Failed to save sidebar access");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const accessItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "collection_entry", label: "Collection Entry" },
    { key: "collection", label: "Collection" },
    { key: "master", label: "Master" },
    { key: "billing", label: "Billing" },
    { key: "reports", label: "Reports" },
    { key: "settings", label: "Settings" },
    { key: "shubham_milk_product", label: "Shubham Milk Product" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Sidebar Access Management</h2>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Select User</Label>
            <Select
              value={selectedUserId?.toString()}
              onValueChange={(value) => setSelectedUserId(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <div className="p-2">
                  <Input
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                </div>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.email} (ID: {user.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUserId && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accessItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Label htmlFor={item.key} className="cursor-pointer font-medium text-gray-700">
                      {item.label}
                    </Label>
                    <Switch
                      id={item.key}
                      checked={access[item.key as keyof SidebarAccess] === 1}
                      onCheckedChange={() => handleToggle(item.key as keyof SidebarAccess)}
                    />
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleSave} 
                disabled={loading} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Saving..." : "Save Access"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidebarAccessManagement;
