import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VLCDropdown } from '@/components/ui/vlc-dropdown';
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
  const { t } = useTranslation();
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
      toast.error(t('please_select_vlc_and_dates', 'Please select VLC Center and date range'));
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
    <div className="p-2 sm:p-4 space-y-4 text-left">
      {/* Header */}
      <div className="flex flex-col items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          {t('passbook', 'Farmer Passbook')}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
        <div className="space-y-2 w-full">
          <Label>{t('vlc_center', 'VLC Center')}</Label>
          <VLCDropdown
            branches={branches || []}
            value={selectedVLC}
            onChange={setSelectedVLC}
            valueKey="branch_id"
            placeholder={t('select_vlc_center', 'Select VLC Center')}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('start_date', 'From Date')}</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>{t('end_date', 'To Date')}</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>{t('farmer_code', 'Farmer Code (Optional)')}</Label>
          <Input placeholder={t('farmer_code', 'Enter code')} value={farmerCode} onChange={(e) => setFarmerCode(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleShow} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px] h-10">
            {loading ? t('loading', 'Loading...') : t('show', 'Show')}
          </Button>
          <Button onClick={exportToPDF} disabled={farmersData.length === 0} variant="outline" className="h-10">
            {t('export_pdf', 'Export PDF')}
          </Button>
        </div>
      </div>

      {farmersData.length === 0 && fromDate && toDate && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">{t('no_passbook_data', 'No passbook data found for the selected period.')}</p>
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
              <p className="text-sm text-gray-600">
                {t('page_info', 'Page {{current}} of {{total}} (Showing {{count}} farmers)', { current: currentPage + 1, total: totalPages, count: currentFarmers.length })}
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))} 
                  disabled={currentPage === 0}
                  variant="outline"
                  size="sm"
                >
                  {t('previous', 'Previous')}
                </Button>
                <Button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} 
                  disabled={currentPage === totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  {t('next', 'Next')}
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
                    <CardTitle>{t('farmer_name', 'Farmer')}: {farmer.farmer_id}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse whitespace-nowrap text-sm [&_th]:h-auto [&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3 [&_th]:align-middle">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2 text-left">{t('period', 'Period')}</th>
                            <th className="border border-gray-300 p-2 text-right">{t('milk_total', 'Milk Total')}</th>
                            <th className="border border-gray-300 p-2 text-right">{t('previous_balance', 'Previous Balance')}</th>
                            <th className="border border-gray-300 p-2 text-right">{t('advance', 'Advance')}</th>
                            <th className="border border-gray-300 p-2 text-right">{t('cattle_feed', 'Cattle Feed')}</th>
                            <th className="border border-gray-300 p-2 text-right">{t('other1', 'Other1')}</th>
                            <th className="border border-gray-300 p-2 text-right">{t('other2', 'Other2')}</th>
                            <th className="border border-gray-300 p-2 text-right">{t('received', 'Received')}</th>
                            <th className="border border-gray-300 p-2 text-right">{t('total_deduction', 'Total Deduction')}</th>
                            <th className="border border-gray-300 p-2 text-right">{t('net_payable', 'Net Payable')}</th>
                            <th className="border border-gray-300 p-2 text-right">{t('total_remaining', 'Total Remaining')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-2 text-left">{row.period}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.milk_total.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.previous_balance.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.advance.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.cattle_feed.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.other1.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.other2.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.received.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.total_deduction.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.net_payable.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.total_remaining.toFixed(2)}</td>
                          </tr>
                          <tr className="bg-blue-50 font-bold">
                            <td colSpan={9} className="border border-gray-300 p-2"></td>
                            <td className="border border-gray-300 p-2 text-right">{t('remaining_balance', 'Remaining Balance')}</td>
                            <td className="border border-gray-300 p-2 text-right">{row.total_remaining.toFixed(2)}</td>
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
