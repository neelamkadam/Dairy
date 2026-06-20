import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/redux/store";
import { reportsApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { FileDown, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { generateVLCDifferenceReportHtml } from "@/templates/VLCDifferenceReportTemplateHtml";
import PdfLoader from "@/components/PdfLoader";

const VlcDifferenceReport = () => {
  const { i18n } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [vlcId, setVlcId] = useState("");
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 16 ? "Evening" : "Morning";
  };
  
  const [shift, setShift] = useState(getDefaultShift());
  const [type, setType] = useState<'Cow' | 'Buffalo' | 'Both'>('Both');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [language, setLanguage] = useState<string>(i18n.language || 'en');

  const handleShow = async () => {
    if (!vlcId) {
      toast.error("Please select a VLC");
      return;
    }

    const selectedBranch = branches?.find(b => b.username === vlcId);
    if (!selectedBranch) return;

    setLoading(true);
    try {
      const payload = {
        dairy_id: selectedBranch.branch_id.toString(),
        vlc_id: vlcId, 
        
        from: fromDate,
        to: toDate,
        shift: shift,
        type: type,
      };
      
      console.log('📤 VLC Difference Report API Request:', payload);
      const data = await reportsApi.getVlcDifferenceReport(payload);
      console.log('📥 VLC Difference Report API Response:', data);
      
      if (data.success && data.data) {
        const rawData = data.data;
        
        // Normalize types and ensure difference fields
        rawData.forEach((item: any) => {
          if (item.type === 'गाय' || (item.type && item.type.toLowerCase() === 'cow')) item.type = 'Cow';
          if (item.type === 'म्हैस' || (item.type && item.type.toLowerCase() === 'buffalo')) item.type = 'Buffalo';
          
          if (item.vlc && item.dairy && (!item.difference || Object.keys(item.difference).length === 0)) {
            item.difference = {
              weight: (parseFloat(item.vlc.total_weight || 0) - parseFloat(item.dairy.total_weight || 0)).toFixed(2),
              fat: (parseFloat(item.vlc.avg_fat || 0) - parseFloat(item.dairy.avg_fat || 0)).toFixed(2),
              snf: (parseFloat(item.vlc.avg_snf || 0) - parseFloat(item.dairy.avg_snf || 0)).toFixed(2),
              rate: (parseFloat(item.vlc.avg_rate || 0) - parseFloat(item.dairy.avg_rate || 0)).toFixed(2),
              amount: (parseFloat(item.vlc.total_amount || 0) - parseFloat(item.dairy.total_amount || 0)).toFixed(2),
            };
          }
        });

        // Group data by period and shift to combine Cow and Buffalo if needed
        const groups: { [key: string]: any[] } = {};
        rawData.forEach((item: any) => {
          const key = `${item.period}_${item.shift}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
        });

        const processedData: any[] = [];
        Object.values(groups).forEach((items) => {
          const cow = items.find((i: any) => i.type === 'Cow');
          const buffalo = items.find((i: any) => i.type === 'Buffalo');
          const backendBoth = items.find((i: any) => i.type === 'Both');

          // Check if we should calculate 'Both' (if missing from backend or has zero values when Cow+Buffalo has data)
          const shouldCalculateBoth = cow && buffalo && (!backendBoth || 
            parseFloat(backendBoth.vlc?.total_weight || 0) === 0 || 
            parseFloat(backendBoth.dairy?.total_weight || 0) === 0);

          if (shouldCalculateBoth) {
            // Calculate weighted averages for synthesized 'Both' row
            const calculateWeighted = (v1: any, w1: any, v2: any, w2: any) => {
              const weight1 = parseFloat(w1) || 0;
              const weight2 = parseFloat(w2) || 0;
              const value1 = parseFloat(v1) || 0;
              const value2 = parseFloat(v2) || 0;
              const totalW = weight1 + weight2;
              if (totalW === 0) return 0;
              return ((value1 * weight1) + (value2 * weight2)) / totalW;
            };

            const combinedVlcWeight = parseFloat(cow.vlc.total_weight || 0) + parseFloat(buffalo.vlc.total_weight || 0);
            const combinedDairyWeight = parseFloat(cow.dairy.total_weight || 0) + parseFloat(buffalo.dairy.total_weight || 0);

            const bothRow = {
              period: cow.period,
              shift: cow.shift,
              type: 'Both',
              vlc: {
                total_weight: combinedVlcWeight.toFixed(2),
                avg_fat: calculateWeighted(cow.vlc.avg_fat, cow.vlc.total_weight, buffalo.vlc.avg_fat, buffalo.vlc.total_weight).toFixed(2),
                avg_snf: calculateWeighted(cow.vlc.avg_snf, cow.vlc.total_weight, buffalo.vlc.avg_snf, buffalo.vlc.total_weight).toFixed(2),
                avg_rate: calculateWeighted(cow.vlc.avg_rate, cow.vlc.total_weight, buffalo.vlc.avg_rate, buffalo.vlc.total_weight).toFixed(2),
                total_amount: (parseFloat(cow.vlc.total_amount || 0) + parseFloat(buffalo.vlc.total_amount || 0)).toFixed(2),
              },
              dairy: {
                total_weight: combinedDairyWeight.toFixed(2),
                avg_fat: calculateWeighted(cow.dairy.avg_fat, cow.dairy.total_weight, buffalo.dairy.avg_fat, buffalo.dairy.total_weight).toFixed(2),
                avg_snf: calculateWeighted(cow.dairy.avg_snf, cow.dairy.total_weight, buffalo.dairy.avg_snf, buffalo.dairy.total_weight).toFixed(2),
                avg_rate: calculateWeighted(cow.dairy.avg_rate, cow.dairy.total_weight, buffalo.dairy.avg_rate, buffalo.dairy.total_weight).toFixed(2),
                total_amount: (parseFloat(cow.dairy.total_amount || 0) + parseFloat(buffalo.dairy.total_amount || 0)).toFixed(2),
              }
            };

            (bothRow as any).difference = {
              weight: (parseFloat(bothRow.vlc.total_weight) - parseFloat(bothRow.dairy.total_weight)).toFixed(2),
              fat: (parseFloat(bothRow.vlc.avg_fat) - parseFloat(bothRow.dairy.avg_fat)).toFixed(2),
              snf: (parseFloat(bothRow.vlc.avg_snf) - parseFloat(bothRow.dairy.avg_snf)).toFixed(2),
              rate: (parseFloat(bothRow.vlc.avg_rate) - parseFloat(bothRow.dairy.avg_rate)).toFixed(2),
              amount: (parseFloat(bothRow.vlc.total_amount) - parseFloat(bothRow.dairy.total_amount)).toFixed(2),
            };

            // Add cow, buffalo, and then the calculated both row
            processedData.push(cow, buffalo, bothRow);
          } else {
            // Sort items: Cow, then Buffalo, then Both
            const sorted = items.sort((a: any, b: any) => {
              const order: any = { 'Cow': 1, 'Buffalo': 2, 'Both': 3 };
              return (order[a.type] || 4) - (order[b.type] || 4);
            });
            processedData.push(...sorted);
          }
        });

        // Calculate weighted averages for a specific milk type
        const calculateWeightedAverages = (data: any[], summaryType: 'Cow' | 'Buffalo' | 'Both') => {
          let vlcTotalWeight = 0;
          let vlcWeightedFat = 0;
          let vlcWeightedSnf = 0;
          let vlcTotalAmount = 0;
          
          let dairyTotalWeight = 0;
          let dairyWeightedFat = 0;
          let dairyWeightedSnf = 0;
          let dairyTotalAmount = 0;

          data.forEach((item: any) => {
            const vlcWeight = parseFloat(item.vlc.total_weight || 0);
            const vlcFat = parseFloat(item.vlc.avg_fat || 0);
            const vlcSnf = parseFloat(item.vlc.avg_snf || 0);
            
            const dairyWeight = parseFloat(item.dairy.total_weight || 0);
            const dairyFat = parseFloat(item.dairy.avg_fat || 0);
            const dairySnf = parseFloat(item.dairy.avg_snf || 0);

            vlcTotalWeight += vlcWeight;
            vlcWeightedFat += vlcFat * vlcWeight;
            vlcWeightedSnf += vlcSnf * vlcWeight;
            vlcTotalAmount += parseFloat(item.vlc.total_amount || 0);

            dairyTotalWeight += dairyWeight;
            dairyWeightedFat += dairyFat * dairyWeight;
            dairyWeightedSnf += dairySnf * dairyWeight;
            dairyTotalAmount += parseFloat(item.dairy.total_amount || 0);
          });

          const vlcAvgFat = vlcTotalWeight > 0 ? (vlcWeightedFat / vlcTotalWeight).toFixed(2) : '0.00';
          const vlcAvgSnf = vlcTotalWeight > 0 ? (vlcWeightedSnf / vlcTotalWeight).toFixed(2) : '0.00';
          
          const dairyAvgFat = dairyTotalWeight > 0 ? (dairyWeightedFat / dairyTotalWeight).toFixed(2) : '0.00';
          const dairyAvgSnf = dairyTotalWeight > 0 ? (dairyWeightedSnf / dairyTotalWeight).toFixed(2) : '0.00';

          return {
            period: 'SUMMARY',
            shift: 'Average',
            type: summaryType,
            vlc: {
              total_weight: vlcTotalWeight.toFixed(2),
              avg_fat: vlcAvgFat,
              avg_snf: vlcAvgSnf,
              avg_rate: '0.00',
              total_amount: vlcTotalAmount.toFixed(2),
            },
            dairy: {
              total_weight: dairyTotalWeight.toFixed(2),
              avg_fat: dairyAvgFat,
              avg_snf: dairyAvgSnf,
              avg_rate: '0.00',
              total_amount: dairyTotalAmount.toFixed(2),
            },
            difference: {
              weight: (vlcTotalWeight - dairyTotalWeight).toFixed(2),
              fat: (parseFloat(vlcAvgFat) - parseFloat(dairyAvgFat)).toFixed(2),
              snf: (parseFloat(vlcAvgSnf) - parseFloat(dairyAvgSnf)).toFixed(2),
              rate: '0.00',
              amount: (vlcTotalAmount - dairyTotalAmount).toFixed(2),
            },
            isSummary: true
          };
        };

        // Show summaries only when more than one date+shift group exists.
        const groupCount = Object.keys(groups).length;
        if (groupCount > 1) {
          const summaryTypes: Array<'Cow' | 'Buffalo' | 'Both'> = ['Cow', 'Buffalo', 'Both'];
          summaryTypes.forEach((summaryType) => {
            const typedData = processedData.filter((row: any) => row.type === summaryType);
            if (typedData.length > 0) {
              const weightedAverageRow = calculateWeightedAverages(typedData, summaryType);
              processedData.push(weightedAverageRow);
            }
          });
        }

        setReportData(processedData);
      }
    } catch (error: any) {
      console.error('❌ VLC Difference Report API Error:', error);
      toast.error(error?.response?.data?.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const generatePage = async (htmlContent: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '297mm'; // A4 landscape width
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1123, // A4 landscape pixels at 96 DPI
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              --color-gray-50: #f9fafb !important;
              --color-gray-100: #f3f4f6 !important;
              --color-gray-200: #e5e7eb !important;
              --color-blue-50: #eff6ff !important;
              --color-blue-100: #dbeafe !important;
              --color-blue-800: #1e40af !important;
              --color-blue-900: #1e3a8a !important;
              --color-green-50: #f0fdf4 !important;
              --color-green-100: #dcfce7 !important;
              --color-green-800: #166534 !important;
              --color-green-900: #14532d !important;
              --color-purple-50: #faf5ff !important;
              --color-purple-100: #f3e8ff !important;
              --color-purple-800: #6b21a8 !important;
              --color-purple-900: #581c87 !important;
              --color-amber-50: #fffbeb !important;
              --color-amber-100: #fef3c7 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      return { imgData, imgWidth, imgHeight };
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData || reportData.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    setPdfLoading(true);
    try {
      const selectedBranch = branches?.find(b => b.username === vlcId);
      const branchName = selectedBranch ? selectedBranch.name : vlcId;
      
      const htmlContent = generateVLCDifferenceReportHtml(
        reportData, 
        vlcId, 
        fromDate, 
        toDate, 
        shift, 
        branchName
      );

      const { imgData, imgWidth, imgHeight } = await generatePage(htmlContent);
      const pdf = new jsPDF('l', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      pdf.save(`VLC_Difference_Report_${vlcId}_${fromDate}_to_${toDate}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const exportData = reportData.map((period: any) => ({
      'Period': period.period,
      'Shift': period.shift,
      'Type': period.type,
      'VLC Weight': period.vlc.total_weight,
      'VLC Fat': period.vlc.avg_fat,
      'VLC SNF': period.vlc.avg_snf,
      'VLC Rate': period.vlc.avg_rate || '0.00',
      'VLC Amount': period.vlc.total_amount,
      'Milk Weight': period.milk_collection?.total_weight ?? '-',
      'Milk Fat': period.milk_collection?.avg_fat ?? '-',
      'Milk SNF': period.milk_collection?.avg_snf ?? '-',
      'Milk CLR': period.milk_collection?.avg_clr ?? '-',
      'Dairy Weight': period.dairy.total_weight,
      'Dairy Fat': period.dairy.avg_fat,
      'Dairy SNF': period.dairy.avg_snf,
      'Dairy Rate': period.dairy.avg_rate || '0.00',
      'Dairy Amount': period.dairy.total_amount,
      'Diff Weight': period.difference.weight,
      'Diff Fat': period.difference.fat,
      'Diff SNF': period.difference.snf,
      'Diff Rate': period.difference.rate || '0.00',
      'Diff Amount': period.difference.amount,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const range = XLSX.utils.decode_range(ws['!ref']!);
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      ws[address].s = {
        fill: { fgColor: { rgb: "DBEAFE" } },
        font: { bold: true, color: { rgb: "1E3A8A" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
    
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = 3; C <= 7; ++C) {
        const address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[address]) continue;
        ws[address].s = { fill: { fgColor: { rgb: "DBEAFE" } } };
      }
    }

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = 8; C <= 11; ++C) {
        const address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[address]) continue;
        ws[address].s = { fill: { fgColor: { rgb: "E5E7EB" } } };
      }
    }

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = 12; C <= 16; ++C) {
        const address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[address]) continue;
        ws[address].s = { fill: { fgColor: { rgb: "D1FAE5" } } };
      }
    }

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = 17; C <= 21; ++C) {
        const address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[address]) continue;
        const value = parseFloat(ws[address].v);
        ws[address].s = {
          fill: { fgColor: { rgb: "E9D5FF" } },
          font: { bold: true, color: { rgb: value < 0 ? "DC2626" : value > 0 ? "16A34A" : "4B5563" } }
        };
      }
    }

    ws['!cols'] = Array(22).fill({ wch: 12 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VLC Difference Report');
    XLSX.writeFile(wb, `VLC_Difference_Report_${vlcId}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`, { cellStyles: true });
    toast.success("Excel exported successfully");
  };

  return (
    <div className="p-6 bg-white w-full h-screen">
      <PdfLoader isLoading={pdfLoading} />
      <h1 className="text-lg font-bold mb-7">VLCC Difference Report</h1>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 p-3 rounded-lg">
        <div>
          <Label className="mb-1">VLC Name</Label>
          <Select value={vlcId} onValueChange={setVlcId}>
            <SelectTrigger className="w-full border-gray-200">
              <SelectValue placeholder="Select VLC" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {branches?.map((branch) => (
                <SelectItem key={branch.username} value={branch.username}>
                  {branch.username} - {branch.name} - {branch.branchName || ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1">From Date</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border-gray-200"
          />
        </div>
        <div>
          <Label className="mb-1">To Date</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border-gray-200"
          />
        </div>
        <div>
          <Label className="mb-1">Shift Type</Label>
          <Select value={shift} onValueChange={setShift}>
            <SelectTrigger className="w-full border-gray-200">
              <SelectValue placeholder="Select shift" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Morning">Morning</SelectItem>
              <SelectItem value="Evening">Evening</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1">Type</Label>
          <Select value={type} onValueChange={(val: 'Cow' | 'Buffalo' | 'Both') => setType(val)}>
            <SelectTrigger className="w-full border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="Cow">Cow</SelectItem>
              <SelectItem value="Buffalo">Buffalo</SelectItem>
              <SelectItem value="Both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleShow} 
          disabled={loading}
          className="text-white bg-blue-600 w-[90px] mt-4.5"
        >
          {loading ? "Loading..." : "Show"}
        </Button>
        <Button 
          onClick={handleExportPDF} 
          disabled={!reportData || reportData.length === 0}
          className="text-white bg-red-600 w-[120px] mt-4.5 flex items-center gap-2"
        >
          <FileDown size={16} />
          Export PDF
        </Button>
        <Button 
          onClick={handleExportExcel} 
          disabled={!reportData || reportData.length === 0}
          className="text-white bg-green-600 w-[130px] mt-4.5 flex items-center gap-2"
        >
          <FileSpreadsheet size={16} />
          Export Excel
        </Button>
      </div>
      <div className="overflow-x-auto mt-4 border border-gray-200 rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
              <TableHead rowSpan={2} className="text-center border border-gray-200 font-bold text-gray-900 py-3">Period</TableHead>
              <TableHead rowSpan={2} className="text-center border border-gray-200 font-bold text-gray-900 py-3">Shift</TableHead>
              <TableHead rowSpan={2} className="text-center border border-gray-200 font-bold text-gray-900 py-3">Type</TableHead>
              <TableHead colSpan={5} className="text-center border border-gray-200 font-bold text-blue-900 py-3">
                VLC Collection Data
              </TableHead>
              <TableHead colSpan={4} className="text-center border border-gray-200 font-bold text-gray-700 bg-gray-200 py-3">
                Milk Collection
              </TableHead>
              <TableHead colSpan={5} className="text-center border border-gray-200 font-bold text-green-900 py-3">
                Dairy Entry
              </TableHead>
              <TableHead colSpan={5} className="text-center border border-gray-200 font-bold text-purple-900 py-3">
                Difference (VLC - Dairy)
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="text-center font-semibold bg-blue-50 border border-gray-200 text-blue-800">Weight</TableHead>
              <TableHead className="text-center font-semibold bg-blue-50 border border-gray-200 text-blue-800">Fat</TableHead>
              <TableHead className="text-center font-semibold bg-blue-50 border border-gray-200 text-blue-800">SNF</TableHead>
              <TableHead className="text-center font-semibold bg-blue-50 border border-gray-200 text-blue-800">Rate</TableHead>
              <TableHead className="text-center font-semibold bg-blue-50 border border-gray-200 text-blue-800">Amount</TableHead>
              <TableHead className="text-center font-semibold bg-gray-100 border border-gray-200 text-gray-700">Weight</TableHead>
              <TableHead className="text-center font-semibold bg-gray-100 border border-gray-200 text-gray-700">Fat</TableHead>
              <TableHead className="text-center font-semibold bg-gray-100 border border-gray-200 text-gray-700">SNF</TableHead>
              <TableHead className="text-center font-semibold bg-gray-100 border border-gray-200 text-gray-700">CLR</TableHead>
              <TableHead className="text-center font-semibold bg-green-50 border border-gray-200 text-green-800">Weight</TableHead>
              <TableHead className="text-center font-semibold bg-green-50 border border-gray-200 text-green-800">Fat</TableHead>
              <TableHead className="text-center font-semibold bg-green-50 border border-gray-200 text-green-800">SNF</TableHead>
              <TableHead className="text-center font-semibold bg-green-50 border border-gray-200 text-green-800">Rate</TableHead>
              <TableHead className="text-center font-semibold bg-green-50 border border-gray-200 text-green-800">Amount</TableHead>
              <TableHead className="text-center font-semibold bg-purple-50 border border-gray-200 text-purple-800">Weight</TableHead>
              <TableHead className="text-center font-semibold bg-purple-50 border border-gray-200 text-purple-800">Fat</TableHead>
              <TableHead className="text-center font-semibold bg-purple-50 border border-gray-200 text-purple-800">SNF</TableHead>
              <TableHead className="text-center font-semibold bg-purple-50 border border-gray-200 text-purple-800">Rate</TableHead>
              <TableHead className="text-center font-semibold bg-purple-50 border border-gray-200 text-purple-800">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData && reportData.length > 0 ? (
              reportData.map((period: any, index: number) => {
                const isSummaryRow = !!period.isSummary;

                return (
                <TableRow key={index} className={isSummaryRow ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"}>
                  <TableCell className={`border border-gray-200 text-center font-medium ${isSummaryRow ? 'bg-amber-100 text-gray-900 font-bold' : 'bg-gray-50'}`}>{period.period}</TableCell>
                  <TableCell className={`border border-gray-200 text-center font-medium ${isSummaryRow ? 'bg-amber-100 text-gray-900 font-bold' : 'bg-gray-50'}`}>{period.shift}</TableCell>
                  <TableCell className={`border border-gray-200 text-center font-medium ${isSummaryRow ? 'bg-amber-100 text-gray-900 font-bold' : 'bg-gray-50'}`}>{period.type}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-blue-50/30'}`}>{period.vlc.total_weight}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-blue-50/30'}`}>{period.vlc.avg_fat}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-blue-50/30'}`}>{period.vlc.avg_snf}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-blue-50/30'}`}>{period.vlc.avg_rate || '0.00'}</TableCell>
                  <TableCell className={`border border-gray-200 text-center font-semibold ${isSummaryRow ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-blue-50/30'}`}>{period.vlc.total_amount}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-gray-200 text-gray-900 font-bold' : 'bg-gray-100'}`}>{period.milk_collection?.total_weight ?? '-'}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-gray-200 text-gray-900 font-bold' : 'bg-gray-100'}`}>{period.milk_collection?.avg_fat ?? '-'}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-gray-200 text-gray-900 font-bold' : 'bg-gray-100'}`}>{period.milk_collection?.avg_snf ?? '-'}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-gray-200 text-gray-900 font-bold' : 'bg-gray-100'}`}>{period.milk_collection?.avg_clr ?? '-'}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-green-100 text-green-900 font-bold' : 'bg-green-50/30'}`}>{period.dairy.total_weight}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-green-100 text-green-900 font-bold' : 'bg-green-50/30'}`}>{period.dairy.avg_fat}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-green-100 text-green-900 font-bold' : 'bg-green-50/30'}`}>{period.dairy.avg_snf}</TableCell>
                  <TableCell className={`border border-gray-200 text-center ${isSummaryRow ? 'bg-green-100 text-green-900 font-bold' : 'bg-green-50/30'}`}>{period.dairy.avg_rate || '0.00'}</TableCell>
                  <TableCell className={`border border-gray-200 text-center font-semibold ${isSummaryRow ? 'bg-green-100 text-green-900 font-bold' : 'bg-green-50/30'}`}>{period.dairy.total_amount}</TableCell>
                  <TableCell className={`border border-gray-200 text-center font-bold ${isSummaryRow ? 'bg-purple-100' : 'bg-purple-50/30'} ${parseFloat(period.difference.weight) < 0 ? 'text-red-600' : parseFloat(period.difference.weight) > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    {period.difference.weight}
                  </TableCell>
                  <TableCell className={`border border-gray-200 text-center font-bold ${isSummaryRow ? 'bg-purple-100' : 'bg-purple-50/30'} ${parseFloat(period.difference.fat) < 0 ? 'text-red-600' : parseFloat(period.difference.fat) > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    {period.difference.fat}
                  </TableCell>
                  <TableCell className={`border border-gray-200 text-center font-bold ${isSummaryRow ? 'bg-purple-100' : 'bg-purple-50/30'} ${parseFloat(period.difference.snf) < 0 ? 'text-red-600' : parseFloat(period.difference.snf) > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    {period.difference.snf}
                  </TableCell>
                  <TableCell className={`border border-gray-200 text-center font-bold ${isSummaryRow ? 'bg-purple-100' : 'bg-purple-50/30'} ${parseFloat(period.difference.rate) < 0 ? 'text-red-600' : parseFloat(period.difference.rate) > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    {period.difference.rate || '0.00'}
                  </TableCell>
                  <TableCell className={`border border-gray-200 text-center font-bold ${isSummaryRow ? 'bg-purple-100' : 'bg-purple-50/30'} ${parseFloat(period.difference.amount) < 0 ? 'text-red-600' : parseFloat(period.difference.amount) > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    {period.difference.amount}
                  </TableCell>
                </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={22} className="text-center py-10 text-gray-500 bg-gray-50">
                  Select VLC and date range, then click Show to view the report
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VlcDifferenceReport;
