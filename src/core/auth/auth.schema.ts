export const AuthSchemas = {
  register: {
    summary: "Register User",
    description: "Register a new user account for a tenant",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: {
          type: "string",
          minLength: 8,
          description: "Password must be at least 8 characters",
        },
        phone: { type: "string" },
        name: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          code: { type: "string" },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              user: {
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
              },
              token: { type: "string" },
            },
          },
        },
      },
    },
  },

  login: {
    summary: "Login User",
    description: "Authenticate a user and receive JWT tokens",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          code: { type: "string" },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              user: {
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
              },
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
            },
          },
        },
      },
    },
  },

  refreshToken: {
    summary: "Refresh Token",
    description: "Exchange a refresh token for new access and refresh tokens",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["refreshToken"],
      properties: {
        refreshToken: {
          type: "string",
          description: "The refresh token from login",
        },
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
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
            },
          },
        },
      },
    },
  },

  forgotPassword: {
    summary: "Request Password Reset",
    description: "Request a password reset link via email or SMS",
    tags: ["Auth"],
    body: {
      type: "object",
      properties: {
        email: {
          type: "string",
          format: "email",
          description: "User's email address",
        },
        phone: { type: "string", description: "User's phone number" },
      },
      anyOf: [{ required: ["email"] }, { required: ["phone"] }],
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

  resetPassword: {
    summary: "Reset Password",
    description: "Reset password using a token received via email/SMS",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["token", "password"],
      properties: {
        token: {
          type: "string",
          description: "The reset token from email/SMS",
        },
        password: {
          type: "string",
          minLength: 8,
          description: "New password (min 8 characters)",
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

  logout: {
    summary: "Logout",
    description: "Invalidate a refresh token",
    tags: ["Auth"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["refreshToken"],
      properties: {
        refreshToken: {
          type: "string",
          description: "The refresh token to revoke",
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
};
