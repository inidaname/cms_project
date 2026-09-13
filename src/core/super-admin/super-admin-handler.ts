import { SuperAdminService } from "./super-admin-service";
import { generateApiKey } from "../../helpers/generate_apikey";
import StatusCode from "status-code-enum";
import { CASErrorCode, CASErrorMessage, CASSuccessCode, CASSuccessMessage } from "../../utils/enums";
import { sendTenantWelcomeEmail } from "../../helpers/content";

export const superAdminHandler = (app: FastifyInstance) => {
  const service = new SuperAdminService(app.prisma);

  const pagination = (request: any) => ({
    page: Number(request.query?.page ?? 1),
    limit: Number(request.query?.limit ?? 10),
    filter: request.query?.filter as string | undefined,
  });

  return {
    login: async (request: any, reply: any) => {
      const { email, password } = request.body;

      const admin = await service.findByEmail(email);

      if (!admin || !(await service.verifyPassword(password, admin.password))) {
        throw {
          statusCode: StatusCode.ClientErrorUnauthorized,
          message: CASErrorMessage.UNAUTHORIZED_ACCESS,
          status: "error",
        };
      }

      const accessToken = app.jwt.sign({
        id: admin.id,
        userType: "User",
        tenant_id: admin.tenant_id,
        role: admin.role,
      });

      const refreshToken = app.jwt.sign(
        { id: admin.id, userType: "refresh_token" },
        { expiresIn: "7d" }
      );

      await service.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: admin.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          revoked: false,
        },
      });

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.LOGIN_SUCCESSFUL,
        message: "Super admin logged in",
        data: {
          accessToken,
          refreshToken,
          user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        },
      });
    },

    refreshToken: async (request: any, reply: any) => {
      const { refreshToken } = request.body;

      let decoded: any;
      try {
        decoded = app.jwt.verify(refreshToken);
      } catch {
        throw {
          statusCode: StatusCode.ClientErrorUnauthorized,
          message: "Invalid or expired token",
          status: "error",
        };
      }

      if (decoded.userType !== "refresh_token") {
        throw {
          statusCode: StatusCode.ClientErrorUnauthorized,
          message: "Invalid token type",
          status: "error",
        };
      }

      const stored = await service.findRefreshToken(refreshToken);
      if (!stored || stored.expiresAt < new Date()) {
        throw {
          statusCode: StatusCode.ClientErrorUnauthorized,
          message: "Invalid or expired refresh token",
          status: "error",
        };
      }

      const admin = await service.prisma.user.findUnique({ where: { id: decoded.id } });

      if (!admin || admin.role !== "SUPER_ADMIN") {
        throw {
          statusCode: StatusCode.ClientErrorUnauthorized,
          message: "Super admin access required",
          status: "error",
        };
      }

      const accessToken = app.jwt.sign({
        id: admin.id,
        userType: "User",
        tenant_id: admin.tenant_id,
        role: admin.role,
      });

      const newRefreshToken = app.jwt.sign(
        { id: admin.id, userType: "refresh_token" },
        { expiresIn: "7d" }
      );

      await service.rotateRefreshToken(refreshToken, newRefreshToken);

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.OPERATION_SUCCESSFUL,
        data: { accessToken, refreshToken: newRefreshToken },
      });
    },

    logout: async (request: any, reply: any) => {
      const { refreshToken } = request.body;
      await service.deleteRefreshToken(refreshToken);
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: "Logged out successfully",
      });
    },

    getOverview: async (_request: any, reply: any) => {
      const overview = await service.getOverview();
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: overview,
      });
    },

    listTenants: async (request: any, reply: any) => {
      const result = await service.listTenants(pagination(request));
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: result,
      });
    },

    createTenant: async (request: any, reply: any) => {
      const { name, domain } = request.body;

      const existing = await service.prisma.tenant.findUnique({ where: { domain } });
      if (existing) {
        throw {
          statusCode: StatusCode.ClientErrorBadRequest,
          message: "A tenant with this domain already exists",
          code: CASErrorCode.DUPLICATE_FIELD,
          status: "error",
        };
      }

      const tenant = await service.createTenant({
        name,
        domain,
        apiKey: `cas_key_${generateApiKey()}`,
      });

      await sendTenantWelcomeEmail({
        apiKey: tenant.apiKey,
        domain: tenant.domain,
        email: "platform@mainheart.co",
        name: name,
        tenantName: tenant.name,
      });

      return reply.status(StatusCode.SuccessCreated).send({
        status: "success",
        code: CASSuccessCode.DATA_CREATED,
        message: CASSuccessMessage.DATA_CREATED,
        data: tenant,
      });
    },

    getTenantById: async (request: any, reply: any) => {
      const { id } = request.params;
      const tenant = await service.getTenantById(id);
      if (!tenant) {
        return reply.status(StatusCode.ClientErrorNotFound).send({
          status: "error",
          message: "Tenant not found",
        });
      }
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: tenant,
      });
    },

    updateTenantStatus: async (request: any, reply: any) => {
      const { id } = request.params;
      const { status } = request.body;
      await service.updateTenantStatus(id, status);
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: "Tenant status updated",
      });
    },

    deleteTenant: async (request: any, reply: any) => {
      const { id } = request.params;
      try {
        await service.deleteTenant(id);
      } catch {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: "Cannot delete tenant (it may still have related data)",
        });
      }
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: "Tenant deleted",
      });
    },

    impersenate: async (request: any, reply: any) => {
      const { id } = request.params;
      const tenant = await service.getTenantById(id);
      if (!tenant) {
        return reply.status(StatusCode.ClientErrorNotFound).send({
          status: "error",
          message: "Tenant not found",
        });
      }
      const owner = await service.getTenantOwner(id);
      if (!owner) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: "Tenant has no owner yet",
        });
      }

      const accessToken = app.jwt.sign({
        id: owner.id,
        userType: "User",
        tenant_id: tenant.id,
        role: "OWNER",
        impersonated: true,
      });

      const refreshToken = app.jwt.sign(
        { id: owner.id, userType: "refresh_token" },
        { expiresIn: "1h" }
      );

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: "Impersonation token issued",
        data: {
          accessToken,
          refreshToken,
          apiKey: tenant.apiKey,
          tenant: { id: tenant.id, name: tenant.name, domain: tenant.domain },
        },
      });
    },

    listTenantUsers: async (request: any, reply: any) => {
      const { id } = request.params;
      const result = await service.listTenantUsers(id, pagination(request), pagination(request).filter);
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: result,
      });
    },

    listTenantProducts: async (request: any, reply: any) => {
      const { id } = request.params;
      const result = await service.listTenantProducts(id, pagination(request), pagination(request).filter);
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: result,
      });
    },

    listTenantOrders: async (request: any, reply: any) => {
      const { id } = request.params;
      const result = await service.listTenantOrders(id, pagination(request));
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: result,
      });
    },

    listTenantPayments: async (request: any, reply: any) => {
      const { id } = request.params;
      const result = await service.listTenantPayments(id, pagination(request));
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: result,
      });
    },

    listTenantAuditLogs: async (request: any, reply: any) => {
      const { id } = request.params;
      const result = await service.listTenantAuditLogs(id, pagination(request), pagination(request).filter);
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: result,
      });
    },

    listUsers: async (request: any, reply: any) => {
      const result = await service.listUsers(pagination(request));
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: result,
      });
    },

    updateUserRole: async (request: any, reply: any) => {
      const { id } = request.params;
      const { role } = request.body;
      try {
        await service.updateUserRole(id, role);
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: "User role updated",
      });
    },

    deleteUser: async (request: any, reply: any) => {
      const { id } = request.params;
      try {
        await service.deleteUser(id);
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: "User deleted",
      });
    },

    listAuditLogs: async (request: any, reply: any) => {
      const result = await service.listAuditLogs(pagination(request));
      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: result,
      });
    },
  };
};
