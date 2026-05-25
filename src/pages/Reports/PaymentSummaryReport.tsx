import { useState, useEffect, useMemo, useRef } from "react";
import { AppDatePicker } from "@/components/ui/date-picker";
import { Calendar, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSelector } from "@/redux/store";
import { api } from "@/services/config";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import PdfLoader from "@/components/PdfLoader";
import * as XLSX from "xlsx";
import { userApi } from "@/services/reportsApi";
import { normalizeFarmerId } from "@/utils/farmerIdUtils";
import { bankSummaryApi } from "@/services/bankSummaryApi";
import { bonusApi } from "@/services/bonusApi";

interface FarmerDetail {
  farmer_id: string;
  farmer_username: string;
  farmer_name: string;
  date: string;
  milk_total: number;
  quantity?: number;
  total_received: number;
  deductions: {
    advance: number;
    cattle_feed: number;
    other1: number;
    other2: number;
    total: number;
  };
  net_payable: number;
  from_bills?: {
    received_total?: number;
    advance_total?: number;
    cattlefeed_total?: number;
    other1_total?: number;
    other2_total?: number;
    advance_remaining?: number;
    cattlefeed_remaining?: number;
    other1_remaining?: number;
    other2_remaining?: number;
  };
  previous_bill?: {
    advance_remaining?: number;
    cattlefeed_remaining?: number;
    other1_remaining?: number;
    other2_remaining?: number;
  };
}

interface DateWiseData {
  date: string;
  farmers: FarmerDetail[];
}

interface PaymentSummaryData {
  success: boolean;
  dairy_id: string;
  startDate: string;
  endDate: string;
  data: DateWiseData[];
}

