import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { adminApi } from "@/services/adminApi";
import { toast } from "react-toastify";
import { format, differenceInDays, addDays, startOfDay } from "date-fns";
import { Loader2, Calendar as CalendarIcon, Info } from "lucide-react";

interface TrialCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export const TrialCalendarModal: React.FC<TrialCalendarModalProps> = ({ isOpen, onClose, username }) => {
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [trialStart, setTrialStart] = useState<Date | null>(null);
  const [currentTrialDays, setCurrentTrialDays] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (isOpen && username) {
      fetchTrialDetails();
    }
  }, [isOpen, username]);

  const fetchTrialDetails = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getTrialDetails({ username });
      if (data.success && data.data && data.data.length > 0) {
        const details = data.data[0];
        const startDate = new Date(details.trial_start_date);
        setTrialStart(startDate);
        setCurrentTrialDays(details.trial_days || 0);
        
        // Initial selected date is current expiry
        const expiryDate = addDays(startDate, details.trial_days || 0);
        setSelectedDate(expiryDate);
      } else if (data.success) {
        // No trial info yet - default to today
        const startDate = new Date();
        setTrialStart(startDate);
        setCurrentTrialDays(0);
        setSelectedDate(addDays(startDate, 30)); // default 30 days
      } else {
        toast.error("Failed to fetch trial details");
      }
    } catch (error) {
      console.error("Error fetching trial details:", error);
      toast.error("Failed to fetch trial details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!trialStart || !selectedDate) return;

    setUpdating(true);
    try {
      // Calculate total trial days from start date to selected date
      const totalDays = differenceInDays(startOfDay(selectedDate), startOfDay(trialStart));
      
      if (totalDays <= 0) {
        toast.warning("Please select a date after the trial start date");
        setUpdating(false);
        return;
      }

      const { data } = await adminApi.updateTrialDays(username, totalDays);
      if (data.success) {
        toast.success(data.message || `Trial updated to ${totalDays} days`);
        onClose();
      } else {
        toast.error(data.message || "Failed to update trial days");
      }
    } catch (error) {
      console.error("Error updating trial days:", error);
      toast.error("Failed to update trial days");
    } finally {
      setUpdating(false);
    }
  };

  const currentExpiry = trialStart ? addDays(trialStart, currentTrialDays) : null;
  const daysDifference = trialStart && selectedDate ? differenceInDays(startOfDay(selectedDate), startOfDay(trialStart)) : 0;
  const remainingDaysFromToday = selectedDate ? differenceInDays(startOfDay(selectedDate), startOfDay(new Date())) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            Trial Extension - {username}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Fetching trial info...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Current Status Banner - Compact & Clean */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Current Expiry</p>
                  <p className="text-sm font-bold text-slate-700">{currentExpiry ? format(currentExpiry, 'dd MMM yyyy') : 'No Trial Set'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Days Left</p>
                <p className={`text-sm font-bold ${currentExpiry && currentExpiry < new Date() ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {currentExpiry ? Math.max(0, differenceInDays(startOfDay(currentExpiry), startOfDay(new Date()))) : 0} Days
                </p>
              </div>
            </div>

            {/* Simple Calendar Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Select New Expiry Date</label>
              <div className="flex justify-center border border-slate-200 rounded-2xl p-2 bg-white shadow-sm">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  disabled={(date) => trialStart ? date < startOfDay(trialStart) : date < startOfDay(new Date())}
                  className="p-3 pointer-events-auto"
                />
              </div>
            </div>

            {/* Quick Extension Chips */}
            <div className="flex gap-2">
              {[7, 15, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    const base = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
                    setSelectedDate(addDays(base, days));
                  }}
                  className="flex-1 py-2 px-1 text-[11px] font-bold rounded-xl border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all bg-white"
                >
                  +{days} Days
                </button>
              ))}
            </div>

            {/* Final Outcome Summary */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-xs font-medium">New Total Trial</span>
                <span className="text-blue-400 text-sm font-bold">{daysDifference} Days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-medium">Extension Ends On</span>
                <span className="text-white text-sm font-bold">{selectedDate ? format(selectedDate, 'dd MMMM yyyy') : '-'}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex sm:justify-between items-center mt-2 gap-2">
          <Button variant="ghost" onClick={onClose} disabled={updating}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={updating || !selectedDate || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
          >
            {updating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
