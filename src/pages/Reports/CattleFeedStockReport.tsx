import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useAppSelector } from "@/redux/store";
import { getCattleFeedStockReport } from "@/services/cattleFeedStockApi";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";

interface CattleFeedStock {
  id: number;
  dairy_id: string;
  stock_name: string;
  amount: number;
  stock: number;
  date: string;
}

interface FarmerPayment {
  id: number;
  date: string;
  dairy_id: string;
  farmer_id: string;
  farmer_name: string;
  payment_type: string;
  amount_taken: number;
  received: number;
  descriptions: string;
  status: number;
}

const CattleFeedStockReport = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [farmerId, setFarmerId] = useState("");
  
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
  const [startDate, setStartDate] = useState<string>(todayDates.from);
  const [endDate, setEndDate] = useState<string>(todayDates.to);
  
  const handleStartDateChange = (newDate: string) => {
    const dates = calculateDateRange(newDate);
    setStartDate(dates.from);
    setEndDate(dates.to);
  };
  
  const [loading, setLoading] = useState(false);
  const [cattleFeedStock, setCattleFeedStock] = useState<CattleFeedStock[]>([]);
  const [farmerPayments, setFarmerPayments] = useState<FarmerPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<FarmerPayment[]>([]);

  const exportToPDF = () => {
    if (cattleFeedStock.length === 0 && filteredPayments.length === 0) {
      toast.error(t('no_data_available'));
      return;
    }

    const selectedBranch = branches?.find(b => b.branch_id.toString() === dairyId);
    const dairyName = selectedBranch ? `${selectedBranch.username} - ${selectedBranch.name}` : '';

    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(t('cattle_feed_stock_report'), 14, 15);
    doc.setFontSize(10);
    doc.text(dairyName, 14, 22);
    doc.text(`${t('period')}: ${format(new Date(startDate), 'dd-MM-yyyy')} ${t('to')} ${format(new Date(endDate), 'dd-MM-yyyy')}`, 14, 28);

    let yPos = 35;

    if (cattleFeedStock.length > 0) {
      doc.setFontSize(12);
      doc.text(t('cattle_feed_stock'), 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [[t('date'), t('stock_name'), t('stock'), t('amount')]],
        body: cattleFeedStock.map(item => [
          format(new Date(item.date), 'dd-MM-yyyy'),
          item.stock_name,
          item.stock.toString(),
          `₹${Number(item.amount).toFixed(2)}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (filteredPayments.length > 0) {
      doc.setFontSize(12);
      doc.text(t('farmer_payments'), 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [[t('date'), t('farmer_id'), t('farmer_name'), t('payment_type'), t('amount_taken'), t('received')]],
        body: filteredPayments.map(payment => [
          format(new Date(payment.date), 'dd-MM-yyyy'),
          payment.farmer_id,
          payment.farmer_name,
          payment.payment_type,
          `₹${Number(payment.amount_taken).toFixed(2)}`,
          `₹${Number(payment.received).toFixed(2)}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
      });
    }

    doc.save(`Cattle_Feed_Stock_Report_${startDate}_to_${endDate}.pdf`);
    toast.success(t('pdf_exported_successfully'));
  };

  const handleShowReport = async () => {
    if (!dairyId) {
      toast.error(t('please_select_dairy'));
      return;
    }

    setLoading(true);
    try {
      const data = await getCattleFeedStockReport(dairyId, startDate, endDate);
      
      if (data.success) {
        setCattleFeedStock(data.data.cattlefeed_stock);
        const payments = data.data.farmer_payments;
        setFarmerPayments(payments);
        setFilteredPayments(farmerId ? payments.filter((p: FarmerPayment) => p.farmer_id === farmerId) : payments);
        toast.success(t('data_fetched_successfully'));
      } else {
        toast.error(data.message || t('failed_to_fetch_data'));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('failed_to_fetch_data'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="text-left p-4">
        <h1 className="font-bold text-2xl">{t('cattle_feed_stock_report')}</h1>
        <p className="text-sm text-gray-600">
          {t('bank_summary_description')}
        </p>
      </div>
      
      <Card className="border-gray-300 mb-7">
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="mb-1">{t('dairy')}</Label>
              <Select value={dairyId} onValueChange={setDairyId}>
                <SelectTrigger className="w-full border-gray-200">
                  <SelectValue placeholder={t('select_dairy')} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {branches?.map((branch) => (
                    <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                      {branch.username} - {branch.name} - {branch.branchName || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1">{t('farmer_id')}</Label>
              <Input 
                type="text" 
                value={farmerId} 
                onChange={(e) => setFarmerId(e.target.value)} 
                placeholder={t('enter_farmer_id')}
                className="border-gray-200"
              />
            </div>
            <div>
              <Label className="mb-1">{t('start_date')}</Label>
              <Input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} className="border-gray-200"/>
            </div>
            <div>
              <Label className="mb-1">{t('end_date')}</Label>
              <Input type="date" value={endDate} disabled className="bg-gray-100 cursor-not-allowed border-gray-200" />
            </div>
            <div className="flex items-end">
              <div className="flex gap-2">
                <Button onClick={handleShowReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? t('loading') : t('show_report')}
                </Button>
                <Button 
                  onClick={exportToPDF}
                  disabled={cattleFeedStock.length === 0 && filteredPayments.length === 0}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('export_pdf')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cattle Feed Stock Table */}
      {cattleFeedStock.length > 0 && (
        <Card className="border-gray-300 mb-7">
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg mb-4">{t('cattle_feed_stock')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">{t('date')}</th>
                    <th className="border border-gray-300 p-2 text-left">{t('stock_name')}</th>
                    <th className="border border-gray-300 p-2 text-right">{t('stock')}</th>
                    <th className="border border-gray-300 p-2 text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cattleFeedStock.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2">{format(new Date(item.date), 'dd-MM-yyyy')}</td>
                      <td className="border border-gray-300 p-2">{item.stock_name}</td>
                      <td className="border border-gray-300 p-2 text-right">{item.stock}</td>
                      <td className="border border-gray-300 p-2 text-right">₹{Number(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Farmer Payments Table */}
      {filteredPayments.length > 0 && (
        <Card className="border-gray-300">
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg mb-4">{t('farmer_payments')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">{t('date')}</th>
                    <th className="border border-gray-300 p-2 text-left">{t('farmer_id')}</th>
                    <th className="border border-gray-300 p-2 text-left">{t('farmer_name')}</th>
                    <th className="border border-gray-300 p-2 text-left">{t('payment_type')}</th>
                    <th className="border border-gray-300 p-2 text-right">{t('amount_taken')}</th>
                    <th className="border border-gray-300 p-2 text-right">{t('received')}</th>
                    <th className="border border-gray-300 p-2 text-left">{t('description')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2">{format(new Date(payment.date), 'dd-MM-yyyy')}</td>
                      <td className="border border-gray-300 p-2">{payment.farmer_id}</td>
                      <td className="border border-gray-300 p-2">{payment.farmer_name}</td>
                      <td className="border border-gray-300 p-2">{payment.payment_type}</td>
                      <td className="border border-gray-300 p-2 text-right">₹{Number(payment.amount_taken).toFixed(2)}</td>
                      <td className="border border-gray-300 p-2 text-right">₹{Number(payment.received).toFixed(2)}</td>
                      <td className="border border-gray-300 p-2">{payment.descriptions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CattleFeedStockReport;
