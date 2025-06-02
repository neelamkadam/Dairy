import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const RemainingBalanceReport = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const farmers = [
    { id: "F001", name: "John Smith", balance: 1500.00 },
    { id: "F002", name: "Emma Wilson", balance: 2300.50 },
    { id: "F003", name: "Michael Brown", balance: 750.25 },
    { id: "F004", name: "Sarah Davis", balance: 3200.75 },
    { id: "F005", name: "Robert Johnson", balance: 1800.00 },
    { id: "F006", name: "Lisa Anderson", balance: 950.50 },
    { id: "F007", name: "David Miller", balance: 2700.25 },
    { id: "F008", name: "Jennifer Taylor", balance: 1600.00 },
  ];

  const filteredFarmers = farmers.filter(farmer =>
    farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBalance = farmers.reduce((sum, farmer) => sum + farmer.balance, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Remaining Amount Report</CardTitle>
          <CardDescription>April 22, 2025</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select VLCC</label>
              <Select defaultValue="choose">
                <SelectTrigger>
                  <SelectValue placeholder="Choose VLCC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="choose">Choose VLCC</SelectItem>
                  <SelectItem value="vlcc1">VLCC 1</SelectItem>
                  <SelectItem value="vlcc2">VLCC 2</SelectItem>
                  <SelectItem value="vlcc3">VLCC 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Button className="bg-blue-600 hover:bg-blue-700 mt-7">Show Report</Button>
            </div>
          </div>

          {/* Search and Export */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Search farmers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a4 4 0 01-4 4z" />
                </svg>
                Export Excel
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Farmer ID</TableHead>
                  <TableHead className="font-semibold">Farmer Name</TableHead>
                  <TableHead className="font-semibold text-right">Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFarmers.map((farmer) => (
                  <TableRow key={farmer.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono">{farmer.id}</TableCell>
                    <TableCell>{farmer.name}</TableCell>
                    <TableCell className="text-right font-semibold">₹{farmer.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Total */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Remaining Balance</span>
              <span className="text-2xl font-bold text-blue-600">₹{totalBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
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
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>1-8 of 8</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RemainingBalanceReport;