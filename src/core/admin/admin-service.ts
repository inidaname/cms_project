import { createPagination } from "../../utils/pagination";

export class AdminService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async getAllStats(tenant_id: string) {
    const [
      tenant,
      users,
      products,
      subscribers,
      campaigns,
      lists,
      sales,
      payments,
      carts,
    ] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenant_id },
        include: {
          settings: true,
          tenantFinecoreConfig: true,
          tenantEmailConfig: true,
        },
      }),
      this.prisma.user.count({ where: { tenant_id } }),
      this.prisma.product.count({ where: { tenant_id } }),
      this.prisma.subscriber.count({ where: { tenant_id } }),
      this.prisma.campaign.count({ where: { tenant_id } }),
      this.prisma.list.count({ where: { tenant_id } }),
      this.prisma.sales.count({ where: { tenant_id } }),
      this.prisma.payments.aggregate({
        where: { tenant_id, status: "Success" },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.cart.count({ where: { tenant_id } }),
    ]);

    return {
      tenant,
      counts: {
        users,
        products,
        subscribers,
        campaigns,
        lists,
        sales,
        payments: payments._count,
        carts,
      },
      revenue: {
        total: payments._sum.amount || 0,
        transactionCount: payments._count,
      },
    };
  }

  async manageSubscribers(tenant_id: string, action: string, data?: any) {
    switch (action) {
      case "list":
        const subscribers = await this.prisma.subscriber.findMany({
          where: { tenant_id },
          include: { _count: { select: { lists: true, sends: true } } },
          orderBy: { createdAt: "desc" },
        });
        return { data: subscribers, count: subscribers.length };

      case "get":
        return await this.prisma.subscriber.findFirst({
          where: { id: data.id, tenant_id },
          include: { lists: true },
        });

      case "create":
        return await this.prisma.subscriber.create({
          data: { tenant_id, email: data.email, name: data.name },
        });

      case "update":
        return await this.prisma.subscriber.updateMany({
          where: { id: data.id, tenant_id },
          data: { email: data.email, name: data.name, status: data.status },
        });

      case "delete":
        return await this.prisma.subscriber.deleteMany({
          where: { id: data.id, tenant_id },
        });

      case "bulk_create":
        const created = await this.prisma.subscriber.createMany({
          data: data.emails.map((email: string) => ({
            tenant_id,
            email,
            name: data.names?.[email],
          })),
          skipDuplicates: true,
        });
        return { count: created.count };

      default:
        throw new Error("Invalid subscriber action");
    }
  }

  async manageLists(tenant_id: string, action: string, data?: any) {
    switch (action) {
      case "list":
        return await this.prisma.list.findMany({
          where: { tenant_id },
          include: { _count: { select: { subscribers: true } } },
          orderBy: { createdAt: "desc" },
        });

      case "get":
        return await this.prisma.list.findFirst({
          where: { id: data.id, tenant_id },
          include: {
            subscribers: {
              include: { subscriber: true },
            },
          },
        });

      case "create":
        return await this.prisma.list.create({
          data: { tenant_id, name: data.name },
        });

      case "update":
        return await this.prisma.list.updateMany({
          where: { id: data.id, tenant_id },
          data: { name: data.name },
        });

      case "delete":
        return await this.prisma.list.deleteMany({
          where: { id: data.id, tenant_id },
        });

      case "add_subscribers":
        // Tenant scope: the list and every subscriber must belong to the
        // caller's tenant before any ListSubscriber row is written.
        const tenantList = await this.prisma.list.findFirst({
          where: { id: data.list_id, tenant_id },
          select: { id: true },
        });
        if (!tenantList) throw new Error("List not found");

        const tenantSubscribers = await this.prisma.subscriber.findMany({
          where: { id: { in: data.subscriber_ids }, tenant_id },
          select: { id: true },
        });
        const tenantSubscriberIds = new Set(tenantSubscribers.map((s) => s.id));
        const foreignSubscribers = data.subscriber_ids.filter(
          (id: string) => !tenantSubscriberIds.has(id),
        );
        if (foreignSubscribers.length > 0) {
          throw new Error("Subscribers do not belong to this tenant");
        }

        const existingSubs = await this.prisma.listSubscriber.findMany({
          where: { listId: tenantList.id, subscriberId: { in: data.subscriber_ids } },
          select: { subscriberId: true },
        });
        const existingIds = new Set(existingSubs.map((s) => s.subscriberId));
        const newSubs = data.subscriber_ids.filter(
          (id: string) => !existingIds.has(id),
        );
        if (newSubs.length > 0) {
          await this.prisma.listSubscriber.createMany({
            data: newSubs.map((subscriberId: string) => ({
              listId: tenantList.id,
              subscriberId,
            })),
          });
        }
        return { added: newSubs.length };

      case "remove_subscribers":
        // Tenant scope: only memberships of a tenant-owned list are removed.
        const removeList = await this.prisma.list.findFirst({
          where: { id: data.list_id, tenant_id },
          select: { id: true },
        });
        if (!removeList) throw new Error("List not found");

        await this.prisma.listSubscriber.deleteMany({
          where: {
            listId: removeList.id,
            subscriberId: { in: data.subscriber_ids },
          },
        });
        return { removed: data.subscriber_ids.length };

      default:
        throw new Error("Invalid list action");
    }
  }

  async manageCampaigns(tenant_id: string, action: string, data?: any) {
    switch (action) {
      case "list":
        return await this.prisma.campaign.findMany({
          where: { tenant_id },
          include: { _count: { select: { sends: true } } },
          orderBy: { createdAt: "desc" },
        });

      case "get":
        return await this.prisma.campaign.findFirst({
          where: { id: data.id, tenant_id },
          include: { sends: { include: { subscriber: true } } },
        });

      case "create":
        return await this.prisma.campaign.create({
          data: {
            tenant_id,
            subject: data.subject,
            htmlBody: data.htmlBody,
            textBody: data.textBody,
          },
        });

      case "update":
        return await this.prisma.campaign.updateMany({
          where: { id: data.id, tenant_id },
          data: {
            subject: data.subject,
            htmlBody: data.htmlBody,
            textBody: data.textBody,
            status: data.status,
            scheduledAt: data.scheduledAt,
          },
        });

      case "delete":
        return await this.prisma.campaign.deleteMany({
          where: { id: data.id, tenant_id },
        });

      case "send":
        const campaign = await this.prisma.campaign.findFirst({
          where: { id: data.campaign_id, tenant_id },
        });
        if (!campaign) throw new Error("Campaign not found");

        let subscribers: any[];
        if (data.list_id) {
          // Tenant scope: resolve only subscribers of a tenant-owned list
          // (and defensively require the subscriber rows themselves to be
          // tenant-owned).
          const sendList = await this.prisma.list.findFirst({
            where: { id: data.list_id, tenant_id },
            select: { id: true },
          });
          if (!sendList) throw new Error("List not found");

          const listSubs = await this.prisma.listSubscriber.findMany({
            where: {
              listId: sendList.id,
              subscriber: { tenant_id },
            },
            select: { subscriberId: true },
          });
          subscribers = listSubs.map((ls) => ls.subscriberId);
        } else {
          const allSubs = await this.prisma.subscriber.findMany({
            where: { tenant_id, status: "ACTIVE" },
            select: { id: true },
          });
          subscribers = allSubs.map((s) => s.id);
        }

        await this.prisma.emailSend.createMany({
          data: subscribers.map((subscriberId) => ({
            tenant_id,
            campaignId: data.campaign_id,
            subscriberId,
          })),
          skipDuplicates: true,
        });

        await this.prisma.campaign.updateMany({
          where: { id: data.campaign_id, tenant_id },
          data: { status: "SENDING" as any },
        });

        return { scheduled: subscribers.length };

      default:
        throw new Error("Invalid campaign action");
    }
  }

  async manageProducts(tenant_id: string, action: string, data?: any) {
    switch (action) {
      case "list": {
        const page = data?.page ?? 1;
        const limit = data?.limit ?? 10;
        const search = data?.search;
        const where: any = { tenant_id };
        if (search) {
          where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ];
        }
        const [products, total] = await Promise.all([
          this.prisma.product.findMany({
            where,
            include: {
              _count: { select: { cartItems: true, productVariations: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          this.prisma.product.count({ where }),
        ]);
        return {
          data: products,
          metadata: createPagination(total, page, limit),
        };
      }

      case "get":
        return await this.prisma.product.findFirst({
          where: { id: data.id, tenant_id },
          include: {
            productVariations: true,
            asComponent: true,
            bundleComponents: true,
          },
        });

      case "create":
        return await this.prisma.product.create({
          data: {
            tenant_id,
            title: data.title,
            description: data.description ?? "",
            price: data.price,
            quantity: data.quantity,
            attributes: data.attributes,
            variation: data.variation,
            status: data.status,
            isBundle: data.isBundle,
            isFeatured: data.isFeatured,
            min_items: data.min_items,
            max_items: data.max_items,
          },
        });

      case "update":
        return await this.prisma.product.updateMany({
          where: { id: data.id, tenant_id },
          data: {
            title: data.title,
            description: data.description,
            price: data.price,
            quantity: data.quantity,
            attributes: data.attributes,
            variation: data.variation,
            status: data.status,
            isBundle: data.isBundle,
            isFeatured: data.isFeatured,
          },
        });

      case "delete":
        return await this.prisma.product.updateMany({
          where: { id: data.id, tenant_id },
          data: { status: "Discontinued" as any },
        });

      case "add_variation":
        // Tenant scope: the parent product must belong to the caller's tenant.
        const variationProduct = await this.prisma.product.findFirst({
          where: { id: data.product_id, tenant_id },
          select: { id: true },
        });
        if (!variationProduct) throw new Error("Product not found");

        return await this.prisma.productVariation.create({
          data: {
            product_id: variationProduct.id,
            type: data.type as any,
            value: data.value,
            price: data.price,
            quantity: data.quantity,
          },
        });

      case "update_variation":
        // Tenant scope: constrain through the parent product's tenant_id.
        return await this.prisma.productVariation.updateMany({
          where: {
            id: data.variation_id,
            product: { tenant_id },
          },
          data: {
            type: data.type as any,
            value: data.value,
            price: data.price,
            quantity: data.quantity,
          },
        });

      case "delete_variation":
        // Tenant scope: constrain through the parent product's tenant_id.
        return await this.prisma.productVariation.deleteMany({
          where: {
            id: data.variation_id,
            product: { tenant_id },
          },
        });

      case "add_to_bundle":
        // Tenant scope: parent and every child product must belong to the
        // caller's tenant.
        const bundleParent = await this.prisma.product.findFirst({
          where: { id: data.product_id, tenant_id },
          select: { id: true },
        });
        if (!bundleParent) throw new Error("Product not found");

        const bundleChildIds = [
          ...new Set<string>(data.components.map((comp: any) => comp.child_id)),
        ] as string[];
        const bundleChildren = await this.prisma.product.findMany({
          where: { id: { in: bundleChildIds }, tenant_id },
          select: { id: true },
        });
        if (bundleChildren.length !== bundleChildIds.length) {
          throw new Error("Bundle components must belong to this tenant");
        }

        const bundleComponents = data.components.map((comp: any) => ({
          parent_id: bundleParent.id,
          child_id: comp.child_id,
          additionalPrice: comp.additionalPrice || 0,
        }));
        return await this.prisma.productComponent.createMany({
          data: bundleComponents,
          skipDuplicates: true,
        });

      case "edit_bundle":
        // Tenant scope: parent must belong to the caller's tenant and every
        // component row must reference that parent.
        const editParent = await this.prisma.product.findFirst({
          where: { id: data.product_id, tenant_id },
          select: { id: true },
        });
        if (!editParent) throw new Error("Product not found");

        const editChildIds = [
          ...new Set<string>(
            data.components
              .filter((comp: any) => comp.child_id)
              .map((comp: any) => comp.child_id),
          ),
        ] as string[];
        if (editChildIds.length > 0) {
          const editChildren = await this.prisma.product.findMany({
            where: { id: { in: editChildIds }, tenant_id },
            select: { id: true },
          });
          if (editChildren.length !== editChildIds.length) {
            throw new Error("Bundle components must belong to this tenant");
          }
        }

        for (const comp of data.components) {
          if (comp.id) {
            await this.prisma.productComponent.updateMany({
              where: { id: comp.id, parent_id: editParent.id },
              data: {
                additionalPrice: comp.additionalPrice,
                child_id: comp.child_id,
              },
            });
          }
        }
        return await this.prisma.productComponent.findMany({
          where: { parent_id: editParent.id },
        });

      default:
        throw new Error("Invalid product action");
    }
  }

  async manageOrders(tenant_id: string, action: string, data?: any) {
    switch (action) {
      case "list":
        return await this.prisma.sales.findMany({
          where: { tenant_id },
          include: {
            paidBy: { select: { id: true, name: true, email: true } },
            payments: true,
            delivery: true,
            cart: { include: { cartItems: { include: { item: true } } } },
          },
          orderBy: { createdAt: "desc" },
        });

      case "get":
        return await this.prisma.sales.findFirst({
          where: { id: data.id, tenant_id },
          include: {
            paidBy: true,
            payments: true,
            delivery: true,
            cart: {
              include: {
                cartItems: { include: { item: true, variation: true } },
              },
            },
          },
        });

      case "update_status":
        return await this.prisma.sales.updateMany({
          where: { id: data.id, tenant_id },
          data: { status: data.status as any },
        });

      case "update_delivery":
        // Tenant scope: deliveries and sales are tenant-owned; both the
        // lookup and the write are constrained by tenant_id.
        const existingDelivery = await this.prisma.delivery.findUnique({
          where: { sales_id: data.id, tenant_id },
        });

        if (existingDelivery) {
          return await this.prisma.delivery.update({
            where: { sales_id: data.id, tenant_id },
            data: {
              status: data.status,
              address: data.address,
              recipientName: data.recipientName,
              recipientPhone: data.recipientPhone,
              trackingNumber: data.trackingNumber,
              estimatedArrival: data.estimatedArrival,
              notes: data.notes,
            },
          });
        } else {
          const tenantSale = await this.prisma.sales.findFirst({
            where: { id: data.id, tenant_id },
            select: { id: true },
          });
          if (!tenantSale) throw new Error("Sale not found");

          return await this.prisma.delivery.create({
            data: {
              sales_id: tenantSale.id,
              tenant_id,
              status: data.status || ("PENDING" as any),
              address: data.address || "",
              recipientName: data.recipientName || "",
              recipientPhone: data.recipientPhone || "",
              trackingNumber: data.trackingNumber,
              estimatedArrival: data.estimatedArrival,
              notes: data.notes,
            },
          });
        }

      default:
        throw new Error("Invalid order action");
    }
  }

  async managePayments(tenant_id: string, action: string, data?: any) {
    switch (action) {
      case "list":
        return await this.prisma.payments.findMany({
          where: { tenant_id },
          include: {
            paidBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        });

      case "get":
        return await this.prisma.payments.findFirst({
          where: { id: data.id, tenant_id },
          include: {
            paidBy: true,
            paidTo: { select: { id: true, name: true } },
          },
        });

      case "refund":
        return await this.prisma.payments.updateMany({
          where: { id: data.id, tenant_id },
          data: { status: "Failed" as any },
        });

      default:
        throw new Error("Invalid payment action");
    }
  }

  async manageDiscounts(tenant_id: string, action: string, data?: any) {
    switch (action) {
      case "list":
        return await this.prisma.discount.findMany({
          where: { tenant_id },
          orderBy: { createdAt: "desc" },
        });

      case "create":
        return await this.prisma.discount.create({
          data: {
            tenant_id,
            title: data.title,
            percentage: data.percentage,
            active: data.active ?? true,
          },
        });

      case "update":
        return await this.prisma.discount.updateMany({
          where: { id: data.id, tenant_id },
          data: {
            title: data.title,
            percentage: data.percentage,
            active: data.active,
          },
        });

      case "delete":
        return await this.prisma.discount.deleteMany({
          where: { id: data.id, tenant_id },
        });

      case "toggle":
        return await this.prisma.discount.updateMany({
          where: { id: data.id, tenant_id },
          data: { active: data.active },
        });

      default:
        throw new Error("Invalid discount action");
    }
  }

  async getFullReport(tenant_id: string, startDate?: Date, endDate?: Date) {
    const where = {
      tenant_id,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const [salesData, paymentData, subscriberData, productData, cartData] =
      await Promise.all([
        this.prisma.sales.findMany({
          where,
          include: { paidBy: { select: { name: true, email: true } } },
        }),
        this.prisma.payments.findMany({
          where,
          include: { paidBy: { select: { email: true } } },
        }),
        this.prisma.subscriber.groupBy({
          by: ["status"],
          where: { tenant_id },
          _count: true,
        }),
        this.prisma.product.groupBy({
          by: ["status"],
          where: { tenant_id },
          _count: true,
        }),
        this.prisma.cart.groupBy({
          by: ["status"],
          where: { tenant_id },
          _count: true,
        }),
      ]);

    return {
      sales: {
        total: salesData.length,
        byStatus: salesData.reduce(
          (acc, s) => {
            const status = s.status || "Unknown";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        totalRevenue: salesData.reduce((sum, s) => sum + s.amount, 0),
      },
      payments: {
        total: paymentData.length,
        byStatus: paymentData.reduce(
          (acc, p) => {
            acc[p.status || "Unknown"] = (acc[p.status || "Unknown"] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        byChannel: paymentData.reduce(
          (acc, p) => {
            const channel = p.channel || "Unknown";
            acc[channel] = (acc[channel] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        totalProcessed: paymentData
          .filter((p) => p.status === "Success")
          .reduce((sum, p) => sum + p.amount, 0),
      },
      subscribers: {
        total: subscriberData.reduce((sum, s) => sum + s._count, 0),
        byStatus: subscriberData.reduce(
          (acc, s) => {
            acc[s.status] = s._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      products: {
        total: productData.reduce((sum, p) => sum + p._count, 0),
        byStatus: productData.reduce(
          (acc, p) => {
            const status = p.status as string;
            acc[status] = p._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      carts: {
        total: cartData.reduce((sum, c) => sum + c._count, 0),
        byStatus: cartData.reduce(
          (acc, c) => {
            const status = c.status as string;
            acc[status] = c._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    };
  }
}
