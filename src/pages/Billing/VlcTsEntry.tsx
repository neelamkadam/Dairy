import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/store";
import { vlcTsApi } from "@/services/vlcTsApi";
import { toast } from "react-toastify";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isValid } from "date-fns";

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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-white p-2 md:p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col items-start text-left gap-1.5 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            VLC TS Entry
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Configure FAT and SNF rates for VLC
          </p>
        </div>
        
        {/* Main Card */}
        <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-visible transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl py-0 gap-0">
          <CardHeader className="px-4 py-3 !pb-2 border-b border-slate-100/50 bg-white/50">
            <CardTitle className="text-lg font-semibold text-slate-800">
              VLC TS Entry Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="vlc" className="text-sm font-semibold text-gray-700">
                  Select VLC <span className="text-red-500">*</span>
                </Label>
                <VLCDropdown
                  branches={branches}
                  value={formData.vlc}
                  onChange={(val) => setFormData({ ...formData, vlc: val })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fatRate" className="text-sm font-semibold text-gray-700">
                    Kg FAT Rate (₹) <span className="text-red-500">*</span>
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
                      className="pl-8 bg-white border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all h-10"
                      value={formData.fatRate}
                      onChange={(e) =>
                        setFormData({ ...formData, fatRate: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="snfRate" className="text-sm font-semibold text-gray-700">
                    Kg SNF Rate (₹) <span className="text-red-500">*</span>
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
                      className="pl-8 bg-white border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all h-10"
                      value={formData.snfRate}
                      onChange={(e) =>
                        setFormData({ ...formData, snfRate: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">Effective Date From <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={formData.effectiveDate ? format(formData.effectiveDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (isValid(d)) setFormData({ ...formData, effectiveDate: d });
                  }}
                  className="w-full h-10 border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm transition-all active:scale-[0.98] mt-2"
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