const PaymentSummaryReport = () => {
  const { branches } = useAppSelector(state => state.branch);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const selectedVlc = branches.find(b => b.branch_id === selectedBranch);

  const calculateEndDate = (startDate: string) => {
    const [year, month, day] = startDate.split('-').map(Number);
    const cycleDays = selectedVlc?.days || 10;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    
    let startDay: number, endDay: number;
    
    if (cycleDays === 15) {
      if (day >= 1 && day <= 15) {
        startDay = 1;
        endDay = 15;
      } else {
        startDay = 16;
        endDay = lastDayOfMonth;
      }
    } else if (cycleDays >= 28) {
      startDay = 1;
      endDay = lastDayOfMonth;
    } else {
      if (day >= 1 && day <= 10) {
        startDay = 1;
        endDay = 10;
      } else if (day >= 11 && day <= 20) {
        startDay = 11;
        endDay = 20;
      } else {
        startDay = 21;
        endDay = lastDayOfMonth;
      }
    }
    
    return {
      from: `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    };
  };

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleDateFromChange = (newDate: string) => {
    const dates = calculateEndDate(newDate);
    setDateFrom(dates.from);
    setDateTo(dates.to);
  };
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [farmerNamesMap, setFarmerNamesMap] = useState<Map<string, string>>(new Map());
  const [data, setData] = useState<PaymentSummaryData | null>(null);
  const [bonusData, setBonusData] = useState<Map<string, any>>(new Map());
  const pdfExportRef = useRef<HTMLDivElement | null>(null);
  const authState = useAppSelector((state) => state.authData);
  const userData = authState?.userData;

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].branch_id);
    }
  }, [branches]);

  useEffect(() => {
    if (selectedBranch) {
      const dates = calculateEndDate(dateFrom || new Date().toISOString().split('T')[0]);
      setDateFrom(dates.from);
      setDateTo(dates.to);
    }
  }, [selectedBranch, branches]);

  const fetchPaymentSummary = async () => {
    if (!selectedBranch) {
      toast.error('Please select a VLC');
      return;
    }
    
    setLoading(true);
    console.log('Fetching payment summary with params:', {
      dairyid: selectedBranch,
      datefrom: dateFrom,
      dateto: dateTo
    });
    
    try {
      const response = await api.get('/payments/getdairybillsummary', {
        params: {
          dairyid: selectedBranch,
          datefrom: dateFrom,
          dateto: dateTo
        }
      });
      console.log('API Response:', response);
      console.log('Response data:', response.data);
      setData(response.data);
      
      // Fetch bonus/fixed deductions
      try {
        const bonusResponse = await bonusApi.getBonusDeductions({
          dairy_id: selectedBranch,
          start_date: dateFrom,
          end_date: dateTo,
        });
        
        // Create bonus map by farmer (get latest entry - highest ID)
        const bonusByFarmer = new Map();
        (bonusResponse.data.data || []).forEach((bonus: any) => {
          const existing = bonusByFarmer.get(bonus.farmer_id);
          if (!existing || bonus.id > existing.id) {
            bonusByFarmer.set(bonus.farmer_id, bonus);
          }
        });
        setBonusData(bonusByFarmer);
        console.log('Bonus data loaded:', bonusByFarmer);
        
        // Fetch original farmer names to fix the KrutiDev encoding issue
        try {
          const farmersResponse = await userApi.getFarmers(selectedBranch.toString());
          if (farmersResponse?.success && Array.isArray(farmersResponse.data)) {
            const nameMap = new Map<string, string>();
            farmersResponse.data.forEach((f: any) => {
              const normalized = normalizeFarmerId(f.username || f.farmer_id || "");
              nameMap.set(normalized, f.fullName || f.name || "");
            });
            setFarmerNamesMap(nameMap);
            console.log('✨ [NAME FIX] Farmer names map built:', nameMap.size);
          }
        } catch (nameError) {
          console.error('Error fetching farmer names for sync:', nameError);
        }
      } catch (bonusError) {
        console.error('Error fetching bonus data:', bonusError);
        setBonusData(new Map()); // Reset on error
      }
      
      toast.success('Data loaded successfully');
    } catch (error: any) {
      console.error('API Error:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.message || 'Failed to load payment summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branches.length > 0) {
      setData(null);
    }
  }, [branches]);

  const getAggregatedFarmers = useMemo(() => {
    if (!data?.data) return [];
    
    console.log('🚀 getAggregatedFarmers calculating, bonusData size:', bonusData.size);
    
    const farmerMap = new Map();
    
    data.data.forEach(dateData => {
      dateData.farmers.forEach(farmer => {
        const farmerId = farmer.farmer_id;
        const normalized = normalizeFarmerId(farmerId);
        
        // Use the fetched original name if available, otherwise fallback to API name
        const displayName = farmerNamesMap.get(normalized) || farmer.farmer_name || "";
        
        if (!farmerMap.has(farmerId)) {
          farmerMap.set(farmerId, {
            farmer_id: farmerId,
            farmer_username: farmer.farmer_username,
            farmer_name: displayName,
            milk_total: 0,
            quantity: 0,
            previous_balance: 0,
            advance: 0,
            cattle_feed: 0,
            other1: 0,
            other2: 0,
            received: 0,
            total_deduction: 0,
            advance_from_bills: 0,
            cattlefeed_from_bills: 0,
            other1_from_bills: 0,
            other2_from_bills: 0,
            bonusAmount: 0,
            fixedAmount: 0,
            bonusRate: 0,
            net_payable: 0,
            remaining_balance: 0,
            _billProcessed: false // Flag to ensure we only count bill data once
          });
        }
        
        const aggregated = farmerMap.get(farmerId);
        
        // Refresh name from map if possible (to catch the best name)
        if (displayName) {
          aggregated.farmer_name = displayName;
        }

        aggregated.milk_total = parseFloat((aggregated.milk_total + (farmer.milk_total || 0)).toFixed(2));
        aggregated.quantity = parseFloat((aggregated.quantity + (farmer.quantity || 0)).toFixed(2));
        
        // Logs are daily, so we MUST sum them
        aggregated.advance += farmer.deductions.advance || 0;
        aggregated.cattle_feed += farmer.deductions.cattle_feed || 0;
        aggregated.other1 += farmer.deductions.other1 || 0;
        aggregated.other2 += farmer.deductions.other2 || 0;
        
        // Bills and Previous balances are period-totals, so we ONLY count them once
        if (!aggregated._billProcessed && farmer.from_bills) {
          aggregated.received = farmer.from_bills.received_total || 0;
          aggregated.advance_from_bills = farmer.from_bills.advance_total || 0;
          aggregated.cattlefeed_from_bills = farmer.from_bills.cattlefeed_total || 0;
          aggregated.other1_from_bills = farmer.from_bills.other1_total || 0;
          aggregated.other2_from_bills = farmer.from_bills.other2_total || 0;
          
          aggregated.total_deduction = parseFloat((
            (farmer.from_bills.advance_total || 0) + 
            (farmer.from_bills.cattlefeed_total || 0) + 
            (farmer.from_bills.other1_total || 0) + 
            (farmer.from_bills.other2_total || 0)
          ).toFixed(2));
          
          aggregated.remaining_balance = parseFloat((
            (farmer.from_bills.advance_remaining || 0) + 
            (farmer.from_bills.cattlefeed_remaining || 0) + 
            (farmer.from_bills.other1_remaining || 0) + 
            (farmer.from_bills.other2_remaining || 0)
          ).toFixed(2));
          
          aggregated._billProcessed = true;
        }

        // Set previous balance from the first entry that has it (should be consistent)
        if (aggregated.previous_balance === 0 && farmer.previous_bill) {
          aggregated.previous_balance = parseFloat((
            (farmer.previous_bill.advance_remaining || 0) + 
            (farmer.previous_bill.cattlefeed_remaining || 0) + 
            (farmer.previous_bill.other1_remaining || 0) + 
            (farmer.previous_bill.other2_remaining || 0)
          ).toFixed(2));
        }
      });
    });

    
    // Apply bonus/fixed deductions to farmers
    const processedData = Array.from(farmerMap.values());
    const periodEndDate = new Date(dateTo);
    
    console.log('🎯 Processing', processedData.length, 'farmers with bonus data');
    
    processedData.forEach(farmer => {
      const bonusEntry = bonusData.get(farmer.farmer_id);
      
      if (bonusEntry) {
        console.log(`📦 Farmer ${farmer.farmer_id} has bonus entry:`, bonusEntry);
        
        // Date validation: only apply if period end date > effective_from
        const effectiveDate = new Date(bonusEntry.effective_from);
        
        console.log(`  📅 Date check: period end ${dateTo} > effective ${bonusEntry.effective_from}?`, periodEndDate > effectiveDate);
        console.log(`  📦 Bonus entry full:`, { bonus_deduction: bonusEntry.bonus_deduction, fixed_deduction: bonusEntry.fixed_deduction });
        
        if (periodEndDate > effectiveDate) {
          // Use bonus_deduction (which is the rate) not bonus_rate
          farmer.bonusRate = parseFloat(bonusEntry.bonus_deduction || 0);
          farmer.bonusAmount = farmer.quantity * farmer.bonusRate;
          farmer.fixedAmount = parseFloat(bonusEntry.fixed_deduction || 0);
          
          console.log(`  ✅ Applied: quantity=${farmer.quantity}, rate=${farmer.bonusRate}, bonus=${farmer.bonusAmount.toFixed(2)}, fixed=${farmer.fixedAmount}`);
        } else {
          console.log(`  ❌ Not applied: period end date (${dateTo}) is not after effective date (${bonusEntry.effective_from})`);
        }
      } else {
        console.log(`❌ Farmer ${farmer.farmer_id} has NO bonus entry`);
      }
      
      // Calculate net_payable: milk_total - total_deduction - bonus - fixed
      const totalBonusFixed = farmer.bonusAmount + farmer.fixedAmount;
      farmer.net_payable = farmer.milk_total - farmer.total_deduction - totalBonusFixed;
      
      if (farmer.bonusAmount > 0 || farmer.fixedAmount > 0) {
        console.log(`📊 Farmer ${farmer.farmer_id} final:`, {
          milk_total: farmer.milk_total,
          quantity: farmer.quantity,
          total_deduction: farmer.total_deduction,
          bonusAmount: farmer.bonusAmount,
          fixedAmount: farmer.fixedAmount,
          totalBonusFixed,
          net_payable: farmer.net_payable
        });
      }
    });
    
    const sorted = processedData.sort((a, b) => {
      const numA = parseInt(a.farmer_username) || 0;
      const numB = parseInt(b.farmer_username) || 0;
      return numA - numB;
    });
    
    console.log('✅ Final aggregated farmers:', sorted.length, 'farmers processed');
    return sorted;
  }, [data, bonusData, dateTo, farmerNamesMap]); // useMemo dependencies

  const calculateTotals = useMemo(() => {
    const farmers = getAggregatedFarmers;
    
    return farmers.reduce((acc, farmer) => ({
      totalMilk: acc.totalMilk + farmer.milk_total,
      totalQuantity: acc.totalQuantity + farmer.quantity,
      totalAdvance: acc.totalAdvance + farmer.advance,
      totalFeed: acc.totalFeed + farmer.cattle_feed,
      totalOther1: acc.totalOther1 + farmer.other1,
      totalOther2: acc.totalOther2 + farmer.other2,
      totalReceived: acc.totalReceived + farmer.received,
      totalDeduction: acc.totalDeduction + farmer.total_deduction,
      totalBonus: acc.totalBonus + farmer.bonusAmount,
      totalFixed: acc.totalFixed + farmer.fixedAmount,
      totalNet: acc.totalNet + Math.max(0, farmer.net_payable),
      totalRemaining: acc.totalRemaining + farmer.remaining_balance
    }), {
      totalMilk: 0,
      totalQuantity: 0,
      totalAdvance: 0,
      totalFeed: 0,
      totalOther1: 0,
      totalOther2: 0,
      totalReceived: 0,
      totalDeduction: 0,
      totalBonus: 0,
      totalFixed: 0,
      totalNet: 0,
      totalRemaining: 0
    });
  }, [getAggregatedFarmers]); // useMemo dependency

  const exportToExcel = async () => {
    if (!data || !selectedBranch) return;

    try {
      const bankResponse = await bankSummaryApi.getBankSummary({
        dairy_id: selectedBranch.toString(),
        start_date: dateFrom,
        end_date: dateTo,
      });

      const farmers = getAggregatedFarmers;
      const farmerMap = new Map(farmers.map(f => [f.farmer_id, f]));
      const userIdStr = userData?.id?.toString();
      const userId = userIdStr ? parseInt(userIdStr) : null;
      const currentDate = new Date().toLocaleDateString('en-GB').split('/').reverse().join('-');

      const bankData = (bankResponse.data || []).map((farmer: any) => {
        const paymentData = farmerMap.get(farmer.farmer_id);
        return {
          ...farmer,
          milk_total: paymentData?.net_payable || 0
        };
      }).filter(row => parseFloat(row.milk_total || 0) > 0).sort((a, b) => parseInt(a.farmer_id) - parseInt(b.farmer_id));

      if (userId === 2 || userId === 4 || userIdStr === '2' || userIdStr === '4') {
        const exportData = bankData.map(row => ({
          "PYMT_PROD_TYPE_CODE": "PAB_VENDOR",
          "PYMT_MODE": "NEFT",
          "DEBIT_ACC_NO": "",
          "BNF_NAME": row.fullName,
          "BENE_ACC_NO": row.accountNumber || "",
          "BENE_IFSC": row.ifscCode || "",
          "AMOUNT": Math.max(0, parseFloat(row.milk_total || 0)).toFixed(2),
          "DEBIT_NARR": "",
          "CREDIT_NARR": "",
          "MOBILE_NUM": row.mobile_number || "",
          "EMAIL_ID": row.email || "",
          "REMARK": "",
          "PYMT_DATE": currentDate
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const redColumns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'M'];
        redColumns.forEach(col => {
          const cellRef = `${col}1`;
          if (ws[cellRef]) {
            ws[cellRef].s = {
              font: { color: { rgb: "FF0000" }, bold: true },
              fill: { fgColor: { rgb: "FFFFFF" } }
            };
          }
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PEF Export");
        XLSX.writeFile(wb, `PEF_Export_${dateFrom}_to_${dateTo}.xlsx`, { cellStyles: true });
      } else {
        const exportData = bankData.map(row => ({
          "Farmer ID": row.farmer_id,
          "Name": row.fullName,
          "Mobile": row.mobile_number,
          "Email": row.email || "-",
          "Amount": Math.max(0, parseFloat(row.milk_total || 0)).toFixed(2),
          "Bank Name": row.bankName || "-",
          "Account Number": row.accountNumber || "-",
          "IFSC Code": row.ifscCode || "-"
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payment Summary");
        XLSX.writeFile(wb, `Payment_Summary_${dateFrom}_to_${dateTo}.xlsx`);
      }
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel');
    }
  };

  const formatDeduction = (farmer: any) => {
    const advance = farmer.advance_from_bills || 0;
    const cattleFeed = farmer.cattlefeed_from_bills || 0;
    const other1 = farmer.other1_from_bills || 0;
    const other2 = farmer.other2_from_bills || 0;
    const total = farmer.total_deduction || 0;
    
    if (total === 0) return '0';
    
    const parts = [];
    if (advance > 0) parts.push(advance.toFixed(2));
    if (cattleFeed > 0) parts.push(cattleFeed.toFixed(2));
    if (other1 > 0) parts.push(other1.toFixed(2));
    if (other2 > 0) parts.push(other2.toFixed(2));

    if (parts.length > 1) {
      return `${parts.join(' + ')} = ${total.toFixed(2)}`;
    }
    
    return total.toFixed(2);
  };


  const exportToPDF = async () => {
    setPdfLoading(true);
    try {
      const exportElement = pdfExportRef.current;
      if (!exportElement) {
        toast.error('Report content is not ready for PDF export');
        return;
      }

      if (!getAggregatedFarmers.length) {
        toast.error('No data available');
        return;
      }

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(exportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              --color-gray-50: #f9fafb !important;
              --color-gray-100: #f3f4f6 !important;
              --color-gray-200: #e5e7eb !important;
              --color-gray-300: #d1d5db !important;
              --color-gray-400: #9ca3af !important;
              --color-gray-500: #6b7280 !important;
              --color-gray-600: #4b5563 !important;
              --color-gray-700: #374151 !important;
              --color-gray-800: #1f2937 !important;
              --color-gray-900: #111827 !important;
              --color-blue-50: #eff6ff !important;
              --color-blue-100: #dbeafe !important;
              --color-blue-600: #2563eb !important;
              --color-blue-700: #1d4ed8 !important;
              --color-green-600: #16a34a !important;
              --color-red-600: #dc2626 !important;
              --color-orange-600: #ea580c !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 5;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const pageCanvasHeight = Math.max(1, Math.floor((canvas.width * printableHeight) / printableWidth));

      const rootRect = exportElement.getBoundingClientRect();
      const scaleFactor = canvas.width / rootRect.width;
      const rowElements = Array.from(exportElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];

      // Create page boundaries every N rows using average row height to avoid per-row rounding issues
      const rowsPerPage = 20;
      const pageBoundaries: number[] = [];
      const sampleCount = Math.min(5, rowElements.length);
      let avgRowCanvasPx = 0;
      if (sampleCount > 0) {
        const sampleRows = rowElements.slice(0, sampleCount);
        const totalRowPx = sampleRows.reduce((sum, r) => sum + (r.getBoundingClientRect().height || 0), 0);
        const avgRowPx = totalRowPx / sampleCount;
        avgRowCanvasPx = Math.max(1, Math.round(avgRowPx * scaleFactor));
      } else {
        avgRowCanvasPx = Math.max(1, Math.floor(pageCanvasHeight / rowsPerPage));
      }

      const pageCanvasHeightFromRows = avgRowCanvasPx * rowsPerPage;
      for (let y = pageCanvasHeightFromRows; y < canvas.height; y += pageCanvasHeightFromRows) {
        pageBoundaries.push(Math.min(Math.floor(y), canvas.height));
      }
      if (pageBoundaries.length === 0 || pageBoundaries[pageBoundaries.length - 1] < canvas.height) {
        pageBoundaries.push(canvas.height);
      }
      // Find footer boundaries so we can keep totals with previous page
      const tfootEl = exportElement.querySelector('tfoot');
      let footerTopBoundary: number | null = null;
      let footerBottomBoundary: number | null = null;
      if (tfootEl) {
        const fRect = (tfootEl as HTMLElement).getBoundingClientRect();
        footerTopBoundary = Math.floor((fRect.top - rootRect.top) * scaleFactor);
        footerBottomBoundary = Math.ceil((fRect.bottom - rootRect.top) * scaleFactor);
        if (footerTopBoundary < 0) footerTopBoundary = 0;
        if (footerBottomBoundary > canvas.height) footerBottomBoundary = canvas.height;
      }

      const addSlice = (sourceY: number, sourceHeight: number) => {
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sourceHeight;

        const sliceContext = sliceCanvas.getContext('2d');
        if (!sliceContext) {
          throw new Error('Unable to create canvas context for PDF export');
        }

        sliceContext.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );

        const sliceData = sliceCanvas.toDataURL('image/png');
        const sliceHeightMm = (sourceHeight * printableWidth) / canvas.width;
        doc.addImage(sliceData, 'PNG', margin, margin, printableWidth, sliceHeightMm);
      };

      let sourceY = 0;
      const seamGap = 2;
      while (sourceY < canvas.height) {
        const pageLimit = Math.min(sourceY + pageCanvasHeight, canvas.height);
        let sliceEnd = pageLimit;

        // Prefer page boundaries (every N rows). Choose the last page boundary that fits.
        let candidate: number | null = null;
        for (const boundary of pageBoundaries) {
          if (boundary <= sourceY) continue;
          if (boundary <= pageLimit) candidate = boundary;
          else break;
        }
        if (candidate !== null) {
          sliceEnd = candidate;
        }

        if (sliceEnd <= sourceY) {
          sliceEnd = Math.min(sourceY + pageCanvasHeight, canvas.height);
        }

        // If footer starts within this page limit but ends after it,
        // extend the slice to include the footer so totals don't land alone on next page.
        if (footerTopBoundary !== null && footerBottomBoundary !== null) {
          const footerHeight = footerBottomBoundary - footerTopBoundary;
          const distanceFooterAfterPage = footerTopBoundary - pageLimit;

          // Case A: footer begins inside this page (should have been included already)
          if (footerTopBoundary > sourceY && footerTopBoundary <= pageLimit && footerBottomBoundary > pageLimit) {
            sliceEnd = Math.min(footerBottomBoundary, canvas.height);
          }

          // Case B: footer starts just after the page limit (tiny gap) — include it to keep totals with content
          const smallGapThreshold = Math.max(10, Math.floor(pageCanvasHeight * 0.08));
          if (distanceFooterAfterPage > 0 && distanceFooterAfterPage <= smallGapThreshold) {
            sliceEnd = Math.min(footerBottomBoundary, canvas.height);
          }

          // Case C: only footer (or footer + very small content) remains after this page — include footer on this page
          const remainingAfterPage = canvas.height - pageLimit;
          if (remainingAfterPage <= footerHeight + 20) {
            sliceEnd = Math.min(footerBottomBoundary, canvas.height);
          }
        }

        if (sourceY > 0) {
          doc.addPage();
        }

        addSlice(sourceY, sliceEnd - sourceY);
        sourceY = sliceEnd + seamGap;
      }

      doc.save(`PaymentSummary_${dateFrom}_${dateTo}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <PdfLoader isLoading={pdfLoading} />
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Payment Summary Report</h1>
        
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">VLC Center</label>
                <select
                  value={selectedBranch || ''}
                  onChange={(e) => setSelectedBranch(Number(e.target.value))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select VLC</option>
                  {branches.map((branch) => {
                    const text = `${branch.username} - ${branch.name} - ${branch.branchName || ''}`;
                    const displayText = selectedBranch === branch.branch_id && text.length > 30 ? text.substring(0, 30) + '...' : text;
                    return (
                      <option key={branch.branch_id} value={branch.branch_id}>
                        {displayText}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <AppDatePicker
                  date={dateFrom}
                  onChange={handleDateFromChange}
                />
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <AppDatePicker
                  date={dateTo}
                  onChange={setDateTo}
                  disabled={true}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={fetchPaymentSummary}
                  disabled={loading}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  Show
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={!data || loading}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Bank Summary
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={!data || loading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {(() => {
          const totals = calculateTotals;
          return (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Milk</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">₹{totals.totalMilk.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Advances</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">₹{totals.totalAdvance.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Feed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">₹{totals.totalFeed.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Bonus</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">₹{totals.totalBonus.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Fixed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">₹{totals.totalFixed.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Net Payable</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">₹{totals.totalNet.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Remaining Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-600">₹{totals.totalRemaining.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        <div ref={pdfExportRef}>
          <div className="mb-3 text-center">
            <h2 className="text-xl font-semibold">Payment Summary Report</h2>
            <p className="text-sm text-gray-600">
              Branch: {branches.find(b => b.branch_id === selectedBranch)?.name || 'N/A'} | Period: {dateFrom} to {dateTo}
            </p>
          </div>
        <Card>
          <CardHeader>
            <CardTitle>Farmer Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-2 text-left text-xs">Code</th>
                      <th className="px-2 py-2 text-left text-xs">Name</th>
                      <th className="px-2 py-2 text-right text-xs">Liter</th>
                      <th className="px-2 py-2 text-right text-xs">Milk</th>
                      <th className="px-2 py-2 text-right text-xs">Prev Bal</th>
                      <th className="px-2 py-2 text-right text-xs">Advance</th>
                      <th className="px-2 py-2 text-right text-xs">Feed</th>
                      {(() => {
                        const totals = calculateTotals;
                        return (
                          <>
                            {totals.totalOther1 > 0 && <th className="px-2 py-2 text-right text-xs">Other1</th>}
                            {totals.totalOther2 > 0 && <th className="px-2 py-2 text-right text-xs">Other2</th>}
                          </>
                        );
                      })()}
                      <th className="px-2 py-2 text-right text-xs">Received</th>
                      <th className="px-2 py-2 text-right text-xs">Deduction</th>
                      <th className="px-2 py-2 text-right text-xs">Bonus</th>
                      <th className="px-2 py-2 text-right text-xs">Fixed</th>
                      <th className="px-2 py-2 text-right text-xs">Net Pay</th>
                      <th className="px-2 py-2 text-right text-xs">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const farmers = getAggregatedFarmers;
                      return farmers.length > 0 ? (
                        farmers.map((farmer) => (
                          <tr key={farmer.farmer_id} className="border-b hover:bg-gray-50">
                            <td className="px-2 py-2 text-xs">{farmer.farmer_username}</td>
                            <td className="px-2 py-2 text-xs" style={{ fontFamily: "'Noto Sans Devanagari', 'Roboto', sans-serif" }}>{farmer.farmer_name}</td>
                            <td className="px-2 py-2 text-right text-xs">{farmer.quantity.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.milk_total.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.previous_balance.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.advance.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.cattle_feed.toFixed(2)}</td>
                            {(() => {
                              const totals = calculateTotals;
                              return (
                                <>
                                  {totals.totalOther1 > 0 && <td className="px-2 py-2 text-right text-xs">₹{farmer.other1.toFixed(2)}</td>}
                                  {totals.totalOther2 > 0 && <td className="px-2 py-2 text-right text-xs">₹{farmer.other2.toFixed(2)}</td>}
                                </>
                              );
                            })()}
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.received.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{formatDeduction(farmer)}</td>
                            <td className="px-2 py-2 text-right text-xs text-red-600">₹{farmer.bonusAmount.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs text-red-600">₹{farmer.fixedAmount.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs font-semibold">₹{Math.max(0, farmer.net_payable).toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.remaining_balance.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={(() => {
                            const totals = calculateTotals;
                            let colCount = 13; // Base columns
                            if (totals.totalOther1 > 0) colCount++;
                            if (totals.totalOther2 > 0) colCount++;
                            return colCount;
                          })()} className="px-4 py-8 text-center text-gray-500">
                            No data available. Select filters and click Show to load data.
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const totals = calculateTotals;
                      return (
                        <tr className="bg-gray-200 font-bold">
                          <td className="px-2 py-2 text-xs" colSpan={2}>Total</td>
                          <td className="px-2 py-2 text-right text-xs">{totals.totalQuantity.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalMilk.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs"></td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalAdvance.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalFeed.toFixed(2)}</td>
                          {totals.totalOther1 > 0 && <td className="px-2 py-2 text-right text-xs">₹{totals.totalOther1.toFixed(2)}</td>}
                          {totals.totalOther2 > 0 && <td className="px-2 py-2 text-right text-xs">₹{totals.totalOther2.toFixed(2)}</td>}
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalReceived.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalDeduction.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalBonus.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalFixed.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{Math.max(0, totals.totalNet).toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalRemaining.toFixed(2)}</td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryReport;
