import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DeductionData {
  name: string;
  billAmount: number;
  dateRange: string;
  advance: number;
  advanceDeduction: number;
  cattleFeedAmount: number;
  cattleFeedDeduction: number;
  otherAmount: number;
  otherDeduction: number;
  finalAmount: number;
}

const deductionData: DeductionData[] = [
  {
    name: "John Smith",
    billAmount: 2500,
    dateRange: "2024-01-01 - 2024-01-10",
    advance: 500,
    advanceDeduction: -250,
    cattleFeedAmount: 800,
    cattleFeedDeduction: -400,
    otherAmount: 300,
    otherDeduction: -150,
    finalAmount: 1700,
  },
  {
    name: "Emma Wilson",
    billAmount: 3200,
    dateRange: "2024-01-01 - 2024-01-10",
    advance: 600,
    advanceDeduction: -300,
    cattleFeedAmount: 900,
    cattleFeedDeduction: -450,
    otherAmount: 200,
    otherDeduction: -100,
    finalAmount: 2350,
  },
  {
    name: "Michael Brown",
    billAmount: 2800,
    dateRange: "2024-01-01 - 2024-01-10",
    advance: 400,
    advanceDeduction: -200,
    cattleFeedAmount: 700,
    cattleFeedDeduction: -350,
    otherAmount: 250,
    otherDeduction: -125,
    finalAmount: 2125,
  },
  {
    name: "Sarah Davis",
    billAmount: 3500,
    dateRange: "2024-01-01 - 2024-01-10",
    advance: 700,
    advanceDeduction: -350,
    cattleFeedAmount: 1000,
    cattleFeedDeduction: -500,
    otherAmount: 400,
    otherDeduction: -200,
    finalAmount: 2450,
  },
  {
    name: "Robert Johnson",
    billAmount: 2900,
    dateRange: "2024-01-01 - 2024-01-10",
    advance: 550,
    advanceDeduction: -275,
    cattleFeedAmount: 850,
    cattleFeedDeduction: -425,
    otherAmount: 350,
    otherDeduction: -175,
    finalAmount: 2025,
  },
];

const FarmerDeduction: React.FC = () => {
  const [filters, setFilters] = useState({
    vlcName: 'all',
    fromDate: undefined as Date | undefined,
    toDate: undefined as Date | undefined,
    searchTerm: '',
  });

  const totalBillAmount = deductionData.reduce((sum, item) => sum + item.billAmount, 0);
  const totalDeductions = deductionData.reduce((sum, item) => sum + (item.advanceDeduction + item.cattleFeedDeduction + item.otherDeduction), 0);
  const totalFinalAmount = deductionData.reduce((sum, item) => sum + item.finalAmount, 0);
  const remainingBalance = 3000; // Example remaining balance

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center justify-between">
            Farmer Deduction
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search farmers..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                className="w-64"
              />
              <Button variant="outline">🔍 Filter</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Filter Controls */}
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">VLC Name</label>
                <Select value={filters.vlcName} onValueChange={(value) => setFilters({...filters, vlcName: value})}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="vlc1">VLC Alpha</SelectItem>
                    <SelectItem value="vlc2">VLC Beta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filters.fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.fromDate ? format(filters.fromDate, "yyyy-MM-dd") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.fromDate}
                      onSelect={(date) => setFilters({...filters, fromDate: date})}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span>-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filters.toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.toDate ? format(filters.toDate, "yyyy-MM-dd") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.toDate}
                      onSelect={(date) => setFilters({...filters, toDate: date})}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button className="bg-red-600 hover:bg-red-700">Save</Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600">Total Bill Amount</div>
                <div className="text-2xl font-bold text-blue-800">${totalBillAmount.toFixed(2)}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600">Total Deductions</div>
                <div className="text-2xl font-bold text-red-800">${Math.abs(totalDeductions).toFixed(2)}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600">Total Final Amount</div>
                <div className="text-2xl font-bold text-green-800">${totalFinalAmount.toFixed(2)}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600">Remaining Balance</div>
                <div className="text-2xl font-bold text-purple-800">${remainingBalance.toFixed(2)}</div>
              </div>
            </div>

            {/* Deduction Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Farmer Name</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Bill Amount</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Date Range</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Advance</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Advance Deduction</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Cattle Feed Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Cattle Feed Deduction</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Other Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Other Deduction</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Final Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {deductionData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-right">${item.billAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center text-sm">{item.dateRange}</td>
                      <td className="py-3 px-4 text-right">${item.advance.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-red-600">${item.advanceDeduction.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">${item.cattleFeedAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-red-600">${item.cattleFeedDeduction.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">${item.otherAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-red-600">${item.otherDeduction.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">${item.finalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Total Farmers: 5</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">10 per page</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm">←</Button>
                  <Button variant="default" size="sm">1</Button>
                  <Button variant="outline" size="sm">2</Button>
                  <Button variant="outline" size="sm">3</Button>
                  <Button variant="outline" size="sm">→</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerDeduction;
