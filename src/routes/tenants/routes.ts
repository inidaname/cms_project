import { tenantHandler } from "../../core/tenants/tenant-handler";

const tenantRoutes: PluginType = async (app, opts) => {
  const handler = tenantHandler(app);

  app.addHook("onRequest", app.authenticate);

  app.post("/", handler.registerTenant);
  app.put("/", handler.updateTenant);
  app.get("/", handler.getTenant);
};

export default tenantRoutes;
