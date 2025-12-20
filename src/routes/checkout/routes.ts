import { salesHandler } from "../../core/sales/sales-handler";
import { SalesSchemas } from "../../core/sales/sales.schema";

const checkoutRoutes: PluginType = async (app, opts) => {
  const handler = salesHandler(app);

  app.addHook("onRequest", app.authenticate);

  app.post("/", { schema: SalesSchemas.initCheckout }, handler.initCheckout);
  app.get(
    "/:checkout_id",
    { schema: SalesSchemas.getCheckoutById },
    handler.getCheckoutById
  );
  app.get("/", handler.getCheckouts);
};

export default checkoutRoutes;
