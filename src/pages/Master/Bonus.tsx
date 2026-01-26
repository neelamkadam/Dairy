import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { api } from "@/services/config";
import { userApi } from "@/services/reportsApi";

const Bonus = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [selectedVlc, setSelectedVlc] = useState("");
  const [farmers, setFarmers] = useState<any[]>([]);
  const [bonusAmounts, setBonusAmounts] = useState<Record<string, string>>({});
  const [bulkAmount, setBulkAmount] = useState("");
  const [cowAmount, setCowAmount] = useState("");
  const [buffaloAmount, setBuffaloAmount] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (selectedVlc) {
      fetchFarmers();
    } else {
      setFarmers([]);
    }
  }, [selectedVlc]);

  const fetchFarmers = async () => {
    try {
      const data = await userApi.getFarmers(selectedVlc);
      if (data.success && Array.isArray(data.data)) {
        setFarmers(data.data);
      } else {
        setFarmers([]);
      }
    } catch (error) {
      toast.error("Failed to fetch farmers");
      setFarmers([]);
    }
  };

  const handleBulkAmountChange = (value: string) => {
    setBulkAmount(value);
    if (value) {
      const newAmounts: Record<string, string> = {};
      farmers.forEach(farmer => {
        newAmounts[farmer.username] = value;
      });
      setBonusAmounts(newAmounts);
    }
  };

  const handleCowAmountChange = (value: string) => {
    setCowAmount(value);
    if (value) {
      const newAmounts = { ...bonusAmounts };
      farmers.filter(f => f.milkType === 'Cow').forEach(farmer => {
        newAmounts[farmer.username] = value;
      });
      setBonusAmounts(newAmounts);
    }
  };

  const handleBuffaloAmountChange = (value: string) => {
    setBuffaloAmount(value);
    if (value) {
      const newAmounts = { ...bonusAmounts };
      farmers.filter(f => f.milkType === 'Buffalo').forEach(farmer => {
        newAmounts[farmer.username] = value;
      });
      setBonusAmounts(newAmounts);
    }
  };

  const handleBonusChange = (farmerId: string, value: string) => {
    setBonusAmounts(prev => ({ ...prev, [farmerId]: value }));
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    const farmersWithBonus = Object.entries(bonusAmounts).filter(([_, amount]) => amount && parseFloat(amount) > 0);
    
    if (farmersWithBonus.length === 0) {
      toast.error("Please enter bonus amount for at least one farmer");
      return;
    }

    setLoading(true);
    try {
      const promises = farmersWithBonus.map(([farmerId, amount]) => {
        const payload = {
          dairy_id: parseInt(selectedVlc),
          farmer_id: farmerId,
          start_date: startDate,
          end_date: endDate,
          bonus_deduction: parseFloat(amount),
          fixed_deduction: 0,
        };
        return api.post("/bonus-deductions", payload);
      });

      await Promise.all(promises);
      toast.success(`Bonus created for ${farmersWithBonus.length} farmer(s)`);
      setBonusAmounts({});
      setStartDate("");
      setEndDate("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create bonus");
    } finally {
      setLoading(false);
    }
  };

  const handleFixedSubmit = async () => {
    if (!selectedVlc || !startDate || !endDate || !fixedAmount) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const data = await userApi.getFarmers(selectedVlc);
      if (data.success && Array.isArray(data.data)) {
        const promises = data.data.map((farmer: any) => {
          const payload = {
            dairy_id: parseInt(selectedVlc),
            farmer_id: farmer.username,
            start_date: startDate,
            end_date: endDate,
            bonus_deduction: 0,
            fixed_deduction: parseFloat(fixedAmount),
          };
          return api.post("/bonus-deductions", payload);
        });
        await Promise.all(promises);
        toast.success(`Fixed deduction created for ${data.data.length} farmer(s)`);
        setFixedAmount("");
        setStartDate("");
        setEndDate("");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create fixed deduction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 mx-auto space-y-4 mt-6">
      <Card className="bg-white shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-2xl font-bold text-gray-800">Bonus & Deduction Management</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="bonus" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="bonus" className="text-base">Bonus</TabsTrigger>
              <TabsTrigger value="fixed" className="text-base">Fixed Deduction</TabsTrigger>
            </TabsList>
            
            <TabsContent value="bonus" className="space-y-6 text-left mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="vlc" className="mb-2 font-medium">VLC<span className="text-red-600">*</span></Label>
                <Select value={selectedVlc} onValueChange={setSelectedVlc}>
                  <SelectTrigger className="w-full bg-white border-gray-300 h-11">
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
                <Label htmlFor="start_date" className="mb-2 font-medium">Start Date<span className="text-red-600">*</span></Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-gray-300 h-11"
                />
              </div>
              <div>
                <Label htmlFor="end_date" className="mb-2 font-medium">End Date<span className="text-red-600">*</span></Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-gray-300 h-11"
                />
              </div>
            </div>

            {selectedVlc && farmers.length > 0 && (
              <>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Apply</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <Label htmlFor="bulk_amount" className="mb-2 text-sm font-medium">All Farmers</Label>
                      <Input
                        id="bulk_amount"
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={bulkAmount}
                        onChange={(e) => handleBulkAmountChange(e.target.value)}
                        className="border-gray-300 bg-white h-11"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <Label htmlFor="cow_amount" className="mb-2 text-sm font-medium">All Cow</Label>
                      <Input
                        id="cow_amount"
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={cowAmount}
                        onChange={(e) => handleCowAmountChange(e.target.value)}
                        className="border-gray-300 bg-white h-11"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <Label htmlFor="buffalo_amount" className="mb-2 text-sm font-medium">All Buffalo</Label>
                      <Input
                        id="buffalo_amount"
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={buffaloAmount}
                        onChange={(e) => handleBuffaloAmountChange(e.target.value)}
                        className="border-gray-300 bg-white h-11"
                      />
                    </div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <TableHead className="text-left font-semibold text-gray-700">Farmer ID</TableHead>
                        <TableHead className="text-left font-semibold text-gray-700">Name</TableHead>
                        <TableHead className="text-left font-semibold text-gray-700">Mobile</TableHead>
                        <TableHead className="text-left font-semibold text-gray-700">Milk Type</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">Bonus Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {farmers.map((farmer) => (
                        <TableRow key={farmer.username} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{farmer.username}</TableCell>
                          <TableCell>{farmer.fullName}</TableCell>
                          <TableCell>{farmer.mobile_number}</TableCell>
                          <TableCell>{farmer.milkType}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={bonusAmounts[farmer.username] || ""}
                              onChange={(e) => handleBonusChange(farmer.username, e.target.value)}
                              className="w-32 ml-auto border-gray-300 h-10"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 text-base font-semibold shadow-md"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Bonus"}
                </Button>
              </>
            )}

            {selectedVlc && farmers.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                No farmers found for this VLC
              </div>
            )}
            </TabsContent>

            <TabsContent value="fixed" className="space-y-6 text-left mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="vlc_fixed" className="mb-2 font-medium">VLC<span className="text-red-600">*</span></Label>
                  <Select value={selectedVlc} onValueChange={setSelectedVlc}>
                    <SelectTrigger className="w-full bg-white border-gray-300 h-11">
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
                  <Label htmlFor="start_date_fixed" className="mb-2 font-medium">Start Date<span className="text-red-600">*</span></Label>
                  <Input
                    id="start_date_fixed"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-gray-300 h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="end_date_fixed" className="mb-2 font-medium">End Date<span className="text-red-600">*</span></Label>
                  <Input
                    id="end_date_fixed"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-gray-300 h-11"
                  />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                <Label htmlFor="fixed_amount" className="mb-2 font-medium text-base">Fixed Deduction Amount<span className="text-red-600">*</span></Label>
                <Input
                  id="fixed_amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter fixed deduction amount"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  className="border-gray-300 bg-white h-12 text-lg"
                />
              </div>

              <Button
                onClick={handleFixedSubmit}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 text-base font-semibold shadow-md"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Fixed Deduction"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Bonus;
