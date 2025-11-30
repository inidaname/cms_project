type Sales = import("@prisma/client").Sales;
type SalesInput = InputType<Sales>;

type SalesHandler = (app: FastifyInstance) => {
  initCheckout: Handler<Omit<SalesInput, "tenant_id" | "user_id">, Sales>;
  getCheckoutById: Handler<void, Sales, { checkout_id: string }>;
  getCheckouts: PaginatedHandler<
    void,
    Sales,
    void,
    { page?: number; limit?: number }
  >;
};
