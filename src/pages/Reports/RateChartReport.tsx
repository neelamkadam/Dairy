import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useAppSelector } from "@/redux/store";
import { reportsApi } from "@/services/reportsApi";
import { toast } from "react-toastify";
import { generateRateChartReportExcel } from "@/templates/RateChartReportExcelTemplate";
import { Download } from "lucide-react";

const RateChartReport = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [vlcId, setVlcId] = useState("");
  const [milkType, setMilkType] = useState("cow");
  const [rateChartName, setRateChartName] = useState("Rate Chart 1");
  const [loading, setLoading] = useState(false);
  const [rateMatrix, setRateMatrix] = useState<any[][]>([]);
  const [hasShiftSpecific, setHasShiftSpecific] = useState(false);
  const [matrices, setMatrices] = useState<any[]>([]);

  const filterEmptyColumns = (matrix: any[][]) => {
    if (!matrix || matrix.length === 0) return matrix;
    
    const headerRow = matrix[0];
    const validColumnIndices: number[] = [];
    
    // Find columns that have actual data (not empty strings)
    for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
      const hasData = matrix.slice(1).some(row => 
        row[colIndex] !== "" && row[colIndex] !== null && row[colIndex] !== undefined
      );
      if (colIndex === 0 || hasData) { // Always keep first column (SNF values)
        validColumnIndices.push(colIndex);
      }
    }
    
    // Return filtered matrix with only valid columns
    return matrix.map(row => 
      validColumnIndices.map(index => row[index])
    );
  };
  const handleShow = async () => {
    if (!vlcId) {
      toast.error("Please select a VLC");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        organisation_id: vlcId,
        type: milkType.toLowerCase(),
        name: rateChartName,
      };
      
      const data = await reportsApi.previewRateMatrix(payload);
      
      if (data.success) {
        setHasShiftSpecific(data.hasShiftSpecific || false);
        
        if (data.hasShiftSpecific && data.matrices) {
          // Filter empty columns from each matrix
          const filteredMatrices = data.matrices.map((matrixData: any) => ({
            ...matrixData,
            matrix: filterEmptyColumns(matrixData.matrix)
          }));
          setMatrices(filteredMatrices);
          setRateMatrix([]);
        } else if (data.matrix) {
          setRateMatrix(filterEmptyColumns(data.matrix));
          setMatrices([]);
        } else {
          toast.error(data.message || 'No rate chart data found');
          setRateMatrix([]);
          setMatrices([]);
          return;
        }
        toast.success('Rate chart loaded successfully');
      } else {
        toast.error(data.message || 'No rate chart data found');
        setRateMatrix([]);
        setMatrices([]);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to fetch rate chart");
      setRateMatrix([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if ((!rateMatrix || rateMatrix.length === 0) && (!matrices || matrices.length === 0)) {
      toast.error("No data to export");
      return;
    }
    
    const selectedBranch = branches?.find(b => b.branch_id.toString() === vlcId);
    const vlcName = selectedBranch ? `${selectedBranch.username}_${selectedBranch.name}` : "Unknown";
    
    try {
      if (hasShiftSpecific && matrices.length > 0) {
        matrices.forEach((matrixData) => {
          if (matrixData.matrix && Array.isArray(matrixData.matrix) && matrixData.matrix.length > 0) {
            generateRateChartReportExcel(`${vlcName}_${matrixData.shift}`, milkType, matrixData.matrix);
          }
        });
      } else if (rateMatrix.length > 0) {
        generateRateChartReportExcel(vlcName, milkType, rateMatrix);
      }
      toast.success("Excel exported successfully");
    } catch (error) {
      toast.error("Failed to export Excel");
    }
  };
  
  return (
    <div className="w-full h-screen bg-white">
      <h1 className="p-4 text-left font-bold bg-gray-100">VLCC Rate Chart</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 items-end bg-white p-4">
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
              <SelectItem value="cow">cow</SelectItem>
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
        
        <Button onClick={handleShow} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          {loading ? "Loading..." : "Show"}
        </Button>
        
        <div className="ml-auto">
          <Button 
            onClick={handleExportExcel}
            disabled={(!rateMatrix || rateMatrix.length === 0) && (!matrices || matrices.length === 0)}
            variant="outline" 
            className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Excel Export
          </Button>
        </div>
      </div>

      <div className="m-4">
        {hasShiftSpecific && matrices.length > 0 ? (
          <div className="space-y-8">
            {matrices.map((matrixData, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <div className="bg-blue-100 p-3 border-b">
                  <h2 className="text-xl font-bold text-blue-800">{matrixData.shift} Shift Rate Chart</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[750px]">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        {matrixData.matrix[0]?.map((header: any, index: number) => (
                          <th key={index} className="p-3 text-center font-semibold border-r last:border-r-0 min-w-16">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.matrix.slice(1).map((row: any[], rowIndex: number) => (
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
              </div>
            ))}
          </div>
        ) : rateMatrix.length > 0 ? (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[750px]">
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
          <div className="border rounded-lg">
            <div className="text-center py-10 text-gray-500">
              Select VLC and click Show to view rate chart
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RateChartReport;