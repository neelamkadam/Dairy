import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, FileSpreadsheet, Search, Users, TrendingUp, DollarSign } from "lucide-react";

interface VLCCData {
  id: string;
  name: string;
  totalMilkLtr: number;
  totalMilkKg: number;
  milkType: string;
  status: "Active" | "Inactive";
}

const BMCCllection = () => {
   const [toDate, setToDate] = useState<Date>();
   const [fromDate, setFromDate] = useState<Date>();

    const vlccData: VLCCData[] = [
    { id: "F001", name: "John Smith", totalMilkLtr: 51, totalMilkKg: 50, milkType: "Cow", status: "Active" },
    { id: "F002", name: "Mary Johnson", totalMilkLtr: 21, totalMilkKg: 20, milkType: "Cow", status: "Inactive" },
    { id: "F003", name: "Robert Wilson", totalMilkLtr: 30, totalMilkKg: 30, milkType: "Cow", status: "Active" }
  ];

  const stats = [
    { label: "Total Farmers", value: "42", icon: Users, color: "bg-blue-500" },
    { label: "Active Farmers", value: "38", icon: TrendingUp, color: "bg-green-500" },
    { label: "New This Month", value: "5", icon: Users, color: "bg-orange-500" }
  ];

  const centerStats = [
    { label: "VLCC Center", value: "10", change: "+12%", icon: Users, color: "bg-orange-400" },
    { label: "Total Milk Collection", value: "2,450L", change: "+5%", icon: TrendingUp, color: "bg-orange-400" },
    { label: "Average Fat %", value: "3.5", change: "+8%", icon: TrendingUp, color: "bg-orange-400" },
    { label: "Average SNF %", value: "8.5", change: "+8%", icon: TrendingUp, color: "bg-orange-400" },
    { label: "Total Payments", value: "$12,450", change: "+15%", icon: DollarSign, color: "bg-orange-400" }
  ];
  return (
    <>
      <div className="space-y-6  animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-lg m-3 font-semibold text-gray-800 text-center">Center Selection</div>
            <hr className="text-gray-300"/>
            <div className="text-lg font-semibold text-left text-gray-700 m-5">BMC Center</div>
            
            {/* Center Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 m-5">
              {centerStats.map((stat, index) => (
                <Card key={index} className={cn("hover:shadow-lg transition-all duration-300 border-0", stat.color)}>
                  <CardContent className="p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                        <p className="text-sm opacity-75 mt-1">{stat.change}</p>
                      </div>
                      <stat.icon className="h-6 w-6 opacity-80" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm text-left w-[85%] m-auto">
              <CardHeader>
                <CardTitle className="text-lg">User Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 ">
                    <label className="text-sm font-medium text-gray-700">VLC Name</label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder="All"/>
                      </SelectTrigger>
                      <SelectContent className="bg-white" >
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="vlcc1">VLCC 1</SelectItem>
                        <SelectItem value="vlcc2">VLCC 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Milk Type</label>
                    <Select defaultValue="cow">
                      <SelectTrigger>
                        <SelectValue placeholder="Cow" />
                      </SelectTrigger>
                      <SelectContent className="bg-white" >
                        <SelectItem value="cow">Cow</SelectItem>
                        <SelectItem value="buffalo">Buffalo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Shift</label>
                    <Select defaultValue="morning">
                      <SelectTrigger>
                        <SelectValue placeholder="Morning" />
                      </SelectTrigger>
                      <SelectContent className="bg-white" >
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">From Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal ">
                          <CalendarIcon className="mr-2 h-4 w-4 " />
                          {fromDate ? format(fromDate, "dd-MM-yyyy") : "21-04-2025"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={fromDate}
                          onSelect={setFromDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">To Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? format(toDate, "dd-MM-yyyy") : "21-04-2025"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={toDate}
                          onSelect={setToDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Submit
                </Button>
              </CardContent>
            </Card>

            {/* VLCC List */}
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm w-[85%] m-auto mt-2">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">BMC List</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search farmers..." className="pl-10 w-64" />
                    </div>
                    <Button variant="outline" size="sm">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-700">VLCC ID</th>
                        <th className="text-left p-4 font-medium text-gray-700">VLCC Name</th>
                        <th className="text-left p-4 font-medium text-gray-700">Total Milk (Ltr)</th>
                        <th className="text-left p-4 font-medium text-gray-700">Total Milk (Kg)</th>
                        <th className="text-left p-4 font-medium text-gray-700">Milk Type</th>
                        <th className="text-left p-4 font-medium text-gray-700">Status</th>
                        <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vlccData.map((vlcc) => (
                        <tr key={vlcc.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-blue-600 font-medium">{vlcc.id}</td>
                          <td className="p-4 text-blue-600 font-medium">{vlcc.name}</td>
                          <td className="p-4 text-gray-700">{vlcc.totalMilkLtr} Ltr</td>
                          <td className="p-4 text-gray-700">{vlcc.totalMilkKg} Kg</td>
                          <td className="p-4">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {vlcc.milkType}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={vlcc.status === "Active" ? "default" : "secondary"}
                              className={vlcc.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                            >
                              {vlcc.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Button variant="ghost" size="sm">
                              •••
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center p-4 border-t bg-gray-50/50">
                  <div className="text-sm text-gray-600">Showing 1 to 3 of 42 entries</div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm">Previous</Button>
                    <Button variant="default" size="sm" className="bg-blue-600">1</Button>
                    <Button variant="outline" size="sm">2</Button>
                    <Button variant="outline" size="sm">3</Button>
                    <Button variant="outline" size="sm">Next</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

    </>
  )
}

export default BMCCllection
