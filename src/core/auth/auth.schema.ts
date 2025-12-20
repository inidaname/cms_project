export const AuthSchemas = {
  register: {
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 8 },
        phone: { type: "string" },
        name: { type: "string" },
      },
    },
    response: {
      201: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { token: { type: "string" } } },
        ],
      },
    },
  },
  login: {
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string" },
        password: { type: "string" },
      },
    },
    response: {
      200: {
        allOf: [
          { $ref: "baseResponse#" },
          {
            type: "object",
            properties: {
              token: {
                type: "string",
                example:
                  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
              },
            },
          },
        ],
      },
    },
  },
  refreshToken: {
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["refreshToken"],
      properties: { refreshToken: { type: "string" } },
    },
  },
  forgotPassword: {
    description: "Request a password reset link/token. Accepts email OR phone.",
    tags: ["Auth"],
    body: {
      type: "object",
      // One of these must be present based on your handler logic
      oneOf: [{ required: ["email"] }, { required: ["phone"] }],
      properties: {
        email: { type: "string", format: "email" },
        phone: { type: "string" },
      },
    },
    response: {
      200: { $ref: "baseResponse#" },
    },
  },

  resetPassword: {
    description: "Reset password using the token received via email/SMS",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["token", "password"],
      properties: {
        token: { type: "string", description: "The raw 32-byte hex token" },
        password: {
          type: "string",
          minLength: 8,
          description: "The new password",
        },
      },
    },
    response: {
      200: { type: "null" }, // Your handler returns a bare 200 OK
    },
  },

  logout: {
    description: "Invalidate a refresh token and logout",
    tags: ["Auth"],
    security: [
      {
        bearerAuth: [],
        apiKey: [],
      },
    ],
    body: {
      type: "object",
      required: ["token"],
      properties: {
        token: { type: "string", description: "The refresh token to revoke" },
      },
    },
    response: {
      200: { $ref: "baseResponse#" },
    },
  },
};
