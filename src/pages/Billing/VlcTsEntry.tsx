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
  const [formData, setFormData] = useState({
    vlc: "",
    fatRate: "",
    snfRate: "",
    effectiveDate: undefined as Date | undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("TS Entry submitted:", formData);
  };

  return (
    <div className="max-w-2xl mx-auto mt-15">
      <Card className="border-none bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-left">
            TS Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="vlc">
                Select VLC <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.vlc}
                onValueChange={(value) =>
                  setFormData({ ...formData, vlc: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose VLC" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="vlc1">VLC Alpha</SelectItem>
                  <SelectItem value="vlc2">VLC Beta</SelectItem>
                  <SelectItem value="vlc3">VLC Gamma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fatRate">
                Kg FAT Rate (Rs)<span className="text-red-500">*</span>
              </Label>
              <Input
                id="fatRate"
                type="number"
                placeholder="Enter FAT rate"
                value={formData.fatRate}
                onChange={(e) =>
                  setFormData({ ...formData, fatRate: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snfRate">
                Kg SNF Rate (Rs)<span className="text-red-500">*</span>
              </Label>
              <Input
                id="snfRate"
                type="number"
                placeholder="Enter SNF rate"
                value={formData.snfRate}
                onChange={(e) =>
                  setFormData({ ...formData, snfRate: e.target.value })
                }
                required
              />
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
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VlcTsEntry;
