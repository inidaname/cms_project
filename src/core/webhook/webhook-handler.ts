import { createHmac } from "crypto";
import StatusCode from "status-code-enum";
import { FinecoreWebhookPayload } from "../finecore/types";
import { getFinecoreWebhookSecret } from "../finecore/tenant-finecore";

interface WebhookHandlerDeps {
  prisma: PrismaClientType;
}

export const webhookHandler = (deps: WebhookHandlerDeps) => {
  const { prisma } = deps;

  const verifySignature = (
    payload: string,
    signature: string,
    secret: string
  ): boolean => {
    const hmac = createHmac("sha256", secret);
    const digest = hmac.update(payload).digest("hex");
    return digest === signature;
  };

  return {
    handleFinecoreWebhook: async (request: any, reply: any) => {
      const signature = request.headers["x-webhook-signature"];
      const timestamp = request.headers["x-webhook-timestamp"];
      const rawBody = request.rawBody as string;

      if (!rawBody) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: "Missing request body",
        });
      }

      const payload = request.body as FinecoreWebhookPayload;
      const { event, data } = payload;

      let tenantId: string | null = null;

      if (data.metadata?.tenant_id) {
        tenantId = data.metadata.tenant_id as string;
      } else if (data.merchant_id) {
        const config = await prisma.tenantFinecoreConfig.findFirst({
          where: {
            apiKey: {
              not: "",
            },
          },
        });
        tenantId = config?.tenant_id || null;
      }

      if (tenantId) {
        const webhookSecret = await getFinecoreWebhookSecret(tenantId, prisma);

        if (webhookSecret && signature && timestamp) {
          const isValid = verifySignature(rawBody, signature, webhookSecret);
          if (!isValid) {
            return reply.status(StatusCode.ClientErrorUnauthorized).send({
              status: "error",
              message: "Invalid webhook signature",
            });
          }

          const timeDiff = Math.abs(
            Date.now() - new Date(timestamp).getTime()
          );
          if (timeDiff > 5 * 60 * 1000) {
            return reply.status(StatusCode.ClientErrorBadRequest).send({
              status: "error",
              message: "Webhook timestamp expired",
            });
          }
        }
      }

      const { reference, status } = data;

      const existingPayment = await prisma.payments.findFirst({
        where: {
          OR: [
            { reference: reference },
            { finecoreTransactionRef: reference },
          ],
        },
        include: {
          paidFor: true,
        },
      });

      if (existingPayment) {
        const paymentStatus =
          status === "COMPLETED"
            ? "Success"
            : status === "FAILED"
              ? "Failed"
              : "Pending";

        await prisma.payments.update({
          where: { id: existingPayment.id },
          data: { status: paymentStatus },
        });

        if (status === "COMPLETED" && existingPayment.paidFor) {
          await prisma.cart.update({
            where: { id: existingPayment.paidFor.cart_id },
            data: { status: "Checkedout" },
          });

          await prisma.sales.update({
            where: { cart_id: existingPayment.paidFor.cart_id },
            data: { status: "Paid" },
          });
        }

        console.log(`Webhook processed: ${event} for payment ${reference}`);
      } else {
        console.log(`Webhook received for unknown payment: ${reference}`);
      }

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: "Webhook received",
      });
    },
  };
};

export type WebhookHandler = ReturnType<typeof webhookHandler>;

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}
