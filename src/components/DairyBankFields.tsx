import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DairyBankValues {
  bank_name: string;
  account_holder: string;
  account_number: string;
  ifsc_code: string;
}

export const EMPTY_DAIRY_BANK: DairyBankValues = { bank_name: "", account_holder: "", account_number: "", ifsc_code: "" };

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// null when valid, else the message to show.
export const validateDairyBank = (v: DairyBankValues): string | null => {
  const account = v.account_number.trim();
  if (account && !/^\d{9,18}$/.test(account)) return "Account number must be 9-18 digits";
  const ifsc = v.ifsc_code.trim();
  if (ifsc && !IFSC_PATTERN.test(ifsc)) return "Invalid IFSC code format";
  return null;
};

interface DairyBankFieldsProps {
  values: DairyBankValues;
  onChange: (patch: Partial<DairyBankValues>) => void;
  idPrefix?: string;
  inputClassName?: string;
}

// VLC bank details (used for the VLC commission NEFT) on Create Dairy and its edit dialog.
const DairyBankFields = ({ values, onChange, idPrefix = "dairy_", inputClassName }: DairyBankFieldsProps) => {
  const { t } = useTranslation();
  const inputClass =
    inputClassName ||
    "h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg transition-all text-sm shadow-sm";
  const field = (key: keyof DairyBankValues, label: string, placeholder: string, transform?: (v: string) => string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${idPrefix}${key}`} className="text-sm font-semibold text-slate-700">{label}</Label>
      <Input
        id={`${idPrefix}${key}`}
        className={inputClass}
        placeholder={placeholder}
        value={values[key]}
        onChange={(e) => onChange({ [key]: transform ? transform(e.target.value) : e.target.value })}
      />
    </div>
  );

  return (
    <div className="pt-3 border-t border-slate-100">
      <Label className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
        <Landmark className="h-4 w-4 text-emerald-600" />
        {t("vlc_bank_details", "VLC Bank Details")} <span className="text-slate-500 font-normal">{t("optional", "(optional)")}</span>
      </Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("bank_name", t("bank_name", "Bank Name"), t("enter_bank_name", "Enter bank name"))}
        {field("account_holder", t("account_holder_name", "Account Holder Name"), t("enter_account_holder_name", "Enter account holder name"))}
        {field("account_number", t("account_number", "Account Number"), t("enter_account_number", "Enter account number"), (v) => v.replace(/\D/g, ""))}
        {field("ifsc_code", t("ifsc_code", "IFSC Code"), t("enter_ifsc_code", "Enter IFSC code"), (v) => v.toUpperCase().replace(/\s/g, ""))}
      </div>
    </div>
  );
};

export default DairyBankFields;
