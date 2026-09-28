import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSelector } from "@/redux/store";
import { useVlcNumbering } from "@/utils/vlcSectionLabel";
import { collectionApi, BulkCollectionItem } from "@/services/collectionApi";
import { toast } from "react-toastify";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Search,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadResult {
  total: number;
  successful: number;
  failed: number;
  errors: { index: number; farmer_id: string; error: string }[];
}

const TEMPLATE_COLUMNS = [
  "farmer_id",
  "type",
  "quantity",
  "fat",
  "snf",
  "clr",
  "rate",
  "shift",
  "date",
  "water",
];

const SAMPLE_ROWS = [
  ["0001", "Cow", 10.5, 4.2, 8.5, 28, 36.5, "Morning", "2026-05-26", 0],
  ["0002", "Buffalo", 7.25, 6.5, 9.2, 30, 58, "Evening", "2026-05-26", 0],
];

const downloadTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, ...SAMPLE_ROWS]);

  // Column widths
  ws["!cols"] = TEMPLATE_COLUMNS.map((col) =>
    col === "date" ? { wch: 22 } : col === "farmer_id" ? { wch: 12 } : { wch: 11 }
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BulkCollection");
  XLSX.writeFile(wb, "BulkCollection_Template.xlsx");
};

const BulkCollectionUpload = () => {
  const { branches } = useAppSelector((state) => state.branch);
  // VLC numbers (1, 2, 3 …) for the web user who uses them; "" for everyone else.
  const vlcNo = useVlcNumbering();
  const [open, setOpen] = useState(false);
  const [selectedDairy, setSelectedDairy] = useState("");
  const [parsedRows, setParsedRows] = useState<BulkCollectionItem[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vlcWrapperRef = useRef<HTMLDivElement>(null);
  const vlcSearchRef = useRef<HTMLInputElement>(null);
  const [vlcOpen, setVlcOpen] = useState(false);
  const [vlcSearch, setVlcSearch] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (vlcWrapperRef.current && !vlcWrapperRef.current.contains(event.target as Node)) {
        setVlcOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetState = () => {
    setParsedRows([]);
    setFileName("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        if (rows.length === 0) {
          toast.error("The file is empty or has no data rows.");
          return;
        }

        const toNum = (v: unknown) => parseFloat(String(v ?? 0)) || 0;

        const mapped: BulkCollectionItem[] = rows.map((row) => ({
          farmer_id: String(row["farmer_id"] ?? "").trim(),
          dairy_id: selectedDairy,
          type: String(row["type"] ?? "Cow").trim(),
          quantity: toNum(row["quantity"]),
          fat: toNum(row["fat"]),
          snf: toNum(row["snf"]),
          clr: toNum(row["clr"]),
          rate: toNum(row["rate"]),
          shift: String(row["shift"] ?? "Morning").trim(),
          date: (() => {
            const d = row["date"] ? String(row["date"]).trim() : format(new Date(), "yyyy-MM-dd");
            const shiftVal = String(row["shift"] ?? "Morning").trim().toLowerCase();
            const time = shiftVal.startsWith("e") ? "18:00:00" : "06:00:00";
            return d.includes(" ") ? d : `${d} ${time}`;
          })(),
          water: row["water"] !== "" ? toNum(row["water"]) : 0,
        }));

        const invalid = mapped.filter((r) => !r.farmer_id || !r.quantity);
        if (invalid.length > 0) {
          toast.warning(
            `${invalid.length} row(s) missing farmer_id or quantity — they will still be sent and may fail.`
          );
        }

        setParsedRows(mapped);
      } catch {
        toast.error("Failed to parse file. Please use the provided template.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (!selectedDairy) {
      toast.error("Please select a VLC / Dairy first.");
      return;
    }
    if (parsedRows.length === 0) {
      toast.error("Please upload a file with data.");
      return;
    }

    // Inject the selected dairy_id into every row
    const payload = parsedRows.map((r) => ({ ...r, dairy_id: selectedDairy }));

    setUploading(true);
    setResult(null);
    try {
      const res = await collectionApi.bulkCreate(payload);
      setResult({
        total: res.total ?? payload.length,
        successful: res.successful ?? 0,
        failed: res.failed ?? 0,
        errors: res.errors ?? [],
      });
      if (res.failed === 0) {
        toast.success(`${res.successful} collection(s) saved successfully.`);
      } else {
        toast.warning(`${res.successful} saved, ${res.failed} failed. See details below.`);
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Bulk upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = () => {
    resetState();
    setOpen(true);
  };

  return (
    <>
      {/* Trigger button — place this wherever the top-right button should appear */}
      <Button
        onClick={handleOpen}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
      >
        <Upload className="w-4 h-4" />
        Bulk Upload
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
        <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Bulk Collection Upload
            </DialogTitle>
            <p className="text-sm text-gray-500">
              Download the template, fill in collection data, then upload.
            </p>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* ── Step 1: Select Dairy ── */}
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <Label className="mb-2 block font-medium">
                  VLC / Dairy <span className="text-red-500">*</span>
                </Label>
                {(() => {
                  const selectedBranchObj = branches?.find((b) => b.branch_id.toString() === selectedDairy);
                  const filtered = branches?.filter((b) => {
                    const q = vlcSearch.toLowerCase();
                    return (
                      !q ||
                      String(b.username || "").toLowerCase().includes(q) ||
                      String(b.branch_id || "").toLowerCase().includes(q) ||
                      String(b.name || "").toLowerCase().includes(q) ||
                      String(b.branchName || "").toLowerCase().includes(q)
                    );
                  }) || [];
                  return (
                    <div ref={vlcWrapperRef} className="relative w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setVlcOpen((prev) => !prev);
                          if (!vlcOpen) setTimeout(() => vlcSearchRef.current?.focus(), 0);
                          else setVlcSearch("");
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 h-10 text-sm rounded-md border bg-white transition-all shadow-sm",
                          vlcOpen ? "border-emerald-500 ring-1 ring-emerald-500/20" : "border-gray-300 hover:border-emerald-300"
                        )}
                      >
                        <span className={selectedBranchObj ? "text-gray-900 truncate" : "text-gray-500"}>
                          {selectedBranchObj
                            ? `${vlcNo.prefix(selectedBranchObj.username)}${selectedBranchObj.username} - ${selectedBranchObj.name} ${selectedBranchObj.branchName ? `- ${selectedBranchObj.branchName}` : ''}`
                            : 'Select VLC / Dairy'}
                        </span>
                        <ChevronDown
                          className={cn("h-4 w-4 text-gray-400 flex-shrink-0 ml-2 transition-transform duration-150", vlcOpen && "rotate-180")}
                        />
                      </button>

                      {vlcOpen && (
                        <div
                          className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-md shadow-lg overflow-hidden"
                          style={{ top: "100%", left: 0 }}
                        >
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <input
                              ref={vlcSearchRef}
                              value={vlcSearch}
                              onChange={(e) => setVlcSearch(e.target.value)}
                              placeholder="Search VLC..."
                              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
                            />
                            {vlcSearch && (
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); setVlcSearch(""); vlcSearchRef.current?.focus(); }}
                                className="text-gray-400 hover:text-gray-600 text-sm leading-none"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {filtered.length === 0 ? (
                              <div className="px-3 py-4 text-center text-sm text-gray-400">No VLC branches found</div>
                            ) : (
                              filtered.map((branch) => {
                                if (!branch?.branch_id) return null;
                                const val = branch.branch_id.toString();
                                const isSelected = val === selectedDairy;
                                return (
                                  <button
                                    key={val}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setSelectedDairy(val);
                                      setParsedRows((prev) => prev.map((r) => ({ ...r, dairy_id: val })));
                                      setVlcOpen(false);
                                      setVlcSearch("");
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between px-3 py-2 text-sm text-left rounded-md transition-colors",
                                      isSelected ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                                    )}
                                  >
                                    <span className="truncate">
                                      {vlcNo.prefix(branch.username)}{branch.username} - {branch.name} {branch.branchName ? `- ${branch.branchName}` : ''}
                                    </span>
                                    {isSelected && <span className="text-emerald-600 text-xs">✓</span>}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ── Step 2: Download template ── */}
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="flex items-center gap-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 h-10"
              >
                <Download className="w-4 h-4" />
                Download Template
              </Button>
            </div>

            {/* ── Step 3: File upload ── */}
            <div>
              <Label className="mb-2 block font-medium text-gray-700">Upload Filled Template</Label>
              <label
                className={cn(
                  "flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 group",
                  fileName
                    ? "border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50"
                    : "border-gray-300 bg-gray-50/50 hover:bg-emerald-50 hover:border-emerald-300"
                )}
              >
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  {fileName ? (
                    <>
                      <div className="p-2.5 bg-emerald-100/60 rounded-full">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-sm font-bold text-emerald-700">{fileName}</p>
                      <p className="text-[11px] font-bold text-emerald-600/70 uppercase tracking-widest">{parsedRows.length} row(s) parsed</p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-white shadow-sm border border-gray-100 group-hover:bg-emerald-100/50 group-hover:border-emerald-100 group-hover:shadow-none rounded-xl transition-all duration-200">
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 group-hover:text-emerald-600 transition-colors mt-1">
                        Click to select <span className="font-bold text-gray-700 group-hover:text-emerald-700">.xlsx</span> file
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* ── Preview table ── */}
            {parsedRows.length > 0 && !result && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Preview — {parsedRows.length} row(s)
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    (dairy_id will be set to selected VLC)
                  </span>
                </p>
                <div className="border border-gray-200 rounded-lg overflow-auto max-h-56">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 text-xs">
                        <TableHead>#</TableHead>
                        <TableHead>Farmer ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>FAT</TableHead>
                        <TableHead>SNF</TableHead>
                        <TableHead>CLR</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Water</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 50).map((row, idx) => (
                        <TableRow key={idx} className="text-xs">
                          <TableCell className="text-gray-400">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{row.farmer_id}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                              row.type === "Cow"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            )}>
                              {row.type}
                            </span>
                          </TableCell>
                          <TableCell>{row.quantity}</TableCell>
                          <TableCell>{row.fat}</TableCell>
                          <TableCell>{row.snf}</TableCell>
                          <TableCell>{row.clr}</TableCell>
                          <TableCell>{row.rate}</TableCell>
                          <TableCell>{row.shift}</TableCell>
                          <TableCell className="text-gray-500">{row.date ?? "—"}</TableCell>
                          <TableCell>{row.water ?? 0}</TableCell>
                        </TableRow>
                      ))}
                      {parsedRows.length > 50 && (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-xs text-gray-400 py-2">
                            … and {parsedRows.length - 50} more rows
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* ── Result summary ── */}
            {result && (
              <div className="space-y-3">
                {/* Summary badges */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                    <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Total: {result.total}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">
                      Saved: {result.successful}
                    </span>
                  </div>
                  {result.failed > 0 && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-600">
                        Failed: {result.failed}
                      </span>
                    </div>
                  )}
                </div>

                {/* Error details */}
                {result.errors.length > 0 && (
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-4 py-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <p className="text-sm font-semibold text-red-700">Failed rows</p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 text-xs">
                          <TableHead>Row</TableHead>
                          <TableHead>Farmer ID</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.errors.map((e) => (
                          <TableRow key={e.index} className="text-xs">
                            <TableCell className="text-gray-500">{e.index + 1}</TableCell>
                            <TableCell className="font-medium">{e.farmer_id}</TableCell>
                            <TableCell className="text-red-600">{e.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center gap-2 pt-2 border-t">
            {result ? (
              <Button
                variant="outline"
                onClick={resetState}
                className="border-gray-300"
              >
                Upload Another
              </Button>
            ) : (
              <Button
                onClick={handleUpload}
                disabled={uploading || parsedRows.length === 0 || !selectedDairy}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-w-[120px]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {parsedRows.length > 0 ? `(${parsedRows.length})` : ""}
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)} className="border-gray-300">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkCollectionUpload;
