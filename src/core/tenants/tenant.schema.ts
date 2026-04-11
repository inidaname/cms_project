const TenantSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    domain: { type: "string" },
    apiKey: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const UserSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    tenant_id: { type: "string" },
    email: { type: "string" },
    name: { type: "string", nullable: true },
    phone: { type: "string", nullable: true },
    role: { type: "string" },
    agreed: { type: "boolean", nullable: true },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const PaginationMetadataSchema = {
  type: "object",
  properties: {
    total: { type: "integer" },
    page: { type: "integer" },
    limit: { type: "integer" },
    totalPages: { type: "integer" },
    hasNextPage: { type: "boolean" },
    hasPrevPage: { type: "boolean" },
  },
};

export const TenantSchemas = {
  registerTenant: {
    summary: "Register Tenant",
    description: "Register a new tenant/business. Returns the tenant with their API key.",
    tags: ["Tenants"],
    body: {
      type: "object",
      required: ["name", "domain"],
      properties: {
        name: { type: "string", description: "Business/tenant name" },
        domain: { type: "string", description: "Business domain" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: TenantSchema,
        },
      },
    },
  },

  updateTenant: {
    summary: "Update Tenant",
    description: "Update tenant information",
    tags: ["Tenants"],
    security: [{ bearerAuth: [], apiKey: [] }],
    body: {
      type: "object",
      properties: {
        name: { type: "string", description: "Business/tenant name" },
        domain: { type: "string", description: "Business domain" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: TenantSchema,
        },
      },
    },
  },

  getTenant: {
    summary: "Get Current Tenant",
    description: "Get the authenticated tenant's information",
    tags: ["Tenants"],
    security: [{ bearerAuth: [], apiKey: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: TenantSchema,
        },
      },
    },
  },
};

export const UserSchemas = {
  getProfile: {
    summary: "Get User Profile",
    description: "Get the authenticated user's profile",
    tags: ["Users"],
    security: [{ bearerAuth: [], apiKey: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: UserSchema,
        },
      },
    },
  },

  updateProfile: {
    summary: "Update User Profile",
    description: "Update the authenticated user's profile",
    tags: ["Users"],
    security: [{ bearerAuth: [], apiKey: [] }],
    body: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: UserSchema,
        },
      },
    },
  },

  getUsers: {
    summary: "List Users",
    description: "Get all users for the tenant (admin only)",
    tags: ["Users"],
    security: [{ bearerAuth: [], apiKey: [] }],
    querystring: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 10 },
        role: { type: "string", enum: ["OWNER", "ADMIN", "USER"] },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "object",
            properties: {
              data: { type: "array", items: UserSchema },
              metadata: PaginationMetadataSchema,
            },
          },
        },
      },
    },
  },
};
