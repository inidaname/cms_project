export const ProductRouteSchemas = {
  create: {
    tags: ["Products"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    body: {
      type: "object",
      required: ["title", "price", "attributes"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        price: { type: "number" },
        attributes: { type: "object" },
        quantity: { type: "number" },
      },
    },
    response: {
      201: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "product#" } } },
        ],
      },
    },
  },
  getOne: {
    summary: "get single Product",
    description: "fetch signle product by product_id",
    tags: ["Products"],
    params: {
      type: "object",
      properties: {
        product_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "product#" } } },
        ],
      },
    },
  },
  getVariation: {
    tags: ["Products"],
    params: {
      type: "object",
      properties: {
        product_id: { type: "string", format: "uuid" },
        variation_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "product#" } } },
        ],
      },
    },
  },
};
