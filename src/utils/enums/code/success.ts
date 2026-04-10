export enum CASSuccessCode {
  // General Success (TEM10000s)
  OPERATION_SUCCESSFUL = "TEM10001",
  REQUEST_PROCESSED = "TEM10002",

  // Authentication Success (TEM11000s)
  LOGIN_SUCCESSFUL = "TEM11001",
  LOGOUT_SUCCESSFUL = "TEM11002",
  PASSWORD_CHANGED = "TEM11003",
  MFA_ENABLED = "TEM11004",

  // Account & Tenant Management Success (TEM12000s)
  ACCOUNT_CREATED = "TEM12001",
  ACCOUNT_UPDATED = "TEM12002",
  ACCOUNT_VERIFIED = "TEM12003",
  PASSWORD_RESET = "TEM12004",
  TENANT_CREATED = "TEM12005", // Specific to tenancy
  TENANT_UPDATED = "TEM12006", // Specific to tenancy

  // Data Management Success (TEM13000s)
  DATA_RETRIEVED = "TEM13001",
  DATA_CREATED = "TEM13002",
  DATA_UPDATED = "TEM13003",
  DATA_DELETED = "TEM13004",
  SUBSCRIBER_CREATED = "TEM13005", // Specific to email marketing
  LIST_CREATED = "TEM13006", // Specific to email marketing
  CAMPAIGN_CREATED = "TEM13007", // Specific to email marketing
  SUBSCRIBER_ADDED_TO_LIST = "TEM13008", // Specific to email marketing
  SUBSCRIBER_REMOVED_FROM_LIST = "TEM13009", // Specific to email marketing
  EMAIL_SEND_INITIATED = "TEM13010", // When a campaign send process begins

  // Integration Success (TEM14000s)
  EXTERNAL_SERVICE_CONNECTED = "TEM14001",
  WEBHOOK_REGISTERED = "TEM14002",
  API_KEY_GENERATED = "TEM14003",
  TENANT_EMAIL_CONFIG_UPDATED = "TEM14004", // Specific to email config

  // System Operations Success (TEM15000s)
  SYSTEM_UPDATED = "TEM15001",
  BACKUP_CREATED = "TEM15002",
  CACHE_CLEARED = "TEM15003",
  CAMPAIGN_SCHEDULED = "TEM15004", // Specific to email marketing
}
