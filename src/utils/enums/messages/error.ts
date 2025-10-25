// Error Messages Enum
export enum CASErrorMessage {
  // Informational Errors (CAS1000s)
  DEPRECATION_NOTICE = "This feature is deprecated and will be removed in a future version.",
  FEATURE_USAGE_WARNING = "Usage of this feature may have implications. Please review documentation.",
  MISSING_OPTIONAL_FIELD = "An optional field is missing. This may affect some functionality.",

  // Success with Warnings (CAS2000s)
  PASSWORD_EXPIRING = "Your password will expire soon. Please change it at your earliest convenience.",
  MFA_SETUP_INCOMPLETE = "Multi-factor authentication setup is incomplete. Please complete the setup for enhanced security.",

  // Redirection Errors (CAS3000s)
  SESSION_EXPIRED = "Your session has expired. Please log in again.",
  OAUTH_REDIRECT_REQUIRED = "Redirect required to complete authentication.",
  PASSWORD_CHANGE_REQUIRED = "You must change your password on next login.",
  PASSWORD_TOKEN_EXPIRED = "The password reset link has expired. To reset your password, please request a new one.",

  // Client-Side Errors (CAS4000s)
  INVALID_CREDENTIALS = "Invalid username or password.",
  USER_NOT_FOUND = "User account not found.",
  UNAUTHORIZED_ACCESS = "You do not have permission to access this resource.",
  ACCOUNT_LOCKED = "Your account has been locked. Please contact support.",
  OTP_INCORRECT = "Your One-Time Password (OTP) is incorrect. Please verify the code you received and enter it again.",
  DUPLICATE_EMAIL = "A user with this email already exists. Please use a different email.",
  DUPLICATE_PHONE = "A user with this phone number already exists. Please use a different phone number.",
  DUPLICATE_FIELD = "A duplicate field of unique detailed was passed.",

  // Server-Side Errors (CAS5000s)
  DATABASE_CONNECTION_ERROR = "Unable to connect to the database. Please try again later.",
  INTERNAL_SERVER_ERROR = "An unexpected error occurred. Please try again later.",
  REQUEST_TIMEOUT = "The request timed out. Please try again.",
  RESOURCE_LIMITATION = "System resources are currently limited. Please try again later.",

  // Service Integration Errors (CAS6000s)
  EXTERNAL_API_FAILURE = "An external service is currently unavailable. Please try again later.",
  IDP_ISSUE = "There was an issue with the identity provider. Please try again later.",
  MICROSERVICE_COMMUNICATION_FAILURE = "Internal communication error. Please try again later.",
  RATE_LIMIT_EXCEEDED = "Rate limit exceeded. Please try again later.",

  // Validation Errors (CAS7000s)
  INVALID_FIELD_FORMAT = "One or more fields have an invalid format. Please check your input.",
  MISSING_REQUIRED_FIELD = "A required field is missing. Please check your input.",
  PASSWORD_POLICY_VIOLATION = "The provided password does not meet the required policy.",
  DATA_TYPE_MISMATCH = "The provided data type is not supported or mismatched.",

  // Security and Compliance Errors (CAS8000s)
  SUSPICIOUS_ACTIVITY = "Suspicious activity detected on your account. Please verify your identity.",
  COMPLIANCE_BREACH = "A compliance breach has been detected. This activity has been logged.",
  SECURITY_POLICY_VIOLATION = "This action violates the security policy.",

  // Operational Errors (CAS9000s)
  SYSTEM_MAINTENANCE = "The system is currently undergoing maintenance. Please try again later.",
  CONFIGURATION_ERROR = "There is a configuration issue. Please contact support.",
  LICENSING_ISSUE = "There is an issue with the system license. Please contact support.",
  RESOURCE_CONSTRAINT = "The system is currently experiencing resource constraints. Please try again later.",
}
