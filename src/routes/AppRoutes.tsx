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
import CreateAdmin from "@/pages/AdminMaster/CreateAdmin";
import AddBranch from "@/pages/AdminMaster/AddBranch";
import UploadRateChart from "@/pages/AdminMaster/UploadRateChart";
import SidebarAccessManagement from "@/pages/AdminMaster/SidebarAccessManagement";
import Login from "@/pages/Auth/LogIn";
import ResetPassword from "@/pages/Auth/ResetPassword";
import SignUp from "@/pages/Auth/SignUp";
import SetNewPassword from "@/pages/Auth/SetNewPassword";
import FarmerDeduction from "@/pages/Billing/FarmerDeduction";
import GenerateBill from "@/pages/Billing/GenerateBill";
import PaymentAndReceipt from "@/pages/Billing/PaymentAndReceipt";
import VlcCommissionEntry from "@/pages/Billing/VlcCommissionEntry";
import VlcTsEntry from "@/pages/Billing/VlcTsEntry";
import FarmerCommissionEntry from "@/pages/Billing/FarmerCommissionEntry";
import BMCCollection from "@/pages/Collection/BMCCollection";
import ChillingCenter from "@/pages/Collection/ChillingCenter";
import CCCollectionEntry from "@/pages/CC_Collection/CC_Collection_Entry";
import WeightCollection from "@/pages/CC_Collection/WeightCollection";
import AnalyserCollection from "@/pages/CC_Collection/AnalyserCollection";
import FarmerManagement from "@/pages/Collection/FarmerManagement";
import VLCCllection from "@/pages/Collection/VLCCllection";
import DispatchEntry from "@/pages/CollectionEntry/DispatchEntry";
import FarmerCollectionEntry from "@/pages/CollectionEntry/FarmerCollectionEntry";
import VLCCollectionEntry from "@/pages/CollectionEntry/VLCCollectionEntry";
import AdminDashboard from "@/pages/Dashboard/AdminDashboard";
import Dashboard from "@/pages/Dashboard/Dashboard";
import { AddFarmer } from "@/pages/Master/AddFarmer";
import AddRateChart from "@/pages/Master/AddRateChart";
import Bonus from "@/pages/Master/Bonus";
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
import BankSummary from "@/pages/Reports/BankSummary";
import CattleFeedStockReport from "@/pages/Reports/CattleFeedStockReport";
import CattleFeedFarmerWiseReport from "@/pages/Reports/CattleFeedFarmerWiseReport";
import CattleFeedSalesReport from "@/pages/Reports/CattleFeedSalesReport";
import CattleFeedPurchasesReport from "@/pages/Reports/CattleFeedPurchasesReport";
import BonusReport from "@/pages/Reports/BonusReport";
import GeneralSettings from "@/pages/Settings/GeneralSettings";
import CattleFeedStockSettings from "@/pages/Settings/CattleFeedStock";
import PasswordManager from "@/pages/Settings/PasswordManager";
import AdminCreateUser from "@/pages/Settings/AdminCreateUser";
import ShubhamMilkProduct from "@/pages/ShubhamMilkProduct/ShubhamMilkProduct";
import TankerCollection from "@/pages/TankerCollection/TankerCollection";
import DynamicBillCycle from "@/pages/DynamicBillCycle/DynamicBillCycle";
import Profile from "@/pages/Profile/Profile";
import AvatarSelector from "@/pages/Profile/AvatarSelector";
import GroupCattleFeedStock from "@/pages/Payment/GroupCattleFeedStock";
import FarmerPayment from "@/pages/Payment/FarmerPayment";
import Attendance from "@/pages/Attendance/Attendance";
import Supervisor from "@/pages/Attendance/Supervisor";
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
        path: "cc-collection-entry",
        element: <CCCollectionEntry />,
      },
      {
        path: "weight-collection",
        element: <WeightCollection />,
      },
      {
        path: "analyser-collection",
        element: <AnalyserCollection />,
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
        path: "bonus",
        element: <Bonus />,
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
        path: "farmer-commission-entry",
        element: <FarmerCommissionEntry />,
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
        path: "bank-summary",
        element: <BankSummary />,
      },
      {
        path: "cattle-feed-farmer-wise-report",
        element: <CattleFeedFarmerWiseReport />,
      },
      {
        path: "cattle-feed-sales-report",
        element: <CattleFeedSalesReport />,
      },
      {
        path: "cattle-feed-stock-report",
        element: <CattleFeedStockReport />,
      },
      {
        path: "cattle-feed-purchase-report",
        element: <CattleFeedPurchasesReport />,
      },
      {
        path: "bonus-report",
        element: <BonusReport />,
      },
      {
        path: "general-settings",
        element: <GeneralSettings />,
      },
      {
        path: "cattle-feed-stock",
        element: <CattleFeedStockSettings />,
      },
      {
        path: "password-manager",
        element: <PasswordManager />,
      },
      {
        path: "sidebar-access",
        element: <SidebarAccessManagement />,
      },
      {
        path: "create-user",
        element: <AdminCreateUser />,
      },
      {
        path: "shubham-milk-product",
        element: <ShubhamMilkProduct />,
      },
      {
        path: "tanker-collection",
        element: <TankerCollection />,
      },
      {
        path: "group-cattle-feed-stock",
        element: <GroupCattleFeedStock />,
      },
      {
        path: "farmer-payment",
        element: <FarmerPayment />,
      },
      {
        path: "dynamic-bill-cycle",
        element: <DynamicBillCycle />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "avatar-selector",
        element: <AvatarSelector />,
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
        path: "create-admin",
        element: <CreateAdmin />,
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
        path: "upload-rate-chart",
        element: <UploadRateChart />,
      },
      {
        path: "sidebar-access",
        element: <SidebarAccessManagement />,
      },
      {
        path: "activation",
        element: <Activation />,
      },
      {
        path: "web-application-activation",
        element: <WebApplicationActivation />,
      },
      {
        path: "attendance",
        element: <Attendance />,
      },
      {
        path: "attendance/supervisor",
        element: <Supervisor />,
      },
    ],
  },
]);
