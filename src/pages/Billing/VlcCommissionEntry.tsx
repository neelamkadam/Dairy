import React, { useState } from "react";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileCopyIcon from "@mui/icons-material/FileCopy";

const VlcCCommissionEntry: React.FC = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [formData, setFormData] = useState({
    vlcc: "",
    commissionType: "per-liter",
    commissionAmount: "",
    effectiveDate: undefined as Date | undefined,
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

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
      <div className="max-w-3xl mx-auto">
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
    </div>
  );
};

export default VlcCCommissionEntry;
