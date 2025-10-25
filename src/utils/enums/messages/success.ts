export enum CASSuccessMessage {
  // General Success (CAS10000s)
  OPERATION_SUCCESSFUL = "The operation was completed successfully.",
  REQUEST_PROCESSED = "Your request has been processed successfully.",

  // Authentication Success (CAS11000s)
  LOGIN_SUCCESSFUL = "You have been successfully logged in.",
  LOGOUT_SUCCESSFUL = "You have been successfully logged out.",
  PASSWORD_CHANGED = "Your password has been changed successfully.",
  MFA_ENABLED = "Multi-factor authentication has been enabled for your account.",

  // Account Management Success (CAS12000s)
  ACCOUNT_CREATED = "Your account has been created successfully.",
  ACCOUNT_UPDATED = "Your account information has been updated successfully.",
  ACCOUNT_VERIFIED = "Your account has been verified successfully.",
  PASSWORD_RESET = "Your password has been reset successfully.",

  // Data Management Success (CAS13000s)
  DATA_RETRIEVED = "Data has been retrieved successfully.",
  DATA_CREATED = "Data has been created successfully.",
  DATA_UPDATED = "Data has been updated successfully.",
  DATA_DELETED = "Data has been deleted successfully.",

  // Integration Success (CAS14000s)
  EXTERNAL_SERVICE_CONNECTED = "External service has been connected successfully.",
  WEBHOOK_REGISTERED = "Webhook has been registered successfully.",
  API_KEY_GENERATED = "API key has been generated successfully.",

  // System Operations Success (CAS15000s)
  SYSTEM_UPDATED = "System has been updated successfully.",
  BACKUP_CREATED = "Backup has been created successfully.",
  CACHE_CLEARED = "Cache has been cleared successfully.",
}
