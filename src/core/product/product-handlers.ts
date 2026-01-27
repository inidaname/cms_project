import StatusCode from "status-code-enum";
import { ProductService } from "./product-service";
import {
  CASErrorCode,
  CASErrorMessage,
  CASSuccessCode,
  CASSuccessMessage,
} from "../../utils/enums";

export const productHandler: Producthanlder = (app) => {
  const service = new ProductService(app.prisma);
  return {
    createProduct: async (request, reply) => {
      const { id } = request.tenant!;
      const data = request.body;

      console.log("data", data);

      const product = await service.addProduct({ ...data, tenant_id: id });

      return reply.status(StatusCode.SuccessCreated).send({
        message: CASSuccessMessage.DATA_CREATED,
        code: CASSuccessCode.DATA_CREATED,
        status: "success",
        data: product,
      });
    },
    createVariation: async (request, reply) => {
      const { id } = request.tenant!;
      const data = request.body;
      const { product_id } = request.params;

      if (!(await service.isTenantProduct(id, product_id))) {
        throw {
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorNotFound,
        };
      }

      const variation = await service.addVariation({ ...data, product_id });

      return reply.status(StatusCode.SuccessResetContent).send({
        message: CASSuccessMessage.DATA_UPDATED,
        code: CASSuccessCode.DATA_UPDATED,
        status: "success",
        data: variation,
      });
    },
    addToBundle: async (request, reply) => {
      if (!request.tenant) {
        throw {
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorNotFound,
        };
      }

      const {
        tenant: { id: tenent_id },
        // user: { id },
        params: { product_id },
        body,
      } = request;

      const childProductIds = body.map((item) => item.child_id);
      const [isParentOwner, isBundle, areChildrenValid] = await Promise.all([
        service.isTenantProduct(tenent_id, product_id),
        service.isProductBundle(product_id),
        service.verifyTenantProducts(tenent_id, childProductIds),
      ]);

      if (!isParentOwner || !isBundle || !areChildrenValid) {
        throw {
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorNotFound,
        };
      }

      const preparedData = body.map((item) => ({
        ...item,
        parent_id: product_id,
      }));

      const products = await service.addToBundle(preparedData);

      return reply.status(StatusCode.SuccessCreated).send({
        code: CASSuccessCode.DATA_CREATED,
        message: CASSuccessMessage.DATA_CREATED,
        data: products,
        status: "success",
      });
    },
    updateProduct: async (request, reply) => {
      const { id } = request.tenant!;
      const data = request.body;
      const { product_id } = request.params;

      if (!(await service.isTenantProduct(id, product_id))) {
        throw {
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorNotFound,
        };
      }

      const product = await service.editProduct(product_id, {
        ...data,
        tenant_id: id,
      });

      return reply.status(StatusCode.SuccessResetContent).send({
        message: CASSuccessMessage.DATA_UPDATED,
        code: CASSuccessCode.DATA_UPDATED,
        status: "success",
        data: product,
      });
    },
    updateVariation: async (request, reply) => {
      const { id } = request.tenant!;
      const { product_id: _, ...data } = request.body;
      const { variation_id, product_id } = request.params;

      if (!(await service.isTenantProduct(id, product_id))) {
        throw {
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorNotFound,
        };
      }

      const variation = await service.editVariation(variation_id, data);

      return reply.status(StatusCode.SuccessResetContent).send({
        message: CASSuccessMessage.DATA_UPDATED,
        code: CASSuccessCode.DATA_UPDATED,
        status: "success",
        data: variation,
      });
    },
    getTenantProducts: async (request, reply) => {
      const { id } = request.tenant!;
      const { filter, limit, page } = request.query;

      const products = await service.getAllTenantProducts(
        id,
        page,
        limit,
        filter,
      );

      return reply.status(StatusCode.SuccessResetContent).send({
        message: CASSuccessMessage.DATA_RETRIEVED,
        code: CASSuccessCode.DATA_RETRIEVED,
        status: "success",
        data: products,
      });
    },

    getProductById: async (request, reply) => {
      const { id } = request.tenant!;
      const { product_id } = request.params;

      if (!(await service.isTenantProduct(id, product_id))) {
        throw {
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorNotFound,
        };
      }

      const product = await service.getProductById(product_id);

      return reply.status(StatusCode.SuccessResetContent).send({
        message: CASSuccessMessage.DATA_RETRIEVED,
        code: CASSuccessCode.DATA_RETRIEVED,
        status: "success",
        data: product,
      });
    },
    getVariationById: async (request, reply) => {
      const { id } = request.tenant!;
      const { product_id, variation_id } = request.params;

      if (!(await service.isTenantProduct(id, product_id))) {
        throw {
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorNotFound,
        };
      }

      const product = await service.getProductVariationById(variation_id);

      return reply.status(StatusCode.SuccessResetContent).send({
        message: CASSuccessMessage.DATA_RETRIEVED,
        code: CASSuccessCode.DATA_RETRIEVED,
        status: "success",
        data: product,
      });
    },
    getProductVariations: async (request, reply) => {
      const { id } = request.tenant!;
      const { product_id } = request.params;

      if (!(await service.isTenantProduct(id, product_id))) {
        throw {
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorNotFound,
        };
      }

      const product = await service.getProductVariation(product_id);

      return reply.status(StatusCode.SuccessResetContent).send({
        message: CASSuccessMessage.DATA_RETRIEVED,
        code: CASSuccessCode.DATA_RETRIEVED,
        status: "success",
        data: product,
      });
    },
    deleteProduct: async (request, reply) => {
      const { id } = request.tenant!;
      const { product_id } = request.params;

      if (!(await service.isTenantProduct(id, product_id))) {
        throw {
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorNotFound,
        };
      }

      const product = await service.removeProduct(product_id);

      return reply.status(StatusCode.SuccessResetContent).send({
        message: CASSuccessMessage.DATA_DELETED,
        code: CASSuccessCode.DATA_DELETED,
        status: "success",
        data: product,
      });
    },
    deleteVariation: async (request, reply) => {
      const { id } = request.tenant!;
      const { product_id, variation_id } = request.params;

      if (!(await service.isTenantProduct(id, product_id))) {
        throw {
          message: CASErrorMessage.USER_NOT_FOUND,
          code: CASErrorCode.USER_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorNotFound,
        };
      }

      const product = await service.removeVariation(variation_id);

      return reply.status(StatusCode.SuccessResetContent).send({
        message: CASSuccessMessage.DATA_DELETED,
        code: CASSuccessCode.DATA_DELETED,
        status: "success",
        data: product,
      });
    },
  };
};
