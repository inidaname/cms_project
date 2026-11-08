import { paymentHandler } from "../../core/payments/payment-handler";
import { PaymentSchemas } from "../../core/payments/payment.schema";

const paymentRoutes: PluginType = async (app) => {
  const handler = paymentHandler({ prisma: app.prisma });

  app.addHook("onRequest", app.authenticate);

  app.post("/checkout-link", { schema: PaymentSchemas.initiateCheckoutPayment }, handler.initiateCheckoutPayment);
  app.get("/verify/:reference", { schema: PaymentSchemas.verifyPayment }, handler.verifyPayment);
  app.get("/", { schema: PaymentSchemas.getPayments }, handler.getPayments);
};

export default paymentRoutes;
