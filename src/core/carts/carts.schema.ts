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
          type: "array",
          description: "Items inside the bundle",
          items: {
            type: "object",
            required: ["product_id"],
            properties: {
              product_id: { type: "string", format: "uuid" },
              variation_id: { type: "string", format: "uuid" },
              quantity: { type: "number" },
            },
          },
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

  updateOrderDetails: {
    description: "Attach notes and delivery info to the cart before checkout",
    tags: ["Carts"],
    params: {
      type: "object",
      properties: { cart_id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      properties: {
        notes: {
          type: "string",
          example: 'Please include a "Happy Birthday" card.',
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
  },
};
