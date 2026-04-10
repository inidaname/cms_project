// Error Codes Enum
export enum CASErrorCode {
  // General Errors (TEM1000s - Tenant & Email Marketing)
  DEPRECATION_NOTICE = "TEM1001",
  FEATURE_USAGE_WARNING = "TEM1002",
  MISSING_OPTIONAL_FIELD = "TEM1003",
  TENANT_NOT_FOUND = "TEM1004", // Specific to tenancy
  UNAUTHORIZED_TENANT_ACCESS = "TEM1005", // Specific to tenancy

  // Success with Warnings (TEM2000s)
  PASSWORD_EXPIRING = "TEM2001",
  MFA_SETUP_INCOMPLETE = "TEM2002",
  EMAIL_CONFIG_MISSING = "TEM2003", // Warning specific to email features
  CAMPAIGN_SEND_PARTIAL_FAILURE = "TEM2004", // Warning for partial sends

  // Redirection Errors (TEM3000s)
  SESSION_EXPIRED = "TEM3001",
  OAUTH_REDIRECT_REQUIRED = "TEM3002",
  PASSWORD_CHANGE_REQUIRED = "TEM3003",
  PASSWORD_TOKEN_EXPIRED = "TEM3004",

  // Client-Side Errors (TEM4000s)
  INVALID_CREDENTIALS = "TEM4001",
  USER_NOT_FOUND = "TEM4002",
  UNAUTHORIZED_ACCESS = "TEM4003",
  ACCOUNT_LOCKED = "TEM4004",
  OTP_INCORRECT = "TEM4005",
  DUPLICATE_EMAIL = "TEM4006", // Could apply to User or Subscriber
  DUPLICATE_PHONE = "TEM4007",
  DUPLICATE_FIELD = "TEM4008", // Generic duplicate field
  SUBSCRIBER_NOT_FOUND = "TEM4009", // Specific to email marketing
  LIST_NOT_FOUND = "TEM4010", // Specific to email marketing
  CAMPAIGN_NOT_FOUND = "TEM4011", // Specific to email marketing
  EMAIL_CONFIG_INVALID = "TEM4012", // Specific to email marketing configuration
  CAMPAIGN_SEND_STATUS_INVALID = "TEM4013", // E.g., trying to send a sent campaign
  SUBSCRIBER_ALREADY_IN_LIST = "TEM4014", // When adding a subscriber to a list
  SUBSCRIBER_NOT_IN_LIST = "TEM4015", // When removing a subscriber from a list
  EMAIL_SEND_RECORD_NOT_FOUND = "TEM4016", // Specific to email send tracking

  // Server-Side Errors (TEM5000s)
  DATABASE_CONNECTION_ERROR = "TEM5001",
  INTERNAL_SERVER_ERROR = "TEM5002",
  REQUEST_TIMEOUT = "TEM5003",
  RESOURCE_LIMITATION = "TEM5004",
  EMAIL_SEND_FAILURE = "TEM5005", // Core email sending failure
  SMTP_CONNECTION_FAILED = "TEM5006", // Specific to TenantEmailConfig

  // Service Integration Errors (TEM6000s)
  EXTERNAL_API_FAILURE = "TEM6001",
  IDP_ISSUE = "TEM6002",
  MICROSERVICE_COMMUNICATION_FAILURE = "TEM6003",
  RATE_LIMIT_EXCEEDED = "TEM6004",
  EMAIL_SERVICE_PROVIDER_ERROR = "TEM6005", // If using an external ESP

  // Validation Errors (TEM7000s)
  INVALID_FIELD_FORMAT = "TEM7001",
  MISSING_REQUIRED_FIELD = "TEM7002",
  PASSWORD_POLICY_VIOLATION = "TEM7003", // Changed code as it was a duplicate
  DATA_TYPE_MISMATCH = "TEM7004",
  INVALID_EMAIL_ADDRESS = "TEM7005", // Specific to subscribers/users
  INVALID_URL_FORMAT = "TEM7006", // For domain or other URL fields

  // Security and Compliance Errors (TEM8000s)
  SUSPICIOUS_ACTIVITY = "TEM8001",
  COMPLIANCE_BREACH = "TEM8002",
  SECURITY_POLICY_VIOLATION = "TEM8003",
  TENANT_STATUS_INACTIVE = "TEM8004", // e.g., trying to operate on an inactive tenant

  // Operational Errors (TEM9000s)
  SYSTEM_MAINTENANCE = "TEM9001",
  CONFIGURATION_ERROR = "TEM9002", // General configuration error
  LICENSING_ISSUE = "TEM9003",
  RESOURCE_CONSTRAINT = "TEM9004",
  EMAIL_CONFIG_SETUP_INCOMPLETE = "TEM9005", // For tenant email config
}
