import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

const passBookData = [
  {
    period: "2024-01-01 to 2024-01-10",
    totalAmount: "$1,200.00",
    advance: "$300.00",
    cattleFeed: "$250.00",
    totalDeduction: "$550.00",
    remainingBalance: "$3,950.00"
  },
  {
    period: "2024-01-11 to 2024-01-20",
    totalAmount: "$1,100.00",
    advance: "$200.00",
    cattleFeed: "$300.00",
    totalDeduction: "$500.00",
    remainingBalance: "$3,700.00"
  },
  {
    period: "2024-01-21 to 2024-01-30",
    totalAmount: "$1,300.00",
    advance: "$400.00",
    cattleFeed: "$350.00",
    totalDeduction: "$750.00",
    remainingBalance: "$4,050.00"
  }
];

const FarmerPassbook = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Farmer PassBook</h1>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Green Valley VLCC</h2>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">Select Farmer</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Farmer Name</p>
              <p className="text-xl font-bold text-gray-900">John Smith</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Bill Period</p>
              <p className="text-xl font-bold text-gray-900">Jan 2024</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-xl font-bold text-green-600">$5,280.00</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Net Pay</p>
              <p className="text-xl font-bold text-blue-600">$4,750.00</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search..." className="pl-10 w-64" />
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Period</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Advance</TableHead>
                  <TableHead>Cattle Feed</TableHead>
                  <TableHead>Total Deduction</TableHead>
                  <TableHead>Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passBookData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{row.period}</TableCell>
                    <TableCell className="text-green-600 font-semibold">{row.totalAmount}</TableCell>
                    <TableCell>{row.advance}</TableCell>
                    <TableCell>{row.cattleFeed}</TableCell>
                    <TableCell className="text-red-600">{row.totalDeduction}</TableCell>
                    <TableCell className="font-semibold">{row.remainingBalance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-6">
            <Select defaultValue="10">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Previous</Button>
              <Button variant="outline" size="sm" className="bg-blue-600 text-white">1</Button>
              <Button variant="outline" size="sm">2</Button>
              <Button variant="outline" size="sm">3</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Period Total</p>
                <p className="text-2xl font-bold text-green-600">$5,280.00</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold text-red-600">$530.00</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button className="bg-blue-600 hover:bg-blue-700">Excel Export</Button>
            <Button variant="destructive">PDF Export</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerPassbook
