export const CartSchemas = {
  startCart: {
    summary: "Start Cart",
    description: "Start an empty Cart",
    tags: ["Carts"],
    security: [
      {
        bearerAuth: [],
        apiKey: [],
      },
    ],
    response: {
      201: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "cart#" } } },
        ],
      },
    },
  },
  updateLogistics: {
    description:
      "Set delivery address, notes, and recipient info before checkout",
    tags: ["Cart"],
    params: {
      type: "object",
      properties: { cart_id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      properties: {
        deliveryType: {
          type: "string",
          enum: ["PICKUP", "DELIVERY", "SHIPPING"],
        },
        deliveryAddress: { type: "string" },
        notes: {
          type: "string",
          description: "Gift messages or cooking instructions",
        },
        recipientName: { type: "string" },
        recipientPhone: { type: "string" },
      },
    },
  },
  addItems: {
    summary: "Add Items",
    description:
      "Add items to an existing cart or create one if cart_id is missing",
    tags: ["Carts"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    params: {
      type: "object",
      properties: { cart_id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      required: ["product_id", "product_quantity"],
      properties: {
        product_id: { type: "string", format: "uuid" },
        variation_id: { type: "string", format: "uuid" },
        product_quantity: { type: "number", minimum: 1 },
        selections: {
          type: "object",
          description:
            "Optional structured selection for configurable/scheduled offerings: option groups with choices, a time slot, and participant count.",
          properties: {
            groups: {
              type: "array",
              items: {
                type: "object",
                required: ["group_id"],
                properties: {
                  group_id: { type: "string", format: "uuid" },
                  choices: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["choice_id"],
                      properties: {
                        choice_id: { type: "string", format: "uuid" },
                        quantity: { type: "number", minimum: 1 },
                      },
                    },
                  },
                },
              },
            },
            slot_id: { type: "string", format: "uuid" },
            participants: { type: "number", minimum: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    response: {
      201: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "cart#" } } },
        ],
      },
    },
  },
  getCarts: {
    summary: "List Carts",
    description:
      "Paginated carts for the authenticated customer (rows include their cart items).",
    tags: ["Carts"],
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
        filter: { type: "string", enum: ["Active", "Abandoned", "Checkedout"] },
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
                description: "Cart rows (cart# fields plus cart items).",
                items: { type: "object", additionalProperties: true },
              },
              metadata: { $ref: "paginationMetadata#" },
            },
          },
        },
      },
    },
  },
  getCartbyId: {
    summary: "Get Single Cart",
    description: "Get Cart and the items by cart_id",
    tags: ["Carts"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    params: {
      type: "object",
      properties: { cart_id: { type: "string", format: "uuid" } },
    },
    response: {
      200: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "cart#" } } },
        ],
      },
    },
  },
  editQuantity: {
    summary: "Edit Item Quantity",
    tags: ["Carts"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    params: {
      type: "object",
      properties: { item_id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      properties: { product_quantity: { type: "number", minimum: 0 } },
    },
  },
  editCartStatus: {
    summary: "Edit cart",
    description: "Edit Cart status by cart_id",
    tags: ["Carts"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    params: {
      type: "object",
      properties: { cart_id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Active", "Abandoned", "Checkedout"],
        },
      },
    },
    response: {
      205: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "cart#" } } },
        ],
      },
    },
  },
  deleteItem: {
    summary: "Delete Item",
    description: "Remove an item from a cart",
    tags: ["Carts"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    params: {
      type: "object",
      required: ["item_id"],
      properties: { item_id: { type: "string", format: "uuid" } },
    },
    response: {
      200: { $ref: "baseResponse#" },
    },
  },
  getItemById: {
    summary: "Get Item",
    description: "Get an item from a cart by the Cart's item_id",
    tags: ["Carts"],
    params: {
      type: "object",
      required: ["item_id"],
      properties: { item_id: { type: "string", format: "uuid" } },
    },
    response: {
      200: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "cartItem#" } } },
        ],
      },
    },
  },
  updateOrderDetails: {
    description: "Attach notes and delivery info to the cart before checkout",
    tags: ["Carts"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    params: {
      type: "object",
      properties: { cart_id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      properties: {
        notes: {
          type: "string",

        },
        recipientName: { type: "string" },
        recipientPhone: { type: "string" },
        deliveryAddress: { type: "string" },
        deliveryType: {
          type: "string",
          enum: ["PICKUP", "DELIVERY", "SHIPPING"],
        },
      },
    },
    response: {
      200: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "cart#" } } },
        ],
      },
    },
  },
};

export const ExtendedCartSchemas = {
  addBundleToCart: {
    description: "Add a Gift Box or Catering Plate with selected sub-items",
    tags: ["Carts"],
    body: {
      type: "object",
      required: ["product_id", "selections"],
      properties: {
        product_id: {
          type: "string",
          format: "uuid",
          description: "The ID of the Gift Box or Plate",
        },
        product_quantity: { type: "number", default: 1 },
        selections: {
          type: "array",
          items: {
            type: "object",
            required: ["product_id"],
            properties: {
              product_id: {
                type: "string",
                format: "uuid",
                description: "The chocolate/side dish ID",
              },
              variation_id: { type: "string", format: "uuid" },
              quantity: { type: "number" },
            },
          },
        },
      },
    },
  },
};
