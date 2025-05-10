
import { ROUTES } from "@/constatnts/routesConstants";
import Login from "@/pages/Auth/Login";
import ResetPassword from "@/pages/Auth/ResetPassword";
import SignUp from "@/pages/Auth/SignUp";
import Dashboard from "@/pages/Dashboard/Dashboard";
import { createBrowserRouter } from "react-router-dom";

export const AppRoutes = createBrowserRouter([
    {
        path:ROUTES.AUTH.LOGIN,
        element:<Login/>,
    },
    {
        path:ROUTES.AUTH.SIGNUP,
        element:<SignUp/>,
    },
    {
        path:ROUTES.AUTH.RESET_PWD,
        element:<ResetPassword/>,
    },

    {
        path:ROUTES.DASHBOARD,
        element:<Dashboard/>,
    },

]);