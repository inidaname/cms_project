import { Prisma } from "@prisma/client";
import { createPagination } from "../../utils/pagination";

export class ProductService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async addProduct(data: ProductInput, variation?: VariationInput) {
    const { attributes, ...rest } = data;
    return await this.prisma.product.create({
      data: {
        ...rest,
        attributes: JSON.parse(attributes?.toString()!),
        productVariations: rest.variation ? { create: variation } : {},
      },
      include: { productVariations: rest.variation! },
    });
  }

  async addVariation(data: VariationInput) {
    return await this.prisma.productVariation.create({ data });
  }

  async editProduct(
    id: string,
    data: Partial<ProductInput>,
  ) {
    const { attributes, tenant_id: _, ...rest } = data;
    return await this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        attributes: JSON.parse(attributes?.toString()!),
      },
    });
  }

  async editVariation(id: string, data: Partial<VariationInput>) {
    const { product_id: _, ...rest } = data;
    return await this.prisma.productVariation.update({
      where: { id },
      data: { ...rest },
    });
  }

  async isTenantProduct(tenant_id: string, product_id: string) {
    const record = await this.prisma.product.findFirst({
      where: { id: product_id, tenant_id },
    });

    return record !== null;
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
    const [data, total] = await this.prisma.$transaction([
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
      this.prisma.product.count(),
    ]);
    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async getProductVariation(product_id: string) {
    return await this.prisma.productVariation.findMany({
      where: { product_id },
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

  async getProductById(id: string) {
    return await this.prisma.product.findUnique({
      where: { id },
      include: {
        _count: true,
        cartItems: true,
        owner: true,
        productVariations: true,
      },
    });
  }

  async getProductVariationById(id: string) {
    return await this.prisma.productVariation.findUnique({
      where: { id },
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

  async removeProduct(id: string) {
    const [product] = await this.prisma.$transaction([
      this.prisma.product.delete({ where: { id } }),
      this.prisma.productVariation.deleteMany({ where: { product_id: id } }),
    ]);

    return product;
  }

  async removeVariation(id: string) {
    return await this.prisma.productVariation.delete({ where: { id } });
  }
}
