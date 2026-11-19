// Offering-domain configuration service (prompt 9, phase 9b).
// Tenant-defined offering types and per-product option groups/choices.
// Every operation is tenant-scoped; no industry-specific concepts exist here.
import { Prisma } from "@prisma/client";

export interface OfferingTypeInput {
  key: string;
  name: string;
  selectable?: boolean;
  scheduled?: boolean;
  participants?: boolean;
  deliverable?: boolean;
}

export interface OptionGroupInput {
  name: string;
  required?: boolean;
  min_select?: number;
  max_select?: number;
  position?: number;
}

export interface OptionChoiceInput {
  label: string;
  product_id?: string | null;
  price_delta?: number;
  active?: boolean;
}

export class OfferingService {
  prisma;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  // --- Offering types ------------------------------------------------------

  async createOfferingType(tenant_id: string, data: OfferingTypeInput) {
    return await this.prisma.offeringType
      .create({
        data: {
          tenant_id,
          key: data.key,
          name: data.name,
          selectable: data.selectable ?? false,
          scheduled: data.scheduled ?? false,
          participants: data.participants ?? false,
          deliverable: data.deliverable ?? false,
        },
      })
      .catch((error: any) => this.conflictOrRethrow(error));
  }

  async listOfferingTypes(tenant_id: string) {
    return await this.prisma.offeringType.findMany({
      where: { tenant_id },
      orderBy: { createdAt: "asc" },
    });
  }

  async getOfferingType(id: string, tenant_id: string) {
    return await this.prisma.offeringType.findFirst({
      where: { id, tenant_id },
    });
  }

  async updateOfferingType(id: string, tenant_id: string, data: Partial<OfferingTypeInput>) {
    const payload: Prisma.OfferingTypeUpdateManyMutationInput = {};
    if (data.key !== undefined) payload.key = data.key;
    if (data.name !== undefined) payload.name = data.name;
    for (const flag of ["selectable", "scheduled", "participants", "deliverable"] as const) {
      if (data[flag] !== undefined) payload[flag] = data[flag] as boolean;
    }

    return await this.prisma.offeringType
      .updateMany({ where: { id, tenant_id }, data: payload })
      .catch((error: any) => this.conflictOrRethrow(error));
  }

  async deleteOfferingType(id: string, tenant_id: string) {
    return await this.prisma.offeringType.deleteMany({
      where: { id, tenant_id },
    });
  }

  // --- Option groups -------------------------------------------------------

  async createOptionGroup(tenant_id: string, product_id: string, data: OptionGroupInput) {
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

    return await this.prisma.optionGroup.create({
      data: {
        tenant_id,
        product_id: product.id,
        name: data.name,
        required: data.required ?? false,
        min_select: data.min_select ?? 0,
        max_select: data.max_select ?? 1,
        position: data.position ?? 0,
      },
      include: { choices: true },
    });
  }

  async listOptionGroupsForProduct(tenant_id: string, product_id: string) {
    return await this.prisma.optionGroup.findMany({
      where: { tenant_id, product_id },
      include: { choices: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
  }

  async updateOptionGroup(id: string, tenant_id: string, data: Partial<OptionGroupInput>) {
    const payload: Prisma.OptionGroupUpdateManyMutationInput = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.required !== undefined) payload.required = data.required;
    if (data.min_select !== undefined) payload.min_select = data.min_select;
    if (data.max_select !== undefined) payload.max_select = data.max_select;
    if (data.position !== undefined) payload.position = data.position;

    return await this.prisma.optionGroup.updateMany({
      where: { id, tenant_id },
      data: payload,
    });
  }

  async deleteOptionGroup(id: string, tenant_id: string) {
    return await this.prisma.optionGroup.deleteMany({
      where: { id, tenant_id },
    });
  }

  // --- Option choices ------------------------------------------------------

  async addOptionChoice(tenant_id: string, group_id: string, data: OptionChoiceInput) {
    // Tenant scope: the group (and any linked product) must belong to the
    // caller's tenant.
    const group = await this.prisma.optionGroup.findFirst({
      where: { id: group_id, tenant_id },
      select: { id: true },
    });
    if (!group) {
      throw {
        message: "Option group not found",
        code: "OPTION_GROUP_NOT_FOUND",
        status: "error",
        statusCode: 404,
      };
    }

    if (data.product_id) {
      const linked = await this.prisma.product.findFirst({
        where: { id: data.product_id, tenant_id },
        select: { id: true },
      });
      if (!linked) {
        throw {
          message: "Linked product not found",
          code: "PRODUCT_NOT_FOUND",
          status: "error",
          statusCode: 404,
        };
      }
    }

    return await this.prisma.optionChoice.create({
      data: {
        tenant_id,
        group_id: group.id,
        label: data.label,
        product_id: data.product_id ?? null,
        price_delta: data.price_delta ?? 0,
        active: data.active ?? true,
      },
    });
  }

  async updateOptionChoice(id: string, tenant_id: string, data: Partial<OptionChoiceInput>) {
    const payload: Prisma.OptionChoiceUpdateManyMutationInput = {};
    if (data.label !== undefined) payload.label = data.label;
    if (data.price_delta !== undefined) payload.price_delta = data.price_delta;
    if (data.active !== undefined) payload.active = data.active;

    if (data.product_id !== undefined) {
      if (data.product_id === null) {
        (payload as any).product = { disconnect: true };
      } else {
        const linked = await this.prisma.product.findFirst({
          where: { id: data.product_id, tenant_id },
          select: { id: true },
        });
        if (!linked) {
          throw {
            message: "Linked product not found",
            code: "PRODUCT_NOT_FOUND",
            status: "error",
            statusCode: 404,
          };
        }
        (payload as any).product = { connect: { id: data.product_id } };
      }
    }

    // updateMany cannot set relation fields; the scoped update (extended
    // unique where) keeps the tenant constraint while allowing the link.
    try {
      await this.prisma.optionChoice.update({
        where: { id, tenant_id },
        data: payload,
      });
      return { count: 1 };
    } catch (error: any) {
      if (error?.code === "P2025") {
        return { count: 0 };
      }
      throw error;
    }
  }

  async deleteOptionChoice(id: string, tenant_id: string) {
    return await this.prisma.optionChoice.deleteMany({
      where: { id, tenant_id },
    });
  }

  private conflictOrRethrow(error: any): never {
    if (error?.code === "P2002") {
      throw {
        message: "An offering type with this key already exists",
        code: "DUPLICATE_KEY",
        status: "error",
        statusCode: 400,
      };
    }
    throw error;
  }
}
