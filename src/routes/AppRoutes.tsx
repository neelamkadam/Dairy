
import { ROUTES } from "@/constatnts/routesConstants";
import Login from "@/pages/Auth/LogIn";
import { createBrowserRouter } from "react-router-dom";

export const AppRoutes = createBrowserRouter([
    {
        path:ROUTES.AUTH.LOGIN,
        element:<Login/>,
    },
]);