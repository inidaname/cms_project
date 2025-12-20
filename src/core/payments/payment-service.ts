import { $Enums, Prisma } from "@prisma/client";
import { createPagination } from "../../utils/pagination";

export class PaymentService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async savePayment(data: PaymentInput) {
    return this.prisma.payments.create({
      data,
      include: { paidBy: true, paidFor: true, paidTo: true },
    });
  }

  async getPayments(
    tenant_id: string,
    page = 1,
    limit = 10,
    filter?: $Enums.PaymentStatus,
    user_id?: string
  ) {
    const whereClause: Prisma.PaymentsWhereInput = {
      tenant_id,
      ...(user_id && { user_id }),
      ...(filter && { status: filter }),
    };

    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payments.findMany({
        where: whereClause,
        include: { paidBy: true, paidFor: true, paidTo: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.payments.count({ where: whereClause }),
    ]);

    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async getPaymentById(id: string) {
    return await this.prisma.payments.findUnique({
      where: { id },
      include: { paidBy: true, paidFor: true, paidTo: true },
    });
  }
}
