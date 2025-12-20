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
  },
};
