import { TenantService } from "./tenant-service";
import { generateApiKey } from "../../helpers/generate_apikey";
import { UserService } from "../users/user-service";
import StatusCode from "status-code-enum";
import {
  CASErrorCode,
  CASErrorMessage,
  CASSuccessCode,
  CASSuccessMessage,
} from "../../utils/enums";
import { sendTenantWelcomeEmail } from "../../helpers/content";
export const tenantHandler: TenantHandler = (app) => {
  const service = new TenantService(app.prisma);
  const userService = new UserService(app.prisma);

  return {
    getTenant: async (request, reply) => {
      const { id } = request.tenant!;
      const tenant = await service.getTenantById(id);

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.DATA_RETRIEVED,
        data: tenant,
        message: CASSuccessMessage.DATA_RETRIEVED,
      });
    },
    updateTenant: async (request, reply) => {
      const { id: tenant_id } = request.tenant!;
      const { id } = request.user;

      const user = await userService.getUserById(id, tenant_id);

      if (!user || user.tenant_id !== tenant_id || user.role === "USER") {
        throw {
          status: "error",
          message: CASErrorMessage.UNAUTHORIZED_ACCESS,
          code: CASErrorCode.UNAUTHORIZED_ACCESS,
          statusCode: StatusCode.ClientErrorUnauthorized,
        };
      }

      const tenant = await service.editTenant(tenant_id, request.body);

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.DATA_UPDATED,
        data: tenant,
        message: CASSuccessMessage.DATA_UPDATED,
      });
    },
    registerTenant: async (request, reply) => {
      const body = request.body;
      const { apiKey, id: tenant_id } = request.tenant!;
      if (apiKey !== process.env.MASTER_APIKEY) {
        throw {
          message: "",
          statusCode: StatusCode.ClientErrorBadRequest,
        };
      }

      const { id } = request.user;
      const user = await userService.getUserById(id, tenant_id);

      if (!user) {
        throw {};
      }

      const tenant = await service.createTenant({
        apiKey: `cas_key_${generateApiKey()}`,
        ...body,
      });

      await sendTenantWelcomeEmail({
        apiKey: tenant.apiKey,
        domain: tenant.domain,
        email: user.email,
        name: user.name ?? "",
        tenantName: tenant.name,
      });

      await userService.createUser({
        agreed: true,
        email: user?.email,
        name: user?.name,
        password: user.password,
        phone: user.phone,
        role: "OWNER",
        tenant_id: tenant.id,
      });

      return reply.status(StatusCode.SuccessCreated).send({
        status: "success",
        code: CASSuccessCode.DATA_CREATED,
        data: tenant,
        message: CASSuccessMessage.DATA_CREATED,
      });
    },
    onboardTenant: async (request, reply) => {
      const { storeName, email, password, domain, name, phone } = request.body;

      const normalizedDomain = (domain ?? storeName)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const existingTenant = await service.findTenantByDomain(normalizedDomain);

      if (existingTenant) {
        throw {
          status: "error",
          message: "A store with this domain already exists",
          code: CASErrorCode.DUPLICATE_FIELD,
          statusCode: StatusCode.ClientErrorBadRequest,
        };
      }

      const tenant = await service.createTenant({
        name: storeName,
        domain: normalizedDomain,
        apiKey: `cas_key_${generateApiKey()}`,
        status: "ACTIVE",
      } as TenantInput);

      const hashedPassword = await app.bcrypt.hash(password, 10);

      const user = await userService.createUser({
        agreed: true,
        email,
        name: name ?? storeName,
        phone: phone ?? null,
        password: hashedPassword,
        role: "OWNER",
        tenant_id: tenant.id,
      } as UserInput);

      await sendTenantWelcomeEmail({
        apiKey: tenant.apiKey,
        domain: tenant.domain,
        email: user.email,
        name: user.name ?? "",
        tenantName: tenant.name,
      });

      const accessToken = app.jwt.sign({
        id: user.id,
        userType: "User",
        tenant_id: tenant.id,
        role: user.role,
      });

      const refreshToken = app.jwt.sign(
        {
          id: user.id,
          userType: "refresh_token",
        },
        { expiresIn: "7d" },
      );

      return reply.status(StatusCode.SuccessCreated).send({
        status: "success",
        code: CASSuccessCode.DATA_CREATED,
        message: CASSuccessMessage.DATA_CREATED,
        data: {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            domain: tenant.domain,
            apiKey: tenant.apiKey,
          },
          user,
          accessToken,
          refreshToken,
        },
      });
    },
  };
};
