export interface ClientModuleConfig {
  payrollEnabled: boolean;
  todayDeliveryEnabled: boolean;
  inventoryAccountingRulesEnabled: boolean;
  sqlConsoleEnabled: boolean;
}

export interface ClientBrandingConfig {
  clientName: string;
  shortCode: string;
  appTitle: string;
  themeColor: string;
  accentColor: string;
}

export interface ClientAppConfig {
  branding: ClientBrandingConfig;
  modules: ClientModuleConfig;
  customSupabaseUrl?: string;
  customSupabaseAnonKey?: string;
}

/**
 * White-Label Configuration for this specific Client Build.
 * 
 * To create a new client variant:
 * 1. Duplicate this repository for the new client (e.g. `client-acme-accounting`).
 * 2. Update the `branding` and `modules` below.
 * 3. Deploy to Vercel (see WHITE_LABEL_DEPLOYMENT_GUIDE.md).
 */
export const DEFAULT_CLIENT_CONFIG: ClientAppConfig = {
  branding: {
    clientName: "TAP Accounting",
    shortCode: "TAP",
    appTitle: "Tally Prime ERP",
    themeColor: "#003b6d",
    accentColor: "#007acc",
  },
  modules: {
    payrollEnabled: true,
    todayDeliveryEnabled: true,
    inventoryAccountingRulesEnabled: true,
    sqlConsoleEnabled: true,
  },
};

export function getClientConfig(): ClientAppConfig {
  return DEFAULT_CLIENT_CONFIG;
}
