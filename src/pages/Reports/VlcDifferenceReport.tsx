
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const VlcDifferenceReport = () => {
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();

  const vlccDifferenceData = [
    { userId: "RV001", collectionWeight: "980", collectionFat: "3.4", collectionSNF: "8.4", collectionAmount: "33,320", milkWeight: "977", milkFat: "3.4", milkSNF: "8.4", milkAmount: "33,218", diffWeight: "-3.00", diffFat: "0.0", diffSNF: "0.0", diffAmount: "-102" },
    { userId: "RV002", collectionWeight: "1180", collectionFat: "3.6", collectionSNF: "8.6", collectionAmount: "42,480", milkWeight: "1180", milkFat: "3.7", milkSNF: "8.8", milkAmount: "42,716", diffWeight: "0.00", diffFat: "+0.10", diffSNF: "+0.20", diffAmount: "+236" },
    { userId: "RV003", collectionWeight: "930", collectionFat: "3.3", collectionSNF: "8.3", collectionAmount: "29,760", milkWeight: "930", milkFat: "3.3", milkSNF: "8.3", milkAmount: "29,760", diffWeight: "0.00", diffFat: "0.00", diffSNF: "0.00", diffAmount: "0.00" }
  ];

  return (
    <div className="p-6">
      <Tabs defaultValue="difference" className="w-full">
        <TabsContent value="difference" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>VLCC Difference Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="VLC Name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="green-valley">Green Valley</SelectItem>
                  </SelectContent>
                </Select>

                <Input type="date" defaultValue="2025-04-21" />

                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>

                <Button className="bg-blue-600 hover:bg-blue-700">Show</Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead rowSpan={2} className="text-center border-r">User ID</TableHead>
                      <TableHead colSpan={4} className="text-center border-r">VLCC Collection Data</TableHead>
                      <TableHead colSpan={4} className="text-center border-r">VLCC Milk Entry</TableHead>
                      <TableHead colSpan={4} className="text-center">Difference (Collection - Milk)</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead>Weight</TableHead>
                      <TableHead>Fat</TableHead>
                      <TableHead>SNF</TableHead>
                      <TableHead className="border-r">Amount</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Fat</TableHead>
                      <TableHead>SNF</TableHead>
                      <TableHead className="border-r">Amount</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Fat</TableHead>
                      <TableHead>SNF</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vlccDifferenceData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium border-r">{row.userId}</TableCell>
                        <TableCell>{row.collectionWeight}</TableCell>
                        <TableCell>{row.collectionFat}</TableCell>
                        <TableCell>{row.collectionSNF}</TableCell>
                        <TableCell className="border-r">{row.collectionAmount}</TableCell>
                        <TableCell>{row.milkWeight}</TableCell>
                        <TableCell>{row.milkFat}</TableCell>
                        <TableCell>{row.milkSNF}</TableCell>
                        <TableCell className="border-r">{row.milkAmount}</TableCell>
                        <TableCell className={row.diffWeight.startsWith('-') ? 'text-red-600' : row.diffWeight.startsWith('+') ? 'text-green-600' : ''}>{row.diffWeight}</TableCell>
                        <TableCell className={row.diffFat.startsWith('-') ? 'text-red-600' : row.diffFat.startsWith('+') ? 'text-green-600' : ''}>{row.diffFat}</TableCell>
                        <TableCell className={row.diffSNF.startsWith('-') ? 'text-red-600' : row.diffSNF.startsWith('+') ? 'text-green-600' : ''}>{row.diffSNF}</TableCell>
                        <TableCell className={row.diffAmount.startsWith('-') ? 'text-red-600' : row.diffAmount.startsWith('+') ? 'text-green-600' : ''}>{row.diffAmount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
  );
};

export default VlcDifferenceReport;

