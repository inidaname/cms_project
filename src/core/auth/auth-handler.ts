import StatusCode from "status-code-enum";
import {
  CASErrorMessage,
  CASSuccessCode,
  CASSuccessMessage,
} from "../../utils/enums";
import { AuthService } from "./auth-service";

export const authHandler: Authhandler = (app) => {
  const service = new AuthService(app.prisma);
  return {
    login: async (request, reply) => {
      const { id } = request.tenant!;
      const { email, password } = request.body;
      if (!email || !password) {
        throw {
          statusCode: 401,
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

      return reply.status(StatusCode.SuccessCreated).send({
        status: "success",
        code: CASSuccessCode.DATA_CREATED,
        message: CASSuccessMessage.DATA_CREATED,
        token,
      });
    },
  };
};
