import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/redux/store";
import { cn } from "@/lib/utils";
import { rateChartApi } from "@/services/rateChartApi";
import { vlcCollectionApi, type VLCMilkType } from "@/services/vlcCollectionApi";
import { calculateCLRFromFatAndSNF, calculateSNFFromFatAndCLR } from "@/utils/milkCalculations";
import type { VlcReportRow } from "./vlcCollectionReportData";

// The same rate chart the collection entry uses.
const RATE_CHART_NAME = "Rate Chart 1";
const MILK_TYPES: VLCMilkType[] = ["Cow", "Buffalo", "Both"];

export interface VlcEditTarget {
  row: VlcReportRow;
  vlcId: string;
  vlcName: string;
}

interface VlcEntryEditDialogProps {
  target: VlcEditTarget | null;
  date: string;
  shift: "Morning" | "Evening";
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "h-10 rounded-xl border-slate-200 bg-white hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold";
const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider";

/**
 * Edits one row of the VLC Collection Entry Report.
 *
 * A completed row is the finalized entry: type, weight, FAT and SNF/CLR are
 * editable, and the rate comes from the rate chart with the amount calculated
 * from it. A pending row has only been weighed, so just type and weight can be
 * fixed — its FAT/SNF are entered at the analyser.
 */
const VlcEntryEditDialog = ({ target, date, shift, onClose, onSaved }: VlcEntryEditDialogProps) => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);

  const [type, setType] = useState<VLCMilkType>("Cow");
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [snf, setSnf] = useState("");
  const [clr, setClr] = useState("");
  // Whichever of SNF/CLR was typed last; the other is derived from it.
  const [basis, setBasis] = useState<"snf" | "clr">("snf");
  const [rate, setRate] = useState<number | null>(null);
  const [calculatingRate, setCalculatingRate] = useState(false);
  const [saving, setSaving] = useState(false);
  const rateRequestRef = useRef(0);

  const analysed = !!target && target.row.status === "completed";
  const weightValue = Number(weight);
  const amount = rate != null && Number.isFinite(weightValue) ? weightValue * rate : null;

  useEffect(() => {
    if (!target) return;
    const { row } = target;
    setType(((row.type as VLCMilkType) || "Cow") as VLCMilkType);
    setWeight(row.weight != null ? String(row.weight) : "");
    setFat(row.fat != null ? String(row.fat) : "");
    setSnf(row.snf != null ? String(row.snf) : "");
    setClr(row.clr != null ? String(row.clr) : "");
    setBasis("snf");
    setRate(row.rate ?? null);
  }, [target]);

  const fetchRate = useCallback(async (fatValue: string, snfValue: string, milkType: VLCMilkType) => {
    const branch = branches?.find((b) => b.username === target?.vlcId);
    if (!branch || !fatValue || !snfValue) return null;
    const response = await rateChartApi.getRate(
      parseFloat(fatValue),
      parseFloat(snfValue),
      branch.branch_id,
      RATE_CHART_NAME,
      String(milkType).toLowerCase() === "buffalo" ? "Buffalo" : "Cow",
      date,
      shift
    );
    return response?.price ? Number(response.price) : null;
  }, [branches, target, date, shift]);

  // Live rate preview while FAT / SNF / type are edited. A missing rate only
  // blanks the field here; saving is what reports it, so half-typed values
  // don't raise a toast on every keystroke.
  useEffect(() => {
    if (!analysed) return;
    const requestId = ++rateRequestRef.current;
    if (!fat || !snf) {
      setRate(null);
      setCalculatingRate(false);
      return;
    }
    const timer = setTimeout(async () => {
      setCalculatingRate(true);
      try {
        const price = await fetchRate(fat, snf, type);
        if (requestId !== rateRequestRef.current) return;
        setRate(price);
      } catch (error) {
        if (requestId !== rateRequestRef.current) return;
        console.error("Error fetching rate:", error);
        setRate(null);
      } finally {
        if (requestId === rateRequestRef.current) setCalculatingRate(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [analysed, fat, snf, type, fetchRate]);

  const handleFatChange = (value: string) => {
    setFat(value);
    if (basis === "clr") setSnf(value && clr ? calculateSNFFromFatAndCLR(value, clr) : "");
    else setClr(value && snf ? calculateCLRFromFatAndSNF(value, snf) : "");
  };

  const handleSnfChange = (value: string) => {
    setBasis("snf");
    setSnf(value);
    setClr(fat && value ? calculateCLRFromFatAndSNF(fat, value) : "");
  };

  const handleClrChange = (value: string) => {
    setBasis("clr");
    setClr(value);
    setSnf(fat && value ? calculateSNFFromFatAndCLR(fat, value) : "");
  };

  const handleSave = async () => {
    if (!target || saving) return;
    if (!(weightValue > 0)) {
      toast.error(t("enter_valid_weight", "Please enter a valid weight"));
      return;
    }

    setSaving(true);
    try {
      if (!analysed) {
        const response = await vlcCollectionApi.updateWeight(target.row.weightId!, { type, weight: weightValue });
        if (response?.success === false) throw new Error(response?.message);
      } else {
        if (!fat || !snf || !clr) {
          toast.error(t("fat_snf_clr_required", "FAT, SNF and CLR are required"));
          return;
        }
        // Re-read the rate at save time, so a quick save never stores a stale one.
        let price: number | null = null;
        try {
          price = await fetchRate(fat, snf, type);
        } catch (error) {
          console.error("Error fetching rate:", error);
        }
        if (!price) {
          toast.error(t("rate_not_found", "Rate not found for selected parameters"));
          return;
        }
        setRate(price);
        const response = await vlcCollectionApi.updateEntry(target.row.entryId!, {
          type,
          weight: weightValue,
          fat: parseFloat(fat),
          snf: parseFloat(snf),
          clr: parseFloat(clr),
          rate: price,
          amount: Number((weightValue * price).toFixed(2)),
        });
        if (response?.success === false) throw new Error(response?.message);
      }
      toast.success(t("entry_updated_successfully", "Entry updated successfully"));
      onSaved();
      onClose();
    } catch (error) {
      const failure = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(failure?.response?.data?.message || failure?.message || t("failed_to_update_entry", "Failed to update entry"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="bg-white rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            {t("edit_entry", "Edit Entry")}
          </DialogTitle>
          <DialogDescription className="text-left text-slate-500">
            {target ? `${target.vlcId} · ${target.vlcName}` : ""}
            {target?.row.sampleId != null ? ` · ${t("sample_id", "Sample ID")} #${target.row.sampleId}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-left">
          <div className="space-y-1.5">
            <Label className={labelClass}>{t("type", "Type")}</Label>
            <div className="flex p-1 bg-gray-100 rounded-xl h-10">
              {MILK_TYPES.map((milkType) => (
                <button
                  key={milkType}
                  type="button"
                  onClick={() => setType(milkType)}
                  className={cn(
                    "flex-1 rounded-lg text-xs font-semibold transition-all",
                    type === milkType ? "bg-white text-blue-600 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {milkType}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_weight" className={labelClass}>{t("weight", "Weight")} (kg)</Label>
              <Input
                id="edit_weight"
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_fat" className={labelClass}>{t("fat", "FAT")} (%)</Label>
              <Input
                id="edit_fat"
                type="number"
                step="0.1"
                value={fat}
                disabled={!analysed}
                onChange={(e) => handleFatChange(e.target.value)}
                className={cn(inputClass, !analysed && "bg-slate-50 text-slate-400")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_snf" className={labelClass}>{t("snf", "SNF")} (%)</Label>
              <Input
                id="edit_snf"
                type="number"
                step="0.1"
                value={snf}
                disabled={!analysed}
                onChange={(e) => handleSnfChange(e.target.value)}
                className={cn(inputClass, !analysed && "bg-slate-50 text-slate-400")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_clr" className={labelClass}>{t("clr", "CLR")}</Label>
              <Input
                id="edit_clr"
                type="number"
                step="0.1"
                value={clr}
                disabled={!analysed}
                onChange={(e) => handleClrChange(e.target.value)}
                className={cn(inputClass, !analysed && "bg-slate-50 text-slate-400")}
              />
            </div>
          </div>

          {analysed ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>{t("rate_per_kg", "Rate per kg")}</Label>
                <div className="relative">
                  <Input
                    id="edit_rate"
                    readOnly
                    value={rate == null ? "" : rate.toFixed(2)}
                    placeholder="—"
                    className="h-10 rounded-xl bg-blue-50/40 border-blue-100 text-blue-900 font-bold cursor-not-allowed"
                  />
                  {calculatingRate && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>{t("total_amount", "Total Amount")}</Label>
                <Input
                  id="edit_amount"
                  readOnly
                  value={amount == null ? "" : `₹${amount.toFixed(2)}`}
                  placeholder="—"
                  className="h-10 rounded-xl bg-green-50/40 border-green-200 text-green-900 font-bold cursor-not-allowed"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {t("pending_edit_hint", "This sample has only been weighed. FAT / SNF, rate and amount are set when it is analysed.")}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t("cancel", "Cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VlcEntryEditDialog;
