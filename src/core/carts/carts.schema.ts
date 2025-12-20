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
      200: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "cartItems#" } } },
        ],
      },
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
          { type: "object", properties: { data: { $ref: "cartItems#" } } },
        ],
      },
    },
  },
};
