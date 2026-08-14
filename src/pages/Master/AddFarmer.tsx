import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Upload, Download, ChevronDown, Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/redux/store';
import { useNavigate, useParams } from 'react-router-dom';
import { authApi } from '@/services/authApi';
import { userApi } from '@/services/userApi';
import { rateChartApi } from '@/services/rateChartApi';
import { normalizeFarmerId, formatFarmerIdForDisplay } from '@/utils/farmerIdUtils';
import { Validator } from '@/utils/validation';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { deleteFarmerApi } from '@/services/deleteFarmerApi';
import { adminApi } from '@/services/adminApi';
import * as XLSX from 'xlsx';

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
    bankPassbookPhoto: '',
  });

  const [bankPassbookFile, setBankPassbookFile] = useState<File | null>(null);
  const [bankPassbookName, setBankPassbookName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingFarmerData, setExistingFarmerData] = useState<any>(null);
  const [cowRateNames, setCowRateNames] = useState<string[]>([]);
  const [buffaloRateNames, setBuffaloRateNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [vlcOpen, setVlcOpen] = useState(false);
  const [vlcSearch, setVlcSearch] = useState('');
  const vlcSearchRef = useRef<HTMLInputElement>(null);
  const vlcWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vlcWrapperRef.current && !vlcWrapperRef.current.contains(event.target as Node)) {
        setVlcOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const downloadTemplate = () => {
    const template = [
      {
        "Farmer ID": "0001",
        "Full Name": "John Doe",
        "Mobile Number": "9876543210",
        "Email": "john@example.com",
        "Address": "123 Farm Street, Village",
        "Milk Type": "Cow",
        "Rate Chart": "Rate Chart 1",
        "PAN Card": "ABCDE1234F",
        "Aadhaar Card": "123456789012",
        "Bank Name": "State Bank",
        "Account Number": "1234567890",
        "IFSC Code": "SBIN0001234",
        "VLC ID": branches?.[0]?.username || "500001"
      },
      {
        "Farmer ID": "0002",
        "Full Name": "Jane Smith",
        "Mobile Number": "9876543211",
        "Email": "jane@example.com",
        "Address": "456 Farm Road, Village",
        "Milk Type": "Both",
        "Rate Chart": "Cow: Rate Chart 1, Buffalo: Rate Chart 2",
        "PAN Card": "XYZAB5678C",
        "Aadhaar Card": "987654321098",
        "Bank Name": "HDFC Bank",
        "Account Number": "9876543210",
        "IFSC Code": "HDFC0001234",
        "VLC ID": branches?.[0]?.username || "500001"
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Farmers Template");
    XLSX.writeFile(wb, "Farmers_Bulk_Upload_Template.xlsx");
    toast.success("Template downloaded successfully");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const farmers = jsonData.map((row: any) => {
        const farmerId = String(row["Farmer ID"] || row["username"] || "").padStart(4, "0");
        const milkTypeRaw = (row["Milk Type"] || row["milkType"] || "").toLowerCase();
        const milkType = milkTypeRaw === "both" ? "Both" : milkTypeRaw.charAt(0).toUpperCase() + milkTypeRaw.slice(1);
        
        const vlcIdRaw = String(row["VLC ID"] || row["dairy_id"] || "");
        const vlcIdNum = parseInt(vlcIdRaw);
        const branch = branches?.find(b => b.username === vlcIdRaw || b.branch_id === vlcIdNum);
        
        if (!branch) {
          throw new Error(`VLC ID ${vlcIdRaw} not found in your branches`);
        }
        
        return {
          username: farmerId,
          fullName: row["Full Name"] || row["fullName"],
          mobile_number: String(row["Mobile Number"] || row["mobile_number"] || ""),
          email: row["Email"] || row["email"] || "",
          address: row["Address"] || row["address"],
          milkType: milkType,
          rateChart: row["Rate Chart"] || row["rateChart"],
          panCard: row["PAN Card"] || row["panCard"] || "",
          aadhaarCard: String(row["Aadhaar Card"] || row["aadhaarCard"] || ""),
          bankName: row["Bank Name"] || row["bankName"] || "",
          accountNumber: String(row["Account Number"] || row["accountNumber"] || ""),
          ifscCode: row["IFSC Code"] || row["ifscCode"] || "",
          role: "farmer",
          dairy_id: branch.branch_id
        };
      });

      const response = await authApi.bulkRegisterFarmers({ farmers });

      if (response.success) {
        toast.success(`${response.message}. ${response.successful} successful, ${response.failed} failed.`);
        if (response.errors && response.errors.length > 0) {
          console.error("Bulk upload errors:", response.errors);
          toast.warning(`Some farmers failed to upload. Check console for details.`);
        }
      } else {
        toast.error(response.message || "Bulk upload failed");
      }
    } catch (error: any) {
      console.error("Bulk upload error:", error);
      toast.error(error?.response?.data?.message || "Failed to upload farmers");
    } finally {
      setBulkUploading(false);
      e.target.value = "";
    }
  };

  const handleBankPassbookUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image (JPG/PNG) or PDF file');
      e.target.value = '';
      return;
    }

    setBankPassbookFile(file);
    setBankPassbookName(file.name);
    e.target.value = '';
  };

  const removeBankPassbook = () => {
    setBankPassbookFile(null);
    setBankPassbookName('');
    setFormData((prev) => ({ ...prev, bankPassbookPhoto: '' }));
  };

  const previewBankPassbook = () => {
    if (bankPassbookFile) {
      const objectUrl = URL.createObjectURL(bankPassbookFile);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      // Release the object URL after the new tab has had time to load it
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } else if (formData.bankPassbookPhoto) {
      window.open(formData.bankPassbookPhoto, '_blank', 'noopener,noreferrer');
    }
  };

  const uploadBankPassbook = async (): Promise<string> => {
    if (!bankPassbookFile) return formData.bankPassbookPhoto;

    const uploadData = new FormData();
    uploadData.append('image', bankPassbookFile);
    uploadData.append('folder', 'bank_passbooks');
    uploadData.append('dairy_id', formData.VLC);
    uploadData.append('ref_id', normalizeFarmerId(formData.farmerId));
    uploadData.append('ref_type', 'bank_passbook');

    const uploadRes = await adminApi.uploadImage(uploadData);
    return uploadRes.data?.url || '';
  };

  useEffect(() => {
    if (routeFarmerId && formData.VLC) {
      loadExistingFarmerData(routeFarmerId);
    }
  }, [routeFarmerId, formData.VLC]);
  useEffect(() => {
    if (formData.VLC && formData.farmerId && formData.farmerId.length >= 1) {
      // If we're in edit mode and the farmer ID has changed from the existing one,
      // reset edit mode and check for the new farmer
      if (isEditMode && existingFarmerData) {
        const currentNormalizedId = normalizeFarmerId(formData.farmerId);
        const existingNormalizedId = existingFarmerData.username;
        
        if (currentNormalizedId !== existingNormalizedId) {
          // ID has changed, reset edit mode first
          setIsEditMode(false);
          setExistingFarmerData(null);
        }
      }
      
      const timer = setTimeout(() => {
        checkExistingFarmer();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.VLC, formData.farmerId]);

  useEffect(() => {
    if (formData.VLC && formData.milkType) {
      loadRateChartNames();
    }
  }, [formData.VLC, formData.milkType]);

  const checkExistingFarmer = async () => {
    try {
      const normalized = normalizeFarmerId(formData.farmerId);
      const dairyId = parseInt(formData.VLC);
      
      const farmer = await userApi.getById(normalized, dairyId);
      
      if (farmer) {
        setIsEditMode(true);
        setExistingFarmerData(farmer);
        
        let cowRate = '';
        let buffaloRate = '';
        if (farmer.milkType === 'Both' && farmer.rateChart) {
          const match = farmer.rateChart.match(/Cow:\s*([^,]+),\s*Buffalo:\s*(.+)/);
          if (match) {
            cowRate = match[1].trim();
            buffaloRate = match[2].trim();
          }
        }
        
        setFormData(prev => ({
          ...prev,
          fullName: farmer.fullName || '',
          phoneNumber: farmer.mobile_number || '',
          email: (farmer as any).email || '',
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
          bankPassbookPhoto: farmer.bankPassbookPhoto || '',
        }));
        setBankPassbookFile(null);
        setBankPassbookName(farmer.bankPassbookPhoto ? 'Uploaded document' : '');

        toast.info('Farmer found! Data loaded for editing.');
      } else {
        setIsEditMode(false);
        setExistingFarmerData(null);
      }
    } catch (error) {
      setIsEditMode(false);
      setExistingFarmerData(null);
    }
  };

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
          email: (farmer as any).email || '',
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
          bankPassbookPhoto: farmer.bankPassbookPhoto || '',
        });
        setBankPassbookFile(null);
        setBankPassbookName(farmer.bankPassbookPhoto ? 'Uploaded document' : '');
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

  const handleDeleteFarmer = async () => {
    if (!isEditMode || !existingFarmerData) {
      toast.error('No farmer selected for deletion');
      return;
    }

    setShowDeleteModal(true);
  };

  const confirmDeleteFarmer = async () => {
    setLoading(true);
    setShowDeleteModal(false);
    try {
      const normalizedFarmerId = normalizeFarmerId(formData.farmerId);
      const dairyId = formData.VLC;

      const response = await deleteFarmerApi.deleteFarmer(dairyId, normalizedFarmerId);

      if (response.success) {
        toast.success(response.message || 'Farmer deleted successfully');
        if (response.deleted_collections) {
          toast.info(`${response.deleted_collections} collection records were also deleted`);
        }
        setIsEditMode(false);
        setExistingFarmerData(null);
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
          bankPassbookPhoto: '',
        });
        setBankPassbookFile(null);
        setBankPassbookName('');
        navigate(-1);
      } else {
        toast.error(response.message || 'Failed to delete farmer');
      }
    } catch (error: any) {
      console.error('Error deleting farmer:', error);
      toast.error(error?.message || 'Failed to delete farmer');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    console.log('handleSubmit called', { isEditMode, existingFarmerData });
    if (e) e.preventDefault();
    
    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }
    
    console.log('Validation passed, proceeding...');
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

      let bankPassbookUrl = formData.bankPassbookPhoto;
      if (bankPassbookFile) {
        try {
          bankPassbookUrl = await uploadBankPassbook();
        } catch (uploadError) {
          console.error('Bank passbook upload error:', uploadError);
          toast.error('Failed to upload bank passbook. Please try again.');
          setLoading(false);
          return;
        }
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
          bankPassbookPhoto: bankPassbookUrl,
          rateChart: rateChartValue,
          milkType: formData.milkType as "Cow" | "Buffalo" | "Both",
          role: 'farmer',
          address: formData.address,
          confirm: true,
          is_mobile: true,
          profile_pic: existingFarmerData.profile_pic || '',
          createby: existingFarmerData.createby || 'admin'
        };
        
        console.log('Update Data:', updateData);
        const response = await authApi.updateUser(updateData);
        console.log('Update Response:', response);
        
        if (response.success) {
          toast.success('Farmer updated successfully');
          // Reset form and reload
          setIsEditMode(false);
          setExistingFarmerData(null);
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
            bankPassbookPhoto: '',
          });
          setBankPassbookFile(null);
          setBankPassbookName('');
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
          milkType: formData.milkType as "Cow" | "Buffalo" | "Both",
          rateChart: rateChartValue,
          panCard: formData.panCard,
          aadhaarCard: formData.aadhaarCard,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          bankPassbookPhoto: bankPassbookUrl,
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
            bankPassbookPhoto: '',
          });
          setBankPassbookFile(null);
          setBankPassbookName('');
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
    <div className="w-full px-4 md:max-w-7xl mx-auto space-y-4 md:space-y-6 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-2">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 hover:bg-gray-100 rounded-xl mr-1">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
            {isEditMode ? t('edit_farmer') : t('add_farmer')}
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="text-blue-600 border-blue-200 bg-white hover:bg-blue-50 flex items-center gap-1.5 rounded-lg h-9 px-4 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Template
          </Button>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="excel-upload"
            disabled={bulkUploading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('excel-upload')?.click()}
            className="text-emerald-600 border-emerald-200 bg-white hover:bg-emerald-50 flex items-center gap-1.5 rounded-lg h-9 px-4 shadow-sm"
            disabled={bulkUploading}
          >
            <Upload className="h-4 w-4" />
            {bulkUploading ? 'Uploading...' : 'Bulk Upload'}
          </Button>
        </div>
      </div>

      <Card className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="text-left">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              {/* Left Column */}
              <div className="w-full lg:w-1/2 space-y-8 md:space-y-10">
                {/* Basic Information */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-serif mb-5">{t('basic_information')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div>
                  <Label htmlFor="VLC" className="text-sm font-medium text-gray-700 mb-1.5 block">VLC <span className="text-red-500">*</span></Label>
                  {(() => {
                    const selectedBranch = branches?.find((b) => b.branch_id.toString() === formData.VLC);
                    const filtered = branches?.filter((b) => {
                      const q = vlcSearch.toLowerCase();
                      return (
                        !q ||
                        String(b.username || "").toLowerCase().includes(q) ||
                        String(b.branch_id || "").toLowerCase().includes(q) ||
                        String(b.name || "").toLowerCase().includes(q) ||
                        String(b.branchName || "").toLowerCase().includes(q)
                      );
                    }) || [];
                    return (
                      <div ref={vlcWrapperRef} className="relative w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setVlcOpen((prev) => !prev);
                            if (!vlcOpen) setTimeout(() => vlcSearchRef.current?.focus(), 0);
                            else setVlcSearch("");
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 h-11 text-sm rounded-xl border bg-white transition-all shadow-sm",
                            vlcOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200 hover:border-blue-300"
                          )}
                        >
                          <span className={selectedBranch ? "text-gray-900 font-medium truncate" : "text-gray-500"}>
                            {selectedBranch
                              ? `${selectedBranch.username} - ${selectedBranch.branchName || selectedBranch.name}`
                              : t('select_vlc')}
                          </span>
                          <ChevronDown
                            className={cn("h-4 w-4 text-gray-400 flex-shrink-0 ml-2 transition-transform duration-150", vlcOpen && "rotate-180")}
                          />
                        </button>

                        {vlcOpen && (
                          <div
                            className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden"
                            style={{ top: "100%", left: 0 }}
                          >
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <input
                                ref={vlcSearchRef}
                                value={vlcSearch}
                                onChange={(e) => setVlcSearch(e.target.value)}
                                placeholder="Search VLC..."
                                className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400 h-8"
                              />
                              {vlcSearch && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); setVlcSearch(""); vlcSearchRef.current?.focus(); }}
                                  className="text-gray-400 hover:text-gray-600 text-sm leading-none"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1">
                              {filtered.length === 0 ? (
                                <div className="px-3 py-4 text-center text-sm text-gray-400">No VLC branches found</div>
                              ) : (
                                filtered.map((branch) => {
                                  if (!branch?.branch_id) return null;
                                  const val = branch.branch_id.toString();
                                  const isSelected = val === formData.VLC;
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => {
                                        setFormData({...formData, VLC: val});
                                        setVlcOpen(false);
                                        setVlcSearch("");
                                      }}
                                      className={cn(
                                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between",
                                        isSelected ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"
                                      )}
                                    >
                                      <span className="truncate">{branch.username} - {branch.branchName || branch.name}</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>


                <div>
                  <Label htmlFor="farmerId" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('farmer_id')} <span className="text-red-500">*</span></Label>
                  <Input
                    id="farmerId"
                    value={formData.farmerId}
                    placeholder={t('enter_farmer_id')}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, farmerId: value});
                    }}
                    className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>
                
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('full_name')} <span className="text-red-500">*</span></Label>
                  <Input
                    id="fullName"
                    placeholder={t('enter_full_name')}
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                    className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                    <span>{t('milk_type')} <span className="text-red-500">*</span></span>
                    {!formData.VLC && (
                      <span className="text-red-500 text-xs font-normal">({t('please_select_vlc_first')})</span>
                    )}
                  </Label>
                  <div className="flex items-center h-11">
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
                      className="w-full"
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex items-center space-x-2.5">
                          <RadioGroupItem value="Cow" id="cow" className="border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" disabled={!formData.VLC} />
                          <Label htmlFor="cow" className={`text-sm font-medium ${!formData.VLC ? 'text-gray-400' : 'text-gray-700'}`}>{t('cow')}</Label>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          <RadioGroupItem value="Buffalo" id="buffalo" className="border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" disabled={!formData.VLC} />
                          <Label htmlFor="buffalo" className={`text-sm font-medium ${!formData.VLC ? 'text-gray-400' : 'text-gray-700'}`}>{t('buffalo')}</Label>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          <RadioGroupItem value="Both" id="both" className="border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" disabled={!formData.VLC} />
                          <Label htmlFor="both" className={`text-sm font-medium ${!formData.VLC ? 'text-gray-400' : 'text-gray-700'}`}>{t('both')}</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Rate Chart */}
                {formData.milkType === 'Both' ? (
                  <>
                    <div>
                      <Label htmlFor="cowRateChart" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('cow_rate_chart')} <span className="text-red-500">*</span></Label>
                      <Select value={formData.cowRateChart} onValueChange={(value) => setFormData({...formData, cowRateChart: value})}>
                        <SelectTrigger className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm w-full">
                          <SelectValue placeholder={t('select_cow_rate_chart')} />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {cowRateNames.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="buffaloRateChart" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('buffalo_rate_chart')} <span className="text-red-500">*</span></Label>
                      <Select value={formData.buffaloRateChart} onValueChange={(value) => setFormData({...formData, buffaloRateChart: value})}>
                        <SelectTrigger className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm w-full">
                          <SelectValue placeholder={t('select_buffalo_rate_chart')} />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {buffaloRateNames.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : formData.milkType ? (
                  <div>
                    <Label htmlFor="rateChart" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('rate_chart')} <span className="text-red-500">*</span></Label>
                    <Select value={formData.rateChart} onValueChange={(value) => setFormData({...formData, rateChart: value})}>
                      <SelectTrigger className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm w-full">
                        <SelectValue placeholder={t('select_rate_chart')} />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {(formData.milkType === 'Cow' ? cowRateNames : buffaloRateNames).map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-serif mb-5">{t('contact_information')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div>
                  <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('phone_number')} <span className="text-red-500">*</span></Label>
                  <div className="flex shadow-sm rounded-xl overflow-hidden">
                    <span className="inline-flex items-center px-4 border border-r-0 border-gray-200 bg-gray-50 text-gray-500 font-medium text-sm">
                      +91
                    </span>
                    <Input
                      id="phoneNumber"
                      placeholder={t('enter_phone_number')}
                      className="h-11 rounded-none rounded-r-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20 border-l-0 shadow-none w-full"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const value = Validator.formatMobile(e.target.value);
                        setFormData({...formData, phoneNumber: value});
                      }}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('email_address_optional')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('enter_email_address')}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('address')} <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="address"
                    placeholder={t('enter_complete_address')}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                    className="bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm min-h-[100px] resize-y"
                  />
                </div>
              </div>
            </div>


              </div>

              {/* Right Column */}
              <div className="w-full lg:w-1/2 space-y-8 md:space-y-10">
                {/* Personal Documents */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-serif mb-5">{t('personal_documents')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div>
                  <Label htmlFor="panCard" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('pan_card_optional')}</Label>
                  <Input
                    id="panCard"
                    placeholder={t('enter_pan_number')}
                    value={formData.panCard}
                    onChange={(e) => {
                      const value = Validator.formatPanCard(e.target.value);
                      setFormData({...formData, panCard: value});
                    }}
                    className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm uppercase"
                  />
                </div>
                
                <div>
                  <Label htmlFor="aadhaarCard" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('aadhaar_card_optional')}</Label>
                  <Input
                    id="aadhaarCard"
                    placeholder={t('enter_aadhaar_number')}
                    value={formData.aadhaarCard}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setFormData({...formData, aadhaarCard: value});
                    }}
                    className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-serif mb-5">{t('bank_details_optional')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div>
                  <Label htmlFor="bankName" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('bank_name')}</Label>
                  <Input
                    id="bankName"
                    placeholder={t('enter_bank_name')}
                    value={formData.bankName}
                    onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                    className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>
                
                <div>
                  <Label htmlFor="accountNumber" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('account_number')}</Label>
                  <Input
                    id="accountNumber"
                    placeholder={t('enter_account_number')}
                    value={formData.accountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, accountNumber: value});
                    }}
                    className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>
                
                <div>
                  <Label htmlFor="ifscCode" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('ifsc_code')}</Label>
                  <Input
                    id="ifscCode"
                    placeholder={t('enter_ifsc_code')}
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({...formData, ifscCode: e.target.value.toUpperCase()})}
                    className="h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 shadow-sm uppercase"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bankPassbook" className="text-sm font-medium text-gray-700 mb-1.5 block">{t('bank_passbook_cheque')}</Label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    onChange={handleBankPassbookUpload}
                    style={{ display: 'none' }}
                    id="bankPassbook"
                  />
                  {bankPassbookFile || formData.bankPassbookPhoto ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-sm">
                      {formData.bankPassbookPhoto && !bankPassbookFile ? (
                        <a
                          href={formData.bankPassbookPhoto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 underline truncate"
                        >
                          {bankPassbookName || 'View uploaded document'}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-gray-700 truncate">{bankPassbookName || 'Uploaded document'}</span>
                      )}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={previewBankPassbook}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 px-3 rounded-lg"
                        >
                          {t('preview')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('bankPassbook')?.click()}
                          className="h-8 px-3 rounded-lg border-gray-200"
                        >
                          {t('replace')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeBankPassbook}
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
                      onClick={() => document.getElementById('bankPassbook')?.click()}
                      className="w-full flex items-center justify-center gap-2 border-gray-200 h-11 rounded-xl bg-gray-50/50 hover:bg-gray-50 text-gray-700"
                    >
                      <Upload className="h-4 w-4" />
                      {t('upload_bank_passbook_cheque')}
                    </Button>
                  )}
                  <p className="text-xs text-gray-500 mt-2">{t('accepted_formats_passbook')}</p>
                </div>
              </div>
            </div>

                <div className="pt-2 space-y-4">
                  <Button 
                    type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-[15px] font-semibold shadow-sm transition-all"
              disabled={loading}
            >
              {loading ? t('saving') : (isEditMode ? t('update_farmer') : t('create_farmer'))}
            </Button>
            
            {isEditMode && (
              <Button 
                type="button"
                onClick={handleDeleteFarmer}
                className="w-full bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl text-[15px] font-semibold shadow-sm transition-all mt-3"
                disabled={loading}
              >
                {loading ? t('deleting') : t('delete_farmer')}
              </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Delete Farmer</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete farmer <span className="font-semibold">{formData.fullName}</span> ({formData.farmerId})?
            </p>
            <p className="text-sm text-red-600 mt-2">
              This action cannot be undone and will also delete all associated collection records.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDeleteFarmer}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
