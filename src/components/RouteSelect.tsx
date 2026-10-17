import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ALL_ROUTES, type VlcRoute } from "@/hooks/useRouteFilter";

interface RouteSelectProps {
  routes: VlcRoute[];
  value: string;
  onChange: (routeId: string) => void;
  className?: string;
}

// Route picker for VLC filters: "All Routes" plus each route with its VLC count.
const RouteSelect = ({ routes, value, onChange, className }: RouteSelectProps) => {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={onChange}>
      {/* Same height as the VLC dropdown it sits next to. */}
      <SelectTrigger className={cn("w-full border-gray-200 bg-white data-[size=default]:h-10", className)}>
        <SelectValue placeholder={t("select_route", "Select Route")} />
      </SelectTrigger>
      <SelectContent className="bg-white">
        <SelectItem value={ALL_ROUTES}>{t("all_routes", "All Routes")}</SelectItem>
        {routes.map((route) => (
          <SelectItem key={route.id} value={route.id}>
            {route.name}
            <span className="text-gray-400"> · {route.vlcCount} VLC</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default RouteSelect;
