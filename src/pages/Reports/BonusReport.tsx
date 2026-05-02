import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { bonusApi, BonusDeduction } from "@/services/bonusApi";
import { useTranslation } from "react-i18next";

const BonusReport = () => {
  const { t } = useTranslation();
  const { branches } = useAppSelector((state: any) => state.branch);
  const [selectedVLC, setSelectedVLC] = useState<string>("");
  const selectedVlcObj = branches.find((b: any) => b.branch_id.toString() === selectedVLC);

  const calculateDateRange = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const cycleDays = selectedVlcObj?.days || 10;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    
    let startDay: number, endDay: number;
    
    if (cycleDays === 15) {
      if (day >= 1 && day <= 15) {
        startDay = 1;
        endDay = 15;
      } else {
        startDay = 16;
        endDay = lastDayOfMonth;
      }
    } else if (cycleDays >= 28) {
      startDay = 1;
      endDay = lastDayOfMonth;
    } else {
      if (day >= 1 && day <= 10) {
        startDay = 1;
        endDay = 10;
      } else if (day >= 11 && day <= 20) {
        startDay = 11;
        endDay = 20;
      } else {
        startDay = 21;
        endDay = lastDayOfMonth;
      }
    }
    
    return {
      from: `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    };
  };

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [farmerId, setFarmerId] = useState<string>("");
  const [bonusData, setBonusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Bonus Form State
  const [newBonus, setNewBonus] = useState<Partial<BonusDeduction>>({
    farmer_id: "",
    bonus_deduction: 0,
    fixed_deduction: 0,
  });

  useEffect(() => {
    if (branches.length > 0 && !selectedVLC) {
      setSelectedVLC(branches[0].branch_id.toString());
      // Initialize dates for the first branch
      const dates = calculateDateRange(new Date().toISOString().split("T")[0]);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
  }, [branches]);

  useEffect(() => {
    if (selectedVLC) {
      const dates = calculateDateRange(fromDate || new Date().toISOString().split('T')[0]);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
  }, [selectedVLC, branches]);

  const fetchBonusData = async () => {
    if (!selectedVLC) {
      toast.error("Please select a VLC Center");
      return;
    }

    setLoading(true);
    try {
      const requestPayload = {
        dairy_id: parseInt(selectedVLC),
        start_date: fromDate,
        end_date: toDate,
        farmer_id: farmerId || undefined,
      };
      console.log('Bonus Report API Request:', requestPayload);
      
      const response = await bonusApi.getBonusDeductions(requestPayload);
      console.log('Bonus Report API Response:', response);

      if (response.data.success) {
        const mergedData = response.data.data.reduce((acc: any[], item: any) => {
          const existing = acc.find((d: any) => d.farmer_id === item.farmer_id);
          if (existing) {
            existing.bonus_deduction = (parseFloat(existing.bonus_deduction) + parseFloat(item.bonus_deduction)).toFixed(2);
            existing.fixed_deduction = (parseFloat(existing.fixed_deduction) + parseFloat(item.fixed_deduction)).toFixed(2);
          } else {
            acc.push({ ...item });
          }
          return acc;
        }, []);
        setBonusData(mergedData);
      } else {
        toast.error("Failed to fetch bonus deductions");
      }
    } catch (error: any) {
      console.error("Error fetching bonus data:", error);
      toast.error(error?.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBonus = async () => {
    if (!selectedVLC || !newBonus.farmer_id) {
      toast.error("VLC and Farmer ID are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        dairy_id: parseInt(selectedVLC),
        farmer_id: newBonus.farmer_id!,
        start_date: fromDate,
        end_date: toDate,
        bonus_deduction: Number(newBonus.bonus_deduction || 0),
        fixed_deduction: Number(newBonus.fixed_deduction || 0),
      };

      const response = await bonusApi.createBonusDeduction(payload);
      if (response.data.success) {
        toast.success("Bonus deduction created successfully");
        setIsAddModalOpen(false);
        setNewBonus({ farmer_id: "", bonus_deduction: 0, fixed_deduction: 0 });
        fetchBonusData();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create bonus deduction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = bonusData.filter((item) =>
    item.farmer_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Bonus Deductions Report</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle>Add Bonus Deduction</DialogTitle>
              <DialogDescription>
                Create a new bonus deduction for a farmer in the current period.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="farmer_id" className="text-right">Farmer ID</Label>
                <Input
                  id="farmer_id"
                  className="col-span-3"
                  value={newBonus.farmer_id}
                  onChange={(e) => setNewBonus({ ...newBonus, farmer_id: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bonus" className="text-right">Bonus Ded.</Label>
                <Input
                  id="bonus"
                  type="number"
                  className="col-span-3"
                  value={newBonus.bonus_deduction}
                  onChange={(e) => setNewBonus({ ...newBonus, bonus_deduction: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fixed" className="text-right">Fixed Ded.</Label>
                <Input
                  id="fixed"
                  type="number"
                  className="col-span-3"
                  value={newBonus.fixed_deduction}
                  onChange={(e) => setNewBonus({ ...newBonus, fixed_deduction: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateBonus} 
                className="bg-blue-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>VLC Center</Label>
              <Select value={selectedVLC} onValueChange={setSelectedVLC}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select VLC Center" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {branches.map((vlc) => (
                    <SelectItem key={vlc.branch_id} value={vlc.branch_id.toString()}>
                      {vlc.username} - {vlc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <Label>From Date</Label>
              <Input 
                type="date" 
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)} 
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <Label>To Date</Label>
              <Input 
                type="date" 
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)} 
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <Label>Farmer ID (Optional)</Label>
              <Input 
                placeholder="Enter ID" 
                value={farmerId} 
                onChange={(e) => setFarmerId(e.target.value)} 
              />
            </div>

            <div className="flex gap-2">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]" 
                onClick={fetchBonusData}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : "Show"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-100 flex flex-row items-center justify-between">
          <CardTitle>Deductions List</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Filter by Farmer ID..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="font-bold">Farmer ID</TableHead>
                  <TableHead className="font-bold">Period Start</TableHead>
                  <TableHead className="font-bold">Period End</TableHead>
                  <TableHead className="font-bold text-right">Bonus Deduction</TableHead>
                  <TableHead className="font-bold text-right">Fixed Deduction</TableHead>
                  <TableHead className="font-bold text-right">Total Deduction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((bonus) => (
                    <TableRow key={bonus.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>{bonus.created_at ? format(new Date(bonus.created_at), "dd-MM-yyyy") : "-"}</TableCell>
                      <TableCell className="font-medium text-blue-600">{bonus.farmer_id}</TableCell>
                      <TableCell>{fromDate ? format(new Date(fromDate), "dd-MM-yyyy") : "-"}</TableCell>
                      <TableCell>{toDate ? format(new Date(toDate), "dd-MM-yyyy") : "-"}</TableCell>
                      <TableCell className="text-right text-red-500 font-medium">₹{Number(bonus.bonus_deduction).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-red-500 font-medium">₹{Number(bonus.fixed_deduction).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">₹{(Number(bonus.bonus_deduction) + Number(bonus.fixed_deduction)).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      {loading ? "Fetching data..." : "No bonus deductions found for this period."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BonusReport;
