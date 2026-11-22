const paginationQuery = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    filter: { type: "string" },
  },
};

const uuid = () => ({ type: "string", format: "uuid" });

// Paginated envelope for /super-admin sub-lists:
// { status, data: { data: [...], metadata } }.
function tenantSubListResponse(itemSchema: object) {
  return {
    200: {
      type: "object",
      properties: {
        status: { type: "string" },
        data: {
          type: "object",
          properties: {
            data: { type: "array", items: itemSchema },
            metadata: {
              type: "object",
              properties: {
                total: { type: "integer" },
                page: { type: "integer" },
                limit: { type: "integer" },
                totalPages: { type: "integer" },
                hasNextPage: { type: "boolean" },
                hasPrevPage: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  };
}

// Audit-log row shape: entity + actor fields plus (on the platform list)
// the resolved tenant name. `details` is provider-defined JSON.
function auditLogRow(withTenant: boolean) {
  return {
    type: "object",
    properties: {
      id: uuid(),
      tenant_id: uuid(),
      user_id: { type: "string", format: "uuid", nullable: true },
      action: { type: "string", enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "INVITE", "REMOVE", "TRANSFER"] },
      entityType: { type: "string", enum: ["USER", "PRODUCT", "ORDER", "PAYMENT", "SETTINGS", "TEAM", "PROJECT"] },
      entityId: { type: "string", nullable: true },
      details: { type: "object", additionalProperties: true, nullable: true },
      ipAddress: { type: "string", nullable: true },
      userAgent: { type: "string", nullable: true },
      user: {
        type: "object",
        nullable: true,
        properties: {
          name: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
        },
      },
      ...(withTenant && {
        tenant: {
          type: "object",
          nullable: true,
          properties: { name: { type: "string" } },
        },
      }),
      createdAt: { type: "string" },
    },
  };
}

const tokenResponse = {
  200: {
    type: "object",
    properties: {
      status: { type: "string" },
      code: { type: "string" },
      message: { type: "string" },
      data: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              name: { type: "string", nullable: true },
              role: { type: "string" },
            },
          },
        },
      },
    },
  },
};

const impersonateResponse = {
  200: {
    type: "object",
    properties: {
      status: { type: "string" },
      data: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          apiKey: { type: "string" },
          tenant: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              domain: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export const SuperAdminSchemas: Record<string, any> = {
  login: {
    summary: "Super Admin Login",
    description: "Authenticate a platform super admin. Public endpoint.",
    tags: ["Super Admin"],
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
      },
    },
    response: tokenResponse,
  },

  getOverview: {
    summary: "Platform Overview",
    description: "Cross-tenant platform analytics",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "object",
            properties: {
              totalTenants: { type: "number" },
              activeTenants: { type: "number" },
              suspendedTenants: { type: "number" },
              totalUsers: { type: "number" },
              totalProducts: { type: "number" },
              totalOrders: { type: "number" },
              totalRevenue: { type: "number" },
            },
          },
        },
      },
    },
  },

  listTenants: {
    summary: "List Tenants",
    description: "List all tenants (paginated, searchable)",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    querystring: paginationQuery,
  },

  createTenant: {
    summary: "Create Tenant",
    description: "Create a tenant and its owner user. Server generates the API key.",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
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
        type: "object",
        properties: {
          status: { type: "string" },
          data: { $ref: "tenant#" },
        },
      },
    },
  },

  getTenantById: {
    summary: "Get Tenant",
    description: "Get a tenant with counts and API key",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "object",
            allOf: [{ $ref: "tenant#" }],
          },
        },
      },
    },
  },

  updateTenantStatus: {
    summary: "Update Tenant Status",
    description: "Update a tenant's status (suspend/activate/etc)",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["status"],
      properties: {
        status: {
          type: "string",
          enum: ["ACTIVE", "SUSPENDED", "EXPIRED", "DELETED", "OUTDATED", "ABANDONED"],
        },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },

  deleteTenant: {
    summary: "Delete Tenant",
    description: "Permanently delete a tenant and all of its data",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: { type: "object", properties: { status: { type: "string" }, message: { type: "string" } } },
    },
  },

  impersenate: {
    summary: "Impersonate Tenant",
    description:
      "Issue a tenant-scoped OWNER JWT for the target tenant so the super admin can operate its admin panel",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    response: impersonateResponse,
  },

  listTenantUsers: {
    summary: "List Tenant Users",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    querystring: paginationQuery,
    response: tenantSubListResponse({
      id: uuid(),
      tenant_id: uuid(),
      email: { type: "string", format: "email" },
      name: { type: "string", nullable: true },
      phone: { type: "string", nullable: true },
      role: { type: "string", enum: ["OWNER", "ADMIN", "USER"] },
      agreed: { type: "boolean", nullable: true },
      createdAt: { type: "string" },
      updatedAt: { type: "string" },
    }),
  },

  listTenantProducts: {
    summary: "List Tenant Products",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    querystring: paginationQuery,
    response: tenantSubListResponse({
      type: "object",
      description: "Product row (product# fields).",
      additionalProperties: true,
    }),
  },

  listTenantOrders: {
    summary: "List Tenant Orders",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    querystring: paginationQuery,
    response: tenantSubListResponse({
      type: "object",
      description: "Sales row (sales# fields) plus cart with cart items.",
      additionalProperties: true,
    }),
  },

  listTenantPayments: {
    summary: "List Tenant Payments",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    querystring: paginationQuery,
    response: tenantSubListResponse({ $ref: "payment#" }),
  },

  listTenantAuditLogs: {
    summary: "List Tenant Audit Logs",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    querystring: paginationQuery,
    response: tenantSubListResponse(auditLogRow(true)),
  },

  listUsers: {
    summary: "List All Users",
    description: "Cross-tenant user list with tenant names",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    querystring: paginationQuery,
    response: tenantSubListResponse({
      id: uuid(),
      tenant_id: uuid(),
      email: { type: "string", format: "email" },
      name: { type: "string", nullable: true },
      phone: { type: "string", nullable: true },
      role: { type: "string", enum: ["OWNER", "ADMIN", "USER", "SUPER_ADMIN"] },
      agreed: { type: "boolean", nullable: true },
      createdAt: { type: "string" },
      updatedAt: { type: "string" },
      tenant: {
        type: "object",
        properties: {
          id: uuid(),
          name: { type: "string" },
          domain: { type: "string" },
        },
      },
    }),
  },

  updateUserRole: {
    summary: "Update User Role",
    description: "Change a tenant user's role",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["role"],
      properties: {
        role: { type: "string", enum: ["OWNER", "ADMIN", "USER", "SUPER_ADMIN"] },
      },
    },
    response: {
      200: { type: "object", properties: { status: { type: "string" }, message: { type: "string" } } },
    },
  },

  deleteUser: {
    summary: "Delete User",
    description: "Delete a tenant user",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: { type: "object", properties: { status: { type: "string" }, message: { type: "string" } } },
    },
  },

  listAuditLogs: {
    summary: "List Audit Logs",
    description: "Cross-tenant audit logs with user info and tenant names",
    tags: ["Super Admin"],
    security: [{ bearerAuth: [] }],
    querystring: paginationQuery,
    response: tenantSubListResponse(auditLogRow(true)),
  },
};

const tokenPairResponse = {
  200: {
    type: "object",
    properties: {
      status: { type: "string" },
      message: { type: "string" },
      data: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
        },
      },
    },
  },
};

const refreshTokenSchema = {
  summary: "Super Admin Refresh Token",
  description: "Exchange a super-admin refresh token for a new token pair. Public endpoint.",
  tags: ["Super Admin"],
  body: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string" },
    },
  },
  response: tokenPairResponse,
};

const logoutSchema = {
  summary: "Super Admin Logout",
  description: "Revoke a super-admin refresh token",
  tags: ["Super Admin"],
  body: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string" },
    },
  },
};

SuperAdminSchemas.refreshToken = refreshTokenSchema;
SuperAdminSchemas.logout = logoutSchema;
