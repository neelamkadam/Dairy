import React, { useState, useEffect } from 'react';
import { adminApi } from '@/services/adminApi';
import { toast } from 'react-toastify';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const MobileApplication: React.FC = () => {
  const [managers, setManagers] = useState<any[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<any[]>([]);
  const [dairyAdmins, setDairyAdmins] = useState<any[]>([]);
  const [searchMobile, setSearchMobile] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const { data } = await adminApi.getAllUsers();
      if (data.success) {
        const managerData = data.data.dairyManagers || [];
        const adminData = data.data.dairyAdmins || [];
        setDairyAdmins(adminData);
        setManagers(managerData);
        setFilteredManagers(managerData);
      }
    } catch (error) {
      toast.error('Failed to fetch managers');
    }
  };

  const getAdminMobile = (createdBy: string) => {
    const admin = dairyAdmins.find((a) => a.id.toString() === createdBy);
    return admin?.mobile_number || '-';
  };

  const handleSearch = () => {
    if (!searchMobile.trim()) {
      setFilteredManagers(managers);
      setCurrentPage(1);
      return;
    }
    const filtered = managers.filter((m) => 
      m.mobile_number?.includes(searchMobile.trim())
    );
    setFilteredManagers(filtered);
    setCurrentPage(1);
  };

  const paginatedData = filteredManagers.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );
  const totalPages = Math.ceil(filteredManagers.length / perPage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Mobile Applications</h2>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search by mobile number"
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-sm"
            />
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={perPage.toString()} onValueChange={(v) => { setPerPage(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Username</TableHead>
                <TableHead className="font-semibold">Dairy ID</TableHead>
                <TableHead className="font-semibold">Mobile Number</TableHead>
                <TableHead className="font-semibold">Branch Name</TableHead>
                <TableHead className="font-semibold">Owner Name</TableHead>
                <TableHead className="font-semibold">Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((manager) => (
                <TableRow key={manager.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{manager.username || '-'}</TableCell>
                  <TableCell>{manager.id || '-'}</TableCell>
                  <TableCell>{getAdminMobile(manager.createdby)}</TableCell>
                  <TableCell>{manager.branchname || '-'}</TableCell>
                  <TableCell>{manager.ownername || '-'}</TableCell>
                  <TableCell>{manager.address || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {filteredManagers.length > 0 ? (currentPage - 1) * perPage + 1 : 0} to {Math.min(currentPage * perPage, filteredManagers.length)} of {filteredManagers.length} entries
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages || 1}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
