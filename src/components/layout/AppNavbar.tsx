import { useState } from "react";
import { Bell} from "lucide-react";
import { Button } from "@/components/ui/button";

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
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constatnts/routesConstants";
import { useAppDispatch } from "@/redux/store";
import { logout } from "@/redux/AuthSlice";

interface NavbarProps {
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

const AppNavbar = ({}: NavbarProps) => {
  const [selectedLang, setSelectedLang] = useState("English");
  const [notifications] = useState([
    { id: 1, title: "New milk collection entry", time: "2 min ago" },
    { id: 2, title: "Payment reminder", time: "10 min ago" },
    { id: 3, title: "Rate chart updated", time: "1 hour ago" },
  ]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { i18n } = useTranslation();

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

  const handleSignOut = () => {
    localStorage.removeItem("token");
    dispatch(logout());
    navigate(ROUTES.AUTH.LOGIN);
  }
  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 md:py-5 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left side - empty for now */}
        <div className="flex-1"></div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Localization */}
          <AppDropdown
            triggerText={selectedLang}
            menuItems={languages}
            onItemSelect={handleItemSelect}
          />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative p-2 hover:bg-gray-100">
                <Bell size={20} className="text-gray-600" />
                {notifications.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs bg-red-500">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white border border-gray-200 shadow-lg">
              <DropdownMenuLabel className="font-semibold">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <span className="font-medium text-gray-900">{notification.title}</span>
                  <span className="text-sm text-gray-500">{notification.time}</span>
                </DropdownMenuItem>
              ))}
              {notifications.length === 0 && (
                <DropdownMenuItem disabled className="text-gray-500">
                  No new notifications
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 hover:bg-gray-100 rounded-full">
                <AccountCircleIcon className="text-gray-600" style={{ fontSize: 32 }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
              <DropdownMenuItem onClick={() => navigate(ROUTES.PROFILE)} className="hover:bg-gray-50 cursor-pointer">Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS.GENERAL_SETTINGS)} className="hover:bg-gray-50 cursor-pointer">Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="hover:bg-gray-50 cursor-pointer text-red-600">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AppNavbar;
