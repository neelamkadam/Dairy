import { useState } from "react";
import {
  ChevronDown, Menu, X,
  LayoutDashboard, Building2, Settings,
  ShieldAlert, UserCheck, Smartphone,
  Monitor, ShieldCheck, Dot, FileText, Ban
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTES } from "@/constatnts/routesConstants";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  children?: MenuItem[];
}

const getMenuItems = (t: any): MenuItem[] => [
  {
    title: t('dashboard'),
    icon: <LayoutDashboard size={20} className="stroke-[1.5]" />,
    href: ROUTES.ADMIN_DASHBOARD,
  },
  {
    title: t('branch', 'Branch'),
    icon: <Building2 size={20} className="stroke-[1.5]" />,
    children: [
      { title: t('create_user', 'Create User'), icon: <Dot size={24} />, href: ROUTES.ADMIN_CREATE_USER },
      { title: t('add_branch', 'Add Branch'), icon: <Dot size={24} />, href: ROUTES.ADMIN_MASTER.ADD_BRANCH },
      { title: t('upload_rate_chart', 'Upload Rate Chart'), icon: <Dot size={24} />, href: ROUTES.ADMIN_MASTER.UPLOAD_RATE_CHART },
      { title: t('sidebar_access', 'Sidebar Access'), icon: <Dot size={24} />, href: ROUTES.ADMIN_MASTER.SIDEBAR_ACCESS }
    ]
  },
  {
    title: t('master'),
    icon: <Settings size={20} className="stroke-[1.5]" />,
    children: [
      { title: t('mobile_application', 'Mobile Application'), icon: <Dot size={24} />, href: ROUTES.ADMIN_MASTER.MOBILE_APPLICATION },
      { title: t('web_application', 'Web Application'), icon: <Dot size={24} />, href: ROUTES.ADMIN_MASTER.WEB_APPLICATION },
      { title: t('farmer_application', 'Farmer Application'), icon: <Dot size={24} />, href: ROUTES.ADMIN_MASTER.FARMER_APPLICATION }
    ]
  },
  {
    title: t('activation_title', 'Activation'),
    icon: <Monitor size={20} className="stroke-[1.5]" />,
    children: [
      { title: t('activation_title', 'Activation'), icon: <Dot size={24} />, href: ROUTES.ACTIVATION.ACTIVATION },
      { title: t('web_application_activation', 'Web Application Activation'), icon: <Dot size={24} />, href: ROUTES.ACTIVATION.WEB_APPLICATION_ACTIVATION }
    ]
  },
  {
    title: t('admin_title', 'Admin'),
    icon: <ShieldAlert size={20} className="stroke-[1.5]" />,
    children: [
      { title: t('create_admin', 'Create Admin'), icon: <Dot size={24} />, href: ROUTES.ADMIN_CREATE_ADMIN },
    ]
  },
  {
    title: t('attendance_supervisor', 'Attendance & Supervisior'),
    icon: <UserCheck size={20} className="stroke-[1.5]" />,
    href: ROUTES.ATTENDANCE.SUPERVISOR
  },
  {
    title: t('quotation_maker', 'Quotation Maker'),
    icon: <FileText size={20} className="stroke-[1.5]" />,
    href: ROUTES.QUOTATION
  },
  {
    title: t('block_number', 'Block Number'),
    icon: <Ban size={20} className="stroke-[1.5]" />,
    children: [
      { title: t('blocked_numbers', 'Blocked Numbers'), icon: <Dot size={24} />, href: ROUTES.BLOCKED_NUMBERS }
    ]
  }
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const AdminAppSidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const handleNavigation = (href?: string) => {
    if (href) {
      navigate(href);
    }
  };

  const menuItems = getMenuItems(t);

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
            {item.children?.map((child: MenuItem) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
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
        <div className={cn(
          "flex flex-col border-b border-slate-100 dark:border-slate-800 flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/50 transition-all duration-300",
          isOpen ? "p-5" : "p-4 items-center"
        )}>
          <div className={cn(
            "flex items-center w-full",
            isOpen ? "justify-between" : "justify-center"
          )}>
            <div className={cn(
              "items-center gap-3 flex-1 min-w-0",
              isOpen ? "flex" : "hidden"
            )}>
              <div className={cn(
                "flex items-center justify-center bg-blue-600 rounded-xl shadow-sm transition-all duration-300",
                isOpen ? "w-10 h-10" : "w-8 h-8"
              )}>
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              {isOpen && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">
                    {t('admin_panel', 'Admin Panel')}
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {t('management', 'Management')}
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="w-8 h-8 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-500 z-10 flex-shrink-0"
            >
              {isOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>

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

export default AdminAppSidebar;
