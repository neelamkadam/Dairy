import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/config';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { toast } from 'react-toastify';
import { generateTemplate2, FarmerBillData, BankDetails } from '@/templates/FarmerBillInvoiceTemplate';
import { bankSummaryApi } from '@/services/bankSummaryApi';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PdfLoader from '@/components/PdfLoader';
import { useTranslation } from 'react-i18next';

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
  const branches = useSelector((state: RootState) => state.branch.branches);
  const userId = useSelector((state: RootState) => state.authData?.userData?.id);
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

      setCollectionData(filteredData);
      setFarmerBills(collectionResponse.data.farmerwise_bills || []);
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

  const exportToPDF = async () => {
    setPdfLoading(true);
    try {
      const grouped = groupByFarmer();
      const selectedBranch = branches.find(v => v.branch_id.toString() === selectedVLC);
      const vlcName = selectedBranch?.name || 'VLC Center';
      const dairyName = selectedBranch?.username || 'Dairy';

      const pdf = new jsPDF('p', 'mm', 'a4');
      const farmerIds = Object.keys(grouped);

      for (let i = 0; i < farmerIds.length; i++) {
        const farmerId = farmerIds[i];
        const farmerData = grouped[farmerId];
        const farmerName = farmerData[0].farmer_name;
        
        const templateData: FarmerBillData[] = farmerData.map(item => ({
          date: item.date,
          shift: item.shift,
          type: item.type,
          liters: parseFloat(item.liters),
          fat: parseFloat(item.fat),
          snf: parseFloat(item.snf),
          clr: parseFloat(item.clr),
          water: item.water ? parseFloat(item.water) : null,
          rate: parseFloat(item.rate),
          amount: parseFloat(item.amount),
          farmer_id: item.farmer_id,
          farmer_name: item.farmer_name
        }));

        const htmlContent = generateTemplate2({
          dairyName: dairyName,
          branchName: vlcName,
          farmerCode: farmerId,
          farmerName: farmerName,
          fromDate: fromDate,
          toDate: toDate,
          milkType: 'All',
          data: templateData,
          farmerBill: { farmerwise_bills: farmerBills },
          paymentSummary: null,
          bankDetails: bankDetailsMap.get(farmerId),
          hideRateAmount: hideRateAmount
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '210mm';
        document.body.appendChild(tempDiv);

        try {
          const canvas = await html2canvas(tempDiv, { 
            scale: 1.5,
            useCORS: true,
            logging: false,
            windowWidth: 794
          });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        } finally {
          document.body.removeChild(tempDiv);
        }
      }

      pdf.save(`Farmer_Bill_${fromDate}_to_${toDate}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const totals = calculateTotals();

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

            <div className="flex-1 min-w-[150px]">
              <Label>Language</Label>
              <Select value={language} onValueChange={(val) => { setLanguage(val); i18n.changeLanguage(val); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिंदी</SelectItem>
                  <SelectItem value="mr">मराठी</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button className=' bg-blue-600 text-white' onClick={handleShow} disabled={loading}>
                {loading ? 'Loading...' : 'Show'}
              </Button>
              <Button className='bg-red-600 text-white' onClick={exportToPDF} disabled={collectionData.length === 0 || pdfLoading} variant="outline">
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
        const grouped = Object.entries(groupByFarmer());
        const totalPages = grouped.length;
        const [farmerId, farmerData] = grouped[currentPage] || [];
        if (!farmerId) return null;

        const bill = farmerBills.find(b => b.farmer_id === farmerId);
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
                      <p className="text-2xl font-bold text-green-600">₹{Math.max(0, bill.net_payable).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default FarmerBillInvoiceReport;
