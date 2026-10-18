import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { AlertCircle, CheckCircle2, Loader2, RefreshCcw, Save, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppSelector } from "@/redux/store";
import { canModifyCollection } from "@/constatnts/commonConstants";
import VLCIdPicker from "./VLCIdPicker";
import RouteSelect from "@/components/RouteSelect";
import { ALL_ROUTES, useRouteFilter } from "@/hooks/useRouteFilter";
import { useVlcSerialNumbers } from "./vlcSerialNumbers";
import { cn } from "@/lib/utils";
import { LOCKED_INPUT_CLASS, LOCKED_INPUT_TITLE, useMachineEntryLock, useMachineValues } from "@/hooks/useMachineEntryLock";
import MachineOnlyTag from "@/components/MachineOnlyTag";
import {
  vlcCollectionApi,
  isWeightCompleted,
  VLCMilkType,
  VLCWeightRecord,
} from "@/services/vlcCollectionApi";

interface VLCWeightEntryProps {
  date: string;
  shift: 'Morning' | 'Evening';
  refreshKey: number;
  // Owned by the page so the chosen type survives saves and tab switches
  type: VLCMilkType;
  onTypeChange: (type: VLCMilkType) => void;
}

const MILK_TYPES: VLCMilkType[] = ['Cow', 'Buffalo', 'Both'];

