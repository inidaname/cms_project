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

      const paymentAmount = amount || cart.totalValue;
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

        const payment = await prisma.payments.create({
          data: {
            amount: paymentAmount,
            channel: "Other",
            status: "Pending",
            reference: paymentReference,
            finecoreTransactionRef: paymentReference,
            user_id: user.id,
            tenant_id: tenant.id,
            sales_id: cart_id,
          },
        });

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
