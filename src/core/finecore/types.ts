export interface FinecoreConfig {
  baseUrl: string;
  apiKey: string;
}

export interface CardPaymentInput {
  amount: number;
  currency?: string;
  reference: string;
  metadata?: Record<string, unknown>;
  card_details: {
    pan: string;
    expiry_date: string;
    cvv: string;
    pin?: string;
  };
}

export interface USSDPaymentInput {
  amount: string;
  bank_code: string;
  currency_code?: string;
  transaction_reference: string;
  surcharge?: number;
  metadata?: Record<string, unknown>;
}

export interface VirtualAccountInput {
  amount: string;
  currency_code?: string;
  provider: string;
  transaction_reference: string;
  metadata?: Record<string, unknown>;
}

export interface FinecoreWebhookPayload {
  event: string;
  data: {
    id: string;
    user_id: string;
    merchant_id: string;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    balance_before: number;
    balance_after: number;
    environment: string;
    type: string;
    category: string;
    source?: string;
    destination?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
  };
}

export interface FinecoreCardPaymentResponse {
  success: boolean;
  message: string;
  data: {
    transaction_reference: string;
    requires_authentication: boolean;
    auth_type?: "OTP" | "3DS";
    next_action: string;
    payment_id?: string;
    bank_code?: string;
    acs_url?: string;
    term_url?: string;
    md?: string;
    jwt?: string;
    eci_flag?: string;
  };
}

export interface FinecoreOTPApprovalResponse {
  success: boolean;
  message: string;
  data: {
    transaction_reference: string;
    message: string;
    status: string;
    amount: string;
  };
}

export interface FinecoreUSSDResponse {
  success: boolean;
  message: string;
  data: {
    bank_short_code: string;
    default_short_code: string;
    reference: string;
    response_code: string;
    transaction_reference: string;
  };
}

export interface FinecoreVirtualAccountResponse {
  success: boolean;
  message: string;
  data: {
    account_name: string;
    account_number: string;
    amount: number;
    bank_name: string;
    provider: string;
    response_code: string;
    transaction_reference: string;
    validity_period_mins: number;
  };
}

export interface USSDBank {
  cbn_code: string;
  code: string;
  name: string;
}

export type FinecoreWebhookEvent =
  | "customer_bank_transfer"
  | "bank_transfer"
  | "customer_wallet_debited"
  | "customer_wallet_credited"
  | "wallet_to_wallet_transfer"
  | "batch_bank_transfer"
  | "account_funded";
