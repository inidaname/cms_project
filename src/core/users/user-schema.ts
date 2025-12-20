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
    description: "Get data of the authenticated user",
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
