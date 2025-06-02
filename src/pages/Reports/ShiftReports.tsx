import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ShiftReport = () => {
  const shiftData = [
    { farmerId: "001", quantity: 1250.5, fat: 3.8, snf: 8.5, clr: 29.5, rate: 45.75, totalAmount: 57210.38 },
    { farmerId: "002", quantity: 1120.3, fat: 3.9, snf: 8.6, clr: 29.6, rate: 46.25, totalAmount: 51813.88 },
    { farmerId: "003", quantity: 1180.7, fat: 3.7, snf: 8.4, clr: 29.4, rate: 45.50, totalAmount: 53721.85 },
    { farmerId: "004", quantity: 1090.2, fat: 3.8, snf: 8.5, clr: 29.5, rate: 45.75, totalAmount: 49876.65 },
    { farmerId: "005", quantity: 1310.8, fat: 3.9, snf: 8.6, clr: 29.6, rate: 46.25, totalAmount: 60619.50 }
  ];

  const totals = {
    quantity: 5000,
    avgFat: 20,
    avgSnf: 25,
    avgClr: 100,
    avgRate: 45.75,
    totalAmount: "50,00,000"
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-blue-800 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded">
                <svg className="w-6 h-6 text-blue-800" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <CardTitle className="text-xl">Daily Shift Report</CardTitle>
            </div>
            <Button variant="ghost" className="text-white hover:bg-blue-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 mt-6">
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>VLC Name</Label>
              <Select defaultValue="select">
                <SelectTrigger>
                  <SelectValue placeholder="Select VLC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select VLC</SelectItem>
                  <SelectItem value="vlc1">VLC 1</SelectItem>
                  <SelectItem value="vlc2">VLC 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Milk Type</Label>
              <Select defaultValue="select">
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select Type</SelectItem>
                  <SelectItem value="cow">Cow Milk</SelectItem>
                  <SelectItem value="buffalo">Buffalo Milk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date From</Label>
              <Input type="date" placeholder="yyyy / mm / dd" />
            </div>
            <div>
              <Label>Shift Type</Label>
              <Select defaultValue="select">
                <SelectTrigger>
                  <SelectValue placeholder="Select Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select Shift</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="bg-blue-600 hover:bg-blue-700">Generate Report</Button>
          </div>

          {/* Data Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Farmer ID</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Fat</TableHead>
                  <TableHead>SNF</TableHead>
                  <TableHead>CLR</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftData.map((row) => (
                  <TableRow key={row.farmerId} className="hover:bg-gray-50">
                    <TableCell className="font-mono">{row.farmerId}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{row.fat}</TableCell>
                    <TableCell>{row.snf}</TableCell>
                    <TableCell>{row.clr}</TableCell>
                    <TableCell>{row.rate}</TableCell>
                    <TableCell className="text-right font-semibold">{row.totalAmount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Items per page</span>
              <Select defaultValue="10">
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Showing 1-10 of 50 items</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <Button variant="outline" size="sm" className="bg-blue-600 text-white">1</Button>
                <Button variant="outline" size="sm">2</Button>
                <Button variant="outline" size="sm">3</Button>
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Row */}
          <div className="border rounded-lg overflow-x-auto bg-gray-50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Total Quantity</TableHead>
                  <TableHead>Average Fat</TableHead>
                  <TableHead>Average SNF</TableHead>
                  <TableHead>Average CLR</TableHead>
                  <TableHead>Average Rate</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-bold">{totals.quantity}</TableCell>
                  <TableCell className="font-bold">{totals.avgFat}</TableCell>
                  <TableCell className="font-bold">{totals.avgSnf}</TableCell>
                  <TableCell className="font-bold">{totals.avgClr}</TableCell>
                  <TableCell className="font-bold">{totals.avgRate}</TableCell>
                  <TableCell className="text-right font-bold">{totals.totalAmount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Export Buttons */}
          <div className="flex justify-end gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700">Excel Export</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700">PDF Export</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftReport;