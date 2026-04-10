type Subscribers = import("@prisma/client").Subscriber;
type Campaign = import("@prisma/client").Campaign;
type CampaignInput = InputType<Campaign>;
type SubscriberInput = InputType<Subscribers>;
type SubscriberList = Subscribers[];

type SubscriberHandler = (app: FastifyInstance) => {
  createSubscriber: Handler<
    Omit<SubscriberInput, "tenant_id" | "status">,
    Subscribers | void
  >;
  getSubscribers: PaginatedHandler<
    void,
    any,
    { tenant_id?: string },
    { page: string; limit: string; filter: string }
  >;
  getSubscriberById: Handler<void, Subscribers, { subscriber_id?: string }>;
  updateSubscriber: Handler;
  deleteSubscriber: Handler;
  createList: Handler;
  getLists: Handler;
  getListById: Handler;
  updateList: Handler;
  deleteList: Handler;
  addSubscriberToList: Handler;
  removeSubscriberFromList: Handler;
  createCampaign: Handler;
  getCampaigns: Handler;
  getCampaignById: Handler;
  updateCampaign: Handler;
  deleteCampaign: Handler;
  scheduleCampaign: Handler;
  sendCampaignToSubscribers: Handler;
  getEmailSends: Handler;
  getEmailSendById: Handler;
  updateEmailSendStatus: Handler;
  createOrUpdateTenantEmailConfig: Handler;
  getTenantEmailConfig: Handler;
  deleteTenantEmailConfig: Handler;
};
