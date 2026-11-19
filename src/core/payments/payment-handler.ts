import StatusCode from "status-code-enum";
import { FinecoreError } from "../finecore/finecore-client";
import { createTenantFinecoreClient } from "../finecore/tenant-finecore";
import { CASSuccessCode, CASSuccessMessage } from "../../utils/enums";

interface PaymentHandlerDeps {
  prisma: PrismaClientType;
}

export const paymentHandler = (deps: PaymentHandlerDeps) => {
  const { prisma } = deps;

  return {
    initiateCheckoutPayment: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant, user, body } = request;
      const { cart_id, amount, reference, success_url, cancel_url, metadata } = body;

      const finecore = await createTenantFinecoreClient(tenant.id, prisma);
      if (!finecore) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          code: "TEM9002",
          message: "Finecore is not configured for this tenant",
        });
      }

      const cart = await prisma.cart.findFirst({
        where: { id: cart_id, user_id: user.id, tenant_id: tenant.id },
        include: { cartItems: true },
      });

      if (!cart) {
        return reply.status(StatusCode.ClientErrorNotFound).send({
          status: "error",
          code: "TEM4002",
          message: "Cart not found",
        });
      }

      if (!cart.cartItems.length) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          code: "TEM9003",
          message: "Cannot checkout an empty cart",
        });
      }

      // Payments attach to the sale created by checkout, not to the cart
      // itself: a cart and its sale are different rows.
      const sale = await prisma.sales.findFirst({
        where: { cart_id: cart.id, tenant_id: tenant.id },
      });

      if (!sale) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          code: "TEM9004",
          message: "Cart has not been checked out yet",
        });
      }

      // The cart total is authoritative: a client-supplied amount that
      // differs from it is rejected rather than silently charged.
      const paymentAmount = cart.totalValue;
      if (amount !== undefined && Number(amount) !== Number(cart.totalValue)) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          code: "TEM9005",
          message: "Amount does not match the cart total",
        });
      }

      // Idempotent initiation: one payment row per sale. A completed payment
      // is terminal; an in-flight one is returned instead of double-charging
      // (this check runs before any provider call).
      const existingPayment = await prisma.payments.findFirst({
        where: { sales_id: sale.id, tenant_id: tenant.id },
      });

      if (existingPayment) {
        if (existingPayment.status === "Success") {
          return reply.status(StatusCode.ClientErrorConflict).send({
            status: "error",
            code: "TEM9006",
            message: "Payment already completed for this cart",
          });
        }
        return reply.status(StatusCode.ClientErrorConflict).send({
          status: "error",
          code: "TEM9007",
          message: "Payment already initiated for this cart",
          data: { payment: existingPayment },
        });
      }

      const paymentReference =
        reference || `ORD_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      try {
        const response = await finecore.createCheckoutSession({
          amount: paymentAmount,
          currency: "NGN",
          reference: paymentReference,
          allowed_methods: ["card", "bank_transfer", "ussd", "qrcode"],
          customer_email: user.email,
          success_url,
          cancel_url,
          metadata: {
            cart_id,
            user_id: user.id,
            tenant_id: tenant.id,
            ...metadata,
          },
        });

        const payment = await prisma.payments
          .create({
            data: {
              amount: paymentAmount,
              channel: "Other",
              status: "Pending",
              reference: paymentReference,
              finecoreTransactionRef: paymentReference,
              user_id: user.id,
              tenant_id: tenant.id,
              sales_id: sale.id,
            },
          })
          .catch((error: any) => {
            // Lost a race against a concurrent initiation: the sale's unique
            // one-payment constraint holds; report the existing payment.
            if (error?.code === "P2002") {
              return null;
            }
            throw error;
          });

        if (!payment) {
          const raced = await prisma.payments.findFirst({
            where: { sales_id: sale.id, tenant_id: tenant.id },
          });
          return reply.status(StatusCode.ClientErrorConflict).send({
            status: "error",
            code: "TEM9007",
            message: "Payment already initiated for this cart",
            data: { payment: raced },
          });
        }

        return reply.status(StatusCode.SuccessCreated).send({
          status: "success",
          code: CASSuccessCode.DATA_CREATED,
          message: CASSuccessMessage.DATA_CREATED,
          data: {
            payment,
            checkout: {
              checkoutUrl: response.data.checkout_url,
              checkoutToken: response.data.checkout_token,
              amount: response.data.amount,
              currency: response.data.currency,
              expiresAt: response.data.expires_at,
            },
          },
        });
      } catch (error) {
        if (error instanceof FinecoreError) {
          return reply.status(StatusCode.ClientErrorBadRequest).send({
            status: "error",
            code: "TEM6001",
            message: error.message,
            data: error.response,
          });
        }
        throw error;
      }
    },

    verifyPayment: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant, params } = request;
      const { reference } = params;

      const payment = await prisma.payments.findFirst({
        where: {
          reference,
          tenant_id: tenant.id,
        },
        include: {
          paidBy: { select: { id: true, name: true, email: true } },
          paidFor: true,
        },
      });

      if (!payment) {
        return reply.status(StatusCode.ClientErrorNotFound).send({
          status: "error",
          code: "TEM4002",
          message: "Payment not found",
        });
      }

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.DATA_RETRIEVED,
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: payment,
      });
    },

    getPayments: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant, query } = request;
      const { page = 1, limit = 10, filter } = query;

      const payments = await prisma.payments.findMany({
        where: {
          tenant_id: tenant.id,
          ...(filter && { status: filter }),
        },
        include: {
          paidBy: { select: { id: true, name: true, email: true } },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      });

      const total = await prisma.payments.count({
        where: { tenant_id: tenant.id },
      });

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.DATA_RETRIEVED,
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: {
          data: payments,
          metadata: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    },
  };
};

export type PaymentHandler = ReturnType<typeof paymentHandler>;
