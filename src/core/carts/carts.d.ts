type CartStatus = import("@prisma/client").CartStatus;

type Cart = import("@prisma/client").Cart;
type CartItems = import("@prisma/client").CartItems;
type CartsInput = InputType<Cart>;
type CartItemsInput = InputType<CartItems>;

type CartsHandler = (app: FastifyInstance) => {
  // addBundleToCart: Handler<any, any, { cart_id }>;
  // editCartLogistics: Handler<any, any, { cart_id }>;
  startCart: Handler<
    Omit<CartsInput, "status" | "user_id" | "tenant_id">,
    Cart
  >;
  addItmesToCart: Handler<
    Omit<CartItemsInput, "cart_id" | "value">[],
    Cart,
    { cart_id?: string }
  >;
  getCartById: Handler<void, Cart, { cart_id?: string }>; // cart_id is optional so it will get active cart
  changeCartStatus: Handler<{ status: CartStatus }, Cart, { cart_id?: string }>; // cart_id is optional so it will edit active cart
  deleteCart: Handler<void, Cart, { cart_id: string }>;
  getCarts: PaginatedHandler<
    void,
    Cart,
    void,
    {
      page?: number;
      limit?: number;
      filter?: CartStatus;
    }
  >;
  getItmeById: Handler<void, CartItems, { item_id: string }>;
  editItemQuantity: Handler<
    { quantity: string },
    CartItems,
    { item_id: string }
  >;
  getCartItems: Handler<void, CartItems[], { cart_id: string }>;
  removeItemById: Handler<void, CartItems, { item_id: string }>;
};