const VLCWeightEntry = ({ date, shift, refreshKey, type, onTypeChange: setType }: VLCWeightEntryProps) => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  // Machine Entry Lock: a user locked on weight takes it only from the weighing
  // machine, which the web cannot read, so they weigh on Doodh Setu PC.
  const machineLock = useMachineEntryLock();
  // Route picker: the chosen route's VLCs in the VLC list, every VLC for All Routes.
  const { routes, routeId, setRouteId, branchesOf, routeBranches } = useRouteFilter();
  const canModify = canModifyCollection(useAppSelector((state) => state.authData.userData?.id));

  const [vlcId, setVlcId] = useState("");
  const [vlcName, setVlcName] = useState("");
  const [weight, setWeight] = useState("");
  const [entries, setEntries] = useState<VLCWeightRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Omit<VLCWeightRecord, 'id' | 'date' | 'shift'> | null>(null);

  const vlcFieldRef = useRef<HTMLDivElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);

  // For users who know their VLCs as 1, 2, 3 …: show that number next to the id.
  const serials = useVlcSerialNumbers(branches || []);
  const vlcLabel = (id: string, name: string) => {
    const number = serials.numberOf(id);
    return `${number ? `${number}. ` : ""}${id} - ${name}`;
  };

  const fetchEntries = async () => {
    if (!branches?.length) return;
    try {
      const response = await vlcCollectionApi.getWeights({
        vlc_ids: branches.map(branch => branch.username),
        date,
        shift
      });
      if (response?.success) {
        setEntries(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch VLC weight entries:', error);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [branches, date, shift, refreshKey]);

  useEffect(() => {
    setLastSaved(null);
  }, [date, shift]);

  // Sample IDs run serially per dairy for the selected date + shift
  const nextSampleId = entries.reduce((max, e) => Math.max(max, parseInt(String(e.sample_id)) || 0), 0) + 1;
  const sameVlcEntries = vlcId
    ? entries.filter(e => e.vlc_id === vlcId && String(e.type).toLowerCase() === type.toLowerCase())
    : [];
  const sortedEntries = [...entries].sort((a, b) => (parseInt(String(b.sample_id)) || 0) - (parseInt(String(a.sample_id)) || 0));
  const pendingCount = entries.filter(e => !isWeightCompleted(e)).length;
  const totalWeight = entries.reduce((sum, e) => sum + (Number(e.weight) || 0), 0);

  const handleVLCIdChange = (username: string) => {
    const selectedBranch = branches?.find(branch => branch.username === username);
    setVlcId(username);
    setVlcName(selectedBranch?.name || "");
  };

  const handleRouteChange = (id: string) => {
    setRouteId(id);
    // A VLC that is not on the new route is let go, so nothing is weighed against it by mistake.
    if (vlcId && id !== ALL_ROUTES && !branchesOf(id).some(branch => branch.username === vlcId)) {
      setVlcId("");
      setVlcName("");
    }
  };

  const handleSubmit = async () => {
    if (!vlcId || !vlcName) {
      toast.error("Please select a VLC");
      return;
    }
    if (machineLock.weight) {
      toast.error("Your weight can only come from the weighing machine. Use Doodh Setu PC.");
      return;
    }
    const qty = parseFloat(weight);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    setSaving(true);
    try {
      const response = await vlcCollectionApi.createWeight({
        date,
        shift,
        vlc_id: vlcId,
        vlc_name: vlcName,
        type,
        weight: qty,
        vlc_ids: (branches || []).map(branch => branch.username)
      });

      if (response?.success) {
        // The server allocates the serial; it differs from our preview if another desk saved first
        const sampleId = response.data?.sample_id ?? nextSampleId;
        toast.success(`Weight recorded — Sample #${sampleId}`);
        setLastSaved({ vlc_id: vlcId, vlc_name: vlcName, type, weight: qty, sample_id: sampleId });
        setVlcId("");
        setVlcName("");
        setWeight("");
        fetchEntries();
        // The VLC number box when numbering is on, otherwise the dropdown
        vlcFieldRef.current?.querySelector<HTMLElement>('input, button')?.focus();
      } else {
        toast.error(response?.message || "Failed to record weight");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to record weight");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: VLCWeightRecord) => {
    if (!canModify) return;
    if (!window.confirm(`Delete weight entry for Sample #${entry.sample_id}?`)) return;
    try {
      const response = await vlcCollectionApi.deleteWeight(entry.id);
      if (response?.success) {
        toast.success(`Sample #${entry.sample_id} deleted`);
        fetchEntries();
      } else {
        toast.error(response?.message || "Failed to delete weight entry");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete weight entry");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 w-full min-w-0">
      <div className="w-full lg:w-[65%] space-y-4 md:space-y-6 min-w-0">
        {lastSaved && (
          <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex flex-col items-center justify-center min-w-[88px] px-3 py-2 bg-white rounded-xl border border-green-200 shadow-sm">
              <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Sample</span>
              <span className="text-3xl font-black text-green-700 leading-none">#{lastSaved.sample_id}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-800">Weight recorded — label the sample bottle with this number.</p>
              <p className="text-sm text-green-700 truncate">
                {vlcLabel(lastSaved.vlc_id, lastSaved.vlc_name)} • {lastSaved.type} • {lastSaved.weight} kg
              </p>
            </div>
          </div>
        )}

        <Card className="shadow-sm border border-gray-200/60 bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 space-y-6 enter-nav-container">
            <div className={cn("grid grid-cols-1 gap-5", routes.length > 0 ? "md:grid-cols-3" : "md:grid-cols-2")}>
              {routes.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('route', 'Route')}
                  </Label>
                  <RouteSelect routes={routes} value={routeId} onChange={handleRouteChange} className="h-10 rounded-xl shadow-sm" />
                </div>
              )}
              <div className="space-y-1.5 overflow-visible" ref={vlcFieldRef}>
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('vlc_id')}
                </Label>
                <VLCIdPicker
                  branches={routeBranches}
                  numberedBranches={branches || []}
                  value={vlcId}
                  onChange={handleVLCIdChange}
                  onNumberEnter={() => weightRef.current?.focus()}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vlcName" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('vlc_name')}
                </Label>
                <Input
                  id="vlcName"
                  placeholder="VLC Name"
                  value={vlcName}
                  readOnly
                  className="bg-gray-50/70 border-gray-200 text-gray-600 w-full h-10 rounded-xl cursor-not-allowed shadow-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</Label>
                <div className="flex p-1 bg-gray-100 rounded-xl h-10">
                  {MILK_TYPES.map((milkType) => (
                    <button
                      key={milkType}
                      type="button"
                      onClick={() => setType(milkType)}
                      className={cn(
                        "flex-1 rounded-lg text-xs font-semibold transition-all",
                        type === milkType
                          ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {milkType}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Next {t('sample_id')}
                </Label>
                <div className="h-10 flex items-center justify-center bg-blue-50/40 rounded-xl border border-dashed border-blue-200 font-black text-xl text-blue-600">
                  #{nextSampleId}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="weight" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('weight')} <span className="text-gray-400 normal-case font-normal">(kg)</span>{machineLock.weight && <MachineOnlyTag />}
                </Label>
                <Input
                  ref={weightRef}
                  id="weight"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSubmit();
                    }
                  }}
                  readOnly={machineLock.weight}
                  title={machineLock.weight ? LOCKED_INPUT_TITLE : undefined}
                  className={cn("bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all w-full h-10 rounded-xl shadow-sm font-semibold text-gray-900 enter-field", machineLock.weight && LOCKED_INPUT_CLASS)}
                />
              </div>
            </div>

            {sameVlcEntries.length > 0 && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-2.5 rounded-xl border border-amber-100">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium">
                  {type} milk from this VLC is already weighed this shift (Sample {sameVlcEntries.map(e => `#${e.sample_id}`).join(', ')}).
                  Saving will create another sample.
                </span>
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-100 mt-2">
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-10 shadow-md shadow-blue-500/20 font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Record Weight</span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full lg:w-[35%] min-w-0">
        <Card className="w-full shadow-lg border-0 bg-white pb-0 gap-4 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-500" />
                {t('weight_collection')}
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] h-5">{entries.length}</Badge>
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchEntries}
                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sortedEntries.length > 0 ? (
              <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
                {sortedEntries.map((entry) => {
                  const completed = isWeightCompleted(entry);
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="flex-shrink-0 w-12 text-center">
                        <span className="text-lg font-black text-blue-600">#{entry.sample_id}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{vlcLabel(entry.vlc_id, entry.vlc_name)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{entry.type}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] h-5 px-1.5",
                              completed ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"
                            )}
                          >
                            {completed ? 'Analysed' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                        {Number(entry.weight).toFixed(2)} <small className="text-xs font-normal text-gray-400">kg</small>
                      </span>
                      {canModify && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={completed}
                        title={completed ? "Delete the analysed entry first" : "Delete weight entry"}
                        onClick={() => handleDelete(entry)}
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-500">No weight entries for selected date and shift</p>
              </div>
            )}
          </CardContent>
          {entries.length > 0 ? (
            <div className="flex justify-between items-center px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs font-semibold text-gray-500">
              <span>Pending analysis: <span className="text-amber-600">{pendingCount}</span></span>
              <span>Total: <span className="text-blue-600">{totalWeight.toFixed(2)} kg</span></span>
            </div>
          ) : (
            <div className="pb-2" />
          )}
        </Card>
      </div>
    </div>
  );
};

export default VLCWeightEntry;
