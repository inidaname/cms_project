// Offering-domain configuration handler (prompt 9, phase 9b).
// Thin handlers: tenant from request.tenant, errors mapped to status codes.
import StatusCode from "status-code-enum";
import { OfferingService } from "./offering-service";
import { CASErrorCode } from "../../utils/enums";

const notFoundOrError = (reply: any, error: any) => {
  return reply.status(error?.statusCode ?? StatusCode.ClientErrorBadRequest).send({
    status: "error",
    message: error?.message ?? "Operation failed",
    code: error?.code ?? CASErrorCode.INVALID_FIELD_FORMAT,
  });
};

export const offeringHandler: any = (app: any) => {
  const service = new OfferingService(app.prisma);

  return {
    createOfferingType: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      try {
        const created = await service.createOfferingType(request.tenant.id, request.body);
        return reply.status(StatusCode.SuccessCreated).send({ status: "success", data: created });
      } catch (error: any) {
        return notFoundOrError(reply, error);
      }
    },

    listOfferingTypes: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      try {
        const types = await service.listOfferingTypes(request.tenant.id);
        return reply.status(StatusCode.SuccessOK).send({ status: "success", data: types });
      } catch (error: any) {
        return notFoundOrError(reply, error);
      }
    },

    getOfferingType: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      const found = await service.getOfferingType(request.params.id, request.tenant.id);
      if (!found) {
        return reply.status(StatusCode.ClientErrorNotFound).send({ status: "error", message: "Offering type not found" });
      }
      return reply.status(StatusCode.SuccessOK).send({ status: "success", data: found });
    },

    updateOfferingType: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      try {
        const result = await service.updateOfferingType(request.params.id, request.tenant.id, request.body);
        if (result.count === 0) {
          return reply.status(StatusCode.ClientErrorNotFound).send({ status: "error", message: "Offering type not found" });
        }
        return reply.status(StatusCode.SuccessOK).send({ status: "success", message: "Offering type updated" });
      } catch (error: any) {
        return notFoundOrError(reply, error);
      }
    },

    deleteOfferingType: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      const result = await service.deleteOfferingType(request.params.id, request.tenant.id);
      if (result.count === 0) {
        return reply.status(StatusCode.ClientErrorNotFound).send({ status: "error", message: "Offering type not found" });
      }
      return reply.status(StatusCode.SuccessOK).send({ status: "success", message: "Offering type deleted" });
    },

    createOptionGroup: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      try {
        const created = await service.createOptionGroup(
          request.tenant.id,
          request.params.product_id,
          request.body,
        );
        return reply.status(StatusCode.SuccessCreated).send({ status: "success", data: created });
      } catch (error: any) {
        return notFoundOrError(reply, error);
      }
    },

    listOptionGroups: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      const groups = await service.listOptionGroupsForProduct(
        request.tenant.id,
        request.params.product_id,
      );
      return reply.status(StatusCode.SuccessOK).send({ status: "success", data: groups });
    },

    updateOptionGroup: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      try {
        const result = await service.updateOptionGroup(request.params.id, request.tenant.id, request.body);
        if (result.count === 0) {
          return reply.status(StatusCode.ClientErrorNotFound).send({ status: "error", message: "Option group not found" });
        }
        return reply.status(StatusCode.SuccessOK).send({ status: "success", message: "Option group updated" });
      } catch (error: any) {
        return notFoundOrError(reply, error);
      }
    },

    deleteOptionGroup: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      const result = await service.deleteOptionGroup(request.params.id, request.tenant.id);
      if (result.count === 0) {
        return reply.status(StatusCode.ClientErrorNotFound).send({ status: "error", message: "Option group not found" });
      }
      return reply.status(StatusCode.SuccessOK).send({ status: "success", message: "Option group deleted" });
    },

    addOptionChoice: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      try {
        const created = await service.addOptionChoice(
          request.tenant.id,
          request.params.group_id,
          request.body,
        );
        return reply.status(StatusCode.SuccessCreated).send({ status: "success", data: created });
      } catch (error: any) {
        return notFoundOrError(reply, error);
      }
    },

    updateOptionChoice: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      try {
        const result = await service.updateOptionChoice(request.params.id, request.tenant.id, request.body);
        if (result.count === 0) {
          return reply.status(StatusCode.ClientErrorNotFound).send({ status: "error", message: "Option choice not found" });
        }
        return reply.status(StatusCode.SuccessOK).send({ status: "success", message: "Option choice updated" });
      } catch (error: any) {
        return notFoundOrError(reply, error);
      }
    },

    deleteOptionChoice: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      const result = await service.deleteOptionChoice(request.params.id, request.tenant.id);
      if (result.count === 0) {
        return reply.status(StatusCode.ClientErrorNotFound).send({ status: "error", message: "Option choice not found" });
      }
      return reply.status(StatusCode.SuccessOK).send({ status: "success", message: "Option choice deleted" });
    },
  };
};
