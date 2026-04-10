import { $Enums, Prisma } from "@prisma/client";
import { createPagination } from "../../utils/pagination";

interface ListInput {
  tenant_id: string;
  name: string;
}

interface TenantEmailConfigInput {
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  tenant_id: string;
}

export class SubscriberService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async createSubscription(data: SubscriberInput) {
    return await this.prisma.subscriber.create({
      data,
      include: { _count: true, lists: true, sends: true },
    });
  }

  async getSubscriptions(
    tenant_id: string,
    page = 1,
    limit = 10,
    filter?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.SubscriberWhereInput = filter
      ? {
          tenant_id,
          OR: [
            { name: { contains: filter, mode: "insensitive" } },
            { email: { contains: filter, mode: "insensitive" } },
          ],
        }
      : { tenant_id };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscriber.findMany({
        where,
        include: {
          _count: true,
          lists: true,
          sends: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.subscriber.count({ where: { tenant_id } }), // Count with the same tenant_id filter
    ]);
    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async getSubscriptionById(tenant_id: string, id: string) {
    return await this.prisma.subscriber.findUnique({
      where: { id, tenant_id },
      include: { _count: true, lists: true, sends: true },
    });
  }

  async updateSubscription(
    tenant_id: string,
    id: string,
    data: Partial<SubscriberInput>,
  ) {
    return await this.prisma.subscriber.update({
      where: { id, tenant_id },
      data,
      include: { _count: true, lists: true, sends: true },
    });
  }

  async deleteSubscription(tenant_id: string, id: string) {
    return await this.prisma.subscriber.delete({
      where: { id, tenant_id },
    });
  }

  async addSubscriberToList(
    tenant_id: string,
    subscriberId: string,
    listId: string,
  ) {
    // Check if both subscriber and list belong to the tenant
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id: subscriberId, tenant_id },
    });
    const list = await this.prisma.list.findUnique({
      where: { id: listId, tenant_id },
    });

    if (!subscriber || !list) {
      throw new Error("Subscriber or List not found for this tenant.");
    }

    return await this.prisma.listSubscriber.create({
      data: {
        listId,
        subscriberId,
      },
    });
  }

  async removeSubscriberFromList(
    tenant_id: string,
    subscriberId: string,
    listId: string,
  ) {
    // Check if both subscriber and list belong to the tenant before deleting
    const listSubscriber = await this.prisma.listSubscriber.findUnique({
      where: {
        listId_subscriberId: {
          listId,
          subscriberId,
        },
      },
      include: {
        list: true,
        subscriber: true,
      },
    });

    if (
      !listSubscriber ||
      listSubscriber.list.tenant_id !== tenant_id ||
      listSubscriber.subscriber.tenant_id !== tenant_id
    ) {
      throw new Error(
        "List-Subscriber relationship not found for this tenant or relationship does not exist.",
      );
    }

    return await this.prisma.listSubscriber.delete({
      where: {
        listId_subscriberId: {
          listId,
          subscriberId,
        },
      },
    });
  }
}

