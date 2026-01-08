import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSelector } from "@/redux/store";
import { User, Mail, Building2, Calendar, Shield, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const Profile = () => {
  const { userData } = useAppSelector(state => state.authData);
  const { branches } = useAppSelector(state => state.branch);
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=default');

  console.log('Profile userData:', userData);
  console.log('Profile branches:', branches);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full flex items-center justify-center mb-4 shadow-lg overflow-hidden bg-white">
                      <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <button
                      onClick={() => navigate('/dashboard/avatar-selector')}
                      className="absolute bottom-4 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors border-2 border-blue-500"
                    >
                      <Edit2 className="w-5 h-5 text-blue-600" />
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{userData?.name || 'User'}</h2>
                  <p className="text-gray-600 mb-4">{userData?.email || 'No email'}</p>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Active Account</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-lg border-0 mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Branches</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600">{branches.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Status</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                <CardTitle className="text-xl font-semibold text-gray-900">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">Email Address</span>
                    </div>
                    <p className="text-gray-900 left-0 font-semibold">{userData?.email || 'Not provided'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">User ID</span>
                    </div>
                    <p className="text-gray-900 font-semibold">{userData?.id || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assigned Branches */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-100 border-b">
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  Assigned Branches
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {branches.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                    {branches.map((branch) => (
                      <div key={branch.branch_id} className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-gray-900 mb-1">{branch.name}</h3>
                            <p className="text-sm text-gray-600">Dairy ID: {branch.username}</p>
                          </div>
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No branches assigned</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
