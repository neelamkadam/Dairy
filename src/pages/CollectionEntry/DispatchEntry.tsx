import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, isValid } from "date-fns";
import { HelpCircle, Truck, Scale, Droplets, Banknote, Save, RefreshCcw, Loader2, IndianRupee } from "lucide-react";
import { usePostApi } from "@/services/use-api";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";

const DispatchEntry = () => {
  const { t } = useTranslation();
  const { postData, isLoading } = usePostApi({
    path: "/web/collection/dispatch-entry"
  });

  const { branches } = useAppSelector((state) => state.branch);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    vlcId: "",
    weight: "",
    avgFat: "",
    avgSnf: "",
    ratePerLiter: "",
    commissionPerLiter: "",
    totalAmount: ""
  });

  const handleInputChange = (field: string, value: string) => {
    const updatedData = { ...formData, [field]: value };

    // Auto-calculate total amount when weight, rate, or commission changes
    if (field === 'weight' || field === 'ratePerLiter' || field === 'commissionPerLiter') {
      const weight = parseFloat(field === 'weight' ? value : updatedData.weight) || 0;
      const rate = parseFloat(field === 'ratePerLiter' ? value : updatedData.ratePerLiter) || 0;
      const commission = parseFloat(field === 'commissionPerLiter' ? value : updatedData.commissionPerLiter) || 0;

      updatedData.totalAmount = ((weight * rate) + (weight * commission)).toFixed(2);
    }

    setFormData(updatedData);
  };

  const handleVLCIdChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      vlcId: val
    }));
  };

  const handleSubmit = async () => {
    if (!formData.vlcId || !formData.weight || !formData.avgFat || !formData.avgSnf ||
      !formData.ratePerLiter || !formData.commissionPerLiter || !formData.totalAmount) {
      toast.error("All fields are required");
      return;
    }

    try {
      const payload = {
        date: format(selectedDate, 'yyyy-MM-dd HH:mm:ss'),
        vlc_id: formData.vlcId,
        weight: parseFloat(formData.weight),
        avg_fat: parseFloat(formData.avgFat),
        avg_snf: parseFloat(formData.avgSnf),
        rate_per_liter: parseFloat(formData.ratePerLiter),
        commission_amount_per_liter: parseFloat(formData.commissionPerLiter),
        total_amount: parseFloat(formData.totalAmount)
      };

      const response = await postData(payload);

      if (response?.data?.success) {
        toast.success("Dispatch entry created successfully");
        handleClear();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create dispatch entry");
    }
  };

  const handleClear = () => {
    setFormData({
      vlcId: "",
      weight: "",
      avgFat: "",
      avgSnf: "",
      ratePerLiter: "",
      commissionPerLiter: "",
      totalAmount: ""
    });
    setSelectedDate(new Date());
  };

  const handleEnterAsTab = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('enter-field')) return;

      e.preventDefault();

      const container = target.closest('.enter-nav-container');
      if (!container) return;

      const fields = Array.from(
        container.querySelectorAll('.enter-field:not([disabled]):not([readonly])')
      ) as HTMLElement[];
      
      const index = fields.indexOf(target);
      if (index > -1 && index < fields.length - 1) {
        fields[index + 1].focus();
      } else if (index === fields.length - 1 && target.tagName === 'BUTTON') {
        fields[index].click();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 space-y-6" onKeyDown={handleEnterAsTab}>
      <div className="w-full max-w-7xl mx-auto space-y-6">
        
        {/* Header Card */}
        <div className="flex items-center justify-between bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Truck className="h-6 w-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
              {t('tanker_dispatch') || 'Tanker Dispatch'}
            </h1>
          </div>
          <HelpCircle className="h-6 w-6 text-gray-400 stroke-[1.5] shrink-0" />
        </div>

        {/* Form Card */}
        <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-4 md:p-6 space-y-6 enter-nav-container">
            
            {/* Row 1: VLC Dropdown, Date and Weight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="flex flex-col justify-end space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 block text-left">
                  {t('select_vlc') || 'Select VLC'}
                </Label>
                <VLCDropdown
                  branches={branches || []}
                  value={formData.vlcId}
                  onChange={handleVLCIdChange}
                  valueKey="username"
                  className="h-11"
                />
              </div>

              <div className="flex flex-col justify-end space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 block text-left">
                  {t('dispatch_date')}
                </Label>
                <Input
                  type="date"
                  value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (isValid(d)) setSelectedDate(d);
                  }}
                  className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-gray-800 shadow-sm enter-field"
                />
              </div>

              <div className="flex flex-col justify-end space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-500 stroke-[1.5]" />
                  <span>{t('weight')} (LTR)</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  className="h-11 bg-white border-gray-200 focus:border-blue-400 text-blue-500 text-sm font-semibold rounded-xl text-center shadow-sm enter-field"
                />
              </div>
            </div>

            {/* Row 2: Fat and SNF */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="flex flex-col justify-end space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-fuchsia-500 stroke-[1.5]" />
                  <span>{t('avg_fat')}</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.avgFat}
                  onChange={(e) => handleInputChange("avgFat", e.target.value)}
                  className="h-11 bg-white border-gray-200 focus:ring-2 focus:ring-fuchsia-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>
              <div className="flex flex-col justify-end space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-fuchsia-500 stroke-[1.5]" />
                  <span>{t('avg_snf')}</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.avgSnf}
                  onChange={(e) => handleInputChange("avgSnf", e.target.value)}
                  className="h-11 bg-white border-gray-200 focus:ring-2 focus:ring-fuchsia-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>
            </div>

            {/* Row 3: Rate, Commission, Total */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="flex flex-col justify-end space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-500 stroke-[1.5]" />
                  <span>{t('rate_per_liter')}</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.ratePerLiter}
                  onChange={(e) => handleInputChange("ratePerLiter", e.target.value)}
                  className="h-11 bg-white border-gray-200 focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>
              <div className="flex flex-col justify-end space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-500 stroke-[1.5]" />
                  <span>{t('commission_per_liter') || 'Commission Amount Per Liter'}</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.commissionPerLiter}
                  onChange={(e) => handleInputChange("commissionPerLiter", e.target.value)}
                  className="h-11 bg-white border-gray-200 focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold rounded-xl text-center text-gray-800 shadow-sm enter-field"
                />
              </div>

              <div className="flex flex-col justify-end space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                  <span>{t('total_amount')}</span>
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <IndianRupee className="h-4 w-4 text-emerald-600 stroke-[2]" />
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.totalAmount}
                    readOnly
                    className="h-11 pl-10 pr-10 text-sm font-bold text-center bg-emerald-50/30 border-emerald-100 rounded-xl text-emerald-700 cursor-not-allowed shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
              <Button
                onClick={handleClear}
                variant="outline"
                className="h-11 px-6 text-sm font-semibold border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
              >
                <RefreshCcw className="h-4 w-4 mr-2 stroke-[2]" />
                {t('clear_form')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all enter-field"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2 stroke-[2]" />
                )}
                {t('submit_entry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DispatchEntry;
