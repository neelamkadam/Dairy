import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppDatePicker } from "@/components/ui/date-picker";
import { VLCDropdown } from "@/components/ui/vlc-dropdown";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format, lastDayOfMonth, parseISO, isValid } from "date-fns";
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

// The amount the bank transfers, rounded to the nearest rupee ("|| 0" keeps -0 out)
const roundedAmount = (milkTotal: unknown) => {
  const amount = parseFloat(String(milkTotal ?? "0")) || 0;
  return Math.round(Math.round(amount * 100) / 100) || 0; // paise first, against float noise
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
        "AMOUNT": String(roundedAmount(row.milk_total)),
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
        "Milk Total": String(roundedAmount(row.milk_total)),
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
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-sm border-none">
          {/* Header */}
          <div className="flex flex-col items-start text-left gap-1 animate-in fade-in slide-in-from-top-4 duration-700 mb-4 px-4 pt-4 sm:px-6 sm:pt-6">
            <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              🏦 Payment Bank Summary
            </h1>
            <p className="text-sm font-medium text-slate-500">
              {t('bank_summary_description')}
            </p>
          </div>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end mb-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">VLC Name</Label>
                <VLCDropdown
                  branches={branches || []}
                  value={dairyId}
                  onChange={(val) => setDairyId(String(val))}
                  valueKey="branch_id"
                  placeholder="Select VLC"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Date Range</Label>
                <AppDatePicker
                  date={startDate}
                  onChange={(dateStr) => {
                    const parsed = parseISO(dateStr);
                    if (isValid(parsed)) {
                      const { startDate: start, endDate: end } = calculateDateRange(parsed);
                      setStartDate(start);
                      setEndDate(end);
                    }
                  }}
                />
                <div className="text-xs text-gray-500 text-left truncate">
                  {format(startDate, "dd-MM-yyyy")} to {format(endDate, "dd-MM-yyyy")}
                </div>
              </div>

              <div className="lg:col-span-2 flex justify-end pb-[20px]">
                <Button onClick={fetchData} disabled={loading} className="w-[120px] bg-blue-600 hover:bg-blue-700 text-white h-10">
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
                      <p className="text-2xl font-bold text-purple-900">₹{data.reduce((sum, row) => sum + roundedAmount(row.milk_total), 0)}</p>
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
              <table className="w-full border-collapse bg-white whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Farmer ID</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Name</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Mobile</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Email</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Amount</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Bank Name</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Account Number</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">IFSC Code</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-gray-500">
                        {t('no_data_available')}. {t('select_filters_fetch_data')}.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 border-b">
                        <td className="py-2 px-3">{row.farmer_id}</td>
                        <td className="py-2 px-3">{row.fullName}</td>
                        <td className="py-2 px-3">{row.mobile_number}</td>
                        <td className="py-2 px-3">{row.email || "-"}</td>
                        <td className="py-2 px-3 text-right">₹{roundedAmount(row.milk_total)}</td>
                        <td className="py-2 px-3">{row.bankName || "-"}</td>
                        <td className="py-2 px-3">{row.accountNumber || "-"}</td>
                        <td className="py-2 px-3">{row.ifscCode || "-"}</td>
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
