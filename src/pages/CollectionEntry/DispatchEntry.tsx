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
import { CalendarIcon, CircleUserRound, Scale, Calculator } from "lucide-react";
import WidgetsOutlinedIcon from "@mui/icons-material/WidgetsOutlined";
const DispatchEntry = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 bg-white">
      <div className="flex flex-wrap items-center justify-between p-5 font-bold text-[20px]">
        {/* Left Section */}
        <div className="flex gap-2 items-center">
          <Scale className="text-blue-500" />
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl">
            DispatchPro
          </h2>
        </div>

        {/* Center Section */}
        <h2 className="hidden md:block text-sm sm:text-base lg:text-xl">
          Dispatch Management
        </h2>

        {/* Right Section */}
        <div className="flex gap-5 items-center">
          <WidgetsOutlinedIcon
            color="action"
            sx={{ fontSize: 20 }}
            className="text-gray-500"
          />
          <CircleUserRound
            size={20}
            strokeWidth={1.25}
            className="text-gray-700"
          />
        </div>
      </div>

      <hr className="text-gray-300" />
      <div className="flex items-center justify-between ml-5 mt-2 mb-10">
        <div className="">
          <h2 className="text-2xl font-bold text-gray-900 ">Dispatch Entry</h2>
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
                  className="w-full justify-between font-normal mt-2 border-gray-200"
                >
                  {selectedDate
                    ? format(selectedDate, "yyyy/MM/dd")
                    : "yyyy / mm / dd"}
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
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
            <div className="relative">
              <Input
                placeholder="Enter weight"
                className="h-12 mt-2 border-gray-200"
              />
              <div className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                <Calculator className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Fat and SNF */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Average Fat %
              </label>
              <Input
                placeholder="Enter fat percentage"
                className="h-12 mt-2 border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Average SNF %
              </label>
              <Input
                placeholder="Enter SNF percentage"
                className="h-12 mt-2 border-gray-200"
              />
            </div>
          </div>

          {/* Rate and Commission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Rate Per Liter
              </label>
              <Input
                placeholder="Enter Rate"
                className="h-12 mt-2 border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Commission Amount Per Liter
              </label>
              <Input
                placeholder="Enter Commission Rate"
                className="h-12 mt-2 border-gray-200"
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
                className="pl-8 h-12 border-gray-200"
              />
            </div>
            <p className="text-xs text-gray-500">
              Total amount will be calculated automatically
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-stretch md:flex-row md:gap-4 justify-end pt-4">
            <Button
              variant="outline"
              className="px-4 py-2 text-sm md:text-base mb-2 lg:px-8 lg:py-3 border-gray-200"
            >
              Clear Form
            </Button>
            <Button className="px-4 py-2 text-white text-sm bg-blue-600 hover:bg-blue-700 md:text-base lg:px-8 lg:py-3">
              Save Entry
            </Button>
          </div>
        </CardContent>
      </Card>
       {/* Footer */}
      <hr className="text-gray-300 mt-10" />
      <div className="flex items-center justify-between text-sm text-gray-500 mb-3 p-3">
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
  );
};

export default DispatchEntry;
