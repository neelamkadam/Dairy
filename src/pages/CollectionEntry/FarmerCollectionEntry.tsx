import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  User,
  Save,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import { collectionApi, CollectionPayload } from "@/services/collectionApi";
import { rateChartApi } from "@/services/rateChartApi";
import { userApi, Farmer } from "@/services/userApi";
import { normalizeFarmerId, formatFarmerIdForDisplay } from "@/utils/farmerIdUtils";
import { calculateCLRFromFatAndSNF, calculateSNFFromFatAndCLR } from "@/utils/milkCalculations";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Collection {
  id: number;
  type?: 'Cow' | 'Buffalo';
  milkType?: 'Cow' | 'Buffalo';
  quantity?: number;
  qty?: number;
  fat: number;
  snf: number;
  clr: number;
  rate: number;
  amount: number;
  shift: 'Morning' | 'Evening';
  farmer_id?: string;
  farmerId?: string;
  uname?: string;
  fname?: string;
  farmer?: string;
  farmer_name?: string;
  date?: string;
}

const FarmerCollectionEntry = () => {
  const { t } = useTranslation();
  const branches = useAppSelector((state) => state.branch.branches);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [shift, setShift] = useState<'Morning' | 'Evening'>('Morning');
  const [farmerIdInput, setFarmerIdInput] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [farmerData, setFarmerData] = useState<Farmer | null>(null);
  const [availableMilkTypes, setAvailableMilkTypes] = useState<('Cow' | 'Buffalo')[]>(['Cow', 'Buffalo']);
  const [milkType, setMilkType] = useState<'Cow' | 'Buffalo'>('Cow');
  const [quantity, setQuantity] = useState("");
  const [fat, setFat] = useState("");
  const [snf, setSnf] = useState("");
  const [clr, setClr] = useState("");
  const [water, setWater] = useState("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState(0);
  const [existingCollections, setExistingCollections] = useState<Collection[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentCollections, setRecentCollections] = useState<Collection[]>([]);
  const quantityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quantity && rate) {
      setAmount(parseFloat(quantity) * parseFloat(rate));
    }
  }, [quantity, rate]);

  useEffect(() => {
    if (fat && snf && !clr) {
      const calculatedCLR = calculateCLRFromFatAndSNF(fat, snf);
      if (calculatedCLR) setClr(calculatedCLR);
    }
  }, [fat, snf]);

  useEffect(() => {
    if (fat && clr && !snf) {
      const calculatedSNF = calculateSNFFromFatAndCLR(fat, clr);
      if (calculatedSNF) setSnf(calculatedSNF);
    }
  }, [fat, clr]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (selectedBranch && fat && snf && farmerData?.rateChart) {
        console.log('🟡 Fetching rate with:', {
          fat: parseFloat(fat),
          snf: parseFloat(snf),
          orgId: selectedBranch,
          rateChart: farmerData.rateChart,
          milkType,
          date: format(date, 'yyyy-MM-dd')
        });
        try {
          const dateStr = format(date, 'yyyy-MM-dd');
          const response = await rateChartApi.getRate(
            parseFloat(fat),
            parseFloat(snf),
            selectedBranch,
            farmerData.rateChart,
            milkType,
            dateStr,
            shift
          );
          console.log('✅ Rate fetched successfully:', response);
          if (response?.price) {
            setRate(response.price.toString());
          } else {
            console.warn('⚠️ No price in response, setting to 0.00');
            setRate('0.00');
          }
        } catch (error) {
          console.error('❌ Error fetching rate:', error);
          setRate('0.00');
        }
      } else {
        console.log('⏭️ Skipping rate fetch - missing:');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedBranch, milkType, fat, snf, farmerData, date]);

  const handleFarmerSearch = async () => {
    if (!selectedBranch || !farmerIdInput.trim()) {
      toast.error(t('please_select_vlc_and_farmer_id'));
      return;
    }

    const normalized = normalizeFarmerId(farmerIdInput);
    const displayId = formatFarmerIdForDisplay(farmerIdInput);
    
    console.log('🔍 Farmer Search:', { selectedBranch, farmerIdInput, normalized, displayId });

    try {
      const farmer = await userApi.getById(normalized, selectedBranch);
      console.log('👤 Farmer API Response:', farmer);
      
      if (!farmer) {
        toast.error(t('farmer_not_found'));
        setFarmerData(null);
        setFarmerName('');
        setFarmerId('');
        setAvailableMilkTypes(['Cow', 'Buffalo']);
        return;
      }


      setFarmerData(farmer);
      setFarmerId(displayId);
      setFarmerName(farmer.fullName || farmer.name || 'Unknown Farmer');

      // Set available milk types
      const types = farmer.milkType === 'Both' 
        ? ['Cow', 'Buffalo'] as ('Cow' | 'Buffalo')[]
        : [farmer.milkType] as ('Cow' | 'Buffalo')[];
      setAvailableMilkTypes(types);
      setMilkType(types[0]);
      console.log('🥛 Milk Types:', { farmerMilkType: farmer.milkType, availableTypes: types });

      // Fetch existing collections
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await collectionApi.getTodaysCollectionByFarmer(
        selectedBranch,
        normalized,
        dateStr
      );
      console.log('📦 Existing Collections Response:', response);

      const collections = response?.data || response?.collections || [];
      const shiftCollections = collections.filter(
        (c: Collection) => c.shift === shift
      );
      console.log('🔄 Shift Collections:', { shift, count: shiftCollections.length, collections: shiftCollections });

      if (shiftCollections.length > 0) {
        setExistingCollections(shiftCollections);

        // If farmer has Both milk types
        if (farmer.milkType === 'Both') {
          const existingTypes = shiftCollections.map(c => c.type || c.milkType);
          console.log('🔍 Existing Types:', existingTypes);
          
          // Check if Cow exists
          const hasCow = existingTypes.includes('Cow');
          // Check if Buffalo exists
          const hasBuffalo = existingTypes.includes('Buffalo');
          
          console.log('✅ Type Check:', { hasCow, hasBuffalo });
          
          if (hasCow && !hasBuffalo) {
            // Cow exists, Buffalo doesn't - proceed with Buffalo
            console.log('➡️ Cow exists, proceeding with Buffalo');
            setMilkType('Buffalo');
            quantityRef.current?.focus();
            return;
          } else if (hasBuffalo && !hasCow) {
            // Buffalo exists, Cow doesn't - proceed with Cow
            console.log('➡️ Buffalo exists, proceeding with Cow');
            setMilkType('Cow');
            quantityRef.current?.focus();
            return;
          } else {
            // Both exist - show modal for the first type
            console.log('⚠️ Both types exist, showing modal');
            setMilkType(types[0]);
            setShowModal(true);
            return;
          }
        } else {
          // Single milk type farmer - show modal
          console.log('⚠️ Single milk type farmer with existing collection, showing modal');
          setShowModal(true);
          return;
        }
      }

      console.log('✅ No existing collections, focusing quantity input');
      quantityRef.current?.focus();
    } catch (error) {
      console.error('❌ Error searching farmer:', error);
      toast.error(t('error_searching_farmer'));
    }
  };

  const handleSubmit = async () => {
    console.log('💾 Submit clicked');
    if (!selectedBranch || !farmerId || !quantity || !fat || !snf || !clr || !rate) {
      console.log('❌ Validation failed:', { selectedBranch, farmerId, quantity, fat, snf, clr, rate });
      toast.error(t('please_fill_required_fields'));
      return;
    }
    setLoading(true);
    try {
      const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
      const dateStr = format(date, 'yyyy-MM-dd');
      
      let payload: CollectionPayload;
      
      console.log('📝 Preparing payload:', { isMultipleMode, editingId, existingCollections: existingCollections.length });
      
      if (isMultipleMode && existingCollections.length > 0) {
        // Multiple collection: merge with existing using weighted average
        const existing = existingCollections.find(c => (c.type || c.milkType) === milkType);
        console.log('🔄 Multiple mode - existing:', existing);
        if (existing) {
          const existingQty = parseFloat(existing.quantity?.toString() || existing.qty?.toString() || '0');
          const newQty = parseFloat(quantity);
          const totalQty = existingQty + newQty;
          
          const existingFat = parseFloat(existing.fat.toString());
          const newFat = parseFloat(fat);
          const weightedFat = ((existingFat * existingQty) + (newFat * newQty)) / totalQty;
          
          const existingSnf = parseFloat(existing.snf.toString());
          const newSnf = parseFloat(snf);
          const weightedSnf = ((existingSnf * existingQty) + (newSnf * newQty)) / totalQty;
          
          const existingAmt = parseFloat(existing.amount?.toString() || '0');
          const totalAmount = existingAmt + amount;
          
          // Recalculate CLR from weighted averages
          const weightedClr = calculateCLRFromFatAndSNF(weightedFat.toString(), weightedSnf.toString());
          
          payload = {
            farmer_id: farmerId,
            dairy_id: selectedBranch,
            type: milkType,
            quantity: totalQty,
            fat: parseFloat(weightedFat.toFixed(2)),
            snf: parseFloat(weightedSnf.toFixed(2)),
            clr: parseFloat(weightedClr),
            water: water ? parseFloat(water) : undefined,
            rate: parseFloat(rate),
            amount: totalAmount,
            shift: shift,
            date: `${dateStr} ${time}`,
          };
          
          await collectionApi.update(existing.id, payload);
          toast.success(t('collections_merged_successfully'));
          setIsMultipleMode(false);
        }
      } else {
        payload = {
          farmer_id: farmerId,
          dairy_id: selectedBranch,
          type: milkType,
          quantity: parseFloat(quantity),
          fat: parseFloat(fat),
          snf: parseFloat(snf),
          clr: parseFloat(clr),
          water: water ? parseFloat(water) : undefined,
          rate: parseFloat(rate),
          amount: amount,
          shift: shift,
          date: `${dateStr} ${time}`,
        };
        
        if (editingId) {
          await collectionApi.update(editingId, payload);
          toast.success(t('collection_updated_successfully'));
        } else {
          await collectionApi.create(payload);
          toast.success(t('collection_created_successfully'));
        }
      }
      
      resetForm();
      if (selectedBranch) {
        await fetchRecentCollections(selectedBranch, dateStr, shift);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('failed_to_save_collection'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFarmerIdInput('');
    setFarmerId('');
    setFarmerName('');
    setFarmerData(null);
    setQuantity('');
    setFat('');
    setSnf('');
    setClr('');
    setWater('');
    setRate('');
    setAmount(0);
    setEditingId(null);
    setExistingCollections([]);
    setAvailableMilkTypes(['Cow', 'Buffalo']);
    setIsMultipleMode(false);
  };

  const fetchRecentCollections = async (dairyId: number, dateStr: string, shiftVal: string) => {
    try {
      console.log('📋 Fetching recent collections:', { dairyId, dateStr, shiftVal });
      const response = await collectionApi.getCollections({
        dairy_id: dairyId,
        date: dateStr,
        shift: shiftVal
      });
      
      console.log('📦 Raw response:', response);
      
      let collections = [];
      const data = response?.data || response;
      
      if (Array.isArray(data)) {
        if (data[0]?.date && data[0]?.collections) {
          console.log('✅ Response is grouped by date');
          const dateMatch = data.find((g: any) => g.date === format(new Date(dateStr), 'dd-MM-yyyy'));
          collections = dateMatch?.collections || [];
          console.log('Found collections for date:', collections.length);
        } else {
          console.log('✅ Response is flat array, length:', data.length);
          collections = data;
        }
      } else if (data?.collections) {
        console.log('✅ Response has collections property, length:', data.collections.length);
        collections = data.collections;
      }
      
      console.log('🎯 Setting recent collections:', collections.length);
      setRecentCollections(collections.slice(0, 10));
    } catch (error) {
      console.error('❌ Error fetching recent collections:', error);
      setRecentCollections([]);
    }
  };

  const handleBranchChange = async (branchId: string) => {
    const id = parseInt(branchId);
    setSelectedBranch(id);
    resetForm();
    await fetchRecentCollections(id, format(date, 'yyyy-MM-dd'), shift);
  };

  const handleDateChange = async (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      resetForm();
      if (selectedBranch) {
        await fetchRecentCollections(selectedBranch, format(newDate, 'yyyy-MM-dd'), shift);
      }
    }
  };

  const handleShiftChange = async (newShift: 'Morning' | 'Evening') => {
    setShift(newShift);
    resetForm();
    if (selectedBranch) {
      await fetchRecentCollections(selectedBranch, format(date, 'yyyy-MM-dd'), newShift);
    }
  };

  const handleMultipleCollection = () => {
    setShowModal(false);
    setIsMultipleMode(true);
    // Keep farmer data, just clear collection fields to add new
    setQuantity('');
    setFat('');
    setSnf('');
    setClr('');
    setWater('');
    setRate('');
    setAmount(0);
    setEditingId(null);
    quantityRef.current?.focus();
    toast.info(t('enter_new_collection_details'));
  };

  const handleModify = () => {
    console.log('🔧 Modify clicked, looking for:', milkType);
    console.log('Existing collections:', existingCollections);
    const existing = existingCollections.find(c => {
      const cType = c.type || c.milkType;
      console.log('Checking collection type:', cType, 'vs', milkType);
      return cType === milkType;
    });
    console.log('Found existing:', existing);
    if (existing) {
      const qtyVal = existing.quantity || existing.qty || 0;
      const amtVal = typeof existing.amount === 'number' ? existing.amount : parseFloat(existing.amount?.toString() || '0');
      setEditingId(existing.id);
      setQuantity(qtyVal.toString());
      setFat(parseFloat(existing.fat.toString()).toFixed(1));
      setSnf(parseFloat(existing.snf.toString()).toFixed(1));
      setClr(parseFloat(existing.clr.toString()).toFixed(1));
      setRate(existing.rate.toString());
      setAmount(amtVal);
      console.log('✅ Form populated with existing values');
    }
    setShowModal(false);
  };

  const handleDelete = async () => {
    const existing = existingCollections.find(c => c.type === milkType);
    if (existing) {
      try {
        await collectionApi.delete(existing.id);
        toast.success(t('collection_deleted_successfully'));
        setShowModal(false);
        resetForm();
        if (selectedBranch) {
          await fetchRecentCollections(selectedBranch, format(date, 'yyyy-MM-dd'), shift);
        }
      } catch (error) {
        toast.error(t('failed_to_delete_collection'));
      }
    }
  };

  const handleMilkTypeChange = (type: 'Cow' | 'Buffalo') => {
    // Check if collection exists for this type
    const hasCollection = existingCollections.some(c => (c.type || c.milkType) === type);
    
    if (hasCollection) {
      // Show modal for existing collection
      setMilkType(type);
      setShowModal(true);
    } else {
      // Just change the milk type
      setMilkType(type);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h1 className="md:text-2xl font-semibold text-gray-900">
              {t('farmer_collection_entry')}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="space-y-4 bg-white p-5 rounded-2xl">
              {/* Top Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ">
                <div>
                  <Label className="text-sm font-medium text-gray-700 block">
                    {t('vlc_name')}
                  </Label>
                  <Select onValueChange={handleBranchChange}>
                    <SelectTrigger className="w-full border-gray-200">
                      <SelectValue placeholder={t('select_vlc')} />
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

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    {t('date')}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        {format(date, "dd-MM-yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    {t('shift')}
                  </Label>
                  <Select value={shift} onValueChange={handleShiftChange}>
                    <SelectTrigger className="w-full bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Morning">{t('morning')}</SelectItem>
                      <SelectItem value="Evening">{t('evening')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Farmer Search */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('farmer_id')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={farmerIdInput}
                      onChange={(e) => setFarmerIdInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFarmerSearch()}
                      placeholder={t('enter_farmer_id')}
                      className="border-gray-200"
                    />
                    <Button onClick={handleFarmerSearch} className="bg-blue-500 hover:bg-blue-600">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('farmer_name')}
                  </Label>
                  <Input
                    value={farmerName}
                    readOnly
                    className="border-gray-200 bg-gray-50"
                  />
                </div>
              </div>
            </div>
            <Separator className="my-1" />

            {/* Collection Details */}
            <div className="space-y-4 bg-white p-5 rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('milk_type')}
                  </Label>
                  <div className="flex gap-2">
                    {availableMilkTypes.map(type => (
                      <Button
                        key={type}
                        type="button"
                        onClick={() => handleMilkTypeChange(type)}
                        className={cn(
                          "flex-1 h-10",
                          milkType === type
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        )}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('quantity')}
                  </Label>
                  <Input
                    ref={quantityRef}
                    type="number"
                    step="0.1"
                    value={quantity}
                    placeholder="0.00"
                    onChange={(e) => setQuantity(e.target.value)}
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('fat')} (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={fat}
                    placeholder="0.0"
                    onChange={(e) => setFat(e.target.value)}
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('snf')} (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={snf}
                    onChange={(e) => {
                      setSnf(e.target.value);
                      if (e.target.value) setClr('');
                    }}
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('clr')}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.0"
                    value={clr}
                    onChange={(e) => {
                      setClr(e.target.value);
                      if (e.target.value) setSnf('');
                    }}
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('water')} (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={water}
                    onChange={(e) => setWater(e.target.value)}
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('rate_per_liter')}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="0.00"
                    className="border-gray-200"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <Separator className="my-1" />

            {/* Total Amount */}
            <div className="flex justify-between items-center p-4 rounded-2xl bg-white">
              <span className="text-lg font-semibold text-gray-900">
                {t('total_amount')}
              </span>
              <span className="text-2xl font-bold text-green-600">₹{amount.toFixed(2)}</span>
            </div>
            <Separator className="my-1" />
            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-[40%] bg-green-500 hover:bg-green-600 text-white py-3 text-lg font-medium"
            >
              <Save className="mr-2" />
              {loading ? t('saving') : editingId ? t('update') : t('submit')}
            </Button>
          </div>

          {/* Recent Collections Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-0 shadow-gray-200/50 p-5 bg-white">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {t('recent_collections')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentCollections.length > 0 ? (
                  <div className="space-y-0">
                    {recentCollections.map((collection, index) => {
                      const milkTypeVal = collection.type || collection.milkType || 'N/A';
                      const qtyVal = parseFloat(collection.quantity?.toString() || collection.qty?.toString() || '0');
                      const farmerName = collection.fname || collection.farmer || collection.farmer_name || 'Unknown';
                      const farmerIdVal = collection.uname || collection.farmer_id || collection.farmerId || '';
                      const amountVal = parseFloat(collection.amount?.toString() || '0');
                      
                      const handleCollectionClick = async () => {
                        if (!selectedBranch || !farmerIdVal) return;
                        const normalized = normalizeFarmerId(farmerIdVal);
                        const dateStr = format(date, 'yyyy-MM-dd');
                        
                        try {
                          const response = await collectionApi.getTodaysCollectionByFarmer(
                            selectedBranch,
                            normalized,
                            dateStr
                          );
                          
                          if (response?.collections?.length > 0) {
                            setExistingCollections(response.collections);
                            setFarmerIdInput(farmerIdVal);
                            setFarmerId(formatFarmerIdForDisplay(farmerIdVal));
                            setFarmerName(farmerName);
                            setShowModal(true);
                          }
                        } catch (error) {
                          console.error('Error fetching farmer collections:', error);
                        }
                      };
                      
                      return (
                        <div key={collection.id || index}>
                          <div 
                            className="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={handleCollectionClick}
                          >
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {farmerIdVal} - {farmerName}
                              </p>
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                {milkTypeVal} | {qtyVal.toFixed(1)}L | FAT: {collection.fat}% | SNF: {collection.snf}%
                              </div>
                            </div>
                            <span className="font-semibold text-sm text-green-600">
                              ₹{amountVal.toFixed(2)}
                            </span>
                          </div>
                          {index < recentCollections.length - 1 && <hr className="border-gray-100" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    {selectedBranch ? t('no_recent_collections') : t('select_vlc_to_view')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal for existing collection */}
      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">{t('collection_already_exists')}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  {t('farmer')}: <span className="font-bold">{farmerName}</span>
                </p>
                <p className="text-sm text-blue-800">
                  {t('collection_exists_message', { milkType, shift })}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">{t('what_would_you_like_to_do')}</p>
                
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    onClick={handleMultipleCollection} 
                    className="bg-green-500 hover:bg-green-600 text-white h-auto py-3 flex flex-col items-start"
                  >
                    <span className="font-semibold">{t('add_multiple_collection')}</span>
                    <span className="text-xs opacity-90">{t('add_multiple_collection_desc')}</span>
                  </Button>
                  
                  <Button 
                    onClick={handleModify} 
                    className="bg-blue-500 hover:bg-blue-600 text-white h-auto py-3 flex flex-col items-start"
                  >
                    <span className="font-semibold">{t('modify_existing')}</span>
                    <span className="text-xs opacity-90">{t('modify_existing_desc')}</span>
                  </Button>
                  
                  <Button 
                    onClick={handleDelete} 
                    className="bg-red-500 hover:bg-red-600 text-white h-auto py-3 flex flex-col items-start"
                  >
                    <span className="font-semibold">{t('delete_collection')}</span>
                    <span className="text-xs opacity-90">{t('delete_collection_desc')}</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setShowModal(false)} 
                    variant="outline"
                    className="h-auto py-3"
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FarmerCollectionEntry;
