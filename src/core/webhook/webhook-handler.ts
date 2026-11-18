import StatusCode from "status-code-enum";
import { FinecoreWebhookPayload } from "../finecore/types";
import { getFinecoreWebhookSecret } from "../finecore/tenant-finecore";
import { hmacSha256Hex } from "../../helpers/webcrypto";

interface WebhookHandlerDeps {
  prisma: PrismaClientType;
}

export const webhookHandler = (deps: WebhookHandlerDeps) => {
  const { prisma } = deps;

  const verifySignature = async (
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> => {
    const digest = await hmacSha256Hex(payload, secret);
    return digest === signature;
  };

  return {
    handleFinecoreWebhook: async (request: any, reply: any) => {
      const signature = request.headers["x-webhook-signature"];
      const timestamp = request.headers["x-webhook-timestamp"];
      const rawBody = request.rawBody as string;

      // Signature, timestamp and raw body are mandatory: the webhook is a
      // public route, so verification is the only authentication it has.
      if (!rawBody) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: "Missing request body",
        });
      }

      if (!signature || !timestamp) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: "Missing webhook signature or timestamp",
        });
      }

      const payload = request.body as FinecoreWebhookPayload;
      const { event, data } = payload;

      // Resolve the tenant deterministically: prefer the tenant embedded in
      // the provider payload metadata, otherwise derive it from the referenced
      // payment. An arbitrary-config fallback is never used.
      let tenantId: string | null = null;

      if (data.metadata?.tenant_id) {
        tenantId = data.metadata.tenant_id as string;
      } else if (data.reference) {
        const payment = await prisma.payments.findFirst({
          where: {
            OR: [
              { reference: data.reference },
              { finecoreTransactionRef: data.reference },
            ],
          },
          select: { tenant_id: true },
        });
        tenantId = payment?.tenant_id || null;
      }

      if (!tenantId) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: "Unable to resolve webhook tenant",
        });
      }

      const webhookSecret = await getFinecoreWebhookSecret(tenantId, prisma);

      if (!webhookSecret) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: "Webhook signature verification unavailable",
        });
      }

      const isValid = await verifySignature(rawBody, signature, webhookSecret);
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

      const { reference, status } = data;

      // Every lookup and mutation below is constrained to the verified tenant.
      const existingPayment = await prisma.payments.findFirst({
        where: {
          OR: [
            { reference: reference },
            { finecoreTransactionRef: reference },
          ],
          tenant_id: tenantId,
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
            where: {
              id: existingPayment.paidFor.cart_id,
              tenant_id: tenantId,
            },
            data: { status: "Checkedout" },
          });

          await prisma.sales.update({
            where: {
              cart_id: existingPayment.paidFor.cart_id,
              tenant_id: tenantId,
            },
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
