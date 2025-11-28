import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '@/services/config';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

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
  rate: string;
  amount: string;
}

interface FarmerBill {
  farmer_id: string;
  farmer_name: string;
  mobile_number: string;
  total_milk_amount: number;
  total_advance: number;
  total_feed: number;
  total_other: number;
  net_payable: number;
  is_finalized: number;
}

interface FarmerPayment {
  farmer_id: string;
  payment_type: string;
  amount: number;
  date: string;
  description: string;
}

const FarmerBillInvoiceReport = () => {
  const branches = useSelector((state: RootState) => state.branch.branches);
  const [selectedVLC, setSelectedVLC] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [farmerCode, setFarmerCode] = useState<string>('');
  const [collectionData, setCollectionData] = useState<CollectionRecord[]>([]);
  const [farmerBills, setFarmerBills] = useState<FarmerBill[]>([]);
  const [farmerPayments, setFarmerPayments] = useState<FarmerPayment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today = new Date();
    const day = today.getDate();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    let startDay, endDay;
    if (day <= 10) {
      startDay = 1;
      endDay = 10;
    } else if (day <= 20) {
      startDay = 11;
      endDay = 20;
    } else {
      startDay = 21;
      endDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    }

    setFromDate(`${year}-${month}-${String(startDay).padStart(2, '0')}`);
    setToDate(`${year}-${month}-${String(endDay).padStart(2, '0')}`);
  }, []);

  const handleShow = async () => {
    if (!selectedVLC || !fromDate || !toDate) {
      alert('Please select VLC Center and date range');
      return;
    }

    setLoading(true);
    try {
      const selectedBranch = branches.find(b => b.branch_id.toString() === selectedVLC);
      console.log('Selected Branch:', selectedBranch);
      console.log('API Params:', {
        dairyid: selectedBranch?.branch_id,
        startDate: fromDate,
        startShift: 'Morning',
        endDate: toDate,
        endShift: 'Evening',
        milkType: 'All'
      });

      const apiUrl = '/report/shift-collection-report';
      const params = {
        dairyid: selectedBranch?.branch_id,
        startDate: fromDate,
        startShift: 'Morning',
        endDate: toDate,
        endShift: 'Evening',
        milkType: 'All'
      };
      
      const queryString = new URLSearchParams(params).toString();
      const fullUrl = `${api.defaults.baseURL}${apiUrl}?${queryString}`;
      console.log('Full API URL:', fullUrl);

      const collectionResponse = await api.get(apiUrl, { params });

      console.log('API Response:', collectionResponse.data);
      console.log('Response Status:', collectionResponse.status);

      let filteredData = collectionResponse.data.report || [];

      if (farmerCode.trim()) {
        const paddedCode = farmerCode.padStart(4, '0');
        filteredData = filteredData.filter((item: CollectionRecord) => item.farmer_id === paddedCode);
        console.log('Filtered by Farmer Code:', filteredData);
      }

      setCollectionData(filteredData);
      setFarmerBills(collectionResponse.data.farmerwise_bills || []);
      setFarmerPayments(collectionResponse.data.farmer_payments || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alert(`Failed to fetch data: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
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

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    const totals = calculateTotals();
    const vlcName = branches.find(v => v.branch_id.toString() === selectedVLC)?.name || 'VLC Center';

    doc.setFontSize(16);
    doc.text('Farmer Bill Invoice Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`VLC Center: ${vlcName}`, 14, 22);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 28);
    if (farmerCode) doc.text(`Farmer Code: ${farmerCode.padStart(4, '0')}`, 14, 34);

    const tableData = collectionData.map(item => [
      item.date,
      item.shift,
      item.farmer_id,
      item.farmer_name,
      item.type,
      parseFloat(item.liters).toFixed(2),
      parseFloat(item.fat).toFixed(1),
      parseFloat(item.snf).toFixed(1),
      parseFloat(item.clr).toFixed(1),
      parseFloat(item.rate).toFixed(2),
      parseFloat(item.amount).toFixed(2)
    ]);

    autoTable(doc, {
      startY: farmerCode ? 38 : 32,
      head: [['Date', 'Shift', 'Code', 'Name', 'Type', 'Liters', 'FAT%', 'SNF%', 'CLR', 'Rate', 'Amount']],
      body: tableData,
      foot: [[
        'Total', '', '', '', '',
        totals.totalLiters.toFixed(2),
        totals.averageFat.toFixed(1),
        totals.averageSnf.toFixed(1),
        '', '',
        totals.totalAmount.toFixed(2)
      ]],
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    if (farmerCode && farmerBills.length > 0) {
      const bill = farmerBills.find(b => b.farmer_id === farmerCode.padStart(4, '0'));
      if (bill) {
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Bill Summary', 14, finalY);
        
        autoTable(doc, {
          startY: finalY + 5,
          body: [
            ['Total Milk Amount', `₹${bill.total_milk_amount.toFixed(2)}`],
            ['Total Advance', `₹${bill.total_advance.toFixed(2)}`],
            ['Total Feed', `₹${bill.total_feed.toFixed(2)}`],
            ['Total Other Deductions', `₹${bill.total_other.toFixed(2)}`],
            ['Net Payable', `₹${Math.max(0, bill.net_payable).toFixed(2)}`]
          ],
          theme: 'plain',
          styles: { fontSize: 10 }
        });
      }
    }

    doc.save(`FarmerBillInvoice_${fromDate}_to_${toDate}.pdf`);
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Farmer Bill Invoice Report</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>VLC Center</Label>
              <Select value={selectedVLC} onValueChange={setSelectedVLC}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select VLC Center" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {branches.map(vlc => (
                    <SelectItem key={vlc.branch_id} value={vlc.branch_id.toString()}>
                      {vlc.username} - {vlc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div className="flex-1 min-w-[150px]">
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            <div className="flex-1 min-w-[150px]">
              <Label>Farmer Code (Optional)</Label>
              <Input placeholder="Enter code" value={farmerCode} onChange={(e) => setFarmerCode(e.target.value)} />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleShow} disabled={loading}>
                {loading ? 'Loading...' : 'Show'}
              </Button>
              <Button onClick={exportToPDF} disabled={collectionData.length === 0} variant="outline">
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

      {collectionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collection Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Shift</th>
                    <th className="border p-2">Code</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Type</th>
                    <th className="border p-2">Liters</th>
                    <th className="border p-2">FAT%</th>
                    <th className="border p-2">SNF%</th>
                    <th className="border p-2">CLR</th>
                    <th className="border p-2">Rate</th>
                    <th className="border p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border p-2">{item.date}</td>
                      <td className="border p-2">{item.shift}</td>
                      <td className="border p-2">{item.farmer_id}</td>
                      <td className="border p-2">{item.farmer_name}</td>
                      <td className="border p-2">{item.type}</td>
                      <td className="border p-2 text-right">{parseFloat(item.liters).toFixed(2)}</td>
                      <td className="border p-2 text-right">{parseFloat(item.fat).toFixed(1)}</td>
                      <td className="border p-2 text-right">{parseFloat(item.snf).toFixed(1)}</td>
                      <td className="border p-2 text-right">{parseFloat(item.clr).toFixed(1)}</td>
                      <td className="border p-2 text-right">{parseFloat(item.rate).toFixed(2)}</td>
                      <td className="border p-2 text-right">{parseFloat(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={5} className="border p-2 text-right">Total</td>
                    <td className="border p-2 text-right">{totals.totalLiters.toFixed(2)}</td>
                    <td className="border p-2 text-right">{totals.averageFat.toFixed(1)}</td>
                    <td className="border p-2 text-right">{totals.averageSnf.toFixed(1)}</td>
                    <td className="border p-2"></td>
                    <td className="border p-2"></td>
                    <td className="border p-2 text-right">{totals.totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {farmerCode && farmerBills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const bill = farmerBills.find(b => b.farmer_id === farmerCode.padStart(4, '0'));
              if (!bill) return <p>No bill data found for this farmer</p>;
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Total Milk Amount</p>
                    <p className="text-xl font-bold">₹{bill.total_milk_amount.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Total Advance</p>
                    <p className="text-xl font-bold">₹{bill.total_advance.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Total Feed</p>
                    <p className="text-xl font-bold">₹{bill.total_feed.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Total Other Deductions</p>
                    <p className="text-xl font-bold">₹{bill.total_other.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded col-span-2">
                    <p className="text-sm text-gray-600">Net Payable</p>
                    <p className="text-2xl font-bold text-green-600">₹{Math.max(0, bill.net_payable).toFixed(2)}</p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FarmerBillInvoiceReport;
