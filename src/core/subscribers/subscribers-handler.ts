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
import { SubscriberInput, CampaignInput, TenantEmailConfigInput, SubscriberHandler } from "./subscribers-types";

interface ScheduleCampaignBody {
  scheduledAt: string;
}

interface SendCampaignBody {
  listId?: string;
}

interface UpdateEmailSendBody {
  status: string;
  error?: string;
}

type GenericResponse = {
  status: "success" | "error";
  message?: string;
  code?: string;
  data?: any;
};

export const emailMarketingHandler: SubscriberHandler = (app) => {
  const subscriberService = new SubscriberService(app.prisma);
  const listService = new ListService(app.prisma);
  const campaignService = new CampaignService(app.prisma);
  const emailSendService = new EmailSendService(app.prisma);
  const tenantEmailConfigService = new TenantEmailConfigService(app.prisma);

  const sendError = (reply: any, statusCode: StatusCode, message: string, code: string) => {
    return reply.status(statusCode).send({
      status: "error",
      message,
      code,
    } as GenericResponse);
  };

  const sendSuccess = (reply: any, statusCode: StatusCode, data?: any, message?: string, code?: string) => {
    return reply.status(statusCode).send({
      status: "success",
      message: message || CASSuccessMessage.OPERATION_SUCCESSFUL,
      code: code || CASSuccessCode.OPERATION_SUCCESSFUL,
      ...(data !== undefined && { data }),
    } as GenericResponse);
  };

  return {
    createSubscriber: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const body = request.body as Omit<SubscriberInput, "tenant_id" | "status">;

      try {
        const subscriber = await subscriberService.createSubscription({
          tenant_id,
          status: "ACTIVE",
          ...body,
        } as any);
        return sendSuccess(reply, StatusCode.SuccessCreated, subscriber, CASSuccessMessage.DATA_CREATED, CASSuccessCode.DATA_CREATED);
      } catch (error: any) {
        console.log("error", error);
      }
    },

    getSubscribers: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, filter } = request.query as { page: string; limit: string; filter: string };

      try {
        const subscribers = await subscriberService.getSubscriptions(
          tenant_id,
          Number(page),
          Number(limit),
          filter,
        );
        return sendSuccess(reply, StatusCode.SuccessOK, subscribers, CASSuccessMessage.DATA_RETRIEVED, CASSuccessCode.DATA_RETRIEVED);
      } catch (error: any) {
        console.log("error", error);
      }
    },

    getSubscriberById: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { subscriber_id } = request.params as { subscriber_id?: string };

      try {
        const subscriber = await subscriberService.getSubscriptionById(
          tenant_id,
          subscriber_id!,
        );
        if (!subscriber) {
          return sendError(reply, StatusCode.ClientErrorNotFound, CASErrorMessage.SUBSCRIBER_NOT_FOUND, CASErrorCode.SUBSCRIBER_NOT_FOUND);
        }
        return sendSuccess(reply, StatusCode.SuccessOK, subscriber, CASSuccessMessage.DATA_RETRIEVED, CASSuccessCode.DATA_RETRIEVED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    updateSubscriber: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { subscriber_id } = request.params as { subscriber_id?: string };
      const body = request.body as Partial<SubscriberInput>;

      try {
        const updatedSubscriber = await subscriberService.updateSubscription(
          tenant_id,
          subscriber_id!,
          body,
        );
        return sendSuccess(reply, StatusCode.SuccessOK, updatedSubscriber, CASSuccessMessage.DATA_UPDATED, CASSuccessCode.DATA_UPDATED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    deleteSubscriber: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { subscriber_id } = request.params as { subscriber_id?: string };

      try {
        await subscriberService.deleteSubscription(tenant_id, subscriber_id!);
        return sendSuccess(reply, StatusCode.SuccessNoContent, undefined, CASSuccessMessage.DATA_DELETED, CASSuccessCode.DATA_DELETED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    createList: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const body = request.body as { name: string };

      try {
        const list = await listService.createList({ tenant_id, ...body } as any);
        return sendSuccess(reply, StatusCode.SuccessCreated, list, CASSuccessMessage.DATA_CREATED, CASSuccessCode.DATA_CREATED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    getLists: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, filter } = request.query as { page?: string; limit?: string; filter?: string };

      try {
        const lists = await listService.getLists(
          tenant_id,
          page ? Number(page) : undefined,
          limit ? Number(limit) : undefined,
          filter,
        );
        return sendSuccess(reply, StatusCode.SuccessOK, lists, CASSuccessMessage.DATA_RETRIEVED, CASSuccessCode.DATA_RETRIEVED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    getListById: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { list_id } = request.params as { list_id?: string };

      try {
        const list = await listService.getListById(tenant_id, list_id!);
        if (!list) {
          return sendError(reply, StatusCode.ClientErrorNotFound, CASErrorMessage.LIST_NOT_FOUND, CASErrorCode.LIST_NOT_FOUND);
        }
        return sendSuccess(reply, StatusCode.SuccessOK, list, CASSuccessMessage.DATA_RETRIEVED, CASSuccessCode.DATA_RETRIEVED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    updateList: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { list_id } = request.params as { list_id?: string };
      const body = request.body as Partial<{ name: string }>;

      try {
        const updatedList = await listService.updateList(
          tenant_id,
          list_id!,
          body,
        );
        return sendSuccess(reply, StatusCode.SuccessOK, updatedList, CASSuccessMessage.DATA_UPDATED, CASSuccessCode.DATA_UPDATED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    deleteList: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { list_id } = request.params as { list_id?: string };

      try {
        await listService.deleteList(tenant_id, list_id!);
        return sendSuccess(reply, StatusCode.SuccessNoContent, undefined, CASSuccessMessage.DATA_DELETED, CASSuccessCode.DATA_DELETED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    addSubscriberToList: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { subscriber_id, list_id } = request.params as { subscriber_id?: string; list_id?: string };

      if (!subscriber_id || !list_id) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, CASErrorMessage.MISSING_REQUIRED_FIELD, CASErrorCode.MISSING_REQUIRED_FIELD);
      }

      try {
        const result = await subscriberService.addSubscriberToList(
          tenant_id,
          subscriber_id,
          list_id,
        );
        return sendSuccess(reply, StatusCode.SuccessCreated, result, CASSuccessMessage.SUBSCRIBER_ADDED_TO_LIST, CASSuccessCode.DATA_CREATED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    removeSubscriberFromList: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { subscriber_id, list_id } = request.params as { subscriber_id?: string; list_id?: string };

      if (!subscriber_id || !list_id) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, CASErrorMessage.MISSING_REQUIRED_FIELD, CASErrorCode.MISSING_REQUIRED_FIELD);
      }

      try {
        await subscriberService.removeSubscriberFromList(
          tenant_id,
          subscriber_id,
          list_id,
        );
        return sendSuccess(reply, StatusCode.SuccessNoContent, undefined, CASSuccessMessage.SUBSCRIBER_REMOVED_FROM_LIST, CASSuccessCode.DATA_DELETED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    createCampaign: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const body = request.body as CampaignInput;

      try {
        const campaign = await campaignService.createCampaign({
          tenant_id,
          ...body,
        } as any);
        return sendSuccess(reply, StatusCode.SuccessCreated, campaign, CASSuccessMessage.DATA_CREATED, CASSuccessCode.DATA_CREATED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    getCampaigns: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, filter } = request.query as { page?: string; limit?: string; filter?: string };

      try {
        const campaigns = await campaignService.getCampaigns(
          tenant_id,
          page ? Number(page) : undefined,
          limit ? Number(limit) : undefined,
          filter,
        );
        return sendSuccess(reply, StatusCode.SuccessOK, campaigns, CASSuccessMessage.DATA_RETRIEVED, CASSuccessCode.DATA_RETRIEVED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    getCampaignById: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { campaign_id } = request.params as { campaign_id?: string };

      try {
        const campaign = await campaignService.getCampaignById(
          tenant_id,
          campaign_id!,
        );
        if (!campaign) {
          return sendError(reply, StatusCode.ClientErrorNotFound, CASErrorMessage.CAMPAIGN_NOT_FOUND, CASErrorCode.CAMPAIGN_NOT_FOUND);
        }
        return sendSuccess(reply, StatusCode.SuccessOK, campaign, CASSuccessMessage.DATA_RETRIEVED, CASSuccessCode.DATA_RETRIEVED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    updateCampaign: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { campaign_id } = request.params as { campaign_id?: string };
      const body = request.body as Partial<CampaignInput>;

      try {
        const updatedCampaign = await campaignService.updateCampaign(
          tenant_id,
          campaign_id!,
          body,
        );
        return sendSuccess(reply, StatusCode.SuccessOK, updatedCampaign, CASSuccessMessage.DATA_UPDATED, CASSuccessCode.DATA_UPDATED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    deleteCampaign: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { campaign_id } = request.params as { campaign_id?: string };

      try {
        await campaignService.deleteCampaign(tenant_id, campaign_id!);
        return sendSuccess(reply, StatusCode.SuccessNoContent, undefined, CASSuccessMessage.DATA_DELETED, CASSuccessCode.DATA_DELETED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    scheduleCampaign: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { campaign_id } = request.params as { campaign_id?: string };
      const { scheduledAt } = request.body as ScheduleCampaignBody;

      try {
        const updatedCampaign = await campaignService.scheduleCampaign(
          tenant_id,
          campaign_id!,
          new Date(scheduledAt),
        );
        return sendSuccess(reply, StatusCode.SuccessOK, updatedCampaign, CASSuccessMessage.CAMPAIGN_SCHEDULED, CASSuccessCode.CAMPAIGN_SCHEDULED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    sendCampaignToSubscribers: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { campaign_id } = request.params as { campaign_id?: string };
      const { listId } = request.body as SendCampaignBody;

      try {
        const emailSends = await campaignService.sendCampaignToSubscribers(
          tenant_id,
          campaign_id!,
          listId,
        );
        return sendSuccess(reply, StatusCode.SuccessAccepted, { emailSendsCount: emailSends.length }, CASSuccessMessage.EMAIL_SEND_INITIATED, CASSuccessCode.CAMPAIGN_CREATED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    getEmailSends: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, filter, campaignId, subscriberId } = request.query as {
        page?: string;
        limit?: string;
        filter?: string;
        campaignId?: string;
        subscriberId?: string;
      };

      try {
        const emailSends = await emailSendService.getEmailSends(
          tenant_id,
          page ? Number(page) : undefined,
          limit ? Number(limit) : undefined,
          filter,
          campaignId,
          subscriberId,
        );
        return sendSuccess(reply, StatusCode.SuccessOK, emailSends, CASSuccessMessage.DATA_RETRIEVED, CASSuccessCode.DATA_RETRIEVED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    getEmailSendById: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { email_send_id } = request.params as { email_send_id?: string };

      try {
        const emailSend = await emailSendService.getEmailSendById(
          tenant_id,
          email_send_id!,
        );
        if (!emailSend) {
          return sendError(reply, StatusCode.ClientErrorNotFound, CASErrorMessage.EMAIL_SEND_RECORD_NOT_FOUND, CASErrorCode.EMAIL_SEND_RECORD_NOT_FOUND);
        }
        return sendSuccess(reply, StatusCode.SuccessOK, emailSend, CASSuccessMessage.DATA_RETRIEVED, CASSuccessCode.DATA_RETRIEVED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    updateEmailSendStatus: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const { email_send_id } = request.params as { email_send_id?: string };
      const { status, error } = request.body as UpdateEmailSendBody;

      try {
        const updatedEmailSend = await emailSendService.updateEmailSendStatus(
          tenant_id,
          email_send_id!,
          status as any,
          error,
        );
        return sendSuccess(reply, StatusCode.SuccessOK, updatedEmailSend, CASSuccessMessage.DATA_UPDATED, CASSuccessCode.DATA_UPDATED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    createOrUpdateTenantEmailConfig: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;
      const body = request.body as Omit<TenantEmailConfigInput, "tenant_id">;

      try {
        const config =
          await tenantEmailConfigService.createOrUpdateTenantEmailConfig(
            tenant_id,
            body,
          );
        return sendSuccess(reply, StatusCode.SuccessOK, config, CASSuccessMessage.TENANT_EMAIL_CONFIG_UPDATED, CASSuccessCode.DATA_UPDATED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    getTenantEmailConfig: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;

      try {
        const config =
          await tenantEmailConfigService.getTenantEmailConfig(tenant_id);
        if (!config) {
          return sendError(reply, StatusCode.ClientErrorNotFound, CASErrorMessage.EMAIL_CONFIG_INVALID, CASErrorCode.EMAIL_CONFIG_INVALID);
        }
        return sendSuccess(reply, StatusCode.SuccessOK, config, CASSuccessMessage.DATA_RETRIEVED, CASSuccessCode.DATA_RETRIEVED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },

    deleteTenantEmailConfig: async (request, reply) => {
      if (!request.tenant) {
        return sendError(reply, StatusCode.ClientErrorUnauthorized, CASErrorMessage.TENANT_NOT_FOUND, CASErrorCode.TENANT_NOT_FOUND);
      }
      const { id: tenant_id } = request.tenant;

      try {
        await tenantEmailConfigService.deleteTenantEmailConfig(tenant_id);
        return sendSuccess(reply, StatusCode.SuccessNoContent, undefined, CASSuccessMessage.DATA_DELETED, CASSuccessCode.DATA_DELETED);
      } catch (error: any) {
        return sendError(reply, StatusCode.ClientErrorBadRequest, error.message, CASErrorCode.INVALID_FIELD_FORMAT);
      }
    },
  };
};
