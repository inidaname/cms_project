import { createPagination } from "../../utils/pagination";

export class SalesService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async findSaleByCart(cart_id: string, tenant_id: string) {
    return this.prisma.sales.findUnique({ where: { cart_id } });
  }

  async checkout(data: {
    cart_id: string;
    tenant_id: string;
    user_id: string;
  }) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        id: data.cart_id,
        tenant: { id: data.tenant_id },
        user_id: data.user_id,
        status: "Active",
      },
      include: { sales: true, cartItems: true },
    });

    if (!cart) {
      throw {
        statusCode: 404,
        message: "Cart not found or not active",
        status: "error",
      };
    }

    if (cart.sales) {
      throw {
        statusCode: 409,
        message: "This cart has already been checked out",
        status: "error",
      };
    }

    if (!cart.cartItems?.length) {
      throw {
        statusCode: 400,
        message: "Cannot checkout an empty cart",
        status: "error",
      };
    }

    const sales = await this.prisma.sales.create({
      data: {
        cart_id: cart.id,
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        amount: cart.totalValue,
      },
    });

    return sales;
  }

  async getCheckoutById(
    id: string | undefined,
    tenant_id: string,
    user_id: string,
  ) {
    return await this.prisma.sales.findFirst({
      where: { id, tenant_id, user_id },
    });
  }

  async getAllSales(tenant_id: string, page = 1, limit = 10, user_id?: string) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.sales.findMany({
        where: { tenant_id, ...(user_id && { user_id }) },
        include: {
          cart: { include: { cartItems: true } },
          payments: true,
          paidBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.sales.count({
        where: { tenant_id, ...(user_id && { user_id }) },
      }),
    ]);

    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }
}
