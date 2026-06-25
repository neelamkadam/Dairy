import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { createDairyApi } from "@/services/createDairyApi";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileCopyIcon from "@mui/icons-material/FileCopy";

const ROLE = "Dairyadmin";

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
  };

  const createdUsername =
    createdUser?.username ?? createdUser?.user_name ?? createdUser?.userName ?? "-";
  const createdPassword =
    createdUser?.password ?? createdUser?.plain_password ?? form.password;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-2xl font-bold text-gray-800">Create Dairy</CardTitle>
            <p className="text-gray-600 text-sm mt-1">
              Verify the owner's mobile number, then set up a new dairy.
            </p>

            {/* Stepper */}
            <div className="flex items-center mt-4">
              {STEPS.map((s, idx) => {
                const active = step === s.id;
                const done = step > s.id;
                return (
                  <div key={s.id} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          done
                            ? "bg-green-600 text-white"
                            : active
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {done ? "✓" : s.id}
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          active ? "text-blue-700" : done ? "text-green-700" : "text-gray-400"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`mx-2 h-0.5 flex-1 ${step > s.id ? "bg-green-500" : "bg-gray-200"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Step 1: Mobile number */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mobile" className="text-sm font-medium text-gray-700">
                    Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    className="bg-gray-50 border-gray-200"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </Button>
              </form>
            )}

            {/* Step 2: Verify OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <p className="text-sm text-gray-600">
                  Enter the OTP sent to <span className="font-semibold">{mobileNumber}</span>.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                    OTP <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    className="bg-gray-50 border-gray-200 tracking-[0.5em] text-center text-lg font-semibold"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-blue-600 hover:text-blue-700 px-0"
                    onClick={handleResendOtp}
                    disabled={loading}
                  >
                    Resend OTP
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-gray-500 px-0"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    Change number
                  </Button>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
              </form>
            )}

            {/* Step 3: Dairy details */}
            {step === 3 && (
              <div className="space-y-6">
                {existingDairies.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">
                      This number already has {existingDairies.length} dair
                      {existingDairies.length > 1 ? "ies" : "y"}:
                    </p>
                    <ul className="space-y-1">
                      {existingDairies.map((d: any, i: number) => (
                        <li key={i} className="text-sm text-amber-900">
                          • {d.name ?? d.dairy_name ?? "Dairy"}
                          {d.branchname ? ` — ${d.branchname}` : ""}
                          {d.username ? ` (${d.username})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <form onSubmit={handleCreateBranch} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Dairy Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className="bg-gray-50 border-gray-200"
                        placeholder="e.g. My Dairy"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Branch Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className="bg-gray-50 border-gray-200"
                        placeholder="e.g. Main Branch"
                        value={form.branchname}
                        onChange={(e) => setForm({ ...form, branchname: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Owner Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className="bg-gray-50 border-gray-200"
                        placeholder="e.g. John Doe"
                        value={form.ownername}
                        onChange={(e) => setForm({ ...form, ownername: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Mobile Number</Label>
                      <Input
                        className="bg-gray-100 border-gray-200 text-gray-500"
                        value={mobileNumber}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        className="bg-gray-50 border-gray-200"
                        placeholder="Min 6 characters"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Billing Days</Label>
                      <Input
                        type="number"
                        min={1}
                        className="bg-gray-50 border-gray-200"
                        value={form.days}
                        onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Village Name</Label>
                      <Input
                        className="bg-gray-50 border-gray-200"
                        placeholder="Village"
                        value={form.villagename}
                        onChange={(e) => setForm({ ...form, villagename: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Address</Label>
                      <Input
                        className="bg-gray-50 border-gray-200"
                        placeholder="Full address"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
                  >
                    {loading ? "Creating Dairy..." : "Create Dairy"}
                  </Button>
                </form>
              </div>
            )}

            {/* Step 4: Success / credentials */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 font-medium mb-3">
                    <CheckCircleIcon className="text-green-600" />
                    Dairy created successfully
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Share these manager credentials with the owner. The password is shown only once.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600">Manager Username</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-lg font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded">
                          {createdUsername}
                        </code>
                        <FileCopyIcon
                          className="text-gray-500 cursor-pointer hover:text-blue-600 transition-colors"
                          fontSize="small"
                          onClick={() => handleCopy(String(createdUsername))}
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-green-200">
                      <Label className="text-xs text-gray-600">Password</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-lg font-bold text-green-700 bg-green-100 px-3 py-1 rounded">
                          {createdPassword}
                        </code>
                        <FileCopyIcon
                          className="text-gray-500 cursor-pointer hover:text-blue-600 transition-colors"
                          fontSize="small"
                          onClick={() => handleCopy(String(createdPassword))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={resetFlow}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
                >
                  Create Another Dairy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateDairy;
