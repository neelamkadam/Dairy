import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      totalAmount: 568.75,
    },
    {
      date: "2024-01-02",
      shift: "Evening",
      literPerDay: 11.8,
      fatPerDay: 3.9,
      snfPerDay: 8.6,
      clrPerDay: 29.8,
      rate: 45.5,
      totalAmount: 536.9,
    },
    {
      date: "2024-01-03",
      shift: "Morning",
      literPerDay: 13.2,
      fatPerDay: 3.7,
      snfPerDay: 8.4,
      clrPerDay: 29.3,
      rate: 45.5,
      totalAmount: 600.6,
    },
  ];

  const summary = {
    totalLiters: 37.5,
    totalAmount: 1705.55,
    remainingBalance: 500.0,
  };

  const deductions = {
    currentCattleFeed: 300.0,
    currentAdvance: 200.0,
    totalDeduction: 500.0,
  };

  const netPayableAmount = 356.25;

  return (
    <div className="space-y-6 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded">
            <svg
              className="w-6 h-6 text-blue-950"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-950">DairyConnect</h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-blue-950">April 22, 2025</p>
        </div>
      </div>
      <div className="text-center mt-3.5">
        <h2 className="text-2xl font-bold text-gray-800">
          Farmer Bill Invoice
        </h2>
      </div>

      {/* Input Form */}
      <div className="bg-gray-100 p-6 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <Label htmlFor="vlccName" className="mb-1">
              VLCC Name
            </Label>
            <Input
              id="vlccName"
              placeholder="Enter VLCC Name"
              value={vlccName}
              onChange={(e) => setVlccName(e.target.value)}
              className="bg-white border-gray-200"
            />
          </div>
          <div>
            <Label htmlFor="farmerId" className="mb-1">
              Farmer ID
            </Label>
            <Input
              id="farmerId"
              placeholder="Enter Farmer ID"
              value={farmerId}
              onChange={(e) => setFarmerId(e.target.value)}
              className="bg-white border-gray-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label htmlFor="fromDate" className="mb-1">
                From Date
              </Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-white border-gray-200"
              />
            </div>
            <div>
              <Label htmlFor="toDate" className="mb-1">
                To Date
              </Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-white border-gray-200"
              />
            </div>
          </div>
        </div>
        <div className="text-left">
          <Button className="bg-blue-950 hover:bg-blue-900 text-white">
            Generate Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="border border-gray-200 overflow-x-auto">
        <div className="min-w-[850px]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 ">
                <th className="p-3 text-center border-r border-gray-200 last:border-r-0">
                  Date
                </th>
                <th className="p-3 text-center border-r border-gray-200 last:border-r-0">
                  Shift
                </th>
                <th className="p-3 text-center border-r border-gray-200 last:border-r-0">
                  Liter Per Day
                </th>
                <th className="p-3 text-center border-r border-gray-200 last:border-r-0">
                  FAT/Day
                </th>
                <th className="p-3 text-center border-r border-gray-200 last:border-r-0">
                  SNF/Day
                </th>
                <th className="p-3 text-center border-r border-gray-200 last:border-r-0">
                  CLR/Day
                </th>
                <th className="p-3 text-center border-r border-gray-200 last:border-r-0">
                  Rate
                </th>
                <th className="p-3 text-center border-r border-gray-200 last:border-r-0">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.map((row, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-200 hover:bg-gray-50 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-25"
                  }`}
                >
                  <td className="p-3 text-center border-r border-gray-200 last:border-r-0">
                    {row.date}
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 last:border-r-0">
                    {row.shift}
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 last:border-r-0">
                    {row.literPerDay}
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 last:border-r-0">
                    {row.fatPerDay}
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 last:border-r-0">
                    {row.snfPerDay}
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 last:border-r-0">
                    {row.clrPerDay}
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 last:border-r-0">
                    {row.rate}
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 last:border-r-0">
                    ₹{row.totalAmount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary and Deductions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Summary */}
        <div className=" p-4 bg-white rounded-lg border border-gray-200 text-left">
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
        <div className=" p-4 bg-white rounded-lg border border-gray-200 text-left">
          <h3 className="font-semibold mb-3">Deductions</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Current Cattle Feed:</span>
              <span className="font-semibold">
                ₹{deductions.currentCattleFeed}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Current Advance:</span>
              <span className="font-semibold">
                ₹{deductions.currentAdvance}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Deduction:</span>
              <span>₹{deductions.totalDeduction}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Payable Amount */}
      <div className="bg-blue-950 text-white p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Net Payable Amount</h3>
          <div className="text-lg font-bold">₹{netPayableAmount}</div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
          PDF Export
        </Button>
      </div>
    </div>
  );
};

export default FarmerBillInvoiceReport;
