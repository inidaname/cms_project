import StatusCode from "status-code-enum";
import { SalesService } from "./sales-service";
import { CASSuccessCode, CASSuccessMessage } from "../../utils/enums";

export const salesHandler: SalesHandler = (app) => {
  const service = new SalesService(app.prisma);
  return {
    initCheckout: async (request, reply) => {
      if (!request.tenant) {
        throw {};
      }

      const { body, tenant: { id: tenant_id }, user: { id } } = request;

      const sales = await service.checkout({ ...body, tenant_id, user_id: id });

      return reply.status(StatusCode.SuccessCreated).send({
        message: CASSuccessMessage.DATA_CREATED,
        code: CASSuccessCode.DATA_CREATED,
        status: "success",
        data: sales,
      });
    },
    getCheckoutById: async (request, reply) => {
      if (!request.tenant) {
        throw {};
      }

      const {
        tenant: { id: tenant_id },
        user: { id },
        params: { checkout_id },
      } = request;

      const sale = await service.getCheckoutById(checkout_id, tenant_id, id);

      return reply.status(StatusCode.SuccessCreated).send({
        message: CASSuccessMessage.DATA_RETRIEVED,
        code: CASSuccessCode.DATA_RETRIEVED,
        status: "success",
        data: sale,
      });
    },
    getCheckouts: async (request, reply) => {
      if (!request.tenant) {
        throw {};
      }

      const {
        tenant: { id: tenant_id },
        user: { id },
        query: { limit, page },
      } = request;

      const sales = await service.getAllSales(tenant_id, page, limit, id);

      return reply.status(StatusCode.SuccessCreated).send({
        message: CASSuccessMessage.DATA_RETRIEVED,
        code: CASSuccessCode.DATA_RETRIEVED,
        status: "success",
        data: sales,
      });
    },
  };
};
