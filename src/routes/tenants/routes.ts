import { tenantHandler } from "../../core/tenants/tenant-handler";
import { TenantSchemas } from "../../core/tenants/tenant.schema";

const tenantRoutes: PluginType = async (app, opts) => {
  const handler = tenantHandler(app);

  // app.addHook("onRequest", app.authenticate);

  app.post("/", handler.registerTenant);
  app.put("/", { schema: TenantSchemas.updateTenant }, handler.updateTenant);
  app.get("/", { schema: TenantSchemas.getTenant }, handler.getTenant);
};

export default tenantRoutes;
