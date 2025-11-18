import { Navigate } from "react-router-dom";
import { ROUTES } from "@/constatnts/routesConstants";
import { useAppSelector } from "@/redux/store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, userRole, userData } = useAppSelector((state) => state.authData);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH.LOGIN} replace />;
  }

  // For users, also check if they have a valid userId
  if (requiredRole === "user" && !userData.id) {
    return <Navigate to={ROUTES.AUTH.LOGIN} replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to={ROUTES.AUTH.LOGIN} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;