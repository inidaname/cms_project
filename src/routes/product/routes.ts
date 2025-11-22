import { productHandler } from "../../core/product/product-handlers";

const productRoutes: PluginType = async (app, opts) => {
  const handler = productHandler(app);

  app.post("/", { preHandler: [app.authenticate] }, handler.createProduct);
  app.get("/", handler.getTenantProducts);
  app.get("/variation/:product_id/:variation_id", handler.getVariationById);
  app.get("/variation/:product_id", handler.getProductVariations);
  app.get("/:product_id", handler.getProductById);
  app.post(
    "/variation/:product_id",
    { preHandler: [app.authenticate] },
    handler.createVariation,
  );
  app.put(
    "/variation/:product_id/:variation_id",
    { preHandler: [app.authenticate] },
    handler.updateVariation,
  );
  app.put(
    "/:product_id",
    { preHandler: [app.authenticate] },
    handler.updateProduct,
  );
  app.delete(
    "/:product_id",
    { preHandler: [app.authenticate] },
    handler.deleteProduct,
  );
  app.delete(
    "/variation/:product_id/:variation_id",
    { preHandler: [app.authenticate] },
    handler.deleteVariation,
  );
};

export default productRoutes;
