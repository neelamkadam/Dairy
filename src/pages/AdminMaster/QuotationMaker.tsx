import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Plus, Trash2, Download,
  ChevronRight, ChevronLeft, Check,
  Building2, Package, Eye, X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import NeoDairyLogo from "@/assets/NeoDairy_Logo.png";

interface QuotationItem {
  id: number;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

interface ProductPreset {
  description: string;
  unit: string;
  rate: number;
}

interface CompanyInfo {
  name: string;
  address: string;
  gstin: string;
  mobile: string;
  pan: string;
  email: string;
  website: string;
}

interface BankInfo {
  accountName: string;
  ifsc: string;
  accountNo: string;
  bank: string;
}

interface ClientInfo {
  quotationNo: string;
  date: string;
  validUntil: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
  terms: string;
}

const BUILTIN_PRESETS: ProductPreset[] = [
  { description: "Mobile Application", unit: "Nos", rate: 2500 },
  { description: "Web Application", unit: "Nos", rate: 15000 },
  { description: "BT Kit", unit: "Nos", rate: 3500 },
  { description: "Ekomilk", unit: "Nos", rate: 36000 },
  { description: "Stirrer", unit: "Nos", rate: 3500 },
  { description: "W/S 600*600", unit: "Nos", rate: 7500 },
  { description: "Installation and Transport", unit: "Nos", rate: 2000 },
  { description: "Renew Per Year (Per Application)", unit: "Nos", rate: 2000 },
];

const LS_KEY = "neo_product_presets";

const DEFAULT_COMPANY: CompanyInfo = {
  name: "NEODAIRY SALES AND SERVICES PRIVATE LIMITED",
  address:
    "Work Office: Saraswati Nagar, Indapur-Baramati Road, Indapur (Pune) 413106\nReg. Office: Onkar Colony, Kavalapur, Tal-Miraj (Sangli) 416306, Maharashtra",
  gstin: "27AAKCN4394D1Z8",
  mobile: "9322971633",
  pan: "AAKCN4394D",
  email: "info@neodairysales.com",
  website: "www.neodairysales.com",
};

const DEFAULT_BANK: BankInfo = {
  accountName: "Neodairy Sales and Service Pvt Ltd",
  ifsc: "UCBA0002225",
  accountNo: "22250210003466",
  bank: "TASGAON",
};

const DEFAULT_TERMS = `1. Goods once sold will not be taken back or exchanged.
2. Hardware One year warranty to Invoice Date.
3. Payment Terms: 70% Advance + 20% After Delivery + 10% After Installation.
4. To use Neo-Supervisor (Mobile Application) user need Android Mobile/Tab.
5. License Validity & Renewal Terms
   * Mobile Application license is valid for one (1) year from the date of supply / activation.
   * After completion of one year, yearly renewal is mandatory to continue using the application services, updates, and technical support.
   * Application Annual Renewal Charges: Rs.1000 per year.
6. Transportation charges are applicable extra at actuals.`;

const STEPS = [
  { label: "Company & Client", icon: Building2 },
  { label: "Products", icon: Package },
  { label: "Preview & Export", icon: Eye },
];

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// jsPDF cannot render the Unicode ₹ glyph with built-in fonts — use "Rs." instead
const RS = "Rs.";

export default function QuotationMaker() {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY);
  const [bank, setBank] = useState<BankInfo>(DEFAULT_BANK);
  const [client, setClient] = useState<ClientInfo>({
    quotationNo: `QT-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split("T")[0],
    validUntil: "",
    clientName: "",
    clientAddress: "",
    clientPhone: "",
    clientEmail: "",
    notes: "",
    terms: DEFAULT_TERMS,
  });
  const [items, setItems] = useState<QuotationItem[]>([
    { id: 1, description: "", qty: 1, unit: "Nos", rate: 0, amount: 0 },
  ]);
  const [taxPct, setTaxPct] = useState(18);
  const [discount, setDiscount] = useState(0);

  // Custom presets stored in localStorage
  const [customPresets, setCustomPresets] = useState<ProductPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
  });
  const [newPreset, setNewPreset] = useState<ProductPreset>({ description: "", unit: "Nos", rate: 0 });
  const [showAddPreset, setShowAddPreset] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(customPresets));
  }, [customPresets]);

  const allPresets = [...BUILTIN_PRESETS, ...customPresets];

  const saveCustomPreset = () => {
    if (!newPreset.description.trim()) return;
    setCustomPresets((p) => [...p, { ...newPreset }]);
    setNewPreset({ description: "", unit: "Nos", rate: 0 });
    setShowAddPreset(false);
  };

  const deleteCustomPreset = (idx: number) =>
    setCustomPresets((p) => p.filter((_, i) => i !== idx));

  const addFromPreset = (preset: ProductPreset) =>
    setItems((p) => [
      ...p,
      { id: Date.now(), description: preset.description, qty: 1, unit: preset.unit, rate: preset.rate, amount: preset.rate },
    ]);

  const updateCompany = (k: keyof CompanyInfo, v: string) => setCompany((p) => ({ ...p, [k]: v }));
  const updateBank = (k: keyof BankInfo, v: string) => setBank((p) => ({ ...p, [k]: v }));
  const updateClient = (k: keyof ClientInfo, v: string) => setClient((p) => ({ ...p, [k]: v }));

  const updateItem = (id: number, k: keyof QuotationItem, v: string | number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [k]: v };
        updated.amount = updated.qty * updated.rate;
        return updated;
      })
    );
  };

  const addItem = () =>
    setItems((p) => [...p, { id: Date.now(), description: "", qty: 1, unit: "Nos", rate: 0, amount: 0 }]);

  const removeItem = (id: number) => setItems((p) => p.filter((it) => it.id !== id));

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const discountAmt = (subtotal * discount) / 100;
  const taxable = subtotal - discountAmt;
  const taxAmt = (taxable * taxPct) / 100;
  const total = taxable + taxAmt;

  function exportPDF() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const mg = 14;

    // Header
    doc.setFillColor(26, 35, 126);
    doc.rect(0, 0, W, 34, "F");
    const img = new Image();
    img.src = NeoDairyLogo;
    // White background box behind logo
    doc.setFillColor(255, 255, 255);
    doc.rect(mg, 5, 22, 22, "F");
    try { doc.addImage(img, "PNG", mg, 5, 22, 22); } catch (_) {}
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(company.name, mg + 26, 11);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const addrLines = doc.splitTextToSize(company.address, 88);
    doc.text(addrLines, mg + 26, 16);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("QUOTATION", W - mg, 14, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`No: ${client.quotationNo}`, W - mg, 21, { align: "right" });
    doc.text(`Date: ${client.date}`, W - mg, 26, { align: "right" });
    if (client.validUntil) doc.text(`Valid Until: ${client.validUntil}`, W - mg, 31, { align: "right" });

    // Meta bar
    doc.setFillColor(232, 234, 246);
    doc.rect(0, 34, W, 10, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const meta = [`GSTIN: ${company.gstin}`, `Mobile: ${company.mobile}`, `PAN: ${company.pan}`, `Email: ${company.email}`, `Web: ${company.website}`].join("   |   ");
    doc.text(meta, W / 2, 40, { align: "center" });

    // Bill To
    let y = 50;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text("BILL TO:", mg, y);
    doc.setFont("helvetica", "normal");
    doc.text(client.clientName || "-", mg, y + 5);
    const cAddr = doc.splitTextToSize(client.clientAddress || "", 85);
    doc.text(cAddr, mg, y + 10);
    let by = y + 10 + cAddr.length * 4;
    if (client.clientPhone) { doc.text(`Ph: ${client.clientPhone}`, mg, by); by += 4; }
    if (client.clientEmail) doc.text(`Email: ${client.clientEmail}`, mg, by);

    // Items table
    autoTable(doc, {
      startY: 74,
      head: [["#", "Description", "Qty", "Unit", `Rate (${RS})`, `Amount (${RS})`]],
      body: items.map((it, i) => [i + 1, it.description || "-", it.qty, it.unit, fmt(it.rate), fmt(it.amount)]),
      headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: "bold", fontSize: 8, halign: "center" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 70 },
        2: { halign: "center", cellWidth: 18 },
        3: { halign: "center", cellWidth: 18 },
        4: { halign: "right", cellWidth: 30 },
        5: { halign: "right", cellWidth: 30 },
      },
      alternateRowStyles: { fillColor: [240, 242, 255] },
      margin: { left: mg, right: mg },
    });

    let fy = (doc as any).lastAutoTable.finalY + 5;
    const c1 = W - mg - 90, c2 = W - mg;
    const prow = (label: string, value: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text(label, c1, fy);
      doc.text(value, c2, fy, { align: "right" });
      fy += 6;
    };
    prow("Subtotal:", `${RS} ${fmt(subtotal)}`);
    if (discount > 0) prow(`Discount (${discount}%):`, `- ${RS} ${fmt(discountAmt)}`);
    prow(`Tax (${taxPct}%):`, `${RS} ${fmt(taxAmt)}`);
    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.5);
    doc.line(c1, fy + 1, c2, fy + 1);
    fy += 4;
    prow("TOTAL:", `${RS} ${fmt(total)}`, true);
    fy += 4;

    // Notes
    if (client.notes) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text("Notes:", mg, fy); fy += 5;
      doc.setFont("helvetica", "normal");
      const nl = doc.splitTextToSize(client.notes, W - mg * 2);
      doc.text(nl, mg, fy); fy += nl.length * 4 + 4;
    }

    // Terms
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.text("Terms & Conditions:", mg, fy); fy += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    const tl = doc.splitTextToSize(client.terms, W - mg * 2);
    doc.text(tl, mg, fy); fy += tl.length * 3.8 + 6;

    // Bank
    doc.setFillColor(232, 234, 246);
    doc.rect(mg, fy, 85, 28, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(26, 35, 126);
    doc.text("Bank Details", mg + 3, fy + 6);
    doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30); doc.setFontSize(8);
    doc.text(`Name: ${bank.accountName}`, mg + 3, fy + 11);
    doc.text(`IFSC Code: ${bank.ifsc}`, mg + 3, fy + 16);
    doc.text(`Account No: ${bank.accountNo}`, mg + 3, fy + 21);
    doc.text(`Bank: ${bank.bank}`, mg + 3, fy + 26);

    // Signatory
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30);
    doc.text("Authorised Signatory For", W - mg - 55, fy + 6);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    const sl = doc.splitTextToSize("NEODAIRY SALES AND SERVICES PRIVATE LIMITED", 55);
    doc.text(sl, W - mg - 55, fy + 11);
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
    doc.rect(W - mg - 55, fy + 16, 55, 18);
    doc.setTextColor(180, 180, 180); doc.setFontSize(7);
    doc.text("(Stamp & Signature)", W - mg - 27.5, fy + 26, { align: "center" });

    // Footer
    doc.setFillColor(26, 35, 126);
    doc.rect(0, 285, W, 12, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Thank you for your business!", W / 2, 292, { align: "center" });

    doc.save(`Quotation_${client.quotationNo}.pdf`);
  }

  return (
    <div className="p-2 md:p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-[calc(100vh-80px)] space-y-4">
      <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100/80 shadow-sm p-4 w-full">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Quotation Maker</h1>
            <p className="text-xs text-gray-500 mt-0.5">Create and export professional quotations as PDF</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center">
              <button
                onClick={() => done && setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active ? "bg-blue-700 text-white shadow-sm" : done ? "text-blue-600 cursor-pointer hover:bg-blue-50" : "text-gray-400 cursor-default"}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-white/20" : done ? "bg-blue-100" : "bg-gray-100"}`}>
                  {done ? <Check size={12} /> : <Icon size={12} />}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={16} className="text-gray-300 mx-1" />}
            </div>
          );
        })}
      </div>

      {/* STEP 0 */}
      {step === 0 && (
        <div className="max-w-3xl mx-auto space-y-4">
          <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
            <CardHeader className="border-b border-gray-100 pb-3 pt-4">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" /> Your Company Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Company Name</Label>
                <Input value={company.name} onChange={(e) => updateCompany("name", e.target.value)} className="h-9 text-sm border-gray-200" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Address</Label>
                <Textarea value={company.address} onChange={(e) => updateCompany("address", e.target.value)} rows={3} className="text-sm border-gray-200 resize-none" />
              </div>
              {([ ["GSTIN","gstin"],["Mobile","mobile"],["PAN Number","pan"],["Email","email"],["Website","website"] ] as [string, keyof CompanyInfo][]).map(([label, key]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">{label}</Label>
                  <Input value={company[key]} onChange={(e) => updateCompany(key, e.target.value)} className="h-9 text-sm border-gray-200" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
            <CardHeader className="border-b border-gray-100 pb-3 pt-4">
              <CardTitle className="text-base font-semibold text-gray-800">Bank Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([ ["Account Name","accountName"],["IFSC Code","ifsc"],["Account No","accountNo"],["Bank","bank"] ] as [string, keyof BankInfo][]).map(([label, key]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">{label}</Label>
                  <Input value={bank[key]} onChange={(e) => updateBank(key, e.target.value)} className="h-9 text-sm border-gray-200" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
            <CardHeader className="border-b border-gray-100 pb-3 pt-4">
              <CardTitle className="text-base font-semibold text-gray-800">Client Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([ ["Quotation No","quotationNo","text"],["Date","date","date"],["Valid Until","validUntil","date"],["Client Name","clientName","text"],["Client Phone","clientPhone","text"],["Client Email","clientEmail","email"] ] as [string, keyof ClientInfo, string][]).map(([label, key, type]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">{label}</Label>
                  <Input type={type} value={client[key] as string} onChange={(e) => updateClient(key, e.target.value)} className="h-9 text-sm border-gray-200" />
                </div>
              ))}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Client Address</Label>
                <Textarea value={client.clientAddress} onChange={(e) => updateClient("clientAddress", e.target.value)} rows={2} className="text-sm border-gray-200 resize-none" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setStep(1)} className="bg-blue-700 hover:bg-blue-800 text-white h-9 px-6">
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Preset Products Panel */}
          <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
            <CardHeader className="border-b border-gray-100 pb-3 pt-4">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" /> Product Catalogue
                <span className="text-xs font-normal text-gray-400 ml-1">— click to add to quotation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {allPresets.map((p, i) => {
                  const isCustom = i >= BUILTIN_PRESETS.length;
                  return (
                    <div key={i} className="flex items-center gap-1 group">
                      <button
                        onClick={() => addFromPreset(p)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-medium text-blue-800 transition-all"
                      >
                        <Plus size={11} />
                        <span>{p.description}</span>
                        <span className="text-blue-500 font-semibold">₹{p.rate.toLocaleString("en-IN")}</span>
                      </button>
                      {isCustom && (
                        <button
                          onClick={() => deleteCustomPreset(i - BUILTIN_PRESETS.length)}
                          className="w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => setShowAddPreset((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 text-xs font-medium text-gray-500 hover:text-blue-600 transition-all"
                >
                  <Plus size={11} /> Add Custom
                </button>
              </div>

              {showAddPreset && (
                <div className="flex flex-wrap gap-2 items-end p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Description</Label>
                    <Input value={newPreset.description} onChange={(e) => setNewPreset((p) => ({ ...p, description: e.target.value }))} placeholder="Product name" className="h-8 text-xs w-44 border-gray-200" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Unit</Label>
                    <Input value={newPreset.unit} onChange={(e) => setNewPreset((p) => ({ ...p, unit: e.target.value }))} placeholder="Nos" className="h-8 text-xs w-20 border-gray-200" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Rate (₹)</Label>
                    <Input type="number" min={0} value={newPreset.rate} onChange={(e) => setNewPreset((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs w-28 border-gray-200" />
                  </div>
                  <Button onClick={saveCustomPreset} size="sm" className="h-8 bg-blue-700 hover:bg-blue-800 text-white text-xs">Save</Button>
                  <Button onClick={() => setShowAddPreset(false)} variant="ghost" size="sm" className="h-8 text-xs text-gray-500">Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
            <CardHeader className="border-b border-gray-100 pb-3 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-800">Line Items</CardTitle>
              <Button onClick={addItem} size="sm" className="h-8 bg-blue-700 hover:bg-blue-800 text-white text-xs">
                <Plus size={14} className="mr-1" /> Add Blank
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
                <div className="col-span-4">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-2">Rate (₹)</div>
                <div className="col-span-1 text-right">Amount</div>
                <div className="col-span-1" />
              </div>
              {items.map((it) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 md:col-span-4">
                    <Input placeholder="Description" value={it.description} onChange={(e) => updateItem(it.id, "description", e.target.value)} className="h-9 text-sm border-gray-200" />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input type="number" min={0} value={it.qty} onChange={(e) => updateItem(it.id, "qty", parseFloat(e.target.value) || 0)} className="h-9 text-sm border-gray-200" />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input placeholder="Unit" value={it.unit} onChange={(e) => updateItem(it.id, "unit", e.target.value)} className="h-9 text-sm border-gray-200" />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input type="number" min={0} value={it.rate} onChange={(e) => updateItem(it.id, "rate", parseFloat(e.target.value) || 0)} className="h-9 text-sm border-gray-200" />
                  </div>
                  <div className="col-span-10 md:col-span-1 text-right text-sm font-medium text-gray-700 pr-1">
                    ₹{fmt(it.amount)}
                  </div>
                  <div className="col-span-2 md:col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)} disabled={items.length === 1} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200/60 bg-white rounded-lg">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Discount (%)</Label>
                <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="h-9 text-sm border-gray-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Tax / GST (%)</Label>
                <Input type="number" min={0} value={taxPct} onChange={(e) => setTaxPct(parseFloat(e.target.value) || 0)} className="h-9 text-sm border-gray-200" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Notes</Label>
                <Textarea value={client.notes} onChange={(e) => updateClient("notes", e.target.value)} rows={2} placeholder="Delivery notes, special instructions..." className="text-sm border-gray-200 resize-none" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm font-medium text-gray-700">Terms & Conditions</Label>
                <Textarea value={client.terms} onChange={(e) => updateClient("terms", e.target.value)} rows={8} className="text-sm border-gray-200 resize-none font-mono" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)} className="h-9 px-5">
              <ChevronLeft size={16} className="mr-1" /> Back
            </Button>
            <Button onClick={() => setStep(2)} className="bg-blue-700 hover:bg-blue-800 text-white h-9 px-6">
              Preview <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-sm">
            {/* Header */}
            <div className="bg-[#1a237e] text-white px-6 py-4 flex justify-between items-start gap-4">
              <div className="flex items-start gap-3">
                <img src={NeoDairyLogo} alt="logo" className="w-14 h-14 object-contain bg-white rounded p-1 shrink-0" />
                <div>
                  <div className="font-bold text-base leading-tight">{company.name}</div>
                  <div className="text-blue-200 text-xs mt-1 whitespace-pre-line">{company.address}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-extrabold tracking-wide">QUOTATION</div>
                <div className="text-blue-200 text-xs mt-1">No: {client.quotationNo}</div>
                <div className="text-blue-200 text-xs">Date: {client.date}</div>
                {client.validUntil && <div className="text-blue-200 text-xs">Valid Until: {client.validUntil}</div>}
              </div>
            </div>

            {/* Meta bar */}
            <div className="bg-indigo-50 px-6 py-2 text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1 border-b border-indigo-100">
              <span>GSTIN: <b>{company.gstin}</b></span>
              <span>Mobile: <b>{company.mobile}</b></span>
              <span>PAN: <b>{company.pan}</b></span>
              <span>Email: <b>{company.email}</b></span>
              <span>Web: <b>{company.website}</b></span>
            </div>

            {/* Bill To */}
            <div className="px-6 py-4 flex justify-between border-b border-gray-100">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bill To</div>
                <div className="font-semibold text-gray-800">{client.clientName || "-"}</div>
                <div className="text-gray-500 text-xs whitespace-pre-line">{client.clientAddress}</div>
                {client.clientPhone && <div className="text-gray-500 text-xs">Ph: {client.clientPhone}</div>}
                {client.clientEmail && <div className="text-gray-500 text-xs">{client.clientEmail}</div>}
              </div>
              {client.validUntil && (
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Valid Until</div>
                  <div className="font-semibold text-gray-800">{client.validUntil}</div>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a237e] text-white">
                    <th className="py-2 px-3 text-center w-8">#</th>
                    <th className="py-2 px-3 text-left">Description</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-center">Unit</th>
                    <th className="py-2 px-3 text-right">Rate (₹)</th>
                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.id} className={i % 2 === 0 ? "bg-indigo-50/40" : "bg-white"}>
                      <td className="py-2 px-3 text-center text-gray-500">{i + 1}</td>
                      <td className="py-2 px-3 text-gray-800">{it.description || "-"}</td>
                      <td className="py-2 px-3 text-center text-gray-700">{it.qty}</td>
                      <td className="py-2 px-3 text-center text-gray-700">{it.unit}</td>
                      <td className="py-2 px-3 text-right text-gray-700">{fmt(it.rate)}</td>
                      <td className="py-2 px-3 text-right font-medium text-gray-800">{fmt(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-6 pb-4 flex justify-end">
              <div className="w-72 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>₹ {fmt(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-gray-600"><span>Discount ({discount}%):</span><span>- ₹ {fmt(discountAmt)}</span></div>}
                <div className="flex justify-between text-gray-600"><span>Tax ({taxPct}%):</span><span>₹ {fmt(taxAmt)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 border-t-2 border-[#1a237e] pt-1 text-base">
                  <span>TOTAL:</span><span>₹ {fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="px-6 pb-4 border-t border-gray-100 pt-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</div>
                <div className="text-sm text-gray-600 whitespace-pre-line">{client.notes}</div>
              </div>
            )}

            {/* Terms */}
            <div className="px-6 pb-4 border-t border-gray-100 pt-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Terms & Conditions</div>
              <div className="text-xs text-gray-600 whitespace-pre-line">{client.terms}</div>
            </div>

            {/* Bank + Signatory */}
            <div className="px-6 pb-6 border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between gap-6">
              <div className="bg-indigo-50 rounded-lg p-4 text-xs space-y-1 flex-1">
                <div className="font-bold text-[#1a237e] text-sm mb-2">Bank Details</div>
                <div><span className="text-gray-500">Name:</span> <b>{bank.accountName}</b></div>
                <div><span className="text-gray-500">IFSC Code:</span> <b>{bank.ifsc}</b></div>
                <div><span className="text-gray-500">Account No:</span> <b>{bank.accountNo}</b></div>
                <div><span className="text-gray-500">Bank:</span> <b>{bank.bank}</b></div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-1">
                <div className="text-xs font-semibold text-gray-700">Authorised Signatory For</div>
                <div className="text-xs font-bold text-[#1a237e] text-right">NEODAIRY SALES AND SERVICES PRIVATE LIMITED</div>
                <div className="w-48 h-20 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400 mt-2">
                  Stamp & Signature
                </div>
              </div>
            </div>

            <div className="bg-[#1a237e] text-white text-center text-xs py-3">
              Thank you for your business!
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="h-9 px-5">
              <ChevronLeft size={16} className="mr-1" /> Back
            </Button>
            <Button onClick={exportPDF} className="bg-green-600 hover:bg-green-700 text-white h-9 px-6">
              <Download size={16} className="mr-2" /> Export PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
