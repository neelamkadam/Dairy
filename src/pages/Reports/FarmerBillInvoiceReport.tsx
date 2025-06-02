import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const FarmerBillInvoiceReport = () => {
  const [vlccName, setVlccName] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const invoiceData = [
    {
      date: "2024-01-01",
      shift: "Morning",
      literPerDay: 12.5,
      fatPerDay: 3.8,
      snfPerDay: 8.5,
      clrPerDay: 29.5,
      rate: 45.5,
      totalAmount: 568.75
    },
    {
      date: "2024-01-02",
      shift: "Evening",
      literPerDay: 11.8,
      fatPerDay: 3.9,
      snfPerDay: 8.6,
      clrPerDay: 29.8,
      rate: 45.5,
      totalAmount: 536.9
    },
    {
      date: "2024-01-03",
      shift: "Morning",
      literPerDay: 13.2,
      fatPerDay: 3.7,
      snfPerDay: 8.4,
      clrPerDay: 29.3,
      rate: 45.5,
      totalAmount: 600.6
    }
  ];

  const summary = {
    totalLiters: 37.5,
    totalAmount: 1705.55,
    remainingBalance: 500.00
  };

  const deductions = {
    currentCattleFeed: 300.00,
    currentAdvance: 200.00,
    totalDeduction: 500.00
  };

  const netPayableAmount = 356.25;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-xl">DairyConnect</CardTitle>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-100">April 22, 2025</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 mt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">Farmer Bill Invoice</h2>
          </div>

          {/* Input Form */}
          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="vlccName">VLCC Name</Label>
                <Input
                  id="vlccName"
                  placeholder="Enter VLCC Name"
                  value={vlccName}
                  onChange={(e) => setVlccName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="farmerId">Farmer ID</Label>
                <Input
                  id="farmerId"
                  placeholder="Enter Farmer ID"
                  value={farmerId}
                  onChange={(e) => setFarmerId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
            <Button className="bg-blue-800 hover:bg-blue-900">Generate Invoice</Button>
          </div>

          {/* Invoice Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Liter Per Day</TableHead>
                  <TableHead>FAT/Day</TableHead>
                  <TableHead>SNF/Day</TableHead>
                  <TableHead>CLR/Day</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.shift}</TableCell>
                    <TableCell>{row.literPerDay}</TableCell>
                    <TableCell>{row.fatPerDay}</TableCell>
                    <TableCell>{row.snfPerDay}</TableCell>
                    <TableCell>{row.clrPerDay}</TableCell>
                    <TableCell>{row.rate}</TableCell>
                    <TableCell className="text-right">₹{row.totalAmount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary and Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Liters:</span>
                  <span className="font-semibold">{summary.totalLiters} L</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-semibold">₹{summary.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Balance:</span>
                  <span className="font-semibold">₹{summary.remainingBalance}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Deductions</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Current Cattle Feed:</span>
                  <span className="font-semibold">₹{deductions.currentCattleFeed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Advance:</span>
                  <span className="font-semibold">₹{deductions.currentAdvance}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Deduction:</span>
                  <span>₹{deductions.totalDeduction}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Payable Amount */}
          <div className="bg-blue-600 text-white p-6 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Net Payable Amount</h3>
              <div className="text-3xl font-bold">₹{netPayableAmount}</div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
              PDF Export
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerBillInvoiceReport;