import { useState, useEffect, useRef } from "react";
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
            dateStr
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
      toast.error('Please select VLC and enter Farmer ID');
      return;
    }

    const normalized = normalizeFarmerId(farmerIdInput);
    const displayId = formatFarmerIdForDisplay(farmerIdInput);
    

    try {
      const farmer = await userApi.getById(normalized, selectedBranch);
      
      if (!farmer) {
        toast.error('Farmer not found');
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

      // Fetch existing collections
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await collectionApi.getTodaysCollectionByFarmer(
        selectedBranch,
        normalized,
        dateStr
      );

      const collections = response?.data || response?.collections || [];
      const shiftCollections = collections.filter(
        (c: Collection) => c.shift === shift
      );

      if (shiftCollections.length > 0) {
        setExistingCollections(shiftCollections);

        // If farmer has Both milk types
        if (farmer.milkType === 'Both') {
          const existingTypes = shiftCollections.map(c => c.type || c.milkType);
          
          // Check if Cow exists
          const hasCow = existingTypes.includes('Cow');
          // Check if Buffalo exists
          const hasBuffalo = existingTypes.includes('Buffalo');
          
          if (hasCow && !hasBuffalo) {
            // Cow exists, Buffalo doesn't - proceed with Buffalo
            setMilkType('Buffalo');
            quantityRef.current?.focus();
            return;
          } else if (hasBuffalo && !hasCow) {
            // Buffalo exists, Cow doesn't - proceed with Cow
            setMilkType('Cow');
            quantityRef.current?.focus();
            return;
          } else {
            // Both exist - show modal for the first type
            setMilkType(types[0]);
            setShowModal(true);
            return;
          }
        } else {
          // Single milk type farmer - show modal
          setShowModal(true);
          return;
        }
      }

      quantityRef.current?.focus();
    } catch (error) {
      console.error('Error searching farmer:', error);
      toast.error('Error searching farmer');
    }
  };

  const handleSubmit = async () => {
    if (!selectedBranch || !farmerId || !quantity || !fat || !snf || !clr || !rate) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
      const dateStr = format(date, 'yyyy-MM-dd');
      
      let payload: CollectionPayload;
      
      if (isMultipleMode && existingCollections.length > 0) {
        // Multiple collection: merge with existing using weighted average
        const existing = existingCollections.find(c => (c.type || c.milkType) === milkType);
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
            rate: parseFloat(rate),
            amount: totalAmount,
            shift: shift,
            date: `${dateStr} ${time}`,
          };
          
          await collectionApi.update(existing.id, payload);
          toast.success('Collections merged successfully');
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
          rate: parseFloat(rate),
          amount: amount,
          shift: shift,
          date: `${dateStr} ${time}`,
        };
        
        if (editingId) {
          await collectionApi.update(editingId, payload);
          toast.success('Collection updated successfully');
        } else {
          await collectionApi.create(payload);
          toast.success('Collection created successfully');
        }
      }
      
      resetForm();
      if (selectedBranch) {
        await fetchRecentCollections(selectedBranch, dateStr, shift);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save collection');
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
    setRate('');
    setAmount(0);
    setEditingId(null);
    quantityRef.current?.focus();
    toast.info('Enter new collection details to merge with existing');
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
        toast.success('Collection deleted successfully');
        setShowModal(false);
        resetForm();
        if (selectedBranch) {
          await fetchRecentCollections(selectedBranch, format(date, 'yyyy-MM-dd'), shift);
        }
      } catch (error) {
        toast.error('Failed to delete collection');
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="md:text-2xl font-semibold text-gray-900">
              Farmer Collection Entry
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              John Smith
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left">
          {/* Main Form */}
          <div className="lg:col-span-3">
            <div className="space-y-4 bg-white p-5 rounded-2xl">
              {/* Top Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ">
                <div>
                  <Label className="text-sm font-medium text-gray-700 block">
                    VLC Name
                  </Label>
                  <Select onValueChange={handleBranchChange}>
                    <SelectTrigger className="w-full border-gray-200">
                      <SelectValue placeholder="Select VLC" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {branches.map((branch) => (
                        <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                          {branch.username} - {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Date
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
                    Shift
                  </Label>
                  <Select value={shift} onValueChange={handleShiftChange}>
                    <SelectTrigger className="w-full bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Farmer Search */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Farmer ID
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={farmerIdInput}
                      onChange={(e) => setFarmerIdInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFarmerSearch()}
                      placeholder="Enter Farmer ID"
                      className="border-gray-200"
                    />
                    <Button onClick={handleFarmerSearch} className="bg-blue-500 hover:bg-blue-600">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Farmer Name
                  </Label>
                  <Input
                    value={farmerName}
                    readOnly
                    className="border-gray-200 bg-gray-50"
                  />
                </div>
              </div>
            </div>
            <Separator className="my-4" />

            {/* Collection Details */}
            <div className="space-y-4 bg-white p-5 rounded-2xl">
              <h3 className="text-lg font-semibold text-gray-900">
                Collection Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Milk Type
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
                    Quantity
                  </Label>
                  <Input
                    ref={quantityRef}
                    type="number"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Fat %
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    SNF %
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
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
                    CLR
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
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
                    Rate per ltr
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

            <Separator className="my-4" />

            {/* Total Amount */}
            <div className="flex justify-between items-center p-4 rounded-2xl bg-white">
              <span className="text-lg font-semibold text-gray-900">
                Total Amount
              </span>
              <span className="text-2xl font-bold text-green-600">₹{amount.toFixed(2)}</span>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-[40%] bg-green-500 hover:bg-green-600 text-white py-3 text-lg font-medium"
            >
              <Save className="mr-2" />
              {loading ? 'Saving...' : editingId ? 'Update' : 'Submit'}
            </Button>
          </div>

          {/* Recent Collections Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-0 shadow-gray-200/50 p-5 bg-white">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Recent Collections
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
                    {selectedBranch ? 'No recent collections' : 'Select VLC to view collections'}
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
              <DialogTitle className="text-2xl font-bold text-gray-900">Collection Already Exists</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Farmer: <span className="font-bold">{farmerName}</span>
                </p>
                <p className="text-sm text-blue-800">
                  A collection for <span className="font-semibold">{milkType}</span> milk in <span className="font-semibold">{shift}</span> shift already exists.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">What would you like to do?</p>
                
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    onClick={handleMultipleCollection} 
                    className="bg-green-500 hover:bg-green-600 text-white h-auto py-3 flex flex-col items-start"
                  >
                    <span className="font-semibold">Add Multiple Collection</span>
                    <span className="text-xs opacity-90">Add new collection to the existing one</span>
                  </Button>
                  
                  <Button 
                    onClick={handleModify} 
                    className="bg-blue-500 hover:bg-blue-600 text-white h-auto py-3 flex flex-col items-start"
                  >
                    <span className="font-semibold">Modify Existing</span>
                    <span className="text-xs opacity-90">Update the previous collection details</span>
                  </Button>
                  
                  <Button 
                    onClick={handleDelete} 
                    className="bg-red-500 hover:bg-red-600 text-white h-auto py-3 flex flex-col items-start"
                  >
                    <span className="font-semibold">Delete Collection</span>
                    <span className="text-xs opacity-90">Remove the existing collection</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setShowModal(false)} 
                    variant="outline"
                    className="h-auto py-3"
                  >
                    Cancel
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
