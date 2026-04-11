export class SettingsService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async getSettings(tenant_id: string) {
    return await this.prisma.tenantSettings.findUnique({
      where: { tenant_id },
    });
  }

  async updateSettings(
    tenant_id: string,
    data: {
      storeName?: string;
      storeLogo?: string;
      storeDescription?: string;
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
      timezone?: string;
      currency?: string;
      taxRate?: number;
      notificationPreferences?: any;
    }
  ) {
    const existing = await this.prisma.tenantSettings.findUnique({
      where: { tenant_id },
    });

    if (existing) {
      return await this.prisma.tenantSettings.update({
        where: { tenant_id },
        data: {
          ...(data.storeName !== undefined && { storeName: data.storeName }),
          ...(data.storeLogo !== undefined && { storeLogo: data.storeLogo }),
          ...(data.storeDescription !== undefined && { storeDescription: data.storeDescription }),
          ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
          ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.timezone !== undefined && { timezone: data.timezone }),
          ...(data.currency !== undefined && { currency: data.currency }),
          ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
          ...(data.notificationPreferences !== undefined && { notificationPreferences: data.notificationPreferences }),
        },
      });
    }

    return await this.prisma.tenantSettings.create({
      data: {
        tenant_id,
        storeName: data.storeName,
        storeLogo: data.storeLogo,
        storeDescription: data.storeDescription,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        timezone: data.timezone || "Africa/Lagos",
        currency: data.currency || "NGN",
        taxRate: data.taxRate || 0,
        notificationPreferences: data.notificationPreferences,
      },
    });
  }

  async updateStoreBranding(tenant_id: string, data: { storeName?: string; storeLogo?: string; storeDescription?: string }) {
    return this.updateSettings(tenant_id, data);
  }

  async updateContactInfo(tenant_id: string, data: { contactEmail?: string; contactPhone?: string; address?: string }) {
    return this.updateSettings(tenant_id, data);
  }

  async updatePreferences(tenant_id: string, data: { timezone?: string; currency?: string; taxRate?: number }) {
    return this.updateSettings(tenant_id, data);
  }

  async deleteSettings(tenant_id: string) {
    return await this.prisma.tenantSettings.deleteMany({
      where: { tenant_id },
    });
  }
}
