import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [formData, setFormData] = useState({
    vlcc: "",
    commissionType: "per-liter",
    commissionAmount: "",
    effectiveDate: undefined as Date | undefined,
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
    const [inputValue, setInputValue] = useState("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("VLCC Commission submitted:", formData);
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto mt-15">
      <Card className="border-none bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            VLCC Commission Entry
          </CardTitle>
          <p className="text-gray-600">
            Calculate commission rates for VLCC operations
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="vlcc">Select VLCC</Label>
              <Select
                value={formData.vlcc}
                onValueChange={(value) =>
                  setFormData({ ...formData, vlcc: value })
                }
              >
                <SelectTrigger className="w-full bg-gray-100">
                  <SelectValue placeholder="Choose a VLCC vessel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vlcc1">VLCC Vessel 1</SelectItem>
                  <SelectItem value="vlcc2">VLCC Vessel 2</SelectItem>
                  <SelectItem value="vlcc3">VLCC Vessel 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Commission Type</Label>
              <RadioGroup
                value={formData.commissionType}
                onValueChange={(value) =>
                  setFormData({ ...formData, commissionType: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="per-liter" id="per-liter" />
                  <Label htmlFor="per-liter">Per Liter Commission</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed">Fixed Payment</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissionAmount">Commission Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="commissionAmount"
                  type="number"
                  placeholder="0.00"
                  className="pl-8 bg-gray-100"
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

            <div className="space-y-2 text-left">
              <Label>Effective Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[35%] justify-between font-normal ",
                      !formData.effectiveDate && "text-muted-foreground"
                    )}
                  >
                    {formData.effectiveDate
                      ? format(formData.effectiveDate, "yyyy/MM/dd")
                      : "yyyy / mm / dd"}
                    <CalendarIcon className="mr-2 h-4 w-4 " />
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Submit
            </Button>
          </form>

          {isSubmitted && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-black">
                <span className="">
                  <CheckCircleIcon className="text-green-600 " />
                </span>
                Commission calculation submitted successfully
              </div>
              <div className="relative w-full">
                <Input
                  type="token"
                  placeholder="TOKEN: VLC-2024-0123-4567"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="pl-2 text-black border-gray-300"
                />
                <span
                  onClick={handleCopy}
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: "10px",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                  }}
                >
                  <FileCopyIcon className="text-gray-500" />
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VlcCCommissionEntry;
