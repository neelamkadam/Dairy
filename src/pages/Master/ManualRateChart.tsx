import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AppDatePicker } from "@/components/ui/date-picker";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { api } from "@/services/config";

interface Range {
  id: string;
  min: number;
  max: number;
  multiplier: number;
}

const ManualRateChart = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [vlcc, setVlcc] = useState("");
  const [animalType, setAnimalType] = useState<"cow" | "buffalo">("cow");
  const [rateChartName, setRateChartName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(undefined);
  const [isShiftWise, setIsShiftWise] = useState(false);
  const [selectedShift, setSelectedShift] = useState<"Morning" | "Evening">("Morning");
  const [baseRate, setBaseRate] = useState<number>(28.6);
  const [fatRanges, setFatRanges] = useState<Range[]>([
    { id: "1", min: 2.5, max: 3.5, multiplier: 0.5 },
  ]);
  const [snfRanges, setSnfRanges] = useState<Range[]>([
    { id: "1", min: 7.7, max: 9.0, multiplier: 0.3 },
  ]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const addFatRange = () => {
    setFatRanges([...fatRanges, { id: Date.now().toString(), min: 0, max: 0, multiplier: 0 }]);
  };

  const addSnfRange = () => {
    setSnfRanges([...snfRanges, { id: Date.now().toString(), min: 0, max: 0, multiplier: 0 }]);
  };

  const removeFatRange = (id: string) => {
    setFatRanges(fatRanges.filter((r) => r.id !== id));
  };

  const removeSnfRange = (id: string) => {
    setSnfRanges(snfRanges.filter((r) => r.id !== id));
  };

  const updateFatRange = (id: string, field: keyof Range, value: number) => {
    setFatRanges(fatRanges.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const updateSnfRange = (id: string, field: keyof Range, value: number) => {
    setSnfRanges(snfRanges.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const calculateRate = (fat: number, snf: number): number => {
    let rate = baseRate;

    // Calculate FAT increment
    for (const range of fatRanges) {
      if (fat >= range.min && fat <= range.max) {
        const steps = Math.round((fat - range.min) * 10);
        rate += steps * range.multiplier;
        break;
      }
    }

    // Calculate SNF increment
    for (const range of snfRanges) {
      if (snf >= range.min && snf <= range.max) {
        const steps = Math.round((snf - range.min) * 10);
        rate += steps * range.multiplier;
        break;
      }
    }

    return parseFloat(rate.toFixed(2));
  };

  const generateRateMatrix = () => {
    const rates = [];
    for (let fat = 2.5; fat <= 6.0; fat += 0.1) {
      for (let snf = 7.0; snf <= 10.0; snf += 0.1) {
        rates.push({
          fat: parseFloat(fat.toFixed(1)),
          snf: parseFloat(snf.toFixed(1)),
          price: calculateRate(parseFloat(fat.toFixed(1)), parseFloat(snf.toFixed(1))),
        });
      }
    }
    return rates;
  };

  const handleSubmit = async () => {
    if (!vlcc || !rateChartName || !effectiveDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const rates = generateRateMatrix();
      const displayName = `${animalType === "cow" ? "🐄 Cow" : "🐃 Buffalo"} ${rateChartName} ${isShiftWise ? selectedShift : "All Day"}`;

      const payload: any = {
        created_by: "Admin",
        organisation_id: vlcc,
        name: rateChartName,
        displayName,
        type: animalType,
        effective_date: format(effectiveDate, "yyyy-MM-dd"),
        rates,
      };

      if (isShiftWise) {
        payload.shift = selectedShift;
      }

      await api.post("/conf/createrate-manual", payload);

      toast.success("Rate chart created successfully!");
      // Reset form
      setVlcc("");
      setRateChartName("");
      setEffectiveDate(undefined);
      setIsShiftWise(false);
      setSelectedShift("Morning");
      setBaseRate(28.6);
      setFatRanges([{ id: "1", min: 2.5, max: 3.5, multiplier: 0.5 }]);
      setSnfRanges([{ id: "1", min: 7.7, max: 9.0, multiplier: 0.3 }]);
      setShowPreview(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create rate chart");
    } finally {
      setLoading(false);
    }
  };

  const PreviewMatrix = () => {
    const sampleFats = [2.5, 3.0, 3.5, 4.0, 4.5];
    const sampleSnfs = [7.0, 7.5, 8.0, 8.5, 9.0];

    return (
      <div className="mt-4 border rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b">
          <h4 className="font-semibold text-gray-700">Rate Preview (Sample)</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-50">
                <th className="px-3 py-2 border">FAT/SNF</th>
                {sampleSnfs.map((snf) => (
                  <th key={snf} className="px-3 py-2 border">{snf}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleFats.map((fat) => (
                <tr key={fat} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border font-semibold">{fat}</td>
                  {sampleSnfs.map((snf) => (
                    <td key={`${fat}-${snf}`} className="px-3 py-2 border text-center">
                      {calculateRate(fat, snf)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const displayName = vlcc && rateChartName 
    ? `${animalType === "cow" ? "🐄 Cow" : "🐃 Buffalo"} ${rateChartName} ${isShiftWise ? selectedShift : "All Day"}`
    : "Display name will appear here";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Manual Rate Chart Creation</h1>
          <p className="text-gray-600">Create rate charts using range-based rules</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-left">Select VLCC</label>
                <Select value={vlcc} onValueChange={setVlcc}>
                  <SelectTrigger className="bg-gray-50 h-10">
                    <SelectValue placeholder="Select VLCC" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {branches.map((branch) => (
                      <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                        {branch.username} - {branch.name} - {branch.branchName || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-left">Animal Type</label>
                <Select value={animalType} onValueChange={(value: "cow" | "buffalo") => setAnimalType(value)}>
                  <SelectTrigger className="bg-gray-50 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="cow">🐄 Cow</SelectItem>
                    <SelectItem value="buffalo">🐃 Buffalo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-left">Rate Chart Name</label>
                <Select value={rateChartName} onValueChange={setRateChartName}>
                  <SelectTrigger className="bg-gray-50 h-10">
                    <SelectValue placeholder="Select Rate Chart" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Rate Chart 1">Rate Chart 1</SelectItem>
                    <SelectItem value="Rate Chart 2">Rate Chart 2</SelectItem>
                    <SelectItem value="Rate Chart 3">Rate Chart 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <AppDatePicker
                  date={effectiveDate}
                  onChange={(dateStr) => {
                    const parsed = parseISO(dateStr);
                    if (isValid(parsed)) setEffectiveDate(parsed);
                  }}
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <Checkbox id="shift-wise" checked={isShiftWise} onCheckedChange={(checked) => setIsShiftWise(checked as boolean)} className="border-gray-300" />
                <label htmlFor="shift-wise" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Enable Shift-Wise Rate Chart
                </label>
              </div>

              {isShiftWise && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Select Shift</label>
                  <div className="flex gap-3">
                    <Button type="button" variant={selectedShift === "Morning" ? "default" : "outline"} onClick={() => setSelectedShift("Morning")} className={cn("flex-1", selectedShift === "Morning" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-300 hover:bg-gray-50")}>
                      Morning
                    </Button>
                    <Button type="button" variant={selectedShift === "Evening" ? "default" : "outline"} onClick={() => setSelectedShift("Evening")} className={cn("flex-1", selectedShift === "Evening" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-300 hover:bg-gray-50")}>
                      Evening
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-3 text-left">
                <span className="font-medium">Display Name:</span> {displayName}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700 text-left">Base Rate</label>
              <Input type="number" step="0.1" value={baseRate} onChange={(e) => setBaseRate(parseFloat(e.target.value) || 0)} className="bg-gray-50" />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">FAT Ranges</h3>
                  <Button type="button" size="sm" onClick={addFatRange} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-1" /> Add Range
                  </Button>
                </div>
                {fatRanges.map((range) => (
                  <div key={range.id} className="grid grid-cols-4 gap-3 mb-3">
                    <Input type="number" step="0.1" placeholder="Min" value={range.min || ""} onChange={(e) => updateFatRange(range.id, "min", parseFloat(e.target.value) || 0)} className="bg-gray-50" />
                    <Input type="number" step="0.1" placeholder="Max" value={range.max || ""} onChange={(e) => updateFatRange(range.id, "max", parseFloat(e.target.value) || 0)} className="bg-gray-50" />
                    <Input type="number" step="0.1" placeholder="Multiplier" value={range.multiplier || ""} onChange={(e) => updateFatRange(range.id, "multiplier", parseFloat(e.target.value) || 0)} className="bg-gray-50" />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeFatRange(range.id)} disabled={fatRanges.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">SNF Ranges</h3>
                  <Button type="button" size="sm" onClick={addSnfRange} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-1" /> Add Range
                  </Button>
                </div>
                {snfRanges.map((range) => (
                  <div key={range.id} className="grid grid-cols-4 gap-3 mb-3">
                    <Input type="number" step="0.1" placeholder="Min" value={range.min || ""} onChange={(e) => updateSnfRange(range.id, "min", parseFloat(e.target.value) || 0)} className="bg-gray-50" />
                    <Input type="number" step="0.1" placeholder="Max" value={range.max || ""} onChange={(e) => updateSnfRange(range.id, "max", parseFloat(e.target.value) || 0)} className="bg-gray-50" />
                    <Input type="number" step="0.1" placeholder="Multiplier" value={range.multiplier || ""} onChange={(e) => updateSnfRange(range.id, "multiplier", parseFloat(e.target.value) || 0)} className="bg-gray-50" />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeSnfRange(range.id)} disabled={snfRanges.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setShowPreview(!showPreview)} className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !vlcc || !rateChartName || !effectiveDate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Rate Chart"
                )}
              </Button>
            </div>

            {showPreview && <PreviewMatrix />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManualRateChart;
