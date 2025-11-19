export const ROUTES = {
  AUTH: {
    LOGIN: `/login`,
    SIGNUP: `/signup`,
    OTP_VERIFICATION: `/otp-verification`,
    RESET_PWD: `/reset-password`,
    SET_NEW_PWD: `/set-password`,
    SET_NEW_PASSWORD: `/set-new-password`,
    ADMIN_LAYOUT:`/admin`,
  },
  LANDING_PAGE: "/start",
  DASHBOARD: `/dashboard`,
  COLLECTIONENTRY: {
    VLC_COLLECTION_ENTRY: `/dashboard/collectionentry/vlc-collection-entry`,
    FARMER_COLLECTION_ENTRY: `/dashboard/collectionentry/farmer-collection-entry`,
    DISPATCH_ENTRY:`/dashboard/collectionentry/dispatch-entry`
  },
  COLLECTION:{
    VLC_COLLECTION:`/dashboard/vlc-collection`,
    BMC_COLLECTION:`/dashboard/bmc-collection`,
    CHILLING_CENTER:`/dashboard/chilling-center`,
    FARMER_MANAGEMENT:`/dashboard/farmer-management`,
  },
  MASTER:{
    ADD_FARMER:`/dashboard/add-farmer`,
    ADD_RATECHART:`/dashboard/add-rate-chart`,
  },
  BILLING:{
    FARMER_DEDUCTION:`/dashboard/farmer-deduction`,
    GENERATE_BILL:`/dashboard/generate-bill`,
    PAYMENTANDRECEIPT:`/dashboard/payment-and-receipt`,
    VLC_COMMISSION_ENTRY:`/dashboard/vlc-commission-entry`,
    VLC_TS_ENTRY:`/dashboard/vlc-ts-entry`,
  },
  REPORTS:{
    FARMER_BILL_INVOICE_REPORT:`/dashboard/farmer-bill-invoice-report`,
    FARMER_COLLECTION:`/dashboard/farmer-collection`,
    FARMER_LIST:`/dashboard/farmer-list`,
    FARMER_PASSBOOK:`/dashboard/farmer-passbook`,
    PAYMENT_SUMMARY:`/dashboard/payment-summary`,
    PL_STATEMENT:`/dashboard/pl-statement`,
    RATECHART_REPORT:`/dashboard/ratechart-report`,
    REMAINING_BALANCE:`/dashboard/remaining-balance`,
    SHIFT_REPORTS:`/dashboard/shift-reports`,
    TOTAL_COLLECTION_REPORT:`/dashboard/total-collection-report`,
    VLC_COMMISSION_REPORT:`/dashboard/vlc-commission-report`,
    VLC_DIFFERENCE_REPORT: `/dashboard/vlc-diffrerence-report`,
  },
  SETTINGS:{
    GENERAL_SETTINGS:`/dashboard/general-settings`,
  },
  ADMIN_DASHBOARD:`/admin/admin-dashboard`,
  ADMIN_CREATE_USER:`/admin/create-user`,
  ADMIN_MASTER:{
    MOBILE_APPLICATION:`/admin/mobile-application`,
    WEB_APPLICATION:`/admin/web-application`,
    FARMER_APPLICATION:`/admin/farmer-application`,
    ADD_BRANCH:`/admin/add-branch`,
    UPLOAD_RATE_CHART:`/admin/upload-rate-chart`,
  },
  ACTIVATION:{
    ACTIVATION:`/admin/activation`,
    WEB_APPLICATION_ACTIVATION:`/admin/web-application-activation`,
  }
};
