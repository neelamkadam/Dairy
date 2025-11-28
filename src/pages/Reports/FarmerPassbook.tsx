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
  quantity: number;
  fat: number;
  snf: number;
  rate: number;
  amount: number;
}

const FarmerPassbook = () => {
  const branches = useSelector((state: RootState) => state.branch.branches);
  const [selectedVLC, setSelectedVLC] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [farmerCode, setFarmerCode] = useState<string>('');
  const [collectionData, setCollectionData] = useState<CollectionRecord[]>([]);
  const [financials, setFinancials] = useState({ advances: 0, cattle_feed: 0, deductions: 0, net_amount: 0 });
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
    if (!selectedVLC || !fromDate || !toDate || !farmerCode.trim()) {
      alert('Please select VLC Center, date range, and enter farmer code');
      return;
    }

    setLoading(true);
    try {
      const selectedBranch = branches.find(b => b.branch_id.toString() === selectedVLC);
      const paddedCode = farmerCode.padStart(4, '0');

      const response = await api.get('/collections/getTodayscollectionfarmer', {
        params: {
          dairy_id: selectedBranch?.branch_id,
          farmer_id: paddedCode,
          start_date: fromDate,
          end_date: toDate
        }
      });

      const collections = response.data.collections || [];
      const flatData: CollectionRecord[] = [];

      collections.forEach((day: any) => {
        if (day.morning) {
          flatData.push({
            date: day.date,
            shift: 'Morning',
            type: day.morning.type || 'Cow',
            quantity: day.morning.quantity || 0,
            fat: day.morning.fat || 0,
            snf: day.morning.snf || 0,
            rate: day.morning.rate || 0,
            amount: day.morning.amount || 0
          });
        }
        if (day.evening) {
          flatData.push({
            date: day.date,
            shift: 'Evening',
            type: day.evening.type || 'Buffalo',
            quantity: day.evening.quantity || 0,
            fat: day.evening.fat || 0,
            snf: day.evening.snf || 0,
            rate: day.evening.rate || 0,
            amount: day.evening.amount || 0
          });
        }
      });

      setCollectionData(flatData);
      setFinancials(response.data.financials || { advances: 0, cattle_feed: 0, deductions: 0, net_amount: 0 });
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Failed to fetch data: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalQuantity = collectionData.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = collectionData.reduce((sum, item) => sum + item.amount, 0);
    return { totalQuantity, totalAmount };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const totals = calculateTotals();
    const vlcName = branches.find(v => v.branch_id.toString() === selectedVLC)?.name || 'VLC Center';

    doc.setFontSize(16);
    doc.text('Farmer Passbook', 14, 15);
    doc.setFontSize(10);
    doc.text(`VLC Center: ${vlcName}`, 14, 22);
    doc.text(`Farmer Code: ${farmerCode.padStart(4, '0')}`, 14, 28);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 34);

    const tableData = collectionData.map(item => [
      item.date,
      item.shift,
      item.type,
      item.quantity.toFixed(2),
      item.fat.toFixed(1),
      item.snf.toFixed(1),
      item.rate.toFixed(2),
      item.amount.toFixed(2)
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['Date', 'Shift', 'Type', 'Qty (L)', 'FAT%', 'SNF%', 'Rate', 'Amount']],
      body: tableData,
      foot: [['Total', '', '', totals.totalQuantity.toFixed(2), '', '', '', totals.totalAmount.toFixed(2)]],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Financial Summary', 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      body: [
        ['Total Amount', `₹${totals.totalAmount.toFixed(2)}`],
        ['Advances', `₹${financials.advances.toFixed(2)}`],
        ['Cattle Feed', `₹${financials.cattle_feed.toFixed(2)}`],
        ['Total Deductions', `₹${financials.deductions.toFixed(2)}`],
        ['Net Amount', `₹${financials.net_amount.toFixed(2)}`]
      ],
      theme: 'plain',
      styles: { fontSize: 10 }
    });

    doc.save(`FarmerPassbook_${farmerCode}_${fromDate}_to_${toDate}.pdf`);
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Farmer Passbook</h1>

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
              <Label>Farmer Code</Label>
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
        <>
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
                      <th className="border p-2">Type</th>
                      <th className="border p-2">Quantity (L)</th>
                      <th className="border p-2">FAT%</th>
                      <th className="border p-2">SNF%</th>
                      <th className="border p-2">Rate</th>
                      <th className="border p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectionData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border p-2">{item.date}</td>
                        <td className="border p-2">{item.shift}</td>
                        <td className="border p-2">{item.type}</td>
                        <td className="border p-2 text-right">{item.quantity.toFixed(2)}</td>
                        <td className="border p-2 text-right">{item.fat.toFixed(1)}</td>
                        <td className="border p-2 text-right">{item.snf.toFixed(1)}</td>
                        <td className="border p-2 text-right">{item.rate.toFixed(2)}</td>
                        <td className="border p-2 text-right">{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 font-bold">
                      <td colSpan={3} className="border p-2 text-right">Total</td>
                      <td className="border p-2 text-right">{totals.totalQuantity.toFixed(2)}</td>
                      <td className="border p-2"></td>
                      <td className="border p-2"></td>
                      <td className="border p-2"></td>
                      <td className="border p-2 text-right">{totals.totalAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold">₹{totals.totalAmount.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Advances</p>
                  <p className="text-xl font-bold">₹{financials.advances.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Cattle Feed</p>
                  <p className="text-xl font-bold">₹{financials.cattle_feed.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Total Deductions</p>
                  <p className="text-xl font-bold">₹{financials.deductions.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded col-span-2">
                  <p className="text-sm text-gray-600">Net Amount</p>
                  <p className="text-2xl font-bold text-green-600">₹{financials.net_amount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default FarmerPassbook;
