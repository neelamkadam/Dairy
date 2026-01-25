import { useState, useEffect } from "react";
import AppNavbar from "./AppNavbar";
import AppSidebar from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import AccountStatusMonitor from "@/components/AccountStatusMonitor";
import { useAppSelector } from "@/redux/store";


const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const auth = useAppSelector((state: any) => state.authData);
  const userId = auth?.userData?.userId || auth?.userData?.id || auth?.tempUserData?.userId;

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    const handleToggle = () => setSidebarOpen(prev => !prev);
    window.addEventListener('toggleSidebar', handleToggle);
    return () => window.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  // Initialize theme from localStorage or system preference
  // useEffect(() => {
  //   const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
  //   const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
  //   const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  //   setTheme(initialTheme);
    
  //   // Apply theme to document
  //   if (initialTheme === 'dark') {
  //     document.documentElement.classList.add('dark');
  //   } else {
  //     document.documentElement.classList.remove('dark');
  //   }
  // }, []);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {userId && <AccountStatusMonitor userId={userId} />}
      {/* Sidebar */}
      <AppSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      {/* Main Content Area */}
      <div className={cn(
        "flex flex-col flex-1 min-h-screen transition-all duration-300",
        sidebarOpen ? "ml-0 lg:ml-64" : "ml-0 lg:ml-16"
      )}>
        {/* Navbar */}
        <AppNavbar theme={theme} onThemeToggle={toggleTheme} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;