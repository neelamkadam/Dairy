import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAppSelector } from "@/redux/store";
import { reportsApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { generateRateChartReportExcel } from "@/templates/RateChartReportExcelTemplate";
import { Download } from "lucide-react";

const RateChartReport = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [vlcId, setVlcId] = useState("");
  const [milkType, setMilkType] = useState("Cow");
  const [rateChartName, setRateChartName] = useState("Rate Chart 1");
  const [shift, setShift] = useState("morning");
  const [loading, setLoading] = useState(false);
  const [rateMatrix, setRateMatrix] = useState<any[][]>([]);

  const handleShow = async () => {
    if (!vlcId) {
      toast.error("Please select a VLC");
      return;
    }

    setLoading(true);
    try {
      console.log('Requesting rate matrix with params:', {
        organisation_id: vlcId,
        type: milkType.toLowerCase(),
        name: rateChartName,
        shift: shift
      });
      
      const data = await reportsApi.previewRateMatrix({
        organisation_id: vlcId,
        type: milkType.toLowerCase(),
        name: rateChartName,
        shift: shift
      });
      
      console.log('Rate matrix response:', data);
      
      if (data.success && data.matrix) {
        setRateMatrix(data.matrix);
        toast.success('Rate chart loaded successfully');
      } else {
        toast.error(data.message || 'No rate chart data found');
        setRateMatrix([]);
      }
    } catch (error: any) {
      console.error('Rate chart error:', error);
      console.error('Error response:', error?.response);
      toast.error(error?.response?.data?.message || error?.message || "Failed to fetch rate chart");
      setRateMatrix([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!rateMatrix || rateMatrix.length === 0) {
      toast.error("No data to export");
      return;
    }
    const selectedBranch = branches?.find(b => b.branch_id.toString() === vlcId);
    const vlcName = selectedBranch ? `${selectedBranch.username} - ${selectedBranch.name}` : "";
    generateRateChartReportExcel(vlcName, milkType, rateMatrix);
    toast.success("Excel exported successfully");
  };
  
  return (
    <div className="w-full h-screen bg-white">
    <h1 className="p-4 text-left font-bold bg-gray-100">VLCC Rate Chart</h1>
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-end bg-white p-4" >
          <div>
            <Label className="mb-1">VLC Name</Label>
            <Select value={vlcId} onValueChange={setVlcId}>
              <SelectTrigger className="w-48 border-gray-200">
                <SelectValue placeholder="Select VLC" />
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
            <Label className="mb-1">Milk Type</Label>
            <Select value={milkType} onValueChange={setMilkType}>
              <SelectTrigger className="w-48 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Cow">Cow</SelectItem>
                <SelectItem value="Buffalo">Buffalo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1">Rate Chart</Label>
            <Select value={rateChartName} onValueChange={setRateChartName}>
              <SelectTrigger className="w-48 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Rate Chart 1">Rate Chart 1</SelectItem>
                <SelectItem value="Rate Chart 2">Rate Chart 2</SelectItem>
                <SelectItem value="Rate Chart 3">Rate Chart 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1">Shift</Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger className="w-48 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleShow} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? "Loading..." : "Show"}
          </Button>
          <div className="ml-auto">
            <Button 
              onClick={handleExportExcel}
              disabled={!rateMatrix || rateMatrix.length === 0}
              variant="outline" 
              className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Excel Export
            </Button>
          </div>
        </div>

        {/* Rate Chart Table */}
        <div className="border rounded-lg overflow-x-auto m-4">
          {rateMatrix.length > 0 ? (
            <div className="min-w-[750px]">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {rateMatrix[0]?.map((header, index) => (
                      <th key={index} className="p-3 text-center font-semibold border-r last:border-r-0 min-w-16">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rateMatrix.slice(1).map((row, rowIndex) => (
                    <tr key={rowIndex} className={`border-b hover:bg-gray-50 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className={`p-3 text-center border-r last:border-r-0 ${cellIndex === 0 ? 'font-semibold bg-gray-50' : ''}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              Select VLC and click Show to view rate chart
            </div>
          )}
        </div>
    </div>
  );      
};

export default RateChartReport;