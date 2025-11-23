import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAppSelector } from "@/redux/store";
import { reportsApi } from "@/services/reportsApi";
import { toast } from "react-toastify";

const RateChartReport = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [vlcId, setVlcId] = useState("");
  const [milkType, setMilkType] = useState("Cow");
  const [rateChartName] = useState("Rate Chart 1");
  const [loading, setLoading] = useState(false);
  const [rateMatrix, setRateMatrix] = useState<any[][]>([]);

  const handleShow = async () => {
    if (!vlcId) {
      toast.error("Please select a VLC");
      return;
    }

    setLoading(true);
    try {
      const data = await reportsApi.previewRateMatrix({
        organisation_id: vlcId,
        type: milkType.toLowerCase(),
        name: rateChartName
      });
      
      if (data.success && data.matrix) {
        setRateMatrix(data.matrix);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch rate chart");
      setRateMatrix([]);
    } finally {
      setLoading(false);
    }
  };

  const fatSnfRows = [
    { fat: "3.0", values: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45] },
    { fat: "3.1", values: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46] },
    { fat: "3.2", values: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47] },
    { fat: "3.3", values: [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48] },
    { fat: "3.4", values: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49] },
    { fat: "3.5", values: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
    { fat: "3.6", values: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51] },
    { fat: "3.7", values: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52] },
    { fat: "3.8", values: [38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53] },
    { fat: "3.9", values: [39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54] },
    { fat: "4.0", values: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55] },
    { fat: "4.1", values: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56] },
    { fat: "4.2", values: [42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57] },
    { fat: "4.3", values: [43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58] },
    { fat: "4.4", values: [44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59] },
    { fat: "4.5", values: [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60] },
    { fat: "4.6", values: [46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61] },
    { fat: "4.7", values: [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62] },
    { fat: "4.8", values: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63] },
    { fat: "4.9", values: [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64] },
    { fat: "5.0", values: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65] }
  ];

  const snfColumns = ["7.0", "7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "7.9", "8.0", "8.1", "8.2", "8.3", "8.4", "8.5"];

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
                    {branch.username} - {branch.name}
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
          <Button onClick={handleShow} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? "Loading..." : "Show"}
          </Button>
          <div className="ml-auto">
            <Button variant="outline" className="bg-blue-600 text-white hover:bg-blue-700">
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