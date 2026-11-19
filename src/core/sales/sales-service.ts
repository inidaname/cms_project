import { createPagination } from "../../utils/pagination";

export class SalesService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async findSaleByCart(cart_id: string, tenant_id: string) {
    return this.prisma.sales.findUnique({ where: { cart_id, tenant_id } });
  }

  async checkout(data: {
    cart_id: string;
    tenant_id: string;
    user_id: string;
    organization?: {
      id?: string;
      name?: string;
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
    };
    participants?: { name: string; email?: string; role?: string }[];
  }) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        id: data.cart_id,
        tenant: { id: data.tenant_id },
        user_id: data.user_id,
      },
      include: { sales: true, cartItems: true },
    });

    if (!cart) {
      throw {
        statusCode: 404,
        message: "Cart not found",
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

    if (cart.status !== "Active") {
      throw {
        statusCode: 400,
        message: "Cannot checkout an inactive cart",
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

    let sales;
    try {
      sales = await this.prisma.sales.create({
        data: {
          cart_id: cart.id,
          tenant_id: data.tenant_id,
          user_id: data.user_id,
          amount: cart.totalValue,
        },
      });
    } catch (error: any) {
      // Two concurrent checkouts of the same cart: the cart_id unique
      // constraint decides the winner — the loser gets an explicit conflict
      // instead of a 500.
      if (error?.code === "P2002") {
        throw {
          statusCode: 409,
          message: "This cart has already been checked out",
          status: "error",
        };
      }
      throw error;
    }

    // Authoritative slot capacity (compensating pattern — Neon transactions
    // are unreliable): increment bookedCount per referenced slot, verify the
    // guard, and fully compensate (decrement + delete this sale) on failure.
    // Everything below runs only after the sale row exists, so a slot
    // failure leaves no sale, no cart transition, and no participant rows.
    const slotIncrements = new Map<string, number>();
    for (const item of cart.cartItems) {
      const configuration: any = item.configuration;
      const slotId = configuration?.slot_id;
      if (slotId) {
        const qty = Math.max(1, Number(item.product_quantity) || 1);
        slotIncrements.set(slotId, (slotIncrements.get(slotId) ?? 0) + qty);
      }
    }

    for (const [slotId, qty] of slotIncrements) {
      await this.prisma.offeringSlot.updateMany({
        where: { id: slotId, tenant_id: data.tenant_id },
        data: { bookedCount: { increment: qty } },
      });
      const slot = await this.prisma.offeringSlot.findUnique({ where: { id: slotId } });
      const started = !slot || slot.startsAt.getTime() <= Date.now();
      const overbooked = !!slot && slot.capacity != null && slot.bookedCount > slot.capacity;

      if (!slot || started || overbooked) {
        await this.prisma.offeringSlot.updateMany({
          where: { id: slotId, tenant_id: data.tenant_id },
          data: { bookedCount: { decrement: qty } },
        });
        await this.prisma.sales.deleteMany({ where: { id: sales.id } });
        throw {
          statusCode: 409,
          message: started
            ? "Selected time slot has already started"
            : "Selected time slot is fully booked",
          status: "error",
        };
      }
    }

    // Organization: link by tenant-scoped id, or create-or-link by name.
    let organization_id: string | null = null;
    if (data.organization?.id) {
      const existing = await this.prisma.organization.findFirst({
        where: { id: data.organization.id, tenant_id: data.tenant_id },
        select: { id: true },
      });
      if (!existing) {
        await this.prisma.sales.deleteMany({ where: { id: sales.id } });
        throw {
          statusCode: 400,
          message: "Organization not found",
          status: "error",
        };
      }
      organization_id = existing.id;
    } else if (data.organization?.name) {
      const existing = await this.prisma.organization.findFirst({
        where: { tenant_id: data.tenant_id, name: data.organization.name },
        select: { id: true },
      });
      organization_id =
        existing?.id ??
        (
          await this.prisma.organization.create({
            data: {
              tenant_id: data.tenant_id,
              name: data.organization.name,
              contactEmail: data.organization.contactEmail ?? null,
              contactPhone: data.organization.contactPhone ?? null,
              address: data.organization.address ?? null,
            },
          })
        ).id;
    }

    if (organization_id) {
      await this.prisma.sales.update({
        where: { id: sales.id },
        data: { organization_id },
      });
    }

    // Participants (learner/staff/attendee lists — generic, tenant-defined
    // role labels).
    const participants = (data.participants ?? []).filter((p) => p?.name);
    if (participants.length > 0) {
      await this.prisma.saleParticipant.createMany({
        data: participants.map((p) => ({
          tenant_id: data.tenant_id,
          sale_id: sales.id,
          name: p.name,
          email: p.email ?? null,
          role: p.role ?? "participant",
        })),
      });
    }

    // Transition the cart: an already-checked-out cart must not accept new
    // items or be handed out again by createCart's active-cart dedupe.
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { status: "Checkedout" },
    });

    // Re-fetch: organization/participant mutations happen after creation.
    return await this.prisma.sales.findUnique({
      where: { id: sales.id },
    });
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
