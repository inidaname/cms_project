type Payments = import("@prisma/client").Payments;
type PaymentInput = InputType<Payments>;

type PaymentHandler = (app: FastifyInstance) => {
  recordPayment: Handler<Omit<PaymentInput, "tenant_id" | "user_id">, Payments>;
  getAlPayments: PaginatedData<Payments>;
  getPaymentById: Handler<void, Payments, { payment_id: string }>;
};
