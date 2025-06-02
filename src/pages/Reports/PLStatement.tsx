import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PLStatement = () => {
  const reportData = [
    {
      billPeriod: "01-05-2025 to10-05-2025",
      noOfVlc: 2,
      vlcCollection: "90,850.42",
      vlcAmount: "2,90,72,713.44",
      vlcCommission: "90,850.42",
      totalAmount: "2,99,80,863.86",
      dispatchInLiter: "90,840.95",
      amount: "30,88,592.30",
      profitLoss: "90,528.44",
      profitLossClass: "text-green-600"
    },
    {
      billPeriod: "11-05-2025 to 20-05-2025",
      noOfVlc: 2,
      vlcCollection: "90,000.00",
      vlcAmount: "25,38,000.00",
      vlcCommission: "90,000.00",
      totalAmount: "26,28,000.00",
      dispatchInLiter: "90,000.00",
      amount: "25,83,000.00",
      profitLoss: "-45,000.00",
      profitLossClass: "text-red-600"
    },
    {
      billPeriod: "21-05-2025 to 31-05-2025",
      noOfVlc: 3,
      vlcCollection: "1,02,505.56",
      vlcAmount: "32,28,925.14",
      vlcCommission: "88,154.78",
      totalAmount: "33,17,079.92",
      dispatchInLiter: "1,02,478.60",
      amount: "33,81,793.80",
      profitLoss: "64,713.88",
      profitLossClass: "text-green-600"
    }
  ];

  const totals = {
    noOfVlc: 7,
    vlcCollection: "2,83,355.98",
    vlcAmount: "3,48,39,638.58",
    vlcCommission: "2,69,005.20",
    totalAmount: "3,59,25,943.78",
    dispatchInLiter: "2,83,319.55",
    amount: "90,53,386.10",
    profitLoss: "1,10,242.32"
  };

  const summaryCards = [
    { title: "Total VLC Collection", value: "2,83,355.98" },
    { title: "Total Amount", value: "3,59,25,943.78" },
    { title: "Total Dispatch", value: "2,83,319.55" },
    { title: "Net Profit/Loss", value: "1,10,242.32", color: "text-green-600" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit/Loss Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex gap-4 items-center">
            <Input type="date" defaultValue="2024-01-01" />
            <span>-</span>
            <Input type="date" defaultValue="2024-01-10" />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">Show Report</Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
              PDF
            </Button>
            <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
              Excel
            </Button>
            <Button variant="outline">Print</Button>
            <Button variant="outline">Refresh</Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="border rounded-lg overflow-x-auto">
          <div className="min-w-[1200px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="whitespace-nowrap">Bill period</TableHead>
                  <TableHead className="text-center whitespace-nowrap">no of vlc</TableHead>
                  <TableHead className="text-center whitespace-nowrap">vlc collection</TableHead>
                  <TableHead className="text-center whitespace-nowrap">vlc amount</TableHead>
                  <TableHead className="text-center whitespace-nowrap">vlc commission</TableHead>
                  <TableHead className="text-center whitespace-nowrap">total amount</TableHead>
                  <TableHead className="text-center whitespace-nowrap">dispatch in liter</TableHead>
                  <TableHead className="text-center whitespace-nowrap">amount</TableHead>
                  <TableHead className="text-center whitespace-nowrap">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{row.billPeriod}</TableCell>
                    <TableCell className="text-center">{row.noOfVlc}</TableCell>
                    <TableCell className="text-center">{row.vlcCollection}</TableCell>
                    <TableCell className="text-center">{row.vlcAmount}</TableCell>
                    <TableCell className="text-center">{row.vlcCommission}</TableCell>
                    <TableCell className="text-center">{row.totalAmount}</TableCell>
                    <TableCell className="text-center">{row.dispatchInLiter}</TableCell>
                    <TableCell className="text-center">{row.amount}</TableCell>
                    <TableCell className={`text-center font-semibold ${row.profitLossClass}`}>
                      {row.profitLoss}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-gray-100 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{totals.noOfVlc}</TableCell>
                  <TableCell className="text-center">{totals.vlcCollection}</TableCell>
                  <TableCell className="text-center">{totals.vlcAmount}</TableCell>
                  <TableCell className="text-center">{totals.vlcCommission}</TableCell>
                  <TableCell className="text-center">{totals.totalAmount}</TableCell>
                  <TableCell className="text-center">{totals.dispatchInLiter}</TableCell>
                  <TableCell className="text-center">{totals.amount}</TableCell>
                  <TableCell className="text-center text-green-600">{totals.profitLoss}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => (
            <Card key={index} className="bg-gray-50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                  <p className={`text-xl font-bold ${card.color || 'text-gray-900'}`}>
                    {card.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PLStatement;
