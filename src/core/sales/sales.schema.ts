export const SalesSchemas = {
  initCheckout: {
    summary: "Checkout",
    description: "Convert a cart into a sale/checkout session",
    tags: ["Checkout"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    body: {
      type: "object",
      required: ["cart_id"],
      properties: {
        cart_id: { type: "string", format: "uuid" },
        payment_channel: {
          type: "string",
          enum: ["Card", "Transfer", "Cash", "Other"],
        },
        organization: {
          type: "object",
          description:
            "Organization billing: link by id, or create-or-link by name (tenant-scoped).",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", minLength: 1, maxLength: 128 },
            contactEmail: { type: "string" },
            contactPhone: { type: "string" },
            address: { type: "string" },
          },
        },
        participants: {
          type: "array",
          description: "Participant/staff/learner list stored on the sale.",
          maxItems: 100,
          items: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string", minLength: 1, maxLength: 128 },
              email: { type: "string" },
              role: { type: "string", maxLength: 64 },
            },
          },
        },
      },
    },
    response: {
      200: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "sales#" } } },
        ],
      },
    },
  },
  getCheckoutById: {
    summary: "Get Checkout",
    description: "Convert a cart into a sale/checkout session",
    tags: ["Checkout"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    params: {
      type: "object",
      properties: {
        checkout_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          code: { type: "string" },
          message: { type: "string" },
          data: {
            oneOf: [{ $ref: "sales#" }, { type: "null" }],
          },
        },
      },
    },
  },
  getCheckouts: {
    summary: "List Checkouts (Order History)",
    description:
      "Paginated order history for the authenticated customer. Rows are sales records (sales# fields) plus the source cart (with frozen configuration snapshots), payments, and the paying customer.",
    tags: ["Checkout"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    querystring: {
      type: "object",
      properties: {
        page: { type: "integer", minimum: 1, default: 1 },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          message: { type: "string" },
          code: { type: "string" },
          data: {
            type: "object",
            properties: {
              data: {
                type: "array",
                description:
                  "Sales rows (sales# fields plus cart with configuration snapshots, payments, paidBy customer).",
                items: { type: "object", additionalProperties: true },
              },
              metadata: { $ref: "paginationMetadata#" },
            },
          },
        },
      },
    },
  },
};
