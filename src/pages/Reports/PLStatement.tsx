import { Card, CardContent} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PrintIcon from '@mui/icons-material/Print';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

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
   <>
   <div className="w-full h-screen bg-white">
   <h1 className="font-bold text-left text-lg p-4">Profit/Loss Report</h1>
      {/* Date Range Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-end p-4">
          <div className="flex gap-4 items-center">
            <Input type="date" defaultValue="2024-01-01" className="border-gray-200" />
            <span>-</span>
            <Input type="date" className="border-gray-200"  defaultValue="2024-01-10" />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Show Report</Button>
          <div className="ml-auto flex gap-2">
            <Button variant="default" className=" bg-gray-200 hover:bg-red-50">
              <PictureAsPdfIcon className="text-red-500"/>PDF
            </Button>
            <Button variant="default" className="bg-gray-200 hover:bg-green-50">
              Excel
            </Button>
            <Button variant="default" className="bg-gray-200"><PrintIcon className="text-gray-700"/>Print</Button>
            <Button variant="default" className="bg-gray-200"><AutorenewIcon className="text-gray-700"/>Refresh</Button>
          </div>
        </div>
        {/* Data Table */}
        <div className="border border-gray-200 rounded-lg overflow-x-auto m-4">
          <div className="min-w-[1200px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-left whitespace-nowrap font-semibold">Bill period</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold">no of vlc</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold">vlc collection</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold">vlc amount</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold">vlc commission</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold">total amount</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold">dispatch in liter</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold">amount</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-left">{row.billPeriod}</TableCell>
                    <TableCell className="text-right">{row.noOfVlc}</TableCell>
                    <TableCell className="text-right">{row.vlcCollection}</TableCell>
                    <TableCell className="text-right">{row.vlcAmount}</TableCell>
                    <TableCell className="text-right">{row.vlcCommission}</TableCell>
                    <TableCell className="text-right">{row.totalAmount}</TableCell>
                    <TableCell className="text-right">{row.dispatchInLiter}</TableCell>
                    <TableCell className="text-right">{row.amount}</TableCell>
                    <TableCell className={`text-right font-semibold ${row.profitLossClass}`}>
                      {row.profitLoss}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-gray-100 font-semibold">
                  <TableCell className="text-left">Total</TableCell>
                  <TableCell className="text-right">{totals.noOfVlc}</TableCell>
                  <TableCell className="text-right">{totals.vlcCollection}</TableCell>
                  <TableCell className="text-right">{totals.vlcAmount}</TableCell>
                  <TableCell className="text-right">{totals.vlcCommission}</TableCell>
                  <TableCell className="text-right">{totals.totalAmount}</TableCell>
                  <TableCell className="text-right">{totals.dispatchInLiter}</TableCell>
                  <TableCell className="text-right">{totals.amount}</TableCell>
                  <TableCell className="text-right text-green-600">{totals.profitLoss}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 m-4">
          {summaryCards.map((card, index) => (
            <Card key={index} className="border border-gray-200 bg-gray-50" >
              <CardContent className="p-4">
                <div className="text-left">
                  <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                  <p className={`text-xl font-bold ${card.color || 'text-gray-900'}`}>
                    {card.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
    </div>
   </>
  );
};

export default PLStatement;
