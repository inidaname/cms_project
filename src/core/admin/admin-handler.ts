import StatusCode from "status-code-enum";
import { CASErrorCode, CASErrorMessage } from "../../utils/enums";
import { AdminAnalyticsService } from "./admin-analytics-service";
import { ProjectService } from "./project-service";
import { TeamService } from "./team-service";
import { AuditLogService } from "./audit-log-service";
import { SettingsService } from "./settings-service";
import { AdminService } from "./admin-service";
import { NotificationService } from "./notification-service";

export const adminHandler = (app: FastifyInstance) => {
  const analyticsService = new AdminAnalyticsService(app.prisma);
  const projectService = new ProjectService(app.prisma);
  const teamService = new TeamService(app.prisma);
  const auditLogService = new AuditLogService(app.prisma);
  const settingsService = new SettingsService(app.prisma);
  const adminService = new AdminService(app.prisma);
  const notificationService = new NotificationService(app.prisma);

  return {
    getDashboard: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { period } = request.query;

      try {
        const stats = await analyticsService.getDashboardStats(tenant_id, period || "30d");
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: stats,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getRevenueAnalytics: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { groupBy } = request.query;

      try {
        const analytics = await analyticsService.getRevenueAnalytics(tenant_id, groupBy || "day");
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: analytics,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getUserAnalytics: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;

      try {
        const analytics = await analyticsService.getUserAnalytics(tenant_id);
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: analytics,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getProductAnalytics: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;

      try {
        const analytics = await analyticsService.getProductAnalytics(tenant_id);
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: analytics,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    createProject: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const body = request.body;

      try {
        const project = await projectService.createProject(tenant_id, body);
        await auditLogService.createLog({
          tenant_id,
          user_id: request.user?.id,
          action: "CREATE",
          entityType: "PROJECT",
          entityId: project.id,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
        return reply.status(StatusCode.SuccessCreated).send({
          status: "success",
          data: project,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getProjects: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, status } = request.query;

      try {
        const projects = await projectService.getProjects(
          tenant_id,
          page ? Number(page) : 1,
          limit ? Number(limit) : 10,
          status
        );
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: projects,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getProjectById: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { project_id } = request.params;

      try {
        const project = await projectService.getProjectById(tenant_id, project_id);
        if (!project) {
          return reply.status(StatusCode.ClientErrorNotFound).send({
            status: "error",
            message: "Project not found",
            code: CASErrorCode.RESOURCE_NOT_FOUND,
          });
        }
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: project,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    updateProject: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { project_id } = request.params;
      const body = request.body;

      try {
        const project = await projectService.updateProject(tenant_id, project_id, body);
        await auditLogService.createLog({
          tenant_id,
          user_id: request.user?.id,
          action: "UPDATE",
          entityType: "PROJECT",
          entityId: project_id,
          details: body,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: project,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    archiveProject: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { project_id } = request.params;

      try {
        await projectService.archiveProject(tenant_id, project_id);
        await auditLogService.createLog({
          tenant_id,
          user_id: request.user?.id,
          action: "UPDATE",
          entityType: "PROJECT",
          entityId: project_id,
          details: { status: "ARCHIVED" },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          message: "Project archived",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    deleteProject: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { project_id } = request.params;

      try {
        await projectService.deleteProject(tenant_id, project_id);
        await auditLogService.createLog({
          tenant_id,
          user_id: request.user?.id,
          action: "DELETE",
          entityType: "PROJECT",
          entityId: project_id,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          message: "Project deleted",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getTeamMembers: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, role } = request.query;

      try {
        const members = await teamService.getTeamMembers(
          tenant_id,
          page ? Number(page) : 1,
          limit ? Number(limit) : 10,
          role
        );
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: members,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getMemberById: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { user_id } = request.params;

      try {
        const member = await teamService.getMemberById(tenant_id, user_id);
        if (!member) {
          return reply.status(StatusCode.ClientErrorNotFound).send({
            status: "error",
            message: "Team member not found",
            code: CASErrorCode.RESOURCE_NOT_FOUND,
          });
        }
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: member,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    updateMemberRole: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { user_id } = request.params;
      const { role } = request.body;

      try {
        await teamService.updateMemberRole(tenant_id, user_id, role);
        await auditLogService.createLog({
          tenant_id,
          user_id: request.user?.id,
          action: "UPDATE",
          entityType: "TEAM",
          entityId: user_id,
          details: { role },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          message: "Member role updated",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    removeMember: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { user_id } = request.params;

      try {
        await teamService.removeMember(tenant_id, user_id);
        await auditLogService.createLog({
          tenant_id,
          user_id: request.user?.id,
          action: "REMOVE",
          entityType: "TEAM",
          entityId: user_id,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          message: "Member removed",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    inviteMember: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { email, role } = request.body;
      const user = request.user;

      try {
        const invite = await teamService.inviteMember(tenant_id, user.id, email, role);
        await auditLogService.createLog({
          tenant_id,
          user_id: user.id,
          action: "INVITE",
          entityType: "TEAM",
          entityId: invite.id,
          details: { email, role },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
        return reply.status(StatusCode.SuccessCreated).send({
          status: "success",
          data: {
            inviteId: invite.id,
            email: invite.email,
            expiresAt: invite.expiresAt,
          },
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    acceptInvite: async (request: any, reply: any) => {
      const { token, name, password } = request.body;

      try {
        const result = await teamService.acceptInvite(token, name, password);
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          message: result.message,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getInvites: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;

      try {
        const invites = await teamService.getInvites(tenant_id);
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: invites,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    cancelInvite: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { invite_id } = request.params;

      try {
        await teamService.cancelInvite(tenant_id, invite_id);
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          message: "Invite cancelled",
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getAuditLogs: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { page, limit, user_id, action, entityType, startDate, endDate } = request.query;

      try {
        const logs = await auditLogService.getAuditLogs(tenant_id, {
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 20,
          user_id,
          action,
          entityType,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        });
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: logs,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getEntityHistory: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { entityType, entityId } = request.params;

      try {
        const history = await auditLogService.getEntityHistory(tenant_id, entityType, entityId);
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: history,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getUserActivity: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const { user_id } = request.params;
      const { page, limit } = request.query;

      try {
        const activity = await auditLogService.getUserActivity(
          tenant_id,
          user_id,
          page ? Number(page) : 1,
          limit ? Number(limit) : 20
        );
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: activity,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    getSettings: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;

      try {
        const settings = await settingsService.getSettings(tenant_id);
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: settings,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    updateSettings: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      const body = request.body;

      try {
        const settings = await settingsService.updateSettings(tenant_id, body);
        await auditLogService.createLog({
          tenant_id,
          user_id: request.user?.id,
          action: "UPDATE",
          entityType: "SETTINGS",
          details: body,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
        return reply.status(StatusCode.SuccessOK).send({
          status: "success",
          data: settings,
        });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    // Full Service Management
    getAllStats: async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: CASErrorMessage.TENANT_NOT_FOUND,
          code: CASErrorCode.TENANT_NOT_FOUND,
        });
      }
      const { id: tenant_id } = request.tenant;
      try {
        const stats = await adminService.getAllStats(tenant_id);
        return reply.status(StatusCode.SuccessOK).send({ status: "success", data: stats });
      } catch (error: any) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: error.message,
          code: CASErrorCode.INVALID_FIELD_FORMAT,
        });
      }
    },

    // Subscriber Management
    listSubscribers: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageSubscribers(request.tenant.id, "list");
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    createSubscriber: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageSubscribers(request.tenant.id, "create", request.body);
        return reply.status(201).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    bulkImportSubscribers: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageSubscribers(request.tenant.id, "bulk_create", request.body);
        return reply.status(201).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    updateSubscriber: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageSubscribers(request.tenant.id, "update", request.body);
        return reply.status(200).send({ status: "success", message: "Subscriber updated" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    deleteSubscriber: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageSubscribers(request.tenant.id, "delete", request.body);
        return reply.status(200).send({ status: "success", message: "Subscriber deleted" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // List Management
    listLists: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageLists(request.tenant.id, "list");
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    createList: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageLists(request.tenant.id, "create", request.body);
        return reply.status(201).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    addSubscribersToList: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageLists(request.tenant.id, "add_subscribers", request.body);
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    removeSubscribersFromList: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageLists(request.tenant.id, "remove_subscribers", request.body);
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    deleteList: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageLists(request.tenant.id, "delete", request.body);
        return reply.status(200).send({ status: "success", message: "List deleted" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Campaign Management
    listCampaigns: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageCampaigns(request.tenant.id, "list");
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    createCampaign: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageCampaigns(request.tenant.id, "create", request.body);
        return reply.status(201).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    updateCampaign: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageCampaigns(request.tenant.id, "update", request.body);
        return reply.status(200).send({ status: "success", message: "Campaign updated" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    sendCampaign: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageCampaigns(request.tenant.id, "send", request.body);
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    deleteCampaign: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageCampaigns(request.tenant.id, "delete", request.body);
        return reply.status(200).send({ status: "success", message: "Campaign deleted" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Product Management
    listProducts: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageProducts(request.tenant.id, "list");
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    createProduct: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageProducts(request.tenant.id, "create", request.body);
        return reply.status(201).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    updateProduct: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageProducts(request.tenant.id, "update", request.body);
        return reply.status(200).send({ status: "success", message: "Product updated" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    deleteProduct: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageProducts(request.tenant.id, "delete", request.body);
        return reply.status(200).send({ status: "success", message: "Product deleted" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    getProductById: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const { product_id } = request.params;
        const result = await adminService.manageProducts(request.tenant.id, "get", { id: product_id });
        if (!result) {
          return reply.status(404).send({ status: "error", message: "Product not found" });
        }
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    addVariation: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageProducts(request.tenant.id, "add_variation", request.body);
        return reply.status(201).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    updateVariation: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageProducts(request.tenant.id, "update_variation", request.body);
        return reply.status(200).send({ status: "success", message: "Variation updated" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    deleteVariation: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const { variation_id } = request.params;
        await adminService.manageProducts(request.tenant.id, "delete_variation", { variation_id });
        return reply.status(200).send({ status: "success", message: "Variation deleted" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    addToBundle: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const { product_id } = request.params;
        const { components } = request.body;
        const result = await adminService.manageProducts(request.tenant.id, "add_to_bundle", { product_id, components });
        return reply.status(201).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    editBundle: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const { product_id } = request.params;
        const { components } = request.body;
        const result = await adminService.manageProducts(request.tenant.id, "edit_bundle", { product_id, components });
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Order Management
    listOrders: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageOrders(request.tenant.id, "list");
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    updateOrderStatus: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageOrders(request.tenant.id, "update_status", request.body);
        return reply.status(200).send({ status: "success", message: "Order status updated" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    updateDelivery: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageOrders(request.tenant.id, "update_delivery", request.body);
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Payment Management
    listPayments: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.managePayments(request.tenant.id, "list");
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    refundPayment: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.managePayments(request.tenant.id, "refund", request.body);
        return reply.status(200).send({ status: "success", message: "Payment refunded" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Discount Management
    listDiscounts: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageDiscounts(request.tenant.id, "list");
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    createDiscount: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await adminService.manageDiscounts(request.tenant.id, "create", request.body);
        return reply.status(201).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    updateDiscount: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageDiscounts(request.tenant.id, "update", request.body);
        return reply.status(200).send({ status: "success", message: "Discount updated" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    toggleDiscount: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageDiscounts(request.tenant.id, "toggle", request.body);
        return reply.status(200).send({ status: "success", message: "Discount toggled" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    deleteDiscount: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        await adminService.manageDiscounts(request.tenant.id, "delete", request.body);
        return reply.status(200).send({ status: "success", message: "Discount deleted" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Full Report
    getFullReport: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { startDate, endDate } = request.query;
      try {
        const result = await adminService.getFullReport(
          request.tenant.id,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Notifications
    getNotifications: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { user_id, page, limit } = request.query;
      try {
        const result = await notificationService.getNotifications(
          request.tenant.id,
          user_id,
          page ? Number(page) : 1,
          limit ? Number(limit) : 20
        );
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    getUnreadCount: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { user_id } = request.query;
      try {
        const count = await notificationService.getUnreadCount(request.tenant.id, user_id);
        return reply.status(200).send({ status: "success", data: { count } });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    markNotificationRead: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { notification_id } = request.body;
      try {
        await notificationService.markAsRead(notification_id, request.tenant.id);
        return reply.status(200).send({ status: "success", message: "Marked as read" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    markAllNotificationsRead: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { user_id } = request.query;
      try {
        const result = await notificationService.markAllAsRead(request.tenant.id, user_id);
        return reply.status(200).send({ status: "success", data: { count: result.count } });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    sendNotification: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await notificationService.createNotification({
          tenant_id: request.tenant.id,
          ...request.body,
        });
        return reply.status(201).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    notifyAllAdmins: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { title, body, data, type } = request.body;
      try {
        const result = await notificationService.notifyAdmins(
          request.tenant.id,
          title,
          body,
          data,
          type || "IN_APP"
        );
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Templates
    createTemplate: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await notificationService.createTemplate({
          tenant_id: request.tenant.id,
          ...request.body,
        });
        return reply.status(201).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    getTemplates: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await notificationService.getTemplates(request.tenant.id);
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    updateTemplate: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { template_id, ...data } = request.body;
      try {
        await notificationService.updateTemplate(template_id, request.tenant.id, data);
        return reply.status(200).send({ status: "success", message: "Template updated" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Push Tokens
    registerPushToken: async (request: any, reply: any) => {
      const user_id = request.user?.id;
      if (!user_id) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { token, platform } = request.body;
      try {
        const result = await notificationService.registerPushToken(user_id, token, platform);
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    removePushToken: async (request: any, reply: any) => {
      const user_id = request.user?.id;
      if (!user_id) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { token } = request.body;
      try {
        await notificationService.removePushToken(user_id, token);
        return reply.status(200).send({ status: "success", message: "Token removed" });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Preferences
    getNotificationPreferences: async (request: any, reply: any) => {
      const user_id = request.user?.id;
      if (!user_id) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await notificationService.getPreferences(user_id);
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    updateNotificationPreferences: async (request: any, reply: any) => {
      const user_id = request.user?.id;
      if (!user_id) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      try {
        const result = await notificationService.updatePreferences(user_id, request.body);
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Send from template
    sendFromTemplate: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { templateName, user_id, variables, sendTo } = request.body;
      try {
        const result = await notificationService.sendFromTemplate(
          request.tenant.id,
          templateName,
          user_id,
          variables || {},
          sendTo
        );
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },

    // Trigger event notification
    triggerEventNotification: async (request: any, reply: any) => {
      if (!request.tenant) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const { event, data } = request.body;
      try {
        const result = await notificationService.notifyEvent(request.tenant.id, event, data);
        return reply.status(200).send({ status: "success", data: result });
      } catch (error: any) {
        return reply.status(400).send({ status: "error", message: error.message });
      }
    },
  };
};
