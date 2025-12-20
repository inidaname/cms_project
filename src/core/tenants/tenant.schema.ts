export const TenantSchemas = {
  registerTenant: {
    summary: "Create Tenant",
    description: "Register a business/tenant",
    tags: ["Tenants"],
    body: {
      type: "object",
      required: ["name", "domain"],
      properties: {
        name: { type: "string" },
        domain: { type: "string" },
      },
    },
    response: {
      201: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "tenant#" } } },
        ],
      },
    },
  },
  updateTenant: {
    summary: "Update Tenant",
    description: "Edit a business/tenant",
    tags: ["Tenants"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    body: {
      type: "object",
      required: ["name", "domain"],
      properties: {
        name: { type: "string" },
        domain: { type: "string" },
      },
    },
    response: {
      201: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "tenant#" } } },
        ],
      },
    },
  },
  getTenant: {
    summary: "Get Tenant",
    description: "Register a business/tenant",
    tags: ["Tenants"],
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          domain: { type: "string" },
          status: { type: "string" },
          apiKey: { type: "string" },
        },
      },
    },
  },
};
