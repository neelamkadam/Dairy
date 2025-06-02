import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, CircleUserRound } from "lucide-react";

const DispatchEntry = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  return (
    <>
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between m-5">
          <h2>DispatchPro</h2>
          <h2>Dispatch Management</h2>
          <CircleUserRound size={20} strokeWidth={1.25} />
        </div>
        <hr className="text-gray-300" />
        <div className="flex items-center justify-between ml-5 mt-2">
          <div className="">
            <h2 className="text-2xl font-bold text-gray-900 ">
              Dispatch Entry
            </h2>
            <p className="text-gray-600 mt-1">Enter dispatch details below</p>
          </div>
        </div>

        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm max-w-4xl mx-auto">
          <CardContent className="p-8 space-y-6 text-left">
            {/* Dispatch Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Dispatch Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-2"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "yyyy/MM/dd")
                      : "yyyy / mm / dd"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Weight (ltr)
              </label>
              <Input placeholder="Enter weight" className="h-12 mt-2" />
            </div>

            {/* Fat and SNF */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Average Fat %
                </label>
                <Input
                  placeholder="Enter fat percentage"
                  className="h-12 mt-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Average SNF %
                </label>
                <Input
                  placeholder="Enter SNF percentage"
                  className="h-12 mt-2"
                />
              </div>
            </div>

            {/* Rate and Commission */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Rate Per Liter
                </label>
                <Input placeholder="Enter Rate" className="h-12 mt-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Commission Amount Per Liter
                </label>
                <Input
                  placeholder="Enter Commission Rate"
                  className="h-12 mt-2"
                />
              </div>
            </div>

            {/* Total Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Total Amount
              </label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  value="$0.00"
                  readOnly
                  className="pl-8 h-12 bg-gray-50"
                />
              </div>
              <p className="text-xs text-gray-500">
                Total amount will be calculated automatically
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4">
              <Button variant="outline" className="px-8">
                Clear Form
              </Button>
              <Button className="px-8 bg-blue-600 hover:bg-blue-700">
                Save Entry
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <hr className="text-gray-300 " />
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <span>© 2024 DispatchPro. All rights reserved.</span>
          <div className="gap-4">
            <Button variant="link" size="sm" className="text-gray-500">
              Privacy Policy
            </Button>
            <Button variant="link" size="sm" className="text-gray-500">
              Terms of Service
            </Button>
            <Button variant="link" size="sm" className="text-gray-500">
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DispatchEntry;
