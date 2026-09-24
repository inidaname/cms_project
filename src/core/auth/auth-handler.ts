import StatusCode from "status-code-enum";
import crypto from "crypto";
import {
  CASErrorCode,
  CASErrorMessage,
  CASSuccessCode,
  CASSuccessMessage,
} from "../../utils/enums";
import { AuthService } from "./auth-service";
import {
  sendAuthSecurityEmail,
  sendPasswordResetConfirmationEmail,
  sendPasswordResetEmail,
  sendUserWelcomeEmail,
} from "../../helpers/content";

const getRequestContext = (request: any) => ({
  ipAddress:
    (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    request.ip ||
    "unknown",
  userAgent: (request.headers["user-agent"] as string | undefined) || "unknown",
});

const sendAuthEmailBestEffort = async (
  request: any,
  event: string,
  userId: string,
  send: () => Promise<unknown>,
) => {
  try {
    const result = await send();
    if (result && typeof result === "object" && "error" in result && result.error) {
      request.log.error({ event, userId, error: result.error }, "Auth email delivery failed");
    }
  } catch (error) {
    request.log.error({ event, userId, error }, "Auth email delivery failed");
  }
};

export const authHandler: Authhandler = (app) => {
  const service = new AuthService(app.prisma);
  return {
    logout: async (request, reply) => {
      const token = request.body.refreshToken;

      if (!token) {
        throw {
          message: "Missing refresh token",
          statusCode: StatusCode.ClientErrorBadRequest,
          status: "error",
        };
      }

      const user = await service.user.getUserByIdOnly(request.user.id);
      if (!user) {
        throw {
          statusCode: StatusCode.ClientErrorUnauthorized,
          message: "User no longer exists",
          status: "error",
        };
      }
      const context = getRequestContext(request);
      const isNewContext = !(await service.hasSecurityContext({
        user_id: user.id,
        ...context,
      }));
      await service.deleteRefreshToken(token);
      await service.recordSecurityEvent({
        tenant_id: user.tenant_id,
        user_id: user.id,
        action: "LOGOUT",
        ...context,
      });
      if (isNewContext) {
        await sendAuthEmailBestEffort(request, "logout", user.id, () =>
          sendAuthSecurityEmail({
            email: user.email,
            name: user.name ?? "",
            tenantName: request.tenant?.name ?? "your workspace",
            action: "logout",
            ...context,
          }),
        );
      }

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        data: null,
        message: CASSuccessMessage.LOGOUT_SUCCESSFUL,
        code: CASSuccessCode.LOGOUT_SUCCESSFUL,
      });
    },
    refreshToken: async (request, reply) => {
      const refreshToken = request.body.refreshToken;
      const { userType, id } = app.jwt.verify<{ userType: string; id: string }>(
        refreshToken,
      );
      if (userType !== "refresh_token") {
        throw {
          statusCode: StatusCode.ClientErrorUnauthorized,
          message: "Invalid token type",
          status: "error",
        };
      }

      const stored = await service.getRefreshToken(refreshToken);

      if (!stored || stored.expiresAt < new Date()) {
        throw {
          message: "Invalid or expired refresh token",
          statusCode: StatusCode.ClientErrorUnauthorized,
          status: "error",
        };
      }

      const user = await service.user.getUserByIdOnly(id);

      if (!user) {
        throw {
          statusCode: StatusCode.ClientErrorUnauthorized,
          message: "User no longer exists",
          status: "error",
        };
      }

      const token = app.jwt.sign({
        id: user.id,
        userType: "User",
        tenant_id: user.tenant_id,
        role: user.role,
      });

      const newRefreshToken = app.jwt.sign(
        {
          id: user.id,
          userType: "refresh_token",
        },
        { expiresIn: "7d" },
      );

      await service.updateRefreshToken(refreshToken, newRefreshToken);

      return reply.status(StatusCode.SuccessOK).send({
        code: CASSuccessCode.OPERATION_SUCCESSFUL,
        message: CASSuccessMessage.OPERATION_SUCCESSFUL,
        data: { accessToken: token, refreshToken: newRefreshToken },
        status: "success",
      });
    },
    resetPassword: async (req, reply) => {
      const { token, password } = req.body;

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const stored = await service.getForgetPasswordToken(tokenHash);

      if (!stored || stored.used || stored.expiresAt < new Date()) {
        throw {
          statusCode: StatusCode.ClientErrorBadRequest,
          message: "Invalid or expired token",
          status: "error",
        };
      }

      const hashedPassword = await app.bcrypt.hash(password, 10);

      await service.updatePassword({
        hashedPassword,
        store_id: stored.id,
        user_id: stored.user_id,
      });
      await sendAuthEmailBestEffort(req, "password-reset-confirmation", stored.user_id, () =>
        sendPasswordResetConfirmationEmail({
          email: stored.user.email,
          name: stored.user.name ?? "",
          tenantName: req.tenant?.name ?? "your workspace",
        }),
      );

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        data: null,
        message: CASSuccessMessage.OPERATION_SUCCESSFUL,
        code: CASSuccessCode.OPERATION_SUCCESSFUL,
      });
    },
    forgotPassword: async (request, reply) => {
      const { id } = request.tenant!;
      const { email, phone } = request.body;

      const detail = email ? email : phone;

      if (!detail) {
        throw {
          statusCode: StatusCode.ClientErrorBadRequest,
          message: CASErrorMessage.MISSING_REQUIRED_FIELD,
          status: "error",
          code: CASErrorCode.MISSING_REQUIRED_FIELD,
        };
      }

      const user = await service.user.getUserByEmailOrPhone(detail, id);

      if (!user) {
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          code: CASSuccessCode.DATA_CREATED,
          message: CASSuccessMessage.DATA_CREATED,
          data: null,
        });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      await service.deleteForgetPassword(user.id);

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      await service.initiateForgotPassword({
        user_id: user.id,
        expiresAt,
        tokenHash,
        tenant_id: id,
        used: false,
      });
      await sendAuthEmailBestEffort(request, "password-reset-request", user.id, () =>
        sendPasswordResetEmail({
          email: user.email,
          name: user.name ?? "",
          tenantName: request.tenant?.name ?? "your workspace",
          token: rawToken,
          expiresAt,
        }),
      );

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.DATA_CREATED,
        message: CASSuccessMessage.DATA_CREATED,
        data: null,
      });
    },
    login: async (request, reply) => {
      const { id } = request.tenant!;
      const { email, password } = request.body;
      if (!email || !password) {
        throw {
          statusCode: StatusCode.ClientErrorUnauthorized,
          message: CASErrorMessage.UNAUTHORIZED_ACCESS,
          status: "error",
        };
      }

      const getUser = await service.user.getUserByEmailOrPhone(email, id);

      if (!getUser || !(await app.bcrypt.compare(password, getUser.password))) {
        throw {
          statusCode: 401,
          message: CASErrorMessage.UNAUTHORIZED_ACCESS,
          status: "error",
        };
      }

      const token = app.jwt.sign({
        id: getUser.id,
        userType: "User",
        tenant_id: getUser.tenant_id,
        role: getUser.role,
      });

      const refreshToken = app.jwt.sign(
        {
          id: getUser.id,
          userType: "refresh_token",
        },
        { expiresIn: "7d" },
      );

      await service.addRefreshToken({
        token: refreshToken,
        userId: getUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
      });
      const context = getRequestContext(request);
      const isNewContext = !(await service.hasSecurityContext({
        user_id: getUser.id,
        ...context,
      }));
      await service.recordSecurityEvent({
        tenant_id: getUser.tenant_id,
        user_id: getUser.id,
        action: "LOGIN",
        ...context,
      });
      if (isNewContext) {
        await sendAuthEmailBestEffort(request, "login", getUser.id, () =>
          sendAuthSecurityEmail({
            email: getUser.email,
            name: getUser.name ?? "",
            tenantName: request.tenant?.name ?? "your workspace",
            action: "login",
            ...context,
          }),
        );
      }

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.LOGIN_SUCCESSFUL,
        message: CASSuccessMessage.LOGIN_SUCCESSFUL,
        data: { accessToken: token, refreshToken, user: getUser },
      });
    },
    register: async (request, reply) => {
      const { id: tenant_id } = request.tenant!;
      const { password, email, phone, ...rest } = request.body;

      const [existingEmailUser, existingPhoneUser] = await Promise.all([
        service.user.getUserByEmailOrPhone(email, tenant_id),
        phone ? service.user.getUserByEmailOrPhone(phone, tenant_id) : null,
      ]);

      if (existingEmailUser) {
        throw {
          statusCode: 400,
          message: CASErrorMessage.DUPLICATE_EMAIL,
          status: "error",
        };
      }

      if (existingPhoneUser) {
        throw {
          statusCode: 400,
          message: CASErrorMessage.DUPLICATE_PHONE,
          status: "error",
        };
      }

      const hashedPassword = await app.bcrypt.hash(password, 10);

      const userCount = await service.user.countTenantsUsers(tenant_id);

      const user = await service.user.createUser({
        ...rest,
        tenant_id,
        email,
        phone,
        role: userCount === 0 ? "OWNER" : "USER",
        password: hashedPassword,
      });

      await sendAuthEmailBestEffort(request, "registration-welcome", user.id, () =>
        sendUserWelcomeEmail({
          name: user.name ?? "",
          email: user.email,
          tenantName: user.tenant.name,
        }),
      );

      const token = app.jwt.sign({
        id: user.id,
        userType: "User",
        tenant_id,
        role: user.role,
      });

      const refreshToken = app.jwt.sign(
        {
          id: user.id,
          userType: "refresh_token",
        },
        { expiresIn: "7d" },
      );

      await service.addRefreshToken({
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
      });

      return reply.status(StatusCode.SuccessCreated).send({
        status: "success",
        code: CASSuccessCode.DATA_CREATED,
        message: CASSuccessMessage.DATA_CREATED,
        data: { accessToken: token, refreshToken, user },
      });
    },
  };
};
