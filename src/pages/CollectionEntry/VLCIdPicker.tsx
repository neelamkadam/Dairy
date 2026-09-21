import { useEffect, useState, type Ref } from "react";
import { Input } from "@/components/ui/input";
import { VLCDropdown, type Branch } from "@/components/ui/vlc-dropdown";
import { cn } from "@/lib/utils";
import { useVlcSerialNumbers } from "./vlcSerialNumbers";

interface VLCIdPickerProps {
  branches: Branch[];
  // Selected VLC username (its real 500xxx id) — what gets saved.
  value: string;
  onChange: (username: string) => void;
  // Enter in the number box with a valid number, e.g. to move on to the weight.
  onNumberEnter?: () => void;
  numberInputRef?: Ref<HTMLInputElement>;
}

/**
 * The VLC picker for VLC collection. For users with VLC numbering on, a number
 * box sits beside the dropdown: typing 1 selects the first VLC in the list, 2
 * the second, and so on. Everyone else gets the plain dropdown.
 */
const VLCIdPicker = ({ branches, value, onChange, onNumberEnter, numberInputRef }: VLCIdPickerProps) => {
  const serials = useVlcSerialNumbers(branches);
  const [text, setText] = useState("");

  const invalid = text !== "" && !serials.branchAt(Number(text));

  // Follow selections made elsewhere — the dropdown, or a reset after saving.
  useEffect(() => {
    if (!serials.enabled) return;
    const selected = value ? serials.numberOf(value) : null;
    setText((current) => {
      if (selected != null) return Number(current) === selected ? current : String(selected);
      // Nothing selected: clear a number that pointed at a VLC, keep a wrong one on screen.
      return serials.branchAt(Number(current)) ? "" : current;
    });
  }, [value, serials.enabled, branches]);

  if (!serials.enabled) {
    return <VLCDropdown branches={branches} value={value} onChange={onChange} />;
  }

  const handleType = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    setText(digits);
    // A wrong number clears the selection, so nothing is saved against the previous VLC.
    const branch = digits ? serials.branchAt(Number(digits)) : null;
    onChange(branch ? branch.username : "");
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          ref={numberInputRef}
          inputMode="numeric"
          autoComplete="off"
          placeholder="No."
          value={text}
          onChange={(e) => handleType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            e.stopPropagation();
            if (text && !invalid) onNumberEnter?.();
          }}
          aria-label="VLC number"
          aria-invalid={invalid}
          title={`VLC number, 1 to ${serials.count}`}
          className={cn(
            "w-20 shrink-0 h-10 rounded-xl text-center font-bold bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm",
            invalid && "border-red-400 text-red-600 focus:border-red-500 focus:ring-red-500/20"
          )}
        />
        <div className="flex-1 min-w-0">
          <VLCDropdown branches={branches} value={value} onChange={onChange} showSerialNumbers />
        </div>
      </div>
      {invalid && (
        <p className="text-xs font-medium text-red-600">
          No VLC number {text} — enter 1 to {serials.count}
        </p>
      )}
    </div>
  );
};

export default VLCIdPicker;
