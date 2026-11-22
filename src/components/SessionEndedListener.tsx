import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { logout } from "@/redux/AuthSlice";
import { ROUTES } from "@/constatnts/routesConstants";
import { AppRoutes } from "@/routes/AppRoutes";
import { SESSION_ENDED_EVENT } from "@/services/sessionGuard";

// When this browser's login session has ended on the server (Sign out elsewhere,
// "Log out" from another device's Logged-in Devices card, a password change, or
// 30 days unused), clear the login and go to the login page.
const SessionEndedListener = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.authData.isAuthenticated);
  const authenticated = useRef(isAuthenticated);
  authenticated.current = isAuthenticated;

  useEffect(() => {
    const onSessionEnded = () => {
      localStorage.removeItem("token");
      if (!authenticated.current) return;
      dispatch(logout());
      toast.info(
        t("session_ended_login_again", "This device was logged out. Please log in again."),
        { toastId: "session-ended" }
      );
      AppRoutes.navigate(ROUTES.AUTH.LOGIN, { replace: true });
    };
    window.addEventListener(SESSION_ENDED_EVENT, onSessionEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onSessionEnded);
  }, [dispatch, t]);

  return null;
};

export default SessionEndedListener;
