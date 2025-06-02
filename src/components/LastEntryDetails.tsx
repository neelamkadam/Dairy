
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LastEntryDetails = () => {
  // Mock data for the last entry
  const lastEntry = {
    userId: "VLC123",
    vlcName: "Central Dairy",
    weight: "25.50",
    fat: "3.5",
    snf: "8.5",
    clr: "29.5"
  };

  return (
    <Card className="w-full shadow-lg border-0 bg-white mb-5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-800 text-left">
          Last Entry Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-600">User ID: </span>
              <span className="text-sm font-medium text-gray-800">{lastEntry.userId}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Weight: </span>
              <span className="text-sm font-medium text-gray-800">{lastEntry.weight} kg</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">SNF: </span>
              <span className="text-sm font-medium text-gray-800">{lastEntry.snf}%</span>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-600">VLC Name: </span>
              <span className="text-sm font-medium text-gray-800">{lastEntry.vlcName}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Fat: </span>
              <span className="text-sm font-medium text-gray-800">{lastEntry.fat}%</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">CLR: </span>
              <span className="text-sm font-medium text-gray-800">{lastEntry.clr}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LastEntryDetails;