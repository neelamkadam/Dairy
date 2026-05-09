import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '@/services/config';
import { useAppSelector } from '@/redux/store';
import { toast } from 'react-toastify';

interface PassbookRow {
  period: string;
  milk_total: number;
  previous_balance: number;
  advance: number;
  cattle_feed: number;
  other1: number;
  other2: number;
  received: number;
  total_deduction: number;
  net_payable: number;
  total_remaining: number;
}

const FarmerPassbook = () => {
  const branches = useAppSelector((state) => state.branch.branches);
  const [selectedVLC, setSelectedVLC] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [farmerCode, setFarmerCode] = useState<string>('');
  const [farmersData, setFarmersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const FARMERS_PER_PAGE = 3;

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
      toast.error('Please select VLC Center and date range');
      return;
    }

    setLoading(true);
    try {
      const selectedBranch = branches.find(b => b.branch_id.toString() === selectedVLC);
      const params: any = {
        dairy_id: selectedBranch?.branch_id,
        from: fromDate,
        to: toDate
      };
      
      if (farmerCode.trim()) {
        params.farmer_id = farmerCode.padStart(4, '0');
      }

      const apiUrl = '/webreports/farmer-wise-collection';
      const queryString = new URLSearchParams(params as any).toString();
      const fullUrl = `${api.defaults.baseURL}${apiUrl}?${queryString}`;
      console.log('Full API URL:', fullUrl);

      const response = await api.get(apiUrl, { params });

      const farmers = response.data.farmers || [];
      setFarmersData(farmers);
      setCurrentPage(0);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed to fetch data: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    const vlcName = branches.find(v => v.branch_id.toString() === selectedVLC)?.name || 'VLC Center';

    farmersData.forEach((farmer, index) => {
      if (index > 0) doc.addPage();

      doc.setFontSize(16);
      doc.text('Farmer Passbook', 14, 15);
      doc.setFontSize(10);
      doc.text(`VLC Center: ${vlcName}`, 14, 22);
      doc.text(`Farmer: ${farmer.farmer_id}`, 14, 28);

      const row: PassbookRow = {
        period: `${fromDate} to ${toDate}`,
        milk_total: farmer.overall.totalAmount,
        previous_balance: 0,
        advance: farmer.financials.deductions.advance,
        cattle_feed: farmer.financials.deductions.cattle_feed,
        other1: farmer.financials.deductions.other1,
        other2: farmer.financials.deductions.other2,
        received: farmer.financials.total_received,
        total_deduction: farmer.financials.deductions.total,
        net_payable: farmer.overall.totalAmount - farmer.financials.deductions.total + farmer.financials.total_received,
        total_remaining: farmer.overall.totalAmount - farmer.financials.deductions.total + farmer.financials.total_received
      };

      const tableData = [[
        row.period,
        row.milk_total.toFixed(2),
        row.previous_balance.toFixed(2),
        row.advance.toFixed(2),
        row.cattle_feed.toFixed(2),
        row.other1.toFixed(2),
        row.other2.toFixed(2),
        row.received.toFixed(2),
        row.total_deduction.toFixed(2),
        row.net_payable.toFixed(2),
        row.total_remaining.toFixed(2)
      ]];

      autoTable(doc, {
        startY: 32,
        head: [['Period', 'Milk Total', 'Previous Balance', 'Advance', 'Cattle Feed', 'Other1', 'Other2', 'Received', 'Total Deduction', 'Net Payable', 'Total Remaining']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 5;
      autoTable(doc, {
        startY: finalY,
        body: [['', '', '', '', '', '', '', '', '', 'Remaining Balance', row.total_remaining.toFixed(2)]],
        theme: 'grid',
        styles: { fontSize: 8, fontStyle: 'bold' }
      });
    });

    doc.save(`FarmerPassbook_${fromDate}_to_${toDate}.pdf`);
  };

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
              <Label>Farmer Code (Optional)</Label>
              <Input placeholder="Enter code" value={farmerCode} onChange={(e) => setFarmerCode(e.target.value)} />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleShow} disabled={loading}>
                {loading ? 'Loading...' : 'Show'}
              </Button>
              <Button onClick={exportToPDF} disabled={farmersData.length === 0} variant="outline">
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {farmersData.length === 0 && fromDate && toDate && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">No passbook data found for the selected period.</p>
          </CardContent>
        </Card>
      )}

      {farmersData.length > 0 && (() => {
        const totalPages = Math.ceil(farmersData.length / FARMERS_PER_PAGE);
        const startIdx = currentPage * FARMERS_PER_PAGE;
        const endIdx = startIdx + FARMERS_PER_PAGE;
        const currentFarmers = farmersData.slice(startIdx, endIdx);

        return (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">Page {currentPage + 1} of {totalPages} (Showing {currentFarmers.length} farmers)</p>
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

            {currentFarmers.map((farmer) => {
              const row: PassbookRow = {
                period: `${fromDate} to ${toDate}`,
                milk_total: farmer.overall.totalAmount,
                previous_balance: 0,
                advance: farmer.financials.deductions.advance,
                cattle_feed: farmer.financials.deductions.cattle_feed,
                other1: farmer.financials.deductions.other1,
                other2: farmer.financials.deductions.other2,
                received: farmer.financials.total_received,
                total_deduction: farmer.financials.deductions.total,
                net_payable: farmer.overall.totalAmount - farmer.financials.deductions.total + farmer.financials.total_received,
                total_remaining: farmer.overall.totalAmount - farmer.financials.deductions.total + farmer.financials.total_received
              };

              return (
                <Card key={farmer.farmer_id} className="mb-4">
                  <CardHeader>
                    <CardTitle>Farmer: {farmer.farmer_id}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border p-2">Period</th>
                            <th className="border p-2">Milk Total</th>
                            <th className="border p-2">Previous Balance</th>
                            <th className="border p-2">Advance</th>
                            <th className="border p-2">Cattle Feed</th>
                            <th className="border p-2">Other1</th>
                            <th className="border p-2">Other2</th>
                            <th className="border p-2">Received</th>
                            <th className="border p-2">Total Deduction</th>
                            <th className="border p-2">Net Payable</th>
                            <th className="border p-2">Total Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-gray-50">
                            <td className="border p-2">{row.period}</td>
                            <td className="border p-2 text-right">{row.milk_total.toFixed(2)}</td>
                            <td className="border p-2 text-right">{row.previous_balance.toFixed(2)}</td>
                            <td className="border p-2 text-right">{row.advance.toFixed(2)}</td>
                            <td className="border p-2 text-right">{row.cattle_feed.toFixed(2)}</td>
                            <td className="border p-2 text-right">{row.other1.toFixed(2)}</td>
                            <td className="border p-2 text-right">{row.other2.toFixed(2)}</td>
                            <td className="border p-2 text-right">{row.received.toFixed(2)}</td>
                            <td className="border p-2 text-right">{row.total_deduction.toFixed(2)}</td>
                            <td className="border p-2 text-right">{row.net_payable.toFixed(2)}</td>
                            <td className="border p-2 text-right">{row.total_remaining.toFixed(2)}</td>
                          </tr>
                          <tr className="bg-blue-50 font-bold">
                            <td colSpan={9} className="border p-2"></td>
                            <td className="border p-2 text-right">Remaining Balance</td>
                            <td className="border p-2 text-right">{row.total_remaining.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        );
      })()}
    </div>
  );
};

export default FarmerPassbook;
