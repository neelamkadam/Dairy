import { useState, useEffect } from "react";
import { Bell, Menu, User, Settings, LogOut, ChevronDown } from "lucide-react";
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
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { logout } from "@/redux/AuthSlice";

interface NavbarProps {
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

const AppNavbar = ({}: NavbarProps) => {
  const { t, i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState("English");
  const [notifications] = useState([
    { id: 1, title: "New milk collection entry", time: "2 min ago" },
    { id: 2, title: "Payment reminder", time: "10 min ago" },
    { id: 3, title: "Rate chart updated", time: "1 hour ago" },
  ]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.authData?.userData);
  const [showLanguageGuide, setShowLanguageGuide] = useState(false);
  const [userAvatar, setUserAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=default');

  useEffect(() => {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) setUserAvatar(savedAvatar);
  }, []);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenLanguageGuide');
    if (!hasSeenGuide) {
      setShowLanguageGuide(true);
    }
  }, []);

  const dismissGuide = () => {
    localStorage.setItem('hasSeenLanguageGuide', 'true');
    setShowLanguageGuide(false);
  };

  const languages = [
    { key: "en", value: "English", flag: "🇬🇧" },
    { key: "hi", value: "हिंदी", flag: "🇮🇳" },
    { key: "mr", value: "मराठी", flag: "🇮🇳" },
    { key: "kn", value: "ಕನ್ನಡ", flag: "🇮🇳" },
  ];

  useEffect(() => {
    const currentLang = languages.find(lang => lang.key === i18n.language);
    if (currentLang) {
      setSelectedLang(currentLang.value);
    }
  }, [i18n.language]);

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
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-3 shadow-sm sticky top-0 z-30 transition-all duration-300">
      <div className="flex items-center justify-between">
        {/* Left side - Mobile Menu Button */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const event = new CustomEvent('toggleSidebar');
              window.dispatchEvent(event);
            }}
            className="lg:hidden mr-2 hover:bg-slate-100 rounded-xl"
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </Button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Localization */}
          <div className="relative">
            <AppDropdown
              triggerText={selectedLang}
              selectedKey={i18n.language}
              menuItems={languages}
              onItemSelect={(key, value) => {
                handleItemSelect(key, value);
                dismissGuide();
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {showLanguageGuide && (
              <div className="absolute top-full mt-2 right-0 z-50 animate-bounce">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 whitespace-nowrap">
                  <span className="text-sm font-medium">{t('select_your_language', 'Select your language')}</span>
                  <button onClick={dismissGuide} className="ml-2 text-white hover:text-gray-200">
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications
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
          </DropdownMenu> */}

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-1 pr-2 hover:bg-slate-50 border border-slate-200 bg-white rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm ml-2">
                <div className="relative ml-1">
                  <img src={userAvatar} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="hidden sm:flex flex-col items-start mr-1">
                  <span className="text-sm font-semibold text-slate-700 leading-none">{user?.name || "Administrator"}</span>
                  <span className="text-[10px] text-slate-500 mt-1 leading-none">Neodairy</span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-xl rounded-xl p-1 font-inter">
              <div className="px-3 py-2.5 mb-1 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.name || "Administrator"}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || "admin@neodairy.com"}</p>
              </div>
              <DropdownMenuItem onClick={() => navigate(ROUTES.PROFILE)} className="hover:bg-slate-50 cursor-pointer rounded-lg px-3 py-2 text-slate-700 flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span>{t('profile', 'Profile')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS.GENERAL_SETTINGS)} className="hover:bg-slate-50 cursor-pointer rounded-lg px-3 py-2 text-slate-700 flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-400" />
                <span>{t('settings')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-slate-100" />
              <DropdownMenuItem onClick={handleSignOut} className="hover:bg-red-50 focus:bg-red-50 cursor-pointer rounded-lg px-3 py-2 text-red-600 flex items-center gap-2">
                <LogOut className="h-4 w-4 text-red-500" />
                <span>{t('sign_out', 'Sign out')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AppNavbar;
