import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/config';
import { useAppSelector } from '@/redux/store';
import { toast } from 'react-toastify';
import { generateTemplate2, generateTemplateDetailedHorizontal, FarmerBillData, BankDetails } from '@/templates/FarmerBillInvoiceTemplate';
import { generateFarmer2PerPage } from '@/templates/FarmerBill2PerPageTemplate';
import { bankSummaryApi } from '@/services/bankSummaryApi';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PdfLoader from '@/components/PdfLoader';
import { useTranslation } from 'react-i18next';
import { billApi } from '@/services/billApi';
import { generateTemplate3Farmers, FarmerReportData } from '@/templates/FarmerBillInvoiceTemplate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CollectionRecord {
  date: string;
  shift: string;
  type: string;
  farmer_id: string;
  farmer_name: string;
  liters: string;
  fat: string;
  snf: string;
  clr: string;
  water: string;
  rate: string;
  amount: string;
}

interface FarmerBill {
  farmer_id: string;
  farmer_name: string;
  milk_total: number;
  received_total: number;
  net_payable: number;
  deductions: {
    advance: number;
    cattle_feed: number;
    other1: number;
    other2: number;
  };
}

interface FarmerPayment {
  id: number;
  farmer_id: string;
  farmer_name: string;
  payment_type: string;
  amount_taken: string;
  received: string;
  date: string;
}

