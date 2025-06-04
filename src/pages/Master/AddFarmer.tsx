import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {ChevronLeft} from 'lucide-react';

export const AddFarmer: React.FC = () => {
  const [formData, setFormData] = useState({
    farmerId: 'F-2024-001',
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
    milkType: '',
    rateChart: '',
    panCard: '',
    aadhaarCard: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Farmer data submitted:', formData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between gap-2 mt-3">
        <span><ChevronLeft size={20} strokeWidth={1.25} /></span>
        <span className="">Add Farmer</span>
        <span className=" text-blue-600 cursor-pointer">Save</span>
      </div>

      <Card className='bg-white border-none'>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8 text-left">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="">
                  <Label htmlFor="farmerId" className='mb-1'>Farmer ID</Label>
                  <Input
                    id="farmerId"
                    value={formData.farmerId}
                    onChange={(e) => setFormData({...formData, farmerId: e.target.value})}
                    disabled
                    className='border-gray-200 bg-gray-100'
                  />
                  <Label htmlFor="fullName" className='mt-3 mb-1'>Full Name<span className='text-red-600'>*</span></Label>
                  <Input
                    id="fullName"
                    placeholder="Enter farmer's full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                    className='border-gray-200'
                  />

              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="">
                  <Label htmlFor="phoneNumber" className='mb-1'>Phone Number<span className='text-red-600'>*</span></Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      +91
                    </span>
                    <Input
                      id="phoneNumber"
                      placeholder="Enter phone number"
                      className="rounded border-gray-200"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      required
                    />
                  </div>
                  <Label htmlFor="email" className='mt-3 mb-1'>Email Address (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className='border-gray-200'
                  />

                <div className="md:col-span-2 mt-3 mb-1">
                  <Label htmlFor="address" className='mb-1'>Address<span className='text-red-600'>*</span></Label>
                  <Textarea
                    id="address"
                    placeholder="Enter complete address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                      className='border-gray-200'
                  />
                </div>
              </div>
            </div>

            {/* Milk Type */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Milk Type</h3>
              <RadioGroup
                value={formData.milkType}
                onValueChange={(value) => setFormData({...formData, milkType: value})}
              >
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cow" id="cow" className='border-gray-300' />
                    <Label htmlFor="cow">Cow</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="buffalo" id="buffalo" className='border-gray-300' />
                    <Label htmlFor="buffalo">Buffalo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" className='border-gray-300' />
                    <Label htmlFor="both">Both</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Rate Chart */}
            <div>
              <Label htmlFor="rateChart" className='mb-1'>Rate Chart<span className='text-red-600'>*</span></Label>
              <Select value={formData.rateChart} onValueChange={(value) => setFormData({...formData, rateChart: value})}>
                <SelectTrigger className='bg-gray-100 w-full border-gray-200'>
                  <SelectValue placeholder="Select rate chart" />
                </SelectTrigger>
                <SelectContent className='bg-white'>
                  <SelectItem value="standard">Standard Rate Chart</SelectItem>
                  <SelectItem value="premium">Premium Rate Chart</SelectItem>
                  <SelectItem value="bulk">Bulk Rate Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Personal Documents */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Documents</h3>
              <div className="">
                  <Label htmlFor="panCard" className='mb-1'>PAN Card<span className='text-red-600'>*</span></Label>
                  <Input
                    id="panCard"
                    placeholder="ENTER PAN NUMBER"
                    value={formData.panCard}
                    onChange={(e) => setFormData({...formData, panCard: e.target.value})}
                    required
                    className='border-gray-200'
                  />
                  <Label htmlFor="aadhaarCard" className='mt-3 mb-1'>Aadhaar Card<span className='text-red-600'>*</span></Label>
                  <Input
                    id="aadhaarCard"
                    placeholder="Enter Aadhaar number"
                    value={formData.aadhaarCard}
                    onChange={(e) => setFormData({...formData, aadhaarCard: e.target.value})}
                    required
                    className='border-gray-200'
                  />
              </div>
            </div>

            {/* Bank Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Bank Details (Optional)</h3>
              <div className="">
                  <Label htmlFor="bankName" className='mb-1'>Bank Name</Label>
                  <Select value={formData.bankName} onValueChange={(value) => setFormData({...formData, bankName: value})}>
                    <SelectTrigger className='w-full bg-gray-100 border-gray-200'>
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent className='bg-white'>
                      <SelectItem value="sbi">State Bank of India</SelectItem>
                      <SelectItem value="hdfc">HDFC Bank</SelectItem>
                      <SelectItem value="icici">ICICI Bank</SelectItem>
                      <SelectItem value="axis">Axis Bank</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label htmlFor="accountNumber" className='mt-3 mb-1'>Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Enter account number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                    className='border-gray-200'
                  />
                  <Label htmlFor="ifscCode" className='mt-3 mb-1'>IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    placeholder="ENTER IFSC CODE"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({...formData, ifscCode: e.target.value})}
                    className='border-gray-200'
                  />
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
