import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { format, isValid } from "date-fns";
import { EyeOff, FlaskConical, Loader2, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import LastEntryDetails, { Entry } from "@/components/LastEntryDetails";
import { usePostApi, usePutApi, useDeleteApi } from "@/services/use-api";
import { useAppSelector } from "@/redux/store";
import { cn } from "@/lib/utils";
import { rateChartApi } from "@/services/rateChartApi";
import {
  vlcCollectionApi,
  isWeightCompleted,
  VLCMilkType,
  VLCWeightRecord,
} from "@/services/vlcCollectionApi";
import { calculateCLRFromFatAndSNF, calculateSNFFromFatAndCLR } from "@/utils/milkCalculations";

interface VLCAnalyserEntryProps {
  date: string;
  shift: 'Morning' | 'Evening';
  refreshKey: number;
}

type FinalEntry = Entry & {
  rate?: number;
  amount?: number;
  vlc_weight_id?: number | null;
};

// The weighed sample being analysed, or a finalized entry being edited
interface AnalysisRecord {
  weightId?: number;
  vlc_id: string;
  vlc_name: string;
  type: VLCMilkType;
  weight: number;
  sample_id?: number | string | null;
  entryDate?: string;
}

const RATE_CHART_NAME = 'Rate Chart 1';
const BASIS_STORAGE_KEY = 'vlc_analyser_basis';
// How often to look for newly weighed samples while there is nothing to analyse
const IDLE_REFRESH_MS = 10000;

const VLCAnalyserEntry = ({ date, shift, refreshKey }: VLCAnalyserEntryProps) => {
  const { t } = useTranslation();
  const { postData, isLoading } = usePostApi({
    path: "/api/web/collection/vlc-entry"
  });
  const { postData: fetchEntries } = usePostApi({
    path: "/api/web/collection/vlc-entries"
  });
  const { putData, isLoading: isUpdating } = usePutApi({
    path: "/api/web/collection/vlc-entry"
  });
  const { deleteData } = useDeleteApi({
    path: "/api/web/collection/vlc-entry"
  });
  const { branches } = useAppSelector((state) => state.branch);

  const [weightEntries, setWeightEntries] = useState<VLCWeightRecord[]>([]);
  const [finalEntries, setFinalEntries] = useState<FinalEntry[]>([]);
  const [sampleInput, setSampleInput] = useState("");
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fat, setFat] = useState("");
  const [snf, setSnf] = useState("");
  const [clr, setClr] = useState("");
  // Whichever of SNF/CLR the operator typed last; the other one is derived from it.
  // Remembered per machine, so FAT + Enter goes straight to the field this desk uses.
  const [basis, setBasis] = useState<'snf' | 'clr'>(() =>
    localStorage.getItem(BASIS_STORAGE_KEY) === 'clr' ? 'clr' : 'snf'
  );
  const [rate, setRate] = useState("");
  const [calculatingRate, setCalculatingRate] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  // Samples sent to the back of the queue with Skip, oldest skip first
  const [skippedIds, setSkippedIds] = useState<number[]>([]);
  // Finalized here this session — kept out of the queue even before a refresh confirms it
  const finalizedIdsRef = useRef<Set<number>>(new Set());

  const sampleInputRef = useRef<HTMLInputElement>(null);
  const fatRef = useRef<HTMLInputElement>(null);
  const snfRef = useRef<HTMLInputElement>(null);
  const clrRef = useRef<HTMLInputElement>(null);

  const saving = finalizing || isLoading || isUpdating;

  // The date + shift the lists belong to; a response for an older pair is dropped
  // so it can never feed the auto-queue with another shift's samples.
  const scope = `${date}|${shift}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const listPayload = () => ({
    vlc_ids: (branches || []).map(branch => branch.username),
    date,
    shift
  });

  const loadWeightEntries = async (): Promise<VLCWeightRecord[]> => {
    const requestScope = scope;
    const response = await vlcCollectionApi.getWeights(listPayload());
    if (!response?.success) return [];
    const data = response.data || [];
    if (requestScope === scopeRef.current) setWeightEntries(data);
    return data;
  };

  const loadFinalEntries = async (): Promise<FinalEntry[]> => {
    const requestScope = scope;
    const response = await fetchEntries(listPayload());
    if (!response?.data?.success) return [];
    const data = response.data.data || [];
    if (requestScope === scopeRef.current) setFinalEntries(data);
    return data;
  };

  const refreshAll = () => {
    if (!branches?.length) return;
    Promise.all([loadWeightEntries(), loadFinalEntries()]).catch((error) => {
      console.error('Failed to fetch VLC entries:', error);
    });
  };

  useEffect(() => {
    refreshAll();
  }, [branches, date, shift, refreshKey]);

  useEffect(() => {
    // The previous shift's lists must not feed the auto-queue while the new ones load.
    setWeightEntries([]);
    setFinalEntries([]);
    setSkippedIds([]);
    resetForm();
  }, [date, shift]);

  const isAnalysed = (weightRecord: VLCWeightRecord, finals: FinalEntry[] = finalEntries) =>
    isWeightCompleted(weightRecord) ||
    finalizedIdsRef.current.has(weightRecord.id) ||
    finals.some(f => f.vlc_weight_id != null && String(f.vlc_weight_id) === String(weightRecord.id));

  const pendingSamples = weightEntries
    .filter(w => !isAnalysed(w))
    .sort((a, b) => (parseInt(String(a.sample_id)) || 0) - (parseInt(String(b.sample_id)) || 0));

  // The order samples load in: lowest sample # first, skipped ones after the rest.
  const skippedSamples = skippedIds
    .map(id => pendingSamples.find(w => w.id === id))
    .filter((w): w is VLCWeightRecord => !!w);
  const queue = [...pendingSamples.filter(w => !skippedIds.includes(w.id)), ...skippedSamples];
  const nextQueuedId = queue[0]?.id;

  const resetForm = () => {
    setRecord(null);
    setEditingId(null);
    setSampleInput("");
    setFat("");
    setSnf("");
    setClr("");
    setRate("");
  };

  const selectRecord = (weightRecord: VLCWeightRecord) => {
    setEditingId(null);
    setRecord({
      weightId: weightRecord.id,
      vlc_id: weightRecord.vlc_id,
      vlc_name: weightRecord.vlc_name,
      type: weightRecord.type,
      weight: Number(weightRecord.weight),
      sample_id: weightRecord.sample_id
    });
    setSampleInput(String(weightRecord.sample_id));
    setFat("");
    setSnf("");
    setClr("");
    setRate("");
    setTimeout(() => fatRef.current?.focus(), 50);
  };

  // Auto-advance: with nothing loaded, the next sample in the queue loads by
  // itself, so the operator only ever types FAT, SNF or CLR and Enter.
  useEffect(() => {
    if (record || editingId || finalizing || lookingUp) return;
    if (queue[0]) selectRecord(queue[0]);
  }, [nextQueuedId, record, editingId, finalizing, lookingUp]);

  // While there is nothing to analyse, look for newly weighed samples.
  const refreshRef = useRef(refreshAll);
  refreshRef.current = refreshAll;
  useEffect(() => {
    if (record || editingId) return;
    const timer = setInterval(() => refreshRef.current(), IDLE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [record, editingId]);

  const handleSkip = () => {
    const skippedId = record?.weightId;
    if (!skippedId) return;
    setSkippedIds(prev => [...prev.filter(id => id !== skippedId), skippedId]);
    resetForm();
  };

  const handleLookup = async () => {
    const key = sampleInput.trim();
    if (!key || !branches?.length) return;
    // A failed jump leaves the loaded sample in place, so show its number again.
    const restoreInput = () => setSampleInput(record?.sample_id != null ? String(record.sample_id) : "");

    setLookingUp(true);
    try {
      // Refetch so samples weighed/analysed at another station are picked up
      const [weights, finals] = await Promise.all([loadWeightEntries(), loadFinalEntries()]);
      const match = weights.find(w => Number(w.sample_id) === Number(key));
      if (!match) {
        toast.error(`No weight entry found for Sample #${key}`);
        restoreInput();
        return;
      }
      if (isAnalysed(match, finals)) {
        toast.warning(`Sample #${key} is already analysed`);
        restoreInput();
        return;
      }
      selectRecord(match);
    } catch (error) {
      console.error('Sample lookup failed:', error);
      toast.error("Lookup failed");
    } finally {
      setLookingUp(false);
    }
  };

  const handleFatChange = (value: string) => {
    setFat(value);
    if (basis === 'clr') {
      setSnf(value && clr ? calculateSNFFromFatAndCLR(value, clr) : "");
    } else {
      setClr(value && snf ? calculateCLRFromFatAndSNF(value, snf) : "");
    }
  };

  const rememberBasis = (next: 'snf' | 'clr') => {
    setBasis(next);
    localStorage.setItem(BASIS_STORAGE_KEY, next);
  };

  const handleSnfChange = (value: string) => {
    rememberBasis('snf');
    setSnf(value);
    setClr(fat && value ? calculateCLRFromFatAndSNF(fat, value) : "");
  };

  const handleClrChange = (value: string) => {
    rememberBasis('clr');
    setClr(value);
    setSnf(fat && value ? calculateSNFFromFatAndCLR(fat, value) : "");
  };

  const fetchRate = async (target: AnalysisRecord, fatValue: string, snfValue: string) => {
    const selectedBranch = branches?.find(branch => branch.username === target.vlc_id);
    if (!selectedBranch) return null;

    const response = await rateChartApi.getRate(
      parseFloat(fatValue),
      parseFloat(snfValue),
      selectedBranch.branch_id,
      RATE_CHART_NAME,
      String(target.type).toLowerCase() === 'buffalo' ? 'Buffalo' : 'Cow',
      date,
      shift
    );
    return response?.price ? Number(response.price) : null;
  };

  // Live rate preview while FAT/SNF are being entered
  useEffect(() => {
    if (!record || !fat || !snf) {
      setRate("");
      setCalculatingRate(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setCalculatingRate(true);
      try {
        const price = await fetchRate(record, fat, snf);
        if (cancelled) return;
        setRate(price ? price.toString() : '0');
      } catch (error: any) {
        if (cancelled) return;
        console.error('❌ Error fetching rate:', error);
        setRate('0');
        if (error?.response?.status === 404) {
          toast.error('Rate not found for selected parameters');
        }
      } finally {
        if (!cancelled) setCalculatingRate(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [record, fat, snf, date, shift, branches]);

  const handleSubmit = async () => {
    // Enter can repeat while a save is in flight; one save per sample.
    if (!record || saving) return;
    if (!fat || !snf || !clr) {
      toast.error("FAT, SNF and CLR are required");
      return;
    }

    setFinalizing(true);
    try {
      // Re-resolve the rate at submit time so a fast Enter never saves a stale preview
      let price: number | null = null;
      try {
        price = await fetchRate(record, fat, snf);
      } catch (error) {
        console.error('❌ Error fetching rate:', error);
      }
      if (!price) {
        toast.error('Rate not found for selected parameters');
        return;
      }

      const finalAmount = Number((record.weight * price).toFixed(2));
      setRate(price.toString());

      const payload = {
        date: record.entryDate ?? `${date} ${format(new Date(), 'HH:mm:ss')}`,
        shift,
        vlc_id: record.vlc_id,
        vlc_name: record.vlc_name,
        weight: record.weight,
        fat: parseFloat(fat),
        snf: parseFloat(snf),
        clr: parseFloat(clr),
        rate: price,
        amount: finalAmount,
        type: record.type,
        sample_id: record.sample_id ?? null,
        vlc_weight_id: record.weightId ?? null
      };

      const response = editingId
        ? await putData(payload, `/api/web/collection/vlc-entry/${editingId}`)
        : await postData(payload);

      if (response?.data?.success) {
        toast.success(editingId
          ? "VLC entry updated successfully"
          : `Sample #${record.sample_id} analysed successfully`);
        // Out of the queue right away, so the next sample loads without waiting for the refresh
        if (!editingId && record.weightId) finalizedIdsRef.current.add(record.weightId);
        const hasNext = queue.some(w => w.id !== record.weightId);
        resetForm();
        refreshAll();
        // Otherwise auto-advance loads the next sample and focuses FAT
        if (!hasNext) setTimeout(() => sampleInputRef.current?.focus(), 50);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} VLC entry`);
      // Finalized meanwhile at another analyser desk: move on to the next sample
      if (error?.response?.status === 409 && !editingId && record.weightId) {
        finalizedIdsRef.current.add(record.weightId);
        resetForm();
        refreshAll();
      }
    } finally {
      setFinalizing(false);
    }
  };

  const handleEdit = (entry: FinalEntry) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const entryDate = new Date(entry.date);
    setEditingId(entry.id);
    setRecord({
      weightId: entry.vlc_weight_id ?? undefined,
      vlc_id: entry.vlc_id,
      vlc_name: entry.vlc_name,
      type: (entry.type as VLCMilkType) || 'Both',
      weight: Number(entry.weight),
      sample_id: entry.sample_id,
      entryDate: isValid(entryDate) ? format(entryDate, 'yyyy-MM-dd HH:mm:ss') : undefined
    });
    setSampleInput(entry.sample_id != null ? String(entry.sample_id) : "");
    setFat(String(entry.fat ?? ""));
    setSnf(String(entry.snf ?? ""));
    setClr(String(entry.clr ?? ""));
    setRate(entry.rate ? entry.rate.toString() : "");
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      const response = await deleteData(`/api/web/collection/vlc-entry/${id}`);
      if (response?.data?.success) {
        // The API hands its sample back to pending; let it back into the queue too.
        const deleted = finalEntries.find(f => f.id === id);
        if (deleted?.vlc_weight_id != null) finalizedIdsRef.current.delete(Number(deleted.vlc_weight_id));
        if (editingId === id) resetForm();
        refreshAll();
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  // FAT + Enter jumps to whichever of SNF / CLR this desk uses.
  const handleFatEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    (basis === 'clr' ? clrRef : snfRef).current?.focus();
  };

  // SNF / CLR + Enter saves; on an empty field it hops to the other one instead.
  const handleQualityEnter = (field: 'snf' | 'clr') => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    const value = field === 'snf' ? snf : clr;
    if (value.trim()) handleSubmit();
    else (field === 'snf' ? clrRef : snfRef).current?.focus();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 w-full min-w-0">
      <div className="w-full lg:w-[65%] space-y-4 md:space-y-6 min-w-0">
        {/* Sample lookup */}
        <Card className="shadow-sm border border-gray-200/60 bg-white/95 rounded-2xl overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="sampleId" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('sample_id')}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    ref={sampleInputRef}
                    id="sampleId"
                    type="number"
                    placeholder="Enter Sample ID..."
                    value={sampleInput}
                    disabled={!!editingId}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setSampleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLookup();
                      }
                    }}
                    className="pl-9 bg-white border-gray-200 hover:border-purple-300 focus:border-purple-500 focus:ring-purple-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-semibold text-gray-900"
                  />
                </div>
              </div>
              <Button
                onClick={handleLookup}
                disabled={lookingUp || !sampleInput || !!editingId}
                className="h-10 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold"
              >
                {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load Sample"}
              </Button>
            </div>

            {!editingId && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pending samples <span className="text-amber-600">({queue.length})</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Samples load one after another — type a number to jump to a different one.
                  </p>
                </div>
                {queue.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                    {queue.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => selectRecord(w)}
                        title={skippedIds.includes(w.id) ? "Skipped — comes back after the others" : undefined}
                        className={cn(
                          "px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors",
                          skippedIds.includes(w.id) && "border-dashed",
                          record?.weightId === w.id
                            ? "border-purple-400 bg-purple-50 text-purple-700"
                            : "border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50/50"
                        )}
                      >
                        #{w.sample_id} · {w.type}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    All weighed samples for this shift are analysed. New ones load here automatically.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {record ? (
          <Card className="shadow-sm border border-gray-200/60 bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-6 enter-nav-container">
              {/* Sample details — blind test: the VLC and its weight are never shown to the analyser */}
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4 bg-purple-50/40 rounded-xl border border-purple-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('sample_id')}</span>
                  <p className="text-2xl font-black text-purple-700 leading-none">
                    {record.sample_id != null && record.sample_id !== '' ? `#${record.sample_id}` : '—'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Type</span>
                  <div><Badge className="bg-purple-100 text-purple-700 text-[10px]">{record.type}</Badge></div>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-gray-500 sm:ml-auto">
                  <EyeOff className="h-3.5 w-3.5" />
                  VLC and weight are hidden for blind testing
                </p>
              </div>

              {editingId && (
                <p className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  Editing a finalized entry — only FAT / SNF / CLR can be changed here.
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="fat" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('fat')} <span className="text-gray-400 normal-case font-normal">(%)</span>
                  </Label>
                  <Input
                    ref={fatRef}
                    id="fat"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={fat}
                    onChange={(e) => handleFatChange(e.target.value)}
                    onKeyDown={handleFatEnter}
                    className="bg-white border-gray-200 hover:border-purple-300 focus:border-purple-500 focus:ring-purple-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900 enter-field"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="snf" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('snf')} <span className="text-gray-400 normal-case font-normal">(%)</span>
                  </Label>
                  <Input
                    ref={snfRef}
                    id="snf"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={snf}
                    onChange={(e) => handleSnfChange(e.target.value)}
                    onKeyDown={handleQualityEnter('snf')}
                    className="bg-white border-gray-200 hover:border-purple-300 focus:border-purple-500 focus:ring-purple-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900 enter-field"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="clr" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('clr')}
                  </Label>
                  <Input
                    ref={clrRef}
                    id="clr"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={clr}
                    onChange={(e) => handleClrChange(e.target.value)}
                    onKeyDown={handleQualityEnter('clr')}
                    className="bg-white border-gray-200 hover:border-purple-300 focus:border-purple-500 focus:ring-purple-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-medium text-gray-900 enter-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="rate" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('rate_per_kg')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="rate"
                      type="number"
                      placeholder="0.00"
                      value={rate}
                      readOnly
                      className="bg-blue-50/30 border-blue-100 text-blue-900 font-semibold w-full h-10 rounded-xl shadow-inner cursor-not-allowed"
                    />
                    {calculatingRate && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
                    )}
                  </div>
                </div>
                {/* No amount here: amount ÷ rate would give the hidden weight away. It is still computed on submit. */}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
                {editingId ? (
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="w-full sm:w-auto border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl px-6"
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    disabled={saving || queue.length <= 1}
                    title="Test this sample later — it goes to the end of the queue"
                    className="w-full sm:w-auto border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl px-6"
                  >
                    Skip
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-8 h-10 shadow-md shadow-purple-500/20 font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {saving ? t('submitting') : editingId ? "Update Entry" : (
                    <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Finalize Sample</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-dashed border-gray-200">
            <FlaskConical className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">Waiting for the next weighed sample — it will load here automatically.</p>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[35%] min-w-0">
        <LastEntryDetails
          entries={finalEntries}
          onEdit={(entry) => handleEdit(entry as FinalEntry)}
          onDelete={handleDelete}
          hideVlcDetails
        />
      </div>
    </div>
  );
};

export default VLCAnalyserEntry;
