import { ROUTES } from "./routesConstants";

// The items inside each sidebar section that can be switched on or off per user
// (Sidebar Access → item_access). The sidebar builds these sections from this
// list and the Sidebar Access page lists the same switches, so the two can
// never disagree.
//
// `key` is stored in sidebar_access.item_access — never rename one, or every
// user's switch for that item falls back to on.

export type SidebarSectionKey = "collection_entry" | "collection" | "master" | "billing" | "reports" | "settings";

export interface SidebarItemDef {
  key: string;
  titleKey: string;
  titleDefault: string;
  // Added after the translated title ("VLC Difference Report" + " 1").
  titleSuffix?: string;
  href?: string;
  // Only admin web users ever see it in the sidebar.
  adminOnly?: boolean;
  // A sub-group inside the section (Master → Create, Reports → Farmer Reports).
  // Groups have no switch of their own stored: they disappear when all their
  // items are off (Sidebar Access offers a switch that sets all of them).
  children?: SidebarItemDef[];
}

/** A sidebar item's title as shown: translated, plus any suffix. */
export const itemTitle = (t: (key: string, fallback: string) => string, def: SidebarItemDef) =>
  t(def.titleKey, def.titleDefault) + (def.titleSuffix ?? "");

export const SECTION_ITEMS: Record<SidebarSectionKey, SidebarItemDef[]> = {
  collection_entry: [
    { key: "vlc_collection_entry", titleKey: "vlc_collection_entry", titleDefault: "VLC Collection Entry", href: ROUTES.COLLECTIONENTRY.VLC_COLLECTION_ENTRY },
    { key: "farmer_collection_entry", titleKey: "farmer_collection_entry", titleDefault: "Farmer Collection Entry", href: ROUTES.COLLECTIONENTRY.FARMER_COLLECTION_ENTRY },
    { key: "tanker_dispatch", titleKey: "tanker_dispatch", titleDefault: "Tanker Dispatch", href: ROUTES.COLLECTIONENTRY.DISPATCH_ENTRY },
    { key: "tanker_purchase", titleKey: "tanker_purchase", titleDefault: "Tanker Purchase", href: ROUTES.COLLECTIONENTRY.TANKER_PURCHASE },
    { key: "tanker_sale", titleKey: "tanker_sale", titleDefault: "Tanker Sale", href: ROUTES.COLLECTIONENTRY.TANKER_SALE },
  ],
  collection: [
    { key: "vlc_collection", titleKey: "vlc_collection", titleDefault: "VLC Collection", href: ROUTES.COLLECTION.VLC_COLLECTION },
    { key: "route_collection", titleKey: "route_collection", titleDefault: "Route Collection", href: ROUTES.COLLECTION.ROUTE_COLLECTION },
    { key: "bmc_collection", titleKey: "bmc_collection", titleDefault: "BMC Collection", href: ROUTES.COLLECTION.BMC_COLLECTION },
    { key: "tanker_collection", titleKey: "tanker", titleDefault: "Tanker", href: ROUTES.COLLECTION.TANKER },
    { key: "cc_collection", titleKey: "cc_collection", titleDefault: "CC Collection", href: ROUTES.CC_COLLECTION.CHILLING_CENTER },
  ],
  master: [
    { key: "add_farmer", titleKey: "add_farmer", titleDefault: "Add Farmer", href: ROUTES.MASTER.ADD_FARMER },
    { key: "add_rate_chart", titleKey: "add_rate_chart", titleDefault: "Add Rate Chart", href: ROUTES.MASTER.ADD_RATECHART },
    { key: "cattle_feed_stock", titleKey: "cattle_feed_stock", titleDefault: "Cattle Feed Stock", href: ROUTES.SETTINGS.CATTLE_FEED_STOCK },
    { key: "bonus", titleKey: "bonus", titleDefault: "Bonus", href: ROUTES.MASTER.BONUS },
    { key: "other_expense", titleKey: "other_expense", titleDefault: "Other Expense", href: ROUTES.MASTER.OTHER_EXPENSE },
    {
      key: "create",
      titleKey: "create",
      titleDefault: "Create",
      children: [
        { key: "create_route", titleKey: "create_route", titleDefault: "Create Route", href: ROUTES.MASTER.CREATE_ROUTE },
        { key: "create_bmc", titleKey: "create_bmc", titleDefault: "Create BMC", href: ROUTES.MASTER.CREATE_BMC },
        { key: "create_cc", titleKey: "create_cc", titleDefault: "Create CC", href: ROUTES.MASTER.CREATE_CC },
        { key: "create_transport", titleKey: "create_transport", titleDefault: "Create Transport", href: ROUTES.MASTER.CREATE_TRANSPORT },
        { key: "create_supervisor", titleKey: "create_supervisor", titleDefault: "Create Supervisor (Sub User)", href: ROUTES.SETTINGS.CREATE_USER, adminOnly: true },
        { key: "create_dairy", titleKey: "create_dairy", titleDefault: "Create Dairy", href: ROUTES.SETTINGS.CREATE_DAIRY, adminOnly: true },
        { key: "dairy_equipment", titleKey: "dairy_equipment", titleDefault: "Dairy Equipment", href: ROUTES.MASTER.DAIRY_EQUIPMENT, adminOnly: true },
      ],
    },
    {
      key: "commission_entry",
      titleKey: "commission_entry",
      titleDefault: "Commission Entry",
      children: [
        { key: "vlc_commission_entry", titleKey: "vlc_commission_entry", titleDefault: "VLC Commission Entry", href: ROUTES.BILLING.VLC_COMMISSION_ENTRY },
        { key: "farmer_commission_entry", titleKey: "farmer_commission_entry", titleDefault: "Farmer Commission Entry", href: ROUTES.BILLING.FARMER_COMMISSION_ENTRY },
      ],
    },
  ],
  billing: [
    { key: "payment_receipt", titleKey: "payment_receipt", titleDefault: "Payment & Receipt", href: ROUTES.BILLING.PAYMENTANDRECEIPT },
    { key: "farmer_deduction", titleKey: "farmer_deduction", titleDefault: "Farmer Deduction", href: ROUTES.BILLING.FARMER_DEDUCTION },
    { key: "generate_bill", titleKey: "generate_bill", titleDefault: "Generate Bill", href: ROUTES.BILLING.GENERATE_BILL },
    { key: "vlc_ts_entry", titleKey: "vlc_ts_entry", titleDefault: "VLC TS Entry", href: ROUTES.BILLING.VLC_TS_ENTRY },
  ],
  // Grouped so the sidebar list stays short; each group opens to its reports.
  reports: [
    {
      key: "collection_reports",
      titleKey: "collection_reports",
      titleDefault: "Collection Reports",
      children: [
        { key: "shift_report", titleKey: "shift_report", titleDefault: "Shift Report", href: ROUTES.REPORTS.SHIFT_REPORTS },
        { key: "manual_auto_shift_report", titleKey: "manual_auto_shift_report", titleDefault: "Manual/Auto Shift Report", href: ROUTES.REPORTS.MANUAL_AUTO_SHIFT_REPORT },
        { key: "dispatch_status_report", titleKey: "dispatch_status_report", titleDefault: "Dispatch Status Report", href: ROUTES.REPORTS.DISPATCH_STATUS_REPORT },
        { key: "vlc_collection_entry_report", titleKey: "vlc_collection_entry_report", titleDefault: "VLC Collection Entry Report", href: ROUTES.REPORTS.VLC_COLLECTION_ENTRY_REPORT },
        { key: "tanker_dispatch_report", titleKey: "tanker_dispatch_report", titleDefault: "Tanker Dispatch Report", href: ROUTES.REPORTS.TANKER_DISPATCH_REPORT },
        { key: "tanker_profit_loss_report", titleKey: "tanker_profit_loss_report", titleDefault: "Tanker Profit & Loss Report", href: ROUTES.REPORTS.TANKER_PROFIT_LOSS_REPORT },
        { key: "tanker_daywise_report", titleKey: "tanker_daywise_report", titleDefault: "Tanker Day-wise Purchase & Sale Report", href: ROUTES.REPORTS.TANKER_DAYWISE_REPORT },
        { key: "farmer_collection_report", titleKey: "farmer_collection", titleDefault: "Farmer Collection", href: ROUTES.REPORTS.FARMER_COLLECTION },
        { key: "total_collection_report", titleKey: "total_collection_report", titleDefault: "Total Collection Report", href: ROUTES.REPORTS.TOTAL_COLLECTION_REPORT },
        { key: "vlc_difference_report_1", titleKey: "vlc_difference_report", titleDefault: "VLC Difference Report", titleSuffix: " 1", href: ROUTES.REPORTS.VLC_DIFFERENCE_REPORT },
        { key: "vlc_difference_report_2", titleKey: "vlc_difference_report", titleDefault: "VLC Difference Report", titleSuffix: " 2", href: ROUTES.REPORTS.VLC_DIFFERENCE_REPORT_2 },
      ],
    },
    {
      key: "farmer_reports",
      titleKey: "farmer_reports",
      titleDefault: "Farmer Reports",
      children: [
        { key: "farmer_list_report", titleKey: "farmer_list", titleDefault: "Farmer List", href: ROUTES.REPORTS.FARMER_LIST },
        { key: "farmer_passbook_report", titleKey: "farmer_passbook", titleDefault: "Farmer Passbook", href: ROUTES.REPORTS.FARMER_PASSBOOK },
        { key: "rate_chart_report", titleKey: "rate_chart_report", titleDefault: "Rate Chart Report", href: ROUTES.REPORTS.RATECHART_REPORT },
        { key: "bonus_report", titleKey: "bonus_report", titleDefault: "Bonus Report", href: ROUTES.REPORTS.BONUS_REPORT },
      ],
    },
    {
      key: "billing_payment_reports",
      titleKey: "billing_payment_reports",
      titleDefault: "Billing & Payment",
      children: [
        { key: "payment_summary_report", titleKey: "payment_summary_report", titleDefault: "Payment Summary Report", href: ROUTES.REPORTS.PAYMENT_SUMMARY },
        { key: "farmer_bill_invoice_report", titleKey: "farmer_bill_invoice_report", titleDefault: "Farmer Bill Invoice Report", href: ROUTES.REPORTS.FARMER_BILL_INVOICE_REPORT },
        { key: "bank_summary_report", titleKey: "bank_summary_report", titleDefault: "Bank Summary", href: ROUTES.REPORTS.BANK_SUMMARY_REPORT },
        { key: "remaining_balance_report", titleKey: "remaining_balance_report", titleDefault: "Remaining Balance Report", href: ROUTES.REPORTS.REMAINING_BALANCE },
        { key: "pl_statement", titleKey: "pl_statement", titleDefault: "P/L Statement", href: ROUTES.REPORTS.PL_STATEMENT },
      ],
    },
    {
      key: "commission_neft_reports",
      titleKey: "commission_neft_reports",
      titleDefault: "Commission & NEFT",
      children: [
        { key: "vlc_commission_report", titleKey: "vlc_commission_report", titleDefault: "VLC Commission Report", href: ROUTES.REPORTS.VLC_COMMISSION_REPORT },
        { key: "farmer_commission_report", titleKey: "farmer_commission_report", titleDefault: "Farmer Commission Report", href: ROUTES.REPORTS.FARMER_COMMISSION_REPORT },
        { key: "farmer_neft_statement", titleKey: "farmer_neft_statement", titleDefault: "Farmer Bank NEFT Statement", href: ROUTES.REPORTS.FARMER_NEFT_STATEMENT },
        { key: "vlc_commission_neft", titleKey: "vlc_commission_neft", titleDefault: "VLC Commission NEFT", href: ROUTES.REPORTS.VLC_COMMISSION_NEFT },
      ],
    },
    {
      key: "transport_reports",
      titleKey: "transport_collection",
      titleDefault: "Transport Collection",
      children: [
        { key: "transport_neft_statement", titleKey: "transport_neft_statement", titleDefault: "Transport NEFT Statement", href: ROUTES.REPORTS.TRANSPORT_NEFT_STATEMENT },
        { key: "transport_bill_invoice", titleKey: "transport_bill_invoice", titleDefault: "Transport Bill Invoice", href: ROUTES.REPORTS.TRANSPORT_BILL_INVOICE },
      ],
    },
    {
      key: "cattle_feed_reports",
      titleKey: "cattle_feed_report",
      titleDefault: "Cattle Feed Report",
      children: [
        { key: "farmer_wise_cattle_feed_report", titleKey: "farmer_wise_cattle_feed_report", titleDefault: "Farmer-wise Cattle Feed Report", href: ROUTES.REPORTS.CATTLE_FEED_FARMER_WISE_REPORT },
        { key: "cattle_feed_sales_report", titleKey: "cattle_feed_sales_report", titleDefault: "Cattle Feed Sales Report", href: ROUTES.REPORTS.CATTLE_FEED_SALES_REPORT },
        { key: "cattle_feed_stock_report", titleKey: "cattle_feed_stock_report", titleDefault: "Cattle Feed Stock Report", href: ROUTES.REPORTS.CATTLE_FEED_STOCK_REPORT },
        { key: "cattle_feed_purchases_report", titleKey: "cattle_feed_purchases_report", titleDefault: "Cattle Feed Purchases Report", href: ROUTES.REPORTS.CATTLE_FEED_PURCHASE_REPORT },
      ],
    },
  ],
  settings: [
    { key: "general_settings", titleKey: "general_settings", titleDefault: "General Settings", href: ROUTES.SETTINGS.GENERAL_SETTINGS },
    { key: "password_manager", titleKey: "password_manager", titleDefault: "Password Manager", href: ROUTES.SETTINGS.PASSWORD_MANAGER },
    { key: "tanker_collector", titleKey: "tanker_collector", titleDefault: "Tanker Collector", href: ROUTES.TANKER_COLLECTION, adminOnly: true },
    { key: "sidebar_access", titleKey: "sidebar_access", titleDefault: "Sidebar Access", href: ROUTES.SETTINGS.SIDEBAR_ACCESS, adminOnly: true },
    { key: "shift_timings", titleKey: "shift_timings", titleDefault: "Shift Timings", href: ROUTES.SETTINGS.SHIFT_TIMINGS, adminOnly: true },
  ],
};

/** The switchable items of a section (groups flattened). */
export const leafItems = (defs: SidebarItemDef[]): SidebarItemDef[] =>
  defs.flatMap((def) => (def.children ? leafItems(def.children) : [def]));

/** Every item key, across all sections. */
export const ALL_ITEM_KEYS = (Object.values(SECTION_ITEMS) as SidebarItemDef[][]).flatMap((defs) => leafItems(defs).map((d) => d.key));
