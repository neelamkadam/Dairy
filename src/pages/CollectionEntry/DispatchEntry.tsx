import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePostApi } from "@/services/use-api";
import { toast } from "react-toastify";

const DispatchEntry = () => {
  const { postData, isLoading } = usePostApi({
    path: "/web/collection/dispatch-entry"
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [formData, setFormData] = useState({
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



  const handleSubmit = async () => {
    if (!formData.weight || !formData.avgFat || !formData.avgSnf || 
        !formData.ratePerLiter || !formData.commissionPerLiter || !formData.totalAmount) {
      toast.error("All fields are required");
      return;
    }

    try {
      const payload = {
        date: format(selectedDate, 'yyyy-MM-dd HH:mm:ss'),
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
        setFormData({
          weight: "",
          avgFat: "",
          avgSnf: "",
          ratePerLiter: "",
          commissionPerLiter: "",
          totalAmount: ""
        });
        setSelectedDate(new Date());
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create dispatch entry");
    }
  };

  const handleClear = () => {
    setFormData({
      weight: "",
      avgFat: "",
      avgSnf: "",
      ratePerLiter: "",
      commissionPerLiter: "",
      totalAmount: ""
    });
    setSelectedDate(new Date());
  };

  return (
    <div className="w-full px-4 md:w-[90%] lg:w-[70%] m-auto mt-4 md:mt-10">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800">
              Dispatch Entry
            </CardTitle>
            <HelpCircle className="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Dispatch Date
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "dd-MM-yyyy")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white z-50" align="start" sideOffset={5}>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Weight (ltr)
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.weight}
              onChange={(e) => handleInputChange("weight", e.target.value)}
              className="bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Average Fat %
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={formData.avgFat}
                onChange={(e) => handleInputChange("avgFat", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Average SNF %
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={formData.avgSnf}
                onChange={(e) => handleInputChange("avgSnf", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Rate Per Liter
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.ratePerLiter}
                onChange={(e) => handleInputChange("ratePerLiter", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Commission Amount Per Liter
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.commissionPerLiter}
                onChange={(e) => handleInputChange("commissionPerLiter", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Total Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                ₹
              </span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.totalAmount}
                readOnly
                className="pl-8 bg-gray-100 border-gray-200 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-4">
            <Button
              onClick={handleClear}
              variant="outline"
              className="w-full sm:w-auto px-8 py-2 text-sm font-medium border-gray-200"
            >
              Clear Form
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isLoading ? "Submitting..." : "Submit Entry"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DispatchEntry;
