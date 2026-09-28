import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useVlcNumbering } from "@/utils/vlcSectionLabel";

export interface Branch {
  branch_id: number;
  username: string;
  name: string;
  branchName: string;
}

interface VLCDropdownProps {
  branches: Branch[];
  value: string | string[];
  onChange: (value: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  valueKey?: 'username' | 'branch_id';
  isMultiSelect?: boolean;
  // Prefix each VLC with its number (1, 2, 3 …); the number also matches in search.
  // Omitted: on for the web user who uses VLC numbering (see useVlcNumbering).
  showSerialNumbers?: boolean;
}

export const VLCDropdown: React.FC<VLCDropdownProps> = ({
  branches,
  value,
  onChange,
  placeholder = "Select VLC ID",
  className,
  disabled = false,
  valueKey = 'username',
  isMultiSelect = false,
  showSerialNumbers,
}) => {
  const numbering = useVlcNumbering();
  const showSerials = showSerialNumbers ?? numbering.enabled;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedBranch = !isMultiSelect && typeof value === 'string'
    ? branches?.find((b) => String(b[valueKey]) === value)
    : undefined;

  const selectedCount = isMultiSelect && Array.isArray(value) ? value.length : 0;

  // Position in the full branch list (same number on every page), falling back to
  // the position in `branches`; never the filtered list, so numbers stay put while searching.
  const serialOf = (branch: Branch) => numbering.positionOf(branch.username) ?? (branches?.indexOf(branch) ?? -1) + 1;
  const serialPrefix = (branch: Branch) => (showSerials ? `${serialOf(branch)}. ` : "");

  const filteredBranches = branches?.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (showSerials && String(serialOf(b)) === q.trim()) ||
      String(b.username || "").toLowerCase().includes(q) ||
      String(b.branch_id || "").toLowerCase().includes(q) ||
      String(b.name || "").toLowerCase().includes(q) ||
      String(b.branchName || "").toLowerCase().includes(q)
    );
  }) || [];

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    } else {
      setSearch("");
    }
  }, [open]);

  const isAllSelected = filteredBranches.length > 0 && isMultiSelect && Array.isArray(value) &&
    filteredBranches.every(b => value.includes(String(b[valueKey])));

  const handleSelectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isMultiSelect || !Array.isArray(value)) return;

    if (isAllSelected) {
      const filteredIds = new Set(filteredBranches.map(b => String(b[valueKey])));
      onChange(value.filter(v => !filteredIds.has(v)));
    } else {
      const filteredIds = filteredBranches.map(b => String(b[valueKey]));
      const newValue = Array.from(new Set([...value, ...filteredIds]));
      onChange(newValue);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 min-h-10 text-sm rounded-xl border bg-white transition-all shadow-sm enter-field focus:outline-none",
            open ? "border-blue-500 ring-1 ring-blue-500/20" : "border-gray-200 hover:border-blue-300",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            className
          )}
        >
          <div className={cn("flex-1 flex flex-wrap gap-1.5 overflow-hidden", !selectedBranch && selectedCount === 0 ? "text-gray-500" : "text-gray-900 font-medium")}>
            {isMultiSelect ? (
              selectedCount > 0 ? (
                <>
                  {(value as string[]).slice(0, 3).map((val) => {
                    const branch = branches.find((b) => String(b[valueKey]) === val);
                    return (
                      <span key={val} className="inline-flex items-center bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-md">
                        {branch && showSerials ? `${serialOf(branch)}. ` : ""}{branch?.username || val}
                      </span>
                    );
                  })}
                  {selectedCount > 3 && (
                    <span className="inline-flex items-center bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded-md">
                      +{selectedCount - 3} more
                    </span>
                  )}
                </>
              ) : (
                <span>{placeholder}</span>
              )
            ) : (
              selectedBranch ? (
                <span className="truncate">
                  {serialPrefix(selectedBranch)}{selectedBranch.username} - {selectedBranch.name} {selectedBranch.branchName ? `- ${selectedBranch.branchName}` : ''}
                </span>
              ) : (
                <span>{placeholder}</span>
              )
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gray-400 flex-shrink-0 ml-2 transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[250px] p-0 rounded-xl shadow-lg border-gray-100 bg-white z-50" align="start">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search VLC..."
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
          />
          {search && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setSearch("");
                searchInputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-gray-600 text-sm leading-none"
            >
              ✕
            </button>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {isMultiSelect && filteredBranches.length > 0 && (
            <button
              type="button"
              onMouseDown={handleSelectAll}
              className="w-full flex items-center justify-start px-3 py-2.5 text-sm text-left border-b border-gray-100 transition-colors cursor-pointer gap-2 hover:bg-gray-50 mb-1"
            >
              <Checkbox checked={isAllSelected} className="pointer-events-none" />
              <span className="font-medium text-gray-700">Select All</span>
            </button>
          )}
          {filteredBranches.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-400">No VLC branches found</div>
          ) : (
            filteredBranches.map((branch, index) => {
              const val = String(branch[valueKey]);
              if (!val || val === 'undefined') return null;
              const isSelected = isMultiSelect && Array.isArray(value)
                ? value.includes(val)
                : val === value;

              return (
                <button
                  key={`${branch.branch_id}-${index}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (isMultiSelect && Array.isArray(value)) {
                      if (isSelected) {
                        onChange(value.filter(v => v !== val));
                      } else {
                        onChange([...value, val]);
                      }
                    } else {
                      onChange(val);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "w-full flex items-start justify-start px-3 py-2.5 text-sm text-left rounded-lg transition-colors cursor-pointer gap-2",
                    isSelected && !isMultiSelect ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {isMultiSelect && (
                    <Checkbox checked={isSelected} className="pointer-events-none mt-0.5" />
                  )}
                  <span className="break-words flex-1">
                    {showSerials && (
                      <span className="font-bold text-blue-600 tabular-nums">{serialOf(branch)}. </span>
                    )}
                    {branch.username} - {branch.name} {branch.branchName ? `- ${branch.branchName}` : ''}
                  </span>
                  {!isMultiSelect && isSelected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
