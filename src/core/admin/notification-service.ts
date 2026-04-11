export class NotificationService {
  prisma: PrismaClientType;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
  }

  async sendEmail(to: string, subject: string, body: string, tenant_id: string) {
    const emailConfig = await this.prisma.tenantEmailConfig.findUnique({
      where: { tenant_id },
    });

    if (!emailConfig) {
      throw new Error("Email configuration not set up");
    }

    return {
      sent: true,
      to,
      subject,
      body,
      timestamp: new Date(),
      provider: "smtp",
      config: {
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        fromName: emailConfig.fromName,
        fromEmail: emailConfig.fromEmail,
      },
    };
  }

  async sendPushNotification(user_id: string, title: string, body: string, data?: any) {
    const pushTokens = await this.prisma.pushToken.findMany({
      where: { user_id, active: true },
    });

    if (pushTokens.length === 0) {
      throw new Error("No push tokens registered for user");
    }

    const results = await Promise.allSettled(
      pushTokens.map(async (token) => {
        return {
          token: token.token,
          platform: token.platform,
          sent: true,
          title,
          body,
          data,
          timestamp: new Date(),
        };
      })
    );

    return {
      sent: true,
      totalTokens: pushTokens.length,
      results,
    };
  }

  async sendSMS(phone: string, message: string, tenant_id: string) {
    return {
      sent: true,
      to: phone,
      message,
      provider: "finecore",
      timestamp: new Date(),
    };
  }

  async sendInApp(user_id: string, tenant_id: string, title: string, body: string, data?: any) {
    const notification = await this.prisma.notification.create({
      data: {
        tenant_id,
        user_id,
        type: "IN_APP" as any,
        title,
        body,
        data,
        status: "PENDING" as any,
      },
    });

    return notification;
  }

  async notifyAdmins(tenant_id: string, title: string, body: string, data?: any, type: "EMAIL" | "PUSH" | "IN_APP" = "IN_APP") {
    const admins = await this.prisma.user.findMany({
      where: { tenant_id, role: { in: ["OWNER", "ADMIN"] } },
    });

    const results = await Promise.allSettled(
      admins.map(async (admin) => {
        switch (type) {
          case "EMAIL":
            return this.sendEmail(admin.email, title, body, tenant_id);
          case "PUSH":
            try {
              return await this.sendPushNotification(admin.id, title, body, data);
            } catch {
              return this.sendInApp(admin.id, tenant_id, title, body, data);
            }
          case "IN_APP":
          default:
            return this.sendInApp(admin.id, tenant_id, title, body, data);
        }
      })
    );

    return { notified: admins.length, results };
  }

  async createNotification(data: {
    tenant_id: string;
    user_id?: string;
    type: "EMAIL" | "PUSH" | "SMS" | "IN_APP";
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    title: string;
    body: string;
    data?: any;
  }) {
    return await this.prisma.notification.create({
      data: {
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        type: data.type as any,
        priority: (data.priority || "NORMAL") as any,
        title: data.title,
        body: data.body,
        data: data.data,
      },
    });
  }

  async getNotifications(tenant_id: string, user_id?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { tenant_id };
    if (user_id) where.user_id = user_id;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      metadata: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(notification_id: string, tenant_id: string) {
    return await this.prisma.notification.updateMany({
      where: { id: notification_id, tenant_id },
      data: { status: "READ" as any, readAt: new Date() },
    });
  }

  async markAllAsRead(tenant_id: string, user_id?: string) {
    const where: any = { tenant_id, status: { not: "READ" as any } };
    if (user_id) where.user_id = user_id;

    return await this.prisma.notification.updateMany({
      where,
      data: { status: "READ" as any, readAt: new Date() },
    });
  }

  async getUnreadCount(tenant_id: string, user_id?: string) {
    const where: any = { tenant_id, status: { not: "READ" as any } };
    if (user_id) where.user_id = user_id;

    return await this.prisma.notification.count({ where });
  }

  async createTemplate(data: {
    tenant_id: string;
    name: string;
    type: "EMAIL" | "PUSH" | "SMS" | "IN_APP";
    subject?: string;
    body: string;
    variables?: any;
  }) {
    return await this.prisma.notificationTemplate.create({
      data: {
        tenant_id: data.tenant_id,
        name: data.name,
        type: data.type as any,
        subject: data.subject,
        body: data.body,
        variables: data.variables,
      },
    });
  }

  async getTemplates(tenant_id: string) {
    return await this.prisma.notificationTemplate.findMany({
      where: { tenant_id },
      orderBy: { name: "asc" },
    });
  }

  async updateTemplate(template_id: string, tenant_id: string, data: any) {
    return await this.prisma.notificationTemplate.updateMany({
      where: { id: template_id, tenant_id },
      data,
    });
  }

  async registerPushToken(user_id: string, token: string, platform: string) {
    return await this.prisma.pushToken.upsert({
      where: { user_id_token: { user_id, token } },
      update: { active: true, platform },
      create: { user_id, token, platform },
    });
  }

  async removePushToken(user_id: string, token: string) {
    return await this.prisma.pushToken.updateMany({
      where: { user_id, token },
      data: { active: false },
    });
  }

  async getPushTokens(user_id: string) {
    return await this.prisma.pushToken.findMany({
      where: { user_id, active: true },
    });
  }

  async getPreferences(user_id: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { user_id },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { user_id },
      });
    }

    return prefs;
  }

  async updatePreferences(user_id: string, data: any) {
    return await this.prisma.notificationPreference.upsert({
      where: { user_id },
      update: data,
      create: { user_id, ...data },
    });
  }

  async parseTemplate(templateBody: string, variables: Record<string, string>) {
    let parsed = templateBody;
    for (const [key, value] of Object.entries(variables)) {
      parsed = parsed.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return parsed;
  }

  async sendFromTemplate(
    tenant_id: string,
    templateName: string,
    user_id: string,
    variables: Record<string, string>,
    sendTo?: { email?: string; push?: boolean; inApp?: boolean }
  ) {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: { tenant_id, name: templateName, active: true },
    });

    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const parsedBody = await this.parseTemplate(template.body, variables);
    const parsedSubject = template.subject
      ? await this.parseTemplate(template.subject, variables)
      : null;

    const results: any = {};

    if (sendTo?.email || (!sendTo && template.type === "EMAIL")) {
      const email = sendTo?.email || (await this.prisma.user.findUnique({ where: { id: user_id } }))?.email;
      if (email) {
        results.email = await this.sendEmail(email, parsedSubject!, parsedBody, tenant_id);
      }
    }

    if (sendTo?.push || (!sendTo && template.type === "PUSH")) {
      try {
        results.push = await this.sendPushNotification(user_id, parsedSubject || "Notification", parsedBody);
      } catch {
        results.push = { error: "No push tokens" };
      }
    }

    if (sendTo?.inApp || (!sendTo && template.type === "IN_APP")) {
      results.inApp = await this.sendInApp(user_id, tenant_id, parsedSubject || "Notification", parsedBody);
    }

    return results;
  }

  async notifyEvent(tenant_id: string, event: string, data: any) {
    const admins = await this.prisma.user.findMany({
      where: { tenant_id, role: { in: ["OWNER", "ADMIN"] } },
      include: { preferences: true },
    });

    const results = await Promise.allSettled(
      admins.map(async (admin) => {
        const prefs = admin.preferences || (await this.getPreferences(admin.id));

        switch (event) {
          case "new_sale":
            if (prefs.notifyOnSale) {
              return this.sendInApp(admin.id, tenant_id, "New Sale!", `A new sale of ₦${data.amount} was made.`, data);
            }
            break;
          case "payment_received":
            if (prefs.notifyOnPayment) {
              return this.sendInApp(admin.id, tenant_id, "Payment Received", `Payment of ₦${data.amount} received.`, data);
            }
            break;
          case "low_stock":
            if (prefs.notifyOnLowStock) {
              return this.sendInApp(admin.id, tenant_id, "Low Stock Alert", `${data.product} is running low (${data.quantity} left).`, data);
            }
            break;
          case "new_user":
            if (prefs.notifyOnNewUser) {
              return this.sendInApp(admin.id, tenant_id, "New User", `${data.name} (${data.email}) has joined.`, data);
            }
            break;
          case "campaign_sent":
            if (prefs.notifyOnCampaign) {
              return this.sendInApp(admin.id, tenant_id, "Campaign Sent", `Campaign "${data.subject}" sent to ${data.recipients} recipients.`, data);
            }
            break;
          default:
            return this.sendInApp(admin.id, tenant_id, event, JSON.stringify(data), data);
        }
      })
    );

    return { notified: admins.length, results };
  }
}