export class ListService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async createList(data: ListInput) {
    return await this.prisma.list.create({
      data,
      include: { _count: true, subscribers: true },
    });
  }

  async getLists(tenant_id: string, page = 1, limit = 10, filter?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.ListWhereInput = filter
      ? {
          tenant_id,
          OR: [{ name: { contains: filter, mode: "insensitive" } }],
        }
      : { tenant_id };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.list.findMany({
        where,
        include: {
          _count: true,
          subscribers: {
            include: {
              subscriber: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.list.count({ where: { tenant_id } }),
    ]);
    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async getListById(tenant_id: string, id: string) {
    return await this.prisma.list.findUnique({
      where: { id, tenant_id },
      include: {
        _count: true,
        subscribers: {
          include: {
            subscriber: true,
          },
        },
      },
    });
  }

  async updateList(tenant_id: string, id: string, data: Partial<ListInput>) {
    return await this.prisma.list.update({
      where: { id, tenant_id },
      data,
      include: { _count: true, subscribers: true },
    });
  }

  async deleteList(tenant_id: string, id: string) {
    return await this.prisma.list.delete({
      where: { id, tenant_id },
    });
  }
}

export class CampaignService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async createCampaign(data: CampaignInput) {
    return await this.prisma.campaign.create({
      data,
      include: { _count: true, sends: true },
    });
  }

  async getCampaigns(tenant_id: string, page = 1, limit = 10, filter?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.CampaignWhereInput = filter
      ? {
          tenant_id,
          OR: [
            { subject: { contains: filter, mode: "insensitive" } },
            { htmlBody: { contains: filter, mode: "insensitive" } },
          ],
        }
      : { tenant_id };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        include: { _count: true, sends: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.campaign.count({ where: { tenant_id } }),
    ]);
    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async getCampaignById(tenant_id: string, id: string) {
    return await this.prisma.campaign.findUnique({
      where: { id, tenant_id },
      include: { _count: true, sends: true },
    });
  }

  async updateCampaign(
    tenant_id: string,
    id: string,
    data: Partial<CampaignInput>,
  ) {
    return await this.prisma.campaign.update({
      where: { id, tenant_id },
      data,
      include: { _count: true, sends: true },
    });
  }

  async deleteCampaign(tenant_id: string, id: string) {
    return await this.prisma.campaign.delete({
      where: { id, tenant_id },
    });
  }

  async scheduleCampaign(
    tenant_id: string,
    campaignId: string,
    scheduledAt: Date,
  ) {
    return await this.prisma.campaign.update({
      where: { id: campaignId, tenant_id },
      data: { status: "SCHEDULED", scheduledAt },
    });
  }

  async sendCampaignToSubscribers(
    tenant_id: string,
    campaignId: string,
    listId?: string,
  ) {
    // This is a simplified example. A real email sending mechanism would be more complex
    // and ideally handled by a dedicated email service or worker.
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId, tenant_id },
      include: { tenant: { include: { tenantEmailConfig: true } } },
    });

    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    if (campaign.status !== "SCHEDULED" && campaign.status !== "DRAFT") {
      throw new Error("Campaign cannot be sent in its current status.");
    }

    if (!campaign.tenant.tenantEmailConfig) {
      throw new Error(
        "Tenant email configuration not found. Cannot send emails.",
      );
    }

    let subscribersToEmail;

    if (listId) {
      const listSubscribers = await this.prisma.listSubscriber.findMany({
        where: { listId },
        include: { subscriber: true },
      });
      subscribersToEmail = listSubscribers.map((ls) => ls.subscriber);
    } else {
      subscribersToEmail = await this.prisma.subscriber.findMany({
        where: { tenant_id, status: "ACTIVE" }, // Only send to active subscribers
      });
    }

    const emailSendsData = subscribersToEmail.map((subscriber) => ({
      tenant_id: tenant_id,
      campaignId: campaignId,
      subscriberId: subscriber.id,
      status: "PENDING" as "PENDING", // Marking as pending for a real sender to pick up
    }));

    // Create EmailSend records in bulk
    const createdSends = await this.prisma.emailSend.createManyAndReturn({
      data: emailSendsData,
      skipDuplicates: true,
    });

    // Update campaign status
    await this.prisma.campaign.update({
      where: { id: campaignId, tenant_id },
      data: {
        status: "SENT",
        sends: { connect: createdSends.map((s) => ({ id: s.id })) },
      },
    });

    return createdSends;
  }
}

export class EmailSendService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async getEmailSends(
    tenant_id: string,
    page = 1,
    limit = 10,
    filter?: string,
    campaignId?: string,
    subscriberId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.EmailSendWhereInput = {
      tenant_id,
      ...(campaignId && { campaignId }),
      ...(subscriberId && { subscriberId }),
      ...(filter && {
        OR: [
          { campaign: { subject: { contains: filter, mode: "insensitive" } } },
          { subscriber: { email: { contains: filter, mode: "insensitive" } } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.emailSend.findMany({
        where,
        include: { campaign: true, subscriber: true },
        skip,
        take: limit,
        orderBy: { sentAt: "desc" },
      }),
      this.prisma.emailSend.count({ where }),
    ]);
    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async getEmailSendById(tenant_id: string, id: string) {
    return await this.prisma.emailSend.findUnique({
      where: { id, tenant_id },
      include: { campaign: true, subscriber: true },
    });
  }

  async updateEmailSendStatus(
    tenant_id: string,
    id: string,
    status: $Enums.EmailSendStatus,
    error?: string,
  ) {
    return await this.prisma.emailSend.update({
      where: { id, tenant_id },
      data: {
        status,
        error,
        sentAt: status === "SENT" ? new Date() : undefined,
      },
    });
  }
}

export class TenantEmailConfigService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async createOrUpdateTenantEmailConfig(
    tenant_id: string,
    data: Omit<TenantEmailConfigInput, "tenant_id">,
  ) {
    return await this.prisma.tenantEmailConfig.upsert({
      where: { tenant_id },
      update: data,
      create: {
        ...data,
        tenant_id,
      },
    });
  }

  async getTenantEmailConfig(tenant_id: string) {
    return await this.prisma.tenantEmailConfig.findUnique({
      where: { tenant_id },
    });
  }

  async deleteTenantEmailConfig(tenant_id: string) {
    return await this.prisma.tenantEmailConfig.delete({
      where: { tenant_id },
    });
  }
}
