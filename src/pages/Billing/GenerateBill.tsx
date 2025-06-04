import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, ChevronLeft } from "lucide-react";

const GenerateBill = () => {
  const [billCycle, setBillCycle] = useState("1 May 2024 - 31 May 2024");

  const farmersData = [
    {
      id: "F001",
      name: "John Smith",
      liter: "450L",
      amount: "$675",
      advance: "$100",
      cattleFeed: "$150",
      netPayable: "$425",
    },
    {
      id: "F002",
      name: "Mary Johnson",
      liter: "320L",
      amount: "$480",
      advance: "$75",
      cattleFeed: "$200",
      netPayable: "$205",
    },
    {
      id: "F003",
      name: "Robert Davis",
      liter: "580L",
      amount: "$870",
      advance: "$150",
      cattleFeed: "$180",
      netPayable: "$540",
    },
    {
      id: "F004",
      name: "Sarah Wilson",
      liter: "290L",
      amount: "$435",
      advance: "$80",
      cattleFeed: "$120",
      netPayable: "$235",
    },
  ];

  const totals = {
    totalAmount: "$4100",
    totalDeduction: "$1640",
    totalNetPayable: "$2460",
  };

  const handleGenerateBill = () => {
    // toast({
    //   title: "Bill Generated Successfully",
    //   description: "The bill has been generated for the selected period.",
    // });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-4">
              <div>
                <ChevronLeft size={20} strokeWidth={1.25} />
              </div>
              <div>
                <h1 className="text-2xl text-left font-bold text-gray-900">
                  Generate Bill
                </h1>
                <p className="text-gray-600">Dashboard / Generate Bill</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className=" max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left bg-white">
        <Card className="mb-5 border-none">
          <CardHeader>
            <CardTitle>Select Bill Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Label htmlFor="billCycle" className="sr-only">
                Bill Cycle
              </Label>
              <div className="relative flex-1  w-full">
                <Input
                  id="billCycle"
                  value={billCycle}
                  onChange={(e) => setBillCycle(e.target.value)}
                  className="pr-10 border-gray-300"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </CardContent>
          <CardContent className="p-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 ">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Farmer ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Liter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Advance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cattle Feed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Payable
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {farmersData.map((farmer) => (
                    <tr key={farmer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {farmer.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farmer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farmer.liter}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farmer.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farmer.advance}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farmer.cattleFeed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {farmer.netPayable}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <div className="flex gap-55">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Total Amount
                    </span>
                    <p className="text-lg font-bold text-gray-900">
                      {totals.totalAmount}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Total Deduction
                    </span>
                    <p className="text-lg font-bold text-gray-900">
                      {totals.totalDeduction}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Total Net Payable
                    </span>
                    <p className="text-lg font-bold text-gray-900">
                      {totals.totalNetPayable}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full text-center">
              <Button
                onClick={handleGenerateBill}
                className="bg-blue-600 hover:bg-blue-700 text-white w-[17%]"
              >
                Generate Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default GenerateBill;
