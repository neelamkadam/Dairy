import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import LastEntryDetails from "@/components/LastEntryDetails";
import { Input } from "@/components/ui/input";
import { useState } from "react";


interface FormData {
  date: Date | undefined;
  shift: string;
  userId: string;
  vlcName: string;
  weight: string;
  fat: string;
  snf: string;
  clr: string;
}

const VLCCollectionEntry = () => {

  const [formData, setFormData] = useState<FormData>({
    date: new Date(),
    shift: "",
    userId: "",
    vlcName: "",
    weight: "",
    fat: "",
    snf: "",
    clr: "",
  });

  const handleInputChange = (field: keyof FormData, value: string | Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    // Basic validation
    // if (!formData.date || !formData.shift || !formData.userId || !formData.vlcName) {
    //   toast({
    //     title: "Validation Error",
    //     description: "Please fill in all required fields",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    // console.log("Form submitted:", formData);
    // toast({
    //   title: "Entry Submitted",
    //   description: "VLC collection entry has been recorded successfully",
    // });

    // Reset form
    setFormData({
      date: new Date(),
      shift: "",
      userId: "",
      vlcName: "",
      weight: "",
      fat: "",
      snf: "",
      clr: "",
    });
  };

  return (
    <div className="space-y-6 w-[70%] m-auto mt-10">
      <Card className=" shadow-lg border-0 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800">
              VLC Collection Entry
            </CardTitle>
            <HelpCircle className="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Shift Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? (
                      format(formData.date, "dd-MM-yyyy")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => handleInputChange("date", date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 ">
              <Label htmlFor="shift" className="text-sm font-medium text-gray-700">
                Shift
              </Label>
              <Select value={formData.shift} onValueChange={(value) => handleInputChange("shift", value)} >
                <SelectTrigger className="bg-gray-50 border-gray-200 hover:bg-gray-100 w-full">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent className="bg-white" >
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User ID and VLC Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-sm font-medium text-gray-700">
                User ID
              </Label>
              <Input
                id="userId"
                placeholder="Enter User ID"
                value={formData.userId}
                onChange={(e) => handleInputChange("userId", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vlcName" className="text-sm font-medium text-gray-700">
                VLC Name
              </Label>
              <Input
                id="vlcName"
                placeholder="Enter VLC Name"
                value={formData.vlcName}
                onChange={(e) => handleInputChange("vlcName", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          {/* Weight and Fat Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-sm font-medium text-gray-700">
                Weight (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fat" className="text-sm font-medium text-gray-700">
                Fat (%)
              </Label>
              <Input
                id="fat"
                type="number"
                step="0.1"
                placeholder="0.0"
                value={formData.fat}
                onChange={(e) => handleInputChange("fat", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          {/* SNF and CLR Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="snf" className="text-sm font-medium text-gray-700">
                SNF (%)
              </Label>
              <Input
                id="snf"
                type="number"
                step="0.1"
                placeholder="0.0"
                value={formData.snf}
                onChange={(e) => handleInputChange("snf", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clr" className="text-sm font-medium text-gray-700">
                CLR
              </Label>
              <Input
                id="clr"
                type="number"
                step="0.1"
                placeholder="0.0"
                value={formData.clr}
                onChange={(e) => handleInputChange("clr", e.target.value)}
                className="bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 text-sm font-medium transition-colors"
            >
              Submit Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      <LastEntryDetails />
    </div>
  );
};

export default VLCCollectionEntry;
