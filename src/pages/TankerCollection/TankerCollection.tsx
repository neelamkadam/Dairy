import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";
import { toast } from "react-toastify";
import { registerMilkUser } from "@/services/milkUserApi";
import { useAppSelector } from "@/redux/store";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileCopyIcon from "@mui/icons-material/FileCopy";

const INITIAL_FORM = {
  name: "",
  mobile_number: "",
  emailId: "",
  password: "",
  address: "",
};

const TankerCollection = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [selectedDairyIds, setSelectedDairyIds] = useState<number[]>([]);
  const [branchOpen, setBranchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdUsername, setCreatedUsername] = useState<string | null>(null);

  const allSelected =
    branches.length > 0 && selectedDairyIds.length === branches.length;

  const handleChange = (field: keyof typeof INITIAL_FORM, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDairy = (branchId: number) => {
    setSelectedDairyIds((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedDairyIds(allSelected ? [] : branches.map((b) => b.branch_id));
  };

  const handleMobileChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({ ...prev, mobile_number: digitsOnly }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard!"),
      (err) => console.error("Failed to copy: ", err)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.mobile_number.trim() ||
      !formData.emailId.trim() ||
      !formData.password.trim() ||
      !formData.address.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.mobile_number.length !== 10) {
      toast.error("Mobile number must be exactly 10 digits");
      return;
    }

    if (selectedDairyIds.length === 0) {
      toast.error("Please select at least one branch");
      return;
    }

    setLoading(true);
    try {
      const data = await registerMilkUser({
        name: formData.name.trim(),
        mobile_number: formData.mobile_number.trim(),
        emailId: formData.emailId.trim(),
        password: formData.password,
        address: formData.address.trim(),
        dairy_ids: selectedDairyIds,
      });

      if (data.success) {
        toast.success(data.message);
        setCreatedUsername(data.username);
        setFormData(INITIAL_FORM);
        setSelectedDairyIds([]);
      } else {
        toast.error(data.message || "Failed to register user");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to register user"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-2xl font-bold text-gray-800">
              Tanker Collection
            </CardTitle>
            <p className="text-gray-600 text-sm mt-1">
              Register a new milk user for tanker collection
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter full name"
                  className="bg-gray-50 border-gray-200"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile_number" className="text-sm font-medium text-gray-700">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mobile_number"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  className="bg-gray-50 border-gray-200"
                  value={formData.mobile_number}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailId" className="text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emailId"
                  type="email"
                  placeholder="Enter email address"
                  className="bg-gray-50 border-gray-200"
                  value={formData.emailId}
                  onChange={(e) => handleChange("emailId", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  className="bg-gray-50 border-gray-200"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Enter address"
                  className="bg-gray-50 border-gray-200"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Branches <span className="text-red-500">*</span>
                </Label>
                <Popover open={branchOpen} onOpenChange={setBranchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between bg-gray-50 border-gray-200 font-normal"
                    >
                      <span className="truncate">
                        {selectedDairyIds.length === 0
                          ? "Select branches"
                          : `${selectedDairyIds.length} branch${
                              selectedDairyIds.length > 1 ? "es" : ""
                            } selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] p-0 bg-white"
                  >
                    {branches.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        No branches available
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer hover:bg-gray-50">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleSelectAll}
                          />
                          <span className="text-sm font-medium text-gray-800">
                            Select All
                          </span>
                        </label>
                        {branches.map((branch) => (
                          <label
                            key={branch.branch_id}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                          >
                            <Checkbox
                              checked={selectedDairyIds.includes(
                                branch.branch_id
                              )}
                              onCheckedChange={() =>
                                toggleDairy(branch.branch_id)
                              }
                            />
                            <span className="text-sm text-gray-700">
                              {branch.username} - {branch.name}
                              {branch.branchName ? ` - ${branch.branchName}` : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
              >
                {loading ? "Registering..." : "Register User"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!createdUsername}
        onOpenChange={(open) => {
          if (!open) setCreatedUsername(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircleIcon className="text-green-600" />
              Milk user registered successfully
            </DialogTitle>
            <DialogDescription>
              Share the generated username with the user.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Label className="text-xs text-gray-600">Username</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-2xl font-bold text-green-700 bg-green-100 px-3 py-1 rounded">
                {createdUsername}
              </code>
              <FileCopyIcon
                className="text-gray-500 cursor-pointer hover:text-blue-600 transition-colors"
                fontSize="small"
                onClick={() => createdUsername && handleCopy(createdUsername)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setCreatedUsername(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TankerCollection;
