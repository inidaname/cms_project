import StatusCode from "status-code-enum";
import { CartService } from "./cart-service";
import { CASSuccessCode, CASSuccessMessage } from "../../utils/enums";

export const cartsHandler: CartsHandler = (app) => {
  const service = new CartService(app.prisma);

  return {
    addItmesToCart: async (request, reply) => {
      if (!request.tenant) {
        return;
      }
      const { id: tenant_id } = request.tenant;
      const { id } = request.user;
      const { cart_id } = request.params;
      const body = request.body;

      const addedItems = await service.addItemToCart(
        id,
        tenant_id,
        body,
        cart_id,
      );
      return reply.status(StatusCode.SuccessCreated).send({
        message: CASSuccessMessage.DATA_CREATED,
        code: CASSuccessCode.DATA_CREATED,
        status: "success",
        data: addedItems,
      });
    },
    deleteCart: async (request, reply) => {
      if (!request.tenant) {
        return;
      }
      const { tenant: { id: tenant_id }, params: { cart_id }, user: { id } } =
        request;

      const deleteCart = await service.deleteCart(cart_id, tenant_id, id);

      return reply.status(StatusCode.SuccessResetContent).send({
        code: CASSuccessCode.DATA_DELETED,
        message: CASSuccessMessage.DATA_DELETED,
        data: deleteCart,
        status: "success",
      });
    },
    startCart: async function (request, reply) {
      if (!request.tenant) {
        return;
      }
      const { tenant: { id: tenant_id }, user: { id } } = request;
      const cart = await service.createCart({
        tenant_id,
        user_id: id,
        totalValue: 0,
      });

      return reply.status(StatusCode.SuccessCreated).send({
        data: cart,
        status: "success",
        code: CASSuccessCode.DATA_CREATED,
        message: CASSuccessMessage.DATA_CREATED,
      });
    },
    editCartById: async (request, reply) => {
      if (!request.tenant) {
        return;
      }
      const {
        tenant: { id: tenant_id },
        params: { cart_id },
        user: { id },
        body,
      } = request;

      const cart = await service.editCart(cart_id!, id, tenant_id, body);

      return reply.status(StatusCode.SuccessResetContent).send({
        data: cart,
        message: CASSuccessMessage.DATA_UPDATED,
        code: CASSuccessCode.DATA_UPDATED,
        status: "success",
      });
    },
    getCartById: async (request, reply) => {
      if (!request.tenant) {
        throw {};
      }
      const {
        tenant: { id: tenant_id },
        params: { cart_id },
        user: { id },
      } = request;

      const cart = !cart_id
        ? await service.getActiveCart(id, tenant_id)
        : await service.getCartById(cart_id, tenant_id);

      return reply.status(StatusCode.SuccessOK).send({
        data: cart,
        message: CASSuccessMessage.DATA_RETRIEVED,
        code: CASSuccessCode.DATA_RETRIEVED,
        status: "success",
      });
    },
    editItemQuantity: async (request, reply) => {
      if (!request.tenant) {
        throw {};
      }
      const {
        tenant: { id: tenant_id },
        params: { item_id },
        user: { id },
        body: { quantity },
      } = request;

      const item = await service.editItemQuantity(
        item_id,
        id,
        tenant_id,
        Number.parseInt(quantity),
      );

      if (!item) {
        throw {};
      }

      return reply.status(StatusCode.SuccessResetContent).send({
        message: CASSuccessMessage.DATA_UPDATED,
        code: CASSuccessCode.DATA_UPDATED,
        data: item,
        status: "success",
      });
    },
    getCartItems: async (request, reply) => {
      if (!request.tenant) {
        throw {};
      }
      const {
        tenant: { id: tenant_id },
        params: { cart_id },
      } = request;

      const items = await service.getCartItems(cart_id, tenant_id);

      return reply.status(StatusCode.SuccessOK).send({
        message: CASSuccessMessage.DATA_RETRIEVED,
        code: CASSuccessCode.DATA_RETRIEVED,
        data: items,
        status: "success",
      });
    },
    getCarts: async (request, reply) => {
    },
    getItmeById: async (request, reply) => {
    },
    removeItemById: async (request, reply) => {
    },
  };
};
