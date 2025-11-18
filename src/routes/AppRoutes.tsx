import AdminAppLayout from "@/components/layout/AdminLayout/AdminAppLayout";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ROUTES } from "@/constatnts/routesConstants";
import { Activation } from "@/pages/Activation/Activation";
import { WebApplicationActivation } from "@/pages/Activation/WebApplicationActivation";
import { FarmerApplication } from "@/pages/AdminMaster/FarmerApplication";
import { MobileApplication } from "@/pages/AdminMaster/MobileApplication";
import { WebApplication } from "@/pages/AdminMaster/WebApplication";
import CreateUser from "@/pages/AdminMaster/CreateUser";
import AddBranch from "@/pages/AdminMaster/AddBranch";
import Login from "@/pages/Auth/LogIn";
import ResetPassword from "@/pages/Auth/ResetPassword";
import SignUp from "@/pages/Auth/SignUp";
import SetNewPassword from "@/pages/Auth/SetNewPassword";
import FarmerDeduction from "@/pages/Billing/FarmerDeduction";
import GenerateBill from "@/pages/Billing/GenerateBill";
import PaymentAndReceipt from "@/pages/Billing/PaymentAndReceipt";
import VlcCommissionEntry from "@/pages/Billing/VlcCommissionEntry";
import VlcTsEntry from "@/pages/Billing/VlcTsEntry";
import BMCCollection from "@/pages/Collection/BMCCollection";
import ChillingCenter from "@/pages/Collection/ChillingCenter";
import FarmerManagement from "@/pages/Collection/FarmerManagement";
import VLCCllection from "@/pages/Collection/VLCCllection";
import DispatchEntry from "@/pages/CollectionEntry/DispatchEntry";
import FarmerCollectionEntry from "@/pages/CollectionEntry/FarmerCollectionEntry";
import VLCCollectionEntry from "@/pages/CollectionEntry/VLCCollectionEntry";
import AdminDashboard from "@/pages/Dashboard/AdminDashboard";
import Dashboard from "@/pages/Dashboard/Dashboard";
import { AddFarmer } from "@/pages/Master/AddFarmer";
import AddRateChart from "@/pages/Master/AddRateChart";
import FarmerBillInvoiceReport from "@/pages/Reports/FarmerBillInvoiceReport";
import FarmerCollection from "@/pages/Reports/FarmerCollection";
import FarmerList from "@/pages/Reports/FarmerList";
import FarmerPassbook from "@/pages/Reports/FarmerPassbook";
import PaymentSummaryReport from "@/pages/Reports/PaymentSummaryReport";
import PLStatement from "@/pages/Reports/PLStatement";
import RateChartReport from "@/pages/Reports/RateChartReport";
import RemainingBalanceReport from "@/pages/Reports/RemainingBalanceReport";
import ShiftReports from "@/pages/Reports/ShiftReports";
import TotalCollectionReport from "@/pages/Reports/TotalCollectionReport";
import VlcCommissionReport from "@/pages/Reports/VlcCommissionReport";
import VlcDifferenceReport from "@/pages/Reports/VlcDifferenceReport";
import GeneralSettings from "@/pages/Settings/GeneralSettings";
import { createBrowserRouter } from "react-router-dom";

export const AppRoutes = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: ROUTES.AUTH.LOGIN,
    element: <Login />,
  },
  {
    path: ROUTES.AUTH.SIGNUP,
    element: <SignUp />,
  },
  {
    path: ROUTES.AUTH.RESET_PWD,
    element: <ResetPassword />,
  },
  {
    path: ROUTES.AUTH.SET_NEW_PASSWORD,
    element: <SetNewPassword />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute requiredRole="user">
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "collectionentry/vlc-collection-entry",
        element: <VLCCollectionEntry />,
      },
      {
        path: "collectionentry/farmer-collection-entry",
        element: <FarmerCollectionEntry />,
      },
      {
        path: "collectionentry/dispatch-entry",
        element: <DispatchEntry />,
      },
      {
        path: "vlc-collection",
        element: <VLCCllection />,
      },
      {
        path: "bmc-collection",
        element: <BMCCollection />,
      },
      {
        path: "chilling-center",
        element: <ChillingCenter />,
      },
      {
        path: "farmer-management",
        element: <FarmerManagement />,
      },
      {
        path: "add-farmer",
        element: <AddFarmer />,
      },
      {
        path: "add-rate-chart",
        element: <AddRateChart />,
      },
      {
        path: "farmer-deduction",
        element: <FarmerDeduction />,
      },
      {
        path: "generate-bill",
        element: <GenerateBill />,
      },
      {
        path: "payment-and-receipt",
        element: <PaymentAndReceipt />,
      },
      {
        path: "vlc-commission-entry",
        element: <VlcCommissionEntry />,
      },
      {
        path: "vlc-ts-entry",
        element: <VlcTsEntry />,
      },
      {
        path: "farmer-bill-invoice-report",
        element: <FarmerBillInvoiceReport />,
      },
      {
        path: "farmer-collection",
        element: <FarmerCollection />,
      },
      {
        path: "farmer-list",
        element: <FarmerList />,
      },
      {
        path: "farmer-passbook",
        element: <FarmerPassbook />,
      },
      {
        path: "payment-summary",
        element: <PaymentSummaryReport />,
      },
      {
        path: "pl-statement",
        element: <PLStatement />,
      },
      {
        path: "ratechart-report",
        element: <RateChartReport />,
      },
      {
        path: "remaining-balance",
        element: <RemainingBalanceReport />,
      },
      {
        path: "shift-reports",
        element: <ShiftReports />,
      },
      {
        path: "total-collection-report",
        element: <TotalCollectionReport />,
      },
      {
        path: "vlc-commission-report",
        element: <VlcCommissionReport />,
      },
      {
        path: "vlc-diffrerence-report",
        element: <VlcDifferenceReport />,
      },
      {
        path: "general-settings",
        element: <GeneralSettings />,
      },
    ],
  },
  {
    path: ROUTES.AUTH.ADMIN_LAYOUT,
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminAppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "admin-dashboard",
        element: <AdminDashboard />,
      },
      {
        path: "create-user",
        element: <CreateUser />,
      },
      {
        path: "mobile-application",
        element: <MobileApplication />,
      },
      {
        path: "web-application",
        element: <WebApplication />,
      },
      {
        path: "farmer-application",
        element: <FarmerApplication />,
      },
      {
        path: "add-branch",
        element: <AddBranch />,
      },
      {
        path: "activation",
        element: <Activation />,
      },
      {
        path: "web-application-activation",
        element: <WebApplicationActivation />,
      },
    ],
  },
]);
