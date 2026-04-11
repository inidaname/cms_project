import {
  FinecoreConfig,
  CardPaymentInput,
  USSDPaymentInput,
  VirtualAccountInput,
  FinecoreCardPaymentResponse,
  FinecoreOTPApprovalResponse,
  FinecoreUSSDResponse,
  FinecoreVirtualAccountResponse,
  USSDBank,
} from "./types";

export class FinecoreClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: FinecoreConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      throw new FinecoreError(
        (data.message as string) || "Finecore API request failed",
        response.status,
        data
      );
    }

    return data as unknown as T;
  }

  async initiateCardPayment(
    input: CardPaymentInput
  ): Promise<FinecoreCardPaymentResponse> {
    return this.request<FinecoreCardPaymentResponse>("/payments/card", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        currency: input.currency || "NGN",
      }),
    });
  }

  async approveCardPayment(
    otp: string,
    transactionReference: string
  ): Promise<FinecoreOTPApprovalResponse> {
    return this.request<FinecoreOTPApprovalResponse>(
      "/payments/card/approve",
      {
        method: "POST",
        body: JSON.stringify({
          otp,
          transaction_reference: transactionReference,
        }),
      }
    );
  }

  async resendCardOTP(
    transactionReference: string
  ): Promise<FinecoreCardPaymentResponse> {
    return this.request<FinecoreCardPaymentResponse>(
      "/payments/card/resend-otp",
      {
        method: "POST",
        body: JSON.stringify({
          transaction_reference: transactionReference,
        }),
      }
    );
  }

  async initiateUSSDPayment(
    input: USSDPaymentInput
  ): Promise<FinecoreUSSDResponse> {
    return this.request<FinecoreUSSDResponse>("/payments/ussd", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        currency_code: input.currency_code || "566",
      }),
    });
  }

  async getUSSDBanks(): Promise<{ success: boolean; data: USSDBank[] }> {
    return this.request<{ success: boolean; data: USSDBank[] }>(
      "/payments/ussd/banks"
    );
  }

  async getUSSDBankByCode(
    code: string
  ): Promise<{ success: boolean; data: USSDBank }> {
    return this.request<{ success: boolean; data: USSDBank }>(
      `/payments/ussd/banks/${code}`
    );
  }

  async generateVirtualAccount(
    input: VirtualAccountInput
  ): Promise<FinecoreVirtualAccountResponse> {
    return this.request<FinecoreVirtualAccountResponse>(
      "/payments/virtual-account/generate",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          currency_code: input.currency_code || "566",
        }),
      }
    );
  }
}

export class FinecoreError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "FinecoreError";
  }
}

export function createFinecoreClient(apiKey: string): FinecoreClient {
  const baseUrl = process.env.FINECORE_BASE_URL || "https://api.finecore.co/v1";
  return new FinecoreClient({ baseUrl, apiKey });
}
