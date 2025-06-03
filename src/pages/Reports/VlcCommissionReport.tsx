import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const VlcCommissionReport = () => {
  const commissionReportData = [
    { vlccUserId: "RV001", date: "01-04-2025", shift: "Morning", totalLiters: "33,320", commissionPerLiter: "₹1.00", tsDeduction: "₹-320.00", totalAmount: "₹33,320.00" },
    { vlccUserId: "RV002", date: "01-04-2025", shift: "Morning", totalLiters: "42,480", commissionPerLiter: "₹0.50", tsDeduction: "₹+300.00", totalAmount: "₹21,240.00" },
    { vlccUserId: "RV003", date: "01-04-2025", shift: "Evening", totalLiters: "29,760", commissionPerLiter: "₹1.50", tsDeduction: "₹-600.00", totalAmount: "₹44,640.00" }
  ];
  return (
    <>
      <div className="p-6">
      <Tabs defaultValue="commission" className="w-full">
        <TabsContent value="commission" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>VLCC Commission Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="VLCC Name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="green-valley">Green Valley</SelectItem>
                  </SelectContent>
                </Select>

                <Input type="date" defaultValue="2025-04-01" />
                <Input type="date" defaultValue="2025-04-10" />

                <Button className="bg-blue-600 hover:bg-blue-700">Show</Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>VLCC USER ID</TableHead>
                      <TableHead>DATE</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>TOTAL LITERS</TableHead>
                      <TableHead>COMMISSION PER LITER</TableHead>
                      <TableHead>TS Deduction</TableHead>
                      <TableHead>TOTAL AMOUNT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissionReportData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.vlccUserId}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.shift}</TableCell>
                        <TableCell>{row.totalLiters}</TableCell>
                        <TableCell>{row.commissionPerLiter}</TableCell>
                        <TableCell className={row.tsDeduction.includes('-') ? 'text-red-600' : 'text-green-600'}>{row.tsDeduction}</TableCell>
                        <TableCell className="font-semibold">{row.totalAmount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Entries</p>
                    <p className="text-2xl font-bold text-gray-900">3</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Liters</p>
                    <p className="text-2xl font-bold text-blue-600">105560</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Net Amount</p>
                    <p className="text-2xl font-bold text-green-600">₹99,200.00</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button className="bg-blue-600 hover:bg-blue-700">Excel Export</Button>
                <Button variant="destructive">PDF Export</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
      
    </>
  )
}

export default VlcCommissionReport
