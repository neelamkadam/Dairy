import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/store";
import { vlcCommissionApi } from "@/services/vlcCommissionApi";
import { toast } from "react-toastify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import { reportsApi } from "@/services/reportsApi";

const VlcCCommissionEntry: React.FC = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [formData, setFormData] = useState({
    vlcc: "",
    commissionType: "per-liter",
    commissionAmount: "",
    effectiveDate: new Date() as Date | undefined,
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [commissionData, setCommissionData] = useState<any>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(inputValue).then(
      () => {
        alert("Copied to clipboard!");
      },
      (err) => {
        console.error("Failed to copy: ", err);
      }
    );
  };

  const fetchCommissionData = async () => {
    if (!formData.vlcc) return;
    const dateToUse = formData.effectiveDate || new Date();
    try {
      const data = await reportsApi.getVlcCommissionReport({
        vlc_id: formData.vlcc,
        start_date: format(dateToUse, 'yyyy-MM-dd'),
        end_date: format(dateToUse, 'yyyy-MM-dd')
      });
      if (data.success && data.data?.length > 0) {
        setCommissionData(data.data[0]);
        
        // Auto-fill latest commission data
        if (data.data[0].commissions?.length > 0) {
          const latestCommission = data.data[0].commissions[0];
          setFormData(prev => ({
            ...prev,
            commissionType: latestCommission.type === 'Commission' ? 'per-liter' : 'fixed',
            commissionAmount: latestCommission.amount
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch commission data:', error);
    }
  };

  useEffect(() => {
    if (formData.vlcc) {
      fetchCommissionData();
    }
  }, [formData.vlcc]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vlcc || !formData.commissionAmount || !formData.effectiveDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        vlcc: formData.vlcc,
        type: formData.commissionType === "per-liter" ? "Commission" : "Fixed",
        amount: parseFloat(formData.commissionAmount),
        effective_from: format(formData.effectiveDate, "yyyy-MM-dd")
      };
      const response = await vlcCommissionApi.create(payload);
      if (response.data.success) {
        toast.success(response.data.message);
        setInputValue(`VLC-${response.data.id}-${Date.now()}`);
        setIsSubmitted(true);
        fetchCommissionData();
        setTimeout(() => setIsSubmitted(false), 3000);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit commission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
      <Card className="shadow-lg border-0">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-2xl font-bold text-gray-800">
            VLC Commission Entry
          </CardTitle>
          <p className="text-gray-600 text-sm mt-1">
            Configure commission rates for VLC operations
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="vlcc" className="text-sm font-medium text-gray-700">Select VLC <span className="text-red-500">*</span></Label>
              <Select
                value={formData.vlcc}
                onValueChange={(value) =>
                  setFormData({ ...formData, vlcc: value })
                }
              >
                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Choose a VLC" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {branches.map((branch) => (
                    <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                      {branch.username} - {branch.name} - {branch.branchName || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Commission Type <span className="text-red-500">*</span></Label>
              <RadioGroup
                value={formData.commissionType}
                onValueChange={(value) =>
                  setFormData({ ...formData, commissionType: value })
                }
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="per-liter"
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all",
                    formData.commissionType === "per-liter" 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  )}
                >
                  <RadioGroupItem value="per-liter" id="per-liter" />
                  <span className="font-medium">Per Liter Commission</span>
                </Label>
                <Label
                  htmlFor="fixed"
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all",
                    formData.commissionType === "fixed" 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  )}
                >
                  <RadioGroupItem value="fixed" id="fixed" />
                  <span className="font-medium">Fixed Payment</span>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissionAmount" className="text-sm font-medium text-gray-700">Commission Amount <span className="text-red-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  ₹
                </span>
                <Input
                  id="commissionAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8 bg-gray-50 border-gray-200"
                  value={formData.commissionAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      commissionAmount: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Effective Date From <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start font-normal bg-gray-50 border-gray-200",
                      !formData.effectiveDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.effectiveDate
                      ? format(formData.effectiveDate, "dd-MM-yyyy")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.effectiveDate}
                    onSelect={(date) =>
                      setFormData({ ...formData, effectiveDate: date })
                    }
                    initialFocus
                    className="p-3 pointer-events-auto bg-white"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
            >
              {loading ? "Submitting..." : "Submit Commission Entry"}
            </Button>
          </form>

          {isSubmitted && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 font-medium mb-3">
                <CheckCircleIcon className="text-green-600" />
                Commission entry submitted successfully
              </div>
              <div className="relative">
                <Label className="text-sm text-gray-600 mb-2 block">Transaction ID</Label>
                <Input
                  type="text"
                  value={inputValue}
                  readOnly
                  className="pr-10 bg-white border-gray-300 font-mono text-sm"
                />
                <span
                  onClick={handleCopy}
                  className="absolute right-3 top-9 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <FileCopyIcon className="text-gray-500" fontSize="small" />
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <div>
        {commissionData && commissionData.commissions?.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Commission History</h3>
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              {commissionData.commissions.map((comm: any, idx: number) => {
                const isActive = idx === 0;
                const effectiveFrom = new Date(comm.effective_from);
                
                // Calculate end date (day before the newer commission's effective date)
                let endDate = null;
                if (!isActive) {
                  const newerCommEffectiveDate = new Date(commissionData.commissions[idx - 1].effective_from);
                  endDate = subDays(newerCommEffectiveDate, 1);
                }
                
                return (
                  <Card key={idx} className={cn(
                    "border shadow-sm",
                    isActive ? "border-green-300 bg-green-50" : "border-purple-200"
                  )}>
                    <CardContent className="p-2">
                      <div className="space-y-1.5">
                        {isActive && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded">
                              Active
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600">Type</span>
                          <span className="text-xs font-semibold text-gray-900">
                            {comm.type === 'Commission' ? 'Per Liter Commision' : 'Fixed Payment'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600">Amount</span>
                          <span className="text-xs font-bold text-purple-600">₹{parseFloat(comm.amount).toFixed(2)}</span>
                        </div>
                        <div className="pt-1.5 border-t border-gray-200">
                          <span className="text-xs text-gray-500">
                            {isActive ? 'Effective From' : 'Effective Period'}
                          </span>
                          <p className="text-xs font-medium text-gray-700">
                            {isActive 
                              ? format(effectiveFrom, 'dd-MM-yyyy')
                              : endDate 
                                ? `${format(effectiveFrom, 'dd-MM-yyyy')} to ${format(endDate, 'dd-MM-yyyy')}`
                                : format(effectiveFrom, 'dd-MM-yyyy')
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">Select VLC to view commission history</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default VlcCCommissionEntry;
