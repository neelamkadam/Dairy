import React, { useState, useEffect } from 'react';
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
      
      if (formData.milkType === 'Both') {
        const { cowRates, buffaloRates } = await rateChartApi.getRateNamesForBoth(dairyId);
        setCowRateNames(cowRates?.data || []);
        setBuffaloRateNames(buffaloRates?.data || []);
      } else if (formData.milkType === 'Cow') {
        const response = await rateChartApi.getRateNames(dairyId, 'cow');
        setCowRateNames(response?.data || []);
      } else if (formData.milkType === 'Buffalo') {
        const response = await rateChartApi.getRateNames(dairyId, 'buffalo');
        setBuffaloRateNames(response?.data || []);
      }
    } catch (error) {
      console.error('Error loading rate charts:', error);
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center gap-2 mt-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} strokeWidth={1.25} />
        </Button>
        <span className="font-semibold">{isEditMode ? 'Edit Farmer' : 'Add Farmer'}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-blue-600" 
          onClick={() => handleSubmit()}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <Card className='bg-white border-none'>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8 text-left">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="">
              <Label htmlFor="VLC" className='mb-1'>VLC<span className='text-red-600'>*</span></Label>
                  <Select value={formData.VLC} onValueChange={(value) => setFormData({...formData, VLC: value})}>
                    <SelectTrigger className='w-full bg-gray-50 border-gray-200'>
                      <SelectValue placeholder="Select VLC" />
                    </SelectTrigger>
                    <SelectContent className='bg-white'>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                          {branch.username} - {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label htmlFor="farmerId" className='mt-3 mb-1'>Farmer ID<span className='text-red-600'>*</span></Label>
                  <Input
                    id="farmerId"
                    value={formData.farmerId}
                    placeholder="Enter farmer ID"
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, farmerId: value});
                    }}
                    className='border-gray-200'
                  />
                  <Label htmlFor="fullName" className='mt-3 mb-1'>Full Name<span className='text-red-600'>*</span></Label>
                  <Input
                    id="fullName"
                    placeholder="Enter farmer's full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                    className='border-gray-200'
                  />

              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="">
                  <Label htmlFor="phoneNumber" className='mb-1'>Phone Number<span className='text-red-600'>*</span></Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      +91
                    </span>
                    <Input
                      id="phoneNumber"
                      placeholder="Enter phone number"
                      className="rounded border-gray-200"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const value = Validator.formatMobile(e.target.value);
                        setFormData({...formData, phoneNumber: value});
                      }}
                      required
                    />
                  </div>
                  <Label htmlFor="email" className='mt-3 mb-1'>Email Address (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className='border-gray-200'
                  />

                <div className="md:col-span-2 mt-3 mb-1">
                  <Label htmlFor="address" className='mb-1'>Address<span className='text-red-600'>*</span></Label>
                  <Textarea
                    id="address"
                    placeholder="Enter complete address"
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
              <h3 className="text-lg font-semibold mb-4">Milk Type<span className='text-red-600'>*</span></h3>
              <RadioGroup
                value={formData.milkType}
                onValueChange={(value) => setFormData({...formData, milkType: value as any, rateChart: '', cowRateChart: '', buffaloRateChart: ''})}
              >
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Cow" id="cow" className='border-gray-300' />
                    <Label htmlFor="cow">Cow</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Buffalo" id="buffalo" className='border-gray-300' />
                    <Label htmlFor="buffalo">Buffalo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Both" id="both" className='border-gray-300' />
                    <Label htmlFor="both">Both</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Rate Chart */}
            {formData.milkType === 'Both' ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cowRateChart" className='mb-1'>Cow Rate Chart<span className='text-red-600'>*</span></Label>
                  <Select value={formData.cowRateChart} onValueChange={(value) => setFormData({...formData, cowRateChart: value})}>
                    <SelectTrigger className='bg-gray-50 w-full border-gray-200'>
                      <SelectValue placeholder="Select cow rate chart" />
                    </SelectTrigger>
                    <SelectContent className='bg-white'>
                      {cowRateNames.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="buffaloRateChart" className='mb-1'>Buffalo Rate Chart<span className='text-red-600'>*</span></Label>
                  <Select value={formData.buffaloRateChart} onValueChange={(value) => setFormData({...formData, buffaloRateChart: value})}>
                    <SelectTrigger className='bg-gray-50 w-full border-gray-200'>
                      <SelectValue placeholder="Select buffalo rate chart" />
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
                <Label htmlFor="rateChart" className='mb-1'>Rate Chart<span className='text-red-600'>*</span></Label>
                <Select value={formData.rateChart} onValueChange={(value) => setFormData({...formData, rateChart: value})}>
                  <SelectTrigger className='bg-gray-50 w-full border-gray-200'>
                    <SelectValue placeholder="Select rate chart" />
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
              <h3 className="text-lg font-semibold mb-4">Personal Documents</h3>
              <div className="">
                  <Label htmlFor="panCard" className='mb-1'>PAN Card (Optional)</Label>
                  <Input
                    id="panCard"
                    placeholder="ENTER PAN NUMBER"
                    value={formData.panCard}
                    onChange={(e) => {
                      const value = Validator.formatPanCard(e.target.value);
                      setFormData({...formData, panCard: value});
                    }}
                    className='border-gray-200'
                  />
                  <Label htmlFor="aadhaarCard" className='mt-3 mb-1'>Aadhaar Card (Optional)</Label>
                  <Input
                    id="aadhaarCard"
                    placeholder="Enter Aadhaar number"
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
              <h3 className="text-lg font-semibold mb-4">Bank Details (Optional)</h3>
              <div className="">
                  <Label htmlFor="bankName" className='mb-1'>Bank Name</Label>
                  <Input
                    id="bankName"
                    placeholder="Enter bank name"
                    value={formData.bankName}
                    onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                    className='border-gray-200'
                  />
                  <Label htmlFor="accountNumber" className='mt-3 mb-1'>Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Enter account number"
                    value={formData.accountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, accountNumber: value});
                    }}
                    className='border-gray-200'
                  />
                  <Label htmlFor="ifscCode" className='mt-3 mb-1'>IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    placeholder="ENTER IFSC CODE"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({...formData, ifscCode: e.target.value.toUpperCase()})}
                    className='border-gray-200'
                  />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEditMode ? 'Update Farmer' : 'Create Farmer')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
