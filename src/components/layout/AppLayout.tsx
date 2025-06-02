import { useState, useEffect, Children } from "react";
import AppNavbar from "./AppNavbar";
import AppSidebar from "./AppSidebar";
import { Outlet } from "react-router-dom";
import Dashboard from "@/pages/Dashboard/Dashboard";
import VLCCollectionEntry from "@/pages/CollectionEntry/VLCCollectionEntry";


const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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
    setSidebarOpen(!sidebarOpen);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex w-full">
      {/* Sidebar */}
      
      <AppSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <AppNavbar theme={theme} onThemeToggle={toggleTheme} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;