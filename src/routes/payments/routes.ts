import { paymentHandler } from "../../core/payments/payment-handler";
import { PaymentSchemas } from "../../core/payments/payment.schema";

const paymentRoutes: PluginType = async (app) => {
  const handler = paymentHandler({ prisma: app.prisma });

  app.addHook("onRequest", app.authenticate);

  app.post("/card", { schema: PaymentSchemas.initiateCardPayment }, handler.initiateCardPayment);
  app.post("/card/approve", { schema: PaymentSchemas.approveCardPayment }, handler.approveCardPayment);
  app.post("/ussd", { schema: PaymentSchemas.initiateUSSDPayment }, handler.initiateUSSDPayment);
  app.post("/virtual-account", { schema: PaymentSchemas.generateVirtualAccount }, handler.generateVirtualAccount);
  app.get("/banks/ussd", { schema: PaymentSchemas.getUSSDBanks }, handler.getUSSDBanks);
  app.get("/verify/:reference", { schema: PaymentSchemas.verifyPayment }, handler.verifyPayment);
  app.get("/", { schema: PaymentSchemas.getPayments }, handler.getPayments);
};

export default paymentRoutes;
