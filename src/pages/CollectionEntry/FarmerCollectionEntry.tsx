import { useState, useEffect, useRef, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useSerialAnalyzer } from "@/hooks/useSerialAnalyzer";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constatnts/routesConstants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, parse, isValid } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CalendarIcon,
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
import { settingsApi } from "@/services/settingsApi";
import BulkCollectionUpload from "@/pages/Collection/BulkCollectionUpload";

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
  const navigate = useNavigate();
  const branches = useAppSelector((state) => state.branch.branches);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [dateInput, setDateInput] = useState<string>(format(new Date(), "dd-MM-yyyy"));
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
  const farmerIdInputRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const cowMilkTypeButtonRef = useRef<HTMLButtonElement>(null);
  const buffaloMilkTypeButtonRef = useRef<HTMLButtonElement>(null);
  const modalPrimaryActionRef = useRef<HTMLButtonElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [showWater, setShowWater] = useState(false);

  // Serial (wired machine) connection — logic lives in useSerialAnalyzer hook
  const { serialStatus, connectMachine, disconnectMachine } = useSerialAnalyzer({
    enabled: !!farmerId,
    onData: useCallback((data) => {
      setFat(data.fat);
      setSnf(data.snf);
      setClr('');
    }, []),
  });

  useEffect(() => {
    if (selectedBranch) {
      fetchSettings();
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (!showModal) return;

    setTimeout(() => {
      modalPrimaryActionRef.current?.focus();
    }, 0);
  }, [showModal]);

  const fetchSettings = async () => {
    if (!selectedBranch) return;
    try {
      const { data } = await settingsApi.get(selectedBranch.toString());
      setShowWater(data.data?.show_water === 1);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

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
            setTimeout(() => {
              buffaloMilkTypeButtonRef.current?.focus();
            }, 0);
            return;
          } else if (hasBuffalo && !hasCow) {
            // Buffalo exists, Cow doesn't - proceed with Cow
            console.log('➡️ Buffalo exists, proceeding with Cow');
            setMilkType('Cow');
            setTimeout(() => {
              cowMilkTypeButtonRef.current?.focus();
            }, 0);
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

      if (farmer.milkType === 'Both') {
        toast.info(t('select_milk_type'));
        setTimeout(() => {
          cowMilkTypeButtonRef.current?.focus();
        }, 0);
        return;
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

      setTimeout(() => {
        farmerIdInputRef.current?.focus();
      }, 0);
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
      setRecentCollections(collections);
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
      setDateInput(format(newDate, 'dd-MM-yyyy'));
      resetForm();
      if (selectedBranch) {
        await fetchRecentCollections(selectedBranch, format(newDate, 'yyyy-MM-dd'), shift);
      }
    }
  };

  const parseTypedDate = (value: string): Date | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const ddmmyyyy = parse(trimmed, 'dd-MM-yyyy', new Date());
    if (isValid(ddmmyyyy) && format(ddmmyyyy, 'dd-MM-yyyy') === trimmed) {
      return ddmmyyyy;
    }

    const yyyymmdd = parse(trimmed, 'yyyy-MM-dd', new Date());
    if (isValid(yyyymmdd) && format(yyyymmdd, 'yyyy-MM-dd') === trimmed) {
      return yyyymmdd;
    }

    return null;
  };

  const formatDateInputWithHyphen = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 8);

    if (digitsOnly.length <= 2) return digitsOnly;
    if (digitsOnly.length <= 4) {
      return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2)}`;
    }

    return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 4)}-${digitsOnly.slice(4)}`;
  };

  const handleDateInputCommit = async () => {
    const parsedDate = parseTypedDate(dateInput);
    if (!parsedDate) {
      toast.error('Please enter date in DD-MM-YYYY or YYYY-MM-DD format');
      setDateInput(format(date, 'dd-MM-yyyy'));
      return;
    }
    await handleDateChange(parsedDate);
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
      // Set the milk type to the existing collection's type for editing
      setMilkType((existing.type || existing.milkType) as 'Cow' | 'Buffalo');
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
    // If we're in editing mode, allow changing milk type freely
    if (editingId) {
      setMilkType(type);
      return;
    }
    
    // Check if collection exists for this type
    const hasCollection = existingCollections.some(c => (c.type || c.milkType) === type);
    
    if (hasCollection) {
      // Show modal for existing collection
      setMilkType(type);
      setShowModal(true);
    } else {
      // Just change the milk type
      setMilkType(type);
      quantityRef.current?.focus();
    }
  };

  const focusNextField = (currentElement: HTMLElement) => {
    const container = formContainerRef.current;
    if (!container) return;

    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(
        'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => {
      if (el.hasAttribute('disabled')) return false;
      if (el.getAttribute('tabindex') === '-1') return false;
      if (el instanceof HTMLInputElement && el.type === 'hidden') return false;
      return el.offsetParent !== null;
    });

    const currentIndex = focusableElements.indexOf(currentElement);
    if (currentIndex === -1) return;

    for (let i = currentIndex + 1; i < focusableElements.length; i += 1) {
      const next = focusableElements[i];
      if (next instanceof HTMLButtonElement && next.type === 'submit') {
        continue;
      }
      next.focus();
      break;
    }
  };

  const handleEnterAsTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return;

    const target = e.target as HTMLElement;
    if (!target) return;

    if (target instanceof HTMLTextAreaElement) return;
    if (target instanceof HTMLButtonElement) return;

    if (target instanceof HTMLInputElement && target.dataset.enterAction === 'farmer-search') {
      e.preventDefault();
      void handleFarmerSearch();
      return;
    }

    if (target instanceof HTMLInputElement && target.dataset.enterAction === 'submit-entry') {
      e.preventDefault();
      void handleSubmit();
      return;
    }

    const explicitNextId = target.dataset.enterNext;
    if (explicitNextId) {
      const explicitNextElement = document.getElementById(explicitNextId) as HTMLElement | null;
      if (explicitNextElement) {
        e.preventDefault();
        explicitNextElement.focus();
        return;
      }
    }

    e.preventDefault();
    focusNextField(target);
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
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(ROUTES.CC_COLLECTION.ANALYSER_COLLECTION)}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 shadow-sm transition-colors"
              variant="outline"
            >
              Analyser
            </Button>
            <Button
              onClick={() => navigate(ROUTES.CC_COLLECTION.WEIGHT_COLLECTION)}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition-colors"
              variant="outline"
            >
              Weight Collection
            </Button>
            <BulkCollectionUpload />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* Main Form */}
          <div className="lg:col-span-2" ref={formContainerRef} onKeyDownCapture={handleEnterAsTab}>
            <div className="space-y-4 bg-white p-5 rounded-2xl">
              {/* Top Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ">
                <div>
                  <Label className="text-sm font-medium text-gray-700 block">
                    {t('vlc_name')}
                  </Label>
                  <select
                    value={selectedBranch?.toString() || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        void handleBranchChange(value);
                      }
                    }}
                    className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('select_vlc')}</option>
                    {branches.map((branch) => (
                      <option key={branch.branch_id} value={branch.branch_id.toString()}>
                        {branch.username} - {branch.name} - {branch.branchName || ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    {t('date')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={format(date, "yyyy-MM-dd")}
                      data-enter-next="shift-select"
                      onChange={(e) => {
                        const newDateStr = e.target.value;
                        if (newDateStr) {
                          const newDate = new Date(newDateStr);
                          if (isValid(newDate)) {
                            void handleDateChange(newDate);
                          }
                        }
                      }}
                      className="border-gray-200 w-full h-10"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    {t('shift')}
                  </Label>
                  <select
                    id="shift-select"
                    value={shift}
                    onChange={(e) => {
                      const newShift = e.target.value as 'Morning' | 'Evening';
                      void handleShiftChange(newShift);
                    }}
                    className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Morning">{t('morning')}</option>
                    <option value="Evening">{t('evening')}</option>
                  </select>
                </div>
              </div>
              {/* Farmer Search */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('farmer_id')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      ref={farmerIdInputRef}
                      value={farmerIdInput}
                      onChange={(e) => setFarmerIdInput(e.target.value)}
                      data-enter-action="farmer-search"
                      placeholder={t('enter_farmer_id')}
                      className="border-gray-200"
                    />
                    <Button onClick={handleFarmerSearch} className="bg-blue-500 hover:bg-blue-600">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('farmer_name')}
                  </Label>
                  <Input
                    value={farmerName}
                    readOnly
                    className="border-gray-200 bg-gray-50 font-semibold"
                  />
                </div>
              </div>
            </div>
            <Separator className="my-1" />

            {/* Collection Details */}
            <div className="space-y-4 bg-white p-5 rounded-2xl">
              {/* Analyzer machine connection bar */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      serialStatus === 'connected' ? 'bg-green-500' :
                      serialStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                      serialStatus === 'error' ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  />
                  {serialStatus === 'connected' ? 'Analyzer connected — FAT & SNF auto-fill active'
                    : serialStatus === 'connecting' ? 'Connecting…'
                    : serialStatus === 'error' ? 'Connection lost'
                    : 'Analyzer not connected'}
                </div>
                {serialStatus === 'connected' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                    onClick={disconnectMachine}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                    disabled={serialStatus === 'connecting'}
                    onClick={connectMachine}
                  >
                    Connect Analyzer
                  </Button>
                )}
              </div>
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
                        ref={type === 'Cow' ? cowMilkTypeButtonRef : type === 'Buffalo' ? buffaloMilkTypeButtonRef : undefined}
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
                    {t('liter')}
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
                    data-enter-action="submit-entry"
                    placeholder="0.0"
                    value={clr}
                    onChange={(e) => {
                      setClr(e.target.value);
                      if (e.target.value) setSnf('');
                    }}
                    className="border-gray-200"
                  />
                </div>
                {showWater && (
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
                )}
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
                  {t('recent_collections')} ({recentCollections.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentCollections.length > 0 ? (
                  <div className="space-y-0 max-h-96 overflow-y-auto">
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
                    ref={modalPrimaryActionRef}
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
