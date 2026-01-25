import { useState, useEffect } from "react";
import { Calendar, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSelector } from "@/redux/store";
import { api } from "@/services/config";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PdfLoader from "@/components/PdfLoader";
import * as XLSX from "xlsx";
import { bankSummaryApi } from "@/services/bankSummaryApi";

interface FarmerDetail {
  farmer_id: string;
  farmer_username: string;
  farmer_name: string;
  date: string;
  milk_total: number;
  total_received: number;
  deductions: {
    advance: number;
    cattle_feed: number;
    other1: number;
    other2: number;
    total: number;
  };
  net_payable: number;
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
  const calculateEndDate = (startDate: string) => {
    const [year, month, day] = startDate.split('-').map(Number);
    
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
    } else return { from: startDate, to: startDate };
    
    return {
      from: `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    };
  };

  const todayDates = calculateEndDate(new Date().toISOString().split('T')[0]);
  const [dateFrom, setDateFrom] = useState(todayDates.from);
  const [dateTo, setDateTo] = useState(todayDates.to);

  const handleDateFromChange = (newDate: string) => {
    const dates = calculateEndDate(newDate);
    setDateFrom(dates.from);
    setDateTo(dates.to);
  };
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [data, setData] = useState<PaymentSummaryData | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const { branches } = useAppSelector(state => state.branch);
  const authState = useAppSelector((state) => state.authData);
  const userData = authState?.userData;

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].branch_id);
    }
  }, [branches]);

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

  const getAggregatedFarmers = () => {
    if (!data?.data) return [];
    
    const farmerMap = new Map();
    
    data.data.forEach(dateData => {
      dateData.farmers.forEach(farmer => {
        console.log('🔍 Processing farmer:', farmer);
        console.log('🔍 farmer.net_payable:', farmer.net_payable);
        console.log('🔍 farmer.from_bills:', farmer.from_bills);
        
        const farmerId = farmer.farmer_id;
        
        if (!farmerMap.has(farmerId)) {
          farmerMap.set(farmerId, {
            farmer_id: farmerId,
            farmer_username: farmer.farmer_username,
            farmer_name: farmer.farmer_name,
            milk_total: 0,
            previous_balance: 0,
            advance: 0,
            cattle_feed: 0,
            other1: 0,
            other2: 0,
            received: 0,
            total_deduction: 0,
            net_payable: 0,
            remaining_balance: 0
          });
        }
        
        const aggregated = farmerMap.get(farmerId);
        aggregated.milk_total += farmer.milk_total || 0;
        aggregated.advance += farmer.deductions.advance || 0;
        aggregated.cattle_feed += farmer.deductions.cattle_feed || 0;
        aggregated.other1 += farmer.deductions.other1 || 0;
        aggregated.other2 += farmer.deductions.other2 || 0;
        aggregated.received += farmer.from_bills?.received_total || 0;
        
        const totalDeduction = (farmer.from_bills?.advance_total || 0) + 
                              (farmer.from_bills?.cattlefeed_total || 0) + 
                              (farmer.from_bills?.other1_total || 0) + 
                              (farmer.from_bills?.other2_total || 0);
        aggregated.total_deduction += totalDeduction;
        
        // Calculate net_payable: milk_total - total_deduction + received
        aggregated.net_payable = aggregated.milk_total - aggregated.total_deduction;
        
        console.log('🔍 Calculated net_payable:', {
          milk_total: aggregated.milk_total,
          total_deduction: aggregated.total_deduction,
          received: aggregated.received,
          net_payable: aggregated.net_payable
        });
        
        const totalRemaining = (farmer.from_bills?.advance_remaining || 0) + 
                              (farmer.from_bills?.cattlefeed_remaining || 0) + 
                              (farmer.from_bills?.other1_remaining || 0) + 
                              (farmer.from_bills?.other2_remaining || 0);
        aggregated.remaining_balance += totalRemaining;
        
        if (farmer.previous_bill) {
          const prevRemaining = (farmer.previous_bill.advance_remaining || 0) + 
                               (farmer.previous_bill.cattlefeed_remaining || 0) + 
                               (farmer.previous_bill.other1_remaining || 0) + 
                               (farmer.previous_bill.other2_remaining || 0);
          aggregated.previous_balance = prevRemaining;
        }
      });
    });
    
    const sorted = Array.from(farmerMap.values()).sort((a, b) => {
      const numA = parseInt(a.farmer_username) || 0;
      const numB = parseInt(b.farmer_username) || 0;
      return numA - numB;
    });
    
    console.log('🔍 Final aggregated farmers:', sorted);
    return sorted;
  };

  const calculateTotals = () => {
    const farmers = getAggregatedFarmers();
    
    return farmers.reduce((acc, farmer) => ({
      totalMilk: acc.totalMilk + farmer.milk_total,
      totalAdvance: acc.totalAdvance + farmer.advance,
      totalFeed: acc.totalFeed + farmer.cattle_feed,
      totalOther1: acc.totalOther1 + farmer.other1,
      totalOther2: acc.totalOther2 + farmer.other2,
      totalReceived: acc.totalReceived + farmer.received,
      totalDeduction: acc.totalDeduction + farmer.total_deduction,
      totalNet: acc.totalNet + Math.max(0, farmer.net_payable),
      totalRemaining: acc.totalRemaining + farmer.remaining_balance
    }), {
      totalMilk: 0,
      totalAdvance: 0,
      totalFeed: 0,
      totalOther1: 0,
      totalOther2: 0,
      totalReceived: 0,
      totalDeduction: 0,
      totalNet: 0,
      totalRemaining: 0
    });
  };

  const exportToExcel = async () => {
    if (!data || !selectedBranch) return;

    try {
      const bankResponse = await bankSummaryApi.getBankSummary({
        dairy_id: selectedBranch.toString(),
        start_date: dateFrom,
        end_date: dateTo,
      });

      const farmers = getAggregatedFarmers();
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
      }).sort((a, b) => parseInt(a.farmer_id) - parseInt(b.farmer_id));

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

  const exportToPDF = () => {
    if (!data) return;

    setPdfLoading(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const farmers = getAggregatedFarmers();
      const totals = calculateTotals();
      const branch = branches.find(b => b.branch_id === selectedBranch);
      
      doc.setFontSize(16);
      doc.text('Payment Summary Report', 148, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Branch: ${branch?.name || 'N/A'}`, 148, 22, { align: 'center' });
      doc.text(`Period: ${dateFrom} to ${dateTo}`, 148, 28, { align: 'center' });
      
