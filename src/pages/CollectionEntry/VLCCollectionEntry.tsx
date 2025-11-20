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
import { useState, useEffect } from "react";
import { usePostApi } from "@/services/use-api";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";


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
  const { postData, isLoading } = usePostApi({
    path: "/web/collection/vlc-entry"
  });
  const { postData: fetchEntries } = usePostApi({
    path: "/web/collection/vlc-entries"
  });
  const { branches } = useAppSelector((state) => state.branch);
  const [lastEntries, setLastEntries] = useState([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 17 ? "evening" : "morning";
  };

  const [formData, setFormData] = useState<FormData>({
    date: new Date(),
    shift: getDefaultShift(),
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

  const handleVLCIdChange = (username: string) => {
    const selectedBranch = branches?.find(branch => branch.username === username);
    setFormData(prev => ({
      ...prev,
      userId: username,
      vlcName: selectedBranch?.name || ""
    }));
  };

  const fetchLastEntries = async () => {
    if (!branches?.length || !formData.date || !formData.shift) return;
    
    try {
      const vlcIds = branches.map(branch => branch.username);
      const payload = {
        vlc_ids: vlcIds,
        date: format(formData.date, 'yyyy-MM-dd'),
        shift: formData.shift.charAt(0).toUpperCase() + formData.shift.slice(1)
      };
      const response = await fetchEntries(payload);
      
      if (response?.data?.success) {
        setLastEntries(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch last entries:', error);
    }
  };

  useEffect(() => {
    fetchLastEntries();
  }, [branches, formData.date, formData.shift]);

  const getFilteredEntries = () => {
    return lastEntries;
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.date || !formData.shift || !formData.userId || !formData.vlcName || 
        !formData.weight || !formData.fat || !formData.snf || !formData.clr) {
      toast.error("All fields are required");
      return;
    }

    try {
      const payload = {
        date: format(formData.date, 'yyyy-MM-dd HH:mm:ss'),
        shift: formData.shift.charAt(0).toUpperCase() + formData.shift.slice(1),
        vlc_id: formData.userId,
        vlc_name: formData.vlcName,
        weight: parseFloat(formData.weight),
        fat: parseFloat(formData.fat),
        snf: parseFloat(formData.snf),
        clr: parseFloat(formData.clr)
      };

      const response = await postData(payload);
      
      if (response?.data?.success) {
        toast.success("VLC entry created successfully");
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
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create VLC entry");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 w-full px-4 md:w-[95%] m-auto mt-4 md:mt-10">
      <div className="w-full lg:w-[65%]">
        <Card className="shadow-lg border-0 bg-white">
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
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                <PopoverContent className="w-auto p-0 bg-white z-50" align="start" sideOffset={5}>
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => {
                      if (date) {
                        handleInputChange("date", date);
                        setIsCalendarOpen(false);
                      }
                    }}
                    initialFocus
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
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <hr className="border-gray-300" />

          {/* User ID and VLC Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-sm font-medium text-gray-700">
                VLC ID
              </Label>
              <Select value={formData.userId} onValueChange={handleVLCIdChange}>
                <SelectTrigger className="bg-gray-50 border-gray-200 hover:bg-gray-100 w-full">
                  <SelectValue placeholder="Select VLC ID" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {branches?.length > 0 ? branches.map((branch) => 
                    branch?.username ? (
                      <SelectItem key={branch.username} value={branch.username}>
                        {branch.username}
                      </SelectItem>
                    ) : null
                  ) : (
                    <SelectItem value="" disabled>
                      No VLC branches available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vlcName" className="text-sm font-medium text-gray-700">
                VLC Name
              </Label>
              <Input
                id="vlcName"
                placeholder="VLC Name"
                value={formData.vlcName}
                readOnly
                className="bg-gray-100 border-gray-200 text-gray-700"
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
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? "Submitting..." : "Submit Entry"}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
      
      <div className="w-full lg:w-[35%]">
        <LastEntryDetails entries={getFilteredEntries()} />
      </div>
    </div>
  );
};

export default VLCCollectionEntry;
