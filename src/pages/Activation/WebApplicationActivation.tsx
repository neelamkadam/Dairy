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
import { addDays, isPast } from 'date-fns';

export const WebApplicationActivation: React.FC = () => {
  const [webUsers, setWebUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchMobile, setSearchMobile] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');

  useEffect(() => {
    fetchWebUsers();
  }, []);

  const fetchWebUsers = async () => {
    try {
      const { data } = await adminApi.getAllUsers();
      if (data.success) {
        let userData = data.data.webUsers || [];
        console.log('DEBUG [WebApplicationActivation] userData:', userData);
        const usernames = userData.map((u: any) => u.username || u.email).filter(Boolean);
        if (usernames.length > 0) {
          try {
            const { data: trialData } = await adminApi.getTrialDetails({ usernames });
            if (trialData.success && trialData.data) {
              const trialMap = new Map(trialData.data.map((t: any) => [t.username, t]));
              userData = userData.map((u: any) => ({
                ...u,
                trial_info: trialMap.get(u.username || u.email)
              }));
            }
          } catch (e) {
            console.error('Error fetching trial data:', e);
          }
        }
        setWebUsers(userData);
        setFilteredUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching web users:', error);
      toast.error('Failed to fetch web users');
    }
  };

  const isTrialExpired = (user: any) => {
    if (!user.trial_info?.trial_start_date) return false;
    const expiryDate = addDays(new Date(user.trial_info.trial_start_date), user.trial_info.trial_days || 0);
    return isPast(expiryDate);
  };

  const handleToggleStatus = async (userId: number, currentStatus: number) => {
    setLoading(true);
    try {
      const newStatus = currentStatus === 1 ? false : true;
      const { data } = await adminApi.toggleUserStatus(userId, newStatus);
      
      if (data.success) {
        toast.success('User status updated successfully');
        // Update local state
        const updatedUsers = webUsers.map(user => 
          user.id === userId ? { ...user, is_active: newStatus ? 1 : 0 } : user
        );
        setWebUsers(updatedUsers);
        setFilteredUsers(updatedUsers.filter(u => 
          !searchMobile.trim() || u.mobile_number?.includes(searchMobile.trim())
        ));
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setLoading(false);
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
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Web Application Activation</h2>
        
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
                <TableHead className="font-semibold text-center">Trial Account</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{user.name || '-'}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.mobile_number || '-'}</TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const expired = isTrialExpired(user);
                      return (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedUser(user.username || user.email);
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
                      user.is_active === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Switch
                      checked={user.is_active === 1}
                      onCheckedChange={() => handleToggleStatus(user.id, user.is_active)}
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

      <TrialCalendarModal 
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        username={selectedUser}
      />
    </div>
  );
}
