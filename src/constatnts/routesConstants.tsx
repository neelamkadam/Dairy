export const ROUTES = {
  AUTH: {
    LOGIN: `/login`,
    SIGNUP: `/signup`,
    OTP_VERIFICATION: `/otp-verification`,
    RESET_PWD: `/reset-password`,
    SET_NEW_PWD: `/set-password`,
  },
  LANDING_PAGE: "/start",
  DASHBOARD: `/`,
  COLLECTIONENTRY: {
    VLC_COLLECTION_ENTRY: `/collectionentry/vlc-collection-entry`,
    FARMER_COLLECTION_ENTRY: `/collectionentry/farmer-collection-entry`,
    DISPATCH_ENTRY:`/collectionentry/dispatch_entry"`
  },
  COLLECTION:{
    VLC_COLLECTION:`/vlc-collection`,
    BMC_COLLECTION:`/bmc-collection`,
    CHILLING_CENTER:`/chilling-center`,
    FARMER_MANAGEMENT:`/farmer-management`,
  },
  MASTER:{
    ADD_FARMER:`/add-farmer`,
    ADD_RATECHART:`/add-rate-chart`,
  },
  BILLING:{
    FARMER_DEDUCTION:`/farmer-deduction`,
    GENERATE_BILL:`/generate-bill`,
    PAYMENTANDRECEIPT:`/payment-and-receipt`,
    VLC_COMMISSION_ENTRY:`/vlc-commission-entry`,
    VLC_TS_ENTRY:`/vlc-ts-entry`,
  },
  REPORTS:{
    FARMER_BILL_INVOICE_REPORT:`/farmer-bill-invoice-report`,
    FARMER_COLLECTION:`/farmer-collection`,
    FARMER_LIST:`/farmer-list`,
    FARMER_PASSBOOK:`/farmer-passbook`,
    PAYMENT_SUMMARY:`/payment-summary`,
    PL_STATEMENT:`/pl-statement`,
    RATECHART_REPORT:`/ratechart-report`,
    REMAINING_BALANCE:`/remaining-balance`,
    SHIFT_REPORTS:`/shift-reports`,
    TOTAL_COLLECTION_REPORT:`/total-collection-report`,
    VLC_COMMISSION_REPORT:`/vlc-commission-report`,
    VLC_DIFFERENCE_REPORT: `/vlc-diffrerence-report`,
  }
};
