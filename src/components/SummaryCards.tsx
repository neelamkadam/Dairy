import { Card, CardContent } from "@/components/ui/card";

const SummaryCards = ({ className }: any) => {
  const summaryData = [
    {
      title: "Total Bill Amount",
      amount: "₹14400.00",
      color: "text-blue-600",
    },
    {
      title: "Total Deductions",
      amount: "₹3062.00",
      color: "text-blue-600",
    },
    {
      title: "Total Final Amount",
      amount: "₹11338.00",
      color: "text-blue-600",
    },
    {
      title: "Remaining Balance",
      amount: "₹3000.00",
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
