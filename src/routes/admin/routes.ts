import { adminHandler } from "../../core/admin/admin-handler";
import {
  AdminAnalyticsSchemas,
  ProjectSchemas,
  TeamSchemas,
  SubscriberSchemas,
  ListSchemas,
  CampaignSchemas,
  ProductSchemas,
  OrderSchemas,
  PaymentSchemas,
  DiscountSchemas,
  NotificationSchemas,
  TemplateSchemas,
  PushTokenSchemas,
  PreferenceSchemas,
  AuditLogSchemas,
  SettingsSchemas,
} from "../../core/admin/admin.schema";

const adminRoutes: PluginType = async (app) => {
  const handler = adminHandler(app);

  app.get("/dashboard", { schema: AdminAnalyticsSchemas.getDashboard }, handler.getDashboard);
  app.get("/analytics/revenue", { schema: AdminAnalyticsSchemas.getRevenueAnalytics }, handler.getRevenueAnalytics);
  app.get("/analytics/users", { schema: AdminAnalyticsSchemas.getUserAnalytics }, handler.getUserAnalytics);
  app.get("/analytics/products", { schema: AdminAnalyticsSchemas.getProductAnalytics }, handler.getProductAnalytics);
  app.get("/stats", { schema: AdminAnalyticsSchemas.getAllStats }, handler.getAllStats);
  app.get("/report", { schema: AdminAnalyticsSchemas.getFullReport }, handler.getFullReport);

  app.post("/projects", { schema: ProjectSchemas.createProject }, handler.createProject);
  app.get("/projects", { schema: ProjectSchemas.getProjects }, handler.getProjects);
  app.get("/projects/:project_id", { schema: ProjectSchemas.getProjectById }, handler.getProjectById);
  app.put("/projects/:project_id", { schema: ProjectSchemas.updateProject }, handler.updateProject);
  app.post("/projects/:project_id/archive", { schema: ProjectSchemas.archiveProject }, handler.archiveProject);
  app.delete("/projects/:project_id", { schema: ProjectSchemas.deleteProject }, handler.deleteProject);

  app.get("/team", { schema: TeamSchemas.getTeamMembers }, handler.getTeamMembers);
  app.get("/team/:user_id", { schema: TeamSchemas.getMemberById }, handler.getMemberById);
  app.put("/team/:user_id/role", { schema: TeamSchemas.updateMemberRole }, handler.updateMemberRole);
  app.delete("/team/:user_id", { schema: TeamSchemas.removeMember }, handler.removeMember);
  app.post("/team/invite", { schema: TeamSchemas.inviteMember }, handler.inviteMember);
  app.get("/team/invites", { schema: TeamSchemas.getInvites }, handler.getInvites);
  app.delete("/team/invites/:invite_id", { schema: TeamSchemas.cancelInvite }, handler.cancelInvite);

  app.get("/subscribers", { schema: SubscriberSchemas.listSubscribers }, handler.listSubscribers);
  app.post("/subscribers", { schema: SubscriberSchemas.createSubscriber }, handler.createSubscriber);
  app.post("/subscribers/import", { schema: SubscriberSchemas.bulkImportSubscribers }, handler.bulkImportSubscribers);
  app.put("/subscribers", { schema: SubscriberSchemas.updateSubscriber }, handler.updateSubscriber);
  app.delete("/subscribers", { schema: SubscriberSchemas.deleteSubscriber }, handler.deleteSubscriber);

  app.get("/lists", { schema: ListSchemas.listLists }, handler.listLists);
  app.post("/lists", { schema: ListSchemas.createList }, handler.createList);
  app.post("/lists/add-subscribers", { schema: ListSchemas.addSubscribersToList }, handler.addSubscribersToList);
  app.post("/lists/remove-subscribers", { schema: ListSchemas.removeSubscribersFromList }, handler.removeSubscribersFromList);
  app.delete("/lists/:list_id", { schema: ListSchemas.deleteList }, handler.deleteList);

  app.get("/campaigns", { schema: CampaignSchemas.listCampaigns }, handler.listCampaigns);
  app.post("/campaigns", { schema: CampaignSchemas.createCampaign }, handler.createCampaign);
  app.put("/campaigns", { schema: CampaignSchemas.updateCampaign }, handler.updateCampaign);
  app.post("/campaigns/send", { schema: CampaignSchemas.sendCampaign }, handler.sendCampaign);
  app.delete("/campaigns/:campaign_id", { schema: CampaignSchemas.deleteCampaign }, handler.deleteCampaign);

  app.get("/products", { schema: ProductSchemas.listProducts }, handler.listProducts);
  app.get("/products/:product_id", { schema: ProductSchemas.getProductById }, handler.getProductById);
  app.post("/products", { schema: ProductSchemas.createProduct }, handler.createProduct);
  app.put("/products", { schema: ProductSchemas.updateProduct }, handler.updateProduct);
  app.delete("/products/:product_id", { schema: ProductSchemas.deleteProduct }, handler.deleteProduct);

  app.post("/products/variation", { schema: ProductSchemas.addVariation }, handler.addVariation);
  app.put("/products/variation", { schema: ProductSchemas.updateVariation }, handler.updateVariation);
  app.delete("/products/variation/:variation_id", { schema: ProductSchemas.deleteVariation }, handler.deleteVariation);

  app.post("/products/bundle/:product_id", { schema: ProductSchemas.addToBundle }, handler.addToBundle);
  app.put("/products/bundle/:product_id", { schema: ProductSchemas.editBundle }, handler.editBundle);

  app.get("/orders", { schema: OrderSchemas.listOrders }, handler.listOrders);
  app.put("/orders/status", { schema: OrderSchemas.updateOrderStatus }, handler.updateOrderStatus);
  app.put("/orders/delivery", { schema: OrderSchemas.updateDelivery }, handler.updateDelivery);

  app.get("/payments", { schema: PaymentSchemas.listPayments }, handler.listPayments);
  app.post("/payments/refund", { schema: PaymentSchemas.refundPayment }, handler.refundPayment);

  app.get("/discounts", { schema: DiscountSchemas.listDiscounts }, handler.listDiscounts);
  app.post("/discounts", { schema: DiscountSchemas.createDiscount }, handler.createDiscount);
  app.put("/discounts", { schema: DiscountSchemas.updateDiscount }, handler.updateDiscount);
  app.post("/discounts/toggle", { schema: DiscountSchemas.toggleDiscount }, handler.toggleDiscount);
  app.delete("/discounts/:discount_id", { schema: DiscountSchemas.deleteDiscount }, handler.deleteDiscount);

  app.get("/audit-logs", { schema: AuditLogSchemas.getAuditLogs }, handler.getAuditLogs);
  app.get("/audit-logs/entity/:entityType/:entityId", { schema: AuditLogSchemas.getEntityHistory }, handler.getEntityHistory);
  app.get("/audit-logs/user/:user_id", { schema: AuditLogSchemas.getUserActivity }, handler.getUserActivity);

  app.get("/settings", { schema: SettingsSchemas.getSettings }, handler.getSettings);
  app.put("/settings", { schema: SettingsSchemas.updateSettings }, handler.updateSettings);

  app.get("/notifications", { schema: NotificationSchemas.getNotifications }, handler.getNotifications);
  app.get("/notifications/unread-count", { schema: NotificationSchemas.getUnreadCount }, handler.getUnreadCount);
  app.post("/notifications/mark-read", { schema: NotificationSchemas.markNotificationRead }, handler.markNotificationRead);
  app.post("/notifications/mark-all-read", { schema: NotificationSchemas.markAllNotificationsRead }, handler.markAllNotificationsRead);
  app.post("/notifications/send", { schema: NotificationSchemas.sendNotification }, handler.sendNotification);
  app.post("/notifications/notify-admins", { schema: NotificationSchemas.notifyAllAdmins }, handler.notifyAllAdmins);
  app.post("/notifications/send-template", { schema: NotificationSchemas.sendFromTemplate }, handler.sendFromTemplate);
  app.post("/notifications/trigger-event", { schema: NotificationSchemas.triggerEventNotification }, handler.triggerEventNotification);

  app.get("/notification-templates", { schema: TemplateSchemas.getTemplates }, handler.getTemplates);
  app.post("/notification-templates", { schema: TemplateSchemas.createTemplate }, handler.createTemplate);
  app.put("/notification-templates", { schema: TemplateSchemas.updateTemplate }, handler.updateTemplate);

  app.post("/push-tokens/register", { schema: PushTokenSchemas.registerPushToken }, handler.registerPushToken);
  app.post("/push-tokens/remove", { schema: PushTokenSchemas.removePushToken }, handler.removePushToken);

  app.get("/preferences/notifications", { schema: PreferenceSchemas.getNotificationPreferences }, handler.getNotificationPreferences);
  app.put("/preferences/notifications", { schema: PreferenceSchemas.updateNotificationPreferences }, handler.updateNotificationPreferences);
};

export default adminRoutes;
