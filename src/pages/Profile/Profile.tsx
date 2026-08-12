import { useAppSelector } from "@/redux/store";
import { User, Mail, Building2, Calendar, CheckCircle2, ChevronRight, Activity, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const Profile = () => {
  const { userData } = useAppSelector(state => state.authData);
  const { branches } = useAppSelector(state => state.branch);
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=default');

  useEffect(() => {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans text-left">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Account Profile
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your personal information, preferences, and branch access.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Left Column */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Profile Summary Card */}
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200">
              <div className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative group mb-4">
                    <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-white shadow-md bg-slate-100">
                      <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                    </div>
                    <button
                      onClick={() => navigate('/dashboard/avatar-selector')}
                      className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{userData?.name || 'User'}</h3>
                  <p className="text-sm text-slate-500 mb-4">{userData?.email || 'No email associated'}</p>
                  
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active Account
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Card */}
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200 flex-grow flex flex-col">
              <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-4 sm:px-6">
                <h3 className="text-sm font-semibold leading-6 text-slate-900 uppercase tracking-wider">
                  At a Glance
                </h3>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    Total Branches
                  </div>
                  <span className="text-lg font-bold text-slate-900">{branches.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <Activity className="w-5 h-5 text-slate-400" />
                    Status
                  </div>
                  <span className="text-sm font-medium text-emerald-600">Active</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Personal Information Card */}
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
                <h3 className="text-base font-semibold leading-6 text-slate-900">Personal Information</h3>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">Personal details and application user ID.</p>
              </div>
              <div className="border-t border-slate-100">
                <dl className="divide-y divide-slate-100">
                  <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <dt className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      Email address
                    </dt>
                    <dd className="mt-1 text-sm text-slate-700 sm:col-span-2 sm:mt-0">
                      {userData?.email || 'Not provided'}
                    </dd>
                  </div>
                  <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-white hover:bg-slate-50 transition-colors">
                    <dt className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      User ID
                    </dt>
                    <dd className="mt-1 text-sm text-slate-700 sm:col-span-2 sm:mt-0 font-mono bg-slate-100 w-fit px-2 py-0.5 rounded border border-slate-200">
                      {userData?.id || 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Assigned Branches Card */}
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200 flex flex-col flex-grow max-h-[380px]">
              <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-base font-semibold leading-6 text-slate-900">Assigned Branches</h3>
                  <p className="mt-1 max-w-2xl text-sm text-slate-500">Locations you currently have access to.</p>
                </div>
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {branches.length}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {branches.length > 0 ? (
                  <ul role="list" className="divide-y divide-slate-100">
                    {branches.map((branch) => (
                      <li key={branch.branch_id} className="relative flex justify-between gap-x-6 px-4 py-4 sm:px-6 hover:bg-slate-50 transition-colors cursor-pointer group">
                        <div className="flex min-w-0 gap-x-4 items-center">
                          <div className="h-10 w-10 flex-none rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-auto">
                            <p className="text-sm font-semibold leading-6 text-slate-900 truncate">
                              <a href="#">
                                <span className="absolute inset-0" />
                                {branch.name}
                              </a>
                            </p>
                            <p className="mt-1 flex text-xs leading-5 text-slate-500 font-mono">
                              ID: {branch.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-x-4">
                          <ChevronRight className="h-5 w-5 flex-none text-slate-400 group-hover:text-slate-600 transition-colors" aria-hidden="true" />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <Building2 className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">No branches</h3>
                    <p className="mt-1 text-sm text-slate-500">You are not currently assigned to any branches.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
