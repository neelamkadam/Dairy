import { useState } from "react";
import { Search, Bell, LogOut, Sun, Moon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import AppDropdown from "../ui/AppDropdown";
import { useTranslation } from "react-i18next";
import {CircleUser} from "lucide-react";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

interface NavbarProps {
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

const AppNavbar = ({}: NavbarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState("English");
  const [notifications] = useState([
    { id: 1, title: "New milk collection entry", time: "2 min ago" },
    { id: 2, title: "Payment reminder", time: "10 min ago" },
    { id: 3, title: "Rate chart updated", time: "1 hour ago" },
  ]);

  const { i18n } = useTranslation();
  const handleLogout = () => {
    console.log("Logging out...");
    // Add logout logic here
  };

  const languages = [
    { key: "en", value: "English" },
    { key: "hi", value: "Hindi" },
    { key: "mr", value: "Marathi" },
  ];
  const handleItemSelect = (key: any, value: any) => {
    console.log(`Selected item: ${key} ${value}`);
    setSelectedLang(value);
    i18n.changeLanguage(key);
  };
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-1">
        {/* Search */}
        <div className="flex items-center gap-4 flex-1 max-w-full sm:max-w-md w-full">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-full"
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 flex-wrap justify-end w-full sm:w-auto">
          {/* Localization */}
          <AppDropdown
            triggerText={selectedLang}
            menuItems={languages}
            onItemSelect={handleItemSelect}
          />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative p-2">
                <Bell size={20} />
                {notifications.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-3"
                >
                  <span className="font-medium">{notification.title}</span>
                  <span className="text-sm text-gray-500">
                    {notification.time}
                  </span>
                </DropdownMenuItem>
              ))}
              {notifications.length === 0 && (
                <DropdownMenuItem disabled>
                  No new notifications
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" className="flex items-center gap-1">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <AccountCircleIcon color="action" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40 mr-5 border-gray-300 bg-white">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AppNavbar;
