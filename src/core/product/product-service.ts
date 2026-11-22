import { Prisma } from "@prisma/client";
import StatusCode from "status-code-enum";
import { CASErrorCode, CASErrorMessage } from "../../utils/enums";
import { createPagination } from "../../utils/pagination";

export class ProductService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  // Re-throws Prisma's "record not found" as the route-level 404 shape so a
  // tenant-scoped miss surfaces the same way as any other missing record.
  private notFoundOrRethrow(error: unknown): never {
    if (
      error &&
      typeof error === "object" &&
      (error as { code?: string }).code === "P2025"
    ) {
      throw {
        message: CASErrorMessage.USER_NOT_FOUND,
        code: CASErrorCode.USER_NOT_FOUND,
        status: "error",
        statusCode: StatusCode.ClientErrorNotFound,
      };
    }
    throw error;
  }

  async isProductBundle(id: string, tenant_id: string) {
    const product = await this.prisma.product.count({
      where: { id, tenant_id, isBundle: true },
    });

    return product > 0;
  }

  async isTenantProduct(tenant_id: string, product_id: string) {
    const record = await this.prisma.product.findFirst({
      where: { id: product_id, tenant_id },
    });

    return record !== null;
  }

  async verifyTenantProducts(tenant_id: string, product_ids: string[]) {
    const uniqueIds = [...new Set(product_ids)]; // Remove duplicates for the query
    const count = await this.prisma.product.count({
      where: {
        tenant_id,
        id: { in: uniqueIds },
      },
    });

    return count === uniqueIds.length;
  }

  async addProduct(data: ProductInput) {
    const { attributes, ...rest } = data;
    return await this.prisma.product.create({
      data: {
        ...rest,
        attributes: attributes ? attributes : {},
      },
      include: { productVariations: rest.variation! },
    });
  }

  async addToBundle(data: ComponentInput[]) {
    return await this.prisma.productComponent.createManyAndReturn({
      data,
      // skipDuplicates: true,
      include: { parentProduct: true, childProduct: true },
    });
  }

  async editBundle(
    id: string,
    tenant_id: string,
    data: Pick<ComponentInput, "additionalPrice">,
  ) {
    return await this.prisma.productComponent.update({
      where: { id, parentProduct: { tenant_id } },
      data,
      include: { childProduct: true, parentProduct: true },
    });
  }

  async addVariation(data: VariationInput, tenant_id: string) {
    // Tenant scope: the parent product must belong to the caller's tenant.
    const product = await this.prisma.product.findFirst({
      where: { id: data.product_id, tenant_id },
      select: { id: true },
    });
    if (!product) {
      throw {
        message: CASErrorMessage.USER_NOT_FOUND,
        code: CASErrorCode.USER_NOT_FOUND,
        status: "error",
        statusCode: StatusCode.ClientErrorNotFound,
      };
    }

    return await this.prisma.productVariation.create({ data }).catch((error) =>
      this.notFoundOrRethrow(error),
    );
  }

  async editProduct(id: string, tenant_id: string, data: Partial<ProductInput>) {
    const { attributes, tenant_id: _, ...rest } = data;
    // Tenant scope is part of the write itself (no check-then-act window).
    return await this.prisma.product
      .update({
        where: { id, tenant_id },
        data: {
          ...rest,
          attributes: JSON.parse(attributes?.toString()!),
        },
      })
      .catch((error) => this.notFoundOrRethrow(error));
  }

  async editVariation(
    id: string,
    tenant_id: string,
    data: Partial<VariationInput>,
  ) {
    const { product_id: _, ...rest } = data;
    // Tenant scope through the parent product; a variation that belongs to a
    // different tenant (or product) is not found.
    return await this.prisma.productVariation
      .update({
        where: { id, product: { tenant_id } },
        data: { ...rest },
      })
      .catch((error) => this.notFoundOrRethrow(error));
  }

  async getAllTenantProducts(
    tenant_id: string,
    page = 1,
    limit = 10,
    filter?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.ProductWhereInput = filter
      ? {
          tenant_id,
          OR: [{ title: { contains: filter, mode: "insensitive" } }],
        }
      : { tenant_id };
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          _count: true,
          cartItems: true,
          owner: true,
          productVariations: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async getProductVariation(product_id: string, tenant_id: string) {
    return await this.prisma.productVariation.findMany({
      where: { product_id, product: { tenant_id } },
      include: {
        product: {
          include: {
            _count: true,
            cartItems: true,
            owner: true,
            productVariations: true,
          },
        },
      },
    });
  }

  async getProductById(id: string, tenant_id: string) {
    return await this.prisma.product.findUnique({
      where: { id, tenant_id },
      include: {
        _count: true,
        cartItems: true,
        owner: true,
        productVariations: true,
        optionGroups: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          include: { choices: { orderBy: { createdAt: "asc" } } },
        },
        offeringSlots: { orderBy: { startsAt: "asc" } },
      },
    });
  }

  async getProductVariationById(id: string, tenant_id: string) {
    return await this.prisma.productVariation.findUnique({
      where: { id, product: { tenant_id } },
      include: {
        product: {
          include: {
            _count: true,
            cartItems: true,
            owner: true,
            productVariations: true,
          },
        },
      },
    });
  }

  async removeProduct(id: string, tenant_id: string) {
    // Tenant scope is part of the writes themselves (no check-then-act window).
    const [product] = await Promise.all([
      this.prisma.product
        .delete({ where: { id, tenant_id } })
        .catch((error) => this.notFoundOrRethrow(error)),
      this.prisma.productVariation.deleteMany({
        where: { product_id: id, product: { tenant_id } },
      }),
    ]);

    return product;
  }

  async removeVariation(id: string, tenant_id: string) {
    // Tenant scope through the parent product; a variation belonging to a
    // different tenant is not found.
    return await this.prisma.productVariation
      .delete({ where: { id, product: { tenant_id } } })
      .catch((error) => this.notFoundOrRethrow(error));
  }
}
