import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const paymentData = [
  {
    date: "2024-01-20",
    farmerId: "F001",
    name: "Vishal Mali",
    advance: 500,
    cattleFeed: 2500,
    other: 0,
    userId: "RV001",
  },
];

 const PaymentAndReceipt: React.FC = () => {
  const [formData, setFormData] = useState({
    vlcName: 'all',
    fromDate: undefined as Date | undefined,
    farmerCode: '01',
    farmerName: 'Vishal Mali',
    advanceTaken: '',
    other: '',
    cattleFeed: '',
    receivedAmount: '',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-gray-600">
        <span>Dashboard / Reduction</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Payment And Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* User Info Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-4">User Info</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">VLC Name</Label>
                  <Select value={formData.vlcName} onValueChange={(value) => setFormData({...formData, vlcName: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="vlc1">VLC Alpha</SelectItem>
                      <SelectItem value="vlc2">VLC Beta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-600">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fromDate ? format(formData.fromDate, "dd-MM-yyyy") : "21-04-2025"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.fromDate}
                        onSelect={(date) => setFormData({...formData, fromDate: date})}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Farmer Code</Label>
                  <Input
                    value={formData.farmerCode}
                    onChange={(e) => setFormData({...formData, farmerCode: e.target.value})}
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Farmer Name</Label>
                  <Input
                    value={formData.farmerName}
                    onChange={(e) => setFormData({...formData, farmerName: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="advanceTaken">Advance Taken</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    id="advanceTaken"
                    type="number"
                    placeholder="0.00"
                    className="pl-8"
                    value={formData.advanceTaken}
                    onChange={(e) => setFormData({...formData, advanceTaken: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="other">OTHER</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    id="other"
                    type="number"
                    placeholder="0.00"
                    className="pl-8"
                    value={formData.other}
                    onChange={(e) => setFormData({...formData, other: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cattleFeed">Cattle Feed</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    id="cattleFeed"
                    type="number"
                    placeholder="0.00"
                    className="pl-8"
                    value={formData.cattleFeed}
                    onChange={(e) => setFormData({...formData, cattleFeed: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="receivedAmount">Recieved Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    id="receivedAmount"
                    type="number"
                    placeholder="0.00"
                    className="pl-8"
                    value={formData.receivedAmount}
                    onChange={(e) => setFormData({...formData, receivedAmount: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Submit
            </Button>

            {/* Records Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Record Count: 1 - 0 of 0</div>
                <div className="flex gap-2">
                  <Select defaultValue="100">
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">Result per page:</span>
                  <Button className="bg-blue-600 hover:bg-blue-700">Excel Export</Button>
                  <Button className="bg-red-600 hover:bg-red-700">PDF Export</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">DATE</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">FARMER ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">NAME</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Advance</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Cattle Feed</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">OTHER</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">User ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentData.map((payment, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{payment.date}</td>
                        <td className="py-3 px-4 font-medium">{payment.farmerId}</td>
                        <td className="py-3 px-4">{payment.name}</td>
                        <td className="py-3 px-4 text-right">{payment.advance}</td>
                        <td className="py-3 px-4 text-right">{payment.cattleFeed}</td>
                        <td className="py-3 px-4 text-right">{payment.other}</td>
                        <td className="py-3 px-4">{payment.userId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm">←</Button>
                <Button variant="outline" size="sm">→</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentAndReceipt;