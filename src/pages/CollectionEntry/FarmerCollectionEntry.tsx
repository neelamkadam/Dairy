import { useState, useEffect, useRef, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useSerialAnalyzer } from "@/hooks/useSerialAnalyzer";
import { LOCKED_INPUT_CLASS, LOCKED_INPUT_TITLE, useMachineEntryLock, useMachineValues } from "@/hooks/useMachineEntryLock";
import MachineOnlyTag from "@/components/MachineOnlyTag";
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
  ChevronDown,
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
import { VLCDropdown } from "@/components/ui/vlc-dropdown";

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
  const [shift, setShift] = useState<'Morning' | 'Evening'>(() => {
    const currentHour = new Date().getHours();
    return currentHour < 12 ? 'Morning' : 'Evening';
  });
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

  // Machine Entry Lock (this user): those readings only from the machine, never typed.
  // The web reads the analyser below; it has no weighing-machine connection.
  const machineLock = useMachineEntryLock();
  const machineValues = useMachineValues<'quantity' | 'fat' | 'snf'>();

  // Serial (wired machine) connection — logic lives in useSerialAnalyzer hook
  const { serialStatus, errorMessage, connectMachine, disconnectMachine } = useSerialAnalyzer({
    enabled: !!farmerId,
    onData: useCallback((data) => {
      machineValues.accept('fat', data.fat);
      machineValues.accept('snf', data.snf);
      setFat(data.fat);
      setSnf(data.snf);
      setClr('');
    }, [machineValues]),
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
    if (machineLock.weight && !machineValues.fromMachine('quantity', quantity)) {
      toast.error('Your quantity can only come from the weighing machine. Use Doodh Setu PC.');
      return;
    }
    if (machineLock.analyser && !(machineValues.fromMachine('fat', fat) && machineValues.fromMachine('snf', snf))) {
      toast.error('Your FAT and SNF can only come from the milk analyser. Connect it and run the sample.');
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

          const existingAmt = parseFloat((existing as any).amount?.toString() || '0');
          const totalAmount = existingAmt + amount;

          // Recalculate CLR from weighted averages
          const weightedClr = calculateCLRFromFatAndSNF(weightedFat.toString(), weightedSnf.toString());

          let payload: any = {
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
          toast.success(t('collections_merged_successfully'));
          setIsMultipleMode(false);
        }
      } else {
        let payload: any = {
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
      const amtVal = typeof (existing as any).amount === 'number' ? (existing as any).amount : parseFloat((existing as any).amount?.toString() || '0');
      setEditingId(existing.id);
      setQuantity(qtyVal.toString());
      setFat(parseFloat(existing.fat.toString()).toFixed(1));
      setSnf(parseFloat(existing.snf.toString()).toFixed(1));
      // The saved entry's own values may be saved again under Machine Entry Lock.
      machineValues.accept('quantity', qtyVal.toString());
      machineValues.accept('fat', parseFloat(existing.fat.toString()).toFixed(1));
      machineValues.accept('snf', parseFloat(existing.snf.toString()).toFixed(1));
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
    <div className="min-h-screen bg-gray-50/50 min-w-0 max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <User className="h-6 w-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 font-serif tracking-wide">
              {t('farmer_collection_entry')}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <Button
              onClick={() => navigate(ROUTES.CC_COLLECTION.ANALYSER_COLLECTION)}
              className="flex-1 sm:flex-none bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 shadow-sm transition-all rounded-xl h-10 px-4 font-medium"
              variant="outline"
            >
              Analyser
            </Button>
            <Button
              onClick={() => navigate(ROUTES.CC_COLLECTION.WEIGHT_COLLECTION)}
              className="flex-1 sm:flex-none bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 shadow-sm transition-all rounded-xl h-10 px-4 font-medium"
              variant="outline"
            >
              Weight Collection
            </Button>
            {!(machineLock.analyser || machineLock.weight) && (
              <div className="w-full sm:w-auto [&>button]:w-full">
                <BulkCollectionUpload />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* Main Form */}
          <div className="lg:col-span-2" ref={formContainerRef} onKeyDownCapture={handleEnterAsTab}>
            <Card className="shadow-sm border border-gray-200/60 bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 space-y-6">
                {/* Top Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                      {t('vlc_name')}
                    </Label>
                    <VLCDropdown
                      branches={branches || []}
                      value={selectedBranch ? String(selectedBranch) : ""}
                      onChange={handleBranchChange}
                      valueKey="branch_id"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                      {t('date')}
                    </Label>
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
                      className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                      {t('shift')}
                    </Label>
                    <select
                      id="shift-select"
                      value={shift}
                      onChange={(e) => {
                        const newShift = e.target.value as 'Morning' | 'Evening';
                        void handleShiftChange(newShift);
                      }}
                      className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm text-sm px-3 outline-none"
                    >
                      <option value="Morning">{t('morning')}</option>
                      <option value="Evening">{t('evening')}</option>
                    </select>
                  </div>
                </div>

                {/* Farmer Search */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-1 space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                      {t('farmer_id')}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        ref={farmerIdInputRef}
                        value={farmerIdInput}
                        onChange={(e) => setFarmerIdInput(e.target.value)}
                        data-enter-action="farmer-search"
                        placeholder={t('enter_farmer_id')}
                        className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm text-sm font-medium"
                      />
                      <Button onClick={handleFarmerSearch} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 w-10 p-0 shadow-md shadow-blue-500/20 transition-all shrink-0">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                      {t('farmer_name')}
                    </Label>
                    <Input
                      value={farmerName}
                      readOnly
                      className="bg-blue-50/30 border-blue-100 text-blue-900 font-semibold w-full h-10 rounded-xl shadow-inner cursor-not-allowed"
                    />
                  </div>
                </div>

                <Separator className="border-gray-100" />

                {/* Collection Details */}
                <div className="space-y-6">
                  {/* Analyzer machine connection bar */}
                  <div className={`rounded-xl border px-5 py-4 transition-colors ${serialStatus === 'error' ? 'border-red-200 bg-red-50/80' : 'border-gray-100 bg-gray-50/80'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${serialStatus === 'connected' ? 'bg-green-500' :
                              serialStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                                serialStatus === 'error' ? 'bg-red-500' : 'bg-gray-300'
                            }`}
                        />
                        {serialStatus === 'connected'
                          ? (farmerId ? 'Analyzer ready — run a measurement to auto-fill FAT & SNF' : 'Analyzer connected — enter Farmer ID to enable auto-fill')
                          : serialStatus === 'connecting' ? 'Connecting…'
                            : serialStatus === 'error' ? 'Connection error'
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
                    {serialStatus === 'error' && errorMessage && (
                      <p className="mt-1.5 text-xs text-red-600">{errorMessage}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
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
                              "flex-1 h-10 rounded-xl font-semibold transition-all shadow-sm",
                              milkType === type
                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200/50"
                            )}
                          >
                            {type}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                        {t('liter')}{machineLock.weight && <MachineOnlyTag />}
                      </Label>
                      <Input
                        ref={quantityRef}
                        type="number"
                        step="0.1"
                        value={quantity}
                        placeholder="0.00"
                        onChange={(e) => setQuantity(e.target.value)}
                        readOnly={machineLock.weight}
                        title={machineLock.weight ? LOCKED_INPUT_TITLE : undefined}
                        className={cn("bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900", machineLock.weight && LOCKED_INPUT_CLASS)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                        {t('fat')} <span className="text-gray-400 normal-case font-normal">(%)</span>{machineLock.analyser && <MachineOnlyTag />}
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={fat}
                        placeholder="0.0"
                        onChange={(e) => setFat(e.target.value)}
                        readOnly={machineLock.analyser}
                        title={machineLock.analyser ? LOCKED_INPUT_TITLE : undefined}
                        className={cn("bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900", machineLock.analyser && LOCKED_INPUT_CLASS)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                        {t('snf')} <span className="text-gray-400 normal-case font-normal">(%)</span>{machineLock.analyser && <MachineOnlyTag />}
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
                        readOnly={machineLock.analyser}
                        title={machineLock.analyser ? LOCKED_INPUT_TITLE : undefined}
                        className={cn("bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900", machineLock.analyser && LOCKED_INPUT_CLASS)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                        {t('clr')}{machineLock.analyser && <MachineOnlyTag />}
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
                        readOnly={machineLock.analyser}
                        title={machineLock.analyser ? LOCKED_INPUT_TITLE : undefined}
                        className={cn("bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900", machineLock.analyser && LOCKED_INPUT_CLASS)}
                      />
                    </div>
                    {showWater && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                          {t('water')} <span className="text-gray-400 normal-case font-normal">(%)</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={water}
                          onChange={(e) => setWater(e.target.value)}
                          className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                        {t('rate_per_liter')}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        placeholder="0.00"
                        readOnly
                        className="bg-blue-50/30 border-blue-100 text-blue-900 font-semibold w-full h-10 rounded-xl shadow-inner cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Amount & Submit Block */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100 mt-2">
                  <div className="flex items-center gap-3 bg-green-50/50 px-4 py-2 rounded-xl border border-green-100/50">
                    <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      {t('total_amount')}:
                    </span>
                    <span className="text-xl font-bold text-green-600">₹{amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end gap-3">
                    {editingId && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          // Add reset logic here if needed, keeping it similar to VLC
                        }}
                        className="w-full sm:w-auto border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl px-6 h-10"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 h-10 shadow-md shadow-green-500/20 font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {loading ? t('saving') : editingId ? t('update') : t('submit')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Collections Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border border-gray-200/60 bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden sticky top-6">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-5">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center justify-between">
                  <span>{t('recent_collections')}</span>
                  <span className="bg-blue-100 text-blue-700 py-0.5 px-2.5 rounded-full text-xs font-bold">
                    {recentCollections.length}
                  </span>
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
