import { cartsHandler } from "../../core/carts/cart-handler";

const cartRoute: PluginType = async (app, opts) => {
  const handler = cartsHandler(app);
  app.addHook("onRequest", app.authenticate);
  app.post("/", handler.startCart);
  app.get("/", handler.getCarts);
  app.get("/items/cart/:cart_id", handler.getCartItems);
  app.get("/items/:item_id", handler.getItmeById);
  app.post("/items/:cart_id?", handler.addItmesToCart);
  app.put("/items/:item_id", handler.editItemQuantity);
  app.delete("/items/:item_id", handler.removeItemById);

  app.get("/:cart_id?", handler.getCartById);
  app.put("/:cart_id?", handler.editCartById);
  app.delete("/:cart_id", handler.deleteCart);
};

export default cartRoute;
