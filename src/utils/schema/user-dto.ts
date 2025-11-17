export const CreateUserSchema = {
  $id: "CreateUserDto",
  body: {
    type: "object",
    required: ["tenant_id", "email", "password"],
    properties: {
      tenant_id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      password: { type: "string" },
    },
  },
  response: {
    201: { $ref: "User#" },
  },
};

// export const ListUsersSchema = {
//   $id: "ListUsersSchema",
//   response: {
//     200: {
//       type: "array",
//       items: { $ref: "User#" },
//     },
//   },
// };

// export const GetUserSchema = {
//   $id: "GetUserSchema",
//   params: {
//     type: "object",
//     required: ["id"],
//     properties: {
//       id: { type: "string", format: "uuid" },
//     },
//   },
//   response: {
//     200: { $ref: "User#" },
//   },
// };

// export const UpdateUserSchema = {
//   $id: "UpdateUserSchema",
//   params: {
//     type: "object",
//     required: ["id"],
//     properties: {
//       id: { type: "string", format: "uuid" },
//     },
//   },
//   body: { $ref: "UpdateUserDto#" },
//   response: {
//     200: { $ref: "User#" },
//   },
// };
