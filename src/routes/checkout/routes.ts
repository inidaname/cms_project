import { salesHandler } from "../../core/sales/sales-handler";

const checkoutRoutes: PluginType = async (app, opts) => {
  app.addHook("onRequest", app.authenticate);
  const handler = salesHandler(app);

  app.post("/", handler.initCheckout);
  app.get("/:checkout_id", handler.getCheckoutById);
  app.get("/", handler.getCheckouts);
};

export default checkoutRoutes;
