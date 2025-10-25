export const registerBody = {
  $id: "registerBody",
  type: "object",
  required: ["email", "password", "fullName", "rcNumber"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", format: "password" },
    rcNumber: { type: "string" },
    phone: { type: "string" },
    fullName: { type: "string" },
    agreed: {
      type: "boolean",
      description: "To indicated agreed with the terms of services",
    },
  },
};

export const loginBody = {
  $id: "loginBody",
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", format: "password" },
  },
  examples: [{ email: "this@that.the", password: "Password123" }],
};
