import { webhookHandler } from "../../core/webhook/webhook-handler";
import { WebhookSchemas } from "../../core/payments/payment.schema";

const webhookRoutes: PluginType = async (app) => {
  const handler = webhookHandler({ prisma: app.prisma });

  app.post("/finecore", { schema: WebhookSchemas.handleFinecoreWebhook }, handler.handleFinecoreWebhook);
};

export default webhookRoutes;
