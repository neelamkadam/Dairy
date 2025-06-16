import AdminAppLayout from "@/components/layout/AdminLayout/AdminAppLayout";
import AppLayout from "@/components/layout/AppLayout";
import { ROUTES } from "@/constatnts/routesConstants";
import { Activation } from "@/pages/Activation/Activation";
import { WebApplicationActivation } from "@/pages/Activation/WebApplicationActivation";
import { FarmerApplication } from "@/pages/AdminMaster/FarmerApplication";
import { MobileApplication } from "@/pages/AdminMaster/MobileApplication";
import { WebApplication } from "@/pages/AdminMaster/WebApplication";
import Login from "@/pages/Auth/LogIn";
import ResetPassword from "@/pages/Auth/ResetPassword";
import SignUp from "@/pages/Auth/SignUp";
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
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: <Dashboard />,
      },
      {
        path: ROUTES.COLLECTIONENTRY.VLC_COLLECTION_ENTRY,
        element: <VLCCollectionEntry />,
      },
      {
        path: ROUTES.COLLECTIONENTRY.FARMER_COLLECTION_ENTRY,
        element: <FarmerCollectionEntry />,
      },
      {
        path: ROUTES.COLLECTIONENTRY.DISPATCH_ENTRY,
        element: <DispatchEntry />,
      },
      {
        path: ROUTES.COLLECTION.VLC_COLLECTION,
        element: <VLCCllection />,
      },
      {
        path: ROUTES.COLLECTION.BMC_COLLECTION,
        element: <BMCCollection />,
      },
      {
        path: ROUTES.COLLECTION.CHILLING_CENTER,
        element: <ChillingCenter />,
      },
      {
        path: ROUTES.COLLECTION.FARMER_MANAGEMENT,
        element: <FarmerManagement />,
      },
      {
        path: ROUTES.MASTER.ADD_FARMER,
        element: <AddFarmer />,
      },
      {
        path: ROUTES.MASTER.ADD_RATECHART,
        element: <AddRateChart />,
      },
      {
        path: ROUTES.BILLING.FARMER_DEDUCTION,
        element: <FarmerDeduction />,
      },
      {
        path: ROUTES.BILLING.GENERATE_BILL,
        element: <GenerateBill />,
      },
      {
        path: ROUTES.BILLING.PAYMENTANDRECEIPT,
        element: <PaymentAndReceipt />,
      },
      {
        path: ROUTES.BILLING.VLC_COMMISSION_ENTRY,
        element: <VlcCommissionEntry />,
      },
      {
        path: ROUTES.BILLING.VLC_TS_ENTRY,
        element: <VlcTsEntry />,
      },
      {
        path: ROUTES.REPORTS.FARMER_BILL_INVOICE_REPORT,
        element: <FarmerBillInvoiceReport />,
      },
      {
        path: ROUTES.REPORTS.FARMER_COLLECTION,
        element: <FarmerCollection />,
      },
      {
        path: ROUTES.REPORTS.FARMER_LIST,
        element: <FarmerList />,
      },
      {
        path: ROUTES.REPORTS.FARMER_PASSBOOK,
        element: <FarmerPassbook />,
      },
      {
        path: ROUTES.REPORTS.PAYMENT_SUMMARY,
        element: <PaymentSummaryReport />,
      },
      {
        path: ROUTES.REPORTS.PL_STATEMENT,
        element: <PLStatement />,
      },
      {
        path: ROUTES.REPORTS.RATECHART_REPORT,
        element: <RateChartReport />,
      },
      {
        path: ROUTES.REPORTS.REMAINING_BALANCE,
        element: <RemainingBalanceReport />,
      },
      {
        path: ROUTES.REPORTS.SHIFT_REPORTS,
        element: <ShiftReports />,
      },
      {
        path: ROUTES.REPORTS.TOTAL_COLLECTION_REPORT,
        element: <TotalCollectionReport />,
      },
      {
        path: ROUTES.REPORTS.VLC_COMMISSION_REPORT,
        element: <VlcCommissionReport />,
      },
      {
        path: ROUTES.REPORTS.VLC_DIFFERENCE_REPORT,
        element: <VlcDifferenceReport />,
      },
      {
        path: ROUTES.SETTINGS.GENERAL_SETTINGS,
        element: <GeneralSettings />,
      },
    ],
  },
  {
    path: ROUTES.AUTH.ADMIN_LAYOUT,
    element: <AdminAppLayout />,
    children: [
      {
        path: ROUTES.ADMIN_DASHBOARD,
        element: <AdminDashboard />,
      },
      {
        path: ROUTES.ADMIN_MASTER.MOBILE_APPLICATION,
        element: <MobileApplication />,
      },

      {
        path: ROUTES.ADMIN_MASTER.WEB_APPLICATION,
        element: <WebApplication />,
      },
      {
        path: ROUTES.ADMIN_MASTER.FARMER_APPLICATION,
        element: <FarmerApplication />,
      },
      {
        path: ROUTES.ACTIVATION.ACTIVATION,
        element: <Activation />,
      },
      {
        path: ROUTES.ACTIVATION.WEB_APPLICATION_ACTIVATION,
        element: <WebApplicationActivation />,
      },
    ],
  },
]);
