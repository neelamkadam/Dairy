import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  CreditCard,
  TrendingUp,
  FileText,
  Minus,
  Languages,
  Search,
  Settings,
  User,
  BarChart3,
  Scale,
  Layers,
  Printer,
} from "lucide-react";
import { useState } from "react";

const GeneralSettings = () => {
 const [isActive, setIsActive] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-gray-600" />
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search settings..."
              className="pl-10 w-80 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>

          <Button
            variant="ghost"
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <User className="h-4 w-4" />
            <span>Admin</span>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Languages className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Language Preferences
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-left text-sm font-medium text-gray-700 mb-4">
                Language
              </h3>
              <RadioGroup
                defaultValue="english"
                className="space-y-3 flex gap-4"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="english" id="english" />
                  <Label
                    htmlFor="english"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    English
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="hindi" id="hindi" />
                  <Label
                    htmlFor="hindi"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Hindi
                  </Label>
                </div>
                <div className="flex items-center space-x-3 mb-3">
                  <RadioGroupItem value="marathi" id="marathi" />
                  <Label
                    htmlFor="marathi"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Marathi
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <h3 className="text-left text-sm font-medium text-gray-700 mb-4">
                Report Language
              </h3>
              <RadioGroup
                defaultValue="english-report"
                className="space-y-3 flex "
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="english-report" id="english-report" />
                  <Label
                    htmlFor="english-report"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    English
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="hindi-report" id="hindi-report" />
                  <Label
                    htmlFor="hindi-report"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Hindi
                  </Label>
                </div>
                <div className="flex items-center space-x-3 mb-3">
                  <RadioGroupItem value="marathi-report" id="marathi-report" />
                  <Label
                    htmlFor="marathi-report"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Marathi
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-left">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Feature Management
          </h2>

          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select VLC
            </label>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select VLC" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="vlc1">VLC 1</SelectItem>
                <SelectItem value="vlc2">VLC 2</SelectItem>
                <SelectItem value="vlc3">VLC 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <Checkbox id="add-farmer" defaultChecked className="mt-1 text-blue-600 border-gray-300" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <label
                      htmlFor="add-farmer"
                      className="text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      Add Farmer
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Enable farmer registration and management
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <Checkbox id="rate-chart" defaultChecked className="mt-1 text-blue-600 border-gray-300" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <label
                      htmlFor="rate-chart"
                      className="text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      Rate Chart
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Configure and view rate charts
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <Checkbox id="deduction" defaultChecked className="mt-1 text-blue-600 border-gray-300" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Minus className="h-4 w-4 text-blue-600" />
                    <label
                      htmlFor="deduction"
                      className="text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      Deduction
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Manage payment deductions and adjustments
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <Checkbox
                  id="payment-receipt"
                  defaultChecked
                  className="mt-1 text-blue-600 border-gray-300"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <label
                      htmlFor="payment-receipt"
                      className="text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      Payment & Receipt
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Manage payment transactions and receipts
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <Checkbox id="generate-bill" defaultChecked className="mt-1 text-blue-600 border-gray-300" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <label
                      htmlFor="generate-bill"
                      className="text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      Generate Bill
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Create and manage billing documents
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Analyser
                    </h3>
                    <p className="text-xs text-gray-500">
                      Data analysis component
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch className="bg-blue-500" />
                  <span className="text-xs text-gray-700 font-medium">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Weight Tier
                    </h3>
                    <p className="text-xs text-gray-500">
                      Weight classification system
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked className="bg-blue-500" />
                  <span className="text-xs text-gray-700 font-medium">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Weight
                    </h3>
                    <p className="text-xs text-gray-500">
                      Weight measurement system
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked className="bg-blue-500" />
                  <span className="text-xs text-gray-700 font-medium">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3">
                  <Printer className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Printer
                    </h3>
                    <p className="text-xs text-gray-500">
                      Document printing system
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                <Switch defaultChecked className="bg-blue-500" />
                  <span className="text-xs text-gray-700 font-medium">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-left pt-6">
          <Button className="px-50 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
