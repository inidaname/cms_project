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
    initiateCardPayment: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant, user, body } = request;
      const { cart_id, amount, reference, card_details, metadata } = body;

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

      const paymentAmount = amount || cart.totalValue;

      try {
        const response = await finecore.initiateCardPayment({
          amount: paymentAmount,
          currency: "NGN",
          reference: reference || `ORD_${Date.now()}`,
          metadata: {
            cart_id,
            user_id: user.id,
            tenant_id: tenant.id,
            ...metadata,
          },
          card_details: {
            pan: card_details.pan,
            expiry_date: card_details.expiry_date,
            cvv: card_details.cvv,
            pin: card_details.pin,
          },
        });

        const payment = await prisma.payments.create({
          data: {
            amount: paymentAmount,
            channel: "Card",
            status: "Pending",
            reference: response.data.transaction_reference,
            finecoreTransactionRef: response.data.transaction_reference,
            authType: response.data.auth_type || null,
            requiresAuth: response.data.requires_authentication,
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
            finecore: response,
            requiresAuth: response.data.requires_authentication,
            authType: response.data.auth_type,
            nextAction: response.data.next_action,
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

    approveCardPayment: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant, body } = request;
      const { transaction_reference, otp } = body;

      const finecore = await createTenantFinecoreClient(tenant.id, prisma);
      if (!finecore) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          code: "TEM9002",
          message: "Finecore is not configured for this tenant",
        });
      }

      try {
        const response = await finecore.approveCardPayment(otp, transaction_reference);

        const payment = await prisma.payments.findFirst({
          where: {
            OR: [
              { reference: transaction_reference },
              { finecoreTransactionRef: transaction_reference },
            ],
          },
        });

        if (!payment) {
          return reply.status(StatusCode.ClientErrorNotFound).send({
            status: "error",
            code: "TEM4002",
            message: "Payment not found",
          });
        }

        await prisma.payments.update({
          where: { id: payment.id },
          data: {
            status: response.data.status === "COMPLETED" ? "Success" : "Pending",
          },
        });

        if (response.data.status === "COMPLETED") {
          await prisma.cart.update({
            where: { id: payment.sales_id },
            data: { status: "Checkedout" },
          });

          await prisma.sales.update({
            where: { cart_id: payment.sales_id },
            data: { status: "Paid" },
          });
        }

        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
          data: {
            payment,
            finecore: response,
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

    initiateUSSDPayment: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant, user, body } = request;
      const { cart_id, amount, bank_code, metadata } = body;

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
      });

      if (!cart) {
        return reply.status(StatusCode.ClientErrorNotFound).send({
          status: "error",
          code: "TEM4002",
          message: "Cart not found",
        });
      }

      const paymentAmount = amount || cart.totalValue;
      const reference = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        const response = await finecore.initiateUSSDPayment({
          amount: String(paymentAmount),
          bank_code: bank_code || "GTB",
          transaction_reference: reference,
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
            channel: "Transfer",
            status: "Pending",
            reference: response.data.transaction_reference,
            finecoreTransactionRef: response.data.transaction_reference,
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
            ussd: {
              shortCode: response.data.bank_short_code,
              reference: response.data.reference,
              transactionRef: response.data.transaction_reference,
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

    generateVirtualAccount: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant, user, body } = request;
      const { cart_id, amount, provider, metadata } = body;

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
      });

      if (!cart) {
        return reply.status(StatusCode.ClientErrorNotFound).send({
          status: "error",
          code: "TEM4002",
          message: "Cart not found",
        });
      }

      const paymentAmount = amount || cart.totalValue;
      const reference = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        const response = await finecore.generateVirtualAccount({
          amount: String(paymentAmount),
          provider: provider || "WEMA",
          transaction_reference: reference,
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
            channel: "Transfer",
            status: "Pending",
            reference: response.data.transaction_reference,
            finecoreTransactionRef: response.data.transaction_reference,
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
            virtualAccount: {
              accountName: response.data.account_name,
              accountNumber: response.data.account_number,
              bankName: response.data.bank_name,
              provider: response.data.provider,
              amount: response.data.amount,
              validityMinutes: response.data.validity_period_mins,
              expiresAt: new Date(Date.now() + response.data.validity_period_mins * 60000),
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

    getUSSDBanks: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant } = request;

      const finecore = await createTenantFinecoreClient(tenant.id, prisma);
      if (!finecore) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          code: "TEM9002",
          message: "Finecore is not configured for this tenant",
        });
      }

      try {
        const response = await finecore.getUSSDBanks();
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
          data: response.data,
        });
      } catch (error) {
        if (error instanceof FinecoreError) {
          return reply.status(StatusCode.ClientErrorBadRequest).send({
            status: "error",
            code: "TEM6001",
            message: error.message,
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
