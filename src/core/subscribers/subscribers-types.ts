import { Prisma } from "@prisma/client";

type Subscribers = Prisma.SubscriberGetPayload<{}>;
type Campaign = Prisma.CampaignGetPayload<{}>;
type SubscriberInput = Omit<Prisma.SubscriberCreateInput, "id" | "createdAt" | "updatedAt" | "tenant">;
type CampaignInput = Omit<Prisma.CampaignCreateInput, "id" | "createdAt" | "updatedAt" | "tenant">;

interface TenantEmailConfigInput {
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}

type SubscriberHandler = (app: FastifyInstance) => {
  createSubscriber: Handler<Omit<Subscribers, "id" | "createdAt" | "updatedAt" | "tenant_id">, Subscribers>;
  getSubscribers: Handler<void, { data: Subscribers[]; metadata: any }>;
  getSubscriberById: Handler<void, Subscribers, { subscriber_id?: string }>;
  updateSubscriber: Handler<void, Subscribers, { subscriber_id?: string }>;
  deleteSubscriber: Handler<void, void, { subscriber_id?: string }>;
  createList: Handler<{ name: string }, any>;
  getLists: Handler<void, { data: any[]; metadata: any }>;
  getListById: Handler<void, any, { list_id?: string }>;
  updateList: Handler<void, any, { list_id?: string }>;
  deleteList: Handler<void, void, { list_id?: string }>;
  addSubscriberToList: Handler<void, any, { subscriber_id?: string; list_id?: string }>;
  removeSubscriberFromList: Handler<void, void, { subscriber_id?: string; list_id?: string }>;
  createCampaign: Handler<Omit<Campaign, "id" | "createdAt" | "updatedAt" | "tenant_id">, Campaign>;
  getCampaigns: Handler<void, { data: Campaign[]; metadata: any }>;
  getCampaignById: Handler<void, Campaign, { campaign_id?: string }>;
  updateCampaign: Handler<void, Campaign, { campaign_id?: string }>;
  deleteCampaign: Handler<void, void, { campaign_id?: string }>;
  scheduleCampaign: Handler<{ scheduledAt: string }, Campaign, { campaign_id?: string }>;
  sendCampaignToSubscribers: Handler<{ listId?: string }, any, { campaign_id?: string }>;
  getEmailSends: Handler<void, { data: any[]; metadata: any }>;
  getEmailSendById: Handler<void, any, { email_send_id?: string }>;
  updateEmailSendStatus: Handler<void, any, { email_send_id?: string }>;
  createOrUpdateTenantEmailConfig: Handler<Omit<TenantEmailConfigInput, never>, any>;
  getTenantEmailConfig: Handler<void, any>;
  deleteTenantEmailConfig: Handler<void, void>;
};

export type { SubscriberHandler, SubscriberInput, CampaignInput, TenantEmailConfigInput };
