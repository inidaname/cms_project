export class AdminAnalyticsService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async getDashboardStats(tenant_id: string, period: string = "30d") {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const [
      totalUsers,
      totalProducts,
      totalSales,
      totalRevenue,
      recentSales,
      topProducts,
      salesByDay,
      paymentStats,
      subscriberStats,
      cartStats,
    ] = await Promise.all([
      this.prisma.user.count({ where: { tenant_id } }),
      this.prisma.product.count({ where: { tenant_id } }),
      this.prisma.sales.count({ where: { tenant_id, createdAt: { gte: startDate } } }),
      this.prisma.payments.aggregate({
        where: { tenant_id, status: "Success", createdAt: { gte: startDate } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.sales.findMany({
        where: { tenant_id, createdAt: { gte: startDate } },
        include: { paidBy: { select: { name: true, email: true } }, payments: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      this.prisma.product.findMany({
        where: { tenant_id },
        include: { cartItems: { select: { product_quantity: true } } },
        orderBy: { cartItems: { _count: "desc" } },
        take: 5,
      }),
      this.getSalesByDay(tenant_id, startDate, now),
      this.prisma.payments.groupBy({
        by: ["status"],
        where: { tenant_id, createdAt: { gte: startDate } },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.subscriber.groupBy({
        by: ["status"],
        where: { tenant_id },
        _count: true,
      }),
      this.prisma.cart.groupBy({
        by: ["status"],
        where: { tenant_id, createdAt: { gte: startDate } },
        _count: true,
      }),
    ]);

    return {
      overview: {
        totalUsers,
        totalProducts,
        totalSales,
        totalRevenue: totalRevenue._sum.amount || 0,
        revenueCount: totalRevenue._count,
      },
      recentSales,
      topProducts: topProducts.map((p) => ({
        id: p.id,
        title: p.title,
        salesCount: p.cartItems.reduce((acc, item) => acc + item.product_quantity, 0),
      })),
      salesByDay,
      paymentBreakdown: paymentStats.map((p) => ({
        status: p.status,
        count: p._count,
        amount: p._sum.amount || 0,
      })),
      subscriberBreakdown: subscriberStats.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      cartBreakdown: cartStats.map((c) => ({
        status: c.status,
        count: c._count,
      })),
    };
  }

  private async getSalesByDay(tenant_id: string, startDate: Date, endDate: Date) {
    const sales = await this.prisma.sales.findMany({
      where: { tenant_id, createdAt: { gte: startDate, lte: endDate } },
      select: { amount: true, createdAt: true },
    });

    const salesByDay: Record<string, { date: string; count: number; amount: number }> = {};

    for (const sale of sales) {
      const date = sale.createdAt.toISOString().split("T")[0];
      if (!salesByDay[date]) {
        salesByDay[date] = { date, count: 0, amount: 0 };
      }
      salesByDay[date].count++;
      salesByDay[date].amount += sale.amount;
    }

    return Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getRevenueAnalytics(tenant_id: string, groupBy: "day" | "week" | "month" = "day") {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 12);

    const payments = await this.prisma.payments.findMany({
      where: { tenant_id, status: "Success", createdAt: { gte: startDate } },
      orderBy: { createdAt: "asc" },
    });

    const grouped = this.groupPayments(payments, groupBy);

    return {
      total: payments.reduce((sum, p) => sum + p.amount, 0),
      count: payments.length,
      average: payments.length > 0 ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0,
      byPeriod: grouped,
      byChannel: await this.getRevenueByChannel(tenant_id, startDate),
    };
  }

  private groupPayments(payments: any[], groupBy: "day" | "week" | "month") {
    const grouped: Record<string, { period: string; amount: number; count: number }> = {};

    for (const payment of payments) {
      const date = new Date(payment.createdAt);
      let period: string;

      switch (groupBy) {
        case "day":
          period = date.toISOString().split("T")[0];
          break;
        case "week":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().split("T")[0];
          break;
        case "month":
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
      }

      if (!grouped[period]) {
        grouped[period] = { period, amount: 0, count: 0 };
      }
      grouped[period].amount += payment.amount;
      grouped[period].count++;
    }

    return Object.values(grouped);
  }

  private async getRevenueByChannel(tenant_id: string, startDate: Date) {
    const payments = await this.prisma.payments.findMany({
      where: { tenant_id, status: "Success", createdAt: { gte: startDate } },
      select: { channel: true, amount: true },
    });

    const byChannel: Record<string, { channel: string; amount: number; count: number }> = {};

    for (const payment of payments) {
      const channel = payment.channel || "Unknown";
      if (!byChannel[channel]) {
        byChannel[channel] = { channel, amount: 0, count: 0 };
      }
      byChannel[channel].amount += payment.amount;
      byChannel[channel].count++;
    }

    return Object.values(byChannel);
  }

  async getUserAnalytics(tenant_id: string) {
    const [totalUsers, usersByRole, recentUsers, activeUsers] = await Promise.all([
      this.prisma.user.count({ where: { tenant_id } }),
      this.prisma.user.groupBy({
        by: ["role"],
        where: { tenant_id },
        _count: true,
      }),
      this.prisma.user.findMany({
        where: { tenant_id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      this.prisma.user.findMany({
        where: {
          tenant_id,
          carts: { some: { status: "Checkedout" } },
        },
        include: {
          purchases: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        take: 10,
      }),
    ]);

    return {
      totalUsers,
      byRole: usersByRole.map((r) => ({ role: r.role, count: r._count })),
      recentUsers,
      topCustomers: activeUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        totalPurchases: u.purchases.length,
        lastPurchase: u.purchases[0]?.createdAt || null,
      })),
    };
  }

  async getProductAnalytics(tenant_id: string) {
    const [totalProducts, productsByStatus, lowStockProducts, topSelling] = await Promise.all([
      this.prisma.product.count({ where: { tenant_id } }),
      this.prisma.product.groupBy({
        by: ["status"],
        where: { tenant_id },
        _count: true,
      }),
      this.prisma.product.findMany({
        where: { tenant_id, quantity: { lte: 10 } },
        orderBy: { quantity: "asc" },
        take: 10,
      }),
      this.prisma.product.findMany({
        where: { tenant_id },
        include: {
          cartItems: {
            select: { product_quantity: true },
          },
        },
        orderBy: {
          cartItems: {
            _count: "desc",
          },
        },
        take: 10,
      }),
    ]);

    return {
      totalProducts,
      byStatus: productsByStatus.map((p) => ({ status: p.status, count: p._count })),
      lowStockProducts: lowStockProducts.map((p) => ({
        id: p.id,
        title: p.title,
        quantity: p.quantity,
      })),
      topSelling: topSelling.map((p) => ({
        id: p.id,
        title: p.title,
        totalSold: p.cartItems.reduce((acc, item) => acc + item.product_quantity, 0),
      })),
    };
  }
}
