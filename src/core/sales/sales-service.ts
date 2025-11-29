export class SalesService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async isCartActive(cart_id: string, tenant_id: string, user_id: string) {
    const record = await this.prisma.sales.findFirst({
      where: { cart_id, cart: { tenant_id, user_id, status: "Active" } },
    });

    return record !== null;
  }

  async checkout(data: SalesInput) {
    const check = await this.isCartActive(
      data.cart_id,
      data.tenant_id,
      data.user_id,
    );
    if (!check) {
      throw {};
    }
    const sales = await this.prisma.cart.update({
      where: { id: data.cart_id },
      data: {
        sales: {
          create: { ...data },
          update: { amount: data.amount, status: data.status },
        },
      },
      select: { sales: { select: { id: true } } },
    });

    return await this.getCheckoutById(
      sales.sales?.id,
      data.tenant_id,
      data.user_id,
    );
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
}
