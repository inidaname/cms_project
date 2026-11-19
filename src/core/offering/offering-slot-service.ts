// Offering-slot service (prompt 9, phase 9c): scheduling + capacity
// primitive for scheduled offering types. All operations tenant-scoped.
import { Prisma } from "@prisma/client";

export interface OfferingSlotInput {
  startsAt: string | Date;
  endsAt: string | Date;
  capacity?: number | null;
  location?: string | null;
  notes?: string | null;
}

export class OfferingSlotService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async createSlot(tenant_id: string, product_id: string, data: OfferingSlotInput) {
    // Tenant scope: the parent product must belong to the caller's tenant.
    const product = await this.prisma.product.findFirst({
      where: { id: product_id, tenant_id },
      select: { id: true },
    });
    if (!product) {
      throw {
        message: "Product not found",
        code: "PRODUCT_NOT_FOUND",
        status: "error",
        statusCode: 404,
      };
    }

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw {
        message: "Invalid slot dates",
        code: "INVALID_DATES",
        status: "error",
        statusCode: 400,
      };
    }
    if (endsAt <= startsAt) {
      throw {
        message: "Slot endsAt must be after startsAt",
        code: "INVALID_DATES",
        status: "error",
        statusCode: 400,
      };
    }

    return await this.prisma.offeringSlot.create({
      data: {
        tenant_id,
        product_id: product.id,
        startsAt,
        endsAt,
        capacity: data.capacity ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
      },
    });
  }

  async listSlots(tenant_id: string, product_id: string, upcomingOnly?: boolean) {
    return await this.prisma.offeringSlot.findMany({
      where: {
        tenant_id,
        product_id,
        ...(upcomingOnly ? { startsAt: { gte: new Date() } } : {}),
      },
      orderBy: { startsAt: "asc" },
    });
  }

  async updateSlot(id: string, tenant_id: string, data: Partial<OfferingSlotInput>) {
    const payload: Prisma.OfferingSlotUpdateManyMutationInput = {};
    if (data.startsAt !== undefined) payload.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) payload.endsAt = new Date(data.endsAt);
    if (data.capacity !== undefined) payload.capacity = data.capacity;
    if (data.location !== undefined) payload.location = data.location;
    if (data.notes !== undefined) payload.notes = data.notes;

    if (payload.startsAt && payload.endsAt && payload.endsAt <= payload.startsAt) {
      throw {
        message: "Slot endsAt must be after startsAt",
        code: "INVALID_DATES",
        status: "error",
        statusCode: 400,
      };
    }

    return await this.prisma.offeringSlot.updateMany({
      where: { id, tenant_id },
      data: payload,
    });
  }

  async deleteSlot(id: string, tenant_id: string) {
    return await this.prisma.offeringSlot.deleteMany({
      where: { id, tenant_id },
    });
  }

  /**
   * Capacity guard for a booked quantity (advisory check used at add-to-cart;
   * checkout performs the authoritative compensated increment).
   */
  async hasCapacity(
    tenant_id: string,
    slot_id: string,
    requestedQty: number,
  ): Promise<boolean> {
    const slot = await this.prisma.offeringSlot.findFirst({
      where: { id: slot_id, tenant_id },
      select: { capacity: true, bookedCount: true, startsAt: true },
    });
    if (!slot) return false;
    if (slot.startsAt.getTime() <= Date.now()) return false; // past slot
    if (slot.capacity == null) return true; // unlimited
    return slot.bookedCount + requestedQty <= slot.capacity;
  }
}
