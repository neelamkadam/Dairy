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
            <div className="bg-blue-50 p-4 rounded-lg space-y-2 border border-blue-100">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 font-medium">Trial Start:</span>
                <span className="text-blue-900">{trialStart ? format(trialStart, 'PPP') : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 font-medium font-semibold">Currently Ends On:</span>
                <span className="text-blue-900 font-semibold">{currentExpiry ? format(currentExpiry, 'PPP') : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 font-medium">Current Trial Days:</span>
                <span className="text-blue-900">{currentTrialDays} days</span>
              </div>
            </div>

            <div className="flex justify-center border rounded-lg p-2 bg-gray-50/50">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                disabled={(date) => trialStart ? date <= trialStart : date < new Date()}
                className="rounded-md"
              />
            </div>

            <div className="flex gap-2">
              {[15, 30, 60, 90].map((days) => (
                <Button
                  key={days}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    if (trialStart) {
                      const currentExp = currentExpiry || new Date();
                      // If current expiry is in the past, add to today. If in future, add to current expiry.
                      const baseDate = currentExp < new Date() ? new Date() : currentExp;
                      setSelectedDate(addDays(baseDate, days));
                    }
                  }}
                >
                  +{days} Days
                </Button>
              ))}
            </div>

            <div className="bg-gray-50 p-3 rounded-lg flex items-start gap-3 border border-gray-100">
              <Info className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  New Setting: <span className="text-blue-600">{daysDifference} total days</span>
                </p>
                <p className="text-xs text-gray-500">
                  This will extend/set the trial to end on <span className="font-semibold text-gray-700">{selectedDate ? format(selectedDate, 'PPP') : 'N/A'}</span>,
                  which is roughly <span className="font-semibold text-gray-700">{remainingDaysFromToday} days</span> from today.
                </p>
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
