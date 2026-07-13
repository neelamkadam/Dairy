
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
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
      icon: "📊",
      href: ROUTES.DASHBOARD,
    });
  }

  if (access?.collection_entry) {
    items.push({
      title: t('collection_entry'),
      icon: "💧",
      children: [
        { title: t('vlc_collection_entry'), icon: "", href:ROUTES.COLLECTIONENTRY.VLC_COLLECTION_ENTRY },
        { title: t('farmer_collection_entry'), icon: "", href: ROUTES.COLLECTIONENTRY.FARMER_COLLECTION_ENTRY },
        { title: t('tanker_dispatch'), icon: "", href:ROUTES.COLLECTIONENTRY.DISPATCH_ENTRY }
      ]
    });
  }

  /*
  if(access?.collection_entry){
    items.push({
      title: t('cc_collection'),
      icon: "🩸", 
      children: [
        {title: t('cc_dashboard'), icon: "", href: ROUTES.CC_COLLECTION.CHILLING_CENTER},
        {title : t('weight_collection'), icon:"", href: ROUTES.CC_COLLECTION.WEIGHT_COLLECTION},
        {title : t('analyser_collection'), icon:"", href: ROUTES.CC_COLLECTION.ANALYSER_COLLECTION}
      ]
    })  
  }
  */

  if (access?.collection) {
    items.push({
      title: t('collection'),
      icon: "🗂️",
      children: [
        { title: t('vlc_collection'), icon: "", href: ROUTES.COLLECTION.VLC_COLLECTION },
        { title: "BMC Collection", icon: "", href: ROUTES.COLLECTION.BMC_COLLECTION },
        { title: "CC Collection", icon: "", href: ROUTES.CC_COLLECTION.CHILLING_CENTER },
      ]
    });
  }

  if (access?.master) {
    const createChildren: MenuItem[] = [
      { title: "Create Route", icon: "", href: ROUTES.MASTER.CREATE_ROUTE },
      { title: "Create BMC", icon: "", href: ROUTES.MASTER.CREATE_BMC },
      { title: "Create CC", icon: "", href: ROUTES.MASTER.CREATE_CC },
    ];

    if (isAdmin) {
      createChildren.push(
        { title: "Create Supervisor (Sub User)", icon: "", href: ROUTES.SETTINGS.CREATE_USER },
        { title: "Create Dairy", icon: "", href: ROUTES.SETTINGS.CREATE_DAIRY },
      );
    }

    items.push({
      title: t('master'),
      icon: "⚙️",
      children: [
        { title: t('add_farmer'), icon: "", href:ROUTES.MASTER.ADD_FARMER },
        { title: t('add_rate_chart'), icon: "", href: ROUTES.MASTER.ADD_RATECHART },
        { title: t('cattle_feed_stock'), icon: "", href: ROUTES.SETTINGS.CATTLE_FEED_STOCK },
        { title: t('bonus'), icon: "", href: ROUTES.MASTER.BONUS },
        {
          title: "Create",
          icon: "",
          children: createChildren
        },
        {
          title: "Commission Entry",
          icon: "",
          children: [
            { title: t('vlc_commission_entry'), icon: "", href: ROUTES.BILLING.VLC_COMMISSION_ENTRY },
            { title: "Farmer Commission Entry", icon: "", href: ROUTES.BILLING.FARMER_COMMISSION_ENTRY }
          ]
        }
      ]
    });
  }

  if (access?.billing) {
    items.push({
      title: t('billing'),
      icon: "💳",
      children: [
        { title: t('payment_receipt'), icon: "", href:ROUTES.BILLING.PAYMENTANDRECEIPT },
        { title: t('farmer_deduction'), icon: "", href:ROUTES.BILLING.FARMER_DEDUCTION },
        { title: t('generate_bill'), icon: "", href:ROUTES.BILLING.GENERATE_BILL},
        { title: t('vlc_ts_entry'), icon: "", href: ROUTES.BILLING.VLC_TS_ENTRY }
      ]
    });
  }

  if (access?.reports) {
    items.push({
      title: t('reports'),
      icon: "📈",
      children: [
        { title: t('shift_report'), icon: "", href: ROUTES.REPORTS.SHIFT_REPORTS},
        { title: t('farmer_collection'), icon: "", href: ROUTES.REPORTS.FARMER_COLLECTION},
        { title: t('total_collection_report'), icon: "", href: ROUTES.REPORTS.TOTAL_COLLECTION_REPORT},
        { title: t('payment_summary_report'), icon: "", href: ROUTES.REPORTS.PAYMENT_SUMMARY},
        { title: t('rate_chart_report'), icon: "", href:ROUTES.REPORTS.RATECHART_REPORT},
        { title: t('farmer_bill_invoice_report'), icon: "", href: ROUTES.REPORTS.FARMER_BILL_INVOICE_REPORT },
        { title: t('farmer_list'), icon: "", href: ROUTES.REPORTS.FARMER_LIST},
        {
          title: t('vlc_difference_report'),
          icon: "",
          children: [
            { title: t('vlc_difference_report') + " 1", icon: "", href: ROUTES.REPORTS.VLC_DIFFERENCE_REPORT },
            { title: t('vlc_difference_report') + " 2", icon: "", href: ROUTES.REPORTS.VLC_DIFFERENCE_REPORT_2 },
          ]
        },
        { title: t('remaining_balance_report'), icon: "", href: ROUTES.REPORTS.REMAINING_BALANCE },
        { title: t('farmer_passbook'), icon: "", href: ROUTES.REPORTS.FARMER_PASSBOOK},
        { title: t('vlc_commission_report'), icon: "", href: ROUTES.REPORTS.VLC_COMMISSION_REPORT },
        { title: t('pl_statement'), icon: "", href: ROUTES.REPORTS.PL_STATEMENT },
        {
          title: "Cattle Feed Report",
          icon: "",
          children: [
            { title: "Farmer-wise Cattle Feed Report", icon: "", href: ROUTES.REPORTS.CATTLE_FEED_FARMER_WISE_REPORT },
            { title: "Cattle Feed Sales Report", icon: "", href: ROUTES.REPORTS.CATTLE_FEED_SALES_REPORT },
            { title: "Cattle Feed Stock Report", icon: "", href: ROUTES.REPORTS.CATTLE_FEED_STOCK_REPORT },
            { title: "Cattle Feed Purchases Report", icon: "", href: ROUTES.REPORTS.CATTLE_FEED_PURCHASE_REPORT },
          ]
        },
        { title: t('bonus_report'), icon: "", href: ROUTES.REPORTS.BONUS_REPORT },
      ]
    });
  }

  if (access?.settings) {
    const settingsChildren: MenuItem[] = [
      { title: t('general_settings'), icon: "", href: ROUTES.SETTINGS.GENERAL_SETTINGS },
      { title: t('password_manager'), icon: "", href: ROUTES.SETTINGS.PASSWORD_MANAGER },
    ];
    
    if (isAdmin) {
      settingsChildren.push({ title: "Tanker Collector", icon: "", href: ROUTES.TANKER_COLLECTION });
      settingsChildren.push({ title: "Sidebar Access", icon: "", href: ROUTES.SETTINGS.SIDEBAR_ACCESS });
      settingsChildren.push({ title: "Shift Timings", icon: "", href: ROUTES.SETTINGS.SHIFT_TIMINGS });
    } else {
      console.log('❌ Not adding Sidebar Access - user is not admin');
    }
    
    
    items.push({
      title: t('settings'),
      icon: "⚙️",
      children: settingsChildren
    });
  }

  if (access?.shubham_milk_product) {
    items.push({
      title: "Shubham Milk Product",
      icon: "🥛",
      href: ROUTES.SHUBHAM_MILK_PRODUCT,
    });
  }
  
  if (true) {
    items.push({
      title: "Group Stock",
      icon: "📦",
      href: ROUTES.GROUP_CATTLE_FEED_STOCK,
    });
    items.push({
      title: "Farmer Payment",
      icon: "💳",
      href: ROUTES.FARMER_PAYMENT,
    });
  }

  if (access?.dyn) {
    items.push({
      title: "Dynamic Bill Cycle",
      icon: "📅",
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
  const [showCompany, setShowCompany] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [sidebarAccess, setSidebarAccess] = useState<any>(null);
  
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
    const hasIcon = !(typeof item.icon === "string" && item.icon.trim() === "") && !!item.icon;

    return (
      <div key={item.title} className="w-full">
        <div
           className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors",
            level > 0 && "ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
            level > 1 && "ml-6 text-[13px]",
            isActive
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          onClick={() => hasChildren ? toggleExpanded(item.title) : handleNavigation(item.href)}
        >
          <div className={cn("flex items-center", level === 0 ? "gap-3" : "gap-2")}>
            {hasIcon && <span className="text-lg">{item.icon}</span>}
            {level > 0 && !hasIcon && <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />}
            {isOpen && <span className="font-medium">{item.title}</span>}
          </div>
          {hasChildren && isOpen && (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          )}
        </div>
        
        {hasChildren && isExpanded && isOpen && (
          <div className="mt-1 space-y-1">
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
          "fixed inset-0 bg-black transition-opacity duration-300 z-30 lg:hidden",
          isOpen ? "bg-opacity-50" : "bg-opacity-0 pointer-events-none"
        )}
        onClick={onToggle}
      />
      
      <div className={cn(
        "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col h-screen fixed left-0 top-0 z-40",
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
          <div className="space-y-2">
            {menuItems.map(item => renderMenuItem(item))}
          </div>
        </ScrollArea>
      </div>
    </div>
    </>
  );
};

export default AppSidebar;
