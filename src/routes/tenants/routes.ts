import { tenantHandler } from "../../core/tenants/tenant-handler";
import { finecoreConfigHandler } from "../../core/finecore/finecore-config-handler";
import { TenantSchemas } from "../../core/tenants/tenant.schema";
import { FinecoreConfigSchemas } from "../../core/payments/payment.schema";

const tenantRoutes: PluginType = async (app, opts) => {
  const handler = tenantHandler(app);
  const finecoreHandler = finecoreConfigHandler({ prisma: app.prisma });

  app.post("/", { schema: TenantSchemas.registerTenant }, handler.registerTenant);
  app.put("/", { schema: TenantSchemas.updateTenant }, handler.updateTenant);
  app.get("/", { schema: TenantSchemas.getTenant }, handler.getTenant);

  app.addHook("onRequest", app.authenticate);
  app.post("/finecore", { schema: FinecoreConfigSchemas.createOrUpdateConfig }, finecoreHandler.createOrUpdateConfig);
  app.get("/finecore", { schema: FinecoreConfigSchemas.getConfig }, finecoreHandler.getConfig);
  app.delete("/finecore", { schema: FinecoreConfigSchemas.deleteConfig }, finecoreHandler.deleteConfig);
};

export default tenantRoutes;
