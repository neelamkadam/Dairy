import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cattleFeedApi, CattleFeedStock } from "@/services/cattleFeedApi";
import { toast } from "react-toastify";
import { useAppSelector } from "@/redux/store";
import { format } from "date-fns";

const CattleFeedStockSettings: React.FC = () => {
  const { branches } = useAppSelector((state) => state.branch);
  const [dairyId, setDairyId] = useState("");
  const [stockName, setStockName] = useState("");
  const [stock, setStock] = useState("");
  const [amount, setAmount] = useState("");
  const [suggestions, setSuggestions] = useState<CattleFeedStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [existingStock, setExistingStock] = useState<CattleFeedStock | null>(null);
  const [allStocks, setAllStocks] = useState<CattleFeedStock[]>([]);

  const fetchAllStocks = async (dairy_id: string) => {
    try {
      console.log('📋 Fetching all stocks for dairy:', dairy_id);
      const response = await cattleFeedApi.getStock(dairy_id);
      console.log('📋 All Stocks Response:', response);
      if (response.success && Array.isArray(response.data)) {
        setAllStocks(response.data);
      }
    } catch (error) {
      console.error('❌ Failed to fetch all stocks:', error);
    }
  };

  useEffect(() => {
    if (dairyId) {
      fetchAllStocks(dairyId);
    } else {
      setAllStocks([]);
    }
  }, [dairyId]);

  const fetchStockByName = async (name: string) => {
    if (!dairyId) return;
    try {
      console.log('🔍 Fetching stocks for dairy:', dairyId);
      console.log('🔍 Search query:', name);
      const response = await cattleFeedApi.getStock(dairyId);
      console.log('📦 Full API Response:', response);
      console.log('📦 Response Status:', response.status);
      console.log('📦 Response Data:', response.data);
      
      const stockData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      console.log('📊 Parsed Stock Data:', stockData);
      console.log('📊 Stock Data Length:', stockData.length);
      
      const matchedStocks = stockData.filter(
        (item) => item.stock_name.toLowerCase().startsWith(name.toLowerCase())
      );
      console.log('🎯 Matched Stocks:', matchedStocks);
      console.log('🎯 Matched Count:', matchedStocks.length);
      
      if (matchedStocks.length > 0) {
        const totalStock = matchedStocks.reduce((sum, item) => sum + item.stock, 0);
        const combinedStock = {
          ...matchedStocks[0],
          stock: totalStock,
          _allIds: matchedStocks.map(s => s.id)
        };
        console.log('✅ Combined Stock:', combinedStock);
        console.log('✅ Total Stock Quantity:', totalStock);
        setSuggestions([combinedStock]);
        setExistingStock(combinedStock as any);
      } else {
        console.log('⚠️ No matching stocks found');
        setSuggestions([]);
        setExistingStock(null);
      }
    } catch (error) {
      console.error("❌ Failed to fetch stock", error);
      console.error("❌ Error details:", JSON.stringify(error, null, 2));
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

    if (!amount) {
      toast.error("Please enter amount per unit");
      return;
    }

    setLoading(true);
    try {
      console.log('💾 Submitting stock - Fetching existing data');
      console.log('💾 Dairy ID:', dairyId);
      console.log('💾 Stock Name:', stockName);
      console.log('💾 New Stock Quantity:', stock);
      console.log('💾 Amount:', amount);
      
      const response = await cattleFeedApi.getStock(dairyId);
      console.log('📦 GET Stock Response:', response);
      
      const stockData = Array.isArray(response.data) ? response.data : [];
      console.log('📊 All Stock Data:', stockData);
      
      const matchingStocks = stockData.filter(
        (item) => item.stock_name.toLowerCase() === stockName.trim().toLowerCase()
      );
      console.log('🎯 Matching Stocks for Update:', matchingStocks);
      
      const totalExistingStock = matchingStocks.reduce((sum, item) => sum + item.stock, 0);
      console.log('📊 Total Existing Stock:', totalExistingStock);

      if (matchingStocks.length > 0) {
        const updatePayload = {
          stock_name: stockName.trim(),
          stock: parseFloat(stock) + totalExistingStock,
          amount: parseFloat(amount),
        };
        console.log('🔄 Updating existing stock with payload:', updatePayload);
        await cattleFeedApi.updateStock(matchingStocks[0].id, updatePayload);
        toast.success("Stock updated successfully");
      } else {
        const createPayload = {
          dairy_id: dairyId,
          stock_name: stockName.trim(),
          stock: parseFloat(stock),
          amount: parseFloat(amount),
        };
        console.log('➕ Creating new stock with payload:', createPayload);
        await cattleFeedApi.createStock(createPayload);
        toast.success("Stock created successfully");
      }

      setStockName("");
      setStock("");
      setAmount("");
      setSuggestions([]);
      if (dairyId) {
        fetchAllStocks(dairyId);
      }
    } catch (error) {
      console.error("❌ Failed to save stock:", error);
      toast.error("Failed to save stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
                        {branch.username} - {branch.name} - {branch.branchName || ''}
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
                  className="w-full"
                />
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

        <div>
          {allStocks.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Current Stock</h3>
              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                {allStocks.map((stock) => (
                  <Card key={stock.id} className="border border-blue-200 shadow-sm">
                    <CardContent className="p-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600">Name</span>
                          <span className="text-xs font-semibold text-gray-900">{stock.stock_name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600">Stock</span>
                          <span className="text-xs font-bold text-blue-600">{stock.stock} units</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600">Amount</span>
                          <span className="text-xs font-bold text-green-600">₹{parseFloat(stock.amount).toFixed(2)}</span>
                        </div>
                        <div className="pt-1.5 border-t border-gray-200">
                          <span className="text-xs text-gray-500">Date</span>
                          <p className="text-xs font-medium text-gray-700">{format(new Date(stock.date), 'dd-MM-yyyy')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">Select VLC to view stocks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CattleFeedStockSettings;
