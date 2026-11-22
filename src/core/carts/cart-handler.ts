import StatusCode from "status-code-enum";
import { CartService } from "./cart-service";
import { CASSuccessCode, CASSuccessMessage } from "../../utils/enums";

export const cartsHandler: CartsHandler = (app) => {
  const service = new CartService(app.prisma);

  return {
    updateOrderDetails: async (request, reply) => {
      if (!request.tenant) {
        return;
      }
      const {
        tenant: { id: tenant_id },
        params: { cart_id },
        user: { id },
        body,
      } = request;

      const cart = await service.editCart(cart_id, id, tenant_id, body);

      return reply.status(StatusCode.SuccessOK).send({
        data: cart,
        message: CASSuccessMessage.DATA_UPDATED,
        code: CASSuccessCode.DATA_UPDATED,
        status: "success",
      });
    },
    changeCartStatus: async (request, reply) => {
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

      return reply.status(StatusCode.SuccessOK).send({
        data: cart,
        message: CASSuccessMessage.DATA_UPDATED,
        code: CASSuccessCode.DATA_UPDATED,
        status: "success",
      });
    },
    addItmesToCart: async (request, reply) => {
      if (!request.tenant) {
        return;
      }
      const { id: tenant_id } = request.tenant;
      const { id } = request.user;
      const { cart_id } = request.params;
      // Clients may send a single item object or an array; normalize.
      const body = Array.isArray(request.body)
        ? request.body
        : [request.body];

      const addedItems = await service.addItemToCart(
        id,
        tenant_id,
        body,
        cart_id
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
      const {
        tenant: { id: tenant_id },
        params: { cart_id },
        user: { id },
      } = request;

      const deleteCart = await service.deleteCart(cart_id, tenant_id, id);

      return reply.status(StatusCode.SuccessOK).send({
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

      const {
        tenant: { id: tenant_id },
        user: { id },
        body,
      } = request;
      // Only server-derived ownership fields are authoritative; the body may
      // supply cart content fields only.
      const cart = await service.createCart({
        tenant_id,
        user_id: id,
        totalValue: 0,
        notes: body?.notes,
        recipientName: body?.recipientName,
        recipientPhone: body?.recipientPhone,
        deliveryAddress: body?.deliveryAddress,
        deliveryType: body?.deliveryType,
      });

      return reply.status(StatusCode.SuccessCreated).send({
        data: cart,
        status: "success",
        code: CASSuccessCode.DATA_CREATED,
        message: CASSuccessMessage.DATA_CREATED,
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
        body: { product_quantity },
      } = request;

      const item = await service.editItemQuantity(
        item_id,
        id,
        tenant_id,
        product_quantity
      );

      if (!item) {
        throw {};
      }

      return reply.status(StatusCode.SuccessOK).send({
        message: CASSuccessMessage.DATA_UPDATED,
        code: CASSuccessCode.DATA_UPDATED,
        data: item as any,
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

      // Schema declares data: cart# (cart with cartItems included)
      const cart = await service.getCartById(cart_id, tenant_id);

      return reply.status(StatusCode.SuccessOK).send({
        message: CASSuccessMessage.DATA_RETRIEVED,
        code: CASSuccessCode.DATA_RETRIEVED,
        data: cart as any,
        status: "success",
      });
    },
    getCarts: async (request, reply) => {
      if (!request.tenant) {
        throw {};
      }
      const {
        tenant: { id: tenant_id },
        user: { id },
      } = request;
      const page = Number(request.query?.page) || undefined;
      const limit = Number(request.query?.limit) || undefined;
      const filter = request.query?.filter;

      const carts = await service.getCarts(tenant_id, page, limit, filter, id);

      return reply.status(StatusCode.SuccessOK).send({
        status: "success",
        code: CASSuccessCode.DATA_RETRIEVED,
        message: CASSuccessMessage.DATA_RETRIEVED,
        data: carts,
      });
    },
    getItmeById: async (request, reply) => {
      if (!request.tenant) {
        throw {};
      }
      const {
        params: { item_id },
        tenant: { id: tenant_id },
        user: { id },
      } = request;

      const item = await service.getItemById(item_id, tenant_id, id);

      return reply.status(StatusCode.SuccessOK).send({
        data: item,
        status: "success",
        code: CASSuccessCode.DATA_RETRIEVED,
        message: CASSuccessMessage.DATA_RETRIEVED,
      });
    },
    removeItemById: async (request, reply) => {
      if (!request.tenant) {
        throw {};
      }

      const {
        params: { item_id },
        tenant: { id: tenant_id },
        user: { id },
      } = request;

      const item = await service.removeItemsFromCart(id, tenant_id, item_id);

      return reply.status(StatusCode.SuccessOK).send({
        data: item as any,
        status: "success",
        code: CASSuccessCode.DATA_DELETED,
        message: CASSuccessMessage.DATA_DELETED,
      });
    },
  };
};
