// // POST /tenants
// export const CreateTenantSchema = {
//   $id: "CreateTenantDto",
//   body: { $ref: "CreateTenantDto#" },
//   response: {
//     201: { $ref: "Tenant#" },
//   },
// };

// // GET /tenants
// export const ListTenantsSchema = {
//   $id: "listTenantsSchema",
//   response: {
//     200: {
//       type: "array",
//       items: { $ref: "Tenant#" },
//     },
//   },
// };

// // GET /tenants/:id
// export const GetTenantSchema = {
//   $id: "getTenantSchema",
//   params: {
//     type: "object",
//     properties: {
//       id: { type: "string", format: "uuid" },
//     },
//     required: ["id"],
//   },
//   response: {
//     200: { $ref: "Tenant#" },
//   },
// };

// // PATCH /tenants/:id
// export const UpdateTenantSchema = {
//   $id: "updateTenantSchema",
//   params: {
//     type: "object",
//     properties: {
//       id: { type: "string", format: "uuid" },
//     },
//   },
//   body: { $ref: "UpdateTenantDto#" },
//   response: {
//     200: { $ref: "Tenant#" },
//   },
// };
