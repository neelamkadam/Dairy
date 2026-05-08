import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AppDatePicker } from "@/components/ui/date-picker";
import { format, parseISO, isValid } from "date-fns";
import { generateShiftReportExcel } from "@/templates/ShiftReportExcelTemplate";
import PdfLoader from "@/components/PdfLoader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { api } from "@/services/config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon } from "lucide-react";
import { userApi } from "@/services/reportsApi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

const ShiftReports:React.FC = () => {
  const { i18n } = useTranslation();
  const { branches = [] } = useAppSelector((state: any) => state.branch);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [language, setLanguage] = useState<string>(i18n.language || 'en');

  const getDefaultShift = () => {
    const hour = new Date().getHours();
    return hour >= 16 ? "evening" : "morning";
  };

  const [formData, setFormData] = useState({
    selectedDairy: "",
    milkType: "mixed",
    shift: getDefaultShift(),
    date: new Date() as Date | undefined,
  });

  const [farmersMap, setFarmersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchFarmers = async () => {
      if (!formData.selectedDairy) {
        setFarmersMap({});
        return;
      }
      try {
        const data = await userApi.getFarmers(formData.selectedDairy);
        if (data.success && Array.isArray(data.data)) {
          const map: Record<string, string> = {};
          data.data.forEach((farmer: any) => {
            if (farmer.username) {
              map[farmer.username] = farmer.fullName || "-";
            }
          });
          setFarmersMap(map);
        }
      } catch (error) {
        console.error("Failed to fetch farmers:", error);
      }
    };
    fetchFarmers();
  }, [formData.selectedDairy]);

  const fetchCollectionReport = async () => {
    if (!formData.selectedDairy || !formData.shift || !formData.date) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(
        `/report/collection-report`,
        {
          params: {
            shift: formData.shift.toUpperCase(),
            dairy_id: formData.selectedDairy,
            date: format(formData.date, "yyyy-MM-dd")
          }
        }
      );
      console.log(response);
      if (response.data.success && response.data.data.records.length > 0) {
        setReportData(response.data.data);
      } else {
        setReportData(null);
        toast.info("No data available for the selected criteria");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const pdfExportRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!farmerData || farmerData.length === 0) {
      toast.error("No data to export");
      return;
    }
    setPdfLoading(true);
    try {
      const exportElement = pdfExportRef.current;
      if (!exportElement) {
        toast.error("Report content is not ready for PDF export");
        return;
      }

      // Wait for fonts to load
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(exportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const selectedBranch = branches?.find(b => b.branch_id.toString() === formData.selectedDairy);
      const vlcName = selectedBranch ? selectedBranch.name : "";
      const dateStr = formData.date ? format(formData.date, "dd-MM-yyyy") : "";
      
      pdf.save(`Shift_Report_${vlcName}_${dateStr}_${formData.shift}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!farmerData || farmerData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const selectedBranch = branches?.find(b => b.branch_id.toString() === formData.selectedDairy);
    const vlcName = selectedBranch ? selectedBranch.name : "";
    const dateStr = formData.date ? format(formData.date, "dd-MM-yyyy") : "";
    generateShiftReportExcel(farmerData, vlcName, dateStr, formData.shift, formData.milkType, totals);
    toast.success("Excel exported successfully");
  };

  // Filter data based on milk type
  const allRecords = reportData?.records || [];
  const farmerData = formData.milkType && formData.milkType !== "mixed" 
    ? allRecords.filter((record: any) => record.type.toLowerCase() === formData.milkType.toLowerCase())
    : allRecords;

  // Use API summary for mixed, calculate for filtered data
  const totals = formData.milkType === "mixed" && reportData?.summary ? {
    quantity: reportData.summary.total_quantity,
    avgFat: reportData.summary.avg_fat,
    avgSnf: reportData.summary.avg_snf,
    avgWater: reportData.summary.avg_water,
    totalAmount: parseFloat(reportData.summary.total_amount).toFixed(2),
  } : {
    quantity: farmerData.reduce((sum: number, record: any) => sum + parseFloat(record.quantity || 0), 0).toFixed(2),
    avgFat: farmerData.length > 0 ? (farmerData.reduce((sum: number, record: any) => sum + parseFloat(record.fat || 0), 0) / farmerData.length).toFixed(2) : "0.00",
    avgSnf: farmerData.length > 0 ? (farmerData.reduce((sum: number, record: any) => sum + parseFloat(record.snf || 0), 0) / farmerData.length).toFixed(2) : "0.00",
    avgWater: farmerData.length > 0 ? (farmerData.reduce((sum: number, record: any) => sum + parseFloat(record.water || 0), 0) / farmerData.length).toFixed(2) : "0.00",
    totalAmount: farmerData.reduce((sum: number, record: any) => sum + parseFloat(record.amount || 0), 0).toFixed(2),
  };

  const totalPages = Math.ceil(farmerData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = farmerData.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50">
      <PdfLoader isLoading={pdfLoading} />
      {/* Header */}
      <header className="bg-slate-700 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded">
              <FileText className="h-6 w-6 text-slate-700" />
            </div>
            <h1 className="text-xl md:text-2xl font-semibold">
              Daily Shift Report
            </h1>
          </div>
        </div>
      </header>
      <div className="p-4">
        <div className="w-[85%] text-left grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <div className="space-y-2 w-full">
            <label className="text-sm font-medium text-gray-700">
              VLC Name
            </label>
            <Select value={formData.selectedDairy} onValueChange={(value) => setFormData({...formData, selectedDairy: value})}>
              <SelectTrigger className=" w-full bg-white border-gray-200">
                <SelectValue placeholder="Select VLC">
                  {formData.selectedDairy && (() => {
                    const selected = branches.find(b => b.branch_id.toString() === formData.selectedDairy);
                    if (selected) {
                      const text = `${selected.username} - ${selected.name} - ${selected.branchName || ''}`;
                      return text.length > 30 ? text.substring(0, 30) + '...' : text;
                    }
                    return 'Select VLC';
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white">
                {(branches || []).map((branch) => (
                  <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                    {branch.username} - {branch.name} - {branch.branchName || ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Milk Type
            </label>
            <Select value={formData.milkType} onValueChange={(value) => setFormData({...formData, milkType: value})}>
              <SelectTrigger className=" w-full bg-white border-gray-200">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="mixed">All</SelectItem>
                <SelectItem value="cow">Cow Milk</SelectItem>
                <SelectItem value="buffalo">Buffalo Milk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mt-5">
          <div className="space-y-2 text-left ">
            <Label>Date From</Label>
            <AppDatePicker
              date={formData.date}
              onChange={(dateStr) => {
                const parsed = parseISO(dateStr);
                if (isValid(parsed)) setFormData({ ...formData, date: parsed });
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Shift Type
            </label>
            <Select value={formData.shift} onValueChange={(value) => setFormData({...formData, shift: value})}>
              <SelectTrigger className="w-full bg-white border-gray-200">
                <SelectValue placeholder="Select Shift" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 mt-6 mr-5">
            <Button 
              onClick={fetchCollectionReport}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Loading..." : "Show"}
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={!farmerData || farmerData.length === 0}
              variant="outline"
              className="flex items-center gap-2 text-white bg-green-500"
            >
              <Download className="h-4 w-4" />
              Excel Export
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={!farmerData || farmerData.length === 0}
              variant="outline"
              className="flex items-center gap-2 bg-red-500 text-white"
            >
              <Download className="h-4 w-4" />
              PDF Export
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-white">
        <Table className="border-none text-center">
          <TableHeader>
              <TableRow className="bg-gray-100 ">
              <TableHead className="font-semibold text-center border border-gray-100">
                Farmer ID
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Farmer Name
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Milk Type
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Quantity
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Fat
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                SNF
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Water
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Rate
              </TableHead>
              <TableHead className="font-semibold text-center border border-gray-100">
                Total Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? paginatedData.map((record: any, index: number) => (
              <TableRow
                key={`${record.code}-${record.type}-${index}`}
                className="hover:bg-gray-50 bg-white border-gray-100 "
              >
                <TableCell className="font-medium border border-gray-100">{record.code}</TableCell>
                <TableCell className="font-medium border border-gray-100 text-left">{farmersMap[record.code] || "-"}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.type}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.quantity}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.fat}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.snf}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.water}</TableCell>
                <TableCell className="font-medium border border-gray-100">{record.rate}</TableCell>
                <TableCell className="font-medium border border-gray-100">₹{record.amount}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No data available. Please select criteria and click Show.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Items per page</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => setItemsPerPage(parseInt(value))}
            >
              <SelectTrigger className="w-18 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ">
            <Button
              variant="default"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {totalPages > 0 && Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "outline" : "default"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    currentPage === page &&
                      "bg-blue-600 hover:bg-blue-700 border-none"
                  )}
                >
                  {page}
                </Button>
              );
            })}

            <Button
              variant="default"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4 " />
            </Button>
          </div>

          <span className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, farmerData.length)} of {farmerData.length} items
          </span>
        </div>

        {/* Summary Statistics */}
        <div className="rounded-lg bg-white">
          <Table>
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableHead className="text-center font-semibold border border-gray-100">
                  Total Quantity (L)
                </TableHead>
                <TableHead className="text-center font-semibold border border-gray-100">
                  Average Fat (%)
                </TableHead>
                <TableHead className="text-center font-semibold border border-gray-100">
                  Average SNF (%)
                </TableHead>
                <TableHead className="text-center font-semibold border border-gray-100">
                  Average Water (%)
                </TableHead>
                <TableHead className="text-center font-semibold border border-gray-100">
                  Total Amount (₹)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-gray-200">
                <TableCell>{totals.quantity}</TableCell>
                <TableCell>{totals.avgFat}</TableCell>
                <TableCell>{totals.avgSnf}</TableCell>
                <TableCell>{totals.avgWater}</TableCell>
                <TableCell>{totals.totalAmount}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>


      </div>

      {/* Hidden printable area for PDF export */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={pdfExportRef} className="p-8 bg-white" style={{ width: "800px", fontFamily: "'Noto Sans Devanagari', 'Roboto', sans-serif" }}>
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1"></div>
            <div className="text-center flex-1">
              <h2 className="text-xl font-bold mb-1">
                {(() => {
                  const selected = branches.find(b => b.branch_id.toString() === formData.selectedDairy);
                  return selected ? selected.name : "";
                })()}
              </h2>
              <p className="text-sm text-gray-600">
                Dairy: {(() => {
                  const selected = branches.find(b => b.branch_id.toString() === formData.selectedDairy);
                  return selected ? selected.username : "";
                })()}
              </p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm text-gray-600">
                Date: {format(new Date(), "dd-MM-yyyy")}
              </p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-4">Daily Shift Report</h1>
          <p className="text-center text-sm text-gray-600 mb-8">
            Date: {formData.date ? format(formData.date, "dd-MM-yyyy") : ""} | Shift: {formData.shift} | Milk Type: {formData.milkType || "All"}
          </p>

          <table className="w-full border-collapse mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-sm font-bold">Farmer ID</th>
                <th className="border p-2 text-sm font-bold">Quantity</th>
                <th className="border p-2 text-sm font-bold">Fat</th>
                <th className="border p-2 text-sm font-bold">SNF</th>
                <th className="border p-2 text-sm font-bold">Milk Type</th>
                <th className="border p-2 text-sm font-bold">Rate</th>
                <th className="border p-2 text-sm font-bold">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {farmerData.map((record: any, index: number) => (
                <tr key={index}>
                  <td className="border p-2 text-center text-sm">{record.code}</td>
                  <td className="border p-2 text-center text-sm">{record.quantity}</td>
                  <td className="border p-2 text-center text-sm">{record.fat}</td>
                  <td className="border p-2 text-center text-sm">{record.snf}</td>
                  <td className="border p-2 text-center text-sm">{record.type}</td>
                  <td className="border p-2 text-center text-sm">{record.rate}</td>
                  <td className="border p-2 text-center text-sm">₹{record.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4 text-center">Summary Statistics</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-sm font-bold">Total Quantity (L)</th>
                  <th className="border p-2 text-sm font-bold">Average Fat (%)</th>
                  <th className="border p-2 text-sm font-bold">Average SNF (%)</th>
                  <th className="border p-2 text-sm font-bold">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50">
                  <td className="border p-2 text-center text-sm font-bold">{totals.quantity}</td>
                  <td className="border p-2 text-center text-sm font-bold">{totals.avgFat}</td>
                  <td className="border p-2 text-center text-sm font-bold">{totals.avgSnf}</td>
                  <td className="border p-2 text-center text-sm font-bold">{totals.totalAmount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hidden printable area for PDF export */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={pdfExportRef} className="p-4 bg-[#ffffff]" style={{ width: "1200px", fontFamily: "'Noto Sans Devanagari', 'Roboto', sans-serif", color: "#000000" }}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1"></div>
            <div className="text-center flex-1">
              <h2 className="text-xl font-bold mb-0.5 leading-tight">
                {(() => {
                  const selected = branches.find(b => b.branch_id.toString() === formData.selectedDairy);
                  if (!selected) return "";
                  // Split by comma to match the screenshot layout if possible
                  return selected.name.split(',').map((part, i) => (
                    <React.Fragment key={i}>
                      {part.trim()}{i < selected.name.split(',').length - 1 ? ',' : ''}
                      <br />
                    </React.Fragment>
                  ));
                })()}
              </h2>
              <p className="text-xs font-semibold text-[#4b5563]">
                Dairy: {(() => {
                  const selected = branches.find(b => b.branch_id.toString() === formData.selectedDairy);
                  return selected ? selected.username : "";
                })()}
              </p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-xs font-medium">
                Date: {format(new Date(), "dd-MM-yyyy")}
              </p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-1">Daily Shift Report</h1>
          <p className="text-center text-xs font-medium text-[#4b5563] mb-4">
            Date: {formData.date ? format(formData.date, "dd-MM-yyyy") : ""} | Shift: {formData.shift} | Milk Type: {formData.milkType || "All"}
          </p>

          <table className="w-full border-collapse border border-[#9ca3af]">
            <thead>
              <tr className="bg-[#f3f4f6]">
                <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">Farmer ID</th>
                <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold text-left">Farmer Name</th>
                <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">Quantity</th>
                <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">Fat</th>
                <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">SNF</th>
                <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">Milk Type</th>
                <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">Rate</th>
                <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {farmerData.map((record: any, index: number) => (
                <tr key={index} className={index % 2 === 0 ? "bg-[#ffffff]" : "bg-[#f9fafb]"}>
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm">{record.code}</td>
                  <td className="border border-[#9ca3af] py-1 px-3 text-left text-sm" style={{ fontFamily: "'Noto Sans Devanagari', 'Roboto', sans-serif" }}>{farmersMap[record.code] || "-"}</td>
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm">{record.quantity}</td>
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm">{record.fat}</td>
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm">{record.snf}</td>
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm capitalize">{record.type}</td>
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm">{record.rate}</td>
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm">₹{record.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4">
            <h3 className="text-lg font-bold mb-2 text-center">Summary Statistics</h3>
            <table className="w-full border-collapse border border-[#9ca3af]">
              <thead>
                <tr className="bg-[#e5e7eb]">
                  <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">Total Quantity (L)</th>
                  <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">Average Fat (%)</th>
                  <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">Average SNF (%)</th>
                  <th className="border border-[#9ca3af] py-1 px-3 text-sm font-bold">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-[#ffffff]">
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm font-bold">{totals.quantity}</td>
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm font-bold">{totals.avgFat}</td>
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm font-bold">{totals.avgSnf}</td>
                  <td className="border border-[#9ca3af] py-1 px-3 text-center text-sm font-bold">{totals.totalAmount}</td>
                </tr>
              </tbody>
            </table>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftReports;
