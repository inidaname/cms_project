import { FinecoreClient } from "./finecore-client";

export async function createTenantFinecoreClient(
  tenantId: string,
  prisma: PrismaClientType
): Promise<FinecoreClient | null> {
  const config = await prisma.tenantFinecoreConfig.findUnique({
    where: { tenant_id: tenantId },
  });

  if (!config || !config.apiKey) {
    return null;
  }

  const baseUrl = "https://api.finecore.co/v1";

  return new FinecoreClient({
    baseUrl,
    apiKey: config.apiKey,
  });
}

export async function getFinecoreWebhookSecret(
  tenantId: string,
  prisma: PrismaClientType
): Promise<string | null> {
  const config = await prisma.tenantFinecoreConfig.findUnique({
    where: { tenant_id: tenantId },
  });
  return config?.webhookSecret || null;
}
