import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format, lastDayOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/redux/store";
import { bankSummaryApi, BankSummaryData } from "@/services/bankSummaryApi";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const calculateDateRange = (date: Date) => {
  const day = date.getDate();
  let startDate: Date;
  let endDate: Date;

  if (day >= 1 && day <= 10) {
    startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    endDate = new Date(date.getFullYear(), date.getMonth(), 10);
  } else if (day >= 11 && day <= 20) {
    startDate = new Date(date.getFullYear(), date.getMonth(), 11);
    endDate = new Date(date.getFullYear(), date.getMonth(), 20);
  } else {
    startDate = new Date(date.getFullYear(), date.getMonth(), 21);
    endDate = lastDayOfMonth(date);
  }

  return { startDate, endDate };
};

const BankSummary: React.FC = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state) => state.branch);
  const authState = useAppSelector((state) => state.authData);
  const userData = authState?.userData;
  const [dairyId, setDairyId] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [data, setData] = useState<BankSummaryData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { startDate: start, endDate: end } = calculateDateRange(new Date());
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const { startDate: start, endDate: end } = calculateDateRange(date);
    setStartDate(start);
    setEndDate(end);
  };

  const fetchData = async () => {
    if (!dairyId) {
      toast.error(t('please_select_vlc'));
      return;
    }

    setLoading(true);
    try {
      const [bankResponse, paymentResponse] = await Promise.all([
        bankSummaryApi.getBankSummary({
          dairy_id: dairyId,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
        }),
        bankSummaryApi.getPaymentSummary({
          dairyid: dairyId,
          datefrom: format(startDate, "yyyy-MM-dd"),
          dateto: format(endDate, "yyyy-MM-dd"),
        })
      ]);
      
      const paymentMap = new Map<string, number>();
      
      if (paymentResponse?.data && Array.isArray(paymentResponse.data)) {
        paymentResponse.data.forEach((dateData: any) => {
          dateData.farmers?.forEach((farmer: any) => {
            const farmerId = farmer.farmer_id;
            const netPayable = farmer.from_bills?.net_payable || 0;
            paymentMap.set(farmerId, (paymentMap.get(farmerId) || 0) + netPayable);
          });
        });
      }
      
      const updatedData = (bankResponse.data || []).map((farmer: BankSummaryData) => ({
        ...farmer,
        milk_total: paymentMap.get(farmer.farmer_id) || farmer.milk_total
      }));
      
      updatedData.sort((a, b) => {
        const idA = typeof a.farmer_id === 'string' ? parseInt(a.farmer_id) : a.farmer_id;
        const idB = typeof b.farmer_id === 'string' ? parseInt(b.farmer_id) : b.farmer_id;
        return idA - idB;
      });
      
      setData(updatedData);
      toast.success(t('data_fetched_successfully'));
    } catch (error) {
      console.log('API Error:', error);
      toast.error(t('failed_to_fetch_data'));
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    console.log('Full Auth State:', authState);
    console.log('User Data:', userData);
    
    const userIdStr = userData?.id?.toString();
    const userId = userIdStr ? parseInt(userIdStr) : null;
    const currentDate = format(new Date(), "dd-MM-yyyy");
    
    // PEF format for user IDs 2 and 4
    if (userId === 2 || userId === 4 || userIdStr === '2' || userIdStr === '4') {
      const sortedData = [...data].sort((a, b) => {
        const idA = typeof a.farmer_id === 'string' ? parseInt(a.farmer_id) : a.farmer_id;
        const idB = typeof b.farmer_id === 'string' ? parseInt(b.farmer_id) : b.farmer_id;
        return idA - idB;
      });

      const exportData = sortedData.map(row => ({
        "PYMT_PROD_TYPE_CODE": "PAB_VENDOR",
        "PYMT_MODE": "NEFT",
        "DEBIT_ACC_NO": "",
        "BNF_NAME": row.fullName,
        "BENE_ACC_NO": row.accountNumber || "",
        "BENE_IFSC": row.ifscCode || "",
        "AMOUNT": parseFloat(row.milk_total || 0).toFixed(2),
        "DEBIT_NARR": "",
        "CREDIT_NARR": "",
        "MOBILE_NUM": row.mobile_number || "",
        "EMAIL_ID": row.email || "",
        "REMARK": "",
        "PYMT_DATE": currentDate
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Apply red color to specific column headers
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
      XLSX.writeFile(wb, `PEF_Export_${format(startDate, "dd-MM-yyyy")}_to_${format(endDate, "dd-MM-yyyy")}.xlsx`, { cellStyles: true });
    } else {
      // Original Bank Summary format for other users
      const exportData = data.map(row => ({
        "Farmer ID": row.farmer_id,
        "Name": row.fullName,
        "Mobile": row.mobile_number,
        "Email": row.email || "-",
        "Milk Total": parseFloat(row.milk_total || 0).toFixed(2),
        "Bank Name": row.bankName || "-",
        "Account Number": row.accountNumber || "-",
        "IFSC Code": row.ifscCode || "-"
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bank Summary");
      XLSX.writeFile(wb, `Bank_Summary_${format(startDate, "dd-MM-yyyy")}_to_${format(endDate, "dd-MM-yyyy")}.xlsx`);
    }
    
    toast.success(t('excel_file_downloaded'));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-sm border-none">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-2xl font-bold text-gray-800">🏦 Payment Bank Summary</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{t('bank_summary_description')}</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">VLC Name</Label>
                <Select value={dairyId} onValueChange={setDairyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select VLC">
                      {dairyId && (() => {
                        const selected = branches.find(b => b.branch_id.toString() === dairyId);
                        if (selected) {
                          const text = `${selected.username} - ${selected.name} - ${selected.branchName || ''}`;
                          return text.length > 30 ? text.substring(0, 30) + '...' : text;
                        }
                        return 'Select VLC';
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {branches.map((branch) => (
                      <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                        {branch.username} - {branch.name} - {branch.branchName || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "dd-MM-yyyy")} to {format(endDate, "dd-MM-yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white pointer-events-auto" align="start">
                    <Calendar 
                      mode="single" 
                      selected={startDate} 
                      onDayClick={(date) => {
                        if (date) {
                          const { startDate: start, endDate: end } = calculateDateRange(date);
                          setStartDate(start);
                          setEndDate(end);
                        }
                      }}
                      defaultMonth={startDate}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Button onClick={fetchData} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {loading ? t('loading') : t('fetch_data')}
                </Button>
              </div>
            </div>

            {data.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-blue-600 font-medium">Total Farmers</p>
                      <p className="text-2xl font-bold text-blue-900">{data.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-green-600 font-medium">Total Banks</p>
                      <p className="text-2xl font-bold text-green-900">{new Set(data.map(d => d.bankName).filter(Boolean)).size}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-purple-600 font-medium">Total Amount</p>
                      <p className="text-2xl font-bold text-purple-900">₹{data.reduce((sum, row) => sum + parseFloat(row.milk_total || 0), 0).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-900">
                    Period: {format(startDate, "dd MMM yyyy")} to {format(endDate, "dd MMM yyyy")}
                  </p>
                  <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    {t('export_excel')}
                  </Button>
                </div>
              </>
            )}

            <div className="overflow-x-auto rounded-lg border shadow-sm">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Farmer ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Mobile</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Bank Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Account Number</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">IFSC Code</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        {t('no_data_available')}. {t('select_filters_fetch_data')}.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 border-b">
                        <td className="py-3 px-4">{row.farmer_id}</td>
                        <td className="py-3 px-4">{row.fullName}</td>
                        <td className="py-3 px-4">{row.mobile_number}</td>
                        <td className="py-3 px-4">{row.email || "-"}</td>
                        <td className="py-3 px-4 text-right">₹{parseFloat(row.milk_total || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">{row.bankName || "-"}</td>
                        <td className="py-3 px-4">{row.accountNumber || "-"}</td>
                        <td className="py-3 px-4">{row.ifscCode || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BankSummary;
