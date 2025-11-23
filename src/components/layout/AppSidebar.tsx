
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTES } from "@/constatnts/routesConstants";
import { useLocation, useNavigate } from "react-router-dom";
import NeoDairyLogo from "@/assets/NeoDairy_Logo.png";
import { useAppSelector } from "@/redux/store";

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: "📊",
    href: ROUTES.DASHBOARD,
  },
  {
    title: "Collection Entry",
    icon: "💧",
    children: [
      { title: "VLC Collection Entry", icon: "", href:ROUTES.COLLECTIONENTRY.VLC_COLLECTION_ENTRY },
      { title: "Farmer Collection Entry", icon: "", href: ROUTES.COLLECTIONENTRY.FARMER_COLLECTION_ENTRY },
      { title: "Dispatch Entry", icon: "", href:ROUTES.COLLECTIONENTRY.DISPATCH_ENTRY }
    ]
  },
  {
    title: "Collection",
    icon: "🗂️",
    children: [
      { title: "VLC Collection", icon: "", href: ROUTES.COLLECTION.VLC_COLLECTION },
      // { title: "BMC Collection", icon: "", href: ROUTES.COLLECTION.BMC_COLLECTION },
      // { title: "Chilling Center", icon: "", href: ROUTES.COLLECTION.CHILLING_CENTER }
    ]
  },
  {
    title: "Master",
    icon: "⚙️",
    children: [
      { title: "Add Farmer", icon: "", href:ROUTES.MASTER.ADD_FARMER },
      { title: "Add Rate Chart", icon: "", href: ROUTES.MASTER.ADD_RATECHART }
    ]
  },
  {
    title: "Billing",
    icon: "💳",
    children: [
      { title: "Payment & Receipt", icon: "", href:ROUTES.BILLING.PAYMENTANDRECEIPT },
      { title: "Farmer Deduction", icon: "", href:ROUTES.BILLING.FARMER_DEDUCTION },
      { title: "Generate Bill", icon: "", href:ROUTES.BILLING.GENERATE_BILL},
      { title: "VLC Commission Entry", icon: "", href: ROUTES.BILLING.VLC_COMMISSION_ENTRY},
      { title: "VLC TS Entry", icon: "", href: ROUTES.BILLING.VLC_TS_ENTRY }
    ]
  },
  {
    title: "Reports",
    icon: "📈",
    children: [
      { title: "Shift Report", icon: "", href: ROUTES.REPORTS.SHIFT_REPORTS},
      { title: "Farmer Collection", icon: "", href: ROUTES.REPORTS.FARMER_COLLECTION},
      { title: "Total Collection Report", icon: "", href: ROUTES.REPORTS.TOTAL_COLLECTION_REPORT},
      { title: "Payment Summary Report", icon: "", href: ROUTES.REPORTS.PAYMENT_SUMMARY},
      { title: "Rate Chart Report", icon: "", href:ROUTES.REPORTS.RATECHART_REPORT},
      { title: "Farmer Bill Invoice Report", icon: "", href: ROUTES.REPORTS.FARMER_BILL_INVOICE_REPORT },
      { title: "Farmer List", icon: "", href: ROUTES.REPORTS.FARMER_LIST},
      { title: "VLC Difference Report", icon: "", href:ROUTES.REPORTS.VLC_DIFFERENCE_REPORT },
      { title: "Remaining Balance Report", icon: "", href: ROUTES.REPORTS.REMAINING_BALANCE },
      { title: "Farmer Passbook", icon: "", href: ROUTES.REPORTS.FARMER_PASSBOOK},
      { title: "VLC Commission Report", icon: "", href: ROUTES.REPORTS.VLC_COMMISSION_REPORT },
      { title: "P/L Statement", icon: "", href: ROUTES.REPORTS.PL_STATEMENT }
    ]
  },
  {
    title: "Settings",
    icon: "⚙️",
    children: [
      { title: "General Settings", icon: "", href: ROUTES.SETTINGS.GENERAL_SETTINGS },
    ]
  }
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const AppSidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const authState = useAppSelector((state) => state.authData);
  const userData = authState?.userData;
  const [showCompany, setShowCompany] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  
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
        ? []
        : [title];
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

    return (
      <div key={item.title} className="w-full">
        <div
           className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors",
            level > 0 && "ml-4 text-gray-600 dark:text-gray-400",
            isActive
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          onClick={() => hasChildren ? toggleExpanded(item.title) : handleNavigation(item.href)}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{item.icon}</span>
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
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      <div className={cn(
        "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col h-screen fixed left-0 top-0 z-40",
        isOpen ? "w-64" : "w-16 -translate-x-full lg:translate-x-0"
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
