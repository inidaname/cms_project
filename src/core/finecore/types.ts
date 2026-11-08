export interface FinecoreConfig {
  baseUrl: string;
  apiKey: string;
}

export interface CheckoutSessionInput {
  amount: number;
  currency?: string;
  reference: string;
  allowed_methods?: string[];
  customer_email?: string;
  success_url?: string;
  cancel_url?: string;
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

export interface FinecoreCheckoutResponse {
  success: boolean;
  message: string;
  data: {
    checkout_token: string;
    checkout_url: string;
    amount: number;
    currency: string;
    expires_at: string;
  };
}

export type FinecoreWebhookEvent =
  | "customer_bank_transfer"
  | "bank_transfer"
  | "customer_wallet_debited"
  | "customer_wallet_credited"
  | "wallet_to_wallet_transfer"
  | "batch_bank_transfer"
  | "account_funded";
