import StatusCode from "status-code-enum";
import { CASSuccessCode, CASSuccessMessage } from "../../utils/enums";

interface FinecoreConfigHandlerDeps {
  prisma: PrismaClientType;
}

export const finecoreConfigHandler = (deps: FinecoreConfigHandlerDeps) => {
  const { prisma } = deps;

  return {
    createOrUpdateConfig: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant, body } = request;
      const { api_key, public_key, webhook_secret, environment } = body;

      const existing = await prisma.tenantFinecoreConfig.findUnique({
        where: { tenant_id: tenant.id },
      });

      let config;
      if (existing) {
        config = await prisma.tenantFinecoreConfig.update({
          where: { tenant_id: tenant.id },
          data: {
            apiKey: api_key,
            publicKey: public_key || null,
            webhookSecret: webhook_secret || null,
            environment: environment || existing.environment,
          },
        });
      } else {
        config = await prisma.tenantFinecoreConfig.create({
          data: {
            apiKey: api_key,
            publicKey: public_key || null,
            webhookSecret: webhook_secret || null,
            environment: environment || "sandbox",
            tenant_id: tenant.id,
          },
        });
      }

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.TENANT_EMAIL_CONFIG_UPDATED,
        message: CASSuccessMessage.TENANT_EMAIL_CONFIG_UPDATED,
        data: {
          id: config.id,
          environment: config.environment,
          hasApiKey: !!config.apiKey,
          hasPublicKey: !!config.publicKey,
          hasWebhookSecret: !!config.webhookSecret,
        },
      });
    },

    getConfig: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant } = request;

      const config = await prisma.tenantFinecoreConfig.findUnique({
        where: { tenant_id: tenant.id },
      });

      if (!config) {
        return reply.status(StatusCode.ClientErrorNotFound).send({
          status: "error",
          code: "TEM4002",
          message: "Finecore not configured for this tenant",
        });
      }

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.DATA_RETRIEVED,
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: {
          id: config.id,
          environment: config.environment,
          hasApiKey: !!config.apiKey,
          hasPublicKey: !!config.publicKey,
          hasWebhookSecret: !!config.webhookSecret,
        },
      });
    },

    deleteConfig: async (request: any, reply: any) => {
      if (!request.tenant) {
        throw { statusCode: 401, message: "Tenant not found" };
      }

      const { tenant } = request;

      await prisma.tenantFinecoreConfig.delete({
        where: { tenant_id: tenant.id },
      });

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.DATA_DELETED,
        message: CASSuccessMessage.DATA_DELETED,
      });
    },
  };
};

export type FinecoreConfigHandler = ReturnType<typeof finecoreConfigHandler>;