const FarmerBillInvoiceReport = () => {
  const { i18n } = useTranslation();
  const branches = useAppSelector((state) => (state as any).branch.branches);
  const userId = useAppSelector((state) => (state as any).authData?.userData?.id);
  const hideRateAmount = userId === '7';
  const [selectedVLC, setSelectedVLC] = useState<string>('');
  const [language, setLanguage] = useState<string>(i18n.language || 'en');
  
  const calculateDateRange = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    
    let startDay: number, endDay: number;
    if (day >= 1 && day <= 10) {
      startDay = 1;
      endDay = 10;
    } else if (day >= 11 && day <= 20) {
      startDay = 11;
      endDay = 20;
    } else if (day >= 21) {
      startDay = 21;
      endDay = new Date(year, month, 0).getDate();
    } else return { from: dateStr, to: dateStr };
    
    return {
      from: `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    };
  };

  const todayDates = calculateDateRange(new Date().toISOString().split('T')[0]);
  const [fromDate, setFromDate] = useState<string>(todayDates.from);
  const [toDate, setToDate] = useState<string>(todayDates.to);
  
  const handleFromDateChange = (newDate: string) => {
    const dates = calculateDateRange(newDate);
    setFromDate(dates.from);
    setToDate(dates.to);
  };
  const [farmerCode, setFarmerCode] = useState<string>('');
  const [collectionData, setCollectionData] = useState<CollectionRecord[]>([]);
  const [farmerBills, setFarmerBills] = useState<FarmerBill[]>([]);
  const [farmerPayments, setFarmerPayments] = useState<FarmerPayment[]>([]);
  const [bankDetailsMap, setBankDetailsMap] = useState<Map<string, BankDetails>>(new Map());
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'1-per-page' | '2-per-page' | '3-per-page' | 'detailed-horizontal'>('1-per-page');

  const handleShow = async () => {
    if (!selectedVLC || !fromDate || !toDate) {
      toast.error('Please select VLC Center and date range');
      return;
    }

    setLoading(true);
    try {
      const selectedBranch = branches.find(b => b.branch_id.toString() === selectedVLC);

      const apiUrl = '/report/shift-collection-report';
      const params = {
        dairyid: selectedBranch?.branch_id,
        startDate: fromDate,
        startShift: 'Morning',
        endDate: toDate,
        endShift: 'Evening',
        milkType: 'All'
      };

      const collectionResponse = await api.get(apiUrl, { params });

      let filteredData = collectionResponse.data.report || [];
      console.log('Collection data sample:', filteredData.slice(0, 2));

      if (farmerCode.trim()) {
        const paddedCode = farmerCode.padStart(4, '0');
        filteredData = filteredData.filter((item: CollectionRecord) => item.farmer_id === paddedCode);
      }
      
      // Sort filteredData by farmer_id
      filteredData.sort((a: CollectionRecord, b: CollectionRecord) => {
        return parseInt(a.farmer_id) - parseInt(b.farmer_id);
      });

      setCollectionData(filteredData);
      setFarmerBills(collectionResponse.data as any);
      setFarmerPayments(collectionResponse.data.farmer_payments || []);
      
      // Fetch bank details
      try {
        const bankResponse = await bankSummaryApi.getBankSummary({
          dairy_id: selectedVLC,
          start_date: format(new Date(fromDate), 'yyyy-MM-dd'),
          end_date: format(new Date(toDate), 'yyyy-MM-dd')
        });
        
        const bankMap = new Map<string, BankDetails>();
        (bankResponse.data || []).forEach((farmer: any) => {
          bankMap.set(farmer.farmer_id, {
            accountNumber: farmer.accountNumber,
            ifscCode: farmer.ifscCode,
            bankName: farmer.bankName,
            branchName: farmer.branchName
          });
        });
        setBankDetailsMap(bankMap);
      } catch (error) {
        console.error('Failed to fetch bank details:', error);
      }
      
      setCurrentPage(0);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(`Failed to fetch data: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calculateTotals = () => {
    let cowLiters = 0, cowAmount = 0, cowWeightedFat = 0, cowWeightedSnf = 0;
    let buffaloLiters = 0, buffaloAmount = 0, buffaloWeightedFat = 0, buffaloWeightedSnf = 0;

    collectionData.forEach(item => {
      const liters = parseFloat(item.liters || '0');
      const amount = parseFloat(item.amount || '0');
      const fat = parseFloat(item.fat || '0');
      const snf = parseFloat(item.snf || '0');

      if (item.type === 'Cow') {
        cowLiters += liters;
        cowAmount += amount;
        cowWeightedFat += fat * liters;
        cowWeightedSnf += snf * liters;
      } else if (item.type === 'Buffalo') {
        buffaloLiters += liters;
        buffaloAmount += amount;
        buffaloWeightedFat += fat * liters;
        buffaloWeightedSnf += snf * liters;
      }
    });

    const totalLiters = cowLiters + buffaloLiters;
    const totalAmount = cowAmount + buffaloAmount;

    return {
      cowLiters,
      cowAmount,
      buffaloLiters,
      buffaloAmount,
      totalLiters,
      totalAmount,
      averageFat: totalLiters > 0 ? (cowWeightedFat + buffaloWeightedFat) / totalLiters : 0,
      averageSnf: totalLiters > 0 ? (cowWeightedSnf + buffaloWeightedSnf) / totalLiters : 0
    };
  };

  const groupByFarmer = () => {
    const grouped: { [key: string]: CollectionRecord[] } = {};
    collectionData.forEach(item => {
      if (!grouped[item.farmer_id]) grouped[item.farmer_id] = [];
      grouped[item.farmer_id].push(item);
    });
    return grouped;
  };

  const generatePage = async (htmlContent: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 794, // Approx 210mm at 96 DPI
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      return { imgData, imgWidth, imgHeight };
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const exportToPDF = async () => {
    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(v => v.branch_id.toString() === selectedVLC);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.username || '';
      const branchName = selectedBranch?.branchName || '';
      // @ts-ignore
      const dairyId = selectedBranch?.branch_id || selectedBranch?.id;

      // Fetch complete farmer data with farmer_details from the correct API
      const response = await billApi.getFarmerReport({
        dairy_id: dairyId,
        start_date: fromDate,
        end_date: toDate
      });

      if (!response.data.success) {
        toast.error('Failed to fetch farmer report data');
        return;
      }

      const cowData: FarmerReportData[] = response.data.cow || [];
      const buffaloData: FarmerReportData[] = response.data.buffalo || [];
      
      // Combine cow and buffalo data
      const allFarmerData = [...cowData, ...buffaloData];
      
      // Create a map of farmer_id to complete farmer data (including farmer_details)
      const farmerDataMap = new Map();
      allFarmerData.forEach(farmer => {
        if (!farmerDataMap.has(farmer.farmer_id)) {
          farmerDataMap.set(farmer.farmer_id, farmer);
        } else {
          // Merge collections if farmer exists in both cow and buffalo
          const existing = farmerDataMap.get(farmer.farmer_id);
          existing.collections = [...existing.collections, ...farmer.collections];
        }
      });

      let pdf = new jsPDF('p', 'mm', 'a4');
      const farmerIds = Array.from(farmerDataMap.keys());

      // Filter by farmerCode if specified
      const filteredFarmerIds = farmerCode.trim() 
        ? farmerIds.filter(id => id === farmerCode.padStart(4, '0'))
        : farmerIds.sort((a, b) => parseInt(a) - parseInt(b));

      if (filteredFarmerIds.length === 0) {
        toast.info('No data found for the selected criteria');
        return;
      }


      const BATCH_SIZE = 50;
      
      for (let i = 0; i < filteredFarmerIds.length; i++) {
        const farmerId = filteredFarmerIds[i];
        const farmerInfo = farmerDataMap.get(farmerId);
        
        // Convert collections to FarmerBillData format
        const templateDataItems: FarmerBillData[] = farmerInfo.collections
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((item: any) => ({
            date: item.created_at,
            shift: item.shift,
            type: item.type,
            liters: parseFloat(item.quantity),
            fat: parseFloat(item.fat),
            snf: parseFloat(item.snf),
            clr: parseFloat(item.clr),
            water: item.water ? parseFloat(item.water) : null,
            rate: parseFloat(item.rate),
            amount: parseFloat(item.amount),
            farmer_id: item.farmer_id,
            farmer_name: farmerInfo.farmer_details?.fullName || farmerId
          }));

        const baseParams = {
          dairyName: dairyName,
          branchName: branchName,
          dairyCode: dairyCode,
          farmerCode: farmerId,
          farmerName: farmerInfo.farmer_details?.fullName || farmerId,
          fromDate: fromDate,
          toDate: toDate,
          data: templateDataItems,
          payments: farmerInfo.payments,
          current_bill: farmerInfo.current_bill,
          previous_bill: farmerInfo.previous_bill,
          bonus_deduction_info: (farmerInfo as any).bonus_deduction_info,
          bonus_deduction_logs_summary: (response.data as any).bonus_deduction_logs_summary,
          bankDetails: farmerInfo.farmer_details ? {
            accountNumber: farmerInfo.farmer_details.accountNumber,
            ifscCode: farmerInfo.farmer_details.ifscCode,
            bankName: farmerInfo.farmer_details.bankName,
          } : undefined,
          hideRateAmount: hideRateAmount
        };

        // Check for mixed types
        const hasCow = templateDataItems.some(item => item.type === 'Cow');
        const hasBuffalo = templateDataItems.some(item => item.type === 'Buffalo');
        const isMixed = hasCow && hasBuffalo;

        if (isMixed) {
          // 1. Cow Page (Header YES, Summary NO)
          const cowHtml = generateTemplate2({ 
            ...baseParams, 
            milkType: 'Cow',
            hideHeader: false,
            hideSummary: true 
          });
          const cowPage = await generatePage(cowHtml);
          if (i > 0) pdf.addPage(); 
          else if (pdf.getNumberOfPages() > 1) pdf.addPage(); 
          
          pdf.addImage(cowPage.imgData, 'PNG', 0, 0, cowPage.imgWidth, cowPage.imgHeight);

          // 2. Buffalo Page (Header NO, Summary YES)
          const buffaloHtml = generateTemplate2({ 
            ...baseParams, 
            milkType: 'Buffalo',
            hideHeader: true,
            hideSummary: false
          });
          const buffaloPage = await generatePage(buffaloHtml);
          pdf.addPage();
          pdf.addImage(buffaloPage.imgData, 'PNG', 0, 0, buffaloPage.imgWidth, buffaloPage.imgHeight);

        } else {
          // Single type (standard)
          const htmlContent = generateTemplate2({ ...baseParams, milkType: 'All' });
          const page = await generatePage(htmlContent);
          
          if (i > 0) pdf.addPage();
          pdf.addImage(page.imgData, 'PNG', 0, 0, page.imgWidth, page.imgHeight);
        }
        
        // Save in batches to avoid memory issues
        if ((i + 1) % BATCH_SIZE === 0 && i < filteredFarmerIds.length - 1) {
          pdf.save(`Farmer_Bill_${fromDate}_to_${toDate}_Part${Math.floor(i / BATCH_SIZE) + 1}.pdf`);
          pdf = new jsPDF('p', 'mm', 'a4');
        }
      }

      pdf.save(`Farmer_Bill_${fromDate}_to_${toDate}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const exportMultiPerPagePDF = async (chunkSize: number) => {
    if (!selectedVLC || !fromDate || !toDate) {
      toast.error('Please select VLC Center and date range');
      return;
    }

    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(v => v.branch_id.toString() === selectedVLC);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.name || '';
      const branchName = selectedBranch?.branchName || '';
      // @ts-ignore
      const dairyId = selectedBranch?.branch_id || selectedBranch?.id;

      const response = await billApi.getFarmerReport({
        dairy_id: dairyId,
        start_date: fromDate,
        end_date: toDate
      });

      if (!response.data.success) {
        toast.error('Failed to fetch farmer report data');
        return;
      }

      const cowData: FarmerReportData[] = response.data.cow || [];
      const buffaloData: FarmerReportData[] = response.data.buffalo || [];
      
      // Merge cow and buffalo data for the same farmer
      const farmerMap = new Map<string, FarmerReportData>();
      
      [...cowData, ...buffaloData].forEach(farmer => {
        if (farmerMap.has(farmer.farmer_id)) {
          const existing = farmerMap.get(farmer.farmer_id)!;
          existing.collections = [...existing.collections, ...farmer.collections];
          existing.collections_summary.total_quantity += farmer.collections_summary.total_quantity;
          existing.collections_summary.total_amount += farmer.collections_summary.total_amount;
        } else {
          farmerMap.set(farmer.farmer_id, { ...farmer });
        }
      });
      
      const allData = Array.from(farmerMap.values()).sort((a, b) => {
        return parseInt(a.farmer_id) - parseInt(b.farmer_id);
      });

      if (allData.length === 0) {
        toast.info('No data found for the selected period');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      for (let i = 0; i < allData.length; i += chunkSize) {
        const chunk = allData.slice(i, i + chunkSize);
        
        let htmlContent = "";
        if (chunkSize === 3) {
          htmlContent = generateTemplate3Farmers({
            dairyName: dairyName,
            dairyCode: dairyCode,
            branchName: branchName,
            farmers: chunk,
            fromDate: formatDate(fromDate),
            toDate: formatDate(toDate),
            hideRateAmount: hideRateAmount
          });
        } else {
          htmlContent = generateFarmer2PerPage({
            dairyName: dairyName,
            branchName: branchName,
            farmers: chunk,
            fromDate: formatDate(fromDate),
            toDate: formatDate(toDate),
            hideRateAmount: hideRateAmount
          });
        }

        const { imgData, imgWidth, imgHeight } = await generatePage(htmlContent);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`Farmer_Bill_Report_${chunkSize}perPage_${fromDate}_to_${toDate}.pdf`);
      toast.success('PDF downloaded successfully');

    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const exportDetailedHorizontalPDF = async () => {
    setPdfLoading(true);
    try {
      const selectedBranch = branches.find(v => v.branch_id.toString() === selectedVLC);
      const dairyName = selectedBranch?.name || 'Dairy';
      const dairyCode = selectedBranch?.name || '';
      const branchName = selectedBranch?.branchName || '';
      // @ts-ignore
      const dairyId = selectedBranch?.branch_id || selectedBranch?.id;

      const response = await billApi.getFarmerReport({
        dairy_id: dairyId,
        start_date: fromDate,
        end_date: toDate
      });
      console.log("Farmer Report API Response:", response.data);

      if (!response.data.success) {
        toast.error('Failed to fetch farmer report data');
        return;
      }

      const cowData: FarmerReportData[] = response.data.cow || [];
      const buffaloData: FarmerReportData[] = response.data.buffalo || [];
      const farmerMap = new Map<string, FarmerReportData>();
      
      [...cowData, ...buffaloData].forEach(farmer => {
        if (farmerMap.has(farmer.farmer_id)) {
          const existing = farmerMap.get(farmer.farmer_id)!;
          existing.collections = [...existing.collections, ...farmer.collections];
        } else {
          farmerMap.set(farmer.farmer_id, { ...farmer });
        }
      });

      const sortedFarmers = Array.from(farmerMap.values()).sort((a, b) => parseInt(a.farmer_id) - parseInt(b.farmer_id));
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      for (let i = 0; i < sortedFarmers.length; i++) {
        const farmer = sortedFarmers[i];
        const farmerBillData: FarmerBillData[] = farmer.collections.map(c => ({
          date: c.created_at,
          shift: c.shift as 'Morning' | 'Evening',
          type: c.type as 'Cow' | 'Buffalo',
          liters: Number(c.quantity),
          fat: Number(c.fat),
          snf: Number(c.snf),
          clr: Number(c.clr || 0),
          rate: Number(c.rate),
          amount: Number(c.amount),
          water: Number(c.water || 0)
        }));

        const templateData = {
          dairyName,
          branchName,
          dairyCode,
          farmerCode: farmer.farmer_id,
          farmerName: farmer.farmer_details?.fullName || 'Unknown',
          fromDate,
          toDate,
          milkType: 'All',
          data: farmerBillData,
          bankDetails: {
            accountNumber: farmer.farmer_details?.accountNumber || '',
            ifscCode: farmer.farmer_details?.ifscCode || '',
            bankName: farmer.farmer_details?.bankName || '',
            branchName: (farmer.farmer_details as any)?.branchName || ''
          },
          current_bill: farmer.current_bill,
          previous_bill: (farmer as any).previous_bill,
          payments: (farmer.payments || []).map((p: any) => {
            const logs = (farmer as any).payment_logs?.data || [];
            const logMatch = logs.find((l: any) => 
              l.payment_type.toLowerCase().trim().replace(/\s/g, '') === p.payment_type.toLowerCase().trim().replace(/\s/g, '') &&
              parseFloat(l.amount_taken) === parseFloat(p.amount_taken)
            );
            const merged = logMatch ? { ...p, ...logMatch } : p;
            return {
              ...merged,
              stock_name: merged.stock_name,
              stock: merged.stock,
              date: merged.date || merged.created_at
            };
          })
        };

        const html = generateTemplateDetailedHorizontal(templateData as any, i18n.language);
        const { imgData, imgWidth, imgHeight } = await generatePage(html);
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }
      pdf.save(`Detailed_Horizontal_Bills_${fromDate}_${toDate}.pdf`);
      toast.success('Detailed PDF downloaded successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate detailed PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExport = () => {
    if (exportFormat === '1-per-page' && collectionData.length === 0) {
      toast.error('Please click "Show" first to load data for the detailed report.');
      return;
    }
    setShowExportModal(false);
    if (exportFormat === 'detailed-horizontal') {
      exportDetailedHorizontalPDF();
    } else if (exportFormat === '1-per-page') {
      exportToPDF();
    } else if (exportFormat === '2-per-page') {
      exportMultiPerPagePDF(2);
    } else {
      exportMultiPerPagePDF(3);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PdfLoader isLoading={pdfLoading} />
      <h1 className="text-2xl font-bold">Farmer Bill Invoice Report</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>VLC Center</Label>
              <Select value={selectedVLC} onValueChange={setSelectedVLC}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select VLC Center">
                    {selectedVLC && (() => {
                      const selected = branches.find(b => b.branch_id.toString() === selectedVLC);
                      if (selected) {
                        const text = `${selected.username} - ${selected.name}`;
                        return text.length > 25 ? text.substring(0, 25) + '...' : text;
                      }
                      return 'Select VLC Center';
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {branches.map(vlc => (
                    <SelectItem key={vlc.branch_id} value={vlc.branch_id.toString()}>
                      {vlc.username} - {vlc.name} - {vlc.branchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => handleFromDateChange(e.target.value)} />
            </div>

            <div className="flex-1 min-w-[150px]">
              <Label>To Date</Label>
              <Input type="date" value={toDate} disabled className="bg-gray-100 cursor-not-allowed" />
            </div>

            <div className="flex-1 min-w-[150px]">
              <Label>Farmer Code (Optional)</Label>
              <Input placeholder="Enter code" value={farmerCode} onChange={(e) => setFarmerCode(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button className=' bg-blue-600 text-white' onClick={handleShow} disabled={loading}>
                {loading ? 'Loading...' : 'Show'}
              </Button>
              <Button 
                className='bg-red-600 text-white' 
                onClick={() => setShowExportModal(true)} 
                disabled={!selectedVLC || pdfLoading} 
                variant="outline"
              >
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {collectionData.length === 0 && fromDate && toDate && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">No collection data found for the selected period.</p>
          </CardContent>
        </Card>
      )}

      {collectionData.length > 0 && (() => {
        const grouped = Object.entries(groupByFarmer()).sort(([idA], [idB]) => parseInt(idA) - parseInt(idB));
        const totalPages = grouped.length;
        const [farmerId, farmerData] = grouped[currentPage] || [];
        if (!farmerId) return null;

        let searchBills: any[] = [];
        if (Array.isArray(farmerBills)) {
          searchBills = farmerBills;
        } else if (farmerBills && (typeof farmerBills === 'object')) {
           // @ts-ignore
           if (farmerBills.cow && Array.isArray(farmerBills.cow)) searchBills = [...searchBills, ...farmerBills.cow];
           // @ts-ignore
           if (farmerBills.buffalo && Array.isArray(farmerBills.buffalo)) searchBills = [...searchBills, ...farmerBills.buffalo];
           // @ts-ignore
           if (farmerBills.farmerwise_bills && Array.isArray(farmerBills.farmerwise_bills)) searchBills = [...searchBills, ...farmerBills.farmerwise_bills];
        }
        
        const bill = searchBills.find((b: any) => b.farmer_id === farmerId);
        const payments = farmerPayments.filter(p => p.farmer_id === farmerId);
        const farmerTotal = farmerData.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const farmerLiters = farmerData.reduce((sum, item) => sum + parseFloat(item.liters), 0);

        return (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">Farmer {currentPage + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))} 
                  disabled={currentPage === 0}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <Button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} 
                  disabled={currentPage === totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Farmer: {farmerId} - {farmerData[0].farmer_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2">Date</th>
                        <th className="border p-2">Shift</th>
                        <th className="border p-2">Type</th>
                        <th className="border p-2">Liters</th>
                        <th className="border p-2">FAT%</th>
                        <th className="border p-2">SNF%</th>
                        <th className="border p-2">CLR</th>
                        <th className="border p-2">Water</th>
                        {!hideRateAmount && <th className="border p-2">Rate</th>}
                        {!hideRateAmount && <th className="border p-2">Amount</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {farmerData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border p-2">{formatDate(item.date)}</td>
                          <td className="border p-2">{item.shift}</td>
                          <td className="border p-2">{item.type}</td>
                          <td className="border p-2 text-right">{parseFloat(item.liters).toFixed(2)}</td>
                          <td className="border p-2 text-right">{parseFloat(item.fat).toFixed(1)}</td>
                          <td className="border p-2 text-right">{parseFloat(item.snf).toFixed(1)}</td>
                          <td className="border p-2 text-right">{parseFloat(item.clr).toFixed(1)}</td>
                          <td className="border p-2 text-right">{item.water ? parseFloat(item.water).toFixed(1) : '-'}</td>
                          {!hideRateAmount && <td className="border p-2 text-right">{parseFloat(item.rate).toFixed(2)}</td>}
                          {!hideRateAmount && <td className="border p-2 text-right">{parseFloat(item.amount).toFixed(2)}</td>}
                        </tr>
                      ))}
                      <tr className="bg-blue-50 font-bold">
                        <td colSpan={3} className="border p-2 text-right">Total</td>
                        <td className="border p-2 text-right">{farmerLiters.toFixed(2)}</td>
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        {!hideRateAmount && <td className="border p-2"></td>}
                        {!hideRateAmount && <td className="border p-2 text-right">{farmerTotal.toFixed(2)}</td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payments/Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-2">Date</th>
                          <th className="border p-2">Type</th>
                          <th className="border p-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="border p-2">{formatDate(payment.date)}</td>
                            <td className="border p-2">{payment.payment_type}</td>
                            <td className="border p-2 text-right">₹{parseFloat(payment.amount_taken).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {bill && (
              <Card>
                <CardHeader>
                  <CardTitle>Bill Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Total Milk Amount</p>
                      <p className="text-xl font-bold">₹{bill.milk_total.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Advance</p>
                      <p className="text-xl font-bold">₹{bill.deductions.advance.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Cattle Feed</p>
                      <p className="text-xl font-bold">₹{bill.deductions.cattle_feed.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Other Deductions</p>
                      <p className="text-xl font-bold">₹{(bill.deductions.other1 + bill.deductions.other2).toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded col-span-2">
                      <p className="text-sm text-gray-600">Net Payable</p>
                      <p className="text-2xl font-bold text-green-600">₹{(bill.milk_total - bill.deductions.advance - bill.deductions.cattle_feed - bill.deductions.other1 - bill.deductions.other2).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          </>
        );
      })()}

      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Select Export Format</DialogTitle>
            <DialogDescription>
              Choose how many farmer bills you want to print per A4 sheet.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <RadioGroup 
              value={exportFormat} 
              onValueChange={(val) => setExportFormat(val as any)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExportFormat('1-per-page')}>
                <RadioGroupItem value="1-per-page" id="1-per-page" />
                <Label htmlFor="1-per-page" className="flex-1 font-semibold cursor-pointer">1 Farmer per Page (Full Details)</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExportFormat('2-per-page')}>
                <RadioGroupItem value="2-per-page" id="2-per-page" />
                <Label htmlFor="2-per-page" className="flex-1 font-semibold cursor-pointer">2 Farmers per Page (Medium)</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExportFormat('3-per-page')}>
                <RadioGroupItem value="3-per-page" id="3-per-page" />
                <Label htmlFor="3-per-page" className="flex-1 font-semibold cursor-pointer">3 Farmers per Page (Compact)</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExportFormat('detailed-horizontal' as any)}>
                <RadioGroupItem value="detailed-horizontal" id="detailed-horizontal" />
                <Label htmlFor="detailed-horizontal" className="flex-1 font-semibold cursor-pointer">Detailed Horizontal Format (Full Page)</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>Cancel</Button>
            <Button onClick={handleExport} className="bg-blue-600 text-white hover:bg-blue-700">Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerBillInvoiceReport;
