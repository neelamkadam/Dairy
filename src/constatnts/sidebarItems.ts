import { ROUTES } from "./routesConstants";

// The items inside each sidebar section that can be switched on or off per user
// (Sidebar Access → item_access). The sidebar builds these sections from this
// list and the Sidebar Access page lists the same switches, so the two can
// never disagree. Reports stays section-only and is not listed here.
//
// `key` is stored in sidebar_access.item_access — never rename one, or every
// user's switch for that item falls back to on.

export type SidebarSectionKey = "collection_entry" | "collection" | "master" | "billing" | "settings";

export interface SidebarItemDef {
  key: string;
  titleKey: string;
  titleDefault: string;
  href?: string;
  // Only admin web users ever see it in the sidebar.
  adminOnly?: boolean;
  // A sub-group inside the section (Master → Create, Commission Entry); groups
  // themselves are not switched, they disappear when all their items are off.
  children?: SidebarItemDef[];
}

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
