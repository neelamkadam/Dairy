import React, { useState, useEffect } from 'react';
import { adminApi } from '@/services/adminApi';
import { toast } from 'react-toastify';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TrialCalendarModal } from './components/TrialCalendarModal';
import { addDays, isPast, startOfDay } from 'date-fns';

export const Activation: React.FC = () => {
  const [dairies, setDairies] = useState<any[]>([]);
  const [filteredDairies, setFilteredDairies] = useState<any[]>([]);
  const [searchMobile, setSearchMobile] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');

  useEffect(() => {
    fetchDairies();
  }, []);

  const fetchDairies = async () => {
    try {
      const { data } = await adminApi.getAllUsers();
      if (data.success) {
        let dairyData = data.data.dairyManagers || [];
        
        // Fetch trial details for all users in bulk
        const usernames = dairyData.map((d: any) => d.username).filter(Boolean);
        if (usernames.length > 0) {
          try {
            const { data: trialData } = await adminApi.getTrialDetails({ usernames });
            if (trialData.success && trialData.data) {
              const trialMap = new Map(trialData.data.map((t: any) => [t.username, t]));
              dairyData = dairyData.map((d: any) => ({
                ...d,
                trial_info: trialMap.get(d.username)
              }));
            }
          } catch (e) {
            console.error('Error fetching trial data:', e);
          }
        }
        
        setDairies(dairyData);
        setFilteredDairies(dairyData);
      }
    } catch (error) {
      console.error('Error fetching dairies:', error);
      toast.error('Failed to fetch dairies');
    }
  };

  const isTrialExpired = (dairy: any) => {
    if (!dairy.trial_info?.trial_start_date) return false;
    const expiryDate = addDays(new Date(dairy.trial_info.trial_start_date), dairy.trial_info.trial_days || 0);
    // Trial is over if the expiry date is before the start of today
    return isPast(expiryDate);
  };

  const handleToggleStatus = async (username: string, currentStatus: number) => {
    setLoading(true);
    try {
      const newStatus = currentStatus === 1 ? false : true;
      const { data } = await adminApi.toggleDairyStatus(username, newStatus);
      
      if (data.success) {
        toast.success('Dairy status updated successfully');
        const updatedDairies = dairies.map(dairy => 
          dairy.username === username ? { ...dairy, is_active: newStatus ? 1 : 0 } : dairy
        );
        setDairies(updatedDairies);
        setFilteredDairies(updatedDairies.filter(d => 
          !searchMobile.trim() || d.mobile_number?.includes(searchMobile.trim())
        ));
      }
    } catch (error) {
      console.error('Error toggling dairy status:', error);
      toast.error('Failed to update dairy status');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchMobile.trim()) {
      setFilteredDairies(dairies);
      setCurrentPage(1);
      return;
    }
    const filtered = dairies.filter((d) => 
      d.mobile_number?.includes(searchMobile.trim())
    );
    setFilteredDairies(filtered);
    setCurrentPage(1);
  };

  const paginatedData = filteredDairies.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );
  const totalPages = Math.ceil(filteredDairies.length / perPage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Mobile Application Activation</h2>
        
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
                <TableHead className="font-semibold">Branch Name</TableHead>
                <TableHead className="font-semibold">Owner Name</TableHead>
                <TableHead className="font-semibold">Address</TableHead>
                <TableHead className="font-semibold text-center">Trial Account</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((dairy) => (
                <TableRow key={dairy.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{dairy.username || '-'}</TableCell>
                  <TableCell>{dairy.branchname || '-'}</TableCell>
                  <TableCell>{dairy.ownername || '-'}</TableCell>
                  <TableCell>{dairy.address || '-'}</TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const expired = isTrialExpired(dairy);
                      return (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedUser(dairy.username);
                            setIsTrialModalOpen(true);
                          }}
                          className={`inline-flex items-center gap-2 ${
                            expired 
                              ? "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" 
                              : "text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                        >
                          <CalendarIcon className="h-4 w-4" />
                          {expired ? 'Trial Over' : 'Set Trial'}
                        </Button>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      dairy.is_active === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {dairy.is_active === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Switch
                      checked={dairy.is_active === 1}
                      onCheckedChange={() => handleToggleStatus(dairy.username, dairy.is_active)}
                      disabled={loading}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {filteredDairies.length > 0 ? (currentPage - 1) * perPage + 1 : 0} to {Math.min(currentPage * perPage, filteredDairies.length)} of {filteredDairies.length} entries
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
      <TrialCalendarModal 
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        username={selectedUser}
      />
    </div>
  );
}
