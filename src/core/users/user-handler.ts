import StatusCode from "status-code-enum";
import { UserService } from "./user-service";
import {
  CASErrorCode,
  CASErrorMessage,
  CASSuccessCode,
  CASSuccessMessage,
} from "../../utils/enums";

export const userHandler: UserHandler = (app) => {
  const service = new UserService(app.prisma);
  return {
    countTenantUsers: async (request, reply) => {
      const { id } = request.tenant!;
      const users = await service.countTenantsUsers(id);

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.DATA_RETRIEVED,
        data: users,
        message: CASSuccessMessage.DATA_RETRIEVED,
      });
    },

    deleteUser: async (request, reply) => {
      const { id } = request.tenant!;
      const { user_id } = request.params;
      const user = await service.deleteUser(user_id, id);

      if (!user) {
        throw {
          statusCode: StatusCode.ClientErrorNotFound,
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
        };
      }

      return reply.status(StatusCode.SuccessNoContent).send({
        data: !!user,
        status: "success",
        code: CASSuccessCode.DATA_DELETED,
        message: CASSuccessMessage.DATA_DELETED,
      });
    },

    getUserById: async (request, reply) => {
      const { id } = request.tenant!;
      const { user_id } = request.params;
      const user = await service.getUserById(user_id, id);

      if (!user) {
        throw {
          statusCode: StatusCode.ClientErrorNotFound,
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
        };
      }

      return reply.status(StatusCode.SuccessOK).send({
        data: user,
        status: "success",
        code: CASSuccessCode.DATA_DELETED,
        message: CASSuccessMessage.DATA_DELETED,
      });
    },

    getUsersByTenantId: async (request, reply) => {
      const { id } = request.tenant!;
      const { id: user_id } = request.user;
      const { filter, limit, page } = request.query;

      const user = await service.getUserById(user_id, id);

      if (!user || user.role === "USER") {
        throw {
          statusCode: StatusCode.ClientErrorUnauthorized,
          message: CASErrorMessage.UNAUTHORIZED_ACCESS,
          code: CASErrorCode.UNAUTHORIZED_ACCESS,
          status: "error",
        };
      }

      const users = await service.getAllUsers(page, limit, filter, id);
      return reply.status(StatusCode.SuccessOK).send({
        data: users,
        status: "success",
        code: CASSuccessCode.DATA_DELETED,
        message: CASSuccessMessage.DATA_DELETED,
      });
    },

    updateUser: async (request, reply) => {
      const { id } = request.tenant!;
      const { user_id } = request.params;
      const body = request.body;
      const user = await service.getUserById(user_id, id);

      if (!user) {
        throw {
          statusCode: StatusCode.ClientErrorNotFound,
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
        };
      }

      const update = await service.updateUser(body, user_id);

      return reply.status(StatusCode.SuccessOK).send({
        data: update,
        status: "success",
        code: CASSuccessCode.DATA_DELETED,
        message: CASSuccessMessage.DATA_DELETED,
      });
    },
  };
};