      const tableData = farmers.map(f => [
        f.farmer_username,
        f.farmer_name,
        f.milk_total.toFixed(2),
        f.previous_balance.toFixed(2),
        f.advance.toFixed(2),
        f.cattle_feed.toFixed(2),
        f.other1.toFixed(2),
        f.other2.toFixed(2),
        f.received.toFixed(2),
        f.total_deduction.toFixed(2),
        Math.max(0, f.net_payable).toFixed(2),
        f.remaining_balance.toFixed(2)
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['ID', 'Name', 'Milk', 'Prev Bal', 'Adv', 'Cattle', 'Oth1', 'Oth2', 'Recieved', 'Deduction', 'Net', 'Remaning']],
        body: tableData,
        foot: [[
          'Total',
          '',
          totals.totalMilk.toFixed(2),
          '',
          totals.totalAdvance.toFixed(2),
          totals.totalFeed.toFixed(2),
          totals.totalOther1.toFixed(2),
          totals.totalOther2.toFixed(2),
          totals.totalReceived.toFixed(2),
          totals.totalDeduction.toFixed(2),
          Math.max(0, totals.totalNet).toFixed(2),
          totals.totalRemaining.toFixed(2)
        ]],
        theme: 'grid',
        styles: { fontSize: 7 },
        headStyles: { fillColor: [66, 139, 202] },
        footStyles: { fillColor: [200, 200, 200], fontStyle: 'bold' }
      });

      doc.save(`PaymentSummary_${dateFrom}_${dateTo}.pdf`);
      toast.success('PDF exported successfully');
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
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
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
          const totals = calculateTotals();
          return (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                      <th className="px-2 py-2 text-right text-xs">Milk</th>
                      <th className="px-2 py-2 text-right text-xs">Prev Bal</th>
                      <th className="px-2 py-2 text-right text-xs">Advance</th>
                      <th className="px-2 py-2 text-right text-xs">Feed</th>
                      <th className="px-2 py-2 text-right text-xs">Other1</th>
                      <th className="px-2 py-2 text-right text-xs">Other2</th>
                      <th className="px-2 py-2 text-right text-xs">Received</th>
                      <th className="px-2 py-2 text-right text-xs">Deduction</th>
                      <th className="px-2 py-2 text-right text-xs">Net Pay</th>
                      <th className="px-2 py-2 text-right text-xs">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const farmers = getAggregatedFarmers();
                      return farmers.length > 0 ? (
                        farmers.map((farmer) => (
                          <tr key={farmer.farmer_id} className="border-b hover:bg-gray-50">
                            <td className="px-2 py-2 text-xs">{farmer.farmer_username}</td>
                            <td className="px-2 py-2 text-xs">{farmer.farmer_name}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.milk_total.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.previous_balance.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.advance.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.cattle_feed.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.other1.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.other2.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.received.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.total_deduction.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs font-semibold">₹{Math.max(0, farmer.net_payable).toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-xs">₹{farmer.remaining_balance.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                            No data available. Select filters and click Show to load data.
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const totals = calculateTotals();
                      return (
                        <tr className="bg-gray-200 font-bold">
                          <td className="px-2 py-2 text-xs" colSpan={2}>Total</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalMilk.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs"></td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalAdvance.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalFeed.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalOther1.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalOther2.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalReceived.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-xs">₹{totals.totalDeduction.toFixed(2)}</td>
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
  );
};

export default PaymentSummaryReport;
