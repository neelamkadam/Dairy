import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Building2, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/services/config";
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

const AddBranch = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<BranchResponse | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setSelectedBranches([]);

    try {
      const { data } = await api.post<BranchResponse>("/web/branches/by-mobile", {
        mobile_number: mobileNumber
      });
      console.log('AddBranch API Response:', data);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Branch Assignment</h1>
              <p className="text-gray-600">View user's assigned branches</p>
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
};

export default AddBranch;