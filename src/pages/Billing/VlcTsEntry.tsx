import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const VlcTsEntry: React.FC = () => {
  const [formData, setFormData] = useState({
    vlc: '',
    fatRate: '',
    snfRate: '',
    effectiveDate: undefined as Date | undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('TS Entry submitted:', formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">TS Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="vlc">Select VLC *</Label>
              <Select value={formData.vlc} onValueChange={(value) => setFormData({...formData, vlc: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose VLC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vlc1">VLC Alpha</SelectItem>
                  <SelectItem value="vlc2">VLC Beta</SelectItem>
                  <SelectItem value="vlc3">VLC Gamma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fatRate">Kg FAT Rate (Rs) *</Label>
              <Input
                id="fatRate"
                type="number"
                placeholder="Enter FAT rate"
                value={formData.fatRate}
                onChange={(e) => setFormData({...formData, fatRate: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snfRate">Kg SNF Rate (Rs) *</Label>
              <Input
                id="snfRate"
                type="number"
                placeholder="Enter SNF rate"
                value={formData.snfRate}
                onChange={(e) => setFormData({...formData, snfRate: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Effective Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.effectiveDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.effectiveDate ? format(formData.effectiveDate, "yyyy/MM/dd") : "yyyy / mm / dd"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.effectiveDate}
                    onSelect={(date) => setFormData({...formData, effectiveDate: date})}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VlcTsEntry;