import StatusCode from "status-code-enum";
import {
  CASErrorCode,
  CASErrorMessage,
  CASSuccessCode,
  CASSuccessMessage,
} from "../../utils/enums";
import {
  SubscriberService,
  ListService,
  CampaignService,
  EmailSendService,
  TenantEmailConfigService,
} from "./subscribers-service";

export const emailMarketingHandler: SubscriberHandler = (app) => {
  const subscriberService = new SubscriberService(app.prisma);
  const listService = new ListService(app.prisma);
  const campaignService = new CampaignService(app.prisma);
  const emailSendService = new EmailSendService(app.prisma);
  const tenantEmailConfigService = new TenantEmailConfigService(app.prisma);

  return {
    // Subscriber Handlers
    createSubscriber: async (request, reply) => {
      if (!request.tenant) {
        throw {
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorUnauthorized,
        };
      }
      const { id: tenant_id } = request.tenant;
      const body = request.body;

      try {
        const subscriber = await subscriberService.createSubscription({
          tenant_id,
          status: "ACTIVE",
          ...body,
        });
        return reply.status(StatusCode.SuccessCreated).send({
          message: CASSuccessMessage.DATA_CREATED,
          code: CASSuccessCode.DATA_CREATED,
          status: "success",
          data: subscriber,
        });
      } catch (error: any) {
        console.log("error", error);
      }
    },

    getSubscribers: async (request, reply) => {
      if (!request.tenant) {
        throw {
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorUnauthorized,
        };
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, filter } = request.query;

      try {
        const subscribers = await subscriberService.getSubscriptions(
          tenant_id,
          Number(page),
          Number(limit),
          filter,
        );
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
          data: subscribers,
        });
      } catch (error: any) {
        console.log("error", error);
      }
    },

    getSubscriberById: async (request, reply) => {
      if (!request.tenant) {
        throw {
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
          status: "error",
          statusCode: StatusCode.ClientErrorUnauthorized,
        };
      }
      const { id: tenant_id } = request.tenant;
      const { subscriber_id } = request.params;

      try {
        const subscriber = await subscriberService.getSubscriptionById(
          tenant_id,
          subscriber_id!,
        );
        if (!subscriber) {
          return reply
            .status(StatusCode.ClientErrorNotFound)
            .send({ status: "error", message: "Subscriber not found" });
        }
        return reply.status(StatusCode.SuccessOK).send({
          data: subscriber,
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    updateSubscriber: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { subscriber_id } = request.params;
      const body = request.body;

      try {
        const updatedSubscriber = await subscriberService.updateSubscription(
          tenant_id,
          subscriber_id!,
          body,
        );
        return reply.status(StatusCode.SuccessOK).send({
          data: updatedSubscriber,
          message: CASSuccessMessage.DATA_UPDATED,
          code: CASSuccessCode.DATA_UPDATED,
          status: "success",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    deleteSubscriber: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { subscriber_id } = request.params;

      try {
        await subscriberService.deleteSubscription(tenant_id, subscriber_id!);
        return reply.status(StatusCode.SuccessNoContent).send({
          code: CASSuccessCode.DATA_DELETED,
          message: CASSuccessMessage.DATA_DELETED,
          status: "success",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    // List Handlers
    createList: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const body = request.body;

      try {
        const list = await listService.createList({ tenant_id, ...body });
        return reply.status(StatusCode.SuccessCreated).send({
          message: CASSuccessMessage.DATA_CREATED,
          code: CASSuccessCode.DATA_CREATED,
          status: "success",
          data: list,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    getLists: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, filter } = request.query;

      try {
        const lists = await listService.getLists(
          tenant_id,
          page,
          limit,
          filter,
        );
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
          data: lists,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    getListById: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { list_id } = request.params;

      try {
        const list = await listService.getListById(tenant_id, list_id!);
        if (!list) {
          return reply
            .status(StatusCode.ClientErrorNotFound)
            .send({ status: "error", message: "List not found" });
        }
        return reply.status(StatusCode.SuccessOK).send({
          data: list,
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    updateList: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { list_id } = request.params;
      const body = request.body;

      try {
        const updatedList = await listService.updateList(
          tenant_id,
          list_id!,
          body,
        );
        return reply.status(StatusCode.SuccessOK).send({
          data: updatedList,
          message: CASSuccessMessage.DATA_UPDATED,
          code: CASSuccessCode.DATA_UPDATED,
          status: "success",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    deleteList: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { list_id } = request.params;

      try {
        await listService.deleteList(tenant_id, list_id!);
        return reply.status(StatusCode.SuccessNoContent).send({
          code: CASSuccessCode.DATA_DELETED,
          message: CASSuccessMessage.DATA_DELETED,
          status: "success",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    addSubscriberToList: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { subscriber_id, list_id } = request.params;

      if (!subscriber_id || !list_id) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: "Subscriber ID and List ID are required.",
        });
      }

      try {
        const result = await subscriberService.addSubscriberToList(
          tenant_id,
          subscriber_id,
          list_id,
        );
        return reply.status(StatusCode.SuccessCreated).send({
          message: "Subscriber added to list successfully",
          code: CASSuccessCode.DATA_CREATED,
          status: "success",
          data: result,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    removeSubscriberFromList: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { subscriber_id, list_id } = request.params;

      if (!subscriber_id || !list_id) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: "Subscriber ID and List ID are required.",
        });
      }

      try {
        await subscriberService.removeSubscriberFromList(
          tenant_id,
          subscriber_id,
          list_id,
        );
        return reply.status(StatusCode.SuccessNoContent).send({
          code: CASSuccessCode.DATA_DELETED,
          message: "Subscriber removed from list successfully",
          status: "success",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    // Campaign Handlers
    createCampaign: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const body = request.body;

      try {
        const campaign = await campaignService.createCampaign({
          tenant_id,
          ...body,
        });
        return reply.status(StatusCode.SuccessCreated).send({
          message: CASSuccessMessage.DATA_CREATED,
          code: CASSuccessCode.DATA_CREATED,
          status: "success",
          data: campaign,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    getCampaigns: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, filter } = request.query;

      try {
        const campaigns = await campaignService.getCampaigns(
          tenant_id,
          page,
          limit,
          filter,
        );
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
          data: campaigns,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    getCampaignById: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { campaign_id } = request.params;

      try {
        const campaign = await campaignService.getCampaignById(
          tenant_id,
          campaign_id!,
        );
        if (!campaign) {
          return reply
            .status(StatusCode.ClientErrorNotFound)
            .send({ status: "error", message: "Campaign not found" });
        }
        return reply.status(StatusCode.SuccessOK).send({
          data: campaign,
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    updateCampaign: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { campaign_id } = request.params;
      const body = request.body;

      try {
        const updatedCampaign = await campaignService.updateCampaign(
          tenant_id,
          campaign_id!,
          body,
        );
        return reply.status(StatusCode.SuccessOK).send({
          data: updatedCampaign,
          message: CASSuccessMessage.DATA_UPDATED,
          code: CASSuccessCode.DATA_UPDATED,
          status: "success",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    deleteCampaign: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { campaign_id } = request.params;

      try {
        await campaignService.deleteCampaign(tenant_id, campaign_id!);
        return reply.status(StatusCode.SuccessNoContent).send({
          code: CASSuccessCode.DATA_DELETED,
          message: CASSuccessMessage.DATA_DELETED,
          status: "success",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    scheduleCampaign: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { campaign_id } = request.params;
      const { scheduledAt } = request.body;

      try {
        const updatedCampaign = await campaignService.scheduleCampaign(
          tenant_id,
          campaign_id!,
          new Date(scheduledAt),
        );
        return reply.status(StatusCode.SuccessOK).send({
          data: updatedCampaign,
          message: CASSuccessMessage.DATA_UPDATED,
          code: CASSuccessCode.DATA_UPDATED,
          status: "success",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    sendCampaignToSubscribers: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { campaign_id } = request.params;
      const { listId } = request.body; // Optional list ID to send to specific list

      try {
        const emailSends = await campaignService.sendCampaignToSubscribers(
          tenant_id,
          campaign_id!,
          listId,
        );
        return reply.status(StatusCode.SuccessAccepted).send({
          message: "Campaign send initiated",
          code: CASSuccessCode.DATA_CREATED,
          status: "success",
          data: { emailSendsCount: emailSends.count },
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    // EmailSend Handlers
    getEmailSends: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, filter, campaignId, subscriberId } = request.query;

      try {
        const emailSends = await emailSendService.getEmailSends(
          tenant_id,
          page,
          limit,
          filter,
          campaignId,
          subscriberId,
        );
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
          data: emailSends,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    getEmailSendById: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { email_send_id } = request.params;

      try {
        const emailSend = await emailSendService.getEmailSendById(
          tenant_id,
          email_send_id!,
        );
        if (!emailSend) {
          return reply
            .status(StatusCode.ClientErrorNotFound)
            .send({ status: "error", message: "Email send record not found" });
        }
        return reply.status(StatusCode.SuccessOK).send({
          data: emailSend,
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    updateEmailSendStatus: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const { email_send_id } = request.params;
      const { status, error } = request.body; // Expecting 'status' and optionally 'error'

      try {
        const updatedEmailSend = await emailSendService.updateEmailSendStatus(
          tenant_id,
          email_send_id!,
          status,
          error,
        );
        return reply.status(StatusCode.SuccessOK).send({
          data: updatedEmailSend,
          message: CASSuccessMessage.DATA_UPDATED,
          code: CASSuccessCode.DATA_UPDATED,
          status: "success",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    // TenantEmailConfig Handlers
    createOrUpdateTenantEmailConfig: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;
      const body = request.body;

      try {
        const config =
          await tenantEmailConfigService.createOrUpdateTenantEmailConfig(
            tenant_id,
            body,
          );
        return reply.status(StatusCode.SuccessOK).send({
          message: CASSuccessMessage.DATA_UPDATED,
          code: CASSuccessCode.DATA_UPDATED,
          status: "success",
          data: config,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    getTenantEmailConfig: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;

      try {
        const config =
          await tenantEmailConfigService.getTenantEmailConfig(tenant_id);
        if (!config) {
          return reply.status(StatusCode.ClientErrorNotFound).send({
            status: "error",
            message: "Tenant email config not found",
          });
        }
        return reply.status(StatusCode.SuccessOK).send({
          data: config,
          status: "success",
          code: CASSuccessCode.DATA_RETRIEVED,
          message: CASSuccessMessage.DATA_RETRIEVED,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },

    deleteTenantEmailConfig: async (request, reply) => {
      if (!request.tenant) {
        return reply
          .status(StatusCode.ClientErrorUnauthorized)
          .send({ message: "Tenant not found" });
      }
      const { id: tenant_id } = request.tenant;

      try {
        await tenantEmailConfigService.deleteTenantEmailConfig(tenant_id);
        return reply.status(StatusCode.SuccessNoContent).send({
          code: CASSuccessCode.DATA_DELETED,
          message: CASSuccessMessage.DATA_DELETED,
          status: "success",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
        });
      }
    },
  };
};
