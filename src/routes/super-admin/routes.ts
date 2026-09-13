import { superAdminHandler } from "../../core/super-admin/super-admin-handler";
import { SuperAdminSchemas } from "../../core/super-admin/super-admin.schema";

const superAdminRoutes: PluginType = async (app) => {
  const handler = superAdminHandler(app);

  app.post("/login", { schema: SuperAdminSchemas.login }, handler.login);
  app.post("/refresh-token", { schema: SuperAdminSchemas.refreshToken }, handler.refreshToken);
  app.post("/logout", { schema: SuperAdminSchemas.logout }, handler.logout);

  app.get("/analytics/overview", { schema: SuperAdminSchemas.getOverview }, handler.getOverview);

  app.get("/tenants", { schema: SuperAdminSchemas.listTenants }, handler.listTenants);
  app.post("/tenants", { schema: SuperAdminSchemas.createTenant }, handler.createTenant);
  app.put("/tenants/:id/status", { schema: SuperAdminSchemas.updateTenantStatus }, handler.updateTenantStatus);
  app.delete("/tenants/:id", { schema: SuperAdminSchemas.deleteTenant }, handler.deleteTenant);
  app.get("/tenants/:id", { schema: SuperAdminSchemas.getTenantById }, handler.getTenantById);
  app.post("/tenants/:id/impersonate", { schema: SuperAdminSchemas.impersenate }, handler.impersenate);

  app.get("/tenants/:id/users", { schema: SuperAdminSchemas.listTenantUsers }, handler.listTenantUsers);
  app.get("/tenants/:id/products", { schema: SuperAdminSchemas.listTenantProducts }, handler.listTenantProducts);
  app.get("/tenants/:id/orders", { schema: SuperAdminSchemas.listTenantOrders }, handler.listTenantOrders);
  app.get("/tenants/:id/payments", { schema: SuperAdminSchemas.listTenantPayments }, handler.listTenantPayments);
  app.get("/tenants/:id/audit-logs", { schema: SuperAdminSchemas.listTenantAuditLogs }, handler.listTenantAuditLogs);

  app.get("/users", { schema: SuperAdminSchemas.listUsers }, handler.listUsers);
  app.put("/users/:id/role", { schema: SuperAdminSchemas.updateUserRole }, handler.updateUserRole);
  app.delete("/users/:id", { schema: SuperAdminSchemas.deleteUser }, handler.deleteUser);

  app.get("/audit-logs", { schema: SuperAdminSchemas.listAuditLogs }, handler.listAuditLogs);
};

export default superAdminRoutes;
