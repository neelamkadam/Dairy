import { useState, useEffect } from "react";
import {
  ChevronDown, Menu, X,
  LayoutDashboard, Droplets, FolderOpen,
  CreditCard, LineChart, Settings,
  Milk, Boxes, Wallet, CalendarDays,
  Dot, PlusCircle, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTES } from "@/constatnts/routesConstants";
import { useLocation, useNavigate } from "react-router-dom";
import NeoDairyLogo from "@/assets/NeoDairy_Logo.png";
import { RootState, useAppSelector } from "@/redux/store";
import { useTranslation } from "react-i18next";
import { getSidebarAccess } from "@/services/sidebarAccessApi";

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  children?: MenuItem[];
}

const getMenuItems = (t: any, access: any, isAdmin: boolean): MenuItem[] => {
  const items: MenuItem[] = [];

  if (access?.dashboard) {
    items.push({
      title: t('dashboard'),
      icon: <LayoutDashboard size={20} className="stroke-[1.5]" />,
      href: ROUTES.DASHBOARD,
    });
  }

  if (access?.collection_entry) {
    items.push({
      title: t('collection_entry'),
      icon: <Droplets size={20} className="stroke-[1.5]" />,
      children: [
        { title: t('vlc_collection_entry'), icon: <Dot size={24} />, href: ROUTES.COLLECTIONENTRY.VLC_COLLECTION_ENTRY },
        { title: t('farmer_collection_entry'), icon: <Dot size={24} />, href: ROUTES.COLLECTIONENTRY.FARMER_COLLECTION_ENTRY },
        { title: t('tanker_dispatch'), icon: <Dot size={24} />, href: ROUTES.COLLECTIONENTRY.DISPATCH_ENTRY }
      ]
    });
  }

  if (access?.collection) {
    items.push({
      title: t('collection'),
      icon: <FolderOpen size={20} className="stroke-[1.5]" />,
      children: [
        { title: t('vlc_collection'), icon: <Dot size={24} />, href: ROUTES.COLLECTION.VLC_COLLECTION },
        { title: "BMC Collection", icon: <Dot size={24} />, href: ROUTES.COLLECTION.BMC_COLLECTION },
        { title: "CC Collection", icon: <Dot size={24} />, href: ROUTES.CC_COLLECTION.CHILLING_CENTER },
      ]
    });
  }

  if (access?.master) {
    const createChildren: MenuItem[] = [
      { title: "Create Route", icon: <Dot size={24} />, href: ROUTES.MASTER.CREATE_ROUTE },
      { title: "Create BMC", icon: <Dot size={24} />, href: ROUTES.MASTER.CREATE_BMC },
      { title: "Create CC", icon: <Dot size={24} />, href: ROUTES.MASTER.CREATE_CC },
    ];

    if (isAdmin) {
      createChildren.push(
        { title: "Create Supervisor (Sub User)", icon: <Dot size={24} />, href: ROUTES.SETTINGS.CREATE_USER },
        { title: "Create Dairy", icon: <Dot size={24} />, href: ROUTES.SETTINGS.CREATE_DAIRY },
      );
    }

    items.push({
      title: t('master'),
      icon: <Settings size={20} className="stroke-[1.5]" />,
      children: [
        { title: t('add_farmer'), icon: <Dot size={24} />, href: ROUTES.MASTER.ADD_FARMER },
        { title: t('add_rate_chart'), icon: <Dot size={24} />, href: ROUTES.MASTER.ADD_RATECHART },
        { title: t('cattle_feed_stock'), icon: <Dot size={24} />, href: ROUTES.SETTINGS.CATTLE_FEED_STOCK },
        { title: t('bonus'), icon: <Dot size={24} />, href: ROUTES.MASTER.BONUS },
        {
          title: "Create",
          icon: <PlusCircle size={18} className="stroke-[1.5]" />,
          children: createChildren
        },
        {
          title: "Commission Entry",
          icon: <FileText size={18} className="stroke-[1.5]" />,
          children: [
            { title: t('vlc_commission_entry'), icon: <Dot size={24} />, href: ROUTES.BILLING.VLC_COMMISSION_ENTRY },
            { title: "Farmer Commission Entry", icon: <Dot size={24} />, href: ROUTES.BILLING.FARMER_COMMISSION_ENTRY }
          ]
        }
      ]
    });
  }

  if (access?.billing) {
    items.push({
      title: t('billing'),
      icon: <CreditCard size={20} className="stroke-[1.5]" />,
      children: [
        { title: t('payment_receipt'), icon: <Dot size={24} />, href: ROUTES.BILLING.PAYMENTANDRECEIPT },
        { title: t('farmer_deduction'), icon: <Dot size={24} />, href: ROUTES.BILLING.FARMER_DEDUCTION },
        { title: t('generate_bill'), icon: <Dot size={24} />, href: ROUTES.BILLING.GENERATE_BILL },
        { title: t('vlc_ts_entry'), icon: <Dot size={24} />, href: ROUTES.BILLING.VLC_TS_ENTRY }
      ]
    });
  }

  if (access?.reports) {
    items.push({
      title: t('reports'),
      icon: <LineChart size={20} className="stroke-[1.5]" />,
      children: [
        { title: t('shift_report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.SHIFT_REPORTS },
        { title: "Manual/Auto Shift Report", icon: <Dot size={24} />, href: ROUTES.REPORTS.MANUAL_AUTO_SHIFT_REPORT },
        { title: "Dispatch Status Report", icon: <Dot size={24} />, href: ROUTES.REPORTS.DISPATCH_STATUS_REPORT },
        { title: t('farmer_collection'), icon: <Dot size={24} />, href: ROUTES.REPORTS.FARMER_COLLECTION },
        { title: t('total_collection_report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.TOTAL_COLLECTION_REPORT },
        { title: t('payment_summary_report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.PAYMENT_SUMMARY },
        { title: t('rate_chart_report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.RATECHART_REPORT },
        { title: t('farmer_bill_invoice_report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.FARMER_BILL_INVOICE_REPORT },
        { title: t('farmer_list'), icon: <Dot size={24} />, href: ROUTES.REPORTS.FARMER_LIST },
        {
          title: t('vlc_difference_report'),
          icon: <Dot size={24} />,
          children: [
            { title: t('vlc_difference_report') + " 1", icon: <Dot size={24} />, href: ROUTES.REPORTS.VLC_DIFFERENCE_REPORT },
            { title: t('vlc_difference_report') + " 2", icon: <Dot size={24} />, href: ROUTES.REPORTS.VLC_DIFFERENCE_REPORT_2 },
          ]
        },
        { title: t('remaining_balance_report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.REMAINING_BALANCE },
        { title: t('farmer_passbook'), icon: <Dot size={24} />, href: ROUTES.REPORTS.FARMER_PASSBOOK },
        { title: t('vlc_commission_report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.VLC_COMMISSION_REPORT },
        { title: t('pl_statement'), icon: <Dot size={24} />, href: ROUTES.REPORTS.PL_STATEMENT },
        {
          title: "Cattle Feed Report",
          icon: <Dot size={24} />,
          children: [
            { title: "Farmer-wise Cattle Feed Report", icon: <Dot size={24} />, href: ROUTES.REPORTS.CATTLE_FEED_FARMER_WISE_REPORT },
            { title: "Cattle Feed Sales Report", icon: <Dot size={24} />, href: ROUTES.REPORTS.CATTLE_FEED_SALES_REPORT },
            { title: "Cattle Feed Stock Report", icon: <Dot size={24} />, href: ROUTES.REPORTS.CATTLE_FEED_STOCK_REPORT },
            { title: "Cattle Feed Purchases Report", icon: <Dot size={24} />, href: ROUTES.REPORTS.CATTLE_FEED_PURCHASE_REPORT },
          ]
        },
        { title: t('bonus_report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.BONUS_REPORT },
      ]
    });
  }

  if (access?.settings) {
    const settingsChildren: MenuItem[] = [
      { title: t('general_settings'), icon: <Dot size={24} />, href: ROUTES.SETTINGS.GENERAL_SETTINGS },
      { title: t('password_manager'), icon: <Dot size={24} />, href: ROUTES.SETTINGS.PASSWORD_MANAGER },
    ];

    if (isAdmin) {
      settingsChildren.push({ title: "Tanker Collector", icon: <Dot size={24} />, href: ROUTES.TANKER_COLLECTION });
      settingsChildren.push({ title: "Sidebar Access", icon: <Dot size={24} />, href: ROUTES.SETTINGS.SIDEBAR_ACCESS });
      settingsChildren.push({ title: "Shift Timings", icon: <Dot size={24} />, href: ROUTES.SETTINGS.SHIFT_TIMINGS });
    } else {
      console.log('❌ Not adding Sidebar Access - user is not admin');
    }

    items.push({
      title: t('settings'),
      icon: <Settings size={20} className="stroke-[1.5]" />,
      children: settingsChildren
    });
  }

  if (access?.shubham_milk_product) {
    items.push({
      title: "Shubham Milk Product",
      icon: <Milk size={20} className="stroke-[1.5]" />,
      href: ROUTES.SHUBHAM_MILK_PRODUCT,
    });
  }

  if (true) {
    items.push({
      title: "Group Stock",
      icon: <Boxes size={20} className="stroke-[1.5]" />,
      href: ROUTES.GROUP_CATTLE_FEED_STOCK,
    });
    items.push({
      title: "Farmer Payment",
      icon: <Wallet size={20} className="stroke-[1.5]" />,
      href: ROUTES.FARMER_PAYMENT,
    });
  }

  if (access?.dyn) {
    items.push({
      title: "Dynamic Bill Cycle",
      icon: <CalendarDays size={20} className="stroke-[1.5]" />,
      href: ROUTES.DYNAMIC_BILL_CYCLE,
    });
  }

  return items;
};

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const AppSidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const { t } = useTranslation();
  const authState = useAppSelector((state) => state.authData);
  const userData = authState?.userData;
  const [sidebarAccess, setSidebarAccess] = useState<any>(null);
  const [showCompany, setShowCompany] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const userId = userData?.id ? Number(userData.id) : null;
  const isAdmin = userData?.is_admin === true || userData?.is_admin === 1;

  useEffect(() => {
    if (userId) {
      getSidebarAccess(userId)
        .then(response => {
          if (response.success) {
            setSidebarAccess(response.data);
          }
        })
        .catch((error) => {
          console.error('AppSidebar - getSidebarAccess error:', error);
          setSidebarAccess({});
        });
    }
  }, [userId]);

  const menuItems = getMenuItems(t, sidebarAccess, isAdmin);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setIsSpinning(true);
      setTimeout(() => {
        setShowCompany(prev => !prev);
        setIsSpinning(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Add CSS animation styles
  const animations = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
    @keyframes spin {
      from { transform: rotateY(0deg); }
      to { transform: rotateY(360deg); }
    }
  `;

  // Inject styles
  if (typeof document !== 'undefined' && !document.getElementById('sidebar-animations')) {
    const style = document.createElement('style');
    style.id = 'sidebar-animations';
    style.textContent = animations;
    document.head.appendChild(style);
  }

  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('expandedMenuItems');
    return saved ? JSON.parse(saved) : [];
  });
  const navigate = useNavigate();
  const location = useLocation();

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => {
      const newExpanded = prev.includes(title)
        ? prev.filter(itemTitle => itemTitle !== title)
        : [...prev, title];
      localStorage.setItem('expandedMenuItems', JSON.stringify(newExpanded));
      return newExpanded;
    });
  };


  const handleNavigation = (href?: string) => {
    if (href) {
      navigate(href);
    }
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const isActive = item.href && location.pathname === item.href;
    const hasIcon = item.icon !== undefined;

    return (
      <div key={item.title} className="w-full">
        <div
          className={cn(
            "group flex items-center justify-between w-full px-3 py-2.5 text-[14px] cursor-pointer transition-all duration-300 relative",
            level === 0 ? "rounded-xl mt-1" : "rounded-lg mt-0.5",
            level > 0 && "ml-4 text-[13.5px]",
            level > 1 && "ml-8 text-[13px]",
            isActive
              ? (level === 0
                ? "bg-blue-600 shadow-md text-white font-medium hover:bg-blue-700"
                : "bg-blue-50 text-blue-700 font-semibold before:absolute before:left-[-16px] before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-blue-600 before:rounded-r-md")
              : (level === 0
                ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                : "text-slate-500 hover:text-blue-600 hover:bg-slate-50 font-medium dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-slate-800")
          )}
          onClick={() => hasChildren ? toggleExpanded(item.title) : handleNavigation(item.href)}
        >
          <div className={cn("flex items-center", level === 0 ? "gap-3" : "gap-2")}>
            {hasIcon && (
              <span className={cn(
                "flex items-center justify-center transition-colors duration-300",
                isActive
                  ? (level === 0 ? "text-white" : "text-blue-600 dark:text-blue-400")
                  : (level === 0 ? "text-slate-500 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400" : "text-slate-400 group-hover:text-blue-500 dark:text-slate-500")
              )}>
                {item.icon}
              </span>
            )}

            {isOpen && <span className="tracking-wide leading-tight">{item.title}</span>}
          </div>
          {hasChildren && isOpen && (
            <div className={cn(
              "transition-transform duration-300",
              isExpanded
                ? (isActive && level === 0 ? "text-white rotate-180" : "text-slate-600 rotate-180 dark:text-slate-300")
                : (isActive && level === 0 ? "text-white/80" : "text-slate-400 group-hover:text-blue-500")
            )}>
              <ChevronDown size={16} className="stroke-[2]" />
            </div>
          )}
        </div>

        {hasChildren && isExpanded && isOpen && (
          <div className="mt-1 flex flex-col gap-0.5 relative">
            {level === 0 && (
              <div className="absolute left-6 top-0 bottom-2 w-px bg-slate-200 dark:bg-slate-700 pointer-events-none" />
            )}
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 z-30 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onToggle}
      />

      <div className={cn(
        "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col h-screen fixed left-0 top-0 z-40 shadow-sm",
        isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:w-16 lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="flex flex-col p-4.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img
                src={NeoDairyLogo}
                alt="NeoDairy Logo"
                className={cn(
                  "transition-all duration-500 ease-in-out transform flex-shrink-0",
                  isOpen ? "w-12 h-auto" : "w-8 h-8"
                )}
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                  animation: 'pulse 2s infinite'
                }}
              />
              {isOpen && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {showCompany ? 'Welcome To' : 'Welcome'}
                  </span>
                  <span
                    className={cn(
                      "text-base font-semibold text-gray-800 dark:text-gray-200 break-words leading-tight transition-all duration-300",
                      isSpinning && "animate-spin"
                    )}
                    style={{
                      animation: isSpinning ? 'spin 0.3s ease-in-out' : 'none'
                    }}
                  >
                    {showCompany ? 'NDSASPL' : (userData?.name || 'User')}
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="p-1 z-10 flex-shrink-0"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-3 py-4">
            <div className="flex flex-col gap-1 pb-20">
              {menuItems.map(item => renderMenuItem(item))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
};

export default AppSidebar;
