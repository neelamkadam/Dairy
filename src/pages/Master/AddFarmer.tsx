import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft } from 'lucide-react';
import { useAppSelector } from '@/redux/store';
import { useNavigate, useParams } from 'react-router-dom';
import { authApi } from '@/services/authApi';
import { userApi } from '@/services/userApi';
import { rateChartApi } from '@/services/rateChartApi';
import { normalizeFarmerId, formatFarmerIdForDisplay } from '@/utils/farmerIdUtils';
import { Validator } from '@/utils/validation';
import { toast } from 'react-toastify';

export const AddFarmer: React.FC = () => {
  const { t } = useTranslation();
  const branches = useAppSelector((state) => state.branch.branches);
  const navigate = useNavigate();
  const { farmerId: routeFarmerId } = useParams<{ farmerId?: string }>();
  
  const [formData, setFormData] = useState({
    VLC: '',
    farmerId: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
    milkType: '' as 'Cow' | 'Buffalo' | 'Both' | '',
    rateChart: '',
    cowRateChart: '',
    buffaloRateChart: '',
    panCard: '',
    aadhaarCard: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingFarmerData, setExistingFarmerData] = useState<any>(null);
  const [cowRateNames, setCowRateNames] = useState<string[]>([]);
  const [buffaloRateNames, setBuffaloRateNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (routeFarmerId && formData.VLC) {
      loadExistingFarmerData(routeFarmerId);
    }
  }, [routeFarmerId, formData.VLC]);

  useEffect(() => {
    if (formData.VLC && formData.milkType) {
      loadRateChartNames();
    }
  }, [formData.VLC, formData.milkType]);

  const loadExistingFarmerData = async (farmerId: string) => {
    try {
      const normalized = normalizeFarmerId(farmerId);
      const dairyId = parseInt(formData.VLC);
      
      const farmer = await userApi.getById(normalized, dairyId);
      
      if (farmer) {
        setIsEditMode(true);
        setExistingFarmerData(farmer);
        
        const displayId = formatFarmerIdForDisplay(farmer.username || farmerId);
        
        let cowRate = '';
        let buffaloRate = '';
        if (farmer.milkType === 'Both' && farmer.rateChart) {
          const match = farmer.rateChart.match(/Cow:\s*([^,]+),\s*Buffalo:\s*(.+)/);
          if (match) {
            cowRate = match[1].trim();
            buffaloRate = match[2].trim();
          }
        }
        
        setFormData({
          VLC: farmer.dairy_id?.toString() || formData.VLC,
          farmerId: displayId,
          fullName: farmer.fullName || '',
          phoneNumber: farmer.mobile_number || '',
          email: farmer.email || '',
          address: farmer.address || '',
          milkType: farmer.milkType || '',
          rateChart: farmer.milkType === 'Both' ? '' : (farmer.rateChart || ''),
          cowRateChart: cowRate,
          buffaloRateChart: buffaloRate,
          panCard: farmer.panCard || '',
          aadhaarCard: farmer.aadhaarCard || '',
          bankName: farmer.bankName || '',
          accountNumber: farmer.accountNumber || '',
          ifscCode: farmer.ifscCode || '',
        });
      }
    } catch (error) {
      console.error('Error loading farmer:', error);
      toast.error('Failed to load farmer data');
    }
  };

  const loadRateChartNames = async () => {
    try {
      const dairyId = parseInt(formData.VLC);
      console.log('Loading rate charts for dairy:', dairyId, 'milk type:', formData.milkType);
      
      if (formData.milkType === 'Both') {
        const { cowRates, buffaloRates } = await rateChartApi.getRateNamesForBoth(dairyId);
        console.log('Cow rates response:', cowRates);
        console.log('Buffalo rates response:', buffaloRates);
        const cowData = Array.isArray(cowRates?.data) ? cowRates.data.map((item: any) => typeof item === 'string' ? item : item.name) : [];
        const buffaloData = Array.isArray(buffaloRates?.data) ? buffaloRates.data.map((item: any) => typeof item === 'string' ? item : item.name) : [];
        console.log('Processed cow rate names:', cowData);
        console.log('Processed buffalo rate names:', buffaloData);
        setCowRateNames(cowData);
        setBuffaloRateNames(buffaloData);
        if (cowData.length === 0 || buffaloData.length === 0) {
          toast.info('No rate charts found for the selected VLC. Please create rate charts first.');
        }
      } else if (formData.milkType === 'Cow') {
        const response = await rateChartApi.getRateNames(dairyId, 'cow');
        console.log('Cow rate names response:', response);
        const data = Array.isArray(response?.data) ? response.data.map((item: any) => typeof item === 'string' ? item : item.name) : [];
        console.log('Processed cow rate names:', data);
        setCowRateNames(data);
        if (data.length === 0) {
          toast.info('No cow rate charts found for the selected VLC. Please create rate charts first.');
        }
      } else if (formData.milkType === 'Buffalo') {
        const response = await rateChartApi.getRateNames(dairyId, 'buffalo');
        console.log('Buffalo rate names response:', response);
        const data = Array.isArray(response?.data) ? response.data.map((item: any) => typeof item === 'string' ? item : item.name) : [];
        console.log('Processed buffalo rate names:', data);
        setBuffaloRateNames(data);
        if (data.length === 0) {
          toast.info('No buffalo rate charts found for the selected VLC. Please create rate charts first.');
        }
      }
    } catch (error: any) {
      console.error('Error loading rate charts:', error);
      toast.error(error?.response?.data?.message || 'Failed to load rate charts');
    }
  };

  const validateForm = () => {
    if (!formData.VLC) {
      toast.error('Please select VLC');
      return false;
    }

    const requiredCheck = Validator.validateRequired(formData.farmerId, 'Farmer ID');
    if (!requiredCheck.isValid) {
      toast.error(requiredCheck.error);
      return false;
    }

    const nameCheck = Validator.validateRequired(formData.fullName, 'Full Name');
    if (!nameCheck.isValid) {
      toast.error(nameCheck.error);
      return false;
    }

    const mobileCheck = Validator.validateMobile(formData.phoneNumber);
    if (!mobileCheck.isValid) {
      toast.error(mobileCheck.error);
      return false;
    }

    const emailCheck = Validator.validateEmail(formData.email);
    if (!emailCheck.isValid) {
      toast.error(emailCheck.error);
      return false;
    }

    const addressCheck = Validator.validateRequired(formData.address, 'Address');
    if (!addressCheck.isValid) {
      toast.error(addressCheck.error);
      return false;
    }

    if (!formData.milkType) {
      toast.error('Please select milk type');
      return false;
    }

    if (formData.milkType === 'Both') {
      if (!formData.cowRateChart || !formData.buffaloRateChart) {
        toast.error('Please select both cow and buffalo rate charts');
        return false;
      }
    } else if (!formData.rateChart) {
      toast.error('Please select rate chart');
      return false;
    }

    if (formData.accountNumber) {
      const accountCheck = Validator.validateAccountNumber(formData.accountNumber);
      if (!accountCheck.isValid) {
        toast.error(accountCheck.error);
        return false;
      }
    }

    if (formData.ifscCode) {
      const ifscCheck = Validator.validateIFSC(formData.ifscCode);
      if (!ifscCheck.isValid) {
        toast.error(ifscCheck.error);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const normalizedFarmerId = normalizeFarmerId(formData.farmerId);
      const dairyId = parseInt(formData.VLC);
      
      let rateChartValue = '';
      if (formData.milkType === 'Both') {
        rateChartValue = `Cow: ${formData.cowRateChart}, Buffalo: ${formData.buffaloRateChart}`;
      } else {
        rateChartValue = formData.rateChart;
      }
      
      if (isEditMode && existingFarmerData) {
        const updateData = {
          id: existingFarmerData.id,
          formatted_user_id: normalizedFarmerId,
          dairy_id: dairyId,
          username: normalizedFarmerId,
          fullName: formData.fullName,
          password: existingFarmerData.password || '',
          mobile_number: formData.phoneNumber,
          email: formData.email,
          organization: existingFarmerData.organization || '',
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          aadhaarCard: formData.aadhaarCard,
          panCard: formData.panCard,
          ifscCode: formData.ifscCode,
          rateChart: rateChartValue,
          milkType: formData.milkType,
          role: 'farmer',
          address: formData.address,
          confirm: true,
          is_mobile: true,
          profile_pic: existingFarmerData.profile_pic || '',
          createby: existingFarmerData.createby || 'admin'
        };
        
        const response = await authApi.updateUser(updateData);
        
        if (response.success) {
          toast.success('Farmer updated successfully');
          navigate(-1);
        } else {
          toast.error(response.message || 'Failed to update farmer');
        }
      } else {
        const apiData = {
          username: normalizedFarmerId,
          fullName: formData.fullName,
          mobile_number: formData.phoneNumber,
          email: formData.email,
          address: formData.address,
          milkType: formData.milkType,
          rateChart: rateChartValue,
          panCard: formData.panCard,
          aadhaarCard: formData.aadhaarCard,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          role: 'farmer',
          dairy_id: dairyId
        };
        
        const response = await authApi.registerFarmer(apiData);
        
        if (response.success) {
          toast.success(`Farmer ${formData.fullName} created successfully`);
          setFormData({
            VLC: '',
            farmerId: '',
            fullName: '',
            phoneNumber: '',
            email: '',
            address: '',
            milkType: '',
            rateChart: '',
            cowRateChart: '',
            buffaloRateChart: '',
            panCard: '',
            aadhaarCard: '',
            bankName: '',
            accountNumber: '',
            ifscCode: '',
          });
        } else {
          toast.error(response.message || 'Failed to create farmer');
        }
      }
    } catch (error: any) {
      console.error('Error saving farmer:', error);
      toast.error(error?.response?.data?.message || 'Failed to save farmer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 md:max-w-2xl mx-auto space-y-4 md:space-y-6">
      <div className="flex justify-between items-center gap-2 mt-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        </Button>
        <span className="font-semibold">{isEditMode ? t('edit_farmer') : t('add_farmer')}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-blue-600" 
          onClick={() => handleSubmit()}
          disabled={loading}
        >
        </Button>
      </div>

      <Card className='bg-white border-none'>
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 text-left">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('basic_information')}</h3>
              <div className="">
              <Label htmlFor="VLC" className='mb-1'>VLC<span className='text-red-600'>*</span></Label>
                  <Select value={formData.VLC} onValueChange={(value) => setFormData({...formData, VLC: value})}>
                    <SelectTrigger className='w-full bg-gray-50 border-gray-200'>
                      <SelectValue placeholder={t('select_vlc')} />
                    </SelectTrigger>
                    <SelectContent className='bg-white'>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                          {branch.username} - {branch.name} - {branch.branchName || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label htmlFor="farmerId" className='mt-3 mb-1'>{t('farmer_id')}<span className='text-red-600'>*</span></Label>
                  <Input
                    id="farmerId"
                    value={formData.farmerId}
                    placeholder={t('enter_farmer_id')}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, farmerId: value});
                    }}
                    className='border-gray-200'
                  />
                  <Label htmlFor="fullName" className='mt-3 mb-1'>{t('full_name')}<span className='text-red-600'>*</span></Label>
                  <Input
                    id="fullName"
                    placeholder={t('enter_full_name')}
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                    className='border-gray-200'
                  />

              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('contact_information')}</h3>
              <div className="">
                  <Label htmlFor="phoneNumber" className='mb-1'>{t('phone_number')}<span className='text-red-600'>*</span></Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      +91
                    </span>
                    <Input
                      id="phoneNumber"
                      placeholder={t('enter_phone_number')}
                      className="rounded border-gray-200"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const value = Validator.formatMobile(e.target.value);
                        setFormData({...formData, phoneNumber: value});
                      }}
                      required
                    />
                  </div>
                  <Label htmlFor="email" className='mt-3 mb-1'>{t('email_address_optional')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('enter_email_address')}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className='border-gray-200'
                  />

                <div className="md:col-span-2 mt-3 mb-1">
                  <Label htmlFor="address" className='mb-1'>{t('address')}<span className='text-red-600'>*</span></Label>
                  <Textarea
                    id="address"
                    placeholder={t('enter_complete_address')}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                      className='border-gray-200'
                  />
                </div>
              </div>
            </div>

            {/* Milk Type */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('milk_type')}<span className='text-red-600'>*</span></h3>
              {!formData.VLC && (
                <p className="text-sm text-amber-600 mb-2">{t('please_select_vlc_first')}</p>
              )}
              <RadioGroup
                value={formData.milkType}
                onValueChange={(value) => {
                  if (!formData.VLC) {
                    toast.warning('Please select VLC first');
                    return;
                  }
                  setFormData({...formData, milkType: value as any, rateChart: '', cowRateChart: '', buffaloRateChart: ''});
                }}
                disabled={!formData.VLC}
              >
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Cow" id="cow" className='border-gray-300' disabled={!formData.VLC} />
                    <Label htmlFor="cow" className={!formData.VLC ? 'text-gray-400' : ''}>{t('cow')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Buffalo" id="buffalo" className='border-gray-300' disabled={!formData.VLC} />
                    <Label htmlFor="buffalo" className={!formData.VLC ? 'text-gray-400' : ''}>{t('buffalo')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Both" id="both" className='border-gray-300' disabled={!formData.VLC} />
                    <Label htmlFor="both" className={!formData.VLC ? 'text-gray-400' : ''}>{t('both')}</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Rate Chart */}
            {formData.milkType === 'Both' ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cowRateChart" className='mb-1'>{t('cow_rate_chart')}<span className='text-red-600'>*</span></Label>
                  <Select value={formData.cowRateChart} onValueChange={(value) => setFormData({...formData, cowRateChart: value})}>
                    <SelectTrigger className='bg-gray-50 w-full border-gray-200'>
                      <SelectValue placeholder={t('select_cow_rate_chart')} />
                    </SelectTrigger>
                    <SelectContent className='bg-white'>
                      {cowRateNames.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="buffaloRateChart" className='mb-1'>{t('buffalo_rate_chart')}<span className='text-red-600'>*</span></Label>
                  <Select value={formData.buffaloRateChart} onValueChange={(value) => setFormData({...formData, buffaloRateChart: value})}>
                    <SelectTrigger className='bg-gray-50 w-full border-gray-200'>
                      <SelectValue placeholder={t('select_buffalo_rate_chart')} />
                    </SelectTrigger>
                    <SelectContent className='bg-white'>
                      {buffaloRateNames.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : formData.milkType ? (
              <div>
                <Label htmlFor="rateChart" className='mb-1'>{t('rate_chart')}<span className='text-red-600'>*</span></Label>
                <Select value={formData.rateChart} onValueChange={(value) => setFormData({...formData, rateChart: value})}>
                  <SelectTrigger className='bg-gray-50 w-full border-gray-200'>
                    <SelectValue placeholder={t('select_rate_chart')} />
                  </SelectTrigger>
                  <SelectContent className='bg-white'>
                    {(formData.milkType === 'Cow' ? cowRateNames : buffaloRateNames).map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {/* Personal Documents */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('personal_documents')}</h3>
              <div className="">
                  <Label htmlFor="panCard" className='mb-1'>{t('pan_card_optional')}</Label>
                  <Input
                    id="panCard"
                    placeholder={t('enter_pan_number')}
                    value={formData.panCard}
                    onChange={(e) => {
                      const value = Validator.formatPanCard(e.target.value);
                      setFormData({...formData, panCard: value});
                    }}
                    className='border-gray-200'
                  />
                  <Label htmlFor="aadhaarCard" className='mt-3 mb-1'>{t('aadhaar_card_optional')}</Label>
                  <Input
                    id="aadhaarCard"
                    placeholder={t('enter_aadhaar_number')}
                    value={formData.aadhaarCard}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setFormData({...formData, aadhaarCard: value});
                    }}
                    className='border-gray-200'
                  />
              </div>
            </div>

            {/* Bank Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('bank_details_optional')}</h3>
              <div className="">
                  <Label htmlFor="bankName" className='mb-1'>{t('bank_name')}</Label>
                  <Input
                    id="bankName"
                    placeholder={t('enter_bank_name')}
                    value={formData.bankName}
                    onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                    className='border-gray-200'
                  />
                  <Label htmlFor="accountNumber" className='mt-3 mb-1'>{t('account_number')}</Label>
                  <Input
                    id="accountNumber"
                    placeholder={t('enter_account_number')}
                    value={formData.accountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, accountNumber: value});
                    }}
                    className='border-gray-200'
                  />
                  <Label htmlFor="ifscCode" className='mt-3 mb-1'>{t('ifsc_code')}</Label>
                  <Input
                    id="ifscCode"
                    placeholder={t('enter_ifsc_code')}
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({...formData, ifscCode: e.target.value.toUpperCase()})}
                    className='border-gray-200'
                  />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
              disabled={loading}
            >
              {loading ? t('saving') : (isEditMode ? t('update_farmer') : t('create_farmer'))}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
