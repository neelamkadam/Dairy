import { MetricCard } from "@/components/MartricCard";
import { Smartphone, Sprout, Globe, CheckCircle, XCircle, PlayCircle, TrendingUp, Zap } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { adminApi } from "@/services/adminApi";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";

const AdminDashboard = () => {
  const [mobileAppsCount, setMobileAppsCount] = useState(0);
  const [farmerAppsCount, setFarmerAppsCount] = useState(0);
  const [farmerTotalCount, setFarmerTotalCount] = useState(0);
  const [webAppsCount, setWebAppsCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [demoCount, setDemoCount] = useState(0);
  const [isTrendOpen, setIsTrendOpen] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerTitle, setExplorerTitle] = useState("");
  const [explorerData, setExplorerData] = useState<any[]>([]);
  
  const [rawManagers, setRawManagers] = useState<any[]>([]);
  const [rawFarmers, setRawFarmers] = useState<any[]>([]);
  const [rawWebUsers, setRawWebUsers] = useState<any[]>([]);

  const [trendData, setTrendData] = useState<any[]>([]);
  const [activeTrendFilter, setActiveTrendFilter] = useState<'all' | 'trial' | 'paid'>('all');
  const [allTrendData, setAllTrendData] = useState<any[]>([]);
  const [trialTrendData, setTrialTrendData] = useState<any[]>([]);
  const [paidTrendData, setPaidTrendData] = useState<any[]>([]);

  // Segregated Metrics
  const [mobileActive, setMobileActive] = useState(0);
  const [mobileInactive, setMobileInactive] = useState(0);
  const [mobileDemo, setMobileDemo] = useState(0);
  const [farmerActive, setFarmerActive] = useState(0);
  const [farmerInactive, setFarmerInactive] = useState(0);
  const [farmerDemo, setFarmerDemo] = useState(0);
  const [webActive, setWebActive] = useState(0);
  const [webInactive, setWebInactive] = useState(0);
  const [webDemo, setWebDemo] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await adminApi.getAllUsers();
      if (data.success) {
        const { dairyManagers = [], farmers = [], webUsers = [] } = data.data;
        
        setRawManagers(dairyManagers);
        setRawFarmers(farmers);
        setRawWebUsers(webUsers);

        setMobileAppsCount(dairyManagers.length || 0);
        setFarmerTotalCount(farmers.length || 0);
        setWebAppsCount(webUsers.length || 0);

        // Helper to identify Demo users (within 1 month of trial start)
        const isDemoUser = (u: any) => {
          if (!u.trial_start_date) return false;
          const trialDate = new Date(u.trial_start_date);
          const now = new Date();
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(now.getMonth() - 1);
          return trialDate >= oneMonthAgo && trialDate <= now;
        };

        const isPaidMobile = (u: any) => !isDemoUser(u) && Number(u.is_paid) === 1;
        const isPaidFarmer = (u: any) => !isDemoUser(u) && Number(u.is_mobile) === 1;
        const isPaidWeb = (u: any) => !isDemoUser(u) && Number(u.is_paid) === 1;

        // Segregated Calculations using strict rules
        const getStats = (list: any[], statusField: string = 'is_paid') => {
          const demo = list.filter(isDemoUser).length;
          // Active if statusField is 1, and not counted as demo
          const active = list.filter(u => !isDemoUser(u) && Number(u[statusField]) === 1).length;
          // Inactive if statusField is 0, and not counted as demo
          const inactive = list.filter(u => !isDemoUser(u) && Number(u[statusField]) === 0).length;
          return { active, inactive, demo };
        };

        const mStats = getStats(dairyManagers, 'is_paid');
        setMobileActive(mStats.active);
        setMobileInactive(mStats.inactive);
        setMobileDemo(mStats.demo);

        // Farmers use is_mobile for status
        const fStats = getStats(farmers, 'is_mobile');
        setFarmerActive(fStats.active);
        setFarmerInactive(fStats.inactive);
        setFarmerDemo(fStats.demo);

        const wStats = getStats(webUsers, 'is_paid');
        setWebActive(wStats.active);
        setWebInactive(wStats.inactive);
        setWebDemo(wStats.demo);

        // Global Totals
        setActiveCount(mStats.active + fStats.active + wStats.active);
        setInactiveCount(mStats.inactive + fStats.inactive + wStats.inactive);
        setDemoCount(mStats.demo + fStats.demo + wStats.demo);

        // Calculate Trend Data with safe month stepping
        const now = new Date();
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          return {
            name: d.toLocaleString('default', { month: 'short' }),
            date: d,
          };
        });

        const getCountBefore = (list: any[], date: Date, dateField: string = 'createdAt') => {
          return list.filter(u => {
            // Robust date field discovery
            const val = u[dateField] || u['created_at'] || u['createdAt'] || u['trial_start_date'];
            if (!val) return false;
            return new Date(val) <= date;
          }).length;
        };

        const trialManagers = dairyManagers.filter(isDemoUser);
        const paidManagers = dairyManagers.filter(isPaidMobile);
        const trialFarmers = farmers.filter(isDemoUser);
        const paidFarmers = farmers.filter(isPaidFarmer);
        const trialWeb = webUsers.filter(isDemoUser);
        const paidWeb = webUsers.filter(isPaidWeb);

        const generateTrend = (mgrs: any[], frms: any[], web: any[], dateField: string = 'createdAt') => {
          return last6Months.map(m => {
            const endOfMonth = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0, 23, 59, 59);
            return {
              month: m.name,
              Mobile: getCountBefore(mgrs, endOfMonth, dateField),
              Farmer: getCountBefore(frms, endOfMonth, dateField),
              Web: getCountBefore(web, endOfMonth, dateField)
            };
          });
        };

        const allT = generateTrend(dairyManagers, farmers, webUsers, 'trial_start_date');
        // For Trial trend, we use trial_start_date
        const trialT = generateTrend(trialManagers, trialFarmers, trialWeb, 'trial_start_date');
        const paidT = generateTrend(paidManagers, paidFarmers, paidWeb, 'trial_start_date');

        setAllTrendData(allT);
        setTrialTrendData(trialT);
        setPaidTrendData(paidT);
        setTrendData(allT);
      }
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };

  const isDemoUser = (u: any) => {
    if (!u.trial_start_date) return false;
    const trialDate = new Date(u.trial_start_date);
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    return trialDate >= oneMonthAgo && trialDate <= now;
  };

  const openExplorer = (title: string, list: any[], filterType: 'active' | 'inactive' | 'demo', statusField: string = 'is_paid') => {
    let filtered = [];
    if (filterType === 'demo') {
      filtered = list.filter(isDemoUser);
    } else if (filterType === 'active') {
      filtered = list.filter(u => !isDemoUser(u) && Number(u[statusField]) === 1);
    } else {
      filtered = list.filter(u => !isDemoUser(u) && Number(u[statusField]) === 0);
    }
    
    setExplorerTitle(title);
    setExplorerData(filtered);
    setIsExplorerOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <main className="flex-1 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Monitor your ecosystem across all platforms.</p>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={isTrendOpen} onOpenChange={setIsTrendOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95">
                  <TrendingUp size={16} className="text-emerald-400" />
                  Analytics Hub
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl w-[95vw] h-[85vh] bg-white border-slate-200 text-slate-900 p-0 flex flex-col overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Zap size={20} className="text-amber-500 fill-amber-500" />
                      <DialogTitle className="text-2xl font-black tracking-tighter uppercase text-slate-900">Neural Trends Hub</DialogTitle>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Real-time projection of ecosystem growth and subscription vectors.</p>
                  </div>
                  <div className="flex p-1 bg-slate-200/50 rounded-xl border border-slate-200">
                    <button 
                      onClick={() => { setActiveTrendFilter('all'); setTrendData(allTrendData); }}
                      className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTrendFilter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >All Versions</button>
                    <button 
                      onClick={() => { setActiveTrendFilter('trial'); setTrendData(trialTrendData); }}
                      className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTrendFilter === 'trial' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >Trial</button>
                    <button 
                      onClick={() => { setActiveTrendFilter('paid'); setTrendData(paidTrendData); }}
                      className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTrendFilter === 'paid' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >Paid</button>
                  </div>
                </div>
                <div className="flex-1 p-10 min-h-0 bg-white">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMobile" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.1}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorFarmer" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fb7185" stopOpacity={0.1}/><stop offset="95%" stopColor="#fb7185" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.1}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="Mobile" stroke="#22d3ee" strokeWidth={4} fillOpacity={1} fill="url(#colorMobile)" />
                      <Area type="monotone" dataKey="Farmer" stroke="#fb7185" strokeWidth={4} fillOpacity={1} fill="url(#colorFarmer)" />
                      <Area type="monotone" dataKey="Web" stroke="#a855f7" strokeWidth={4} fillOpacity={1} fill="url(#colorWeb)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="p-6 bg-slate-50 flex justify-between items-center border-t border-slate-100">
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#22d3ee] shadow-sm" /><span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Mobile Node</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#fb7185] shadow-sm" /><span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Farmer Node</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#a855f7] shadow-sm" /><span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Web Node</span></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase font-bold">Data Stream // Online</p>
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-600">Live Updates: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 px-1">Global Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard title="Total Applications" value={(mobileAppsCount + farmerTotalCount + webAppsCount).toString()} change="+0%" changeType="positive" icon={Smartphone} iconColor="bg-slate-800" className="border-slate-200 hover:border-slate-300 transition-colors" />
            <MetricCard title="Global Active" value={activeCount.toString()} change="+0%" changeType="positive" icon={CheckCircle} iconColor="bg-emerald-500" className="border-slate-200 hover:border-slate-300 transition-colors" />
            <MetricCard title="Global Inactive" value={inactiveCount.toString()} change="0%" changeType="negative" icon={XCircle} iconColor="bg-rose-500" className="border-slate-200 hover:border-slate-300 transition-colors" />
            <MetricCard title="Global Demo" value={demoCount.toString()} change="0%" changeType="positive" icon={PlayCircle} iconColor="bg-amber-500" className="border-slate-200 hover:border-slate-300 transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="bg-white/50 p-6 rounded-2xl border border-blue-100/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Smartphone size={20} /></div><h3 className="font-bold text-slate-800">Mobile Platform</h3></div>
            <div className="space-y-4">
              <MetricCard title="Total Mobile" value={mobileAppsCount.toString()} change="" changeType="positive" icon={Smartphone} iconColor="bg-blue-500" className="shadow-none border-blue-50" />
              <div className="grid grid-cols-3 gap-3">
                <div 
                  onClick={() => openExplorer("Active Mobile Users", rawManagers, 'active', 'is_paid')}
                  className="bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 transition-all group text-center"
                >
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-tighter">Active</p>
                  <p className="text-lg font-black text-blue-600 group-hover:scale-105 transition-transform">{mobileActive}</p>
                </div>
                <div 
                  onClick={() => openExplorer("Demo Mobile Users", rawManagers, 'demo')}
                  className="bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-amber-200 hover:bg-amber-50/30 transition-all group text-center"
                >
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-tighter">Demo</p>
                  <p className="text-lg font-black text-amber-500 group-hover:scale-105 transition-transform">{mobileDemo}</p>
                </div>
                <div 
                  onClick={() => openExplorer("Inactive Mobile Users", rawManagers, 'inactive', 'is_paid')}
                  className="bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all group text-center"
                >
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-tighter">Inactive</p>
                  <p className="text-lg font-black text-slate-400 group-hover:scale-105 transition-transform">{mobileInactive}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white/50 p-6 rounded-2xl border border-emerald-100/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Sprout size={20} /></div><h3 className="font-bold text-slate-800">Farmer Platform</h3></div>
            <div className="space-y-4">
              <MetricCard title="Total Farmers" value={farmerTotalCount.toString()} change="" changeType="positive" icon={Sprout} iconColor="bg-emerald-500" className="shadow-none border-emerald-50" />
              <div className="grid grid-cols-3 gap-3">
                <div 
                  onClick={() => openExplorer("Active Farmers", rawFarmers, 'active', 'is_mobile')}
                  className="bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group text-center"
                >
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-tighter">Active</p>
                  <p className="text-lg font-black text-emerald-600 group-hover:scale-105 transition-transform">{farmerActive}</p>
                </div>
                <div 
                  onClick={() => openExplorer("Demo Farmers", rawFarmers, 'demo')}
                  className="bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-amber-200 hover:bg-amber-50/30 transition-all group text-center"
                >
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-tighter">Demo</p>
                  <p className="text-lg font-black text-amber-500 group-hover:scale-105 transition-transform">{farmerDemo}</p>
                </div>
                <div 
                  onClick={() => openExplorer("Inactive Farmers", rawFarmers, 'inactive', 'is_mobile')}
                  className="bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all group text-center"
                >
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-tighter">Pending</p>
                  <p className="text-lg font-black text-slate-400 group-hover:scale-105 transition-transform">{farmerInactive}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white/50 p-6 rounded-2xl border border-purple-100/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Globe size={20} /></div><h3 className="font-bold text-slate-800">Web Platform</h3></div>
            <div className="space-y-4">
              <MetricCard title="Total Web" value={webAppsCount.toString()} change="" changeType="positive" icon={Globe} iconColor="bg-purple-500" className="shadow-none border-purple-50" />
              <div className="grid grid-cols-3 gap-3">
                <div 
                  onClick={() => openExplorer("Active Web Users", rawWebUsers, 'active', 'is_paid')}
                  className="bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-purple-200 hover:bg-purple-50/30 transition-all group text-center"
                >
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-tighter">Active</p>
                  <p className="text-lg font-black text-purple-600 group-hover:scale-105 transition-transform">{webActive}</p>
                </div>
                <div 
                  onClick={() => openExplorer("Demo Web Users", rawWebUsers, 'demo')}
                  className="bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-amber-200 hover:bg-amber-50/30 transition-all group text-center"
                >
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-tighter">Demo</p>
                  <p className="text-lg font-black text-amber-500 group-hover:scale-105 transition-transform">{webDemo}</p>
                </div>
                <div 
                  onClick={() => openExplorer("Inactive Web Users", rawWebUsers, 'inactive', 'is_paid')}
                  className="bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all group text-center"
                >
                  <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-tighter">Inactive</p>
                  <p className="text-lg font-black text-slate-400 group-hover:scale-105 transition-transform">{webInactive}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User List Explorer Modal */}
        <Dialog open={isExplorerOpen} onOpenChange={setIsExplorerOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0 overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">{explorerTitle}</DialogTitle>
                <p className="text-xs text-slate-500 mt-1">Showing {explorerData.length} records</p>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-0">
              {explorerData.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Username</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Mobile Number</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Trial Start Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {explorerData.map((user, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                              {user.name?.charAt(0) || 'U'}
                            </div>
                            <span className="font-semibold text-slate-700">{user.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{user.phone || user.mobile_number || 'N/A'}</td>
                        <td className="px-6 py-4">
                          {user.trial_start_date ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                              {new Date(user.trial_start_date).toLocaleDateString('en-GB')}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs italic">No Trial Data</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Globe size={40} className="opacity-20" />
                  </div>
                  <p className="font-medium">No users found for this category</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
