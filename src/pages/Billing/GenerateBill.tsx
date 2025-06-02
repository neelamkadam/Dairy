import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FarmerData {
  id: string;
  name: string;
  liter: string;
  amount: number;
  advance: number;
  cattleFeed: number;
  netPayable: number;
}

const farmersData: FarmerData[] = [
  { id: "F001", name: "John Smith", liter: "450L", amount: 675, advance: 100, cattleFeed: 150, netPayable: 425 },
  { id: "F002", name: "Mary Johnson", liter: "320L", amount: 480, advance: 75, cattleFeed: 200, netPayable: 205 },
  { id: "F003", name: "Robert Davis", liter: "580L", amount: 870, advance: 150, cattleFeed: 180, netPayable: 540 },
  { id: "F004", name: "Sarah Wilson", liter: "290L", amount: 435, advance: 80, cattleFeed: 120, netPayable: 235 },
];

const GenerateBill: React.FC = () => {
  const [billCycle, setBillCycle] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const totalAmount = farmersData.reduce((sum, farmer) => sum + farmer.amount, 0);
  const totalDeduction = farmersData.reduce((sum, farmer) => sum + farmer.advance + farmer.cattleFeed, 0);
  const totalNetPayable = farmersData.reduce((sum, farmer) => sum + farmer.netPayable, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-gray-600">
        <span>←</span>
        <span>Dashboard / Generate Bill</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Generate Bill</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Bill Cycle</label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !billCycle.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {billCycle.from ? format(billCycle.from, "d MMM yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={billCycle.from}
                      onSelect={(date) => setBillCycle({...billCycle, from: date})}
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
                        !billCycle.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {billCycle.to ? format(billCycle.to, "d MMM yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={billCycle.to}
                      onSelect={(date) => setBillCycle({...billCycle, to: date})}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Farmer ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Liter</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Advance</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Cattle Feed</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Net Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {farmersData.map((farmer) => (
                    <tr key={farmer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{farmer.id}</td>
                      <td className="py-3 px-4">{farmer.name}</td>
                      <td className="py-3 px-4">{farmer.liter}</td>
                      <td className="py-3 px-4 text-right">${farmer.amount}</td>
                      <td className="py-3 px-4 text-right">${farmer.advance}</td>
                      <td className="py-3 px-4 text-right">${farmer.cattleFeed}</td>
                      <td className="py-3 px-4 text-right font-medium">${farmer.netPayable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div>
                <div className="text-sm text-gray-600">Total Amount</div>
                <div className="text-xl font-bold">${totalAmount}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Deduction</div>
                <div className="text-xl font-bold">${totalDeduction}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Net Payable</div>
                <div className="text-xl font-bold text-green-600">${totalNetPayable}</div>
              </div>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Generate Bill
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateBill;