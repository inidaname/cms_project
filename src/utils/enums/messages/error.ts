// Error Messages Enum
// Error Messages Enum
export enum CASErrorMessage {
  // General Errors (TEM1000s)
  DEPRECATION_NOTICE = "This feature is deprecated and will be removed in a future version.",
  FEATURE_USAGE_WARNING = "Usage of this feature may have implications. Please review documentation.",
  MISSING_OPTIONAL_FIELD = "An optional field is missing. This may affect some functionality.",
  TENANT_NOT_FOUND = "The requested tenant could not be found.",
  UNAUTHORIZED_TENANT_ACCESS = "You are not authorized to access resources for this tenant.",

  // Success with Warnings (TEM2000s)
  PASSWORD_EXPIRING = "Your password will expire soon. Please change it at your earliest convenience.",
  MFA_SETUP_INCOMPLETE = "Multi-factor authentication setup is incomplete. Please complete the setup for enhanced security.",
  EMAIL_CONFIG_MISSING = "Email sending configuration is missing for this tenant. Campaigns cannot be sent without it.",
  CAMPAIGN_SEND_PARTIAL_FAILURE = "The campaign was sent to some subscribers, but encountered issues with others.",

  // Redirection Errors (TEM3000s)
  SESSION_EXPIRED = "Your session has expired. Please log in again.",
  OAUTH_REDIRECT_REQUIRED = "Redirect required to complete authentication.",
  PASSWORD_CHANGE_REQUIRED = "You must change your password on next login.",
  PASSWORD_TOKEN_EXPIRED = "The password reset link has expired. To reset your password, please request a new one.",

  // Client-Side Errors (TEM4000s)
  INVALID_CREDENTIALS = "Invalid username or password.",
  USER_NOT_FOUND = "User account not found.",
  UNAUTHORIZED_ACCESS = "You do not have permission to access this resource.",
  ACCOUNT_LOCKED = "Your account has been locked. Please contact support.",
  OTP_INCORRECT = "Your One-Time Password (OTP) is incorrect. Please verify the code you received and enter it again.",
  DUPLICATE_EMAIL = "A record with this email already exists (e.g., user or subscriber). Please use a different email.",
  DUPLICATE_PHONE = "A user with this phone number already exists. Please use a different phone number.",
  DUPLICATE_FIELD = "A duplicate value was provided for a unique field.",
  SUBSCRIBER_NOT_FOUND = "The specified subscriber could not be found for this tenant.",
  LIST_NOT_FOUND = "The specified list could not be found for this tenant.",
  CAMPAIGN_NOT_FOUND = "The specified campaign could not be found for this tenant.",
  EMAIL_CONFIG_INVALID = "The tenant's email configuration is invalid or incomplete. Please review settings.",
  CAMPAIGN_SEND_STATUS_INVALID = "The campaign cannot be sent in its current status (e.g., already sent or cancelled).",
  SUBSCRIBER_ALREADY_IN_LIST = "The subscriber is already a member of this list.",
  SUBSCRIBER_NOT_IN_LIST = "The subscriber is not a member of this list.",
  EMAIL_SEND_RECORD_NOT_FOUND = "The email send record could not be found.",

  // Server-Side Errors (TEM5000s)
  DATABASE_CONNECTION_ERROR = "Unable to connect to the database. Please try again later.",
  INTERNAL_SERVER_ERROR = "An unexpected server error occurred. Please try again later.",
  REQUEST_TIMEOUT = "The request timed out. Please try again.",
  RESOURCE_LIMITATION = "System resources are currently limited. Please try again later.",
  EMAIL_SEND_FAILURE = "Failed to send email. Please check configuration and try again.",
  SMTP_CONNECTION_FAILED = "Failed to connect to the SMTP server with the provided credentials.",

  // Service Integration Errors (TEM6000s)
  EXTERNAL_API_FAILURE = "An external service is currently unavailable. Please try again later.",
  IDP_ISSUE = "There was an issue with the identity provider. Please try again later.",
  MICROSERVICE_COMMUNICATION_FAILURE = "Internal communication error. Please try again later.",
  RATE_LIMIT_EXCEEDED = "Rate limit exceeded. Please try again later.",
  EMAIL_SERVICE_PROVIDER_ERROR = "An error occurred with the external email service provider.",

  // Validation Errors (TEM7000s)
  INVALID_FIELD_FORMAT = "One or more fields have an invalid format. Please check your input.",
  MISSING_REQUIRED_FIELD = "A required field is missing. Please check your input.",
  PASSWORD_POLICY_VIOLATION = "The provided password does not meet the required policy.",
  DATA_TYPE_MISMATCH = "The provided data type is not supported or mismatched for a field.",
  INVALID_EMAIL_ADDRESS = "The provided email address is not valid.",
  INVALID_URL_FORMAT = "The provided URL has an invalid format.",

  // Security and Compliance Errors (TEM8000s)
  SUSPICIOUS_ACTIVITY = "Suspicious activity detected on your account. Please verify your identity.",
  COMPLIANCE_BREACH = "A compliance breach has been detected. This activity has been logged.",
  SECURITY_POLICY_VIOLATION = "This action violates the security policy.",
  TENANT_STATUS_INACTIVE = "This operation cannot be performed because the tenant is inactive.",

  // Operational Errors (TEM9000s)
  SYSTEM_MAINTENANCE = "The system is currently undergoing maintenance. Please try again later.",
  CONFIGURATION_ERROR = "There is a general configuration issue. Please contact support.",
  LICENSING_ISSUE = "There is an issue with the system license. Please contact support.",
  RESOURCE_CONSTRAINT = "The system is currently experiencing resource constraints. Please try again later.",
  EMAIL_CONFIG_SETUP_INCOMPLETE = "The tenant's email configuration setup is incomplete. Please provide all required details.",
}
