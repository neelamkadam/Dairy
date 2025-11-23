import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardsProps {
  className?: string;
  data?: {
    totalBillAmount: number;
    totalDeductions: number;
    totalFinalAmount: number;
    remainingBalance: number;
  };
}

const SummaryCards = ({ className, data }: SummaryCardsProps) => {
  const summaryData = [
    {
      title: "Total Bill Amount",
      amount: `₹${(data?.totalBillAmount || 0).toFixed(2)}`,
      color: "text-blue-600",
    },
    {
      title: "Total Deductions",
      amount: `₹${(data?.totalDeductions || 0).toFixed(2)}`,
      color: "text-blue-600",
    },
    {
      title: "Total Final Amount",
      amount: `₹${(data?.totalFinalAmount || 0).toFixed(2)}`,
      color: "text-blue-600",
    },
    {
      title: "Remaining Balance",
      amount: `₹${(data?.remainingBalance || 0).toFixed(2)}`,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="bg-white">
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-2 ${className}`}
      >
        {summaryData.map((item, index) => (
          <Card
            key={index}
            className={`bg-white shadow-sm border border-gray-200 `}
          >
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 mb-2">{item.title}</div>
              <div className={`text-2xl font-bold ${item.color}`}>
                {item.amount}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SummaryCards;
