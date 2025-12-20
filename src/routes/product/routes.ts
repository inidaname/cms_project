import { productHandler } from "../../core/product/product-handlers";
import { ProductRouteSchemas } from "../../core/product/product.schema";

const productRoutes: PluginType = async (app, opts) => {
  const handler = productHandler(app);

  app.post(
    "/",
    { preHandler: [app.authenticate], schema: ProductRouteSchemas.create },
    handler.createProduct
  );
  app.get("/", handler.getTenantProducts);
  app.get(
    "/variation/:product_id/:variation_id",
    { schema: ProductRouteSchemas.getVariation },
    handler.getVariationById
  );
  app.get(
    "/variation/:product_id",
    { schema: ProductRouteSchemas.getVariation },
    handler.getProductVariations
  );
  app.get(
    "/:product_id",
    { schema: ProductRouteSchemas.getOne },
    handler.getProductById
  );
  app.post(
    "/variation/:product_id",
    {
      preHandler: [app.authenticate],
      schema: ProductRouteSchemas.getVariation,
    },
    handler.createVariation
  );
  app.put(
    "/variation/:product_id/:variation_id",
    {
      preHandler: [app.authenticate],
      schema: ProductRouteSchemas.getVariation,
    },
    handler.updateVariation
  );
  app.put(
    "/:product_id",
    { preHandler: [app.authenticate], schema: ProductRouteSchemas.getOne },
    handler.updateProduct
  );
  app.delete(
    "/:product_id",
    { preHandler: [app.authenticate], schema: ProductRouteSchemas.getOne },
    handler.deleteProduct
  );
  app.delete(
    "/variation/:product_id/:variation_id",
    {
      preHandler: [app.authenticate],
      schema: ProductRouteSchemas.getVariation,
    },
    handler.deleteVariation
  );
};

export default productRoutes;
