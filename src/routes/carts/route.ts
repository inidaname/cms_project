import { cartsHandler } from "../../core/carts/cart-handler";
import { CartSchemas } from "../../core/carts/carts.schema";

const cartRoute: PluginType = async (app, opts) => {
  const handler = cartsHandler(app);
  app.addHook("onRequest", app.authenticate);

  app.post("/", { schema: CartSchemas.startCart }, handler.startCart);
  app.get("/", handler.getCarts);
  app.get(
    "/items/cart/:cart_id",
    { schema: CartSchemas.getCartbyId },
    handler.getCartItems
  );
  app.get(
    "/items/:item_id",
    { schema: CartSchemas.getItemById },
    handler.getItmeById
  );
  app.post(
    "/items/:cart_id?",
    { schema: CartSchemas.addItems },
    handler.addItmesToCart
  );
  app.put(
    "/items/:item_id",
    { schema: CartSchemas.editQuantity },
    handler.editItemQuantity
  );
  app.delete(
    "/items/:item_id",
    { schema: CartSchemas.deleteItem },
    handler.removeItemById
  );

  app.get(
    "/c/:cart_id?",
    { schema: CartSchemas.getCartbyId },
    handler.getCartById
  );
  app.put(
    "/c/status/:cart_id?",
    { schema: CartSchemas.editCartStatus },
    handler.changeCartStatus
  );
  app.delete(
    "/c/:cart_id",
    { schema: CartSchemas.getCartbyId },
    handler.deleteCart
  );
};

export default cartRoute;
