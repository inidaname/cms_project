const PaymentSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    channel: { type: "string", nullable: true },
    amount: { type: "number" },
    status: { type: "string", nullable: true },
    reference: { type: "string", nullable: true },
    finecoreTransactionRef: { type: "string", nullable: true },
    authType: { type: "string", nullable: true },
    requiresAuth: { type: "boolean" },
    user_id: { type: "string" },
    tenant_id: { type: "string" },
    sales_id: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const VirtualAccountSchema = {
  type: "object",
  properties: {
    account_number: { type: "string" },
    bank_name: { type: "string" },
    provider: { type: "string" },
    short_code: { type: "string", nullable: true },
    expires_at: { type: "string", nullable: true },
  },
};

const PaginationMetadataSchema = {
  type: "object",
  properties: {
    total: { type: "integer" },
    page: { type: "integer" },
    limit: { type: "integer" },
    totalPages: { type: "integer" },
    hasNextPage: { type: "boolean" },
    hasPrevPage: { type: "boolean" },
  },
};

export const PaymentSchemas = {
  initiateCardPayment: {
    summary: "Initiate Card Payment",
    description: "Start a card payment through Finecore. May require OTP or 3DS authentication.",
    tags: ["Payments"],
    security: [
      { bearerAuth: [], apiKey: [] },
    ],
    body: {
      type: "object",
      required: ["cart_id", "card_details"],
      properties: {
        cart_id: { type: "string", format: "uuid", description: "The cart to pay for" },
        amount: { type: "number", format: "double", description: "Amount in Naira (optional, defaults to cart total)" },
        reference: { type: "string", description: "Custom payment reference (optional)" },
        metadata: { type: "object", additionalProperties: true, description: "Additional metadata" },
        card_details: {
          type: "object",
          required: ["pan", "expiry_date", "cvv"],
          properties: {
            pan: { type: "string", description: "Card number" },
            expiry_date: { type: "string", description: "Card expiry (MMYY)" },
            cvv: { type: "string", description: "Card CVV" },
            pin: { type: "string", description: "Card PIN (optional but recommended)" },
          },
        },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          code: { type: "string" },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              payment: PaymentSchema,
              finecore: {
                type: "object",
                properties: {
                  transaction_reference: { type: "string" },
                  requires_authentication: { type: "boolean" },
                  auth_type: { type: "string" },
                  next_action: { type: "string" },
                },
              },
              requiresAuth: { type: "boolean" },
              authType: { type: "string" },
              nextAction: { type: "string" },
            },
          },
        },
      },
    },
  },

  approveCardPayment: {
    summary: "Approve Card Payment with OTP",
    description: "Submit OTP to complete card payment after receiving verification code.",
    tags: ["Payments"],
    security: [
      { bearerAuth: [], apiKey: [] },
    ],
    body: {
      type: "object",
      required: ["transaction_reference", "otp"],
      properties: {
        transaction_reference: { type: "string", description: "Finecore transaction reference" },
        otp: { type: "string", description: "One-time password from SMS" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "object",
            properties: {
              payment: PaymentSchema,
              finecore: {
                type: "object",
                properties: {
                  transaction_reference: { type: "string" },
                  status: { type: "string" },
                  amount: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },

  initiateUSSDPayment: {
    summary: "Initiate USSD Payment",
    description: "Generate a USSD code for customer to dial and complete payment.",
    tags: ["Payments"],
    security: [
      { bearerAuth: [], apiKey: [] },
    ],
    body: {
      type: "object",
      required: ["cart_id", "bank_code"],
      properties: {
        cart_id: { type: "string", format: "uuid", description: "The cart to pay for" },
        amount: { type: "number", format: "double", description: "Amount in Naira (optional)" },
        bank_code: { type: "string", description: "Bank code (e.g., GTB, FBN)" },
        metadata: { type: "object", additionalProperties: true },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "object",
            properties: {
              payment: PaymentSchema,
              ussd: {
                type: "object",
                properties: {
                  shortCode: { type: "string" },
                  reference: { type: "string" },
                  transactionRef: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },

  generateVirtualAccount: {
    summary: "Generate Virtual Account",
    description: "Create a virtual bank account for customer to transfer funds into.",
    tags: ["Payments"],
    security: [
      { bearerAuth: [], apiKey: [] },
    ],
    body: {
      type: "object",
      required: ["cart_id", "provider"],
      properties: {
        cart_id: { type: "string", format: "uuid", description: "The cart to pay for" },
        amount: { type: "number", format: "double", description: "Expected amount (optional)" },
        provider: { type: "string", description: "Bank provider (e.g., WEMA, GTB)" },
        metadata: { type: "object", additionalProperties: true },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "object",
            properties: {
              payment: PaymentSchema,
              virtualAccount: VirtualAccountSchema,
            },
          },
        },
      },
    },
  },

  getUSSDBanks: {
    summary: "Get USSD Banks",
    description: "Retrieve list of banks that support USSD payments.",
    tags: ["Payments"],
    security: [
      { bearerAuth: [], apiKey: [] },
    ],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                cbn_code: { type: "string" },
                code: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      },
    },
  },

  verifyPayment: {
    summary: "Verify Payment",
    description: "Check the status of a payment by reference.",
    tags: ["Payments"],
    security: [
      { bearerAuth: [], apiKey: [] },
    ],
    params: {
      type: "object",
      required: ["reference"],
      properties: {
        reference: { type: "string", description: "Payment reference to verify" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: PaymentSchema,
        },
      },
    },
  },

  getPayments: {
    summary: "List Payments",
    description: "Get paginated list of payments for the tenant.",
    tags: ["Payments"],
    security: [
      { bearerAuth: [], apiKey: [] },
    ],
    querystring: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 10 },
        filter: { type: "string", enum: ["Success", "Failed", "Pending"], description: "Filter by status" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "object",
            properties: {
              data: { type: "array", items: PaymentSchema },
              metadata: PaginationMetadataSchema,
            },
          },
        },
      },
    },
  },
};

export const WebhookSchemas = {
  handleFinecoreWebhook: {
    summary: "Finecore Webhook",
    description: "Endpoint to receive payment notifications from Finecore. This endpoint is public and does not require authentication.",
    tags: ["Webhooks"],
    body: {
      type: "object",
      required: ["event", "data"],
      properties: {
        event: {
          type: "string",
          enum: [
            "customer_bank_transfer",
            "bank_transfer",
            "customer_wallet_debited",
            "customer_wallet_credited",
            "wallet_to_wallet_transfer",
            "batch_bank_transfer",
            "account_funded",
          ],
        },
        data: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            merchant_id: { type: "string", format: "uuid" },
            reference: { type: "string" },
            amount: { type: "number" },
            currency: { type: "string" },
            status: { type: "string", enum: ["COMPLETED", "PENDING", "FAILED"] },
            type: { type: "string", enum: ["CREDIT", "DEBIT"] },
            category: { type: "string" },
            balance_before: { type: "number" },
            balance_after: { type: "number" },
            environment: { type: "string" },
            metadata: { type: "object", additionalProperties: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
};

const FinecoreConfigSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    tenant_id: { type: "string" },
    api_key: { type: "string" },
    public_key: { type: "string", nullable: true },
    webhook_secret: { type: "string", nullable: true },
    environment: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

export const FinecoreConfigSchemas = {
  createOrUpdateConfig: {
    summary: "Configure Finecore",
    description: "Set up Finecore payment credentials for the tenant.",
    tags: ["Tenants"],
    security: [
      { bearerAuth: [], apiKey: [] },
    ],
    body: {
      type: "object",
      required: ["api_key"],
      properties: {
        api_key: { type: "string", description: "Finecore API key" },
        public_key: { type: "string", description: "Finecore public key (for checkout)" },
        webhook_secret: { type: "string", description: "Webhook signature verification secret" },
        environment: { type: "string", enum: ["sandbox", "live"], default: "sandbox" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: FinecoreConfigSchema,
        },
      },
    },
  },

  getConfig: {
    summary: "Get Finecore Configuration",
    description: "Retrieve the current Finecore configuration status.",
    tags: ["Tenants"],
    security: [
      { bearerAuth: [], apiKey: [] },
    ],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: FinecoreConfigSchema,
        },
      },
    },
  },

  deleteConfig: {
    summary: "Remove Finecore Configuration",
    description: "Delete the Finecore configuration for the tenant.",
    tags: ["Tenants"],
    security: [
      { bearerAuth: [], apiKey: [] },
    ],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
        },
      },
    },
  },
};
