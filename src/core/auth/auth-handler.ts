import StatusCode from "status-code-enum";
import crypto from "crypto";
import {
  CASErrorCode,
  CASErrorMessage,
  CASSuccessCode,
  CASSuccessMessage,
} from "../../utils/enums";
import { AuthService } from "./auth-service";

export const authHandler: Authhandler = (app) => {
  const service = new AuthService(app.prisma);
  return {
    logout: async (request, reply) => {
      const token = request.body.token;

      if (!token) {
        throw {
          message: "Missing refresh token",
          statusCode: StatusCode.ClientErrorBadRequest,
          status: "error",
        };
      }

      await service.deleteRefreshToken(token);

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

      const token = app.jwt.sign({ id, userType: "User" });

      const newRefreshToken = app.jwt.sign({
        id,
        userType: "refresh_token",
      }, { expiresIn: "7d" });

      await service.updateRefreshToken(refreshToken, newRefreshToken);

      return reply.status(StatusCode.SuccessOK).send({
        code: CASSuccessCode.OPERATION_SUCCESSFUL,
        message: CASSuccessMessage.OPERATION_SUCCESSFUL,
        token,
        status: "success",
      });
    },
    resetPassword: async (req, reply) => {
      const { token, password } = req.body;

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const stored = await service.getForgetPasswordToken(tokenHash);

      if (
        !stored ||
        stored.used ||
        stored.expiresAt < new Date()
      ) {
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

      return reply.status(StatusCode.SuccessOK);
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
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest(
        "hex",
      );

      await service.deleteForgetPassword(user.id);

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      await service.initiateForgotPassword({
        user_id: user.id,
        expiresAt,
        tokenHash,
        tenant_id: id,
        used: false,
      });

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

      if (!getUser || !await app.bcrypt.compare(password, getUser.password)) {
        throw {
          statusCode: 401,
          message: CASErrorMessage.UNAUTHORIZED_ACCESS,
          status: "error",
        };
      }

      const token = app.jwt.sign({ id: getUser.id, userType: "User" });

      const refreshToken = app.jwt.sign({
        id: getUser.id,
        userType: "refresh_token",
      }, { expiresIn: "7d" });

      await service.addRefreshToken({
        token: refreshToken,
        userId: getUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
      });

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.LOGIN_SUCCESSFUL,
        message: CASSuccessMessage.LOGIN_SUCCESSFUL,
        token,
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

      const user = await service.user.createUser({
        ...rest,
        tenant_id,
        email,
        phone,
        password: hashedPassword,
      });

      const token = app.jwt.sign({ id: user.id, userType: "User" });

      const refreshToken = app.jwt.sign({
        id: user.id,
        userType: "refresh_token",
      }, { expiresIn: "7d" });

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
        token,
      });
    },
  };
};
