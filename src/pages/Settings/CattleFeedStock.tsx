import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cattleFeedApi, CattleFeedStock } from "@/services/cattleFeedApi";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";

const CattleFeedStockSettings: React.FC = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [stockName, setStockName] = useState("");
  const [stock, setStock] = useState("");
  const [amount, setAmount] = useState("");
  const [isLumpSum, setIsLumpSum] = useState(false);
  const [suggestions, setSuggestions] = useState<CattleFeedStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [existingStock, setExistingStock] = useState<CattleFeedStock | null>(null);

  const fetchStockByName = async (name: string) => {
    if (!dairyId) return;
    try {
      console.log('🔍 Fetching stocks for dairy:', dairyId);
      const response = await cattleFeedApi.getStock(dairyId);
      console.log('📦 API Response:', response);
      const stockData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      console.log('📊 Stock Data:', stockData);
      
      const matchedStocks = stockData.filter(
        (item) => item.stock_name.toLowerCase().startsWith(name.toLowerCase())
      );
      
      if (matchedStocks.length > 0) {
        const totalStock = matchedStocks.reduce((sum, item) => sum + item.stock, 0);
        const combinedStock = {
          ...matchedStocks[0],
          stock: totalStock,
          _allIds: matchedStocks.map(s => s.id)
        };
        console.log('✅ Combined Stock:', combinedStock);
        setSuggestions([combinedStock]);
        setExistingStock(combinedStock as any);
      } else {
        setSuggestions([]);
        setExistingStock(null);
      }
    } catch (error) {
      console.error("❌ Failed to fetch stock", error);
    }
  };

  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    if (stockName.trim().length >= 3 && dairyId) {
      const timeout = setTimeout(() => {
        fetchStockByName(stockName.trim());
      }, 500);
      setSearchTimeout(timeout);
    } else {
      setSuggestions([]);
      setExistingStock(null);
    }
  }, [stockName, dairyId]);

  const handleSuggestionClick = (suggestion: CattleFeedStock) => {
    setStockName(suggestion.stock_name);
    setAmount(suggestion.amount);
    setIsLumpSum(parseFloat(suggestion.amount) === 0);
    setSuggestions([]);
    setExistingStock(suggestion);
  };

  const handleSubmit = async () => {
    if (!dairyId) {
      toast.error("Please select VLC");
      return;
    }

    if (!stockName.trim() || !stock) {
      toast.error("Please enter stock name and quantity");
      return;
    }

    if (!isLumpSum && !amount) {
      toast.error("Please enter amount for fixed payment type");
      return;
    }

    setLoading(true);
    try {
      const response = await cattleFeedApi.getStock(dairyId);
      const stockData = Array.isArray(response.data) ? response.data : [];
      const matchingStocks = stockData.filter(
        (item) => item.stock_name.toLowerCase() === stockName.trim().toLowerCase()
      );
      
      const totalExistingStock = matchingStocks.reduce((sum, item) => sum + item.stock, 0);

      if (matchingStocks.length > 0) {
        const updatePayload = {
          stock_name: stockName.trim(),
          stock: parseFloat(stock) + totalExistingStock,
          amount: isLumpSum ? 0 : parseFloat(amount),
        };
        await cattleFeedApi.updateStock(matchingStocks[0].id, updatePayload);
        toast.success("Stock updated successfully");
      } else {
        const createPayload = {
          dairy_id: dairyId,
          stock_name: stockName.trim(),
          stock: parseFloat(stock),
          amount: isLumpSum ? 0 : parseFloat(amount),
        };
        await cattleFeedApi.createStock(createPayload);
        toast.success("Stock created successfully");
      }

      setStockName("");
      setStock("");
      setAmount("");
      setIsLumpSum(false);
      setSuggestions([]);
    } catch (error) {
      toast.error("Failed to save stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-sm border-none">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-2xl font-bold text-gray-800">🐄 Cattle Feed Stock Management</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Add or update cattle feed inventory</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">VLC Name</Label>
                <Select value={dairyId} onValueChange={setDairyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select VLC" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {branches.map((branch) => (
                      <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                        {branch.username} - {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-gray-700">Stock Name</Label>
                  {stockName && existingStock && (
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                      ✏️ Editing Existing
                    </span>
                  )}
                  {stockName && !existingStock && stockName.length >= 3 && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      ✨ Adding New
                    </span>
                  )}
                </div>
                <Input
                  value={stockName}
                  onChange={(e) => setStockName(e.target.value)}
                  placeholder="Type 3+ characters to search"
                  className="w-full"
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {suggestions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 hover:bg-blue-50 cursor-pointer transition-colors border-b last:border-b-0"
                        onClick={() => handleSuggestionClick(s)}
                      >
                        <div className="font-medium text-gray-800">{s.stock_name}</div>
                        <div className="text-xs text-gray-500">Available: {s.stock} units</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Stock Quantity to Add</Label>
                <Input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full"
                />
                {existingStock && stock && (
                  <p className="text-xs text-gray-600 mt-1">
                    Current: {existingStock.stock} + New: {stock} = Total: {existingStock.stock + parseFloat(stock)}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Amount per Unit (₹)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={isLumpSum}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="lumpSum"
                    checked={isLumpSum}
                    onChange={(e) => {
                      setIsLumpSum(e.target.checked);
                      if (e.target.checked) setAmount("0");
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <Label htmlFor="lumpSum" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Lump Sum Payment (No fixed rate per unit)
                  </Label>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <Button 
                onClick={handleSubmit} 
                disabled={loading} 
                className="w-full md:w-auto px-8 bg-blue-600 hover:bg-blue-700 text-white h-11"
              >
                {loading ? "Saving..." : "💾 Save Stock"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CattleFeedStockSettings;
