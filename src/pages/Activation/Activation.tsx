import React, { useState, useEffect } from 'react';
import { adminApi } from '@/services/adminApi';
import { toast } from 'react-toastify';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Upload, Image as ImageIcon, X, Check, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TrialCalendarModal } from './components/TrialCalendarModal';
import { addDays, isPast, startOfDay, format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";


export const Activation: React.FC = () => {
  const [dairies, setDairies] = useState<any[]>([]);
  const [filteredDairies, setFilteredDairies] = useState<any[]>([]);
  const [searchMobile, setSearchMobile] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [selectedDairy, setSelectedDairy] = useState<any>(null);
  
  
  // New Activation Form States
  const [saleType, setSaleType] = useState<'self' | 'dealer'>('self');
  const [dealerName, setDealerName] = useState('');
  const [commission, setCommission] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [renewalAmount, setRenewalAmount] = useState('');
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const [activationDuration, setActivationDuration] = useState('365');

  useEffect(() => {
    fetchDairies();
  }, []);

  const fetchDairies = async () => {
    try {
      const { data } = await adminApi.getAllUsers();
      if (data.success) {
        let dairyData = data.data.dairyManagers || [];
        
        // Fetch trial details for all users in bulk
        const usernames = dairyData.map((d: any) => d.username).filter(Boolean);
        
        // Fetch activation records in bulk to get image URLs
        try {
          const { data: activationData } = await adminApi.getActivations({});
          
          // Debug log to check API response structure
          console.log('Activation Data Received:', activationData);

          const rawList = activationData?.data || (Array.isArray(activationData) ? activationData : []);
          
          if (rawList && rawList.length > 0) {
            const activationMap = new Map();
            [...rawList].sort((a, b) => Number(a.id) - Number(b.id)).forEach((a: any) => {
              activationMap.set(String(a.dairy_id).trim(), a);
            });

            console.log(`Mapped ${activationMap.size} unique activation records`);

            dairyData = dairyData.map((d: any) => {
              const username = String(d.username || '').trim();
              const record = activationMap.get(username);
              return {
                ...d,
                activation_record: record
              };
            });
          }
        } catch (actError) {
          console.error('Error fetching activations:', actError);
        }

        if (usernames.length > 0) {
          try {
            const { data: trialData } = await adminApi.getTrialDetails({ usernames });
            if (trialData.success && trialData.data) {
              const trialMap = new Map(trialData.data.map((t: any) => [String(t.username).trim(), t]));
              dairyData = dairyData.map((d: any) => ({
                ...d,
                trial_info: trialMap.get(String(d.username).trim())
              }));
            }
          } catch (e) {
            console.error('Error fetching trial data:', e);
          }
        }
        
        setDairies(dairyData);
        setFilteredDairies(dairyData);
      }
    } catch (error) {
      console.error('Error fetching dairies:', error);
      toast.error('Failed to fetch dairies');
    }
  };

  const isTrialExpired = (dairy: any) => {
    if (!dairy.trial_info?.trial_start_date) return false;
    
    try {
      // Handle DD-MM-YYYY format
      const parts = dairy.trial_info.trial_start_date.split('-');
      let startDate;
      if (parts.length === 3) {
        startDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        startDate = new Date(dairy.trial_info.trial_start_date);
      }
      
      const expiryDate = addDays(startDate, dairy.trial_info.trial_days || 0);
      return isPast(expiryDate) && !isToday(expiryDate);
    } catch (e) {
      return false;
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const handleToggleStatus = async (username: string, isActivating: boolean) => {
    // If activating, show payment modal first
    if (isActivating) {
      setSelectedUser(username);
      setPaymentScreenshot(null);
      setScreenshotFile(null);
      setIsPaymentModalOpen(true);
      return;
    }

    // If deactivating, just proceed
    await performStatusToggle(username, false);
  };

  const performStatusToggle = async (username: string, newStatus: boolean) => {
    setLoading(true);
    let uploadedUrl = '';
    try {
      const dairy = dairies.find(d => d.username === username);
      
    // If activating, check if it's payment pending or needs upload
    if (newStatus) {
      if (screenshotFile) {
        const formData = new FormData();
        formData.append('image', screenshotFile);
        formData.append('folder', 'activations');
        formData.append('dairy_id', username);
        formData.append('ref_id', username);
        formData.append('ref_type', 'activation');
        
        try {
          const uploadRes = await adminApi.uploadImage(formData);
          if (uploadRes.data.url) {
            uploadedUrl = uploadRes.data.url;
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Network error during receipt upload');
          setLoading(false);
          return;
        }
      } else if (!isPaymentPending) {
        toast.error('Please upload a payment receipt or select "Pay Later"');
        setLoading(false);
        return;
      }

      // Create formal activation record
      const activationRemark = saleType === 'dealer' 
        ? `[DEALER SALE] Dealer: ${dealerName}, Comm: ${commission}, Amt: ${saleAmount}. Duration: ${activationDuration} days. ${remark}`
        : `[SELF SALE] Amt: ${saleAmount}, Renewal: ${renewalAmount}. Duration: ${activationDuration} days. ${remark}`;

      const expiryDate = format(addDays(new Date(), parseInt(activationDuration) || 365), 'dd-MM-yyyy');

      await adminApi.createActivation({
        dairy_id: username,
        dairy_name: dairy?.branchname || username,
        activation_date: format(new Date(), 'dd-MM-yyyy'),
        expiry_date: expiryDate,
        image_url: uploadedUrl || '', // Empty if pending
        remark: activationRemark,
        sale_type: saleType,
        dealer_name: dealerName,
        dealer_commission: commission,
        sale_amount: saleAmount,
        renewal_amount: renewalAmount,
        duration_days: activationDuration
      } as any);
    }

      const { data } = await adminApi.toggleDairyStatus(username, newStatus);
      
      if (data.success) {
        toast.success(`Dairy ${newStatus ? 'activated' : 'deactivated'} successfully`);
        const updatedDairies = dairies.map(dairy => 
          dairy.username === username ? { 
            ...dairy, 
            is_active: newStatus ? 1 : 0,
            payment_url: newStatus ? (uploadedUrl || dairy.payment_url) : dairy.payment_url
          } : dairy
        );
        setDairies(updatedDairies);
        setFilteredDairies(updatedDairies.filter(d => 
          !searchMobile.trim() || d.mobile_number?.includes(searchMobile.trim())
        ));
        setIsPaymentModalOpen(false);
        // Reset form
        setIsPaymentPending(false);
        setRemark('');
        setDealerName('');
        setCommission('');
        setSaleAmount('');
        setRenewalAmount('');
        setActivationDuration('365');
        setSaleType('self');
        setPaymentScreenshot(null);
        setScreenshotFile(null);
        fetchDairies(); // Refresh to get the latest activation record status
      }
    } catch (error) {
      console.error('Error toggling dairy status:', error);
      toast.error('Failed to update dairy status');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleViewReceipt = async (dairy: any) => {
    // Priority 1: Check if we have an image URL in the activation record
    const record = dairy.activation_record || {};
    const info = dairy.trial_info || {};
    
    const url = record.image_url || dairy.payment_url || dairy.receipt_url || dairy.payment_screenshot || dairy.screenshot_url || 
                info.payment_url || info.receipt_url || info.payment_screenshot || info.screenshot_url;
    
    setSelectedDairy(dairy);
    if (url) {
      setReceiptUrl(url);
      setIsReceiptModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      // Use the new getImages API as fallback
      const { data } = await adminApi.getImages({ 
        dairy_id: dairy.username,
        ref_id: dairy.username,
        ref_type: 'activation'
      });

      if (data.data && data.data.length > 0) {
        // Use the latest activation image
        const latestUrl = data.data[0].image_url || data.data[0].url;
        setReceiptUrl(latestUrl);
        setIsReceiptModalOpen(true);
      } else {
        // Fallback to local url if just uploaded or show modal with details even without image
        if (dairy.payment_url || dairy.activation_record) {
          setReceiptUrl(dairy.payment_url || null);
          setIsReceiptModalOpen(true);
        } else {
          toast.info("No payment record found");
        }
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      toast.error("Failed to fetch receipt from server");
    } finally {
      setLoading(false);
    }
  };

  const getParsedValue = (key: string) => {
    const record = selectedDairy?.activation_record;
    if (!record) return null;

    // Priority 1: Use structured field if it's not "0.00", 0, or null
    const val = record[key];
    if (val && val !== "0.00" && val !== 0 && val !== "null") return val;

    // Priority 2: Parse from remark
    const remark = record.remark || "";
    if (!remark) return val || 0;

    const regexMap: Record<string, RegExp> = {
      sale_amount: /Amt:\s*(\d+)/i,
      renewal_amount: /Renewal:\s*(\d+)/i,
      dealer_commission: /Comm:\s*(\d+)/i,
      dealer_name: /Dealer:\s*([^,.]+)/i,
      duration_days: /Duration:\s*(\d+)/i,
      sale_type: /\[(SELF|DEALER)\s+SALE\]/i
    };

    const match = remark.match(regexMap[key]);
    if (match && match[1]) return match[1].trim();

    return val || (key.includes('amount') || key.includes('commission') ? 0 : null);
  };

  const getCalculatedDates = () => {
    const record = selectedDairy?.activation_record;
    if (!record) return { activated: '-', expires: '-' };

    let activated = record.activation_date || record.created_at?.split('T')[0] || '-';
    let expires = record.expiry_date && record.expiry_date !== "null" ? record.expiry_date.split('T')[0] : null;

    if (!expires && record.activation_date) {
      try {
        const [d, m, y] = record.activation_date.split('-').map(Number);
        if (d && m && y) {
          const actDate = new Date(y, m - 1, d);
          const duration = Number(getParsedValue('duration_days') || record.duration_days || 365);
          expires = format(addDays(actDate, duration), 'dd-MM-yyyy');
        }
      } catch (e) {
        expires = '-';
      }
    }

    return { activated, expires: expires || '-' };
  };

  const handleSearch = () => {
    if (!searchMobile.trim()) {
      setFilteredDairies(dairies);
      setCurrentPage(1);
      return;
    }
    const filtered = dairies.filter((d) => 
      d.mobile_number?.includes(searchMobile.trim())
    );
    setFilteredDairies(filtered);
    setCurrentPage(1);
  };

  const paginatedData = filteredDairies.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );
  const totalPages = Math.ceil(filteredDairies.length / perPage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Mobile Application Activation</h2>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search by mobile number"
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-sm"
            />
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={perPage.toString()} onValueChange={(v) => { setPerPage(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Username</TableHead>
                <TableHead className="font-semibold">Branch Name</TableHead>
                <TableHead className="font-semibold">Owner Name</TableHead>
                <TableHead className="font-semibold">Address</TableHead>
                <TableHead className="font-semibold text-center">Trial Account</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((dairy) => (
                <TableRow key={dairy.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{dairy.username || '-'}</TableCell>
                  <TableCell>{dairy.branchname || '-'}</TableCell>
                  <TableCell>{dairy.ownername || '-'}</TableCell>
                  <TableCell>{dairy.address || '-'}</TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const expired = isTrialExpired(dairy);
                      return (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedUser(dairy.username);
                            setIsTrialModalOpen(true);
                          }}
                          className={`inline-flex items-center gap-2 ${
                            expired 
                              ? "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" 
                              : "text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                        >
                          <CalendarIcon className="h-4 w-4" />
                          {expired ? 'Trial Over' : 'Set Trial'}
                        </Button>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const isActive = Number(dairy.is_active) === 1;
                      const hasReceipt = dairy.activation_record?.image_url || dairy.payment_url;
                      const hasTrial = !!dairy.trial_info?.trial_start_date;
                      const expired = isTrialExpired(dairy);
                      
                      if (isActive) {
                        if (hasReceipt) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Paid
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Payment Pending
                            </span>
                          );
                        }
                      }
                      
                      if (hasTrial) {
                        if (!expired) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                              DEMO
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Trial Expired
                            </span>
                          );
                        }
                      }

                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Inactive
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {dairy.is_active === 1 || dairy.activation_record ? (
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReceipt(dairy)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all group"
                          title="View Activation Details"
                        >
                          <Eye size={16} className="group-hover:scale-110 transition-transform" />
                        </Button>
                      ) : (
                        <span className="text-slate-300 text-xs italic">No Record</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Switch
                      checked={Number(dairy.is_active) === 1}
                      onCheckedChange={(checked) => handleToggleStatus(dairy.username, checked)}
                      disabled={loading}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {filteredDairies.length > 0 ? (currentPage - 1) * perPage + 1 : 0} to {Math.min(currentPage * perPage, filteredDairies.length)} of {filteredDairies.length} entries
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages || 1}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
      <TrialCalendarModal 
        isOpen={isTrialModalOpen} 
        onClose={() => setIsTrialModalOpen(false)} 
        username={selectedUser}
      />

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[850px] bg-slate-50 p-0 overflow-hidden border-none shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left Column: Image Upload & Preview */}
            <div className="bg-white p-6 border-r border-slate-200">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="text-blue-500" size={22} />
                  Payment Evidence
                </h3>
                <p className="text-sm text-slate-500 mt-1">Upload the transaction proof to proceed.</p>
              </div>

              {!paymentScreenshot ? (
                <label className="flex flex-col items-center justify-center w-full h-[320px] border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all hover:border-blue-400 group relative overflow-hidden bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="p-4 bg-blue-100/50 rounded-full text-blue-600 mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <Upload size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Click to Upload Receipt</p>
                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">PNG, JPG or PDF (Max 10MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              ) : (
                <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-xl h-[320px] group">
                  <img src={paymentScreenshot} alt="Payment Receipt" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                  <button 
                    onClick={() => { setPaymentScreenshot(null); setScreenshotFile(null); }}
                    className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-full text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg z-10"
                  >
                    <X size={20} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <div className="flex items-center gap-2 text-white">
                      <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
                      <p className="text-xs font-bold truncate">{screenshotFile?.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sales Details Form */}
            <div className="p-8 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Activation Details</h3>
                    <p className="text-sm text-slate-500 mt-1">Configure sales and tracking data.</p>
                  </div>
                  <div className="flex p-1 bg-slate-200/50 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setSaleType('self')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        saleType === 'self' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Self
                    </button>
                    <button
                      onClick={() => setSaleType('dealer')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        saleType === 'dealer' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Dealer
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl mb-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isPaymentPending ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Check size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Payment Pending</p>
                      <p className="text-[10px] text-slate-500">Activate now, collect payment later</p>
                    </div>
                  </div>
                  <Switch 
                    checked={isPaymentPending} 
                    onCheckedChange={setIsPaymentPending}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {saleType === 'dealer' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dealer Name</label>
                        <Input 
                          placeholder="Select or enter dealer name"
                          value={dealerName}
                          onChange={(e) => setDealerName(e.target.value)}
                          className="h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Comm. (₹)</label>
                          <Input 
                            type="number"
                            placeholder="0.00"
                            value={commission}
                            onChange={(e) => setCommission(e.target.value)}
                            className="h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                          <Input 
                            type="number"
                            placeholder="0.00"
                            value={saleAmount}
                            onChange={(e) => setSaleAmount(e.target.value)}
                            className="h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sale Amount (₹)</label>
                        <Input 
                          type="number"
                          placeholder="0.00"
                          value={saleAmount}
                          onChange={(e) => setSaleAmount(e.target.value)}
                          className="h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Annual Renewal (₹)</label>
                        <Input 
                          type="number"
                          placeholder="0.00"
                          value={renewalAmount}
                          onChange={(e) => setRenewalAmount(e.target.value)}
                          className="h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm"
                        />
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Duration (Days)</label>
                      <Input 
                        type="number"
                        placeholder="365"
                        value={activationDuration}
                        onChange={(e) => setActivationDuration(e.target.value)}
                        className="h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Internal Remarks</label>
                      <Input 
                        placeholder="Notes..." 
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 rounded-xl h-12 font-bold text-slate-500 hover:bg-slate-200">
                  Cancel
                </Button>
                <Button 
                  className={`flex-[2] text-white rounded-xl h-12 font-bold shadow-lg transition-all ${
                    isPaymentPending 
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  }`}
                  disabled={(!paymentScreenshot && !isPaymentPending) || loading}
                  onClick={() => performStatusToggle(selectedUser, true)}
                >
                  {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Check className="mr-2" size={20} />}
                  {isPaymentPending ? 'Activate (Pending Payment)' : 'Complete Activation'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt View Modal - Premium Redesign */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-[800px] bg-slate-900 border-slate-800 p-0 overflow-hidden shadow-2xl">
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              onClick={() => receiptUrl && window.open(receiptUrl, '_blank')}
              title="Open Original"
            >
              <Upload size={18} className="rotate-180" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              onClick={() => setIsReceiptModalOpen(false)}
            >
              <X size={18} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3">
            {/* Image Preview Area */}
            <div className="md:col-span-2 bg-black/40 flex items-center justify-center p-6 min-h-[400px] relative group">
              {receiptUrl ? (
                <div className="relative">
                  <img 
                    src={receiptUrl} 
                    alt="Payment Receipt" 
                    className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                    onError={() => toast.error("Failed to load image")}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-blue-500" size={40} />
                  <p className="text-slate-400 text-sm">Retrieving secure receipt...</p>
                </div>
              )}
            </div>

            {/* Sidebar Details Area */}
            <div className="bg-slate-900 p-6 flex flex-col justify-between border-l border-slate-800 overflow-y-auto max-h-[85vh]">
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2 mb-1">
                    <ImageIcon className="text-blue-400" size={18} />
                    Activation Details
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Transaction and sale tracking information.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Payment Status */}
                  <div className={`p-3 rounded-lg border ${receiptUrl ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Payment Status</p>
                    <div className="flex items-center gap-2">
                      {receiptUrl ? (
                        <>
                          <Check className="text-emerald-500" size={14} />
                          <span className="text-emerald-400 text-sm font-bold">PAID (Receipt Available)</span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="text-amber-500 animate-spin" size={14} />
                          <span className="text-amber-400 text-sm font-bold">PAYMENT PENDING</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Sale Amount</p>
                      <p className={`text-lg font-bold ${!receiptUrl && Number(getParsedValue('sale_amount') || 0) === 0 ? 'text-amber-400' : 'text-white'}`}>
                        {Number(getParsedValue('sale_amount') || 0) > 0 
                          ? `₹${getParsedValue('sale_amount')}`
                          : receiptUrl ? '₹0.00' : 'Payment Pending'}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Renewal</p>
                      <p className="text-white text-sm font-semibold">₹{getParsedValue('renewal_amount') || '0'}</p>
                    </div>
                  </div>

                  {/* Sale Type & Dealer Info */}
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Sale Type</p>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 text-sm font-bold uppercase">{getParsedValue('sale_type') || selectedDairy?.activation_record?.sale_type || 'SELF'}</span>
                      {Number(getParsedValue('dealer_commission') || 0) > 0 && (
                        <span className="text-xs text-slate-400">Comm: ₹{getParsedValue('dealer_commission')}</span>
                      )}
                    </div>
                    {getParsedValue('dealer_name') && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Dealer Name</p>
                        <p className="text-white text-sm">{getParsedValue('dealer_name')}</p>
                      </div>
                    )}
                  </div>

                  {/* Duration & Remark */}
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Internal Remark</p>
                    <p className="text-white text-xs leading-relaxed italic">
                      {selectedDairy?.activation_record?.remark || 'No remarks provided.'}
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <div className="flex justify-between items-center">
                      {(() => {
                        const { activated, expires } = getCalculatedDates();
                        return (
                          <>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Activated On</p>
                              <p className="text-white text-xs">{activated}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Expires On</p>
                              <p className="text-rose-400 text-xs font-bold">{expires}</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Button 
                  onClick={() => setIsReceiptModalOpen(false)} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-900/20"
                >
                  Close Viewer
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
