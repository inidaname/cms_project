export enum CASSuccessMessage {
  // General Success (TEM10000s)
  OPERATION_SUCCESSFUL = "The operation was completed successfully.",
  REQUEST_PROCESSED = "Your request has been processed successfully.",

  // Authentication Success (TEM11000s)
  LOGIN_SUCCESSFUL = "You have been successfully logged in.",
  LOGOUT_SUCCESSFUL = "You have been successfully logged out.",
  PASSWORD_CHANGED = "Your password has been changed successfully.",
  MFA_ENABLED = "Multi-factor authentication has been enabled for your account.",

  // Account & Tenant Management Success (TEM12000s)
  ACCOUNT_CREATED = "Your account has been created successfully.",
  ACCOUNT_UPDATED = "Your account information has been updated successfully.",
  ACCOUNT_VERIFIED = "Your account has been verified successfully.",
  PASSWORD_RESET = "Your password has been reset successfully.",
  TENANT_CREATED = "The tenant account has been created successfully.",
  TENANT_UPDATED = "The tenant account information has been updated successfully.",

  // Data Management Success (TEM130000s)
  DATA_RETRIEVED = "Data has been retrieved successfully.",
  DATA_CREATED = "Data has been created successfully.",
  DATA_UPDATED = "Data has been updated successfully.",
  DATA_DELETED = "Data has been deleted successfully.",
  SUBSCRIBER_CREATED = "Subscriber has been added successfully.",
  LIST_CREATED = "Email list has been created successfully.",
  CAMPAIGN_CREATED = "Email campaign has been created successfully.",
  SUBSCRIBER_ADDED_TO_LIST = "Subscriber successfully added to the list.",
  SUBSCRIBER_REMOVED_FROM_LIST = "Subscriber successfully removed from the list.",
  EMAIL_SEND_INITIATED = "Campaign email send process has been initiated.",

  // Integration Success (TEM14000s)
  EXTERNAL_SERVICE_CONNECTED = "External service has been connected successfully.",
  WEBHOOK_REGISTERED = "Webhook has been registered successfully.",
  API_KEY_GENERATED = "API key has been generated successfully.",
  TENANT_EMAIL_CONFIG_UPDATED = "Tenant email configuration has been updated successfully.",

  // System Operations Success (TEM15000s)
  SYSTEM_UPDATED = "System has been updated successfully.",
  BACKUP_CREATED = "Backup has been created successfully.",
  CACHE_CLEARED = "Cache has been cleared successfully.",
  CAMPAIGN_SCHEDULED = "Campaign has been scheduled successfully for sending.",
}
