export const UserSchema = {
  getUserById: {
    summary: "Get user data",
    description: "Get data of the authenticated user",
    tags: ["User"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    response: {
      200: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "user#" } } },
        ],
      },
    },
  },
  updateUser: {
    summary: "Get user data",
    description: "Update the authenticated user's profile fields",
    tags: ["User"],
    security: [
      {
        apiKey: [],
        bearerAuth: [],
      },
    ],
    body: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string", format: "email" },
        phone: { type: "string" },
      },
    },
    response: {
      200: {
        allOf: [
          { $ref: "baseResponse#" },
          { type: "object", properties: { data: { $ref: "user#" } } },
        ],
      },
    },
  },
};
