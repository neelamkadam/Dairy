import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/store";
import { vlcTsApi } from "@/services/vlcTsApi";
import { toast } from "react-toastify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const VlcTsEntry: React.FC = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vlc: "",
    fatRate: "",
    snfRate: "",
    effectiveDate: undefined as Date | undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vlc || !formData.fatRate || !formData.snfRate || !formData.effectiveDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        vlc: formData.vlc,
        kg_fat_rate: parseFloat(formData.fatRate),
        kg_snf_rate: parseFloat(formData.snfRate),
        effective_from: format(formData.effectiveDate, "yyyy-MM-dd")
      };
      const response = await vlcTsApi.create(payload);
      if (response.data.success) {
        toast.success(response.data.message);
        setFormData({ vlc: "", fatRate: "", snfRate: "", effectiveDate: undefined });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit TS entry");
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
            VLC TS Entry
          </CardTitle>
          <p className="text-gray-600 text-sm mt-1">
            Configure FAT and SNF rates for VLC
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="vlc" className="text-sm font-medium text-gray-700">
                Select VLC <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.vlc}
                onValueChange={(value) =>
                  setFormData({ ...formData, vlc: value })
                }
              >
                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Choose VLC" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fatRate" className="text-sm font-medium text-gray-700">
                  Kg FAT Rate (₹)<span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    ₹
                  </span>
                  <Input
                    id="fatRate"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-8 bg-gray-50 border-gray-200"
                    value={formData.fatRate}
                    onChange={(e) =>
                      setFormData({ ...formData, fatRate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="snfRate" className="text-sm font-medium text-gray-700">
                  Kg SNF Rate (₹)<span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    ₹
                  </span>
                  <Input
                    id="snfRate"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-8 bg-gray-50 border-gray-200"
                    value={formData.snfRate}
                    onChange={(e) =>
                      setFormData({ ...formData, snfRate: e.target.value })
                    }
                    required
                  />
                </div>
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
              {loading ? "Submitting..." : "Submit TS Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default VlcTsEntry;
