import { ROUTES } from "@/constatnts/routesConstants";
import SignUp from "@/pages/Auth/SignUp";
import { createBrowserRouter } from "react-router-dom";

export const AppRoutes = createBrowserRouter([
    {
        path:ROUTES.SIGNUP,
        element:<SignUp/>,
    }
]);