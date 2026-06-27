import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-toastify";
import { createDairyApi } from "@/services/createDairyApi";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import { 
  Plus, 
  Phone, 
  Lock, 
  Building2, 
  User, 
  MapPin, 
  Map, 
  Factory, 
  Store,
  CalendarClock,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE = "Dairyadmin";

const DEFAULT_EQUIPMENT = [
  "Milk Analyzer",
  "Weighting Scale",
  "Mobile Application",
  "Stirer",
  "Milk Can",
  "Solar Panel",
];

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1, label: "Mobile Number" },
  { id: 2, label: "Verify OTP" },
  { id: 3, label: "Dairy Details" },
];

const CreateDairy = () => {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [existingDairies, setExistingDairies] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    branchname: "",
    ownername: "",
    password: "",
    days: 10,
    villagename: "",
    address: "",
  });
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Equipment checklist (backend pending — local only for now).
  const [equipment, setEquipment] = useState<{ name: string; checked: boolean; quantity: string; serialNumber: string }[]>(
    DEFAULT_EQUIPMENT.map((name) => ({ name, checked: false, quantity: "", serialNumber: "" }))
  );
  const [newField, setNewField] = useState("");

  const toggleEquipment = (idx: number) =>
    setEquipment((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, checked: !e.checked } : e))
    );

  const updateEquipmentField = (idx: number, field: "quantity" | "serialNumber", value: string) =>
    setEquipment((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );

  const addEquipmentField = () => {
    const name = newField.trim();
    if (!name) {
      toast.error("Enter a field name");
      return;
    }
    if (equipment.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
      toast.error("This field already exists");
      return;
    }
    setEquipment((prev) => [...prev, { name, checked: true, quantity: "", serialNumber: "" }]);
    setNewField("");
  };

  const handleEquipmentSubmit = () => {
    // Backend not wired up yet — just acknowledge the submission.
    toast.success("Equipment details submitted");
    setIsSubmitted(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard!"),
      (err) => console.error("Failed to copy: ", err)
    );
  };

  // Step 1 — send the OTP.
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const data = await createDairyApi.sendOtp(mobileNumber.trim());
      if (data.success === false) {
        toast.error(data.message || "Failed to send OTP");
        return;
      }
      toast.success(data.message || "OTP sent successfully");
      setStep(2);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify the OTP and pull any existing dairies.
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const data = await createDairyApi.verifyOtp({
        mobile_number: mobileNumber.trim(),
        otp: otp.trim(),
        role: ROLE,
      });
      if (data.success === false) {
        toast.error(data.message || "Invalid OTP");
        return;
      }
      toast.success(data.message || "OTP verified successfully");
      setToken(data.token ?? null);
      setExistingDairies(Array.isArray(data.data) ? data.data : []);
      setStep(3);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const data = await createDairyApi.sendOtp(mobileNumber.trim());
      toast.success(data.message || "OTP resent");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — create the dairy/branch.
  const handleCreateBranch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.branchname.trim() || !form.ownername.trim()) {
      toast.error("Please fill Dairy Name, Branch Name and Owner Name");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const data = await createDairyApi.createBranch(
        {
          name: form.name.trim(),
          branchname: form.branchname.trim(),
          ownername: form.ownername.trim(),
          mobile_number: mobileNumber.trim(),
          password: form.password,
          days: Number(form.days) || 10,
          villagename: form.villagename.trim(),
          address: form.address.trim(),
          role: ROLE,
        },
        token ?? undefined
      );
      if (data.success === false) {
        toast.error(data.message || "Failed to create dairy");
        return;
      }
      toast.success(data.message || "Dairy created successfully");
      setCreatedUser(data.userdata ?? data.data ?? data.user ?? data);
      setStep(4);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create dairy");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setMobileNumber("");
    setOtp("");
    setToken(null);
    setExistingDairies([]);
    setForm({
      name: "",
      branchname: "",
      ownername: "",
      password: "",
      days: 10,
      villagename: "",
      address: "",
    });
    setCreatedUser(null);
    setEquipment(DEFAULT_EQUIPMENT.map((name) => ({ name, checked: false, quantity: "", serialNumber: "" })));
    setNewField("");
    setIsSubmitted(false);
  };

  const createdUsername =
    createdUser?.username ?? createdUser?.user_name ?? createdUser?.userName ?? "-";

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-8 bg-background relative overflow-hidden">
      <div className="w-full max-w-3xl relative z-10">
        <Card className="shadow-lg border-border bg-card rounded-2xl overflow-hidden transition-all duration-500">
          <CardHeader className="border-b border-border bg-card p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-extrabold text-foreground">
                  Create Dairy
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-2 font-medium">
                  Set up a new dairy in a few simple steps.
                </p>
              </div>

              {/* Stepper */}
              <div className="flex items-center space-x-2">
                {STEPS.map((s, idx) => {
                  const active = step === s.id;
                  const done = step > s.id;
                  return (
                    <div key={s.id} className="flex items-center">
                      <div className="flex flex-col items-center gap-1 relative">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all duration-300 ${
                            done
                              ? "bg-green-600 text-white shadow-sm"
                              : active
                                ? "bg-blue-600 text-white shadow-sm ring-4 ring-blue-600/20"
                                : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}
                        >
                          {done ? <CheckCircle2 size={18} /> : s.id}
                        </div>
                        {active && (
                          <span className="absolute -bottom-5 text-[10px] font-bold text-blue-600 whitespace-nowrap">
                            {s.label}
                          </span>
                        )}
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div
                          className={`w-8 sm:w-12 h-[2px] mx-2 transition-all duration-500 rounded-full ${
                            step > s.id ? "bg-green-500" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Step 1: Mobile number */}
              {step === 1 && (
                <form onSubmit={handleSendOtp} className="max-w-md mx-auto space-y-6 py-6">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4">
                      <Phone size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Verify Mobile</h3>
                    <p className="text-muted-foreground text-sm mt-2">
                      Enter the owner's 10-digit mobile number to begin.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="mobile" className="text-sm font-semibold text-foreground">
                      Mobile Number
                    </Label>
                    <div className="relative group">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 group-focus-within:text-blue-600 transition-colors" />
                      <Input
                        id="mobile"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="Enter mobile number"
                        className="pl-11 h-12 bg-background border-input focus:bg-background focus:border-blue-600 focus:ring-blue-600/20 transition-all rounded-xl text-lg"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || mobileNumber.length !== 10}
                    className="w-full h-12 text-base font-semibold rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </form>
              )}

              {/* Step 2: Verify OTP */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp} className="max-w-md mx-auto space-y-6 py-6">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4">
                      <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Enter OTP</h3>
                    <p className="text-muted-foreground text-sm mt-2">
                      We've sent a code to <span className="font-semibold text-foreground">{mobileNumber}</span>.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="otp" className="text-sm font-semibold text-foreground">
                      6-Digit Code
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="• • • • • •"
                      className="h-14 bg-background border-input focus:bg-background focus:border-blue-600 focus:ring-blue-600/20 transition-all rounded-xl tracking-[0.75em] text-center text-2xl font-bold"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium px-3 rounded-lg"
                      onClick={handleResendOtp}
                      disabled={loading}
                    >
                      Resend OTP
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted font-medium px-3 rounded-lg"
                      onClick={() => setStep(1)}
                      disabled={loading}
                    >
                      Change Number
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full h-12 text-base font-semibold rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Button>
                </form>
              )}

              {/* Step 3: Dairy details */}
              {step === 3 && (
                <div className="space-y-6 py-2">
                  {existingDairies.length > 0 && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                      <div className="flex gap-3">
                        <Store className="text-green-600 shrink-0 mt-0.5" size={20} />
                        <div className="w-full">
                          <p className="text-sm font-semibold text-green-900 mb-3">
                            Found {existingDairies.length} existing dair{existingDairies.length > 1 ? "ies" : "y"} for this number:
                          </p>
                          <div className="flex flex-col gap-2">
                            {existingDairies.map((d: any, i: number) => (
                              <div key={i} className="flex items-center text-sm text-white font-medium bg-green-600 px-4 py-2.5 rounded-lg shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-white mr-3 shrink-0"></div>
                                <span className="truncate">
                                  {d.name ?? d.dairy_name ?? "Dairy"}
                                  {d.branchname ? <span className="text-green-100 font-normal ml-1">— {d.branchname}</span> : ""}
                                  {d.username ? <span className="text-green-200 font-normal ml-2">({d.username})</span> : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleCreateBranch} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground">
                          Dairy Name <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative group">
                          <Factory className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            className="pl-9 h-11 bg-background border-input focus:bg-background focus:ring-blue-600/20 rounded-lg transition-all"
                            placeholder="e.g. Sunrise Dairy"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground">
                          Branch Name <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative group">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            className="pl-9 h-11 bg-background border-input focus:bg-background focus:ring-blue-600/20 rounded-lg transition-all"
                            placeholder="e.g. Main Branch"
                            value={form.branchname}
                            onChange={(e) => setForm({ ...form, branchname: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground">
                          Owner Name <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            className="pl-9 h-11 bg-background border-input focus:bg-background focus:ring-blue-600/20 rounded-lg transition-all"
                            placeholder="e.g. John Doe"
                            value={form.ownername}
                            onChange={(e) => setForm({ ...form, ownername: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground">Mobile Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            className="pl-9 h-11 bg-muted border-input text-muted-foreground rounded-lg font-medium cursor-not-allowed"
                            value={mobileNumber}
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground">
                          Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            type="text"
                            className="pl-9 h-11 bg-background border-input focus:bg-background focus:ring-blue-600/20 rounded-lg transition-all"
                            placeholder="Min 6 characters"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground">Billing Days</Label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none group-focus-within:text-blue-600 transition-colors">
                            <CalendarClock className="h-4 w-4" />
                          </div>
                          <Select
                            value={String(form.days)}
                            onValueChange={(v) => setForm({ ...form, days: Number(v) })}
                          >
                            <SelectTrigger className="pl-9 h-11 bg-background border-input focus:ring-blue-600/20 rounded-lg transition-all w-full relative z-10">
                              <SelectValue placeholder="Select billing cycle" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-900 border border-border shadow-xl z-[100]">
                              <SelectItem value="7">7 Days</SelectItem>
                              <SelectItem value="10">10 Days</SelectItem>
                              <SelectItem value="15">15 Days</SelectItem>
                              <SelectItem value="30">30 Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground">Village Name</Label>
                        <div className="relative group">
                          <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            className="pl-9 h-11 bg-background border-input focus:bg-background focus:ring-blue-600/20 rounded-lg transition-all"
                            placeholder="Enter village"
                            value={form.villagename}
                            onChange={(e) => setForm({ ...form, villagename: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground">Address</Label>
                        <div className="relative group">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                          <Input
                            className="pl-9 h-11 bg-background border-input focus:bg-background focus:ring-blue-600/20 rounded-lg transition-all"
                            placeholder="Full address"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-8 h-12 text-base font-semibold rounded-xl transition-all disabled:opacity-70 float-right bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {loading ? "Creating Dairy..." : "Create Dairy Account"}
                      </Button>
                      <div className="clear-both"></div>
                    </div>
                  </form>
                </div>
              )}

              {/* Step 4: Success — generated dairy ID + equipment checklist */}
              {step === 4 && (
                <div className="space-y-8 py-2">
                  <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 text-blue-700 font-semibold mb-4">
                      <CheckCircleIcon className="text-blue-600 text-2xl" />
                      Dairy successfully created!
                    </div>
                    <div className="bg-background p-4 rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Generated Dairy ID</Label>
                        <div className="flex items-center gap-3 mt-1.5">
                          <code className="text-2xl font-black text-foreground font-mono tracking-tight">
                            {createdUsername}
                          </code>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 h-10 px-4 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => handleCopy(String(createdUsername))}
                      >
                        <FileCopyIcon className="mr-2 h-4 w-4" />
                        Copy ID
                      </Button>
                    </div>
                  </div>

                  {isSubmitted ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div>
                        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                          <CheckCircle2 className="text-blue-600" />
                          Delivered Equipment
                        </h3>
                        <div className="bg-muted border border-border rounded-xl p-5">
                          {equipment.filter((e) => e.checked).length > 0 ? (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {equipment.filter((e) => e.checked).map((item, idx) => (
                                <li key={idx} className="text-sm bg-background px-3 py-2.5 rounded-lg border border-border shadow-sm">
                                  <div className="flex items-center gap-2 font-medium text-foreground">
                                    <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></div>
                                    {item.name}
                                  </div>
                                  <div className="mt-1.5 ml-4 flex gap-4 text-xs text-muted-foreground">
                                    <span>Qty: <span className="font-semibold text-foreground">{item.quantity || "—"}</span></span>
                                    <span>Serial: <span className="font-semibold text-foreground">{item.serialNumber || "—"}</span></span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-center py-6">
                              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground border border-border mb-3">
                                <Store size={24} />
                              </div>
                              <p className="text-sm font-medium text-muted-foreground">No equipment delivered yet</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsSubmitted(false)}
                          className="flex-1 h-12 text-base font-semibold rounded-xl"
                        >
                          Edit Equipment
                        </Button>
                        <Button
                          type="button"
                          onClick={resetFlow}
                          className="flex-1 h-12 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Create Another Dairy
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-foreground">Assign Equipment</h3>
                          <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                            {equipment.filter(e => e.checked).length} selected
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {equipment.map((item, idx) => (
                            <div
                              key={item.name}
                              className={`rounded-xl border p-3.5 transition-all ${
                                item.checked
                                  ? "bg-blue-50 border-blue-200 shadow-sm"
                                  : "bg-background border-border hover:bg-muted"
                              }`}
                            >
                              <label
                                htmlFor={`equip-${idx}`}
                                className="flex cursor-pointer items-center gap-3"
                              >
                                <Checkbox
                                  id={`equip-${idx}`}
                                  checked={item.checked}
                                  onCheckedChange={() => toggleEquipment(idx)}
                                />
                                <span className={`text-sm font-medium ${item.checked ? "text-blue-700" : "text-foreground"}`}>
                                  {item.name}
                                </span>
                              </label>
                              {item.checked && (
                                <div className="mt-2.5 grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Qty</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      placeholder="1"
                                      className="h-8 text-xs rounded-md bg-background border-blue-200"
                                      value={item.quantity}
                                      onChange={(e) => updateEquipmentField(idx, "quantity", e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Serial No.</Label>
                                    <Input
                                      type="text"
                                      placeholder="e.g. SN-001"
                                      className="h-8 text-xs rounded-md bg-background border-blue-200"
                                      value={item.serialNumber}
                                      onChange={(e) => updateEquipmentField(idx, "serialNumber", e.target.value)}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add new field */}
                        <div className="flex items-center gap-3 mt-4">
                          <Input
                            placeholder="Add custom equipment..."
                            className="h-11 bg-background border-border rounded-lg flex-1 focus:ring-blue-600/20"
                            value={newField}
                            onChange={(e) => setNewField(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addEquipmentField();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className="shrink-0 h-11 px-4 rounded-lg font-medium"
                            onClick={addEquipmentField}
                          >
                            <Plus size={18} className="mr-1.5" />
                            Add
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetFlow}
                          className="flex-1 h-12 text-base font-semibold rounded-xl order-2 sm:order-1"
                        >
                          Skip & Create Another
                        </Button>
                        <Button
                          type="button"
                          onClick={handleEquipmentSubmit}
                          className="flex-1 h-12 text-base font-semibold rounded-xl order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Confirm & Submit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateDairy;
