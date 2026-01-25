import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Switch } from "@/components/ui/switch";
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
  BarChart3,
  Scale,
  Layers,
  Printer,
  Lock,
} from "lucide-react";
import { settingsApi } from "@/services/settingsApi";
import { passwordApiService } from "@/services/passwordApiService";
import { toast } from "react-toastify";

const GeneralSettings = () => {
  const branches = useSelector((state: RootState) => state.branch.branches);
  const [selectedVlc, setSelectedVlc] = useState("");
  const [addFarmer, setAddFarmer] = useState(0);
  const [rateChart, setRateChart] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [paymentReceipt, setPaymentReceipt] = useState(0);
  const [generateBill, setGenerateBill] = useState(0);
  const [analyser, setAnalyser] = useState(0);
  const [weightTier, setWeightTier] = useState(0);
  const [weight, setWeight] = useState(0);
  const [printer, setPrinter] = useState(0);
  const [language, setLanguage] = useState("English");
  const [reportLanguage, setReportLanguage] = useState("English");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [showWater, setShowWater] = useState(0);
  const [cattleFeedLumpSum, setCattleFeedLumpSum] = useState(() => {
    const saved = localStorage.getItem('cattleFeedLumpSum');
    return saved ? parseInt(saved) : 0;
  });

  useEffect(() => {
    if (selectedVlc) {
      fetchSettings();
      checkPassword();
    }
  }, [selectedVlc]);

  const fetchSettings = async () => {
    try {
      const { data } = await settingsApi.get(selectedVlc);
      if (data.success && data.data) {
        const settings = data.data;
        setAddFarmer(settings.add_farmer ?? 0);
        setRateChart(settings.rate_chart ?? 0);
        setDeduction(settings.deduction ?? 0);
        setPaymentReceipt(settings.payment_receipt ?? 0);
        setGenerateBill(settings.generate_bill ?? 0);
        setAnalyser(settings.analyser ?? 0);
        setWeightTier(settings.weight_tier ?? 0);
        setWeight(settings.weight ?? 0);
        setPrinter(settings.printer ?? 0);
        setLanguage(settings.language || "English");
        setReportLanguage(settings.report_language || "English");
        setShowWater(settings.show_water ?? 0);
      }
    } catch (error) {
      toast.error("Failed to fetch settings");
    }
  };

  const checkPassword = async () => {
    try {
      const result = await passwordApiService.checkPassword(selectedVlc);
      if (result.success) {
        setHasPassword(result.hasPassword);
        setPassword("");
      }
    } catch (error) {
      console.error("Failed to check password");
    }
  };

  const handlePasswordSave = async () => {
    if (!selectedVlc) {
      toast.error("Please select a VLC");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter a password");
      return;
    }
    try {
      const result = hasPassword
        ? await passwordApiService.updatePassword(selectedVlc, password)
        : await passwordApiService.createPassword(selectedVlc, password);
      
      if (result.success) {
        toast.success(result.message || `Password ${hasPassword ? 'updated' : 'created'} successfully`);
        setHasPassword(true);
        setPassword("");
      } else {
        toast.error(result.message || "Failed to save password");
      }
    } catch (error) {
      toast.error("Failed to save password");
    }
  };

  const handleSave = async () => {
    if (!selectedVlc) {
      toast.error("Please select a VLC");
      return;
    }
    try {
      const { data } = await settingsApi.update({
        vlc: selectedVlc,
        add_farmer: addFarmer,
        rate_chart: rateChart,
        deduction: deduction,
        payment_receipt: paymentReceipt,
        generate_bill: generateBill,
        analyser: analyser,
        weight_tier: weightTier,
        weight: weight,
        printer: printer,
        language: language,
        report_language: reportLanguage,
        show_water: showWater,
      });
      if (data.success) {
        toast.success("Settings updated successfully");
      }
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  const handleShowWaterChange = (checked: boolean) => {
    if (!selectedVlc) {
      toast.error("Please select a VLC first");
      return;
    }
    setShowWater(checked ? 1 : 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                value={language.toLowerCase()}
                onValueChange={(val) => setLanguage(val.charAt(0).toUpperCase() + val.slice(1))}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="english" id="english" className="border-gray-300" />
                  <Label
                    htmlFor="english"
                    className="text-sm text-gray-700 cursor-pointer font-medium"
                  >
                    English
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hindi" id="hindi" className="border-gray-300" />
                  <Label
                    htmlFor="hindi"
                    className="text-sm text-gray-700 cursor-pointer font-medium"
                  >
                    Hindi
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="marathi" id="marathi" className="border-gray-300" />
                  <Label
                    htmlFor="marathi"
                    className="text-sm text-gray-700 cursor-pointer font-medium"
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
                value={reportLanguage.toLowerCase()}
                onValueChange={(val) => setReportLanguage(val.charAt(0).toUpperCase() + val.slice(1))}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="english" id="english-report" className="border-gray-300" />
                  <Label
                    htmlFor="english-report"
                    className="text-sm text-gray-700 cursor-pointer font-medium"
                  >
                    English
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hindi" id="hindi-report" className="border-gray-300" />
                  <Label
                    htmlFor="hindi-report"
                    className="text-sm text-gray-700 cursor-pointer font-medium"
                  >
                    Hindi
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="marathi" id="marathi-report" className="border-gray-300" />
                  <Label
                    htmlFor="marathi-report"
                    className="text-sm text-gray-700 cursor-pointer font-medium"
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
            <Select value={selectedVlc} onValueChange={setSelectedVlc}>
              <SelectTrigger className="w-full border border-gray-200">
                <SelectValue placeholder="Select VLC" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {branches.map((branch) => (
                  <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                    {branch.username} - {branch.name} - {branch.branchName || ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <Checkbox id="add-farmer" checked={addFarmer === 1} onCheckedChange={(checked) => setAddFarmer(checked ? 1 : 0)} className="mt-1 text-blue-600 border-gray-300" />
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
                <Checkbox id="rate-chart" checked={rateChart === 1} onCheckedChange={(checked) => setRateChart(checked ? 1 : 0)} className="mt-1 text-blue-600 border-gray-300" />
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
                <Checkbox id="deduction" checked={deduction === 1} onCheckedChange={(checked) => setDeduction(checked ? 1 : 0)} className="mt-1 text-blue-600 border-gray-300" />
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
                  checked={paymentReceipt === 1}
                  onCheckedChange={(checked) => setPaymentReceipt(checked ? 1 : 0)}
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
                <Checkbox id="generate-bill" checked={generateBill === 1} onCheckedChange={(checked) => setGenerateBill(checked ? 1 : 0)} className="mt-1 text-blue-600 border-gray-300" />
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
                  <Switch checked={analyser === 1} onCheckedChange={(checked) => setAnalyser(checked ? 1 : 0)} />
                  <span className="text-xs text-gray-700 font-medium">
                    {analyser === 1 ? "Active" : "Inactive"}
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
                  <Switch checked={weightTier === 1} onCheckedChange={(checked) => setWeightTier(checked ? 1 : 0)} />
                  <span className="text-xs text-gray-700 font-medium">
                    {weightTier === 1 ? "Active" : "Inactive"}
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
                  <Switch checked={weight === 1} onCheckedChange={(checked) => setWeight(checked ? 1 : 0)} />
                  <span className="text-xs text-gray-700 font-medium">
                    {weight === 1 ? "Active" : "Inactive"}
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
                <Switch checked={printer === 1} onCheckedChange={(checked) => setPrinter(checked ? 1 : 0)} />
                  <span className="text-xs text-gray-700 font-medium">
                    {printer === 1 ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Settings Password Management
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {hasPassword ? "Update Password" : "Create Password"}
              </label>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={handlePasswordSave}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  {hasPassword ? "Update" : "Create"}
                </Button>
              </div>
              {hasPassword && (
                <p className="text-xs text-gray-500 mt-2">
                  Password already exists. Enter a new password to update.
                </p>
              )}
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Show Water</h3>
                <p className="text-xs text-gray-500">Display water information</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={showWater === 1} onCheckedChange={handleShowWaterChange} />
                <span className="text-xs text-gray-700 font-medium">
                  {showWater === 1 ? "ON" : "OFF"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Cattle Feed Lump Sum</h3>
                <p className="text-xs text-gray-500">Simple input for cattle feed payments</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={cattleFeedLumpSum === 1} 
                  onCheckedChange={(checked) => {
                    const value = checked ? 1 : 0;
                    setCattleFeedLumpSum(value);
                    localStorage.setItem('cattleFeedLumpSum', value.toString());
                  }} 
                />
                <span className="text-xs text-gray-700 font-medium">
                  {cattleFeedLumpSum === 1 ? "ON" : "OFF"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-left pt-6">
          <Button onClick={handleSave} className="px-50 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;