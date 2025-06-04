import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const farmers = [
  {
    id: "001",
    name: "John Smith",
    contact: "+91 98765 43210",
    village: "Green Valley",
    userId: "RV0001",
  },
  {
    id: "002",
    name: "Mary Johnson",
    contact: "+91 98765 43211",
    village: "Riverside",
    userId: "RV0001",
  },
  {
    id: "003",
    name: "Robert Wilson",
    contact: "+91 98765 43212",
    village: "Hillside",
    userId: "RV0001",
  },
  {
    id: "004",
    name: "Sarah Davis",
    contact: "+91 98765 43213",
    village: "Lakeside",
    userId: "RV0001",
  },
  {
    id: "005",
    name: "Michael Brown",
    contact: "+91 98765 43214",
    village: "Mountain View",
    userId: "RV0001",
  },
  {
    id: "006",
    name: "Emma Taylor",
    contact: "+91 98765 43215",
    village: "Sunnydale",
    userId: "RV0001",
  },
  {
    id: "007",
    name: "James Anderson",
    contact: "+91 98765 43216",
    village: "Pine Grove",
    userId: "RV0001",
  },
  {
    id: "008",
    name: "Patricia Martinez",
    contact: "+91 98765 43217",
    village: "Oak Ridge",
    userId: "RV0001",
  },
  {
    id: "009",
    name: "David Thompson",
    contact: "+91 98765 43218",
    village: "Cedar Hills",
    userId: "RV0001",
  },
  {
    id: "010",
    name: "Linda Garcia",
    contact: "+91 98765 43219",
    village: "Maple Woods",
    userId: "RV0001",
  },
];

const FarmerList = () => {
  const [selectedVlcc, setSelectedVlcc] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(50 / itemsPerPage);

  return (
    <div className="p-6 text-left">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Farmer List</h1>
        <p className="text-gray-600">Manage and view all farmers</p>
      </div>
      <div className="flex gap-5 mb-5">
        <Select value={selectedVlcc} onValueChange={setSelectedVlcc}>
          <SelectTrigger className="w-40 border-gray-300">
            <SelectValue placeholder="Select VLCC" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All VLCCs</SelectItem>
            <SelectItem value="green-valley">Green Valley VLCC</SelectItem>
            <SelectItem value="riverside">Riverside VLCC</SelectItem>
          </SelectContent>
        </Select>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white w-[150px]">
          Show
        </Button>
      </div>
      <div className="border border-gray-200 rounded-lg p-2">
        <Table className="">
          <TableHeader className="">
            <TableRow className="bg-gray-200">
              <TableHead>Farmer ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact Number</TableHead>
              <TableHead>Village</TableHead>
              <TableHead>User ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {farmers.map((farmer) => (
              <TableRow key={farmer.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{farmer.id}</TableCell>
                <TableCell>{farmer.name}</TableCell>
                <TableCell>{farmer.contact}</TableCell>
                <TableCell>{farmer.village}</TableCell>
                <TableCell>{farmer.userId}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Showing 1-10 of 50 items
            </span>
          </div>

          <div className="flex items-center gap-2 ">
            <Button
              variant="default"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border border-gray-400 "
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {[1, 2, 3].map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "outline" : "default"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  currentPage === page &&
                    "bg-blue-600 hover:bg-blue-700 border-none"
                )}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="default"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="border border-gray-400 "
            >
              <ChevronRight className="h-4 w-4 " />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          Excel Export
        </Button>
        <Button variant="default" className="bg-red-500 text-white">
          PDF Export
        </Button>
      </div>
    </div>
  );
};
export default FarmerList;
