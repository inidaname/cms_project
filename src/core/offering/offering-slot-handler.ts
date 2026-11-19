// Offering-slot handler (prompt 9, phase 9c). Thin handlers.
import StatusCode from "status-code-enum";
import { OfferingSlotService } from "./offering-slot-service";

const errorResponse = (reply: any, error: any) => {
  return reply.status(error?.statusCode ?? StatusCode.ClientErrorBadRequest).send({
    status: "error",
    message: error?.message ?? "Operation failed",
    code: error?.code ?? "INVALID_FIELD_FORMAT",
  });
};

export const offeringSlotHandler: any = (app: any) => {
  const service = new OfferingSlotService(app.prisma);

  return {
    createSlot: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      try {
        const created = await service.createSlot(
          request.tenant.id,
          request.params.product_id,
          request.body,
        );
        return reply.status(StatusCode.SuccessCreated).send({ status: "success", data: created });
      } catch (error: any) {
        return errorResponse(reply, error);
      }
    },

    listSlots: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      const slots = await service.listSlots(
        request.tenant.id,
        request.params.product_id,
        request.query?.upcoming === "true",
      );
      return reply.status(StatusCode.SuccessOK).send({ status: "success", data: slots });
    },

    updateSlot: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      try {
        const result = await service.updateSlot(request.params.id, request.tenant.id, request.body);
        if (result.count === 0) {
          return reply.status(StatusCode.ClientErrorNotFound).send({ status: "error", message: "Slot not found" });
        }
        return reply.status(StatusCode.SuccessOK).send({ status: "success", message: "Slot updated" });
      } catch (error: any) {
        return errorResponse(reply, error);
      }
    },

    deleteSlot: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({ status: "error", message: "Unauthorized" });
      }
      const result = await service.deleteSlot(request.params.id, request.tenant.id);
      if (result.count === 0) {
        return reply.status(StatusCode.ClientErrorNotFound).send({ status: "error", message: "Slot not found" });
      }
      return reply.status(StatusCode.SuccessOK).send({ status: "success", message: "Slot deleted" });
    },
  };
};
