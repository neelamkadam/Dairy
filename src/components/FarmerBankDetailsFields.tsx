import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface FarmerBankValues {
  bankName: string;
  bname: string; // account holder name
  accountNumber: string;
  ifscCode: string;
  bankPassbookPhoto: string;
}

interface FarmerBankDetailsFieldsProps {
  values: FarmerBankValues;
  onChange: (patch: Partial<FarmerBankValues>) => void;
  passbookFile: File | null;
  passbookName: string;
  onPassbookUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPassbookRemove: () => void;
  onPassbookPreview: () => void;
  /** Keeps element ids unique when the form is rendered in more than one place. */
  idPrefix?: string;
}

// Bank Details section of Add Farmer; also used by the bank-details edit modal
// so both look and behave the same.
const FarmerBankDetailsFields = ({
  values,
  onChange,
  passbookFile,
  passbookName,
  onPassbookUpload,
  onPassbookRemove,
  onPassbookPreview,
  idPrefix = '',
}: FarmerBankDetailsFieldsProps) => {
  const { t } = useTranslation();
  const passbookInputId = `${idPrefix}bankPassbook`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
      <div>
        <Label htmlFor={`${idPrefix}bankName`} className="text-sm font-medium text-gray-700 mb-1.5 block">{t('bank_name')}</Label>
        <Input
          id={`${idPrefix}bankName`}
          placeholder={t('enter_bank_name')}
          value={values.bankName}
          onChange={(e) => onChange({ bankName: e.target.value })}
          className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm"
        />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}bname`} className="text-sm font-medium text-gray-700 mb-1.5 block">{t('account_holder_name', 'Account Holder Name')}</Label>
        <Input
          id={`${idPrefix}bname`}
          placeholder={t('enter_account_holder_name', 'Enter account holder name')}
          value={values.bname}
          maxLength={100}
          onChange={(e) => onChange({ bname: e.target.value })}
          className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm"
        />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}accountNumber`} className="text-sm font-medium text-gray-700 mb-1.5 block">{t('account_number')}</Label>
        <Input
          id={`${idPrefix}accountNumber`}
          placeholder={t('enter_account_number')}
          value={values.accountNumber}
          onChange={(e) => onChange({ accountNumber: e.target.value.replace(/\D/g, '') })}
          className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm"
        />
      </div>

      <div>
        <Label htmlFor={`${idPrefix}ifscCode`} className="text-sm font-medium text-gray-700 mb-1.5 block">{t('ifsc_code')}</Label>
        <Input
          id={`${idPrefix}ifscCode`}
          placeholder={t('enter_ifsc_code')}
          value={values.ifscCode}
          onChange={(e) => onChange({ ifscCode: e.target.value.toUpperCase() })}
          className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm uppercase"
        />
      </div>

      <div>
        <Label htmlFor={passbookInputId} className="text-sm font-medium text-gray-700 mb-1.5 block">{t('bank_passbook_cheque')}</Label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          onChange={onPassbookUpload}
          style={{ display: 'none' }}
          id={passbookInputId}
        />
        {passbookFile || values.bankPassbookPhoto ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-sm">
            {values.bankPassbookPhoto && !passbookFile ? (
              <a
                href={values.bankPassbookPhoto}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 underline truncate"
              >
                {passbookName || 'View uploaded document'}
              </a>
            ) : (
              <span className="text-sm font-medium text-gray-700 truncate">{passbookName || 'Uploaded document'}</span>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPassbookPreview}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 px-3 rounded-lg"
              >
                {t('preview')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(passbookInputId)?.click()}
                className="h-8 px-3 rounded-lg border-gray-200"
              >
                {t('replace')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPassbookRemove}
                className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-3 rounded-lg"
              >
                {t('remove')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById(passbookInputId)?.click()}
            className="w-full flex items-center justify-center gap-2 border-gray-200 h-11 rounded-xl bg-gray-50/50 hover:bg-gray-50 text-gray-700"
          >
            <Upload className="h-4 w-4" />
            {t('upload_bank_passbook_cheque')}
          </Button>
        )}
        <p className="text-xs text-gray-500 mt-2">{t('accepted_formats_passbook')}</p>
      </div>
    </div>
  );
};

export default FarmerBankDetailsFields;
