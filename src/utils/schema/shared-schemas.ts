export const SharedSchemas = {
  $id: "shared",
  definitions: {
    // Base Response Wrapper
    BaseResponse: {
      $id: "baseResponse",
      type: "object",
      properties: {
        status: { type: "string", example: "success" },
        message: { type: "string" },
        code: { type: "string" },
        data: {
          type: "object",
          additionalProperties: true,
          nullable: true,
        },
      },
    },
    Tenant: {
      $id: "tenant",
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        domain: { type: "string", format: "url" },
        apiKey: { type: "string" },
        status: {
          type: "string",
          enum: ["ACTIVE", "EXPIRED", "DELETED", "OUTDATED", "ABANDONED"],
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    // User Model
    User: {
      $id: "user",
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        email: { type: "string", format: "email" },
        name: { type: "string", nullable: true },
        phone: { type: "string", nullable: true },
        role: { type: "string", enum: ["OWNER", "ADMIN", "USER"] },
      },
    },
    // Product Model
    Product: {
      $id: "product",
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        title: { type: "string" },
        description: { type: "string" },
        price: { type: "number" },
        quantity: { type: "number" },
        status: {
          type: "string",
          enum: ["Available", "OutOfStock", "Discontinued"],
        },
        attributes: { type: "object", additionalProperties: true },
        isBundle: { type: "boolean" },
        min_items: { type: "integer", nullable: true },
        max_items: { type: "integer", nullable: true },
      },
    },
    Delivery: {
      $id: "delivery",
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        status: {
          type: "string",
          enum: [
            "PENDING",
            "PREPARING",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "FAILED",
          ],
        },
        address: { type: "string" },
        recipientName: { type: "string" },
        recipientPhone: { type: "string" },
        trackingNumber: { type: "string", nullable: true },
        estimatedArrival: {
          type: "string",
          format: "date-time",
          nullable: true,
        },
      },
    },
    ProductVariation: {
      $id: "productVariation",
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        product_id: { type: "string", format: "uuid" },
        value: { type: "number", format: "double" },
        type: {
          type: "string",
          enum: ["Color", "Size", "Others"],
        },
        price: { type: "number", format: "double" },
        quantity: { type: "integer" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    Cartitems: {
      $id: "cartItems",
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        item: { $ref: "product#" },
        product_quantity: { type: "integer" },
        unit_price: { type: "number", format: "double" },
        value: { type: "number", format: "double" },
        variation: { oneOf: [{ type: "null" }, { $ref: "productVariation#" }] },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    // Cart Model
    Cart: {
      $id: "cart",
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        totalValue: { type: "number" },
        status: {
          type: "string",
          enum: ["Active", "Abandoned", "Checkedout"],
        },
        notes: { type: "string", nullable: true },
        recipientName: { type: "string" },
        recipientPhone: { type: "string" },
        deliveryAddress: { type: "string" },
        deliveryType: {
          type: "string",
          enum: ["PICKUP", "DELIVERY", "SHIPPING"],
        },
        cartItems: {
          type: "array",
          items: {
            type: "object",
            $ref: "cartItems#",
          },
        },
      },
    },
    Sales: {
      $id: "sales",
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        status: {
          type: "string",
          enum: ["Delivered", "Paid", "Returned", "Cancelled"],
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        tenant_id: { type: "string", format: "uuid" },
        user_id: { type: "string", format: "uuid" },
        cart_id: { type: "string", format: "uuid" },
        amount: { type: "number", format: "double" },
      },
    },
  },
};
