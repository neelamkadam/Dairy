
import { useState } from "react";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTES } from "@/constatnts/routesConstants";
import { useLocation, useNavigate } from "react-router-dom";

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
    href: ROUTES.ADMIN_DASHBOARD,
  },

  {
    title: "Master",
    icon: "⚙️",
    children: [
      { title: "Mobile Application", icon: "", href:ROUTES.ADMIN_MASTER.MOBILE_APPLICATION},
      { title: "Web Application", icon: "", href:ROUTES.ADMIN_MASTER.WEB_APPLICATION},
      { title: "Farmer Application", icon: "", href: ROUTES.ADMIN_MASTER.FARMER_APPLICATION}
    ]
  },

  {
    title: "Activation",
    icon: "⚙️",
    children: [
      { title: "Activation", icon: "", href:ROUTES.ACTIVATION.ACTIVATION},
      { title: "Web Application Activation", icon: "", href: ROUTES.ACTIVATION.WEB_APPLICATION_ACTIVATION}
    ]
  }
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const AdminAppSidebar = ({ isOpen, onToggle }: SidebarProps) => {
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
    <div className={cn(
      "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col h-screen",
      isOpen ? "w-64" : "w-16"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4.5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">💧</span>
          </div>
          {isOpen && (
            <span className="font-bold text-xl text-gray-900 dark:text-white">
              AdminPanel
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-5 z-10"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-2">
          {menuItems.map(item => renderMenuItem(item))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminAppSidebar;
