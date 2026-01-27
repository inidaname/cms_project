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
      required: ["title", "price", "attributes", "isBundle"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        price: { type: "number" },
        attributes: { type: "object" },
        quantity: { type: "number" },
        variation: { type: "boolean" },
        isBundle: { type: "boolean" },
        min_items: { type: "number" },
        max_items: { type: "number" },
      },
    },
    // response: {
    //   201: {
    //     allOf: [
    //       { $ref: "baseResponse#" },
    //       { type: "object", properties: { data: { $ref: "product#" } } },
    //     ],
    //   },
    // },
  },
  addBundleComponent: {
    summary: "Create Bundle Items",
    description: "Assign products that can be chosen",
    tags: ["Products"],
    params: {
      type: "object",
      properties: { product_id: { type: "string", format: "uuid" } }, // The Box ID
    },
    body: {
      type: "array",
      description: "Items of the product",
      items: {
        type: "object",
        required: ["child_id"],
        properties: {
          child_id: { type: "string", format: "uuid" },
          additionalPrice: { type: "number", default: 0.0 },
        },
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
