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
import { getSidebarAccess, getVlcStepAccess, isItemOn, isOnByDefault } from "@/services/sidebarAccessApi";
import { SECTION_ITEMS, type SidebarItemDef, type SidebarSectionKey } from "@/constatnts/sidebarItems";

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  children?: MenuItem[];
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  create: <PlusCircle size={18} className="stroke-[1.5]" />,
  commission_entry: <FileText size={18} className="stroke-[1.5]" />,
};

// A section's items as sidebar entries: switched-off items (Sidebar Access →
// item_access) and admin-only items for non-admins are left out, and a group
// with nothing left in it disappears.
const buildSectionItems = (defs: SidebarItemDef[], t: any, access: any, isAdmin: boolean): MenuItem[] =>
  defs.flatMap((def): MenuItem[] => {
    if (def.adminOnly && !isAdmin) return [];
    if (def.children) {
      const children = buildSectionItems(def.children, t, access, isAdmin);
      return children.length
        ? [{ title: t(def.titleKey, def.titleDefault), icon: GROUP_ICONS[def.key] ?? <Dot size={24} />, children }]
        : [];
    }
    if (!isItemOn(access, def.key)) return [];
    // VLC Collection Entry also needs the Weight or the Analyser step.
    if (def.key === "vlc_collection_entry") {
      const steps = getVlcStepAccess(access);
      if (!steps.weight && !steps.analyser) return [];
    }
    return [{ title: t(def.titleKey, def.titleDefault), icon: <Dot size={24} />, href: def.href }];
  });

const getMenuItems = (t: any, access: any, isAdmin: boolean): MenuItem[] => {
  const items: MenuItem[] = [];

  // A section switched on in Sidebar Access, shown only if it has an item left.
  const pushSection = (key: SidebarSectionKey, title: string, icon: React.ReactNode) => {
    if (!access?.[key]) return;
    const children = buildSectionItems(SECTION_ITEMS[key], t, access, isAdmin);
    if (children.length) items.push({ title, icon, children });
  };

  if (access?.dashboard) {
    items.push({
      title: t('dashboard'),
      icon: <LayoutDashboard size={20} className="stroke-[1.5]" />,
      href: ROUTES.DASHBOARD,
    });
  }

  pushSection('collection_entry', t('collection_entry'), <Droplets size={20} className="stroke-[1.5]" />);
  pushSection('collection', t('collection'), <FolderOpen size={20} className="stroke-[1.5]" />);
  pushSection('master', t('master'), <Settings size={20} className="stroke-[1.5]" />);
  pushSection('billing', t('billing'), <CreditCard size={20} className="stroke-[1.5]" />);

  if (access?.reports) {
    items.push({
      title: t('reports'),
      icon: <LineChart size={20} className="stroke-[1.5]" />,
      children: [
        { title: t('shift_report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.SHIFT_REPORTS },
        { title: t('manual_auto_shift_report', 'Manual/Auto Shift Report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.MANUAL_AUTO_SHIFT_REPORT },
        { title: t('dispatch_status_report', 'Dispatch Status Report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.DISPATCH_STATUS_REPORT },
        { title: t('vlc_collection_entry_report', 'VLC Collection Entry Report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.VLC_COLLECTION_ENTRY_REPORT },
        { title: t('tanker_dispatch_report', 'Tanker Dispatch Report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.TANKER_DISPATCH_REPORT },
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
          title: t('cattle_feed_report', 'Cattle Feed Report'),
          icon: <Dot size={24} />,
          children: [
            { title: t('farmer_wise_cattle_feed_report', 'Farmer-wise Cattle Feed Report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.CATTLE_FEED_FARMER_WISE_REPORT },
            { title: t('cattle_feed_sales_report', 'Cattle Feed Sales Report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.CATTLE_FEED_SALES_REPORT },
            { title: t('cattle_feed_stock_report', 'Cattle Feed Stock Report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.CATTLE_FEED_STOCK_REPORT },
            { title: t('cattle_feed_purchases_report', 'Cattle Feed Purchases Report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.CATTLE_FEED_PURCHASE_REPORT },
          ]
        },
        { title: t('bonus_report'), icon: <Dot size={24} />, href: ROUTES.REPORTS.BONUS_REPORT },
      ]
    });
  }

  pushSection('settings', t('settings'), <Settings size={20} className="stroke-[1.5]" />);

  if (access?.shubham_milk_product) {
    items.push({
      title: t('shubham_milk_product', 'Shubham Milk Product'),
      icon: <Milk size={20} className="stroke-[1.5]" />,
      href: ROUTES.SHUBHAM_MILK_PRODUCT,
    });
  }

  if (isOnByDefault(access, 'group_stock')) {
    items.push({
      title: t('group_stock', 'Group Stock'),
      icon: <Boxes size={20} className="stroke-[1.5]" />,
      href: ROUTES.GROUP_CATTLE_FEED_STOCK,
    });
  }

  if (isOnByDefault(access, 'farmer_payment')) {
    items.push({
      title: t('farmer_payment', 'Farmer Payment'),
      icon: <Wallet size={20} className="stroke-[1.5]" />,
      href: ROUTES.FARMER_PAYMENT,
    });
  }

  if (access?.dyn) {
    items.push({
      title: t('dynamic_bill_cycle', 'Dynamic Bill Cycle'),
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
                    {showCompany ? t('welcome_to', 'Welcome To') : t('welcome', 'Welcome')}
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
