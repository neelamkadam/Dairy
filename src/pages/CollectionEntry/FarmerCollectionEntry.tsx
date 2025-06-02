import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Clock ,Calendar as CalendarIcon} from "lucide-react";
import { cn } from "@/lib/utils";
// import { useToast } from "@/hooks/use-toast";

interface FormData {
   vlcName: string;
    date: Date | undefined;
    farmerId: number;
    farmerName: string;
    milkType: string;
    quantity: number;
    fatPercentage: number;
    clr: string;
    snf: string;
    ratePerLtr: number;
}

const FarmerCollectionEntry = () => {
  // const { toast } = useToast();
  const [formData, setFormData] = useState({
    vlcName: "",
    date: new Date(),
    farmerId: "0001",
    farmerName: "FAMR123",
    milkType: "COW",
    quantity: "0.0",
    fatPercentage: "0.0",
    clr: "0.0",
    snf: "0.0",
    ratePerLtr: "",
  });

  
  const handleInputChange = (field: keyof FormData, value: string | Date | undefined) => {
  setFormData((prev) => ({
    ...prev,
    [field]: value,
  }));
};
  // const [totalAmount, setTotalAmount] = useState("₹225.00");

  const recentCollections = [
    { name: "Bobby Brown", time: "10:30 AM", amount: "₹235.00" },
    { name: "Mary Johnson", time: "10:44 AM", amount: "₹175.00" },
    { name: "Brad Brown", time: "11:15 AM", amount: "₹190.00" },
  ];

  const handleSubmit = () => {
    // toast({
    //   title: "Collection Submitted Successfully",
    //   description: "Farmer collection entry has been recorded.",
    // });
  };

  const handleMultipleCollection = () => {
    // toast({
    //   title: "Multiple Collection Mode",
    //   description: "Switched to multiple collection entry mode.",
    // });
  };

  const handleModify = () => {
    // toast({
    //   title: "Modify Mode",
    //   description: "Entry is now in edit mode.",
    // });
  };

  const handleDelete = () => {
    // toast({
    //   title: "Entry Deleted",
    //   description: "Collection entry has been removed.",
    //   variant: "destructive",
    // });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">
              Farmer Collection Entry
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              John Smith
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6  text-left">
          {/* Main Form */}
          <div className="lg:col-span-3">
            <Card className="shadow-sm border-0 shadow-gray-200/50 ">
              <CardContent className="p-6 ">
                <div className="space-y-6 bg-white p-5 rounded-2xl">
                  {/* Top Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 ">
                    <div>
                      <Label
                        htmlFor="vlcName"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        VLC Name
                      </Label>
                      <Select defaultValue="All">
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="All">All</SelectItem>
                          <SelectItem value="VLC1">VLC 1</SelectItem>
                          <SelectItem value="VLC2">VLC 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="">
                      <Label
                        htmlFor="date"
                        className="text-sm font-medium text-gray-700"
                      >
                        Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-gray-100",
                              !formData.date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.date ? (
                              format(formData.date, "dd-MM-yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 bg-white"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={formData.date}
                            onSelect={(date) => handleInputChange("date",date)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div> 
                  {/* Farmer Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <Label
                        htmlFor="farmerId"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Farmer ID
                      </Label>
                      <Input
                        id="farmerId"
                        value={formData.farmerId}
                        // onChange={(e) =>
                        //   setFormData({ ...formData, farmerId: e.target.value })
                        // }
                        onChange ={(e) => handleInputChange("farmerId", e.target.value)}
                        className="text-center bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="farmerName"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Farmer Name
                      </Label>
                      <Input
                        value={formData.farmerName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            farmerName: e.target.value,
                          })
                        }
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-3">
                      If Collection has been done. Do you want to ?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleMultipleCollection}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm"
                      >
                        Multiple Collection
                      </Button>
                      <Button
                        onClick={handleModify}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-sm"
                      >
                        Modify
                      </Button>
                      <Button
                        onClick={handleDelete}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm"
                      >
                        Delete
                      </Button>
                      <Button
                        variant="secondary"
                        className="px-4 py-2 text-sm bg-gray-400 text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
                <Separator className="my-3" />

                {/* Collection Details */}
                <div className="space-y-6 bg-white p-5 rounded-2xl">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Collection Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label
                        htmlFor="milkType"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Milk Type
                      </Label>
                      <Input
                        value={formData.milkType}
                        onChange={(e) =>
                          setFormData({ ...formData, milkType: e.target.value })
                        }
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="quantity"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Quantity
                      </Label>
                      <Input
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, quantity: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="fatPercentage"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Fat %
                      </Label>
                      <Input
                        value={formData.fatPercentage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fatPercentage: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="clr"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        CLR
                      </Label>
                      <Input
                        value={formData.clr}
                        onChange={(e) =>
                          setFormData({ ...formData, clr: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="snf"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        SNF %
                      </Label>
                      <Input
                        value={formData.snf}
                        onChange={(e) =>
                          setFormData({ ...formData, snf: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="ratePerLtr"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Rate per ltr
                      </Label>
                      <Input
                        value={formData.ratePerLtr}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ratePerLtr: e.target.value,
                          })
                        }
                        placeholder="Enter rate"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Total Amount */}
                <div className="flex w-[85%] justify-between items-center mb-6 p-3 rounded-2xl bg-white">
                  <span className="text-lg font-semibold text-gray-900">
                    Total Amount
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    2222
                  </span>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  className="w-[35%] bg-green-500 hover:bg-green-600 text-white py-3 text-lg font-medium"
                >
                  Submit
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Collections Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-0 shadow-gray-200/50 ">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Recent Collections
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {recentCollections.map((collection, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {collection.name}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {collection.time}
                        </div>
                      </div>
                      <span className="font-semibold text-green-600 text-sm">
                        {collection.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerCollectionEntry;
