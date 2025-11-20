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

export const WebApplication: React.FC = () => {
  const [webUsers, setWebUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchMobile, setSearchMobile] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => {
    fetchWebUsers();
  }, []);

  const fetchWebUsers = async () => {
    try {
      const { data } = await adminApi.getAllUsers();
      if (data.success) {
        const userData = data.data.webUsers || [];
        setWebUsers(userData);
        setFilteredUsers(userData);
      }
    } catch (error) {
      toast.error('Failed to fetch web users');
    }
  };

  const handleSearch = () => {
    if (!searchMobile.trim()) {
      setFilteredUsers(webUsers);
      setCurrentPage(1);
      return;
    }
    const filtered = webUsers.filter((u) => 
      u.mobile_number?.includes(searchMobile.trim())
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const paginatedData = filteredUsers.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );
  const totalPages = Math.ceil(filteredUsers.length / perPage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Web Applications</h2>
        
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
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Mobile Number</TableHead>
                <TableHead className="font-semibold">Branches</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{user.name || '-'}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.mobile_number || '-'}</TableCell>
                  <TableCell>{user.branches?.join(', ') || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {filteredUsers.length > 0 ? (currentPage - 1) * perPage + 1 : 0} to {Math.min(currentPage * perPage, filteredUsers.length)} of {filteredUsers.length} entries
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
