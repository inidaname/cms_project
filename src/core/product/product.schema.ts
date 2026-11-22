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
        imageURL: { type: "string", format: "uri", nullable: true },
        description: { type: "string" },
        price: { type: "number" },
        attributes: { type: "object" },
        quantity: { type: "number" },
        variation: { type: "boolean" },
        isBundle: { type: "boolean" },
        isFeatured: { type: "boolean" },
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
    description:
      "fetch signle product by product_id. When the merchant configured a flexible offering, the response includes optionGroups (with choices), offeringSlots, and productVariations.",
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
  getTenantProducts: {
    summary: "List Products",
    description:
      "Paginated product list for the tenant. Rows are product records plus merchant relations (variations, counts); envelope is the standard paginated shape.",
    tags: ["Products"],
    security: [
      {
        apiKey: [],
      },
    ],
    querystring: {
      type: "object",
      properties: {
        page: { type: "integer", minimum: 1, default: 1 },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
        filter: { type: "string", description: "Title search" },
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
                description: "Product rows (product# fields plus merchant relations).",
                items: { type: "object", additionalProperties: true },
              },
              metadata: { $ref: "paginationMetadata#" },
            },
          },
        },
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
