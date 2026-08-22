import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

export const FarmerApplication: React.FC = () => {
  const { t } = useTranslation();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    try {
      const { data } = await adminApi.getAllUsers();
      if (data.success) {
        const farmerData = data.data.farmers || [];
        setFarmers(farmerData);
        setFilteredFarmers(farmerData);
      }
    } catch (error) {
      toast.error(t("failed_to_fetch_farmers", 'Failed to fetch farmers'));
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredFarmers(farmers);
      setCurrentPage(1);
      return;
    }
    const term = searchTerm.trim().toLowerCase();
    const filtered = farmers.filter((f) => 
      String(f.username || '').toLowerCase().includes(term) ||
      String(f.fullName || '').toLowerCase().includes(term) ||
      String(f.mobile_number || '').toLowerCase().includes(term) ||
      String(f.email || '').toLowerCase().includes(term) ||
      String(f.milkType || '').toLowerCase().includes(term) ||
      String(f.address || '').toLowerCase().includes(term)
    );
    setFilteredFarmers(filtered);
    setCurrentPage(1);
  };

  const paginatedData = filteredFarmers.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );
  const totalPages = Math.ceil(filteredFarmers.length / perPage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t("farmer_applications", "Farmer Applications")}</h2>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder={t("search", "Search...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <span className="text-sm text-gray-600">{t("per_page", "per page")}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t("username", "Username")}</TableHead>
                <TableHead className="font-semibold">{t("full_name", "Full Name")}</TableHead>
                <TableHead className="font-semibold">{t("mobile_number", "Mobile Number")}</TableHead>
                <TableHead className="font-semibold">{t("email", "Email")}</TableHead>
                <TableHead className="font-semibold">{t("milk_type", "Milk Type")}</TableHead>
                <TableHead className="font-semibold">{t("address", "Address")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((farmer) => (
                <TableRow key={farmer.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{farmer.username || '-'}</TableCell>
                  <TableCell>{farmer.fullName || '-'}</TableCell>
                  <TableCell>{farmer.mobile_number || '-'}</TableCell>
                  <TableCell>{farmer.email || '-'}</TableCell>
                  <TableCell>{farmer.milkType || '-'}</TableCell>
                  <TableCell>{farmer.address || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            {t("showing_entries", "Showing {{start}} to {{end}} of {{total}} entries", { 
              start: filteredFarmers.length > 0 ? (currentPage - 1) * perPage + 1 : 0, 
              end: Math.min(currentPage * perPage, filteredFarmers.length), 
              total: filteredFarmers.length 
            })}
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
            <span className="text-sm text-gray-600">
              {t("page_of", "Page {{current}} of {{total}}", { current: currentPage, total: totalPages || 1 })}
            </span>
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
