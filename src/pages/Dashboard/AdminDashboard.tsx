import KPICard from "@/components/KPICard";
import { Smartphone, Sprout, Globe, CheckCircle, XCircle, PlayCircle, TrendingUp, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
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
import { useTranslation } from "react-i18next";

const AdminDashboard = () => {
  const { t } = useTranslation();
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

        setMobileAppsCount(dairyManagers.length || 0);
        setFarmerTotalCount(fStats.active || 0);
        setWebAppsCount(webUsers.length || 0);

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
      toast.error(t("failed_to_fetch_users", "Failed to fetch users"));
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
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{t("admin_console", "Admin Console")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t("global_ecosystem_monitoring", "Global ecosystem monitoring and metrics.")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-50 border border-slate-200 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-600">{t("system_normal", "System Normal")}</span>
          </div>
          
          <Dialog open={isTrendOpen} onOpenChange={setIsTrendOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 transition-all">
                <TrendingUp size={16} />
                {t("analytics", "Analytics")}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl w-[95vw] h-[75vh] bg-white border-slate-200 p-0 flex flex-col rounded-xl shadow-xl">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-base font-semibold text-slate-900">{t("growth_trends", "Growth Trends")}</DialogTitle>
                  <p className="text-slate-500 text-sm mt-0.5">{t("monthly_user_acquisition", "Monthly user acquisition across platforms.")}</p>
                </div>
                <div className="flex bg-slate-100/50 p-1 rounded-md border border-slate-200/50">
                  <button 
                    onClick={() => { setActiveTrendFilter('all'); setTrendData(allTrendData); }}
                    className={cn("px-3 py-1.5 rounded text-sm font-medium transition-all", activeTrendFilter === 'all' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900")}
                  >{t("all_users", "All Users")}</button>
                  <button 
                    onClick={() => { setActiveTrendFilter('trial'); setTrendData(trialTrendData); }}
                    className={cn("px-3 py-1.5 rounded text-sm font-medium transition-all", activeTrendFilter === 'trial' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900")}
                  >{t("trial", "Trial")}</button>
                  <button 
                    onClick={() => { setActiveTrendFilter('paid'); setTrendData(paidTrendData); }}
                    className={cn("px-3 py-1.5 rounded text-sm font-medium transition-all", activeTrendFilter === 'paid' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900")}
                  >{t("paid", "Paid")}</button>
                </div>
              </div>
              <div className="flex-1 p-6 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontSize: '12px', fontWeight: '500' }} cursor={{fill: '#f8fafc'}} />
                    <Bar name={String(t("dairy_apps", "Dairy Apps"))} dataKey="Mobile" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                    <Bar name={String(t("farmer_apps", "Farmer Apps"))} dataKey="Farmer" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                    <Bar name={String(t("web_apps", "Web Apps"))} dataKey="Web" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="px-6 py-3 bg-slate-50 flex justify-end items-center border-t border-slate-100 rounded-b-xl gap-6">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-xs font-medium text-slate-600">{t("dairy_apps", "Dairy Apps")}</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-xs font-medium text-slate-600">{t("farmer_apps", "Farmer Apps")}</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-500" /><span className="text-xs font-medium text-slate-600">{t("web_apps", "Web Apps")}</span></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        
        {/* Global Overview Panel */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{t("global_overview", "Global Overview")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <KPICard 
                title={t("total_apps", "Total Apps")} 
                value={(mobileAppsCount + farmerTotalCount).toString()} 
                icon={Smartphone} 
                theme="blue" 
            />
            <KPICard 
                title={t("active_users", "Active Users")} 
                value={activeCount.toString()} 
                icon={CheckCircle} 
                theme="emerald" 
            />
            <KPICard 
                title={t("inactive_users", "Inactive Users")} 
                value={inactiveCount.toString()} 
                icon={XCircle} 
                theme="pink" 
            />
            <KPICard 
                title={t("demo_users", "Demo Users")} 
                value={demoCount.toString()} 
                icon={PlayCircle} 
                theme="amber" 
            />
          </div>
        </section>

        {/* Platform Breakdown */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">{t("platform_distribution", "Platform Distribution")}</h2>
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm shadow-slate-200/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">{t("platform_type", "Platform Type")}</th>
                    <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">{t("total_assigned", "Total Assigned")}</th>
                    <th className="px-6 py-4 font-bold text-emerald-600 text-xs uppercase tracking-wider text-right">{t("active", "Active")}</th>
                    <th className="px-6 py-4 font-bold text-amber-600 text-xs uppercase tracking-wider text-right">{t("demo_trial", "Demo / Trial")}</th>
                    <th className="px-6 py-4 font-bold text-rose-600 text-xs uppercase tracking-wider text-right">{t("inactive", "Inactive")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Mobile Row */}
                  <tr className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100/50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors"><Smartphone size={20} /></div>
                        <span className="font-bold text-slate-800 text-base">{t("dairy_apps", "Dairy Apps")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-bold text-slate-800 text-lg">{mobileAppsCount}</td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => openExplorer(t("active_mobile_users", "Active Mobile Users"), rawManagers, 'active', 'is_paid')} className="inline-flex items-center justify-end gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all font-semibold shadow-sm min-w-[90px]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {mobileActive}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => openExplorer(t("demo_mobile_users", "Demo Mobile Users"), rawManagers, 'demo')} className="inline-flex items-center justify-end gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all font-semibold shadow-sm min-w-[90px]">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> {mobileDemo}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => openExplorer(t("inactive_mobile_users", "Inactive Mobile Users"), rawManagers, 'inactive', 'is_paid')} className="inline-flex items-center justify-end gap-2 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all font-semibold shadow-sm min-w-[90px]">
                        <div className="w-2 h-2 rounded-full bg-rose-500" /> {mobileInactive}
                      </button>
                    </td>
                  </tr>
                  {/* Farmer Row */}
                  <tr className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100/50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors"><Sprout size={20} /></div>
                        <span className="font-bold text-slate-800 text-base">{t("farmer_apps", "Farmer Apps")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-bold text-slate-800 text-lg">{farmerTotalCount}</td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => openExplorer(t("active_farmers", "Active Farmers"), rawFarmers, 'active', 'is_mobile')} className="inline-flex items-center justify-end gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all font-semibold shadow-sm min-w-[90px]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {farmerActive}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => openExplorer(t("demo_farmers", "Demo Farmers"), rawFarmers, 'demo')} className="inline-flex items-center justify-end gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all font-semibold shadow-sm min-w-[90px]">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> {farmerDemo}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => openExplorer(t("inactive_farmers", "Inactive Farmers"), rawFarmers, 'inactive', 'is_mobile')} className="inline-flex items-center justify-end gap-2 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all font-semibold shadow-sm min-w-[90px]">
                        <div className="w-2 h-2 rounded-full bg-rose-500" /> {farmerInactive}
                      </button>
                    </td>
                  </tr>
                  {/* Web Row */}
                  <tr className="hover:bg-violet-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-100/50 text-violet-600 rounded-xl group-hover:bg-violet-100 transition-colors"><Globe size={20} /></div>
                        <span className="font-bold text-slate-800 text-base">{t("web_apps", "Web Apps")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-bold text-slate-800 text-lg">{webAppsCount}</td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => openExplorer(t("active_web_users", "Active Web Users"), rawWebUsers, 'active', 'is_paid')} className="inline-flex items-center justify-end gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all font-semibold shadow-sm min-w-[90px]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {webActive}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => openExplorer(t("demo_web_users", "Demo Web Users"), rawWebUsers, 'demo')} className="inline-flex items-center justify-end gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all font-semibold shadow-sm min-w-[90px]">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> {webDemo}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => openExplorer(t("inactive_web_users", "Inactive Web Users"), rawWebUsers, 'inactive', 'is_paid')} className="inline-flex items-center justify-end gap-2 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all font-semibold shadow-sm min-w-[90px]">
                        <div className="w-2 h-2 rounded-full bg-rose-500" /> {webInactive}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* User List Explorer Modal */}
        <Dialog open={isExplorerOpen} onOpenChange={setIsExplorerOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white rounded-xl shadow-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">{explorerTitle}</DialogTitle>
                <p className="text-sm text-slate-500 mt-0.5">{t("found_records", "Found {{count}} records in this category.", { count: explorerData.length })}</p>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-0">
              {explorerData.length > 0 ? (
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-white sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">{t("entity_name", "Entity Name")}</th>
                      <th className="px-6 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">{t("identifier", "Identifier")}</th>
                      <th className="px-6 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">{t("date_recorded", "Date Recorded")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {explorerData.map((user, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-3">
                          <span className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{user.name || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-slate-600 font-mono text-xs">
                            {user.phone || user.mobile_number || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-slate-500">
                          {user.trial_start_date ? new Date(user.trial_start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-50 h-full">
                  <p className="text-sm font-medium text-slate-900">{t("no_records_found", "No records found")}</p>
                  <p className="text-xs mt-1">{t("segment_contains_no_data", "This segment contains no data.")}</p>
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
